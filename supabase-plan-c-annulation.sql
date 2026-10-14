-- ═══════════════════════════════════════════════════════════════════════════════
-- Annulation du plan C, étape 1 (supabase-plan-c.sql) : retire tout ce que ce fichier a ajouté,
-- dans l'ordre inverse. Les tables existantes retrouvent exactement leur structure d'avant.
-- ⚠️ Efface les commandes, lignes, journal, mouvements et correspondances saisis depuis,
--    ainsi que le rattachement des entrées à leur commande (les entrées elles-mêmes restent).
-- Une seule transaction : en cas d'erreur, rien n'est retiré.
-- ═══════════════════════════════════════════════════════════════════════════════

begin;

-- M20 (temps réel) : retiré automatiquement avec les tables (drop table).

-- M11. Déclencheur des réceptions sur `entrees`
drop trigger  if exists reception_par_fonction on public.entrees;
drop function if exists public.reception_par_fonction();

-- M13 à M17. Fonctions
drop function if exists public.annuler_retablir_reliquat(bigint, text, text, bigint);
drop function if exists public.reimporter_commande(bigint, jsonb, jsonb, boolean);
drop function if exists public.importer_commande(jsonb, jsonb);
drop function if exists public.corriger_reception(bigint, text, jsonb);
drop function if exists public.enregistrer_reception(bigint, text, jsonb, text);
drop function if exists public.reception_article(public.achats_commandes, bigint, date, jsonb);

-- M9. Vues
drop view if exists public.achats_commandes_etat;
drop view if exists public.achats_lignes_etat;

-- M8. Colonne ajoutée à `entrees` (et son index)
drop index if exists public.entrees_commande;
alter table public.entrees drop column if exists commande_id;

-- M7, M6, M10, M5, M4, M3. Tables (leurs règles d'accès, index, déclencheurs et autorisations partent avec elles)
drop table if exists public.mouvements_stock;
drop table if exists public.achats_journal;
drop table if exists public.achats_lignes;
drop function if exists public.reliquat_reserve_direction();
drop table if exists public.achats_commandes;
drop table if exists public.magasins_correspondance;

-- M2, M1. Fonctions utilitaires
drop function if exists public.saison_suivie_par_commandes(text);
drop function if exists public.forme_texte(text);

notify pgrst, 'reload schema';

commit;
