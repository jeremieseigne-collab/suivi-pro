-- ══════════════════════════════════════════════════════════════════
-- Table salaries (liste des salariés, gérée dans Paramètres)
-- À exécuter dans : Supabase Dashboard > SQL Editor
-- (sans danger : ne touche aucune table existante)
-- ══════════════════════════════════════════════════════════════════

create table if not exists salaries (
  id  bigserial primary key,
  nom text unique not null
);

alter table salaries disable row level security;

-- Synchronisation temps réel (ignorer l'erreur « already member » si déjà fait)
-- alter publication supabase_realtime add table salaries;

-- Liste initiale (optionnel)
insert into salaries (nom) values ('Eve'),('Louise'),('Ines'),('Marie'),('Sabrina'),('Raphaël'),('Jérémie')
  on conflict (nom) do nothing;
