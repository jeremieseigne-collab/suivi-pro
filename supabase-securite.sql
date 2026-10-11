-- Protection des données (B6 étape 1) — voir SECURITE.md
-- Testé sur la base de test le 10/10/2026. En production : uniquement après accord écrit,
-- APRÈS création des comptes + fermeture des inscriptions, et APRÈS mise en ligne du code avec connexion.

-- ── S2 : journal des mails (illisible et non modifiable depuis l'extérieur : filtrage sans règle) ──
create table if not exists public.mail_envois (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  destinataire text not null,
  objet text not null
);
alter table public.mail_envois enable row level security;
create index if not exists mail_envois_dest_date on public.mail_envois (destinataire, created_at);

-- ── S2 bis : noter un envoi si le plafond (24 h glissantes) n'est pas atteint ──
create or replace function public.noter_envoi_mail(destinataire text, objet text)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  plafond int;
  deja int;
begin
  plafond := case lower(trim(destinataire))
    when 'marion.fouquereau@lecussan.fr' then 3    -- récap mensuel de paie
    when 'jeremie.seigne@gmail.com'      then 10   -- demandes de modification
    else 0 end;
  if plafond = 0 then return false; end if;
  perform pg_advisory_xact_lock(hashtext(lower(trim(destinataire))));
  select count(*) into deja from public.mail_envois
    where mail_envois.destinataire = lower(trim(noter_envoi_mail.destinataire)) and created_at > now() - interval '24 hours';
  if deja >= plafond then return false; end if;
  insert into public.mail_envois (destinataire, objet) values (lower(trim(noter_envoi_mail.destinataire)), left(objet, 200));
  return true;
end $$;
revoke all on function public.noter_envoi_mail(text, text) from public, anon;
grant execute on function public.noter_envoi_mail(text, text) to authenticated;

-- ── S1 : filtrage — seuls les comptes connectés accèdent aux tables (à lancer EN DERNIER) ──
do $$
declare t text;
begin
  for t in select tablename from pg_tables where schemaname = 'public' and tablename <> 'mail_envois' loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "comptes connectés" on public.%I', t);
    execute format('create policy "comptes connectés" on public.%I for all to authenticated using (true) with check (true)', t);
  end loop;
end $$;

notify pgrst, 'reload schema';

-- ── RETOUR ARRIÈRE de S1 (effet immédiat, aucune donnée touchée) ──
-- do $$ declare t text; begin
--   for t in select tablename from pg_tables where schemaname = 'public' and tablename <> 'mail_envois' loop
--     execute format('alter table public.%I disable row level security', t);
--   end loop; end $$;
