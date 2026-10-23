-- Annulation des compléments de l'étape 2 (supabase-plan-c-complements.sql). Une seule transaction.
-- Les lignes « suppression » déjà au journal sont gardées : l'ancienne contrainte est remise « not valid » (elle vaut pour les nouvelles
-- lignes ; la fonction qui écrivait « suppression » est retirée juste avant). Corrigé le 23/10 : la version d'avant échouait dans ce cas.
begin;
drop function if exists public.supprimer_commande(bigint, text);
alter table public.achats_journal drop constraint achats_journal_action_check;
alter table public.achats_journal add constraint achats_journal_action_check
  check (action in ('import', 'reimport', 'annulation', 'retablissement')) not valid;
create or replace view public.achats_commandes_etat with (security_invoker = true) as
select c.*,
       coalesce(s.commandee, 0) as qte_commandee, coalesce(s.recue, 0) as qte_recue, coalesce(s.annulee, 0) as qte_annulee,
       coalesce(s.reste, 0) as reste, coalesce(s.montant_net, 0) as montant_net, coalesce(s.hors, 0) as lignes_hors_commande,
       case
         when coalesce(s.reste, 0) = 0 and coalesce(s.commandee, 0) + coalesce(s.recue, 0) > 0
           then case when c.type = 'reassort' then 'Reçu' else 'Soldée' end
         when c.type = 'reassort' then coalesce(c.etape, 'Demandé')
         when coalesce(s.recue, 0) = 0 then 'Commandée'
         else 'Partiellement reçue'
       end as statut
from public.achats_commandes c
left join (
  select commande_id, sum(qte_commandee)::int as commandee, sum(qte_recue)::int as recue, sum(qte_annulee)::int as annulee,
         sum(reste)::int as reste, sum((qte_commandee - qte_annulee) * prix_achat) as montant_net,
         count(*) filter (where hors_commande)::int as hors
  from public.achats_lignes_etat group by commande_id
) s on s.commande_id = c.id;
notify pgrst, 'reload schema';
commit;
