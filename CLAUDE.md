# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## ⚠️ Rituel de début de session (IMPORTANT)

Le `git pull` de début de session est **automatique** : un hook `SessionStart` (dans `.claude/settings.json`) lance `git pull --ff-only` à chaque démarrage de session dans ce dépôt, pour récupérer le travail fait depuis l'autre ordinateur. Aucune action manuelle requise.

Si, malgré tout, l'utilisateur demande explicitement de récupérer les changements (« fais le pull », « récupère le dernier travail »), lancer `git pull` directement.

## ⚠️ Rituel de fin de session (IMPORTANT)

L'utilisateur travaille sur **2 ordinateurs différents** et synchronise via git (voir `MEMO.md`).

Quand l'utilisateur signale qu'il **termine sa session de travail** — par une phrase du type « c'est fini pour aujourd'hui », « j'arrête de travailler », « j'ai terminé », « on s'arrête là », « à demain », ou équivalent — proposer **systématiquement** de :

1. **Mettre à jour ce `CLAUDE.md`** si l'architecture, les conventions ou des points importants ont changé pendant la session (sinon, le mentionner et passer).
2. **Sauvegarder et synchroniser avec git** : `git add` → `git commit` (avec un message décrivant le travail de la session) → `git push`.

Attendre la confirmation de l'utilisateur avant de pousser. Ce rituel garantit que l'autre ordinateur récupère bien le travail au prochain `git pull`.

## Présentation

Application interne (React 19 + Vite 8, **sans TypeScript**) pour des magasins de chaussures. L'interface est entièrement en **français** — garde cette langue pour les libellés, messages et commentaires utilisateur. Les données sont dans **Supabase** (Postgres + temps réel), synchronisées instantanément entre appareils.

C'est devenu une **suite de plusieurs apps** accessibles depuis un écran d'accueil (launcher), pas seulement « Suivi Pro » :
- **Suivi Pro** — suivi livraisons / achats / règlements (les onglets historiques)
- **Commandes Clients** (`src/commandes/`) — commandes magasins & BtoB
- **Agenda** (`src/agenda/`) — agenda partagé multi-vues, affiché directement sur l'accueil

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

