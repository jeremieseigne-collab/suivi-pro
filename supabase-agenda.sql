-- ══════════════════════════════════════════════════════════════════
-- App « Agenda » — table evenements (agenda partagé)
-- À exécuter dans : Supabase Dashboard > SQL Editor
-- (sans danger : ne touche aucune table existante)
-- ══════════════════════════════════════════════════════════════════

create table if not exists evenements (
  id         bigserial primary key,
  created_at timestamptz default now(),
  titre      text default '',
  date       text default '',   -- AAAA-MM-JJ
  heure      text default '',   -- HH:MM
  note       text default ''
);

alter table evenements disable row level security;

-- Synchronisation temps réel (ignorer l'erreur « already member » si déjà fait)
-- alter publication supabase_realtime add table evenements;
