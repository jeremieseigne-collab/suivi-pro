-- Plan C, étape 6 : réassorts en commandes (BASE DE TEST seulement tant que vous n'avez pas donné la commande de mise en production).
-- Un réassort d'une saison suivie par commandes devient une commande de type « reassort » quand la marque a confirmé : « Commandé »
-- (ou « En route »), étapes posées à la main (décision 8). « Demandé » = mail envoyé, en attente de confirmation : pas encore une commande
-- (décision du 22/10). Ses réceptions passent par la saisie de réception commune
-- (enregistrer_reception) ; le réassort suit tout seul (reçu, « En route », « Reçu »). Les réassorts en cours sont repris.
-- Saisons d'avant Été 2027 : rien ne change (aucune commande créée).
-- Annulation : supabase-plan-c-etape6-annulation.sql
begin;

-- R1. Lien du réassort à sa commande, reçu avant la reprise, prix saisi quand la commande de saison ne le donne pas
alter table public.reassorts add column commande_id bigint references public.achats_commandes(id) on delete set null;
alter table public.reassorts add column recu_avant_commande jsonb not null default '{}';
alter table public.reassorts add column prix_unitaire numeric(12, 2);
create index reassorts_commande on public.reassorts (commande_id);

-- R2. Prix d'un article de réassort : même modèle-coloris dans une commande de saison (même magasin d'abord, même taille d'abord)
create function public.prix_article_reassort(p_fournisseur bigint, p_magasin bigint, p_season text, p_code text, p_couleur text, p_taille text)
returns numeric language sql stable set search_path = public, pg_temp as $$
  select l.prix_achat from public.achats_lignes l join public.achats_commandes c on c.id = l.commande_id
  where c.type = 'saison' and c.fournisseur_id = p_fournisseur and c.season = p_season
    and l.code_modele = p_code and l.couleur = p_couleur and l.prix_achat > 0
  order by (c.magasin_id = p_magasin) desc, (l.taille = p_taille) desc, l.id
  limit 1
$$;
grant execute on function public.prix_article_reassort(bigint, bigint, text, text, text, text) to authenticated;

-- R3. Synchroniser la commande d'un réassort (création, quantités, étape, prix ; retour à « À réassortir » sans réception : la commande disparaît)
create function public.synchroniser_reassort(p_id bigint) returns bigint
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  r public.reassorts%rowtype; v_cid bigint; v_code text; v_couleur text; v_etape text; v_avant jsonb; t record;
  v_q int; v_recu int; v_prix numeric; v_marque text;
begin
  select * into r from public.reassorts where id = p_id;
  if not found or not public.saison_suivie_par_commandes(r.season) then return null; end if;
  -- Modèle « Code, Couleur » (nom des modèles issus des commandes) ; sans virgule : le modèle entier est le code
  v_code := btrim(split_part(coalesce(r.modele, ''), ',', 1));
  v_couleur := btrim(coalesce(nullif(substr(r.modele, length(split_part(r.modele, ',', 1)) + 2), ''), ''));
  if v_code = '' then return null; end if;
  v_etape := case when r.statut in ('Commandé', 'En route') then r.statut end;   -- « Demandé » : mail parti, pas encore une commande (22/10)
  v_cid := r.commande_id;

  if v_cid is null then
    if v_etape is null then return null; end if;   -- « À réassortir », « Demandé » : rien n'est commandé ; « Reçu » d'avant : historique
    v_avant := coalesce(r.recu, '{}');              -- reprise : ce qui a déjà été reçu avant la commande
    insert into public.achats_commandes (fournisseur_id, magasin_id, season, type, etape, etapes, date_commande, note)
    values (r.fournisseur_id, r.magasin_id, r.season, 'reassort', v_etape, coalesce(r.etapes, '{}'),
            coalesce((r.etapes ->> 'Commandé')::date, (r.etapes ->> v_etape)::date, current_date), 'Réassort ' || r.modele)
    returning id into v_cid;
    update public.reassorts set commande_id = v_cid, recu_avant_commande = v_avant where id = r.id;
  else
    v_avant := coalesce(r.recu_avant_commande, '{}');
    -- retour à « Demandé » ou « À réassortir » sans réception : la commande disparaît (la marque n'a pas, ou plus, confirmé)
    if r.statut in ('À réassortir', 'Demandé') and not exists (select 1 from public.entrees where commande_id = v_cid) then
      update public.reassorts set commande_id = null, recu_avant_commande = '{}' where id = r.id;
      delete from public.achats_commandes where id = v_cid;
      return null;
    end if;
    if v_etape is not null then
      update public.achats_commandes set etape = v_etape, etapes = coalesce(r.etapes, '{}') where id = v_cid and (etape is distinct from v_etape or etapes is distinct from coalesce(r.etapes, '{}'));
    end if;
  end if;

  select nom into v_marque from public.fournisseurs where id = r.fournisseur_id;
  -- Lignes : demandé − déjà reçu avant la reprise ; jamais sous ce que la commande a déjà reçu
  for t in select key as taille, (value)::int as q from jsonb_each_text(coalesce(r.sizes, '{}')) loop
    select coalesce(sum(ms.quantite), 0) into v_recu from public.mouvements_stock ms join public.achats_lignes l on l.id = ms.ligne_id
      where l.commande_id = v_cid and l.code_modele = v_code and l.couleur = v_couleur and l.taille = t.taille and ms.type = 'entree';
    v_q := greatest(0, t.q - coalesce((v_avant ->> t.taille)::int, 0), v_recu);
    if v_q = 0 then
      delete from public.achats_lignes l where l.commande_id = v_cid and l.code_modele = v_code and l.couleur = v_couleur and l.taille = t.taille
        and not exists (select 1 from public.mouvements_stock where ligne_id = l.id);
      continue;
    end if;
    v_prix := coalesce(public.prix_article_reassort(r.fournisseur_id, r.magasin_id, r.season, v_code, v_couleur, t.taille), r.prix_unitaire, 0);
    insert into public.achats_lignes (commande_id, ordre, marque, code_modele, libelle, couleur, taille, prix_achat, qte_commandee)
    values (v_cid, 0, coalesce(v_marque, ''), v_code, r.modele, v_couleur, t.taille, v_prix, v_q)
    on conflict (commande_id, code_modele, couleur, taille) do update
      set qte_commandee = excluded.qte_commandee,
          prix_achat = case when public.achats_lignes.prix_achat > 0 then public.achats_lignes.prix_achat else excluded.prix_achat end
      where public.achats_lignes.qte_commandee is distinct from excluded.qte_commandee or public.achats_lignes.prix_achat = 0;
  end loop;
  -- Tailles retirées du réassort : supprimées si rien reçu, sinon ramenées au reçu
  delete from public.achats_lignes l where l.commande_id = v_cid and not l.hors_commande and not (coalesce(r.sizes, '{}') ? l.taille)
    and not exists (select 1 from public.mouvements_stock where ligne_id = l.id);
  update public.achats_lignes l set qte_commandee = (select coalesce(sum(quantite), 0) from public.mouvements_stock where ligne_id = l.id)
    where l.commande_id = v_cid and not l.hors_commande and not (coalesce(r.sizes, '{}') ? l.taille);
  return v_cid;
end $$;
revoke all on function public.synchroniser_reassort(bigint) from public, anon;
grant execute on function public.synchroniser_reassort(bigint) to authenticated;

-- R4. Déclencheur : chaque création ou changement d'étape, de quantités ou de prix d'un réassort met sa commande à jour
create function public.reassort_vers_commande() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  perform public.synchroniser_reassort(new.id);
  return null;
end $$;
-- Réassort supprimé : sa commande disparaît si rien n'a été reçu (sinon elle reste, avec ses réceptions). APRÈS la suppression :
-- avant, la base refuse (le lien commande ↔ réassort modifierait la ligne en cours de suppression).
create function public.reassort_supprime() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if old.commande_id is not null and not exists (select 1 from public.entrees where commande_id = old.commande_id) then
    delete from public.achats_commandes where id = old.commande_id;
  end if;
  return null;
end $$;
create trigger reassort_vers_commande after insert or update of statut, sizes, modele, prix_unitaire, etapes on public.reassorts
  for each row execute function public.reassort_vers_commande();
create trigger reassort_supprime after delete on public.reassorts for each row execute function public.reassort_supprime();

-- R5. Déclencheur : une réception (ou sa correction, sa suppression) sur la commande d'un réassort met le réassort à jour
create function public.reassort_suit_reception() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_cid bigint; r public.reassorts%rowtype; v_recu jsonb; v_complet boolean; v_recu_cmd int; v_now text; v_rec jsonb;
begin
  select l.commande_id into v_cid from public.achats_lignes l where l.id = coalesce(new.ligne_id, old.ligne_id);
  if v_cid is null then return null; end if;
  select * into r from public.reassorts where commande_id = v_cid;
  if not found then return null; end if;
  v_now := to_char(now() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');
  select coalesce(jsonb_object_agg(k, n), '{}') into v_recu from (
    select k, sum(n)::int as n from (
      select key as k, (value)::int as n from jsonb_each_text(coalesce(r.recu_avant_commande, '{}'))
      union all select l.taille, l.qte_recue from public.achats_lignes_etat l where l.commande_id = v_cid and l.qte_recue > 0
    ) x group by k having sum(n) > 0) y;
  select coalesce(sum(qte_recue), 0), coalesce(bool_and(reste = 0), false) into v_recu_cmd, v_complet from public.achats_lignes_etat where commande_id = v_cid;
  -- Réceptions : celles d'avant la commande (gardées) puis celles de la commande (entrées du Cahier rattachées)
  select coalesce((select jsonb_agg(x) from jsonb_array_elements(coalesce(r.receptions, '[]')) x
                   where not exists (select 1 from public.entrees e where e.commande_id = v_cid and e.id = (x ->> 'entreeId')::bigint)
                     and coalesce((x ->> 'commande')::boolean, false) = false), '[]')
      || coalesce((select jsonb_agg(jsonb_build_object('date', e.cree, 'sizes', e.sizes, 'entreeId', e.id, 'commande', true) order by e.id)
                   from (select id, sizes, to_char(to_date(date, 'DD/MM/YYYY'), 'YYYY-MM-DD') as cree from public.entrees where commande_id = v_cid) e), '[]')
    into v_rec;
  update public.reassorts set
    recu = v_recu,
    receptions = v_rec,
    statut = case when v_complet and v_recu_cmd > 0 then 'Reçu'
                  when statut = 'Reçu' and not v_complet then 'En route'
                  when statut in ('Demandé', 'Commandé') and v_recu_cmd > 0 then 'En route'
                  else statut end,
    etapes = (coalesce(etapes, '{}') - case when not v_complet then 'Reçu' else '' end)
             || case when v_recu_cmd > 0 and not coalesce(etapes, '{}') ? 'En route' then jsonb_build_object('En route', v_now) else '{}' end
             || case when v_complet and v_recu_cmd > 0 and not coalesce(etapes, '{}') ? 'Reçu' then jsonb_build_object('Reçu', v_now) else '{}' end
  where id = r.id;
  return null;
end $$;
create trigger reassort_suit_reception after insert or delete on public.mouvements_stock
  for each row execute function public.reassort_suit_reception();

-- R6. Reprise des réassorts en cours (saisons suivies par commandes, déjà « Commandé » ou « En route » ; les « Demandé » deviendront
--     une commande quand la marque confirmera)
select public.synchroniser_reassort(id) from public.reassorts
  where commande_id is null and statut in ('Commandé', 'En route') and public.saison_suivie_par_commandes(season);

notify pgrst, 'reload schema';
commit;
