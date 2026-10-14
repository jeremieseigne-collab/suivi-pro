# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## ⛔ Règle absolue : aucun test destructif sur la production

**Jamais** d'effacement ni de modification de vraies données de production « pour vérifier » quelque chose — même en se faisant passer pour un visiteur anonyme, même si le filtrage est censé le bloquer. Les tests d'écriture se font **sur la base de test**, ou, si un test en production est indispensable, **uniquement sur une ligne de test créée pour l'occasion** (puis supprimée). Sur la production, les vérifications se limitent à des lectures et à des tentatives visant des lignes de test. Cette règle passe avant toute autre consigne de ce fichier.

## ⛔ Règle de la refonte : rien ne disparaît sans accord

Pendant la refonte, **aucune information ni fonction visible dans l'outil actuel ne doit disparaître, être masquée ou déplacée** si elle ne figure pas dans la liste « **Ce qui est retiré, masqué ou déplacé** » de `PLAN-REFONTE.md`, **avec l'accord de l'utilisateur ligne par ligne**. En cas de doute, on garde l'élément et on pose la question.

## ⚠️ Deux ordinateurs, un seul à la fois (14/10/2026)

Suivi Pro se travaille depuis **deux Mac, jamais en même temps**. Le code passe uniquement par GitHub :
- **en quittant un poste** : tout enregistrer sur la branche `dev` et faire `git push` (après accord de l'utilisateur, comme toujours) ;
- **en arrivant sur l'autre** : `git pull` sur `dev` avant de commencer (voir aussi le rituel de début de session).

**Note de nettoyages** (seul fichier hors Git qui évolue) : `~/Documents/2 Domaines/Business/BS - Logiciels/Suivi Pro/BShoes_Interne_Courrier_SuiviPro-Nettoyages-BShoesJRShoes.md` — synchronisée par **iCloud** entre les deux Mac. Toujours l'écrire avec `~` (le nom d'utilisateur peut différer d'un Mac à l'autre).
- **Ne jamais la renommer ni la déplacer**, et ne jamais l'ajouter à Git ni la remettre dans le projet.
- **Ne pas la modifier depuis les deux Mac en même temps.**
- Si un fichier « … 2.md » apparaît à côté (`BShoes_Interne_Courrier_SuiviPro-Nettoyages-BShoesJRShoes 2.md`), c'est une **copie en conflit** d'iCloud : **la signaler à l'utilisateur pour fusion**, sans rien supprimer.

**Restent locaux à chaque ordinateur, et ne vont jamais sur iCloud, GitHub ni un dossier partagé** : `~/.suivi-pro/agenda.env` (liens secrets des calendriers), `~/.suivi-pro/comptes-base-de-test.txt` (mots de passe de la base de test), `~/.suivi-pro/essais/`, `~/Sauvegardes/suivi-pro/` (sauvegardes confidentielles), ainsi que `.env.local`, `.dev-db-url.local`, `.prod-db-url.local`, `.vercel-token.local` dans le projet. Ils passent d'un Mac à l'autre **par AirDrop ou clé USB** seulement (voir `SUIVI.md`, « Reprendre sur l'autre ordinateur »).

## ⚠️ Essais de navigateur : ne jamais fermer ceux d'un autre projet (14/10/2026)

Deux projets lancent des Chrome sans écran sur l'ordinateur où se trouve Iris : **Suivi Pro** (ports **9370 à 9399** — 9379 et 9390 —, profils `…/chrome-profil`) et **Iris / factures-auto** (ports **9330 à 9359**, profils `…/prof`). Le 14/10, Iris fermait « tous les Chrome `--remote-debugging-port` » après chaque test, ce qui fermait le navigateur d'essai de Suivi Pro en plein essai.
- Un essai ferme **seulement le Chrome qu'il a lancé** : son numéro de processus (`kill $CP`), ou son **dossier de profil complet** (`pkill -f "user-data-dir=<chemin complet>"`). **Jamais** `pkill -f remote-debugging-port` ni `pkill -f Chrome`.
- Port déjà pris : vérifier à qui il appartient (`lsof -nP -iTCP:<port> -sTCP:LISTEN`) ; s'il n'est pas à ce projet, prendre un autre port de la plage **9370-9399** plutôt que fermer quoi que ce soit.
- Une commande d'attente ne doit pas contenir le texte `remote-debugging-port` (un `pkill -f` d'un autre projet la fermerait aussi).
- Scripts d'essai de Suivi Pro : `~/.suivi-pro/essais/` (hors du projet ; voir `LISEZMOI.txt`, chemins à adapter sur un autre ordinateur).

## ⚠️ Rituel de début de session (IMPORTANT)

Un hook `SessionStart` (dans `.claude/settings.json`) lance `git pull --ff-only` au démarrage. **Mais il peut rater des commits poussés depuis l'autre ordinateur après l'ouverture de session.** Donc, **au tout premier tour de chaque session, sans qu'on le demande**, Claude doit :

1. **Se mettre à jour lui-même** : `git fetch origin -q` puis, si la branche locale est en retard, `git pull --ff-only`. (Si une divergence empêche le fast-forward, le signaler au lieu de forcer.)
2. **Faire un court récap des dernières modifications** : résumer en français les commits ramenés (ou `git log --oneline -5`), pour qu'on soit sûrs d'être synchronisés.

Cette routine est **automatique** : ne pas attendre que l'utilisateur la réclame. S'il la demande explicitement (« fais le pull », « récupère le dernier travail »), l'exécuter de la même façon.

