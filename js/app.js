import { CONFIG } from './config.js';
import * as U from './util.js';
import * as DB from './db.js';
import * as GC from './gcal.js';

const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const eur = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });
const eur0 = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });

const CATS = {
  streaming: 'Streaming', telecom: 'Téléphone / Internet', assurance: 'Assurance',
  energie: 'Énergie', sport: 'Sport', logiciel: 'Logiciel', autre: 'Autre',
};
const STATUS = { actif: 'Actif', a_renegocier: 'À renégocier', resilie: 'Résilié' };

const state = { view: 'dash', contracts: [], filter: 'cours', sort: 'echeance' };

/* ---------- Calculs ---------- */
const monthly = c => (c.frequency === 'annuel' ? c.amount / 12 : +c.amount);
const annual = c => (c.frequency === 'annuel' ? +c.amount : c.amount * 12);
const sum = (list, fn) => list.reduce((t, c) => t + fn(c), 0);
const deadline = GC.deadlineOf;
// Gain annuel : écart avec le montant cible ; pour un contrat résilié sans remplacement, tout le coût annuel est économisé
const gainYear = c => {
  if (c.status === 'resilie' && c.target_amount == null) return annual(c);
  if (c.target_amount == null) return 0;
  return annual(c) - annual({ ...c, amount: c.target_amount });
};

/* ---------- Utilitaires UI ---------- */
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg; t.hidden = false;
  clearTimeout(toast.t);
  toast.t = setTimeout(() => (t.hidden = true), 3200);
}
const openSheet = html => { $('#sheet-body').innerHTML = html; $('#sheet').hidden = false; };
const closeSheet = () => { $('#sheet').hidden = true; $('#sheet-body').innerHTML = ''; };

const ic = {
  plus: '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
  gear: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
};

function setHead(title, sub = '') {
  $('#head').innerHTML = `<div class="top">
    <div class="ttl-box"><h1>${esc(title)}</h1>${sub ? `<div class="sub">${esc(sub)}</div>` : ''}</div>
    <span class="sp"></span>
    <button class="ibtn" data-act="settings" aria-label="Réglages">${ic.gear}</button>
    <button class="ibtn plus" data-act="add" aria-label="Ajouter un contrat">${ic.plus}</button></div>`;
}

/* ---------- Tableau de bord ---------- */
function renderDash() {
  const act = state.contracts.filter(c => c.status !== 'resilie');
  setHead('Tableau de bord', `${act.length} contrat${act.length > 1 ? 's' : ''} en cours`);
  if (!state.contracts.length) {
    $('#view').innerHTML = `<div class="empty">Aucun contrat pour l'instant.<br><button class="lnk" data-act="add">Ajouter mon premier contrat</button></div>`;
    return;
  }
  const today = new Date();
  const byCat = Object.entries(CATS).map(([k, l]) => ({ k, l, v: sum(act.filter(c => c.category === k), monthly) }))
    .filter(x => x.v > 0).sort((a, b) => b.v - a.v);
  const max = byCat[0]?.v || 1;
  const upcoming = act.map(c => ({ c, d: deadline(c) })).filter(x => x.d && U.daysBetween(today, x.d) >= 0)
    .sort((a, b) => a.d - b.d).slice(0, 5);
  const potentiel = sum(act, c => Math.max(0, gainYear(c)));
  const realisee = sum(state.contracts.filter(c => c.status === 'resilie'), c => Math.max(0, gainYear(c)));

  $('#view').innerHTML = `<div class="stack">
    <div class="totals">
      <div class="tot"><small>Par mois</small><b>${eur.format(sum(act, monthly))}</b></div>
      <div class="tot"><small>Par an</small><b>${eur0.format(sum(act, annual))}</b></div>
    </div>
    <div class="sec">Prochaines échéances</div>
    ${upcoming.length ? upcoming.map(({ c, d }) => `<button class="item" style="--k:var(--k-${c.category})" data-id="${c.id}">
      <span class="main"><b>${esc(c.name)}</b><small>Résilier avant le ${U.fmtDate(d)}</small></span>
      <span class="cd${U.daysBetween(today, d) <= 30 ? ' urgent' : ''}">${U.countdown(d)}</span></button>`).join('')
      : '<div class="kv pad">Aucune date limite à venir. Renseigne la fin d\'engagement de tes contrats.</div>'}
    <div class="sec">Répartition par mois</div>
    ${byCat.map(x => `<div class="bar-row"><span>${x.l}</span><div class="bar"><i style="width:${Math.max(4, (x.v / max) * 100)}%;background:var(--k-${x.k})"></i></div><b>${eur0.format(x.v)}</b></div>`).join('')}
    <div class="sec">Économies</div>
    <div class="totals">
      <div class="tot"><small>Potentielles / an</small><b>${eur0.format(potentiel)}</b></div>
      <div class="tot"><small>Réalisées / an</small><b>${eur0.format(realisee)}</b></div>
    </div></div>`;
}

