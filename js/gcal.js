// Alertes dans Google Agenda : un événement « Résilier ou renégocier … » dans le calendrier « Échéances »
// (format défini dans contrat-echeances-agenda.md). Connexion Google côté navigateur, jeton conservé en mémoire.
import { CONFIG } from './config.js';
import * as U from './util.js';

const SCOPE = 'https://www.googleapis.com/auth/calendar';
const API = 'https://www.googleapis.com/calendar/v3';
const enc = encodeURIComponent;

let token = null, expires = 0, client = null;

export const hasToken = () => !!token && expires > Date.now() + 30000;

function whenGIS() {
  return new Promise((resolve, reject) => {
    const t0 = Date.now();
    (function check() {
      if (window.google?.accounts?.oauth2) return resolve();
      if (Date.now() - t0 > 10000) return reject(new Error('Google indisponible'));
      setTimeout(check, 100);
    })();
  });
}

// À appeler directement depuis un geste de l'utilisateur (appui sur un bouton), sinon la fenêtre Google peut être bloquée.
export async function signIn() {
  await whenGIS();
  return new Promise((resolve, reject) => {
    client ||= google.accounts.oauth2.initTokenClient({ client_id: CONFIG.GOOGLE_CLIENT_ID, scope: SCOPE, callback: () => {} });
    client.callback = r => {
      if (r.error) return reject(new Error(r.error));
      token = r.access_token; expires = Date.now() + r.expires_in * 1000;
      resolve();
    };
    client.error_callback = e => reject(new Error(e.type || 'auth'));
    client.requestAccessToken({ prompt: '' });
  });
}

async function api(path, { method = 'GET', params = {}, body } = {}) {
  if (!hasToken()) throw new Error('Google Agenda non connecté');
  const url = new URL(API + path);
  for (const [k, v] of Object.entries(params)) if (v != null) url.searchParams.set(k, v);
  const res = await fetch(url, {
    method,
    headers: { Authorization: `Bearer ${token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 204) return null;
  const json = await res.json().catch(() => ({}));
  if (!res.ok) { const e = new Error(json.error?.message || `Erreur Google (${res.status})`); e.status = res.status; throw e; }
  return json;
}

const norm = s => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// Retrouve le calendrier « Échéances » ; le crée s'il n'existe pas encore
async function echeancesCalId() {
  const r = await api('/users/me/calendarList', { params: { minAccessRole: 'writer' } });
  const hit = (r.items || []).find(c => norm(c.summaryOverride || c.summary).includes('echeance'));
  if (hit) return hit.id;
  const created = await api('/calendars', { method: 'POST', body: { summary: 'Échéances', timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone } });
  return created.id;
}

const eur = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });

// Date limite pour résilier = fin d'engagement − préavis
export const deadlineOf = c => (c.end_date ? U.addDays(U.parseYmd(c.end_date), -(c.notice_days || 0)) : null);

export async function removeAlert(c) {
  if (!c.cal_event_id || !c.cal_id) return;
  try { await api(`/calendars/${enc(c.cal_id)}/events/${enc(c.cal_event_id)}`, { method: 'DELETE' }); }
  catch (e) { if (e.status !== 404 && e.status !== 410) throw e; } // déjà supprimé côté Google
}

// Crée, met à jour ou supprime l'alerte selon l'état du contrat. Retourne { cal_id, cal_event_id } à stocker.
export async function syncAlert(c) {
  const deadline = deadlineOf(c);
  const wanted = c.status !== 'resilie' && deadline && U.daysBetween(new Date(), deadline) >= 0;
  if (!wanted) { await removeAlert(c); return { cal_id: null, cal_event_id: null }; }

  const calId = c.cal_id || await echeancesCalId();
  const body = {
    summary: `Résilier ou renégocier ${c.name} avant le ${U.fmtDM(deadline)}`,
    description: [`Montant : ${eur.format(c.amount)} ${c.frequency === 'annuel' ? 'par an' : 'par mois'}`, c.notes].filter(Boolean).join('\n'),
    location: c.cancel_url || null,
    start: { date: U.ymd(deadline) },
    end: { date: U.ymd(U.addDays(deadline, 1)) },
    // Rappel à 9h, N jours avant (pour une journée entière, Google compte depuis minuit du jour J ; max 4 semaines)
    reminders: { useDefault: false, overrides: [{ method: 'popup', minutes: Math.min(40320, (c.alert_days || 28) * 1440 - 540) }] },
    extendedProperties: { private: { source: 'abonnements', sourceId: c.id, cat: 'admin' } },
  };
  if (c.cal_event_id && c.cal_id) {
    try {
      const r = await api(`/calendars/${enc(c.cal_id)}/events/${enc(c.cal_event_id)}`, { method: 'PATCH', body });
      return { cal_id: c.cal_id, cal_event_id: r.id };
    } catch (e) { if (e.status !== 404 && e.status !== 410) throw e; } // supprimé à la main : on le recrée
  }
  const r = await api(`/calendars/${enc(calId)}/events`, { method: 'POST', body });
  return { cal_id: calId, cal_event_id: r.id };
}
