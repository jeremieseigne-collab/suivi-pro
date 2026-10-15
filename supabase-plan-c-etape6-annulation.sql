-- Annulation de supabase-plan-c-etape6.sql (réassorts en commandes) — BASE DE TEST.
-- Les commandes de réassort créées par l'étape 6 sans réception sont supprimées ; celles qui ont des réceptions restent
-- (leurs entrées du Cahier sont de vraies réceptions) mais ne sont plus reliées aux réassorts.
begin;
drop trigger if exists reassort_suit_reception on public.mouvements_stock;
drop trigger if exists reassort_vers_commande on public.reassorts;
drop trigger if exists reassort_supprime on public.reassorts;
delete from public.achats_commandes c where c.id in (select commande_id from public.reassorts where commande_id is not null)
  and not exists (select 1 from public.entrees e where e.commande_id = c.id);
drop function if exists public.reassort_suit_reception();
drop function if exists public.reassort_vers_commande();
drop function if exists public.reassort_supprime();
drop function if exists public.synchroniser_reassort(bigint);
drop function if exists public.prix_article_reassort(bigint, bigint, text, text, text, text);
drop index if exists public.reassorts_commande;
alter table public.reassorts drop column if exists prix_unitaire;
alter table public.reassorts drop column if exists recu_avant_commande;
alter table public.reassorts drop column if exists commande_id;
notify pgrst, 'reload schema';
commit;
