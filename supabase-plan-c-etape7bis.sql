-- Plan C, étape 7 bis : « Reçu N-1 » calculé ou saisi (BASE DE TEST seulement tant que vous n'avez pas donné la commande de mise en production).
-- Le Reçu N-1 de l'écran Achats devient un calcul automatique (somme en euros des entrées du Cahier de la MÊME saison l'année précédente,
-- par marque et par magasin, retours exclus). Une ligne peut le forcer à la main : parametres.recu_n1_saisi = true (alors parametres.recu_n1
-- est la valeur saisie) ; false = calculé (la valeur de recu_n1 est ignorée, remise à 0 par le bouton « Utiliser le calcul »).
-- Ajout sans perte : aucun montant existant n'est modifié ; les montants déjà saisis (recu_n1 <> 0) sont marqués « saisis » pour qu'ils restent affichés tels quels.
-- Annulation : supabase-plan-c-etape7bis-annulation.sql
begin;

alter table public.parametres add column recu_n1_saisi boolean not null default false;
update public.parametres set recu_n1_saisi = true where coalesce(recu_n1, 0) <> 0;

notify pgrst, 'reload schema';
commit;