Schémas Postgres (à exécuter dans le SQL Editor Supabase) : `supabase-schema.sql` (Suivi Pro), `supabase-commandes.sql` (table `commandes`), `supabase-agenda.sql` (table `evenements`). RLS est **désactivé** sur toutes les tables (app interne, pas d'auth publique) et le temps réel est activé.

## Environnement dev / prod (IMPORTANT)

- **`.env.local` pointe sur une base Supabase de DÉVELOPPEMENT** (bac à sable), séparée de la prod, pour ne jamais toucher les vraies données. Le dev se fait sur la branche **`dev`** ; la prod est déployée depuis **`main`** (Vercel). `.env.local` est ignoré par git → à recréer sur chaque machine.
- **Migrations de schéma sur la base dev** : ne PAS demander à l'utilisateur de copier-coller du SQL. Un fichier **`.dev-db-url.local`** (ignoré par git) contient l'URL de connexion Postgres de la base dev. Lancer les `CREATE TABLE` / `ALTER TABLE` directement :
  ```bash
  export PATH="/opt/homebrew/opt/libpq/bin:$PATH"   # psql installé via brew (libpq)
  psql "$(cat .dev-db-url.local)" -q -c "alter table ... ;"
  ```
  ⚠️ Le pooler renvoie le tag de commande (`INSERT 0 1`) sur stdout ; utiliser `-q` et ne pas le capturer dans une variable d'`id`.
- ⚠️ **Lors d'un passage en prod** : les nouvelles tables (`commandes`, `evenements`) et colonnes doivent être créées dans la **base de prod** aussi (via les fichiers `supabase-*.sql` dans le SQL Editor). La connexion `.dev-db-url.local` ne vise QUE la dev.

## Architecture — points clés

### La couche `db` est un shim Dexie → Supabase
`src/db/index.js` expose un objet `db` dont les tables (`magasins`, `fournisseurs`, `parametres`, `entrees`, `suivi`, `modesReglement`, `commandes`, `evenements`) **imitent l'API Dexie** (`where().equals().toArray()`, `.first()`, `.add()`, `.put()`, `.update()`, `.delete()`, `.orderBy()`, `.filter()`, `.where({...}).filter(fn)`, `.reverse().sortBy()`) mais tapent en réalité Supabase. Le code applicatif est donc écrit « comme du Dexie » alors qu'il parle à Postgres.

Conséquences importantes :
- **Mapping camelCase ↔ snake_case** : le code JS utilise `fournisseurId`, `magasinId`, `modelesBySeason`, `typeKey`, `recuN1`, `objectifN`, `reelN`, `modeReglement` ; la base utilise les colonnes snake_case. La conversion se fait **uniquement** dans `db/index.js` via `FIELD_TO_DB`. Si tu ajoutes une colonne dont le nom JS diffère du nom SQL, **ajoute-la à `FIELD_TO_DB`**.
- Beaucoup de filtres composés (`.and(fn)`, `.filter(fn)`, `where({...}).filter(fn)`) **chargent les lignes puis filtrent en JS** — ce ne sont pas des requêtes SQL pures. Les requêtes sont plafonnées à `.limit(50000)`.
- `toCollection().modify()` est un no-op (vestige des migrations Dexie).

### Temps réel via `useLiveQuery`
`src/lib/useLiveQuery.js` est un hook maison (à ne pas confondre avec celui de `dexie-react-hooks`). Il exécute `queryFn`, puis s'abonne à **tous** les `postgres_changes` du schéma `public` et **ré-exécute la requête à chaque changement de n'importe quelle table**. C'est volontairement large (sync simple, pas de filtrage fin). `data === undefined` = en cours de chargement → afficher `<LoadingState />`.

### Notion de « saison » (côté client uniquement)
La saison active n'est **pas** une table : elle vit dans `localStorage` et dans `SeasonContext` (`src/context/SeasonContext.jsx`). Les lignes `entrees` et `parametres` portent une colonne texte `season` (ex. `ETE_2026`, `HIVER_2026`). Le filtrage par saison se fait dans chaque onglet avec `.where('season').equals(season)`, et la plupart des `useLiveQuery` ont `[season]` en dépendance. Ajouter/supprimer une saison se gère dans le `SeasonBadge` (en-tête de `App.jsx`) — la suppression efface aussi les lignes `parametres`/`entrees` correspondantes.

Les modèles d'une marque sont stockés **par saison** dans `fournisseurs.modeles_by_season` (un objet JSONB `{ [seasonId]: string[] }`).

### Launcher multi-apps et navigation
`src/App.jsx` est le routeur, **sans react-router**. Deux niveaux :
- **`Root`** (state local `view`) bascule entre l'accueil et les apps : `home` → `<HomeScreen>`, `suivipro` → `<AppInner>` (les onglets historiques), `commandes` → `<Commandes>`. Chaque app reçoit une prop `onHome` (bouton retour ← dans son en-tête).
- **`HomeScreen`** = le menu : un tableau `APPS` (cartes cliquables) + le composant **`<AgendaBoard>`** affiché directement dessous. Pour ajouter une app : ajouter une entrée à `APPS`, un cas dans `Root`, et le composant.
- **`AppInner`** garde sa propre navigation par onglets (`activeTab`) pour Suivi Pro. Les onglets `reglement` et `parametres` sont protégés par un **code PIN en clair** (`PIN_CODE = '2201'`), déverrouillage en mémoire pour la session.

`src/tabs/` (onglets Suivi Pro) : `SuiviLivraisons`, `Entrees`, `Achats`, `PlanReglement`, `Parametres`.
⚠️ `src/tabs/PlanAchat.jsx` existe mais **n'est pas importé** (composant orphelin).

### App Commandes Clients (`src/commandes/`)
Commandes magasins / BtoB. Table `commandes`. `constants.js` définit les listes (MAGASINS, SALARIES, PROVENANCES, STATUTS) et les couleurs de badges. Au lancement, **écran de sélection du magasin** (`StoreSelect`) mémorisé dans `localStorage['commandes_magasin']` ; la liste est filtrée sur ce magasin et chaque nouvelle commande y est rattachée. `CommandeModal` = ajout/édition. La colonne legacy `commandes.type` n'est plus utilisée (remplacée par `provenance`).

### App Agenda (`src/agenda/`)
Agenda **partagé** (table `evenements`, pas de notion de magasin/saison). `AgendaBoard` = composant principal affiché sur l'accueil, avec sélecteur de vue **Jour / Semaine / Mois / Année** (façon Apple) ; la semaine va du **lundi au samedi** (6 jours). `AgendaModal` = ajout/édition/suppression. `dates.js` regroupe les helpers de dates **en heure locale** (`isoDate`, `parseLocal`, `mondayOf`, …) — important pour éviter les décalages de fuseau ; les dates sont stockées en texte `AAAA-MM-JJ` et comparées en chaînes.

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
