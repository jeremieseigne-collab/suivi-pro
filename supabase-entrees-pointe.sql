-- Cahier des entrées : pointage des lignes
alter table public.entrees add column if not exists pointe boolean default false;
notify pgrst, 'reload schema';
select column_name from information_schema.columns where table_name = 'entrees' and column_name = 'pointe';