/* ---------- Liste ---------- */
function renderList() {
  setHead('Contrats');
  const today = new Date();
  let list = state.contracts.filter(c =>
    state.filter === 'cours' ? c.status !== 'resilie' : state.filter === 'reneg' ? c.status === 'a_renegocier' : c.status === 'resilie');
  list = list.sort(state.sort === 'cout'
    ? (a, b) => monthly(b) - monthly(a)
    : (a, b) => (deadline(a) ? +deadline(a) : Infinity) - (deadline(b) ? +deadline(b) : Infinity));
  const chip = (k, l, cur, attr) => `<button class="fchip${cur === k ? ' on' : ''}" data-${attr}="${k}">${l}</button>`;
  const rows = list.map(c => {
    const d = deadline(c);
    const cd = !d || c.status === 'resilie' ? '' : `<span class="cd${U.daysBetween(today, d) >= 0 && U.daysBetween(today, d) <= 30 ? ' urgent' : ''}">${U.daysBetween(today, d) < 0 ? 'préavis passé' : U.countdown(d)}</span>`;
    return `<button class="item" style="--k:var(--k-${c.category})" data-id="${c.id}">
      <span class="main"><b>${esc(c.name)}</b><small>${CATS[c.category]} · ${eur.format(c.amount)}/${c.frequency === 'annuel' ? 'an' : 'mois'}${c.status === 'a_renegocier' ? ' · à renégocier' : ''}</small></span>${cd}</button>`;
  }).join('');
  $('#view').innerHTML = `<div class="filters">
      ${chip('cours', 'En cours', state.filter, 'f')}${chip('reneg', 'À renégocier', state.filter, 'f')}${chip('resilie', 'Résiliés', state.filter, 'f')}
      <span class="sp"></span>${chip('echeance', 'Échéance', state.sort, 's')}${chip('cout', 'Coût', state.sort, 's')}</div>
    <div class="stack">${rows || '<div class="empty">Aucun contrat dans cette liste.</div>'}</div>`;
}

function render() {
  document.querySelectorAll('#tabs button').forEach(b => b.classList.toggle('on', b.dataset.view === state.view));
  (state.view === 'dash' ? renderDash : renderList)();
}

async function reload() {
  state.contracts = await DB.listContracts();
  render();
}

