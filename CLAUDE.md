# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## ⚠️ Rituel de début de session (IMPORTANT)

Le `git pull` de début de session est **automatique** : un hook `SessionStart` (dans `.claude/settings.json`) lance `git pull --ff-only` à chaque démarrage de session dans ce dépôt, pour récupérer le travail fait depuis l'autre ordinateur. Aucune action manuelle requise.

Si, malgré tout, l'utilisateur demande explicitement de récupérer les changements (« fais le pull », « récupère le dernier travail »), lancer `git pull` directement.

## ⚠️ Rituel de fin de session (IMPORTANT)

L'utilisateur travaille sur **2 ordinateurs différents** et synchronise via git (voir `MEMO.md`).

Quand l'utilisateur signale qu'il **termine sa session de travail** — par une phrase du type « c'est fini pour aujourd'hui », « j'arrête de travailler », « j'ai terminé », « on s'arrête là », « à demain », « bonne nuit », ou équivalent — exécuter **systématiquement et sans attendre de confirmation** les étapes suivantes dans l'ordre :

1. **Mettre à jour ce `CLAUDE.md`** : ajouter/modifier les sections qui décrivent les nouvelles fonctionnalités, tables, composants ou conventions introduits pendant la session. Ne pas demander de permission pour cette étape.
2. **Sauvegarder et synchroniser `dev`** : `git add` des fichiers modifiés → `git commit` (message décrivant le travail de la session) → `git push`.
3. **Déployer en production** : `git checkout main` → `git merge dev` → `git push` → `git checkout dev`. Cela déclenche le déploiement Vercel automatiquement.
4. **Informer l'utilisateur** que tout est sauvegardé, poussé et déployé.

Ce rituel garantit que l'autre ordinateur récupère bien le travail au prochain `git pull`, que le CLAUDE.md reste toujours à jour, et que la version en ligne est à jour.

## Présentation

Application interne (React 19 + Vite 8, **sans TypeScript**) pour des magasins de chaussures. L'interface est entièrement en **français** — garde cette langue pour les libellés, messages et commentaires utilisateur. Les données sont dans **Supabase** (Postgres + temps réel), synchronisées instantanément entre appareils.

C'est devenu une **suite de plusieurs apps** accessibles depuis un écran d'accueil (launcher), pas seulement « Suivi Pro » :
- **Suivi Pro** — suivi livraisons / achats / règlements (les onglets historiques)
- **Commandes Clients** (`src/commandes/`) — commandes magasins & BtoB
- **Agenda** (`src/agenda/`) — agenda partagé multi-vues, affiché directement sur l'accueil
- **Planning** (`src/planning/`) — planning hebdomadaire du personnel par magasin

## Commandes

```bash
npm run dev       # serveur de dev Vite (localhost:5173)
npm run build     # build de production -> dist/
npm run preview   # prévisualise le build
npm run lint      # ESLint (flat config, voir eslint.config.js)
```

Il n'y a **aucun framework de test** dans ce projet. Pour vérifier un changement, lance `npm run dev` et observe l'app.

## Configuration requise

Crée un `.env.local` (voir `.env.example`) avec `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY`. Sans ces variables, `src/lib/supabase.js` remplace tout le `<body>` par un message d'erreur et throw au démarrage. Après modification du `.env.local`, **redémarre** le serveur Vite. `VITE_GOOGLE_API_KEY` (Google Calendar) y vit aussi (voir App Agenda). L'App Paie envoie ses mails via une **fonction serveur** (voir plus bas) qui lit `GMAIL_USER` / `GMAIL_APP_PASSWORD` — **sans préfixe `VITE_`** (variables côté serveur, jamais exposées au navigateur ; à définir aussi dans **Vercel** pour la prod). `.env.local` est ignoré par git → à recréer sur chaque machine.

