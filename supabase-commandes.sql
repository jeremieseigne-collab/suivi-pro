-- ══════════════════════════════════════════════════════════════════
-- App « Commandes Clients » — table commandes
-- À exécuter dans : Supabase Dashboard > SQL Editor
-- (sans danger : ne touche aucune table existante)
-- ══════════════════════════════════════════════════════════════════

create table if not exists commandes (
  id            bigserial primary key,
  created_at    timestamptz default now(),
  magasin       text default '',   -- magasin où la commande est passée
  date          text default '',   -- date de la commande (choisie, AAAA-MM-JJ)
  salarie       text default '',   -- qui passe la commande
  provenance    text default '',   -- Bailly Albi / Bailly Rouffiac / Les 2 Zèbres / BtoB
  marque        text default '',
  modele        text default '',
  reference     text default '',   -- référence N°
  pointure      text default '',
  client_nom    text default '',
  client_prenom text default '',
  telephone     text default '',
  note          text default '',
  statut        text default 'À commander'
);

-- Si la table existait déjà (versions antérieures), on ajoute les colonnes manquantes :
alter table commandes add column if not exists magasin    text default '';
alter table commandes add column if not exists date       text default '';
alter table commandes add column if not exists modele     text default '';
alter table commandes add column if not exists provenance text default '';

-- App interne, pas d'authentification publique
alter table commandes disable row level security;

-- Synchronisation temps réel entre appareils
-- (à exécuter une seule fois ; ignorer l'erreur « already member » si déjà fait)
-- alter publication supabase_realtime add table commandes;
