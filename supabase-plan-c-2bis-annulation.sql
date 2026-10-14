-- ═══════════════════════════════════════════════════════════════════════════════
-- Annulation du plan C, étape 2 bis (supabase-plan-c-2bis.sql), dans l'ordre inverse.
-- Les tables existantes retrouvent exactement leur structure d'avant ; leurs données n'ont jamais été effacées
-- (fournisseurs.groupe, modes_reglement, parametres.cheques, contacts des marques), donc rien à reconstituer.
-- ⚠️ Perd ce qui a été saisi depuis dans les nouvelles tables (fournisseurs, règlements, plans chèques au fournisseur).
-- ⚠️ Une fusion de fournisseurs faite entre-temps a pu renommer des clés de pointage de chèques (reglement_paye.cle) :
--    à vérifier avant d'annuler (voir le journal de la fusion dans PLAN-REFONTE.md).
-- Une seule transaction : en cas d'erreur, rien n'est retiré.
-- ═══════════════════════════════════════════════════════════════════════════════

begin;

-- N12 (temps réel) : retiré avec les tables.
-- N8, N9, N10
drop function if exists public.fusionner_fournisseurs(bigint, bigint, boolean);
drop view if exists public.fournisseurs_reels_etat;
drop trigger if exists fournisseur_garde_fous on public.fournisseurs_reels;
drop function if exists public.fournisseur_garde_fous();
-- N4
drop trigger if exists marque_fournisseur on public.fournisseurs;
drop function if exists public.marque_fournisseur();
drop function if exists public.appel_application();
-- N7 (fonctions de comparaison des contacts)
drop function if exists public.signature_contacts(public.fournisseurs);
drop function if exists public.signature_societe(public.fournisseurs);
-- N6, N5
drop table if exists public.plans_cheques;
drop table if exists public.reglements_fournisseurs;
-- N3, N2
drop index if exists public.fournisseurs_fournisseur_reel;
alter table public.fournisseurs drop column if exists contacts_herites;
alter table public.fournisseurs drop column if exists fournisseur_reel_id;
-- N1
drop table if exists public.fournisseurs_reels;
drop function if exists public.fournisseur_cle_pointage();

notify pgrst, 'reload schema';

commit;
