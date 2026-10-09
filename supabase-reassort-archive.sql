-- Top modèles : archivage + relance du suivi après un réassort reçu
alter table public.top_modeles add column if not exists archived_at timestamptz;
alter table public.top_modeles add column if not exists relance_at timestamptz;
notify pgrst, 'reload schema';
select column_name from information_schema.columns where table_name = 'top_modeles' and column_name in ('archived_at', 'relance_at');
