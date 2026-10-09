// Accès Supabase : connexion Google + table `contracts` (protégée par RLS : chaque utilisateur ne voit que ses lignes)
import { CONFIG } from './config.js';

export const isConfigured = () => !CONFIG.SUPABASE_URL.startsWith('COLLER_ICI');

export const sb = isConfigured()
  ? window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    })
  : null;

export const signIn = () =>
  sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: location.origin + location.pathname } });
export const signOut = () => sb.auth.signOut();
export const getSession = async () => (await sb.auth.getSession()).data.session;

export async function listContracts() {
  const { data, error } = await sb.from('contracts').select('*').order('created_at');
  if (error) throw new Error(error.message);
  return data;
}

// Sans `id` : création. Avec `id` : mise à jour (champs partiels acceptés).
export async function saveContract({ id, ...fields }) {
  const q = id ? sb.from('contracts').update(fields).eq('id', id) : sb.from('contracts').insert(fields);
  const { data, error } = await q.select().single();
  if (error) throw new Error(error.message);
  return data;
}

export async function deleteContract(id) {
  const { error } = await sb.from('contracts').delete().eq('id', id);
  if (error) throw new Error(error.message);
}
