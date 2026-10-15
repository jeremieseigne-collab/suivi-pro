-- ═══════════════════════════════════════════════════════════════════════════════
-- Plan C, compléments de l'étape 2 (15/10) — à appliquer après supabase-plan-c.sql (et supabase-plan-c-2bis.sql).
-- C1 : le journal accepte l'action « suppression » ; C2 : supprimer une commande importée (Direction, sans réception,
-- notée au journal, motif facultatif) ; C3 : « Soldée » devient « Reçue en totalité ».
-- Annulation : supabase-plan-c-complements-annulation.sql. Une seule transaction.
-- ═══════════════════════════════════════════════════════════════════════════════
begin;

-- C1
alter table public.achats_journal drop constraint achats_journal_action_check;
alter table public.achats_journal add constraint achats_journal_action_check
  check (action in ('import', 'reimport', 'annulation', 'retablissement', 'suppression'));

-- C2. La trace reste au journal (le lien vers la commande devient vide, le détail garde marque, magasin, n° BC, paires, montant)
create function public.supprimer_commande(p_commande_id bigint, p_motif text default '')
returns void
language plpgsql security definer
set search_path = public, pg_temp
as $$
declare c record;
begin
  if not public.est_direction() then raise exception 'Supprimer une commande est réservé à la Direction' using errcode = '42501'; end if;
  select e.*, f.nom as marque, m.nom as magasin into c
    from public.achats_commandes_etat e join public.fournisseurs f on f.id = e.fournisseur_id join public.magasins m on m.id = e.magasin_id
    where e.id = p_commande_id;
  if not found then raise exception 'Commande introuvable'; end if;
  perform 1 from public.achats_commandes where id = p_commande_id for update;
  if exists (select 1 from public.entrees where commande_id = p_commande_id)
     or exists (select 1 from public.mouvements_stock ms join public.achats_lignes l on l.id = ms.ligne_id where l.commande_id = p_commande_id) then
    raise exception 'Des réceptions sont rattachées à cette commande : passe par « Annuler le reliquat »' using errcode = 'P0001';
  end if;
  insert into public.achats_journal (commande_id, action, motif, detail)
  values (p_commande_id, 'suppression', btrim(coalesce(p_motif, '')), jsonb_build_object(
    'commande', p_commande_id, 'marque', c.marque, 'magasin', c.magasin, 'saison', c.season, 'type', c.type,
    'numeros_bc', c.numeros_bc, 'fichier', c.fichier, 'paires', c.qte_commandee, 'montant_net', c.montant_net));
  delete from public.achats_commandes where id = p_commande_id;
end $$;
revoke all on function public.supprimer_commande(bigint, text) from public, anon;
grant execute on function public.supprimer_commande(bigint, text) to authenticated;

-- C3. Même vue, seul le libellé change
create or replace view public.achats_commandes_etat with (security_invoker = true) as
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

notify pgrst, 'reload schema';
commit;