Schémas Postgres (à exécuter dans le SQL Editor Supabase) : `supabase-schema.sql` (Suivi Pro), `supabase-commandes.sql` (table `commandes`), `supabase-agenda.sql` (table `evenements`). RLS est **désactivé** sur toutes les tables (app interne, pas d'auth publique) et le temps réel est activé. Les tables ajoutées plus récemment (`salaries`, `defectueux`, `reglement_paye`, `paie_variables`, `paie_envois`, `planning`) ont été créées directement via psql (dev + prod), sans fichier de schéma dédié.

## Environnement dev / prod (IMPORTANT)

- **`.env.local` pointe sur une base Supabase de DÉVELOPPEMENT** (bac à sable), séparée de la prod, pour ne jamais toucher les vraies données. Le dev se fait sur la branche **`dev`** ; la prod est déployée depuis **`main`** (Vercel). `.env.local` est ignoré par git → à recréer sur chaque machine.
- **Migrations de schéma via psql** : ne PAS demander à l'utilisateur de copier-coller du SQL. Deux fichiers ignorés par git contiennent les URLs de connexion Postgres (Session pooler) : **`.dev-db-url.local`** (base dev, ref `xrxmnblhpcxlefjcvczw`) et **`.prod-db-url.local`** (base PROD, ref `fftfrbpcsazkkvahscbg`). Lancer les migrations directement :
  ```bash
  export PATH="/opt/homebrew/opt/libpq/bin:$PATH"   # psql installé via brew (libpq)
  psql "$(cat .dev-db-url.local)" -q -c "alter table ... ;"
  ```
  ⚠️ Le pooler renvoie le tag de commande (`INSERT 0 1`) sur stdout ; utiliser `-q` et ne pas le capturer dans une variable d'`id`. Sur la base PROD, n'exécuter que des opérations **additives** (`create table if not exists`, `add column if not exists`) — jamais de `drop`.
- **État du déploiement** : les apps Commandes/Agenda + mode sombre + Google Calendar sont **en production** (déployées depuis `main`). Les tables `commandes` et `evenements` existent en dev ET en prod (RLS off, temps réel on). `VITE_GOOGLE_API_KEY` est configurée dans Vercel (env Production). Pour une **future nouvelle table/colonne**, penser à l'appliquer aux **deux** bases (dev via `.dev-db-url.local`, prod via `.prod-db-url.local`).
- **Variables Vercel pour l'envoi de mails (App Paie)** : `GMAIL_USER` et `GMAIL_APP_PASSWORD` doivent être ajoutées dans **Vercel → Settings → Environment Variables** (env Production, **sans** préfixe `VITE_`), sinon la fonction `api/send-mail` échoue en prod. Dépendance `nodemailer` requise (déjà dans `package.json`).

## Architecture — points clés

### La couche `db` est un shim Dexie → Supabase
`src/db/index.js` expose un objet `db` dont les tables (`magasins`, `fournisseurs`, `parametres`, `entrees`, `suivi`, `modesReglement`, `commandes`, `evenements`, `salaries`, `defectueux`, `reglementPaye`, `paieVariables`, `paieEnvois`, `planning`) **imitent l'API Dexie** (`where().equals().toArray()`, `.first()`, `.add()`, `.put()`, `.update()`, `.delete()`, `.orderBy()`, `.filter()`, `.where({...}).filter(fn)`, `.reverse().sortBy()`) mais tapent en réalité Supabase. Le code applicatif est donc écrit « comme du Dexie » alors qu'il parle à Postgres.

Conséquences importantes :
- **Mapping camelCase ↔ snake_case** : le code JS utilise `fournisseurId`, `magasinId`, `modelesBySeason`, `typeKey`, `recuN1`, `objectifN`, `reelN`, `modeReglement` ; la base utilise les colonnes snake_case. La conversion se fait **uniquement** dans `db/index.js` via `FIELD_TO_DB`. Si tu ajoutes une colonne dont le nom JS diffère du nom SQL, **ajoute-la à `FIELD_TO_DB`**.
- Beaucoup de filtres composés (`.and(fn)`, `.filter(fn)`, `where({...}).filter(fn)`) **chargent les lignes puis filtrent en JS** — ce ne sont pas des requêtes SQL pures. Les requêtes sont plafonnées à `.limit(50000)`.
- `toCollection().modify()` est un no-op (vestige des migrations Dexie).

### Temps réel via `useLiveQuery`
`src/lib/useLiveQuery.js` est un hook maison (à ne pas confondre avec celui de `dexie-react-hooks`). Il exécute `queryFn`, puis s'abonne à **tous** les `postgres_changes` du schéma `public` et **ré-exécute la requête à chaque changement de n'importe quelle table**. C'est volontairement large (sync simple, pas de filtrage fin). `data === undefined` = en cours de chargement → afficher `<LoadingState />`.

### Notion de « saison » (côté client uniquement)
La saison active n'est **pas** une table : elle vit dans `localStorage` et dans `SeasonContext` (`src/context/SeasonContext.jsx`). Les lignes `entrees` et `parametres` portent une colonne texte `season` (ex. `ETE_2026`, `HIVER_2026`). Le filtrage par saison se fait dans chaque onglet avec `.where('season').equals(season)`, et la plupart des `useLiveQuery` ont `[season]` en dépendance. Ajouter/supprimer une saison se gère dans le `SeasonBadge` (en-tête de `App.jsx`) — la suppression efface aussi les lignes `parametres`/`entrees` correspondantes.

**Modèles d'une marque** : noms stockés **par saison** dans `fournisseurs.modeles_by_season` (JSONB `{ [seasonId]: string[] }`). Par magasin (une entrée `parametres` par fournisseur × magasin × saison) : `parametres.modeles` (JSONB `{ [nomModele]: quantité commandée }`), `parametres.prixModeles` (JSONB `{ [nomModele]: prix HT total }`, colonne SQL `prix_modeles`), `parametres.modelesSizes` (JSONB `{ [nomModele]: { [pointure]: qté attendue } }`, colonne `modeles_sizes`) et `parametres.modelesTypes` (JSONB `{ [nomModele]: clé SIZE_TYPES }`, colonne `modeles_types`). Le « reçu » par modèle est calculé depuis `entrees` (somme des `total` groupée par `modele`).

**Prix / PHT des entrées** : le **prix unitaire** d'un modèle = `prixModeles[m] ÷ modeles[m]` (sinon repli sur `parametres.pm`). Dans `EntreeForm`/`EntreeEditModal`, le champ **PHT livré n'est pas saisissable** : il vaut toujours `prix unitaire × quantité reçue` (recalculé quand les tailles changent).

**Import CSV (Paramètres → Marques)** : `ImportCSVPanel`/`parseCSV` lit l'entête **par nom de colonne** (séparateur `;` ou `,`) ; seules **Marque, Code Modèle, Couleur, Taille, Famille, Prix d'achat, Quantité commandé** sont utilisées. Le **modèle = `Code, Couleur`** ; les lignes (une par pointure) sont **agrégées par modèle** → `modeles` (total), `prixModeles` (Σ prix×qté), `modelesSizes` (qté par pointure), `modelesTypes` (grille auto via `detectGrid` : intervalle `XX-YY` ≥33 → DP / ≤27 → Bébé ; sinon Famille → F/H/E ; Crocs/Havaianas → DP ; TU/Accessoire). Les lignes sont **filtrées sur la société** du magasin sélectionné (colonne `Magasin` = société). Robustesse : la quantité est relue sur la **dernière cellule non vide** (les exports ont une colonne décalée en fin de ligne).

**Pré-remplissage des entrées** : dans `EntreeForm`, choisir un modèle bascule sur sa grille (`modelesTypes`) et pré-remplit les pointures avec le **reste à recevoir = attendu (`modelesSizes`) − déjà reçu** (lu en base, hors retours), et reprend le **N°** et la **catégorie** de la dernière entrée du modèle. N'écrase jamais une saisie en cours. Le **détail par pointure** (reçu vs attendu) est affiché dans le popup `DetailModal` de **Suivi livraisons** (modèle dépliable).

**Conditions de règlement** : `modes_reglement.condition` (JSONB) porte, selon le mode, `{ nb }` (nombre de chèques) ou `{ delais: number[] }` (jours après livraison ; montant réparti à parts égales). Les défauts (`src/data/reglement.js` : `DEFAULT_NB_CHEQUE`, `DEFAULT_DELAIS`) reproduisent l'ancien comportement figé. `PlanReglement` calcule les échéances à partir de ces conditions.

**Plan chèque personnalisé (par saison)** : pour un mode CHEQUE, on peut saisir un échéancier manuel `parametres.cheques` (JSONB `[{ date, montant }]`, **par fournisseur × magasin × saison**) via le bouton 🗓 dans Paramètres → Modes de règlement (`ChequePlanModal`). S'il existe, il **remplace** le calcul auto `reçu ÷ N` dans `PlanReglement` (`echeancesChequeCustom`) — figé, non recalculé depuis les entrées. Sinon, repli sur le calcul auto. Le mode (CHEQUE) reste global dans `modes_reglement` ; seul l'échéancier est par saison.

### Launcher multi-apps et navigation
`src/App.jsx` est le routeur, **sans react-router**. Il n'y a plus de groupe « Suivi Pro » : les anciens onglets sont devenus des destinations de premier niveau.
- **`Root`** (state local `view`) gère la navigation + le **code PIN** (`PIN_CODE = '2201'`, `PROTECTED_TABS = {reglement, parametres}`, déverrouillage en mémoire). `view` : `home` → `<HomeScreen>`, `cahier` → `<CahierEntrees>`, `commandes` → `<Commandes>`, `achats`/`reglement`/`parametres` → `<PageShell>` enveloppant le composant. Cliquer une vue protégée passe par `PinModal`.
- **`PageShell`** = en-tête commun (bouton retour ←, titre, `SeasonBadge`, onglets optionnels) + `<main>`. **`CahierEntrees`** = `PageShell` avec 2 sous-onglets : **Suivi livraisons** + **Entrées**.
- **`HomeScreen`** = le menu : cartes `APPS` (📥 Cahier des entrées, 🛍️ Commandes Clients, 🛒 Achats, 🛠️ Gestion des défectueux, 🧾 Éléments variables de paie, 📅 Planning) + 2 petits liens 🔒 (💳 Plan de règlement, ⚙️ Paramètres) + lien 📒 Répertoire + `<AgendaBoard>` dessous. Pour ajouter une app : entrée dans `APPS` (ou lien), cas dans `Root`, composant.

`src/tabs/` : `SuiviLivraisons`, `Entrees` (réunis dans Cahier des entrées), `Achats`, `PlanReglement`, `Parametres`.
⚠️ `src/tabs/PlanAchat.jsx` existe mais **n'est pas importé** (composant orphelin).
Le **sélecteur de saison** (`SeasonBadge`) est affiché dans l'en-tête (`PageShell`) de chaque page liée à la saison (Cahier, Achats, Plan de règlement, Paramètres).

### App Commandes Clients (`src/commandes/`)
Commandes magasins / BtoB. Table `commandes`. `constants.js` définit les listes (MAGASINS, PROVENANCES, STATUTS) et les couleurs de badges. La **liste des salariés** vit dans la table `salaries` (gérée dans Paramètres → onglet Salariés), chargée via `useLiveQuery` et passée en prop à `CommandeModal` — modifiable sans toucher au code. Au lancement, **écran de sélection du magasin** (`StoreSelect`) mémorisé dans `localStorage['commandes_magasin']` ; la liste est filtrée sur ce magasin et chaque nouvelle commande y est rattachée. `CommandeModal` = ajout/édition. La colonne legacy `commandes.type` n'est plus utilisée (remplacée par `provenance`).

### App Agenda (`src/agenda/`)
Agenda **partagé** (table `evenements`, pas de notion de magasin/saison). `AgendaBoard` = composant principal affiché **directement sur l'accueil** (pas de carte d'app séparée), avec sélecteur de vue **Jour / Semaine / Mois / Année** (façon Apple) ; la semaine va du **lundi au samedi** (6 jours). `AgendaModal` = ajout/édition/suppression. `dates.js` regroupe les helpers de dates **en heure locale** (`isoDate`, `parseLocal`, `mondayOf`, …) — important pour éviter les décalages de fuseau ; les dates sont stockées en texte `AAAA-MM-JJ` et comparées en chaînes.

