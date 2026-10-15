-- ═══════════════════════════════════════════════════════════════════════════════
-- Plan C, étape 3 — N° du modèle mémorisé sur la ligne de commande (15/10). À appliquer après supabase-plan-c.sql
-- (et les compléments). E1 : colonne achats_lignes.numero ; E2 : la vue des lignes la montre ; E3 : enregistrer et
-- corriger une réception mémorisent le N° saisi sur toutes les lignes du modèle-coloris de la commande (pour les
-- réceptions suivantes) ; une correction met aussi à jour le N° de l'entrée. Annulation : supabase-plan-c-etape3-annulation.sql.
-- ═══════════════════════════════════════════════════════════════════════════════
begin;

-- E1
alter table public.achats_lignes add column numero text not null default '';

-- E2 (même vue, le N° ajouté à la fin)
create or replace view public.achats_lignes_etat with (security_invoker = true) as
select l.id, l.commande_id, l.ordre, l.collection, l.magasin_fichier, l.marque, l.gencode, l.code_modele, l.libelle, l.couleur, l.taille, l.rayon, l.famille, l.sous_famille, l.prix_achat, l.pvc, l.chaussant, l.hauteur_talon, l.matiere, l.semelle_exterieure, l.fermeture, l.saison_polaris, l.qte_commandee, l.qte_annulee, l.hors_commande, l.cree_le,
       coalesce(r.recu, 0)                                                   as qte_recue,
       greatest(0, l.qte_commandee - coalesce(r.recu, 0) - l.qte_annulee)    as reste,
       greatest(0, coalesce(r.recu, 0) - l.qte_commandee)                    as surplus,
       l.numero
from public.achats_lignes l
left join (select ligne_id, sum(quantite)::int as recu from public.mouvements_stock where type = 'entree' group by ligne_id) r
  on r.ligne_id = l.id;

-- E3
create function public.memoriser_numero(p_commande_id bigint, p_article jsonb) returns void
language sql security definer set search_path = public, pg_temp as $$
  update public.achats_lignes set numero = btrim(p_article ->> 'numero')
  where commande_id = p_commande_id and code_modele = btrim(coalesce(p_article ->> 'code_modele', '')) and couleur = btrim(coalesce(p_article ->> 'couleur', ''))
    and coalesce(btrim(p_article ->> 'numero'), '') <> '' and numero is distinct from btrim(p_article ->> 'numero')
$$;
revoke all on function public.memoriser_numero(bigint, jsonb) from public, anon, authenticated;

create or replace function public.enregistrer_reception(p_commande_id bigint, p_date text, p_articles jsonb, p_commentaire text default '')
returns bigint[]
language plpgsql security definer
set search_path = public, pg_temp
as $$
declare
  c public.achats_commandes%rowtype; v_date date; a jsonb; r jsonb; v_id bigint; v_ids bigint[] := '{}';
begin
  if auth.uid() is null then raise exception 'Connexion requise' using errcode = '28000'; end if;
  select * into c from public.achats_commandes where id = p_commande_id for update;   -- une réception à la fois par commande
  if not found then raise exception 'Commande introuvable'; end if;
  v_date := to_date(p_date, 'DD/MM/YYYY');
  if jsonb_typeof(p_articles) is distinct from 'array' or jsonb_array_length(p_articles) = 0 then raise exception 'Aucun article'; end if;
  perform set_config('suivi_pro.par_fonction', 'oui', true);
  for a in select value from jsonb_array_elements(p_articles) loop
    insert into public.entrees (magasin_id, fournisseur_id, date, statut, season, modele, numero, categorie, type_key, total, pht, sizes, commentaire, commande_id)
    values (c.magasin_id, c.fournisseur_id, p_date, case when c.type = 'reassort' then 'Réassort' else '' end, c.season, '',
            coalesce(a ->> 'numero', ''), coalesce(a ->> 'categorie', ''), coalesce(a ->> 'type_key', 'F'), 0, 0, '{}',
            coalesce(p_commentaire, ''), c.id)
    returning id into v_id;
    r := public.reception_article(c, v_id, v_date, a);
    update public.entrees set modele = r ->> 'modele', total = (r ->> 'total')::int, pht = (r ->> 'pht')::numeric, sizes = r -> 'sizes'
      where id = v_id;
    perform public.memoriser_numero(c.id, a);
    v_ids := v_ids || v_id;
  end loop;
  perform set_config('suivi_pro.par_fonction', '', true);
  return v_ids;
end $$;

create or replace function public.corriger_reception(p_entree_id bigint, p_date text, p_article jsonb)
returns void
language plpgsql security definer
set search_path = public, pg_temp
as $$
declare e public.entrees%rowtype; c public.achats_commandes%rowtype; r jsonb;
begin
  if auth.uid() is null then raise exception 'Connexion requise' using errcode = '28000'; end if;
  select * into e from public.entrees where id = p_entree_id;
  if not found or e.commande_id is null then raise exception 'Réception rattachée introuvable'; end if;
  select * into c from public.achats_commandes where id = e.commande_id for update;
  perform set_config('suivi_pro.par_fonction', 'oui', true);
  delete from public.mouvements_stock where entree_id = e.id;
  r := public.reception_article(c, e.id, to_date(p_date, 'DD/MM/YYYY'), p_article);
  update public.entrees set date = p_date, modele = r ->> 'modele', total = (r ->> 'total')::int, pht = (r ->> 'pht')::numeric, sizes = r -> 'sizes',
    numero = coalesce(p_article ->> 'numero', numero)
    where id = e.id;
  perform public.memoriser_numero(c.id, p_article);
  perform set_config('suivi_pro.par_fonction', '', true);
end $$;

notify pgrst, 'reload schema';
commit;
