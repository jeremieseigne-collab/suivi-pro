-- Annulation de supabase-plan-c-etape7bis.sql — BASE DE TEST.
-- Supprime la colonne ; aucun montant (recu_n1) n'a été modifié par l'étape, donc rien à restaurer.
begin;
alter table public.parametres drop column if exists recu_n1_saisi;
notify pgrst, 'reload schema';
commit;
