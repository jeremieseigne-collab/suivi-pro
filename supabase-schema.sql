-- ══════════════════════════════════════════════════════════════════
-- Suivi Pro — Schéma Supabase
-- À exécuter dans : Supabase Dashboard > SQL Editor
-- ══════════════════════════════════════════════════════════════════

-- Supprime les tables existantes si nécessaire (repart de zéro)
drop table if exists suivi          cascade;
drop table if exists modes_reglement cascade;
drop table if exists entrees        cascade;
drop table if exists parametres     cascade;
drop table if exists fournisseurs   cascade;
drop table if exists magasins       cascade;

-- Magasins
create table magasins (
  id   bigserial primary key,
  nom  text unique not null
);

-- Fournisseurs / Marques
create table fournisseurs (
  id                bigserial primary key,
  nom               text unique not null,
  modeles_by_season jsonb default '{}'::jsonb
);

-- Achats / Paramètres (une ligne par fournisseur × magasin × saison)
create table parametres (
  id             bigserial primary key,
  fournisseur_id bigint references fournisseurs(id) on delete cascade,
  magasin_id     bigint references magasins(id)     on delete cascade,
  season         text    default '',
  statut         text    default '',
  recu_n1        numeric default 0,
  objectif_n     numeric default 0,
  reel_n         numeric default 0,
  quantite       numeric default 0,
  pm             numeric default 0,
  strategie      text    default '',
  pht            numeric default 0
);

-- Entrées de livraison
create table entrees (
  id             bigserial primary key,
  magasin_id     bigint references magasins(id)     on delete cascade,
  fournisseur_id bigint references fournisseurs(id) on delete cascade,
  date           text    default '',
  statut         text    default '',
  season         text    default '',
  modele         text    default '',
  numero         text    default '',
  categorie      text    default '',
  type_key       text    default 'F',
  total          integer default 0,
  pht            numeric default 0,
  sizes          jsonb   default '{}'::jsonb,
  commentaire    text    default ''
);

-- Modes de règlement (global, sans saison)
create table modes_reglement (
  id             bigserial primary key,
  fournisseur_id bigint references fournisseurs(id) on delete cascade,
  magasin_id     bigint references magasins(id)     on delete cascade,
  mode_reglement text    default ''
);

-- Suivi attendu (interne)
create table suivi (
  id             bigserial primary key,
  fournisseur_id bigint references fournisseurs(id) on delete cascade,
  magasin_id     bigint references magasins(id)     on delete cascade,
  attendu        integer default 0
);

-- ──────────────────────────────────────────────────────────────────
-- Désactiver RLS (app interne, pas d'authentification publique)
-- ──────────────────────────────────────────────────────────────────
alter table magasins        disable row level security;
alter table fournisseurs    disable row level security;
alter table parametres      disable row level security;
alter table entrees         disable row level security;
alter table modes_reglement disable row level security;
alter table suivi           disable row level security;

-- ──────────────────────────────────────────────────────────────────
-- Activer le temps réel (synchronisation instantanée entre appareils)
-- ──────────────────────────────────────────────────────────────────
alter publication supabase_realtime add table magasins;
alter publication supabase_realtime add table fournisseurs;
alter publication supabase_realtime add table parametres;
alter publication supabase_realtime add table entrees;
alter publication supabase_realtime add table modes_reglement;
