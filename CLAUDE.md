# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Présentation

**Suivi Pro** est une application interne (React 19 + Vite 8, **sans TypeScript**) de suivi des livraisons / achats pour des magasins de chaussures. L'interface est entièrement en **français** — garde cette langue pour les libellés, messages et commentaires utilisateur. Les données sont stockées dans **Supabase** (Postgres + temps réel) et synchronisées instantanément entre appareils.

## Commandes

```bash
npm run dev       # serveur de dev Vite (localhost:5173)
npm run build     # build de production -> dist/
npm run preview   # prévisualise le build
npm run lint      # ESLint (flat config, voir eslint.config.js)
```

Il n'y a **aucun framework de test** dans ce projet. Pour vérifier un changement, lance `npm run dev` et observe l'app.

## Configuration requise

Crée un `.env.local` (voir `.env.example`) avec `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY`. Sans ces variables, `src/lib/supabase.js` remplace tout le `<body>` par un message d'erreur et throw au démarrage. Après modification du `.env.local`, **redémarre** le serveur Vite.

Le schéma Postgres complet est dans `supabase-schema.sql` (à exécuter dans le SQL Editor du dashboard Supabase). RLS est **désactivé** (app interne, pas d'auth publique) et le temps réel est activé sur toutes les tables métier.

## Architecture — points clés

### La couche `db` est un shim Dexie → Supabase
`src/db/index.js` expose un objet `db` dont les tables (`magasins`, `fournisseurs`, `parametres`, `entrees`, `suivi`, `modesReglement`) **imitent l'API Dexie** (`where().equals().toArray()`, `.first()`, `.add()`, `.put()`, `.update()`, `.delete()`, `.orderBy()`, `.filter()`, `.where({...}).filter(fn)`, `.reverse().sortBy()`) mais tapent en réalité Supabase. Le code applicatif est donc écrit « comme du Dexie » alors qu'il parle à Postgres.

Conséquences importantes :
- **Mapping camelCase ↔ snake_case** : le code JS utilise `fournisseurId`, `magasinId`, `modelesBySeason`, `typeKey`, `recuN1`, `objectifN`, `reelN`, `modeReglement` ; la base utilise les colonnes snake_case. La conversion se fait **uniquement** dans `db/index.js` via `FIELD_TO_DB`. Si tu ajoutes une colonne dont le nom JS diffère du nom SQL, **ajoute-la à `FIELD_TO_DB`**.
- Beaucoup de filtres composés (`.and(fn)`, `.filter(fn)`, `where({...}).filter(fn)`) **chargent les lignes puis filtrent en JS** — ce ne sont pas des requêtes SQL pures. Les requêtes sont plafonnées à `.limit(50000)`.
- `toCollection().modify()` est un no-op (vestige des migrations Dexie).

### Temps réel via `useLiveQuery`
`src/lib/useLiveQuery.js` est un hook maison (à ne pas confondre avec celui de `dexie-react-hooks`). Il exécute `queryFn`, puis s'abonne à **tous** les `postgres_changes` du schéma `public` et **ré-exécute la requête à chaque changement de n'importe quelle table**. C'est volontairement large (sync simple, pas de filtrage fin). `data === undefined` = en cours de chargement → afficher `<LoadingState />`.

### Notion de « saison » (côté client uniquement)
La saison active n'est **pas** une table : elle vit dans `localStorage` et dans `SeasonContext` (`src/context/SeasonContext.jsx`). Les lignes `entrees` et `parametres` portent une colonne texte `season` (ex. `ETE_2026`, `HIVER_2026`). Le filtrage par saison se fait dans chaque onglet avec `.where('season').equals(season)`, et la plupart des `useLiveQuery` ont `[season]` en dépendance. Ajouter/supprimer une saison se gère dans le `SeasonBadge` (en-tête de `App.jsx`) — la suppression efface aussi les lignes `parametres`/`entrees` correspondantes.

Les modèles d'une marque sont stockés **par saison** dans `fournisseurs.modeles_by_season` (un objet JSONB `{ [seasonId]: string[] }`).

### Onglets et protection PIN
`src/App.jsx` est le routeur (state local `activeTab`, pas de react-router). Les onglets `reglement` et `parametres` sont protégés par un **code PIN en clair** (`PIN_CODE = '2201'` dans `App.jsx`). Le déverrouillage est en mémoire pour la session.

`src/tabs/` : `SuiviLivraisons`, `Entrees`, `Achats`, `PlanReglement`, `Parametres`.
⚠️ `src/tabs/PlanAchat.jsx` existe mais **n'est pas importé** dans `App.jsx` (composant orphelin).

### Domaine métier
- **`src/data/societes.js`** : mapping magasin → société (B'Shoes / JR Shoes), codé en dur dans `SOCIETE_MAP`. `getSociete(magasin)` est insensible à la casse/espaces.
- **`src/data/sizes.js`** : définitions des grilles de tailles chaussures (`SIZE_TYPES` : Femme/Homme/Enfant/Bébé/TU/Accessoire). `buildEntreeRow()` et `SIZE_COL_KEYS` reproduisent la **structure historique d'un Google Sheet / Apps Script** (lignes de 35 colonnes, `colOffset` pour les accessoires). À respecter scrupuleusement lors d'imports/exports de tailles. Les quantités par taille d'une entrée sont stockées dans la colonne JSONB `entrees.sizes`.
- **`src/data/clipboard.js`** : presse-papier en mémoire (module singleton) partagé entre `EntreeForm` et `EntreeEditModal` pour copier/coller une grille de tailles.

### Migration historique
`src/lib/migrate.js` (`migrateLocalToSupabase`) est un import **ponctuel** IndexedDB (ancienne base Dexie locale `SuiviPro`) → Supabase, déclenché depuis l'onglet Paramètres. Refuse de s'exécuter si Supabase contient déjà des magasins.

## Conventions de style

- **Styles inline** majoritaires (objets `style={{...}}`), complétés par des classes dans `src/App.css` (`.tab-stats`, `.stat-card`, `.data-table`, `.btn-primary`, `.controls`, `.store-card`, etc.). Pas de librairie CSS/UI.
- Helpers d'affichage partagés dans `src/components/shared.jsx` : `GaugeBar`, `Badge`, `LoadingState`, `ErrorState`, `fmt`, `fmtEur`. Réutilise-les plutôt que de reformater.
- Formatage des nombres/devises avec `toLocaleString('fr-FR', ...)` (EUR).
- ESLint flat config avec `react-hooks` et `react-refresh` ; `dist/` est ignoré.