**Intégration Google Calendar** (`src/agenda/googleCalendars.js`) : affichage **lecture seule** de 3 calendriers Google **publics** (abonnements iCloud des 3 magasins), via la **Google Calendar API v3 + clé API** (`VITE_GOOGLE_API_KEY`). Les IDs des 3 calendriers sont en dur dans `GOOGLE_CALENDARS` (publics, non secrets) ; la clé est dans `.env.local`. `fetchGoogleEvents()` charge les événements de la fenêtre visible (`rangeFor`), fusionnés avec les événements Supabase dans `byDay`. Événements Google = `source:'google'` (couleur par magasin, clic → fiche lecture seule `GoogleDetail`) ; événements de l'app = `source:'app'` (modifiables). `singleEvents=true` déroule les récurrences. Sans clé, l'agenda reste fonctionnel (juste sans Google).

### App Planning (`src/planning/`)
Planning hebdomadaire du personnel, filtré par magasin. Table `planning` (colonnes : `semaine` ISO lundi, `magasin`, `salarie`, `jour` 0–6, `heure_debut`, `heure_fin`, `note`). Mapping dans `FIELD_TO_DB` : `heureDebut`→`heure_debut`, `heureFin`→`heure_fin`.
- **Grille** : lignes = salariés (non gérants, filtrés sur `salaries.magasin`), colonnes = Lundi→Dimanche. Lignes fantômes jusqu'à `MIN_ROWS = 4`. Remplaçants ajoutables en bas (état local `extraRows` + détectés depuis les shifts en base).
- **Popover** de saisie : `<input type="time">` pour début/fin, navigation → entre champs, Entrée valide, Échap ferme.
- **Copier/coller** : bouton 📋 au hover sur un shift → stocke dans `clipboard` (state), option "Coller" dans le popover si clipboard actif.
- **Ctrl+Z** : pile d'historique (`undoStack`, max 20), utilise des refs pour éviter les closures stales.
- **Impression** : `handlePrint()` ouvre une fenêtre séparée (`window.open`) avec un HTML autonome (styles inline, pas de CSS variables), `@page { margin: 0 }` pour supprimer l'URL navigateur. Titre "Planning [MAGASIN]", semaine du lundi au dimanche.
- **Impression groupée** : `pendingWeeks` (tableau, max 2 éléments) persisté dans `localStorage['planning_pending_weeks']`. Au clic Imprimer : si 0 en attente → modale "attendre ?" ; si 1 en attente → modale "attendre encore pour 3 semaines ?" ; si 2 en attente → imprime les 3 directement. Les semaines en attente sont récupérées en base (`.where('semaine').equals(w)`) au moment de l'impression.
- **Constantes** : `src/planning/constants.js` — `JOURS` (Lun→Dim), `MIN_ROWS`, `EMPLOYEE_COLORS`.
- **`salaries.magasin`** : colonne ajoutée via migration psql, éditée dans Paramètres → onglet Salariés.