/* ---------- Fiche contrat ---------- */
function openForm(c = null) {
  const sel = (name, opts, cur) => `<select name="${name}">${Object.entries(opts).map(([k, l]) => `<option value="${k}" ${k === cur ? 'selected' : ''}>${l}</option>`).join('')}</select>`;
  openSheet(`<form class="form" id="cf">
    <h2>${c ? 'Modifier le contrat' : 'Nouveau contrat'}</h2>
    <input name="name" placeholder="Nom (ex. Netflix, Assurance auto)" required autocomplete="off" value="${esc(c?.name || '')}">
    <div class="frow">
      <label>Montant (€)<input name="amount" type="number" step="0.01" min="0" inputmode="decimal" required value="${c?.amount ?? ''}"></label>
      <label>Fréquence${sel('frequency', { mensuel: 'Mensuel', annuel: 'Annuel' }, c?.frequency || 'mensuel')}</label>
    </div>
    <div class="frow">
      <label>Catégorie${sel('category', CATS, c?.category || 'autre')}</label>
      <label>Statut${sel('status', STATUS, c?.status || 'actif')}</label>
    </div>
    <div class="frow">
      <label>Fin d'engagement<input name="end_date" type="date" value="${c?.end_date || ''}"></label>
      <label>Préavis (jours)<input name="notice_days" type="number" min="0" inputmode="numeric" value="${c?.notice_days ?? 30}"></label>
    </div>
    <div class="kv" id="dl-hint"></div>
    <details class="more" ${c && (c.start_date || c.cancel_url || c.target_amount != null || c.notes || (c.alert_days ?? 28) !== 28) ? 'open' : ''}>
      <summary>Plus de détails</summary>
      <div class="form">
        <label>Début<input name="start_date" type="date" value="${c?.start_date || ''}"></label>
        <label>Alerte Google${sel('alert_days', { 28: '4 semaines avant', 14: '2 semaines avant' }, String(c?.alert_days ?? 28))}</label>
        <label>Lien de résiliation<input name="cancel_url" type="url" placeholder="https://…" value="${esc(c?.cancel_url || '')}"></label>
        <label>Montant cible / offre concurrente (€, même fréquence)<input name="target_amount" type="number" step="0.01" min="0" inputmode="decimal" value="${c?.target_amount ?? ''}"></label>
        <label>Notes<textarea name="notes" rows="3" placeholder="Conditions, n° de contrat…">${esc(c?.notes || '')}</textarea></label>
      </div>
    </details>
    <button class="primary" type="submit">${c ? 'Enregistrer' : 'Ajouter'}</button>
    ${c ? '<button class="secondary danger" type="button" id="cf-del">Supprimer ce contrat</button>' : ''}
    <button class="secondary" type="button" data-act="close">Annuler</button>
  </form>`);
  const f = $('#cf');
  const hint = () => {
    const d = f.end_date.value ? U.addDays(U.parseYmd(f.end_date.value), -(+f.notice_days.value || 0)) : null;
    $('#dl-hint').textContent = !d ? "Renseigne la fin d'engagement pour créer une alerte."
      : U.daysBetween(new Date(), d) < 0 ? `Date limite pour résilier : ${U.fmtDate(d)} — déjà passée, aucune alerte ne sera créée.`
      : `Date limite pour résilier : ${U.fmtDate(d)} — l'alerte sera posée dans Google Agenda ce jour-là.`;
  };
  f.end_date.oninput = f.notice_days.oninput = hint; hint();

  const read = () => ({
    name: f.elements.namedItem('name').value.trim(), amount: +f.amount.value, frequency: f.frequency.value, category: f.category.value,
    start_date: f.start_date.value || null, end_date: f.end_date.value || null,
    notice_days: +f.notice_days.value || 0, alert_days: +f.alert_days.value,
    cancel_url: f.cancel_url.value.trim() || null, notes: f.notes.value.trim() || null,
    target_amount: f.target_amount.value === '' ? null : +f.target_amount.value, status: f.status.value,
  });

  f.onsubmit = async e => {
    e.preventDefault();
    const fields = read();
    const dl = fields.end_date ? GC.deadlineOf(fields) : null;
    const dlPassed = !!dl && U.daysBetween(new Date(), dl) < 0;
    const needAlert = fields.status !== 'resilie' && !!dl && !dlPassed;
    const touchesGoogle = needAlert || !!c?.cal_event_id;
    // La fenêtre Google doit s'ouvrir directement sur l'appui : on la lance avant toute autre opération
    let googleOk = true;
    if (touchesGoogle && !GC.hasToken()) { try { await GC.signIn(); } catch { googleOk = false; } }
    const btn = f.querySelector('.primary');
    btn.disabled = true; btn.textContent = 'Enregistrement…';
    try {
      let saved = await DB.saveContract({ ...fields, id: c?.id });
      let msg = 'Contrat enregistré';
      if (dlPassed && fields.status !== 'resilie') msg += ' · date limite déjà passée, aucune alerte créée';
      if (touchesGoogle) {
        if (!googleOk) msg += ' (alerte Google non synchronisée : connexion refusée)';
        else try {
          const ids = await GC.syncAlert(saved);
          if (ids.cal_id !== saved.cal_id || ids.cal_event_id !== saved.cal_event_id) saved = await DB.saveContract({ id: saved.id, ...ids });
          msg += ids.cal_event_id ? ' · alerte créée dans Google Agenda' : '';
        } catch (err) { msg += ` (alerte non synchronisée : ${err.message})`; }
      }
      closeSheet(); await reload(); toast(msg);
    } catch (err) { btn.disabled = false; btn.textContent = c ? 'Enregistrer' : 'Ajouter'; toast(err.message); }
  };

  const del = $('#cf-del');
  if (del) del.onclick = async () => {
    if (!del.dataset.sure) { del.dataset.sure = '1'; del.textContent = 'Confirmer la suppression'; return; }
    let googleOk = true;
    if (c.cal_event_id && !GC.hasToken()) { try { await GC.signIn(); } catch { googleOk = false; } }
    try {
      if (c.cal_event_id && googleOk) await GC.removeAlert(c);
      await DB.deleteContract(c.id);
      closeSheet(); await reload();
      toast(c.cal_event_id && !googleOk ? "Contrat supprimé (l'alerte Google est à supprimer à la main)" : 'Contrat supprimé');
    } catch (err) { toast(err.message); }
  };
  if (!c) f.elements.namedItem('name').focus();
}

