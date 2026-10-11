-- Protection des données — ÉTAPE 2 (voir SECURITE.md, partie « Étape 2 »)
-- Paie réservée à la Direction, écritures sensibles réservées à la Direction, déconnexion à distance.
-- Base de test d'abord. En production : uniquement après accord écrit (et après la connexion des 3 magasins).
-- E6 n'est pas nécessaire : l'appareil compare la liste des salariés à paie_remplies().

-- ── E1 : marquer les comptes Direction (adresses selon la base) ──
-- Base de TEST :
--   update auth.users set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"direction"}'
--   where email in ('direction.test@example.com', 'direction2.test@example.com');
-- PRODUCTION :
--   update auth.users set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"direction"}'
--   where email in ('jeremie.seigne@gmail.com', 'raphaelseigne04@gmail.com');

-- ── E2 : le compte connecté est-il un compte Direction ? ──
create or replace function public.est_direction()
returns boolean
language sql
stable
set search_path = public, pg_temp
as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'direction'
$$;
revoke all on function public.est_direction() from public, anon;
grant execute on function public.est_direction() to authenticated;

-- ── E3 : paie — dépôt seul pour les magasins, tout pour la Direction ──
drop policy if exists "comptes connectés" on public.paie_variables;
drop policy if exists "écriture Direction" on public.paie_variables;
drop policy if exists "dépôt magasin" on public.paie_variables;
create policy "écriture Direction" on public.paie_variables for all to authenticated using (public.est_direction()) with check (public.est_direction());
create policy "dépôt magasin" on public.paie_variables for insert to authenticated with check (true);

-- Prénoms déjà remplis pour une période, sans aucun contenu
create or replace function public.paie_remplies(p_periode text)
returns table (salarie text)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select paie_variables.salarie from public.paie_variables where paie_variables.periode = p_periode
$$;
revoke all on function public.paie_remplies(text) from public, anon;
grant execute on function public.paie_remplies(text) to authenticated;

-- ── E4 + E4 bis : écriture réservée à la Direction ; lecture selon la table ──
do $$
declare t text;
begin
  -- lisibles par tous les comptes connectés (l'outil en a besoin), modifiables par la Direction seulement
  foreach t in array array['salaries', 'magasins', 'modes_reglement', 'parametres'] loop
    execute format('drop policy if exists "comptes connectés" on public.%I', t);
    execute format('drop policy if exists "lecture comptes connectés" on public.%I', t);
    execute format('drop policy if exists "écriture Direction" on public.%I', t);
    execute format('create policy "lecture comptes connectés" on public.%I for select to authenticated using (true)', t);
    execute format('create policy "écriture Direction" on public.%I for all to authenticated using (public.est_direction()) with check (public.est_direction())', t);
  end loop;
  -- Direction seulement, en lecture comme en écriture
  foreach t in array array['reglement_paye', 'paie_envois'] loop
    execute format('drop policy if exists "comptes connectés" on public.%I', t);
    execute format('drop policy if exists "écriture Direction" on public.%I', t);
    execute format('create policy "écriture Direction" on public.%I for all to authenticated using (public.est_direction()) with check (public.est_direction())', t);
  end loop;
end $$;

-- ── E5 : déconnecter tous les appareils d'un compte (Direction seulement) ──
create or replace function public.deconnecter_compte(adresse text)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  uid uuid;
  n integer;
begin
  if not public.est_direction() then raise exception 'Réservé à la Direction'; end if;
  select id into uid from auth.users where lower(email) = lower(trim(adresse));
  if uid is null then raise exception 'Compte inconnu : %', adresse; end if;
  delete from auth.refresh_tokens where user_id = uid::text;
  delete from auth.sessions where user_id = uid;
  get diagnostics n = row_count;
  return n;
end $$;
revoke all on function public.deconnecter_compte(text) from public, anon;
grant execute on function public.deconnecter_compte(text) to authenticated;

-- ── E7 : seul un compte Direction peut changer le pointage d'une entrée ──
-- (un compte magasin crée et corrige ses entrées normalement, mais ne peut ni pointer ni dépointer)
create or replace function public.pointage_reserve_direction()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if public.est_direction() then return new; end if;
  if tg_op = 'INSERT' and coalesce(new.pointe, false) then
    raise exception 'Le pointage est réservé à la direction';
  end if;
  if tg_op = 'UPDATE' and new.pointe is distinct from old.pointe then
    raise exception 'Le pointage est réservé à la direction';
  end if;
  return new;
end $$;
drop trigger if exists pointage_reserve_direction on public.entrees;
create trigger pointage_reserve_direction before insert or update on public.entrees
  for each row execute function public.pointage_reserve_direction();

notify pgrst, 'reload schema';

-- ── RETOUR ARRIÈRE : revenir aux règles de l'étape 1 (« tout compte connecté ») ──
-- do $$ declare t text; begin
--   foreach t in array array['salaries','magasins','modes_reglement','parametres','reglement_paye','paie_envois','paie_variables'] loop
--     execute format('drop policy if exists "lecture comptes connectés" on public.%I', t);
--     execute format('drop policy if exists "écriture Direction" on public.%I', t);
--     execute format('drop policy if exists "dépôt magasin" on public.%I', t);
--     execute format('drop policy if exists "comptes connectés" on public.%I', t);
--     execute format('create policy "comptes connectés" on public.%I for all to authenticated using (true) with check (true)', t);
--   end loop; end $$;
-- drop trigger if exists pointage_reserve_direction on public.entrees;   -- (annule E7)
-- notify pgrst, 'reload schema';