### App Répertoire (`src/tabs/Repertoire.jsx`)
Carnet d'adresses des fournisseurs (petit lien 📒 sur l'accueil). Les coordonnées sont des colonnes sur `fournisseurs` : `contact`, `telephone`, `contact_sav`/`telephone_fixe`/`email` (bloc SAV), `numero_client`, `btob` (lien espace pro), `adresse`, `notes`. Édition inline (onBlur). Boutons ✉️ (Gmail) et 🔗 (ouvre le BtoB).

### App Gestion des défectueux (`src/defectueux/`)
Table `defectueux` (liée à une entrée via `entree_id`). Le formulaire choisit magasin (→ société déduite), salarié, marque → modèle → **pointure parmi celles reçues** (lues dans `entrees`) ; le **N°** se pré-remplit depuis le N° du modèle dans les entrées. États : À traiter → Mail envoyé → Avoir reçu → Clôturé / Refusé.
- **À l'enregistrement** : crée une **entrée « Retour »** dans le Cahier (`total: -1`, `pht` négatif = −prix unitaire, catégorie/typeKey repris du modèle) puis propose d'**envoyer un mail au SAV** (Gmail pré-rempli — `src/defectueux/mail.js`, compte expéditeur selon la société).
- **Retours** : non comptés dans les stats Entrées (Unités/Valeur) ni dans le « reçu » du Suivi livraison. Dans le **Plan de règlement**, un retour génère un **avoir** (échéance unique à sa date, hors règles/conditions) **seulement** si le défectueux lié est « Avoir reçu » ou « Clôturé ».

