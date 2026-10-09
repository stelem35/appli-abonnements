export const startOfDay = d => new Date(d.getFullYear(), d.getMonth(), d.getDate());
export const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
export const daysBetween = (a, b) => Math.round((startOfDay(b) - startOfDay(a)) / 864e5);

const p2 = n => String(n).padStart(2, '0');
export const ymd = d => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
export const parseYmd = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
export const fmtDate = d => new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }).format(d);
export const fmtDM = d => `${p2(d.getDate())}/${p2(d.getMonth() + 1)}`;

export function countdown(d) {
  const n = daysBetween(new Date(), d);
  if (n < 0) return 'dépassé';
  if (n === 0) return "aujourd'hui";
  if (n === 1) return 'demain';
  if (n < 60) return `dans ${n} jours`;
  return `dans ${Math.round(n / 30)} mois`;
}