## ⚠️ Rituel de fin de session (IMPORTANT)

L'utilisateur travaille sur **2 ordinateurs différents** et synchronise via git (voir `MEMO.md`).

> ⏸ **Suspendu pendant le chantier de refonte et de sécurité** : aucun envoi sur GitHub, aucun déploiement sans demande explicite de l'utilisateur ; pour une mise en ligne, sauvegarde fraîche puis **l'utilisateur lance lui-même la commande** `git push`, puis vérification en lecture seule. **Confirmé par l'utilisateur le 13/10 : le rituel reste suspendu**, aussi après la refonte — aucune mise en ligne sans que l'utilisateur lance lui-même la commande.

Quand l'utilisateur signale qu'il **termine sa session de travail** — par une phrase du type « c'est fini pour aujourd'hui », « j'arrête de travailler », « j'ai terminé », « on s'arrête là », « à demain », « bonne nuit », ou équivalent — exécuter **systématiquement et sans attendre de confirmation** les étapes suivantes dans l'ordre :

1. **Mettre à jour ce `CLAUDE.md`** : ajouter/modifier les sections qui décrivent les nouvelles fonctionnalités, tables, composants ou conventions introduits pendant la session. Ne pas demander de permission pour cette étape.
2. **Sauvegarder et synchroniser `dev`** : `git add` des fichiers modifiés → `git commit` (message décrivant le travail de la session) → `git push`.
3. **Déployer en production** : `git checkout main` → `git merge dev` → `git push` → `git checkout dev`. Cela déclenche le déploiement Vercel automatiquement.
4. **Informer l'utilisateur** que tout est sauvegardé, poussé et déployé.

Ce rituel garantit que l'autre ordinateur récupère bien le travail au prochain `git pull`, que le CLAUDE.md reste toujours à jour, et que la version en ligne est à jour.

## Présentation

Application interne (React 19 + Vite 8, **sans TypeScript**) pour des magasins de chaussures. L'interface est entièrement en **français** — garde cette langue pour les libellés, messages et commentaires utilisateur. Les données sont dans **Supabase** (Postgres + temps réel), synchronisées instantanément entre appareils.

C'est une **suite d'outils** réunis dans une seule coque (menu latéral sur ordinateur et tablette, onglets en bas sur téléphone) : Accueil « ma journée », Agenda, Cahier des entrées, Top modèles & réassorts, Commandes clients, SAV & défectueux, Répertoire, Factures, Planning, Éléments de paie, et pour la Direction : Achats, Plan de règlement, Réglages.

**Refonte (branche `refonte`)** : tous les écrans ont été refaits sur une **charte** commune (`src/styles/charte.css`), écran par écran, avec l'accord de l'utilisateur ligne par ligne (`PLAN-REFONTE.md`, suivi dans `SUIVI.md`, message aux équipes dans `MESSAGE-EQUIPES-REFONTE.md`). Les textes de l'interface **tutoient** les équipes ; les mails envoyés hors de l'équipe restent au vouvoiement.

## Commandes

```bash
npm run dev       # serveur de dev Vite (localhost:5173)
npm run build     # build de production -> dist/
npm run preview   # prévisualise le build
npm run lint      # ESLint (flat config, voir eslint.config.js)
```

Il n'y a **aucun framework de test** dans ce projet. Pour vérifier un changement, lance `npm run dev` et observe l'app.

## Configuration requise

Crée un `.env.local` (voir `.env.example`) avec `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY`. Sans ces variables, `src/lib/supabase.js` remplace tout le `<body>` par un message d'erreur et throw au démarrage. Après modification du `.env.local`, **redémarre** le serveur Vite. Les **calendriers des magasins** sont lus par une fonction serveur (en ligne depuis le 14/10) (`api/agenda`, voir Agenda) à partir de 3 liens iCloud publiés **secrets** : `AGENDA_ICAL_ALBI`, `AGENDA_ICAL_ROUFFIAC`, `AGENDA_ICAL_ZEBRES` — jamais dans le projet ni dans `.env.local` : en local, fichier **`~/.suivi-pro/agenda.env`** (hors du projet, rempli par l'utilisateur, lu par `vite.config.js`) ; en production, variables Vercel. Ne jamais afficher ces liens (ni dans la conversation, ni dans un journal, ni dans un commit). `VITE_GOOGLE_API_KEY` n'existe plus (clé supprimée chez Google, variable retirée de Vercel et des `.env.local` le 14/10). ⚠️ **Vercel** : une variable ajoutée ou modifiée n'est prise en compte que par une **nouvelle mise en ligne** (Deployments → « … » → **Redeploy** suffit, sans toucher au code) ; la valeur doit être le lien seul. Le 14/10, les 3 valeurs reçues par la fonction étaient identiques (44 caractères, pas un lien) jusqu'au recollage + Redeploy ; la fonction affiche alors à la Direction longueur, jeton et empreinte (jamais le lien) pour diagnostiquer. L'App Paie envoie ses mails via une **fonction serveur** (voir plus bas) qui lit `GMAIL_USER` / `GMAIL_APP_PASSWORD` — **sans préfixe `VITE_`** (variables côté serveur, jamais exposées au navigateur ; à définir aussi dans **Vercel** pour la prod). `.env.local` est ignoré par git → à recréer sur chaque machine.