### App Éléments variables de paie (`src/paie/`)
Chaque salarié remplit, **par mois**, ses éléments variables pour la comptable. Tables `paie_variables` (une ligne par `periode` `AAAA-MM` × `salarie`, contrainte unique ; les saisies dans `data` JSONB) et `paie_envois` (`periode` unique = récap déjà envoyé, garde-fou anti-doublon). Pas de notion de saison.
- **`Paie.jsx`** = liste des salariées (`db.salaries`, **gérants exclus** via `isGerant` dans `constants.js` — Jérémie & Raphaël) avec icône ✓ Rempli / ○ À remplir pour la période, sélecteur de mois ◀▶, compteur de complétion. Clic sur un salarié non rempli → **`PaieForm`** (société, lignes répétables Heures supp / dimanche / fériés au format `{date, heures}`, Congés / Arrêt maladie au format `{du, au}`, commentaire). Après **Enregistrer**, le document disparaît (confidentiel) + message de prise en compte ; les valeurs ne sont **jamais** affichées dans la liste.
- **Document verrouillé** : cliquer un salarié **déjà rempli** ouvre `LockedView` (lecture impossible des valeurs) avec un texte « ne peut plus être modifié » + une **demande de modification** envoyée à `ADMIN_EMAIL` (`jeremie.seigne@gmail.com`).
- **Récap réservé par PIN** (`2201`, modale interne `PinGate`) : `RecapView` montre le récap **groupé par société** (gérants filtrés) + envoi auto / ✉️ Ouvrir dans Gmail / 📋 Copier, **et** une section « Corriger une saisie » (réservée direction) qui rouvre `PaieForm` pré-rempli (retour au récap après Enregistrer/Annuler/←).
- **Envoi des mails** (`src/paie/mail.js`) : POST vers `/api/send-mail` (fonction serveur, voir ci-dessous) — **plus d'EmailJS**. Le **récap mensuel** part à `RECAP_EMAIL` (`marion.fouquereau@lecussan.fr`) ; dès que **toutes les salariées** ont validé, il part **automatiquement une seule fois** (insertion dans `paie_envois` avant envoi, rollback si échec). En cas d'indisponibilité du service (ex. SPA fallback en local sans middleware), repli sur l'ouverture de Gmail. Helpers de date/période dans `src/paie/constants.js`.