/* ---------- Réglages ---------- */
function openSettings() {
  openSheet(`<h2>Réglages</h2>
    <button class="secondary" id="s-csv">Exporter en CSV</button>
    <button class="secondary danger" id="s-out">Se déconnecter</button>
    <button class="secondary" data-act="close">Fermer</button>`);
  $('#s-csv').onclick = exportCsv;
  $('#s-out').onclick = async () => { await DB.signOut(); closeSheet(); state.contracts = []; showLogin(); };
}

function exportCsv() {
  const cols = [['name', 'Nom'], ['category', 'Catégorie'], ['amount', 'Montant'], ['frequency', 'Fréquence'], ['start_date', 'Début'],
    ['end_date', 'Fin / renouvellement'], ['notice_days', 'Préavis (j)'], ['target_amount', 'Montant cible'], ['status', 'Statut'], ['cancel_url', 'Lien résiliation'], ['notes', 'Notes']];
  const cell = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const csv = [cols.map(([, l]) => cell(l)).join(';'), ...state.contracts.map(c => cols.map(([k]) => cell(c[k])).join(';'))].join('\r\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
  a.download = `abonnements-${U.ymd(new Date())}.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}

/* ---------- Événements ---------- */
document.addEventListener('click', e => {
  const t = e.target;
  const act = t.closest('[data-act]')?.dataset.act;
  if (act === 'add') return openForm();
  if (act === 'settings') return openSettings();
  if (act === 'close') return closeSheet();
  if (t.id === 'sheet') return closeSheet();
  const tab = t.closest('[data-view]');
  if (tab) { state.view = tab.dataset.view; return render(); }
  const f = t.closest('[data-f]'); if (f) { state.filter = f.dataset.f; return render(); }
  const s = t.closest('[data-s]'); if (s) { state.sort = s.dataset.s; return render(); }
  const item = t.closest('[data-id]');
  if (item) openForm(state.contracts.find(c => c.id === item.dataset.id));
});

/* ---------- Connexion et démarrage ---------- */
function showLogin(msg) {
  $('#login').hidden = false;
  if (!DB.isConfigured()) $('#login-msg').textContent = 'Supabase non configuré : voir README.md (js/config.js).';
  else if (msg) $('#login-msg').textContent = msg;
}

async function start() {
  $('#login').hidden = true;
  try { await reload(); }
  catch (e) { $('#view').innerHTML = `<div class="empty">Impossible de charger les contrats.<br>${esc(e.message)}</div>`; }
}

$('#login-btn').onclick = async () => {
  if (!DB.isConfigured()) return showLogin();
  const { error } = await DB.signIn();
  if (error) $('#login-msg').textContent = `Connexion impossible (${error.message}).`;
};

(async function init() {
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
  render();
  if (!DB.isConfigured()) return showLogin();
  DB.sb.auth.onAuthStateChange(ev => { if (ev === 'SIGNED_OUT') showLogin(); });
  const session = await DB.getSession();
  if (session) await start(); else showLogin();
})();
