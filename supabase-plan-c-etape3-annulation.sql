-- Annulation de supabase-plan-c-etape3.sql (N° sur la ligne de commande). Une seule transaction.
begin;
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
  update public.entrees set date = p_date, modele = r ->> 'modele', total = (r ->> 'total')::int, pht = (r ->> 'pht')::numeric, sizes = r -> 'sizes'
    where id = e.id;
  perform set_config('suivi_pro.par_fonction', '', true);
end $$;

drop function if exists public.memoriser_numero(bigint, jsonb);
drop view public.achats_commandes_etat;
drop view public.achats_lignes_etat;
alter table public.achats_lignes drop column numero;
create view public.achats_lignes_etat with (security_invoker = true) as
select l.*,
       coalesce(r.recu, 0)                                                   as qte_recue,
       greatest(0, l.qte_commandee - coalesce(r.recu, 0) - l.qte_annulee)    as reste,
       greatest(0, coalesce(r.recu, 0) - l.qte_commandee)                    as surplus
from public.achats_lignes l
left join (select ligne_id, sum(quantite)::int as recu from public.mouvements_stock where type = 'entree' group by ligne_id) r
  on r.ligne_id = l.id;
-- la vue des commandes est recréée telle que la laissent les compléments (« Reçue en totalité »)
create view public.achats_commandes_etat with (security_invoker = true) as
select c.*,
       coalesce(s.commandee, 0)  as qte_commandee,
       coalesce(s.recue, 0)      as qte_recue,
       coalesce(s.annulee, 0)    as qte_annulee,
       coalesce(s.reste, 0)      as reste,
       coalesce(s.montant_net, 0) as montant_net,
       coalesce(s.hors, 0)       as lignes_hors_commande,
       case
         when coalesce(s.reste, 0) = 0 and coalesce(s.commandee, 0) + coalesce(s.recue, 0) > 0
           then case when c.type = 'reassort' then 'Reçu' else 'Reçue en totalité' end
         when c.type = 'reassort' then coalesce(c.etape, 'Demandé')
         when coalesce(s.recue, 0) = 0 then 'Commandée'
         else 'Partiellement reçue'
       end as statut
from public.achats_commandes c
left join (
  select commande_id,
         sum(qte_commandee)::int as commandee, sum(qte_recue)::int as recue, sum(qte_annulee)::int as annulee,
         sum(reste)::int as reste, sum((qte_commandee - qte_annulee) * prix_achat) as montant_net,
         count(*) filter (where hors_commande)::int as hors
  from public.achats_lignes_etat group by commande_id
) s on s.commande_id = c.id;
grant select on public.achats_lignes_etat, public.achats_commandes_etat to anon, authenticated, service_role;
notify pgrst, 'reload schema';
commit;