### Envoi d'emails — fonction serveur (`api/`)
Les mails (App Paie ; potentiellement d'autres à l'avenir) partent d'une **fonction serverless Vercel** : `api/send-mail.js` (handler POST `{to, subject, text}`) qui utilise `api/_send.js` → **nodemailer + SMTP Gmail** (`smtp.gmail.com:465`) avec `GMAIL_USER` / `GMAIL_APP_PASSWORD` (mot de passe d'application Google). Le `from` est `B'Shoes & JR Shoes <GMAIL_USER>`. **Aucune marque tierce** dans les mails (contrairement à EmailJS). En **dev**, `vite.config.js` sert la même route via un middleware (`Object.assign(process.env, loadEnv(...))` charge les vars non-`VITE_`), donc `npm run dev` envoie aussi de vrais mails. **En prod, définir `GMAIL_USER` et `GMAIL_APP_PASSWORD` dans Vercel** (env Production, sans préfixe `VITE_`).

### Domaine métier
- **`src/data/societes.js`** : mapping magasin → société (B'Shoes / JR Shoes), codé en dur dans `SOCIETE_MAP`. `getSociete(magasin)` est insensible à la casse/espaces.
- **`src/data/sizes.js`** : définitions des grilles de tailles chaussures (`SIZE_TYPES` : Femme/Homme/Enfant/Bébé/**Double pointure (DP)**/TU/Accessoire ; Femme et Homme incluent les demi-pointures, Enfant aussi). `DEFAULT_GRID_BY_MARQUE` (clé = marque en minuscules) force une grille par défaut à la sélection de la marque dans `EntreeForm`/`EntreeEditModal` (ex. Crocs/Havaianas → `DP`). `buildEntreeRow()` et `SIZE_COL_KEYS` reproduisent la **structure historique d'un Google Sheet / Apps Script** (lignes de 35 colonnes) mais ne sont **plus importés ailleurs** (export legacy inactif) — d'où la possibilité d'avoir des grilles > 35 tailles. Les quantités par taille d'une entrée sont stockées dans la colonne JSONB `entrees.sizes`.
- **`src/data/clipboard.js`** : presse-papier en mémoire (module singleton) partagé entre `EntreeForm` et `EntreeEditModal` pour copier/coller une grille de tailles.

### Migration historique
`src/lib/migrate.js` (`migrateLocalToSupabase`) est un import **ponctuel** IndexedDB (ancienne base Dexie locale `SuiviPro`) → Supabase, déclenché depuis l'onglet Paramètres. Refuse de s'exécuter si Supabase contient déjà des magasins.

## Thème clair / sombre

Le thème repose sur des **variables CSS** définies dans `src/App.css` (`:root` = clair, `html[data-theme="dark"]` = sombre) : `--bg`, `--bg-grad`, `--surface`, `--surface-2/3`, `--border`, `--text` … `--text-5`, `--accent`, `--accent-2`, `--accent-bg`, `--on-accent`, `--shadow*`. Le bascule se fait via `ThemeToggle` (bouton flottant 🌙/☀️ dans `App.jsx`) qui pose `document.documentElement.dataset.theme` et persiste dans `localStorage['theme']`.

**Règle pour tout nouveau style** : utiliser les variables (`color: 'var(--text)'`, `background: 'var(--surface)'`, etc.) — y compris dans les styles inline — plutôt que des hex en dur, sinon l'élément ne suivra pas le mode sombre. **Exceptions volontairement laissées en hex** : les couleurs **sémantiques** (états/provenance/calendriers, rouge d'erreur, vert de succès) et le **texte sur fond coloré** (`--on-accent` / `#fff` sur un bouton accent).

## Conventions de style

- **Styles inline** majoritaires (objets `style={{...}}`), complétés par des classes dans `src/App.css` (`.tab-stats`, `.stat-card`, `.data-table`, `.btn-primary`, `.controls`, `.store-card`, etc.). Pas de librairie CSS/UI.
- Helpers d'affichage partagés dans `src/components/shared.jsx` : `GaugeBar`, `Badge`, `LoadingState`, `ErrorState`, `fmt`, `fmtEur`. Réutilise-les plutôt que de reformater.
- Formatage des nombres/devises avec `toLocaleString('fr-FR', ...)` (EUR).
- ESLint flat config avec `react-hooks` et `react-refresh` ; `dist/` est ignoré.