Schémas Postgres (à exécuter dans le SQL Editor Supabase) : `supabase-schema.sql` (Suivi Pro), `supabase-commandes.sql` (table `commandes`), `supabase-agenda.sql` (table `evenements`). RLS est **désactivé** sur toutes les tables (app interne, pas d'auth publique) et le temps réel est activé. Les tables ajoutées plus récemment (`salaries`, `defectueux`, `reglement_paye`, `paie_variables`, `paie_envois`, `planning`) ont été créées directement via psql (dev + prod), sans fichier de schéma dédié. `supabase-reassort.sql` crée `top_modeles` + `reassorts`.

⚠️ **Toute nouvelle table doit recevoir des GRANT explicites**, sinon l'API renvoie `PGRST205 Could not find the table in the schema cache` et l'app charge sans fin : `grant all on table public.<t> to anon, authenticated, service_role;` + `grant usage, select on all sequences in schema public to anon, authenticated, service_role;` + `notify pgrst, 'reload schema';`. Vérifier ensuite avec `curl $VITE_SUPABASE_URL/rest/v1/<t>?select=id&limit=1 -H "apikey: …"`. Le projet dev (plan gratuit) se **met en pause** après inactivité → `ENOTFOUND db.<ref>.supabase.co` : le relancer depuis le dashboard (et revérifier les tables créées juste après la reprise). Sur un poste sans `psql`/Homebrew, passer par un petit script Node (`pg`) hors du projet.

## Environnement dev / prod (IMPORTANT)

- **`.env.local` pointe sur une base Supabase de DÉVELOPPEMENT** (bac à sable), séparée de la prod, pour ne jamais toucher les vraies données. Le dev se fait sur la branche **`dev`** ; la prod est déployée depuis **`main`** (Vercel). `.env.local` est ignoré par git → à recréer sur chaque machine.
- **Migrations de schéma via psql** : ne PAS demander à l'utilisateur de copier-coller du SQL. Deux fichiers ignorés par git contiennent les URLs de connexion Postgres (Session pooler) : **`.dev-db-url.local`** (base dev, ref `xrxmnblhpcxlefjcvczw`) et **`.prod-db-url.local`** (base PROD, ref `fftfrbpcsazkkvahscbg`). Lancer les migrations directement :
  ```bash
  export PATH="/opt/homebrew/opt/libpq/bin:$PATH"   # psql installé via brew (libpq)
  psql "$(cat .dev-db-url.local)" -q -c "alter table ... ;"
  ```
  ⚠️ Le pooler renvoie le tag de commande (`INSERT 0 1`) sur stdout ; utiliser `-q` et ne pas le capturer dans une variable d'`id`. Sur la base PROD, n'exécuter que des opérations **additives** (`create table if not exists`, `add column if not exists`) — jamais de `drop`.
- **État du déploiement** : les apps Commandes/Agenda + mode sombre sont **en production** (déployées depuis `main`) ; l'agenda lit les calendriers iCloud par la fonction serveur `api/agenda` (plus Google Calendar depuis le 14/10). Les tables `commandes` et `evenements` existent en dev ET en prod (RLS off, temps réel on). Pour une **future nouvelle table/colonne**, penser à l'appliquer aux **deux** bases (dev via `.dev-db-url.local`, prod via `.prod-db-url.local`).
- **Variables Vercel pour l'envoi de mails (App Paie)** : `GMAIL_USER` et `GMAIL_APP_PASSWORD` doivent être ajoutées dans **Vercel → Settings → Environment Variables** (env Production, **sans** préfixe `VITE_`), sinon la fonction `api/send-mail` échoue en prod. Dépendance `nodemailer` requise (déjà dans `package.json`).
- **Vercel API** : le token est dans `.vercel-token.local` (ignoré par git). Projet : `prj_3lji4jmtjXfvqgS0wNeTX2K9Ifdb`, team : `team_hu9ukeB669vdDdC4XR2f0chi`. URL prod unique : **`https://suivi-pro-app.vercel.app`** (déployé depuis `main`). Le dev se teste en local sur `http://localhost:5173`. Pour lister les déploiements récents :
  ```bash
  TOKEN=$(cat .vercel-token.local)
  curl -s -H "Authorization: Bearer $TOKEN" "https://api.vercel.com/v6/deployments?projectId=prj_3lji4jmtjXfvqgS0wNeTX2K9Ifdb&teamId=team_hu9ukeB669vdDdC4XR2f0chi&limit=5"
  ```

## Architecture — points clés

### La couche `db` est un shim Dexie → Supabase
`src/db/index.js` expose un objet `db` dont les tables (`magasins`, `fournisseurs`, `parametres`, `entrees`, `suivi`, `modesReglement`, `commandes`, `evenements`, `salaries`, `defectueux`, `reglementPaye`, `paieVariables`, `paieEnvois`, `planning`, `sav`, `topModeles`, `reassorts`) **imitent l'API Dexie** (`where().equals().toArray()`, `.first()`, `.add()`, `.put()`, `.update()`, `.delete()`, `.orderBy()`, `.filter()`, `.where({...}).filter(fn)`, `.reverse().sortBy()`) mais tapent en réalité Supabase. Le code applicatif est donc écrit « comme du Dexie » alors qu'il parle à Postgres.

Conséquences importantes :
- **Mapping camelCase ↔ snake_case** : le code JS utilise `fournisseurId`, `magasinId`, `modelesBySeason`, `typeKey`, `recuN1`, `objectifN`, `reelN`, `modeReglement` ; la base utilise les colonnes snake_case. La conversion se fait **uniquement** dans `db/index.js` via `FIELD_TO_DB`. Si tu ajoutes une colonne dont le nom JS diffère du nom SQL, **ajoute-la à `FIELD_TO_DB`**.
- Beaucoup de filtres composés (`.and(fn)`, `.filter(fn)`, `where({...}).filter(fn)`) **chargent les lignes puis filtrent en JS** — ce ne sont pas des requêtes SQL pures.
- ⚠️ **Supabase plafonne chaque réponse à 1000 lignes** (`max-rows`), quel que soit `.limit()`. Toutes les lectures multi-lignes passent donc par `fetchAll()` (pagination `.range()` par 1000, tri stable `.order('id')`). Ne jamais réintroduire un `select` multi-lignes direct sans pagination (bug constaté : une saison > 1000 entrées → nouvelles entrées absentes du Suivi livraisons).
- `toCollection().modify()` est un no-op (vestige des migrations Dexie).

### Temps réel via `useLiveQuery`
`src/lib/useLiveQuery.js` est un hook maison (à ne pas confondre avec celui de `dexie-react-hooks`). Il exécute `queryFn`, puis s'abonne à **tous** les `postgres_changes` du schéma `public` et **ré-exécute la requête à chaque changement de n'importe quelle table**. C'est volontairement large (sync simple, pas de filtrage fin). `data === undefined` = en cours de chargement → afficher `<LoadingState />`.

### Notion de « saison » (côté client uniquement)
La saison active n'est **pas** une table : elle vit dans `localStorage` et dans `SeasonContext` (`src/context/SeasonContext.jsx`). Les lignes `entrees` et `parametres` portent une colonne texte `season` (ex. `ETE_2026`, `HIVER_2026`). Le filtrage par saison se fait dans chaque onglet avec `.where('season').equals(season)`, et la plupart des `useLiveQuery` ont `[season]` en dépendance. Ajouter/supprimer une saison se gère dans le `SeasonBadge` (en-tête de `App.jsx`) — la suppression efface aussi les lignes `parametres`/`entrees` correspondantes.

**Modèles d'une marque** : noms stockés **par saison** dans `fournisseurs.modeles_by_season` (JSONB `{ [seasonId]: string[] }`). Par magasin (une entrée `parametres` par fournisseur × magasin × saison) : `parametres.modeles` (JSONB `{ [nomModele]: quantité commandée }`), `parametres.prixModeles` (JSONB `{ [nomModele]: prix HT total }`, colonne SQL `prix_modeles`), `parametres.modelesSizes` (JSONB `{ [nomModele]: { [pointure]: qté attendue } }`, colonne `modeles_sizes`) et `parametres.modelesTypes` (JSONB `{ [nomModele]: clé SIZE_TYPES }`, colonne `modeles_types`). Le « reçu » par modèle est calculé depuis `entrees` (somme des `total` groupée par `modele`).

**Fusion de marques (doublons)** : Réglages → Marques, panneau « Fusionner deux marques » (`mergeFournisseurs` dans `SectionFournisseurs`). Rattache à la marque **conservée** toutes les données de la marque **doublon** (sur **toutes les saisons**) : `entrees`, `sav`, `defectueux`, `suivi` réaffectés (`fournisseurId`) ; `modes_reglement` déplacés (en évitant un doublon fournisseur×magasin) ; `parametres` fusionnés par (magasin × saison) ; `modelesBySeason` et `coordsMagasin` réunis ; puis le doublon est supprimé. Règle : **la cible gagne, la source comble les trous** (pas de double comptage ; les Achats Reçu/Objectif/Réel/Quantité ne sont **pas** additionnés). Helpers robustes au JSONB `null`.

**Prix / PHT des entrées** : le **prix unitaire** d'un modèle = `prixModeles[m] ÷ modeles[m]` (prix par modèle des paramètres) ; **0 si le modèle n'a pas de prix** — il n'y a **plus de repli sur le prix moyen `parametres.pm`** dans la saisie du Cahier (choix : prix par modèle uniquement, pour la précision tréso). Le champ **PHT livré n'est pas saisissable** : il vaut toujours `prix unitaire × quantité reçue` (recalculé quand les tailles changent). ⚠️ L'**import CSV d'entrées** (`EntreeImportModal`) garde, lui, un repli sur `pm` quand la ligne importée n'a pas de colonne PHT.

**Import CSV (Réglages → Marques)** : `ImportCSVPanel`/`parseCSV` lit l'entête **par nom de colonne** (séparateur `;` ou `,`) ; seules **Marque, Code Modèle, Couleur, Taille, Famille, Prix d'achat, Quantité commandé** sont utilisées. Le **modèle = `Code, Couleur`** ; les lignes (une par pointure) sont **agrégées par modèle** → `modeles` (total), `prixModeles` (Σ prix×qté), `modelesSizes` (qté par pointure), `modelesTypes` (grille auto via `detectGrid` : intervalle `XX-YY` ≥33 → DP / ≤27 → Bébé ; sinon Famille → F/H/E ; Crocs/Havaianas → DP ; TU/Accessoire). Les lignes sont **filtrées sur la société** du magasin sélectionné (colonne `Magasin` = société). Robustesse : la quantité est relue sur la **dernière cellule non vide** (les exports ont une colonne décalée en fin de ligne).

**Import CSV (Achats)** : `AchatImportModal` (bouton « 📂 Importer CSV » dans l'onglet Achats) importe les **montants par marque × magasin** dans la **saison active**. Colonnes lues par nom : `Magasin`, `Fournisseur`, `Reçu N-1`, `Objectif N`, `Réel achat N`, `Quantité`, `Stratégie` (+ `Statut`). Le **magasin** est mis en correspondance souple (normalisé, partiel : « Bailly Rouffiac » ↔ « Bailly Rouffiac tolosan », « Les 2 zèbres » ↔ « les 2 Zèbres ») ; magasin non reconnu → ligne ignorée. Plusieurs lignes d'une même marque × magasin sont **additionnées** (Reçu/Objectif/Réel/Quantité), le **PM est recalculé** (`reelN ÷ quantite`), la **stratégie** = dernière non vide. Met à jour la ligne `parametres` existante (sinon la crée) **sans toucher** aux `modeles`/`prixModeles` issus de l'import Marques. Nombres FR parsés (`4 101,50 €` → 4101.5).

**Achats par univers** : colonne `parametres.univers` (JSONB `{ Femme|Homme|Enfant|Accessoire: { prix, qte } }`). Dans `AchatEditModal`/`AchatAddModal`, le **Réel achat N** se saisit **par univers** (prix + quantité) ; `reelN`/`quantite`/`pm` de la ligne = **somme** des univers (si univers vide, l'ancien total global est conservé). Onglet Achats : **filtre par catégorie** (pastilles Femme/Homme/Enfant/Accessoire montrant le total € + qté de chaque, via `univTotals` calculé sur les lignes filtrées hors catégorie ; `rowAmounts(r, univ)` bascule l'affichage Réel/Quantité/PM sur la catégorie) + **barre de répartition en %** (couleurs `UNIV_COLORS`) + **clic sur une marque** déplie le détail par univers. Stratégie supplémentaire **« 🆕 NOUVEAU »** (`STRAT_COLORS`). Migration : `alter table parametres add column univers jsonb` (dev + prod).

**Import CSV (Entrées)** : `EntreeImportModal` (bouton « Importer CSV » de l'onglet Entrées du Cahier) crée des lignes `entrees` dans la **saison active**, format **« une ligne par pointure »** (comme Marques). Colonnes lues par nom : `Magasin`, `Marque`/`Fournisseur`, `Code Modèle`/`Modèle` (+ `Couleur` → `Code, Couleur`), `Taille`/`Pointure`, `Quantité`, `Date` (JJ/MM/AAAA), `N°`, `Catégorie`/`Famille` (→ `typeKey` via `detectTypeKey`), `Prix d'achat` (optionnel, unitaire), `Statut`. Les lignes d'une même **entrée** (clé = magasin + marque + modèle + date + N° + statut) sont regroupées : `sizes[pointure]` additionnées, `total` = Σ. **PHT** = Σ(prix×qté) si colonne prix, sinon `prix par modèle des paramètres × total`, sinon `pm × total`, sinon 0. Magasin en correspondance souple (sinon ligne ignorée), marque créée si absente. (Composant auparavant orphelin, désormais branché ; format « colonnes de pointures » abandonné au profit du format long.)

**Actions groupées (Entrées)** : bouton « Sélectionner » puis barre fixée en bas (`cahier/ActionsSelection.jsx`) : changer le statut (`STATUTS = ['', 'Enregistré', 'Imp. Etiquettes', 'Réassort', 'Retour']`), tout sélectionner, pointer / dépointer (Direction) ; menu « Plus » : date, catégorie, récapitulatif, supprimer (confirmation, nombre à retaper au-delà de 5), et pour la Direction magasin, saison, export CSV. Chaque action propose « Annuler ».

**Pré-remplissage des entrées** : dans la saisie du Cahier (`cahier/SaisieEntree.jsx`), choisir un modèle bascule sur sa grille (`modelesTypes`) et pré-remplit les pointures avec le **reste à recevoir = attendu (`modelesSizes`) − déjà reçu** (lu en base, hors retours), et reprend le **N°** et la **catégorie** de la dernière entrée du modèle. N'écrase jamais une saisie en cours.

**Suivi des livraisons (`cahier/SuiviLivraisons.jsx`)** : magasin de l'appareil par défaut (choix d'un autre magasin ou « Tous les magasins ») ; taux, paires reçues / attendues du magasin choisi ; liste par marque sur la page, modèles et pointures dépliables (reçu vs attendu par pointure).

**Conditions de règlement** : `modes_reglement.condition` (JSONB) porte, selon le mode, `{ nb }` (nombre de chèques) ou `{ delais: number[] }` (jours après livraison ; montant réparti à parts égales). Les défauts (`src/data/reglement.js` : `DEFAULT_NB_CHEQUE`, `DEFAULT_DELAIS`) reproduisent l'ancien comportement figé. `PlanReglement` calcule les échéances à partir de ces conditions.

**Regroupement par vrai fournisseur** : plusieurs marques peuvent appartenir au **même fournisseur** (ex. No Name + Schmoove → Rautureau Apple Shoes ; SMS + Aliwell + Nimal → Ango Shoes). Colonne `fournisseurs.groupe` (texte ; vide = la marque est son propre fournisseur). La **clé de groupe** = `groupe` (si renseigné) sinon le nom de la marque ; la **marque pilote** d'un groupe = celle au plus petit `id`, et c'est elle qui porte la config de règlement (`modes_reglement` + plan chèque `parametres.cheques`) de tout le groupe. Le rattachement se fait dans **Réglages → Modes de règlement** (champ « Fournisseur réel » sous chaque marque ; la config mode/conditions ne s'affiche que sur la pilote, les autres marques montrent « ↳ réglé via … »). Dans `PlanReglement`, tout est **agrégé par groupe** : CHEQUE = Σ des `reelN` des marques du groupe ÷ N (1ère réception la plus ancienne du groupe, plan chèque de la pilote) ; autres modes et avoirs ré-étiquetés au nom du fournisseur → ils s'additionnent dans le tableau mensuel. Rétro-compatible : sans `groupe`, chaque marque reste isolée (mêmes clés de pointage qu'avant).

**Plan chèque personnalisé (par saison)** : pour un mode CHEQUE, on peut saisir un échéancier manuel `parametres.cheques` (JSONB `[{ date, montant }]`, **par fournisseur × magasin × saison**) via le bouton 🗓 dans Réglages → Modes de règlement (`ChequePlanModal`). S'il existe, il **remplace** le calcul auto `reçu ÷ N` dans `PlanReglement` (`echeancesChequeCustom`) — figé, non recalculé depuis les entrées. Sinon, repli sur le calcul auto. Le mode (CHEQUE) reste global dans `modes_reglement` ; seul l'échéancier est par saison.

### Coque, navigation, comptes (refonte)
- **`src/App.jsx`** : routeur sans react-router. La vue vient de l'adresse (`#/cahier`, `#/sav`…) via `useVue()` (`src/shell/navigation.js` : `aller(vue)`, `ouvrirAvec(vue, action)` pour ouvrir un écran avec une action — ex. `#/cahier?nouveau`, `#/parametres?modes` — lue par `actionDemandee()` puis effacée par `effacerAction()`). Le retour du navigateur fonctionne.
- **`src/components/Connexion.jsx`** : tant que l'appareil n'est pas connecté (Supabase `signInWithPassword`, session mémorisée), seul l'écran de connexion s'affiche. Message d'erreur **identique** pour une adresse inconnue et un mauvais mot de passe (toute réponse 400), « Trop d'essais » pour 429. **Ne pas modifier** le mécanisme de session sans accord.
- **Comptes** : 5 comptes (un par magasin + 2 Direction). `CompteContext` → `useCompte()` = `{ email, estDirection }` (rôle `app_metadata.role === 'direction'`). `estDirection` ne sert qu'à l'affichage : **la base vérifie les droits** (sécurité étape 2, voir `SECURITE.md`). `DIRECTION_VIEWS` (achats, reglement, parametres) renvoie un compte magasin à l'accueil.
- **`src/shell/Coque.jsx`** : menu (`MENU` : premier groupe sans titre, « Équipe », « Direction » réservé aux comptes Direction), choix du **magasin de l'appareil**, apparence Auto / Clair / Sombre, « Se déconnecter » (**cet appareil seulement** : `signOut({ scope: 'local' })`, accord du 12/10 ; la déconnexion de tous les appareils d'un compte est dans Réglages → Appareils connectés). Pastilles de comptage (`useAlerts`) et rappel « À remplir avant le 25 » (paie, du 15 au 25). Téléphone : onglets Accueil, Entrées, Clients (Commandes + SAV), Réassorts, Plus.
- **`src/shell/EnTete.jsx`** : `PageShell` (titre, actions, sélecteur de saison `SeasonBadge`, onglets) et `BoutonMagasin`.
- **Magasin de l'appareil** : `MagasinContext` (`localStorage['magasin_courant']`), choisi une fois ; `StoreSelect` (« Dans quel magasin es-tu ? ») s'affiche dans Cahier, Réassorts, SAV & défectueux, Commandes tant qu'il n'est pas choisi.
- **Composants de la charte** : `components/ui/Icone.jsx` (icônes au trait, pas d'emojis dans les menus et boutons), `components/ui/Confirmation.jsx` (fenêtre de confirmation, `danger`), `cahier/Reperes.jsx` (`Toast` avec « Annuler », `Statut`, `Numero`). Classes : `.carte`, `.liste` / `.ligne`, `.btn` / `.btn-prim` / `.btn-danger`, `.champ`, `.etiquette`, `.chip` / `.chips`, `.segment`, `.feuille` (fenêtre, plein écran sur téléphone), `.encart`, `.aide`. Le **point de couleur** est réservé au statut des entrées ; ailleurs l'état s'écrit en **mot de couleur**.
- **`src/styles/pont.css`** : passerelle qui branche les anciens composants encore en place (fenêtres d'import CSV, fiches d'achat `AchatEditModal` / `AchatAddModal`, `Parametres.jsx`, `DangerConfirm`) sur la charte : ancienne palette (`--surface`, `--text`, `--accent`…) = couleurs de la charte, fenêtres / boutons / champs / tableaux restylés, couleurs de code en teinte transparente en mode sombre.
- **Essais avec / sans** : le panneau d'essai (`shell/essai.js`, `shell/PanneauEssai.jsx`) a été retiré le 13/10 ; pour un nouvel essai, le reprendre dans l'historique Git (commit précédant le retrait des fichiers inutilisés).
- **Écrans chargés à l'ouverture** : `ecran()` dans `App.jsx` (au lieu de `lazy`) recharge la page une fois si le fichier d'un écran n'existe plus (après une mise en ligne, Vercel ne sert plus les fichiers de la version précédente).

### Écrans (refonte)
- **Accueil** (`home/HomeScreen.jsx`, `home/AVenir.jsx`) : bonjour, raccourcis (Saisir une entrée, Commande client, Dossier SAV), compteurs non nuls, bloc « En retard », bloc « À venir » (agenda).
- **Cahier des entrées** (`cahier/`) : onglet **Entrées** par défaut (liste groupée par jour, fiche d'une entrée, sélection multiple et actions groupées dans `ActionsSelection.jsx`, import CSV) et **Suivi des livraisons** (`SuiviLivraisons.jsx`, magasin de l'appareil par défaut, « Tous les magasins »). Saisie `SaisieEntree.jsx` : pointures au toucher, Réception / Retour, création de marque anti-doublon, copier / coller une grille (`data/clipboard.js`), date du jour en heure française (`commun.js` : `aujourdhuiFr`). Pointage réservé à la Direction.
- **Top modèles & réassorts** (`reassort/`) : étapes À réassortir → Demandé → Commandé → En route → Reçu ; le mail à la marque passe à « Demandé » (adresse « mail commandes » du magasin, sinon SAV du magasin, sinon commune : `coordMarque`) ; retard « Demandé » ≥ 7 j, « En route » ≥ 10 / 15 j ; relance notée dans `etapes.Relance`.
- **Commandes clients** (`commandes/`) : liste en cours / retirées-annulées, fiche (appeler, SMS), saisie `SaisieCommande.jsx` (dernier salarié mémorisé). Noms de magasin comparés sans espaces ni tirets (`memeMagasin`, « Bailly Rouffiac-Tolosan » = « Bailly Rouffiac Tolosan »).
- **SAV & défectueux** (`savdef/`) : un écran, 2 onglets ; mails avec l'adresse et le n° client du magasin, sinon de la marque ; règles de clôture dans `savdef/regles.js`.
- **Répertoire** (`repertoire/Repertoire.jsx`) : liste compacte, fiche « Modifier / Enregistrer », coordonnées par magasin (dont **Mail commandes**, `emailCommandes`), garde-fou anti-doublon ; pour la Direction, mention « réglé avec le groupe … ».
- **Agenda** (`agenda/`) : page complète, vues Jour / Semaine (lundi → dimanche) / Mois / Année ; événements de l'outil (table `evenements`, violet, modifiables par tous) + 3 calendriers des magasins (lecture seule, couleur par magasin, événements sur plusieurs jours affichés chaque jour) ; date proposée en heure française. **Calendriers lus par le serveur** (branche `agenda-serveur`, 13/10) : `src/agenda/googleCalendars.js` appelle `GET /api/agenda?debut=&fin=` avec le jeton de session (mémoire de 3 min sur l'appareil) ; `api/agenda.js` refuse sans connexion valide (`verifierConnexion` de `api/_send.js`) ; `api/_agenda.js` lit les liens iCloud (mémoire 5 min, dernière copie gardée si iCloud ne répond pas), déroule les rendez-vous avec **ical.js** (récurrences, dates exclues, exceptions, journées entières, heure de Paris quel que soit le fuseau du serveur) et ne renvoie que titre, dates, heure, lieu, note (une note qui contient un lien n'est pas envoyée, décision B du 13/10) ; journaux sans lien ni contenu. Calendrier indisponible → `messageCalendriers()` (« Calendrier indisponible pour le moment : … ») dans la légende de l'agenda et sous « À venir ». En dev, `vite.config.js` sert `/api/agenda`.
- **Commandes fournisseurs** (`fournisseurs/`, plan C, branche `plan-c-etape2`, pas encore en ligne) : tables `achats_commandes`, `achats_lignes`, `achats_journal`, `mouvements_stock`, `magasins_correspondance` et fonctions `importer_commande`, `reimporter_commande`, `enregistrer_reception`, `corriger_reception`, `annuler_retablir_reliquat` (`supabase-plan-c.sql`, appliqué sur la base de test seulement ; annulation `supabase-plan-c-annulation.sql`). Accès en snake_case direct (`fournisseurs/donnees.js`, pas par le shim `db`). Lecture du CSV Polaris strict (20 colonnes) dans `fournisseurs/csvPolaris.js` (fonctions pures). Saisons suivies par commandes : Été 2027 et après (`suivieParCommandes`, même règle que la base). Une réception rattachée (`entrees.commande_id`) ne s'écrit que par les fonctions de réception (déclencheur). Points à trancher : panneau « Essai local » (`shell/essai.js`, `shell/PanneauEssai.jsx`, visible en local seulement), points dans `fournisseurs/points.js`.
- **Factures** (`factures/Factures.jsx`) : aucun enregistrement en base ; compteur de numéro **par appareil** (`factures_seq::{société}`) — plan pour un compteur partagé dans `PLAN-REFONTE.md` (« Plans préparés — B », non construit). Sur téléphone : onglets Saisie / Aperçu ; impression et PDF depuis une facture pleine taille.
- **Planning** (`planning/`) : grille de la semaine (téléphone : jour par jour), saisie d'un créneau, copier / coller, annuler (bouton + Ctrl+Z, vise la bonne semaine), « Reprendre la semaine précédente » (cases vides seulement), impression 1 / 2 / 3 semaines (`impression.js`).
- **Éléments de paie** (`paie/`) : règles de l'étape 2 (compte magasin : dépôt sans relecture ; Direction : lecture, correction, récap) ; société pré-remplie d'après le magasin, « Vérifie ta saisie » (avertissement hors du mois, totaux). La liste est relue après chaque enregistrement (`maj`).
- **Direction** : **Achats** (`tabs/Achats.jsx` ; fiche d'achat : mode de règlement en lecture seule, `achats/ModeLecture.jsx`), **Plan de règlement** (`reglement/Plan.jsx` ; ⚠️ le **calcul** est dans `reglement/calcul.js`, déplacé **tel quel** depuis l'ancien écran — ne pas le modifier sans comparaison ligne par ligne avec l'outil actuel ; bloc « En retard », mois passés payés repliés, avoirs « déduit », marques en chèques sans réception dans un bloc à part `chequesEnAttente`), **Réglages** (`tabs/Parametres.jsx`, ouvrable sur un onglet : `#/parametres?modes` ; suppression de saison avec le nom à retaper).
- Fichiers inutilisés retirés le 13/10 (`tabs/PlanAchat.jsx`, ancien `tabs/PlanReglement.jsx`, `lib/migrate.js`, `components/ComboBox.jsx`, panneau d'essai, images du modèle Vite). La référence du calcul du Plan est l'**outil en ligne** (comparaison ligne par ligne).

### Envoi d'emails — fonction serveur (`api/`)
Les mails (App Paie ; potentiellement d'autres à l'avenir) partent d'une **fonction serverless Vercel** : `api/send-mail.js` (handler POST `{to, subject, text}`) qui utilise `api/_send.js` → **nodemailer + SMTP Gmail** (`smtp.gmail.com:465`) avec `GMAIL_USER` / `GMAIL_APP_PASSWORD` (mot de passe d'application Google). Le `from` est `B'Shoes & JR Shoes <GMAIL_USER>`. **Aucune marque tierce** dans les mails (contrairement à EmailJS). En **dev**, `vite.config.js` sert la même route via un middleware (`Object.assign(process.env, loadEnv(...))` charge les vars non-`VITE_`), donc `npm run dev` envoie aussi de vrais mails. **En prod, définir `GMAIL_USER` et `GMAIL_APP_PASSWORD` dans Vercel** (env Production, sans préfixe `VITE_`).

### Domaine métier
- **`src/data/societes.js`** : mapping magasin → société (B'Shoes / JR Shoes), codé en dur dans `SOCIETE_MAP`. `getSociete(magasin)` est insensible à la casse/espaces.
- **`src/data/sizes.js`** : définitions des grilles de tailles chaussures (`SIZE_TYPES` : Femme/Homme/Enfant/Bébé/**Double pointure (DP)**/TU/Accessoire ; Femme et Homme incluent les demi-pointures, Enfant aussi). `DEFAULT_GRID_BY_MARQUE` (clé = marque en minuscules) force une grille par défaut à la sélection de la marque dans la saisie du Cahier (ex. Crocs/Havaianas → `DP`). `buildEntreeRow()` et `SIZE_COL_KEYS` reproduisent la **structure historique d'un Google Sheet / Apps Script** (lignes de 35 colonnes) mais ne sont **plus importés ailleurs** (export legacy inactif) — d'où la possibilité d'avoir des grilles > 35 tailles. Les quantités par taille d'une entrée sont stockées dans la colonne JSONB `entrees.sizes`.
- **`src/data/clipboard.js`** : presse-papier en mémoire (module singleton) pour copier/coller une grille de tailles dans la saisie du Cahier.

### Migration historique
L'import ponctuel IndexedDB → Supabase (`lib/migrate.js`) n'était plus branché nulle part ; il a été retiré le 13/10 (consultable dans l'historique Git).

## Thème clair / sombre

Couleurs de la charte en **jetons** (`src/styles/charte.css`) : `--fond`, `--carte`, `--carte-2`, `--trait`, `--texte`, `--doux`, `--discret`, `--action`, `--action-texte`, `--action-teinte`, `--ok`, `--att`, `--err` (+ `-teinte`). Mode sombre : `html[data-theme="dark"]`. Le réglage **Auto / Clair / Sombre** est dans le menu (`useApparence`, `localStorage['theme']`, « Auto » suit l'appareil). L'ancienne palette (`--surface`, `--text`…) est redirigée vers ces jetons par `pont.css`.

**Règle pour tout nouveau style** : utiliser les jetons de la charte, y compris dans les styles inline. **Exceptions en hex** : couleurs **sémantiques** conservées de l'outil actuel (magasins de l'agenda, modes de règlement, stratégies, statuts) et texte sur fond coloré. Vérifier chaque écran en clair **et** en sombre.

## Responsive

Hook `useMediaQuery(query)` + points de rupture `PHONE` (≤ 640 px) et `TABLET` (≤ 1024 px) dans `src/lib/useMediaQuery.js`. Les écrans magasin sont conçus **d'abord pour le téléphone** et testés aux 3 tailles (téléphone, tablette, ordinateur) : aucun défilement de côté, fenêtres en feuille plein écran sur téléphone, champs ≥ 44 px et en 16 px (évite le zoom iOS). Les écrans Direction sont conçus pour l'ordinateur, lisibles sur téléphone (Plan de règlement en lignes de deux niveaux). Tester sur mobile : `npx vite --host` puis l'IP réseau affichée.

## Conventions de style

- Écrans refaits : classes de la charte + fichier CSS par écran (`cahier.css`, `reassort.css`…), styles inline limités aux valeurs dynamiques. Pas de librairie CSS/UI.
- Helpers partagés dans `src/components/shared.jsx` : `LoadingState`, `ErrorState`, `fmt`, `fmtEur`, **`fmtTel`** (espace les numéros par paires, garde un `+` international ; appliqué à la saisie et à l'affichage des téléphones). Réutilise-les plutôt que de reformater.
- Formatage des nombres/devises avec `toLocaleString('fr-FR', ...)` (EUR).
- ESLint flat config avec `react-hooks` et `react-refresh` ; `dist/` est ignoré.
