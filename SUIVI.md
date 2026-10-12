# Suivi du chantier de refonte

> Mis à jour à chaque étape — **dernière mise à jour : dimanche 11 octobre 2026, protection mise en ligne**.
> Branches : `refonte` (dossier `Projets/suivi-pro-refonte`), `securite` (dossier `Projets/suivi-pro`). En production : `main` = correctifs I1-I3 + protection (d3b32c4) ; `dev` identique.

## Où on en est

| Étape | État |
|---|---|
| 1. Audit (`AUDIT.md`) | ✅ fait, propositions triées |
| Correctifs urgents I1-I2-I3 | ✅ **en ligne** depuis le 10/10/2026 01h13 (5 commits, vérifiés ensemble) |
| Sécurité B6 étape 1 + plafond mails (`SECURITE.md`) | ✅ **EN LIGNE depuis le dimanche 11/10/2026** : code à 14h20, filtrage activé à 14h28 (fenêtre d'exposition ~6 min). Vérifié : anonyme = 0 ligne / écriture refusée ; comptes connectés OK ; mail sans connexion refusé ; vrai mail reçu et noté au journal |
| **Sécurité B6 étape 2** — paie réservée aux comptes Direction, PIN supprimé | ✅ **faite et testée sur la base de test** (11/10, branche `securite-etape2`, `supabase-securite-etape2.sql`) ; ⏳ production : **nouvel accord écrit, après quelques jours de fonctionnement sans souci de l'étape 1 dans les 3 magasins** |
| 2. Plan, charte, maquettes (`PLAN-REFONTE.md`, `maquettes/`) | ⏳ à valider |
| 3. Construction écran par écran | ✅ socle commun validé (12/10) · ✅ **Cahier des entrées validé** (13/10) · ✅ **Accueil validé** (13/10) · ✅ **SAV & défectueux validé** (13/10) · ✅ **Commandes clients validé** (13/10) · ✅ **Réassorts validé** (13/10) · ⏳ Répertoire : vérification des règles métier |
| 4. Préparation de la mise en ligne | à venir |

## Décisions prises

- 10/10 — Retenu : I1-I9, U1, U2, U3, U5, U6, U7, U8, U14, B2. Écarté pour l'instant : U12, U13. B6 : étape 1 avancée **avant** la refonte.
- 10/10 — Équipes sur ordinateur de caisse, tablette **et téléphone** : écrans magasin conçus d'abord pour le téléphone, testés aux 3 tailles.
- 10/10 — Saisie des livraisons au déballage, carton par carton → garder marque / N° / date / grille entre deux saisies.
- 10/10 — Comptes de connexion : **5 comptes** — un par magasin (contact.baillyalbi@, contact.baillyrouffiac@, contact.les2zebres@gmail.com) + **2 comptes Direction** (Jérémie, Raphaël).
- 10/10 — Mails : journal + plafond (3 récaps / 24 h vers Marion, 10 demandes / 24 h vers vous), **option B** (fonction en base, aucune clé secrète).
- 10/10 — Les 2 comptes Direction (Jérémie, Raphaël) ont les mêmes droits.
- 11/10 — Étape 2 : récap de paie envoyé d'un clic par la Direction (mail « saisies complètes » à Jérémie) ; Achats réservés à la Direction ; Planning modifiable par tous.
- 11/10 — Règle ajoutée au CLAUDE.md : **aucun test destructif sur la production**.
- 11/10 — Mots de passe de production recopiés en lieu sûr par vous ; fichiers `comptes-production.txt` et `messages-equipes.txt` supprimés.
- 11/10 — Pointage des entrées réservé à la Direction : E7 (règle en base) accordé et testé sur la base de test ; écran Entrées masqué aux magasins ; ajouté à l'étape 2 et au message aux équipes.
- 11/10 — Règle de construction (PLAN-REFONTE.md §2 bis + CLAUDE.md) : rien ne disparaît sans être dans la liste « Ce qui est retiré, masqué ou déplacé », avec accord ligne par ligne.
- 11/10 — Décisions : agenda du jour + lien sur l'accueil ; compteurs « Réassorts en route » et « Dossiers SAV en cours » gardés + tâches en retard ; magasin sur chaque entrée pour la Direction seulement ; catégorie dans le détail et en filtre ; regroupement par jour ; pas de sous-titre sous le logo ; Défectueux / SAV / Planning : décision sur leurs maquettes.
- 11/10 — Accueil : bloc « À venir » façon widget Calendrier (aujourd'hui, sinon les prochains avec leur jour ; 4 lignes ; lien « Voir l'agenda »).
- 11/10 — Couleurs des N° (1 rouge, 2 bleu, 3 vert…, logique identique à l'outil actuel) partout ; codes couleur actuels remis dans la maquette (jauges, %, pointures, entrées pointées).
- 11/10 — « À venir » complété avec les jours suivants ; position sur téléphone : à revoir sur un vrai téléphone.
- 11/10 — Accueil : les 5 compteurs gardés et dessinés (zéro masqué) + bloc « En retard ».
- 11/10 — Saisie : catégorie et statut pré-remplis si déductibles, toujours visibles et modifiables d'un toucher.
- 11/10 — Point de couleur du statut gardé ; couleurs à confirmer (l'outil actuel n'en a pas).
- 11/10 — **Direction B choisie** ; fenêtre de saisie avec rappel des dernières entrées du jour et avertissement de doublon (2ᵉ toucher pour confirmer une entrée identique).
- 11/10 — Couleurs de statut de la maquette gardées ; distinction N° / statut à valider (point plein ou creux) ; accueil « sobre » proposé (comparaison dans `maquettes/comparaisons.html`).
- 11/10 — Statuts : ordre Aucun → Enregistré → Imp. étiquettes partout ; couleurs Enregistré orange, Imp. étiquettes vert, Réassort bleu, Retour rouge ; point plein (pas de point creux). Valeur en base inchangée (« Imp. Etiquettes »). L'outil actuel a l'ordre inversé : à corriger dans la refonte.
- 11/10 — **Sobriété retenue** pour tous les écrans : couleur réservée aux repères et à l'urgence ; N° et statuts gardent leurs couleurs. Prévention des doublons validée.
- 11/10 — Compteurs : trait de couleur rétabli (chiffre en noir). Point de couleur réservé au statut des entrées. N° toujours juste après le nom du modèle. Agenda : **barre de couleur du magasin** retenue.
- 11/10 — Ordre des statuts corrigé dans l'outil actuel (Aucun → Enregistré → Imp. Etiquettes), testé en local, **part avec l'étape 2**.
- 12/10 — **Étape 3 lancée.** Socle : charte dans le code (`src/styles/charte.css`), icônes au trait (`src/components/ui/Icone.jsx`), coque (`src/shell/Coque.jsx` : barre latérale ≥ 768 px, onglets en bas + « Plus » sur téléphone, page « Clients »), liens directs par écran (`#/cahier`…, retour du navigateur), apparence Auto/Clair/Sombre, écrans chargés à la demande (chargement initial 1,4 Mo → 444 Ko), icône d'écran d'accueil (U14). Les écrans eux-mêmes ne sont pas encore refaits.
- 12/10 — Copie de travail de la refonte : `node_modules` relié au projet principal, `.env.local` copié (base de test). Serveur local de la refonte : port **5174** (l'outil actuel reste sur 5173).
- 12/10 — Socle validé (emojis des titres et onglets, groupes du menu, pastille « S », pastille de saison). Suppression de saison retirée de l'en-tête → Paramètres → Saisons (Direction, nom à retaper).
- 12/10 — **Règle de méthode** : attendre le feu vert explicite de l'utilisateur avant chaque nouvelle étape de construction.
- 12/10 — **Cahier des entrées refait** (`src/cahier/`) : liste (recherche marque/modèle/N°, filtres, regroupement par jour, sélection, pointage Direction), fiche, saisie et correction réunies dans un seul écran (`SaisieEntree.jsx`), suivi des livraisons sur la page. Données enregistrées identiques à l'outil actuel. Anciens fichiers retirés (`tabs/Entrees.jsx`, `tabs/SuiviLivraisons.jsx`, `components/EntreeForm.jsx`, `components/EntreeEditModal.jsx`). Testé en pilotant le navigateur (téléphone et ordinateur, compte magasin et Direction) avec vérification en base de test ; entrées de test supprimées.
- 13/10 — Retours sur le Cahier : points 1, 2, 4 à 10 accordés. Corrigé : **« Créer la marque … »** depuis la saisie (pas de conflit avec l'étape 2 : la table des marques reste modifiable par tous les comptes connectés, vérifié sur la base de test) ; **barre d'actions de la sélection fixée en bas de l'écran** (elle était hors de l'écran dans les 6 cas testés : magasin / Direction × téléphone / tablette / ordinateur) ; **confirmation** avant de fermer une saisie commencée et avant de supprimer une entrée.
- 13/10 (suite) — Corrections 2, 3, 4 accordées. **Création de marque** : garde-fous contre les doublons (« Vouliez-vous dire … ? », confirmation avec le nom exact, nom nettoyé). **« Supprimer » en lot** dans la barre de sélection avec protections (détail, nombre à retaper au-delà de 5, pointées protégées pour les magasins, « Annuler » 10 s : faisable sans risque car aucune autre table ne dépend des entrées par une contrainte ; les lignes sont remises avec leur numéro d'origine, donc un défectueux lié retrouve son entrée). Testé dans le navigateur sur la base de test (30 vérifications) ; données de test supprimées. Autres actions groupées proposées, en attente de votre choix.
- 13/10 (suite 2) — **Cahier validé** sous réserve de : majuscules des marques (mots de liaison en minuscules, nom tout en majuscules gardé) — fait ; actions groupées choisies (tous : date, catégorie, récapitulatif ; Direction : magasin, saison, export CSV) — faites, avec confirmation et « Annuler » ; barre de sélection allégée (une ligne sur téléphone, menu « Plus », Supprimer en rouge en dernier) — faite ; « N° de commande » était un mauvais nom de ma part pour le **N° de référence du modèle** (champ « N° », pastille colorée) — nom corrigé dans la refonte et le plan, pas d'action groupée dessus. Brouillon du message aux équipes pour la refonte : `MESSAGE-EQUIPES-REFONTE.md`.
- 13/10 — **Cahier validé** (Dépointer dans « Plus » accordé ; brouillon `MESSAGE-EQUIPES-REFONTE.md` accordé). **Feu vert pour l'Accueil.** Accueil refait (`src/home/HomeScreen.jsx`, `AVenir.jsx`, `accueil.css`) : version sobre, raccourcis, compteurs (trait de couleur, chiffre en noir, zéro masqué), « En retard » (réassorts ≥ 10 j, SAV ouverts ≥ 7 j, entrées à pointer pour la Direction), « À venir » (barre du magasin, jours suivants en complément, 4 lignes), page « Agenda » (`#/agenda`). Les raccourcis ouvrent directement le formulaire (`#/cahier?nouveau`, `#/commandes?nouveau`, `#/sav?nouveau`). Testé sur téléphone, tablette, ordinateur, compte magasin et Direction, clair et sombre, base de test ; données de test supprimées. Liste à valider : `PLAN-REFONTE.md` §2 bis, lignes « Accueil — … ».
- 13/10 — **Accueil validé** ligne par ligne, avec ajustements faits : tutoiement partout dans la refonte (règle ajoutée à la charte ; exception : mails envoyés hors de l'équipe) ; retard SAV à **15 jours** ; « Agenda » ajouté au menu (et dans « Plus ») ; « Livraisons attendues » abandonné pour l'instant ; deux idées pour plus tard notées dans le plan (date du mail SAV, date de livraison prévue). **Feu vert pour SAV & défectueux** (points à trancher : à montrer avec et sans).
- 13/10 — **SAV & défectueux refait** (`src/savdef/`) : un écran, 2 onglets ; cartes SAV avec journal, minuteur, clôture unique proposée (U5) ; défectueux en liste + fiche ; saisies dans la charte (marque anti-doublon, pastilles salarié/pointure), enregistrement en chaîne sécurisé (I9). Données identiques (entrée « Retour » −1, défectueux « À traiter », liens, mails Gmail). Les 3 points non tranchés sont construits **avec et sans** (panneau « Essai local », visible seulement en local ; affichés « avec » par défaut). Anciens écrans retirés (`sav/Sav.jsx`, `sav/SavModal.jsx`, `sav/constants.js`, `defectueux/Defectueux.jsx` ; `DefectueuxModal.jsx` gardé, utilisé par les Réassorts). Testé : téléphone, tablette, ordinateur, magasin et Direction, clair et sombre, base de test ; données de test supprimées.
- 13/10 — Vérification des règles métier (avoirs, Plan de règlement) : identiques à l'outil actuel sauf la proposition « Clôturer les deux » qui pouvait faire apparaître un avoir non reçu. **Décisions appliquées** : clôture du défectueux proposée seulement s'il est « Avoir reçu » (sinon rappel) ; magasin sur la ligne pour la Direction, société dans la fiche ; pas de champ « État » à la création ; magasin du SAV toujours visible (pré-rempli, à choisir pour la Direction) ; journal sans ajout automatique ; avertissement retour à 0 € ; effet de l'état affiché dans la fiche ; protection des avoirs dans les actions groupées du Cahier. Panneau « Essai local » retiré. Message aux équipes : reste au « vous ».
- 13/10 — **SAV & défectueux validé**, avec le champ « Prix unitaire HT (facultatif) » dans la saisie SAV quand le prix calculé est 0 € (testé avec un compte magasin : compatible étape 2). Feu vert pour les Commandes clients.
- 13/10 — **Défaut trouvé en production (Commandes, Rouffiac)** : le magasin s'appelle « Bailly Rouffiac Tolosan » ; l'écran Commandes comparait avec « Bailly Rouffiac-Tolosan ». Depuis le magasin choisi une fois pour tous les outils (~05/10), l'appareil de Rouffiac ne voyait que 3 commandes sur 44 (41 enregistrées avec tiret, dont 1 « Commandée » et 3 « Client prévenu », liste transmise au magasin) ; compteur « Clients à prévenir » faux pour Rouffiac. Aucun autre écran ni magasin concerné (vérifié dans le code et en lecture seule dans la base : seuls `commandes.magasin` a deux écritures ; `planning.magasin` et `salaries.magasin` utilisent le nom de la liste des magasins). **Correction prête** sur la branche `correctif-rouffiac` (dossier `suivi-pro-correctif`, partie de `main`, sans refonte ni étape 2) : comparaison des noms sans espaces ni tirets (3 fichiers, aucune donnée modifiée), testée en local. Mise en ligne prévue ce soir sur « on met en ligne ».
- **À faire plus tard (avec sauvegarde et accord écrit)** : nettoyage des données — renommer les commandes de Rouffiac pour n'avoir qu'une seule écriture du nom (41 lignes « Bailly Rouffiac-Tolosan » et 3 « Bailly Rouffiac Tolosan » à ce jour ; avec la correction, les nouvelles commandes s'enregistrent « Bailly Rouffiac-Tolosan »).
- 13/10 — **Décalage d'heure (date du jour calculée en heure anglaise)**, à corriger plus tard avec accord : saisie d'une entrée de l'outil en ligne (`EntreeForm`, date par défaut calculée **une seule fois à l'ouverture de l'outil** et en heure anglaise : une tablette restée ouverte après minuit propose la date de la veille), nouvelle commande (`CommandeModal`), nouvel événement d'agenda (`AgendaModal`) : entre minuit et 2 h, la date proposée est celle de la veille. Les autres dates (minuteur SAV, étapes des réassorts…) sont des instants complets, sans problème. Refonte : Cahier et Commandes en heure française ; l'agenda (pas encore refait) garde le défaut.
- 13/10 — **Commandes clients refait** (`src/commandes/Commandes.jsx`, `SaisieCommande.jsx`) : liste + fiche (Appeler / SMS), retirées et annulées masquées par défaut avec filtre, saisie dans la charte (dernier salarié mémorisé, date en heure française), correction du nom de magasin intégrée. Règles identiques à l'outil actuel (aucun statut ne déclenche rien dans les autres tables ; « Reçue » et « À commander » alimentent les compteurs). Points A à E construits avec et sans (panneau « Essai local », `src/shell/essai.js` réutilisable). Au passage : correction des champs salarié et pointure qui passaient en « Autre » quand la liste se chargeait après l'ouverture (SAV, défectueux, commandes). Testé téléphone, ordinateur, magasin et Direction, clair et sombre, base de test.
- 13/10 — **Commandes clients validé** : A à E « avec » (État à la création, « À commander » par défaut ; suggestions de marques ; SMS au vouvoiement ; proposer « Client prévenu » ; étape suivante discrète avec « Annuler »). Panneau « Essai local » retiré. Vérifications SAV mises à jour selon les décisions (38/38), Commandes 23/23 : aucun test en échec.
- 13/10 — **Correctif du soir complété** (branche `correctif-rouffiac`, 2 commits, 6 fichiers) : nom de magasin Rouffiac + **date du jour en heure française, calculée à l'ouverture de la saisie** (nouvelle entrée du Cahier, nouvelle commande, nouvel événement d'agenda sans jour choisi). Testé en local avec une horloge simulée : saisie à 0 h 30 et outil resté ouvert depuis la veille → date du jour (avant : la veille). Dans l'agenda, la date proposée reste celle du jour touché dans le calendrier.
- 13/10 — **Entrées possiblement datées de la veille (production, lecture seule)** : la table des entrées n'enregistre pas de date de création, et la base ne garde pas l'heure des écritures : **impossible de compter exactement**. Indicateur indirect (date = veille de la dernière date déjà saisie dans le même magasin), saison Hiver 2026 : **32 entrées sur 1 016** (Bailly Albi 27, Les 2 Zèbres 3, Bailly Rouffiac Tolosan 2) — à la fois le défaut et les saisies volontaires de la veille, indiscernables. Effet possible sur le Plan : échéances « à la livraison » avancées d'un jour au plus ; **aucune n'aurait changé de mois** ; aucune série de chèques touchée (première réception). Aucune modification faite. Idée pour plus tard : ajouter une date de création aux entrées (`entrees.created_at`, additif, avec accord).
- 12/10 — **Correctif en ligne** (Rouffiac + date du jour) : sauvegarde `~/Sauvegardes/suivi-pro/prod-2026-10-12_13h55-avant-correctif-rouffiac-date/`, envoi par vous (`main` d3b32c4 → 8691471), version servie par Vercel vérifiée (identique à la construction locale, sans refonte ni étape 2), données inchangées (93 commandes, 2 139 entrées) ; contrôles à l'écran bons. Retour arrière : Vercel → déploiement d3b32c4 → « Promote to Production ». ⚠️ À reporter plus tard dans `dev`, `securite-etape2` et `refonte` (la refonte contient déjà la correction du nom et de la date).
- 13/10 — **Réassorts** : règles vérifiées dans le code de l'outil en ligne (tableau validé). Production (lecture seule) : 6 réassorts, 1 seul à « Demandé » (Clarks 26186387 Black, Albi, historique incohérent : vous le vérifiez avec le magasin et le corrigez à l'écran) ; **aucune donnée modifiée**, « Demandé » traité comme « À réassortir ». Prix à la réception : 2 entrées « Réassort » en production, **aucune à 0 €** ; la règle (prix du modèle, sinon 0 €, sans repli sur le prix moyen) est **identique à celle du Cahier** — je recommande de la garder et d'ajouter le prix facultatif (point B) plutôt que le repli du SAV ; règle inchangée sans votre accord.
- 13/10 — **Réassorts refait** (`src/reassort/Reassort.jsx`, `Saisies.jsx`, `reassort.css` ; anciens `TopModal`, `ReassortModal`, `ReceptionModal` et `defectueux/DefectueuxModal` retirés) : liste + fiche, vue Tous magasins, mêmes calculs et mêmes données. Points A à C avec et sans. Testé (29 vérifications) sur la base de test, téléphone et ordinateur, magasin et Direction ; données de test supprimées.
- 13/10 — **Réassorts validé** : A à C « avec », règle de prix à la réception inchangée (pas de repli sur le prix moyen), panneau « Essai local » retiré ; 30 vérifications passées.
- 10/10 — Les ~65 suppressions de marques en production depuis juin sont bien de vous (nettoyage et fusion de doublons) : pas d'activité suspecte.
- 10/10 — Le rituel de fin de session du `CLAUDE.md` (déploiement automatique) est **suspendu** pendant le chantier.
- 10/10 — En local, les mails ne partent jamais (affichés dans le terminal) ; `SEND_REAL_MAIL=1` pour réactiver.

## Points à retenir

- Sauvegardes de la production : `~/Sauvegardes/suivi-pro/` (notice `LISEZMOI.txt` ; restauration testée — **ne pas oublier l'étape des autorisations**).
- Écarts de structure base de test / production : colonne inutilisée `commandes.type` (test seulement) ; `sav.id` numéroté différemment. Sans effet sur l'outil.
- À reprendre par vous : 13 retours à 0 €, 57 entrées à 0 € (liste dans `VERIFICATIONS-PROD.md`, local) ; chèque Reqins Albi daté du 15/09 à vérifier ; mot de passe d'application « Suivi Pro local » sur bshoes.albi à supprimer s'il ne sert plus.

## 📅 JOUR J — dimanche 11 octobre : mise en ligne de la protection

> **Déclencheur** : vous écrivez « **on met en ligne** ». Rien ne se fait avant, même dans une nouvelle conversation.
> Accord écrit déjà donné (10/10) pour S1, S2, S2 bis, S3 en production. Magasins fermés.

### Où sont les choses
- Code : branche **`securite`** (dossier `Projets/suivi-pro`), partie de la version en ligne (`main`) + 8 commits : connexion, déconnexion, mails réservés aux appareils connectés, plafond, `SECURITE.md`, `supabase-securite.sql`.
- Instructions de base testées : **`supabase-securite.sql`** (S2, S2 bis, puis S1 en dernier ; retour arrière en bas du fichier).
- Mots de passe de production : `~/.suivi-pro/comptes-production.txt` (privé, hors projet). Messages équipes : `~/.suivi-pro/messages-equipes.txt`.
- Production : projet Supabase `fftfrbpcsazkkvahscbg` (`.prod-db-url.local`), site `https://suivi-pro-app.vercel.app`.

### Déroulé (dans cet ordre)
1. **Contrôles** : `git fetch` — rien de nouveau sur `origin/main` / `origin/dev` (sinon s'arrêter et en parler) ; `securite` part bien de `origin/main`.
2. **Sauvegarde fraîche de la production** dans `~/Sauvegardes/suivi-pro/prod-AAAA-MM-JJ_HHhMM-avant-protection/` (+ copie de `LISEZMOI.txt`), vérifiée (17 tables).
3. **Vous** : fermer les inscriptions de la production — Supabase → projet `fftfrbpcsazkkvahscbg` → Authentication → Sign In / Providers → désactiver « Allow new users to sign up » → Save. **Claude vérifie** (`/auth/v1/settings` → `disable_signup: true`). ⛔ Ne pas aller plus loin tant que ce n'est pas fermé.
4. **Claude crée les 5 comptes** de production (même méthode que sur la base de test, mots de passe du fichier privé) et teste une connexion.
5. **Claude applique S2 + S2 bis** (journal + fonction de plafond) sur la production. Sans effet sur l'outil actuel.
6. **Mise en ligne du code** : `main` avancé sur `securite` (avance simple), envoi sur GitHub → Vercel. Attendre que le site en ligne contienne « Connectez cet appareil ». À partir d'ici, tout appareil non connecté voit l'écran de connexion.
7. **Vous** : vous connecter sur le site en ligne avec le compte Direction 1, vérifier que tout s'affiche.
8. **Claude active S1 (filtrage) immédiatement** — fenêtre d'exposition limitée aux étapes 6 → 8.
9. **Vérifications ensemble** :
   - accès anonyme direct à la base : 0 ligne visible, écriture refusée ;
   - outil connecté : lecture, saisie, mise à jour en temps réel (2 appareils ou 2 onglets) ;
   - mail sans connexion : refusé ; appel anonyme du plafond : refusé ;
   - une vraie « demande de modification paie » envoyée à vous depuis l'outil connecté : reçue, et notée dans le journal.
10. **Synchroniser `dev`** sur `main` et l'envoyer (pour l'autre ordinateur). Fusionner aussi dans `refonte`.
11. Les équipes se connectent lundi à l'ouverture avec le message reçu samedi.

### En cas de problème
- **Désactiver S1** (bloc « RETOUR ARRIÈRE » en bas de `supabase-securite.sql`) : effet immédiat, aucune donnée touchée.
- **Vercel → Deployments → déploiement précédent → « Instant Rollback »** : l'ancienne version (sans connexion) revient.
- Les comptes, le journal et la fonction de plafond peuvent rester en place : ils n'ont aucun effet sur l'ancienne version.
- Restauration complète : voir `LISEZMOI.txt` de la sauvegarde (⚠️ étape des autorisations).

### Après le jour J
- Sécurité étape 2 (paie réservée aux 2 comptes Direction, PIN vérifié par la base) — 2 à 3 jours, accord écrit à demander.
- Puis reprise de la refonte : validation du plan et des maquettes (direction A recommandée).

## Sécurité B6 étape 2 (prévue juste après l'étape 1)

- **Deux comptes Direction** : Jérémie (jeremie.seigne@gmail.com) et Raphaël (raphaelseigne04@gmail.com, gère Rouffiac), reconnus par la base (marque « direction » sur le compte) : les règles d'accès distinguent comptes magasin et Direction.
- **Périmètre du compte de Raphaël : tout, comme Jérémie** (décision du 10/10) — les deux comptes Direction ont exactement les mêmes droits.
- **Paie** : les comptes magasin peuvent **déposer** une saisie mais **pas relire** celles des autres ; la liste « rempli / à remplir » passe par une vue sans le contenu ; récap, corrections et envoi réservés à la Direction ; l'envoi automatique du récap se fait côté serveur.
- **Code PIN supprimé du site** : Plan de règlement, Réglages (et ce qu'on décidera de réserver) ne s'ouvrent qu'avec le compte Direction, **vérifié par la base** et non plus à l'écran.
- **Bouton « Déconnecter tous les appareils d'un magasin »** dans Réglages.
- Limite à connaître : avec un compte par magasin, une collègue peut remplir la paie « au nom » d'une autre sur le même appareil. Seuls des comptes par personne régleraient ce point (à rediscuter si besoin).
- Effort : **moyen à gros, 2 à 3 jours** (test complet sur la base de test compris). Modifie la structure de la base → accord écrit.

## Limites connues (acceptées)

- **Budgets d'achat lisibles techniquement par un compte magasin** (accepté le 11/10) : après l'étape 2, l'écran Achats est réservé à la Direction et la base refuse aux magasins toute modification, mais les lignes d'achat restent **lisibles** par un compte magasin qui interrogerait la base directement (l'outil en a besoin pour le prix des entrées et le suivi des livraisons). **Pour supprimer cette limite** : séparer la table `parametres` en « assortiment » (modèles, prix, pointures, quantités attendues — lisible par tous) et « budgets » (reçu N-1, objectif, réel, stratégie, plan chèque — Direction seulement) ; modification de structure + adaptation de 7 écrans (Achats, fenêtres d'achat, import achats, Paramètres, Plan de règlement, Suivi des livraisons, saisie d'entrée). **Effort : moyen à gros, 2 à 3 jours.**
- **Paie avec comptes par magasin** : une collègue peut remplir la fiche « au nom » d'une autre sur le même appareil (seuls des comptes par personne régleraient ce point).

## Reste à faire

- [x] Accord écrit (base de test) et construction de la protection étape 1 sur la base de test
- [x] Choix du plafond (option B), vraies adresses (5 comptes)
- [x] Inscriptions fermées sur la base de test (vérifié le 10/10)
- [x] Accord écrit pour la production : S1, S2, S2 bis, S3 (10/10)
- [x] Messages aux équipes datés du dimanche 11 octobre (à envoyer le samedi 10 par vous)
- [x] **Jour J — dimanche 11 octobre** : fait (étapes 1 à 10) ; sauvegarde `~/Sauvegardes/suivi-pro/prod-2026-10-11_14h17-avant-protection/`
- [x] Sécurité étape 2 construite et testée sur la base de test (11/10)
- [x] Étape 2 essayée en local par vous avec les deux types de compte : tout fonctionne (y compris une entrée sur une marque et un modèle nouveaux) — 11/10
- [x] Message aux équipes prêt : `MESSAGE-EQUIPES-ETAPE2.md` (branche `securite-etape2`) — date à compléter
- [ ] **Attendre que l'étape 1 ait tourné quelques jours sans souci dans les 3 magasins** (décision du 11/10)
- [ ] Puis accord écrit pour l'étape 2 en production, et mise en ligne (même déroulé que l'étape 1 : sauvegarde → E1-E5 → code → reconnexion Direction → vérifications) — ⚠️ annoncer aux équipes que **les Achats disparaissent de leur menu**
- [x] Direction B choisie ; décisions de détail prises sur l'accueil, les statuts, les N°, les couleurs
- [ ] Votre avis général après essai complet des maquettes, puis passage à l'étape 3 (socle, puis Cahier des entrées)
- [ ] Étape 3 : socle, puis les écrans dans l'ordre du plan
