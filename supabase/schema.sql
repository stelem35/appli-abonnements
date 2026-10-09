-- Suivi des abonnements : à coller dans Supabase → SQL Editor → Run
-- Chaque contrat appartient à un utilisateur ; la sécurité (RLS) garantit que tu ne vois que les tiens.

create table public.contracts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null,
  category text not null default 'autre'
    check (category in ('streaming', 'telecom', 'assurance', 'energie', 'sport', 'logiciel', 'autre')),
  amount numeric(10, 2) not null check (amount >= 0),
  frequency text not null default 'mensuel' check (frequency in ('mensuel', 'annuel')),
  start_date date,
  end_date date,                                   -- fin d'engagement ou renouvellement
  notice_days integer not null default 30 check (notice_days >= 0),   -- préavis de résiliation
  alert_days integer not null default 28 check (alert_days between 0 and 28), -- rappel Google (max 4 semaines)
  cancel_url text,                                 -- lien du site de résiliation
  notes text,
  target_amount numeric(10, 2) check (target_amount >= 0),            -- montant cible / offre concurrente
  status text not null default 'actif' check (status in ('actif', 'a_renegocier', 'resilie')),
  cal_id text,                                     -- calendrier Google « Échéances »
  cal_event_id text,                               -- événement d'alerte associé
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.contracts enable row level security;

-- Accès à l'API réservé aux utilisateurs connectés (rien pour les visiteurs anonymes)
grant select, insert, update, delete on public.contracts to authenticated;

create policy "contracts_select_own" on public.contracts
  for select to authenticated using (auth.uid() = user_id);
create policy "contracts_insert_own" on public.contracts
  for insert to authenticated with check (auth.uid() = user_id);
create policy "contracts_update_own" on public.contracts
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "contracts_delete_own" on public.contracts
  for delete to authenticated using (auth.uid() = user_id);

create function public.set_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger contracts_set_updated_at before update on public.contracts
  for each row execute function public.set_updated_at();
