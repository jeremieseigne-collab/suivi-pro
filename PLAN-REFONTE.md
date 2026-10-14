# Plan de la refonte

> **État au 12/10** : tous les écrans sont construits et validés ligne par ligne (voir § 5) ; ce plan décrit la refonte **telle qu'elle est construite** (branche `refonte`). Maquettes d'origine : `maquettes/index.html` (charte : `maquettes/charte.html`).
> Retenu à l'audit : I1 à I9, U1, U2, U3, U5, U6, U7 (sauf la suppression de « Demandé », annulée le 13/10), U8, U14, B2 (U4, réorganisation des Réglages : **non faite**, voir « Idées pour plus tard »). Protection des données (B6 étape 1) : chantier séparé, avant la refonte (voir `SECURITE.md`, branche `securite`).

---

## 1. Nouvelle organisation

### Le menu

| Ordinateur / tablette (barre latérale) | Téléphone (onglets en bas) | Pour qui |
|---|---|---|
| **Magasin de l'appareil** (sélecteur en haut du menu) | dans « Plus » | Tous |
| **Accueil** — « ma journée » | Accueil | Tous |
| **Agenda** (page complète ; « À venir » sur l'accueil) | Plus | Tous |
| **Cahier des entrées** (Entrées · Suivi des livraisons) | Entrées | Tous |
| **Top modèles & réassorts** | Réassorts | Tous |
| **Commandes clients** | Clients | Tous |
| **SAV & défectueux** | Clients | Tous |
| **Répertoire** | Plus | Tous |
| **Factures** | Plus | Tous (magasins et Direction — décision du 12/10) |
| *Équipe* — **Planning** | Plus | Tous |
| *Équipe* — **Éléments de paie** | Plus | Tous (règles de l'étape 2 : un magasin dépose, la Direction lit) |
| *Direction* — **Achats** | Plus | Comptes Direction |
| *Direction* — **Plan de règlement** | Plus | Comptes Direction |
| *Direction* — **Réglages** | Plus | Comptes Direction |
| Apparence Auto / Clair / Sombre, compte connecté, Se déconnecter, Replier le menu (bas du menu) | dans « Plus » | Tous |

L'onglet « Clients » du téléphone ouvre une page avec deux entrées : Commandes clients et SAV & défectueux. Les pastilles de comptage (réassorts, défectueux, clients à prévenir) et le rappel « À remplir avant le 25 » (paie, du 15 au 25) sont dans le menu.

### Ce qui est regroupé

| Avant | Après | Pourquoi |
|---|---|---|
| SAV + Défectueux (2 apps) | **SAV & défectueux** (une app, 2 onglets) | Un retour client crée déjà un défectueux ; une seule clôture (U5) |
| Bouton 🌙 flottant | Réglage **Auto / Clair / Sombre** en bas du menu (« Plus » sur téléphone) ; « Auto » suit l'appareil | Plus de bouton qui masque l'écran |
| Bouton ☰ flottant | Barre latérale (ordinateur, tablette) / onglets (téléphone) | Idem |

Achats, Réglages (Magasins, Salariés, Marques, Modes de règlement, Saisons, Appareils connectés) et les modes de règlement **gardent leur organisation actuelle** (décision du 12/10) ; « Paramètres » s'appelle « Réglages ».

### Ce qui est supprimé
- Les compteurs peu utiles en haut des écrans (« lignes totales », « lignes filtrées », « nombre de magasins »…).
- Le bouton retour ← en haut de chaque app (le menu est toujours visible ; le retour du navigateur fonctionne).
- Les 6 menus de filtres toujours visibles du Cahier → pastilles (magasin, Toutes, Retours ; « À pointer » pour la Direction) + un bouton « Filtres » (magasin, société, marque, catégorie, statut ; pointage pour la Direction).
- Les fichiers inutilisés (`PlanAchat.jsx`, ancien `PlanReglement.jsx`, `migrate.js`, `ComboBox.jsx`, panneau d'essai `PanneauEssai.jsx` / `essai.js`, images du modèle Vite `src/assets/*`, `public/icons.svg`) : **retirés le 13/10** (commit à part ; aucun n'était utilisé, ni dans la refonte ni dans l'outil en ligne : rien de visible). L'ancien calcul du Plan reste consultable dans l'historique Git.

### Ce qui est ajouté
- **Accueil « ma journée »** (B2) : seulement ce qui demande une action aujourd'hui + les 3 actions fréquentes.
- **Écran de connexion** (chantier sécurité).
- **Saisie des pointures au tapotement** et enchaînement « carton suivant » (I7).
- **Liens directs** par écran, retour du navigateur (U9) ; **icône sur l'écran d'accueil** du téléphone (U14).
- **Annuler** après une action courante (enregistrer, changer un statut…) au lieu des confirmations à répétition.
- **Pointage des entrées : réservé aux comptes Direction** (décision du 11/10) — avec un compte magasin, il n'apparaît nulle part (ni rond, ni filtre « À pointer », ni compteur, ni rappel sur l'accueil).

---

## 2. ⚠️ Changements à annoncer aux équipes

| Ce qui change | Avant | Après |
|---|---|---|
| **Ouvrir le Cahier** | s'ouvre sur « Suivi livraisons » | s'ouvre sur **Entrées** (le suivi est le 2ᵉ onglet) |
| **Saisir les pointures** | une case par pointure à remplir au clavier | **toucher la pointure** ajoute une paire (« − » pour corriger) ; « Tout le reste à recevoir » en un toucher |
| **Saisir un retour** | choisir le statut « Retour » dans la liste | bascule **Réception / Retour** en haut de la saisie |
| **Après « Enregistrer »** | message d'1,5 s puis fenêtre vidée (grille remise sur Femme) | la marque, le N°, la date et la grille **restent** : on enchaîne le carton suivant |
| **Changer le statut** | ✏️ → menu → Enregistrer | toucher la ligne → toucher le statut |
| **Défectueux** | app séparée | onglet de **SAV & défectueux** |
| **Navigation au téléphone** | bouton ☰ en bas à gauche | **onglets en bas** de l'écran |
| **Connexion** | aucune | identifiant du magasin, **une fois par appareil** |
| **Marque absente de la liste** | impossible depuis le Cahier (il fallait passer par le SAV, les défectueux, le répertoire ou les top modèles) | **« Créer la marque … »** directement depuis la saisie ; l'outil propose d'abord une marque existante au nom proche (« Tu voulais dire… ? ») et demande confirmation du nom exact |
| **Actions sur plusieurs entrées** | statut et pointage seulement | « Sélectionner » → barre en bas : **Changer le statut**, Tout sélectionner, Annuler (+ Pointer pour la Direction) ; menu **« Plus »** : changer la **date**, la **catégorie**, **copier un récapitulatif** ; pour la Direction : Dépointer, changer le **magasin**, la **saison**, **exporter en CSV**. Chaque modification est confirmée puis peut être annulée |
| **Agenda** | affiché en entier sur l'accueil (Jour / Semaine / Mois / Année) | l'accueil montre **« À venir »** (4 prochains rendez-vous) ; l'agenda complet s'ouvre avec **« Voir l'agenda »** (ou en touchant un rendez-vous) : c'est là qu'on ajoute ou modifie un événement |
| **Raccourcis de l'accueil** | — | **Saisir une entrée**, **Commande client**, **Dossier SAV** ouvrent directement le formulaire |
| **Supprimer plusieurs entrées** | impossible (une par une) | menu « Plus » → **Supprimer** (en rouge) : fenêtre avec le détail, nombre à retaper au-delà de 5, entrées pointées protégées, « Annuler » pendant 10 s |
| **Réassorts** | « Commander par mail » passait à « Commandé » | passe à **« Demandé »** ; « Commandé » quand la marque confirme ; « Demandé » depuis 7 jours = en retard (relancer) |
| **Planning** | — | « Reprendre la semaine précédente », bouton « Annuler la dernière modification », impression 1 / 2 / 3 semaines, téléphone jour par jour |
| **Paie** | société à choisir | société **pré-remplie** d'après le magasin ; « Vérifie ta saisie » avec totaux et avertissement hors du mois |
| **Agenda** | semaine du lundi au samedi | semaine du **lundi au dimanche** ; événements de l'outil en violet ; événement de plusieurs jours affiché chaque jour ; bouton « Nouvel événement » |
| **Factures** | inutilisables sur téléphone | onglets **« Saisie » / « Aperçu »** sur téléphone |
| **Se déconnecter** | déconnectait tous les appareils du compte | ne déconnecte que **cet appareil** (aussi avec l'étape 2) |

---

## 2 bis. Ce qui est retiré, masqué ou déplacé

> ⛔ **Règle de construction** (décision du 11/10, aussi dans `CLAUDE.md`) : **rien ne disparaît de l'outil s'il n'est pas dans cette liste, avec l'accord de l'utilisateur ligne par ligne.** En cas de doute, on garde et on demande.
> Légende : ✅ accordé · ⏸ à décider plus tard (rien n'est retiré d'ici là) · ↔ déplacé (toujours accessible ailleurs).

| Écran | Élément | Décision |
|---|---|---|
| Partout | Bouton retour ← en haut de chaque app | ✅ retiré (menu toujours visible, retour du navigateur) |
| Partout | Boutons flottants ☰ et 🌙 | ✅ retirés (menu / onglets ; apparence Auto / Clair / Sombre dans le menu) |
| Partout | Emojis des menus | ✅ remplacés par des icônes avec texte |
| Partout | Sous-titre « B'Shoes · JR Shoes » sous le logo | ✅ retiré (11/10) |
| Partout — compte magasin | Achats, Plan de règlement, Réglages (« Paramètres ») | ✅ masqués (sécurité étape 2) |
| Partout — compte magasin | Pointage des entrées (rond, filtre « À pointer », compteur, rappel sur l'accueil) | ✅ masqué (11/10, sécurité étape 2 / E7) |
| Accueil | Ligne en double « Aujourd'hui · magasin » | ✅ retirée |
| Accueil | Compteurs à zéro | ✅ masqués |
| Accueil | Agenda en 4 vues (Jour / Semaine / Mois / Année) | ↔ ✅ l'accueil montre un bloc **« À venir »** façon widget Calendrier de l'iPhone : les rendez-vous restants d'aujourd'hui ; s'il n'y en a pas (ou plus), les **prochains** avec leur jour (« Demain », « Jeudi 15 »…) ; les lignes libres sont **complétées avec les jours suivants** (comme le widget) ; jamais vide tant qu'un événement est à venir ; **4 lignes max** ; position sur téléphone à revoir sur un vrai téléphone ; lien « Voir l'agenda » vers l'agenda complet (11/10) |
| Accueil | Les 5 compteurs : Réassorts à commander, Réassorts en route (« dont X en retard »), Clients à prévenir, Défectueux à traiter, Dossiers SAV en cours | **tous gardés et dessinés** (11/10), avec leurs couleurs actuelles ; un compteur à zéro reste masqué ; on **ajoute** un bloc « En retard » |
| Cahier — Entrées | 4 compteurs en haut (lignes totales, lignes filtrées, unités, valeur estimée) | ✅ retirés |
| Cahier — Entrées | 6 menus de filtres toujours visibles | ↔ ✅ repliés : pastilles + bouton « Filtres » (catégorie, statut, marque ; magasin et pointage pour la Direction) |
| Cahier — Entrées | Colonne magasin | ✅ affichée sur chaque ligne **pour les comptes Direction seulement** (11/10) |
| Cahier — Entrées | Colonne catégorie | ↔ ✅ visible dans le **détail** d'une entrée et disponible en **filtre** (11/10) |
| Cahier — Entrées | Colonne date | ↔ ✅ remplacée par un regroupement par jour (11/10) |
| Cahier — Suivi des livraisons | Compteur « nombre de magasins » | ✅ retiré |
| Cahier — Suivi des livraisons | Taux global, reçues, attendues ; N° de chaque modèle ; détail par pointure ; recherche par marque ; choix du magasin | **gardés** (11/10) — choix du magasin avec, par défaut, celui de l'appareil |
| Commandes clients | Commandes retirées / annulées | ↔ ✅ masquées par défaut (U6), accessibles par le filtre « Retirées / annulées » (lignes grisées) ; le résumé indique « retirées et annulées masquées » |
| Réassorts | Étape « Demandé » | ✅ **gardée** (13/10 — U7 annulée : ce n'est pas un doublon, la demande est envoyée et on attend la confirmation de la marque). Étapes : À réassortir → Demandé → Commandé → En route → Reçu. Voir « Règles métier — Réassorts » |
| Défectueux | Colonnes Magasin et Société ; champ « État » à la création | ✅ décidé (13/10) : **magasin** sur la ligne pour les comptes **Direction** (même règle que le Cahier ; la liste est toujours celle du magasin choisi) ; **société** retirée de la ligne, visible dans la **fiche** ; champ « État » **retiré à la création** (créé « À traiter », l'état se change dans la fiche ; il reste dans « Modifier ») |
| SAV | Champ magasin à la création | ✅ décidé (13/10) : **toujours visible**, magasins en pastilles (un toucher) ; **pré-rempli** avec le magasin de l'appareil pour un compte magasin ; **à choisir** avec un compte Direction |
| Planning | 4 lignes vides ajoutées d'office | ✅ retirées (décision D) — un remplaçant s'inscrit avec « Ajouter un remplaçant » en bas de la grille (et de la liste du jour sur téléphone) |
| Socle — titres des pages | Emoji devant le titre (« 📥 Cahier des entrées » → « Cahier des entrées ») | ✅ accordé (12/10) |
| Socle — onglets du Cahier | Emojis des onglets (« 📦 Suivi livraisons », « 📥 Entrées ») | ✅ accordé (12/10) |
| Socle — menu | Groupes « Au quotidien » / « Gestion » → premier groupe sans titre, « Équipe », « Direction » ; Répertoire et Factures remontés dans le premier groupe ; logo 👟 → pastille « S » | ✅ accordé (12/10) |
| Socle — sélecteur de saison | Pastille à la couleur de la saison (choix et ajout) | ✅ accordé (12/10) |
| Socle — suppression de saison | ↔ **retirée de l'en-tête**, déplacée dans **Réglages → Saisons**, réservée à la Direction, nom à retaper | ✅ décidé (12/10) — une croix à côté d'une pastille se lit « fermer » |
| Socle — apparence | Bouton 🌙 flottant → réglage **Auto / Clair / Sombre** dans le menu (« Auto » pour qui n'a jamais choisi ; un choix déjà fait est conservé) | ✅ accordé (boutons flottants) |
| Cahier — onglet d'ouverture | S'ouvre sur **Entrées** (le suivi devient le 2ᵉ onglet) | ✅ accordé (plan) — **à annoncer aux équipes** |
| Cahier — saisie | Bouton « Enregistrer » (qui fermait la fenêtre) et « Enregistrer et continuer » → **un seul « Enregistrer »** qui garde la fenêtre ouverte pour le carton suivant ; on ferme avec ✕ — **confirmation si une saisie est commencée** (13/10) | ✅ accordé (13/10) |
| Cahier — saisie | Champs Magasin, Date, N° et Grille regroupés sur une ligne résumé, avec « Modifier » pour les changer | ✅ accordé (13/10) |
| Cahier — saisie | Liste des marques : recherche au lieu du menu déroulant ; **ajout (13/10) : « Créer la marque … »** quand la recherche ne trouve rien, sans quitter la saisie, **avec garde-fous contre les doublons** : même nom à la casse/aux accents/aux espaces/à la ponctuation près → la marque existante est proposée, pas de création ; nom proche (1 lettre d'écart, 2 pour les noms de 6 lettres et plus) → « Tu voulais dire… ? » d'abord ; confirmation affichant le nom exact enregistré (espaces en trop retirés ; majuscule au début de chaque mot, sauf les mots de liaison et, de, du, des, la, le, les, en, à quand ils ne sont pas en premier — « Coco et Abricot » ; un nom tapé tout en majuscules reste tel quel — « UGG ») (l'outil actuel ne le permettait pas depuis le Cahier, seulement depuis SAV, défectueux, répertoire, top modèles) ; modèle : liste de la saison + **saisie libre conservée** | ✅ accordé (13/10) |
| Cahier — sélection | **Ajout : « Supprimer » en lot** (l'outil actuel ne le permettait pas) : dans le menu « Plus », en rouge, à part, en dernier ; fenêtre avec nombre d'entrées, total de paires et 5 premières lignes ; au-delà de 5 entrées, nombre à retaper ; entrées pointées exclues pour un compte magasin ; « Annuler » pendant 10 s (remet les lignes à l'identique, même numéro) | ✅ accordé (13/10) |
| Cahier — sélection | **Ajouts : actions groupées** — pour tous : changer la date, changer la catégorie (la grille de pointures ne change pas), copier un récapitulatif (marque, modèle, paires) ; Direction seulement : changer le magasin, changer de saison, exporter en CSV. Chaque modification : confirmation rappelant le nombre d'entrées, puis « Annuler » dans le message | ✅ accordé (13/10) |
| Cahier — sélection | Barre allégée : nombre, Changer le statut, Pointer (Direction), Tout sélectionner, Annuler — **une seule ligne sur téléphone** (libellés courts « Statut », « Tout », croix pour annuler) ; les autres actions dans **« Plus »**. ↔ **« Dépointer » (Direction) passe de la barre au menu « Plus »** (toujours aussi sur chaque ligne) | ✅ accordé (13/10) · ↔ Dépointer : ✅ accordé (13/10) |
| Cahier — saisie | Quantités : toucher la pointure (+1 / −1) ; **au clavier, on tape toujours le nombre** sur la pointure et on se déplace avec ← → | ✅ accordé (13/10) |
| Cahier — saisie | Copier / Coller une grille | ✅ **gardé** (« Copier la grille » / « Coller ») ; la grille saisie est toujours copiée automatiquement après « Enregistrer » |
| Cahier — saisie | Retour saisi au Cahier : bouton Réception / Retour ; grille vide (pas de pré-remplissage) ; **données identiques** à aujourd'hui (statut « Retour », quantités positives) | ✅ accordé (I7) |
| Cahier — liste | Pagination 1, 2, 3… → bouton « Afficher 50 de plus » | ✅ accordé (13/10) |
| Cahier — liste | Choix du magasin : **gardé pour tous les comptes** (dans « Filtres », par défaut le magasin de l'appareil) ; le magasin s'affiche sur la ligne pour la Direction, ou quand on regarde tous les magasins | ✅ accordé (13/10) |
| Cahier — liste | Correction d'une entrée : ✏️ sur la ligne → toucher la ligne ouvre la **fiche** (statut en un toucher, pointures, Modifier, Supprimer **avec confirmation** ; Pointer pour la Direction) | ✅ accordé (13/10) |
| Cahier — liste | Sélection multiple : cases toujours visibles → bouton **« Sélectionner »** ; la **barre d'actions reste fixée en bas de l'écran** (corrigé le 13/10) : nombre sélectionné, **Changer le statut** (un toucher, avec « Annuler »), Tout sélectionner, Annuler ; Pointer / Dépointer pour la Direction. Actions groupées de l'outil actuel **toutes reprises** : statut groupé (y compris « vide »), Pointer, Dépointer, Tout sélectionner (lignes filtrées), Désélectionner | ✅ accordé (13/10) |
| Cahier — téléphone | « Importer CSV » : en bas de la liste sur téléphone (en haut sur ordinateur) ; messages de confirmation en haut de l'écran sur téléphone | ✅ accordé (13/10) |
| Suivi des livraisons | Cartes par magasin repliées + fenêtre de détail → liste par marque **sur la page** (modèles et pointures dépliables) | ✅ accordé (U1) |
| Suivi des livraisons | Taux global, reçues, attendues : calculés sur le **magasin choisi** (avant : sur les trois magasins) ; « Tous les magasins » redonne le total | ✅ accordé (13/10) |
| Menu | Pastilles de comptage colorées (Réassorts, Défectueux, Commandes) et rappel orange « À remplir avant le 25 » sur la paie | ⚠️ absents de la maquette — **gardés** — ✅ dessiné et présent dans la refonte (revue du 12/10) |
| Partout | **Sélecteur de saison** (pastille de couleur par saison) | ⚠️ absent de la maquette — **gardé** — ✅ dessiné et présent dans la refonte (revue du 12/10) |
| Cahier — Entrées | Bouton « Importer CSV » ; sélection multiple + changement de statut groupé | ⚠️ absents de la maquette — **gardés** — ✅ dessiné et présent dans la refonte (revue du 12/10) |
| Saisie d'une entrée | Champs **Catégorie** et **Statut** à la création | ✅ **gardés** (11/10) : pré-remplis quand l'outil peut les déduire (catégorie depuis la grille), **toujours visibles et modifiables d'un toucher** ; jamais de valeur choisie sans que la vendeuse la voie |
| Saisie d'une entrée | **Copier / Coller** une grille de pointures | ⚠️ absent de la maquette — **gardé** — ✅ dessiné et présent dans la refonte (revue du 12/10) |
| Agenda | Couleurs par magasin (Albi bleu, Rouffiac vert, 2 Zèbres orange) | ⚠️ maquette avec d'autres couleurs — **gardées** — ✅ présent dans la refonte (revue du 12/10) |
| Accueil — en-tête | « Bonjour 👋 » / « Bonsoir 👋 » → **« Bonjour » / « Bonsoir » sans emoji** ; la date et le magasin passent au-dessus, en petit | ✅ accordé (13/10) |
| Accueil — magasin non choisi | Bandeau « 🏪 Choisis ton magasin dans le menu… » : **gardé**, sans emoji, **au tutoiement** comme le reste de l'outil (« Choisis ton magasin dans le menu (« Plus » sur téléphone)… ») | ✅ accordé (13/10) |
| Accueil — raccourcis | **Ajout** : « Saisir une entrée » (ouvre la saisie du Cahier), « Commande client » (ouvre une nouvelle commande), « Dossier SAV » (ouvre un nouveau dossier) — sur téléphone, le premier sur toute la largeur, les deux autres côte à côte | ✅ accordé (13/10) |
| Accueil — compteurs | Emojis ⚠️ 🚚 🛍️ 🛠️ 🔧 **retirés** ; chiffre **en noir** (il était de la couleur du compteur) ; **trait de couleur** gardé avec les couleurs actuelles ; compteur à zéro masqué ; « dont X en retard » (orange) et « X à commander » sous Clients à prévenir **gardés** ; effet de soulèvement au survol retiré ; un compteur ouvre toujours son écran | ✅ accordé (13/10) |
| Accueil — « En retard » | **Ajout** : réassorts « En route » depuis **10 jours ou plus** (même seuil que l'écran Réassorts) ; dossiers SAV (retour client, réparation) non clôturés **ouverts depuis 15 jours ou plus** ; pour la Direction seulement, **entrées à pointer** (saison affichée, magasin de l'appareil ; ouvre le Cahier sur « À pointer »). « Rien en retard » quand il n'y a rien. Le retard SAV se compte depuis l'ouverture du dossier (la date du mail n'est pas enregistrée — voir « Idées pour plus tard ») | ✅ accordé (13/10, seuils 10 et 15 jours) |
| Accueil — « Livraisons attendues cette semaine » | Bloc de la maquette **non construit** : l'outil n'enregistre pas de date de livraison prévue | ✅ abandonné pour l'instant (13/10) — voir « Idées pour plus tard » |
| Accueil — « À venir » | Barre de couleur du magasin pour les 3 calendriers des magasins ; événements saisis dans l'outil (communs aux 3 magasins) en **violet** (dans l'agenda complet ils restent bleus « Mes événements », comme aujourd'hui) ; un rendez-vous du jour reste affiché **jusqu'à une heure après son heure de début** (l'heure de fin n'est pas connue) ; « Aucun événement à venir » s'il n'y a rien | ✅ accordé (13/10) |
| Accueil — agenda complet | ↔ Déplacé sur une page **« Agenda »** (lien « Voir l'agenda », ou toucher un rendez-vous) : 4 vues, ajout, modification, calendriers des magasins, inchangés pour l'instant (écran refait plus tard). **« Agenda » ajouté au menu** (premier groupe, sous Accueil) et dans « Plus » sur téléphone | ✅ accordé (13/10) |
| SAV & défectueux — organisation | 2 apps (SAV, Gestion des défectueux) → **un écran, 2 onglets** « SAV » et « Défectueux » ; menu : « SAV » et « Défectueux » → **une entrée « SAV & défectueux »** (la pastille « défectueux à traiter » passe dessus) ; page « Clients » du téléphone : 2 entrées (Commandes clients, SAV & défectueux) ; les liens `#/sav` et `#/defectueux` ouvrent chacun leur onglet | ✅ accordé (13/10) |
| SAV & défectueux — compteurs du haut | Cartes « Dossiers / En cours / Retours » et « Défectueux / En cours » → **une ligne de résumé** sous les filtres (« Bailly Albi · 7 dossiers · 6 en cours · 5 retours ») ; correction : « Défectueux » comptait les 3 magasins, il compte le magasin affiché | ✅ accordé (13/10) |
| SAV — cartes | Badges avec emojis (🔄 Retour, 🧵 Réparation, 👟 Forme, 🎁 Offert, 💰 prix) → étiquettes sans emoji (« Retour client », « Réparation », « Mise à la forme », « Offerte », le prix ou « Payante ») ; 📍 👤 🗓 → « Bailly Albi · Eve · 12/10/26 » ; statut en texte (Clôturé en vert) ; carte clôturée grisée | ✅ accordé (13/10) |
| SAV — boutons ✉️ ✏️ 🗑 | Icônes au trait **en haut de la carte** (plus de boutons flottants qui chevauchent le texte) ; supprimer → fenêtre de confirmation (au lieu de « Supprimer / Annuler » dans la carte), qui rappelle que le défectueux et l'entrée « Retour » liés restent | ✅ accordé (13/10) |
| SAV — journal | Ajout d'une note horodatée **avec Entrée ou le bouton « Ajouter »** ; **quitter le champ n'ajoute plus rien** (le texte reste dans le champ) ; toucher une ligne pour la modifier (la vider la supprime) ; lecture seule si clôturé | ✅ décidé (13/10) |
| SAV — mise à la forme | **Identique** : minuteur 48 h (bleu, orange à 60 %, rouge à 90 %), « Prête à récupérer », une paire à la fois avec file d'attente, « Terminer » (retire la paire sans clôturer) et « Clôturer » ; emojis ⏱ ✓ ⏳ → icônes | ✅ accordé (13/10) |
| SAV & défectueux — une seule clôture (U5) | **Ajout** : à la clôture d'un SAV, « Clôturer aussi le défectueux » n'est proposé **que s'il est déjà « Avoir reçu »** (sans effet sur le Plan) ; s'il est encore « À traiter » ou « Mail envoyé », simple **rappel** « Le défectueux est encore “…” : pense à le passer à Avoir reçu ou Refusé » et seul le SAV est clôturé. Passer un défectueux à « Avoir reçu », « Clôturé » ou « Refusé » propose de clôturer aussi le SAV lié. **Aucun avoir n'apparaît dans le Plan de règlement sans changement volontaire de l'état du défectueux.** « Annuler » dans le message après la clôture (sauf mise à la forme) | ✅ décidé (13/10) |
| SAV — saisie | Mêmes champs et mêmes données. Salarié en **pastilles** (prénoms du magasin) + « Autre » ; marque par **recherche avec création anti-doublon** (avant : liste + « + » sans garde-fou) ; modèle par recherche + « Ajouter le modèle » ; pointure en pastilles (pointures reçues) + « Autre » ; bouton « Annuler » → ✕ avec **confirmation si la saisie est commencée** ; enregistrement « en chaîne » sécurisé (I9 : réessayer ne recrée pas l'entrée ni le défectueux). Étapes après l'enregistrement identiques (mail, adresse à taper, l'enregistrer au répertoire ; machine occupée) | ✅ accordé (13/10) |
| Défectueux — liste | Tableau → **liste** : marque · modèle · N° (pastille de couleur) · pointure ; date · salarié · magasin · société (selon le point à trancher) ; note sur une ligne ; état à droite. Toutes les colonnes restent | ✅ accordé (13/10) |
| Défectueux — état et boutons | Menu déroulant d'état dans la ligne → **toucher la ligne ouvre la fiche**, état en un toucher avec « Annuler » ; ✉️ ✏️ 🗑 de la ligne ↔ **déplacés dans la fiche** ; filtre d'état : menu → pastilles | ✅ accordé (13/10) |
| Défectueux — couleurs des états | À traiter orange, Mail envoyé bleu, Avoir reçu vert, Refusé rouge ; **Clôturé : violet → vert** (comme dans le SAV, l'audit relevait l'incohérence) ; pastilles colorées → **mot en couleur** (le point de couleur reste réservé aux entrées) ; lignes Clôturé / Refusé grisées (identique) | ✅ accordé (13/10) |
| Défectueux — mail depuis la liste | Le mail envoyé depuis la fiche passe le défectueux à « Mail envoyé » **et** le SAV lié à « Mail marque envoyé » (avant : le bouton ✉️ de la ligne ne mettait pas à jour le SAV, le menu d'état oui) | ✅ accordé (13/10) |
| Défectueux — saisie | Mêmes champs et mêmes données ; salarié en pastilles ; marque par recherche anti-doublon ; N° pré-rempli (le plus fréquent du modèle) ; pointure parmi celles reçues (comme aujourd'hui) ; prix facultatif ; confirmation si la saisie est commencée ; enregistrement en chaîne sécurisé | ✅ accordé (13/10) |
| SAV & défectueux — retour à 0 € | **Ajout** : à la création d'un retour, d'une réparation ou d'un défectueux, si le prix calculé est 0 €, avertissement « Prix à 0 € : aucun avoir n'apparaîtra dans le Plan de règlement. Saisis le prix si tu le connais. » ; dans le SAV, le champ « Prix unitaire HT (facultatif) » apparaît **seulement dans ce cas**, sous l'avertissement (le défectueux a déjà ce champ). Le prix tapé n'est écrit que sur la ligne « Retour » (pas dans les prix des modèles) : compatible avec les droits de l'étape 2 pour un compte magasin. L'enregistrement reste possible | ✅ décidé (13/10) |
| Défectueux — fiche | **Ajout** : une ligne discrète sous l'état indique son effet (« Avoir reçu : l'avoir est compté dans le Plan de règlement », « Refusé : aucun avoir », « Mail envoyé : l'avoir n'est pas encore compté… » ; « aucun avoir (retour à 0 €) » si le retour est à 0 €) | ✅ décidé (13/10) |
| Cahier — actions groupées et avoirs | **Ajout** : si la sélection contient des lignes « Retour », la confirmation l'indique (« Dont X retours : cela déplacera / retirera X avoirs du Plan de règlement » — date, magasin, saison : déplace ; statut, suppression : retire) ; le changement de statut groupé demande alors une confirmation (sinon un toucher, comme avant). **Compte magasin** : les retours liés à un défectueux sont **exclus** des changements groupés de statut et de date, avec un message (comme les entrées pointées) | ✅ décidé (13/10) |
| Commandes — magasin | **Correctif** : les noms de magasin sont comparés sans espaces ni tirets (« Bailly Rouffiac Tolosan » = « Bailly Rouffiac-Tolosan ») : les commandes de Rouffiac enregistrées sous les deux écritures s'affichent, compteur « Clients à prévenir » juste | ✅ décidé (13/10, aussi corrigé dans l'outil en ligne) |
| Commandes — en-tête et compteurs | Bouton ←, titre avec emoji, bouton magasin violet → en-tête commun ; cartes « Commandes / En cours / Retirées » → ligne de résumé (« Bailly Albi · 42 commandes · 5 en cours · 26 retirées ») | ✅ accordé (13/10) |
| Commandes — liste | Tableau de 12 colonnes → **liste** : client (prénom nom) · téléphone ; marque · modèle · réf. · pointure ; date · salarié · provenance (couleur du magasin) ; note sur une ligne ; état à droite (mot de couleur, mêmes teintes). Toutes les informations restent | ✅ accordé (13/10) |
| Commandes — filtres | Menus État / Provenance / Salarié → pastilles « En cours » (par défaut), À commander, Commandée, Reçue, Client prévenu, « Retirées / annulées » + bouton « Filtres » (provenance, salarié) ; recherche identique | ✅ accordé (13/10) |
| Commandes — état et boutons | Menu d'état dans la ligne → **toucher la ligne ouvre la fiche**, état en un toucher avec « Annuler » ; ✏️ 🗑 ↔ dans la fiche (Modifier, Supprimer avec confirmation au lieu de « Oui / Non ») ; note : bulle au survol et fenêtre → note sur la ligne et en entier dans la fiche | ✅ accordé (13/10) |
| Commandes — appeler / SMS | **Ajout (U6)** : boutons « Appeler » et « SMS » dans la fiche quand un téléphone est saisi | ✅ accordé (13/10) |
| Commandes — saisie | Mêmes champs et mêmes données ; salarié en pastilles + « Autre », **obligatoire** comme aujourd'hui, **dernier salarié mémorisé** sur l'appareil (U6) ; provenance en pastilles (couleur du magasin) ; **date du jour en heure française** (validé) ; ✕ avec confirmation si la saisie est commencée | ✅ accordé (13/10) |
| Commandes — accueil | Le compteur « Clients à prévenir » ouvre les commandes **filtrées sur « Reçue »** (avant : la liste complète) | ✅ accordé (13/10) |
| Commandes — choix A à E | ✅ décidé (13/10), **tous « avec »** : A. champ « État » à la création, « À commander » choisi par défaut ; B. suggestions de marques tirées du Répertoire (texte libre gardé, aucune marque créée) ; C. SMS pré-rempli au vouvoiement (« Bonjour Léa, votre commande Clarks Desert 39 est arrivée au magasin Bailly Albi. À bientôt ! ») ; D. après Appeler ou SMS sur une commande « Reçue », proposition de passer à « Client prévenu » ; E. bouton « étape suivante » discret sur chaque ligne (petit, sans couleur forte), avec « Annuler » dans le message | ✅ décidé (13/10) |
| Réassorts — organisation | Bouton ←, titre avec emoji, bascule « 🏪 magasin / 🌐 Tous magasins » → en-tête commun et **2 onglets** (« Bailly Albi » / « Tous magasins ») ; sélecteur de saison gardé | ✅ accordé (13/10) |
| Réassorts — liste | Tableau (téléphone : lignes compactes) → **liste** : marque · modèle · N° (pastille de couleur) ; date de dernière action · reste à recevoir / ruptures / dernier reçu ; état à droite (mot de couleur, mêmes teintes ; « · 12 j » en route) ; **trait de couleur à gauche gardé** (étape, retard, rupture, reçu) ; lignes reçues / archivées grisées ; badges à emojis (⚠️ 🙋 🛒 🚚 ✅ 🗄 ○) → mots | ✅ accordé (13/10) |
| Réassorts — filtres et compteurs | Pastilles À réassortir, En cours, En retard, Réassortis, Sans réassort, Archivés avec leur nombre (identiques, sans emoji) ; ligne de résumé « Bailly Albi · 6 top modèles · 1 réassort en cours » ; recherche identique | ✅ accordé (13/10) |
| Réassorts — fiche | Fenêtre de détail gardée et redessinée : réassort en cours (frise des 4 étapes, quantités, « demandé par », note, alerte de retard « relancer la marque ? »), → étape suivante, Commander par mail, Réassort reçu, Modifier le réassort ; stock par pointure avec légende ; Mettre à jour le stock, Lancer un réassort (nombre de paires proposé), Archiver / Relancer le suivi / Désarchiver ; historique et pointures les plus réassorties ; Modifier la fiche, Supprimer (fenêtre de confirmation au lieu de la boîte du navigateur). « Annuler » dans le message après un changement d'étape, un mail, un archivage, une relance, un stock | ✅ accordé (13/10) |
| Réassorts — saisies | Fiche du top (mêmes champs et même pré-remplissage ; catégorie en pastilles ; pointures suivies en touchant la grille), stock rapide, nouveau réassort (quantités proposées, étapes À réassortir / Commandé / En route, « Demandé par » en pastilles), réception (quantités, « ajouter au stock » coché) : **mêmes données** ; l'étape n'est plus dans « Modifier le réassort » (elle se change dans la fiche, point A) | ✅ accordé (13/10) |
| Réassorts — choix A à C | ✅ décidé (13/10), **tous « avec »** : A. étape modifiable à la main dans la fiche, confirmation pour revenir en arrière ; B. à la réception d'un modèle sans prix, avertissement et « Prix unitaire HT (facultatif) » (règle de prix inchangée : prix du modèle, sinon le prix tapé, sinon 0 €, sans repli sur le prix moyen) ; C. un bouton discret par ligne (Reçu / → étape / Réassort), « Annuler » après un changement d'étape | ✅ décidé (13/10) |
| Répertoire — organisation | Pastilles « 🏪 magasin » → pastilles avec icône ; recherche, « + Ajouter » et « 📥 Importer CSV » en haut → recherche, bouton « Nouvelle marque » (bouton flottant sur téléphone), « Importer CSV » (en haut sur ordinateur, en bas de la liste sur téléphone) ; texte d'aide → ligne de résumé | ✅ accordé (13/10) |
| Répertoire — coordonnées | Mêmes champs et même répartition (par magasin : commercial, SAV, n° client, BtoB ; communs : comptabilité, adresse postale, notes, repliés) ; même repli sur l'ancienne valeur commune ; emojis 👤 🛟 🔑 🧮 📍 📝 → titres ; ✉️ et 🔗 → icônes ; **ajout (U8)** : Appeler en un toucher pour chaque téléphone | ✅ accordé (13/10) |
| Répertoire — enregistrement | **Différence validée (13/10)** : seules les valeurs changées sont écrites (avant : quitter un champ recopiait la valeur commune dans le magasin) ; « Annuler » dans le message après un enregistrement | ✅ accordé (13/10) |
| Répertoire — choix A à C | ✅ décidé (13/10), **tous « avec »** : A. liste compacte (nom, commercial et son téléphone, mail SAV, Appeler / Mail) qui ouvre une fiche complète ; B. nouvelle marque avec le garde-fou anti-doublon du Cahier ; C. « Modifier » puis « Enregistrer » dans la fiche (évite les modifications involontaires de coordonnées partagées) | ✅ décidé (13/10) |
| Répertoire — « Mail commandes » | **Ajout (13/10, votre accord)** : champ « Mail commandes » sous Commercial, **propre à chaque magasin** (rangé dans les coordonnées par magasin existantes : aucune colonne ajoutée) ; utilisé par le **mail de réassort** : mail commandes du magasin, sinon mail SAV du magasin, sinon adresse commune ; mails SAV et défectueux inchangés ; colonne « Mail commandes » dans l'import CSV ; adresses enregistrées sans espaces en trop. Refonte seulement (rien dans l'outil en ligne) | ✅ décidé (13/10) |
| Planning — en-tête | Bouton ←, menu déroulant du magasin, « 🖨 Imprimer » → en-tête commun avec **« Imprimer »** ; magasins en **pastilles** (choisir un magasin change le magasin de l'appareil, comme aujourd'hui) ; semaine ‹ › et « Aujourd'hui » identiques | ✅ accordé |
| Planning — grille | Mêmes lignes (salariés du magasin sans les gérants, remplaçants en dessous, couleur par personne) et mêmes colonnes Lundi → Dimanche ; colonne des noms **fixe** quand la grille défile de côté ; jour du jour surligné ; note sous l'horaire | ✅ accordé |
| Planning — saisie d'un créneau | Identique : 9h30 → 17h30 proposés, note, « Repos » (efface), « Copier », « Coller », OK ; → passe au champ suivant, Entrée valide, Échap ferme. Sur **téléphone** : la saisie s'ouvre en bas de l'écran. Emoji 📋 des boutons retiré (« Copier », « Coller ») | ✅ accordé |
| Planning — copier | « 📋 » au survol d'une case : **gardé sur ordinateur** (« Copier ») ; sur tablette et téléphone, « Copier » dans la saisie (l'audit notait qu'il était invisible au doigt). **Ajout** : croix pour oublier l'horaire copié | ✅ accordé |
| Planning — annuler | Texte « Ctrl+Z (3) » → **bouton visible « Annuler la dernière modification (3) »** (utilisable au doigt) ; Ctrl+Z gardé. **Correctif** : l'annulation vise la semaine et le magasin où la modification a été faite (avant : après un changement de semaine, Ctrl+Z pouvait modifier la case de la semaine affichée) ; Ctrl+Z dans un champ de texte n'annule plus le planning | ✅ accordé |
| Planning — remplaçants | Identique (« Ajouter un remplaçant », mention « remplaçant ») ; la croix ne s'affiche que pour une ligne ajoutée à la main et encore vide (avant : elle s'affichait aussi quand elle ne pouvait rien retirer) | ✅ accordé |
| Planning — impression | Même page imprimée (titre « Planning [magasin] », une table par semaine, couleurs). Choix du nombre de semaines : point **C** | ✅ accordé |
| Planning — choix A à E | ✅ décidé : **A avec** (« Reprendre la semaine précédente », cases vides seulement, confirmation, « Annuler ») ; **B sans** (pas de total d'heures : sans la pause il serait faux — voir « Idées pour plus tard ») ; **C avec** (impression : choix 1, 2 ou 3 semaines à partir de la semaine affichée, remplace « attendre la semaine suivante » ; les semaines « en attente » gardées sur un appareil ne servent plus) ; **D sans** (pas de lignes vides) ; **E avec** (téléphone : jour par jour) | ✅ accordé |
| Paie — liste | Ronds ✓ / ○ → **mot de couleur** « Rempli » (vert, coche) / « À remplir » (bleu) ; **ajout** : le magasin de la salariée sous son prénom ; mois ◀ ▶ → ‹ › ; progression « X / N ont rempli » **avec une jauge** ; messages identiques | ✅ accordé |
| Paie — saisie et vérification | Mêmes rubriques, mêmes champs, mêmes textes (« Document confidentiel… », « Vérifie ta saisie… », « ← Corriger », « ✓ Confirmer et enregistrer ») ; le mois sous le prénom ; « Merci de choisir ta société » et « Merci de décrire la modification » en message dans l'écran (avant : fenêtre d'alerte) ; poubelle et « + Ajouter » en icônes de la charte | ✅ accordé |
| Paie — récap (Direction) | Mêmes boutons et même texte ; emojis 📧 ✉️ 📋 ✏️ des boutons retirés (« Envoyer (auto) », « Ouvrir dans Gmail », « Copier », prénoms avec un crayon) ; **ajout** : « Destinataire : marion.fouquereau@lecussan.fr » sous les boutons | ✅ accordé |
| Paie — demande de modification | Même écran « 🔒 Document déjà validé » et mêmes textes ; emoji 📨 du bouton retiré (« Envoyer la demande ») | ✅ accordé |
| Paie — choix P1 à P3 | ✅ décidé, **tous « avec »** : P1. société pré-remplie d'après le magasin de la salariée, toujours modifiable ; P2. avertissement (sans blocage) si une ligne n'est pas dans le mois ; P3. total d'heures par rubrique sur « Vérifie ta saisie » | ✅ accordé |
| Plan de règlement — calcul | **Aucun changement** : le calcul de l'outil actuel est déplacé tel quel dans `src/reglement/calcul.js` (mêmes échéances, montants, dates, clés de pointage) ; comparaison ligne par ligne sur la base de test : identique | ✅ accordé |
| Plan de règlement — présentation | Cartes de chiffres (Total à régler, Reste à payer, Mois d'échéances, Échéances planifiées, En attente 1ère réception) **gardées** ; 4 filtres et légende des modes **gardés** (mêmes couleurs) ; mois par mois, sous-totaux par société, lignes regroupées par fournisseur et date (dépliables, « tout cocher ») **gardés** ; emojis 📅 ⚠️ 🗓 🏢 ⏳ retirés ; « PASSÉ » / « EN COURS » → « Passé » / « En cours » ; fenêtre « Avoirs à reporter » identique (textes, boutons) ; message d'erreur dans l'écran (avant : fenêtre d'alerte) ; **téléphone** : chaque échéance sur deux lignes au lieu du tableau | ✅ accordé |
| Plan de règlement — choix R1 à R3 | ✅ décidé, **tous « avec »** : R1. bloc « En retard, non payé » en haut (échéances non pointées dont la date est passée) ; R2. ouverture sur le mois en cours ; R3. mois passés entièrement payés repliés (un toucher les déplie) | ✅ accordé |
| Plan de règlement — ajustements (12/10) | Avoir coché : **« déduit »** au lieu de « payé » (case, groupe d'avoirs) — calcul inchangé ; plan chèque personnalisé : seuls les chèques **datés** sont numérotés (« Chèque 1/2 ») — montants, dates et pointages inchangés ; **ajout** du bloc « En attente de 1ère réception » (marques en chèques dont rien n'est reçu : montant commandé, sans date, hors des totaux) | ✅ accordé |
| Achats — présentation | Mêmes chiffres, filtres, pastilles stratégie et catégorie, répartition, tableau et totaux (comparaison ligne par ligne : identique) ; emojis des boutons retirés : 👻 → « Masquer les montants » / « Afficher les montants » (même effet), 🔍 du champ de recherche, 📂 « Importer CSV », ✏️ → crayon, 📋 et ⏳ du report de la saison précédente. Les emojis des **stratégies** (🆕 🚀 🛡️ 📉 🛑) sont gardés : ils font partie des valeurs enregistrées | ✅ accordé |
| Achats — choix A1 | ✅ « avec » : mode de règlement **en lecture seule** dans la fiche d'achat (mode de la marque pilote, nombre de chèques ou délais), lien « Modifier dans Réglages → Modes de règlement » ; la fiche d'achat n'écrit plus le mode ; marque non pilote : « Réglé avec le groupe « … » (marque pilote : …) » | ✅ accordé |
| Réglages — onglets | Emojis retirés (Magasins, Salariés, Marques, Modes de règlement, Saisons, Appareils connectés) ; contenu identique ; suppression d'une saison : **nom à retaper** (gardé) | ✅ accordé |
| Réglages — choix A2 | ✅ « avec » : **« Réglages »** (menu et titre) ; plan chèque : avertissement avant l'enregistrement si une ligne n'a pas de date ou de montant (« ce chèque n'apparaîtra pas dans le Plan de règlement », « Corriger » / « Enregistrer sans ce chèque ») ; marque non pilote : « réglé avec le groupe « … » » ; Répertoire (comptes Direction) : même mention dans la fiche de la marque | ✅ accordé |
| Connexion — écran | Même formulaire (adresse du magasin, mot de passe, « Se connecter »), même texte ; logo « S » de la charte ; message d'erreur dans un encadré rouge | ✅ accordé |
| Connexion — message d'erreur | Inchangé pour un mauvais mot de passe : « Adresse ou mot de passe incorrect. » — **le même pour une adresse inconnue**. **Correctif** : toute autre réponse « refusée » de Supabase (ex. adresse non confirmée) donnait « Connexion impossible pour le moment… », ce qui laissait deviner que l'adresse existe ; elle donne maintenant le même message. **Ajout** : « Trop d'essais. Attends quelques minutes puis réessaie. » quand Supabase bloque les essais répétés | ✅ accordé |
| Connexion — choix C1, C2 | ✅ « avec » : bouton « Afficher / Masquer » le mot de passe ; « Mot de passe oublié ? Demande-le à la direction. » sous le bouton | ✅ accordé |
| Choix du magasin | Même écran « Dans quel magasin es-tu ? », mêmes magasins, même effet (le choix vaut pour tout l'outil sur l'appareil) ; cartes → boutons pleine largeur sur téléphone ; **bouton ← en haut à gauche retiré** (règle du socle : le menu reste visible) | ✅ accordé |
| Choix du magasin — choix S1 | ✅ « avec » : couleurs de la charte et icône au trait de l'outil (fin des couleurs et emojis propres à chaque outil sur cet écran) | ✅ accordé |
| Déconnexion | Fenêtre du navigateur → fenêtre de confirmation de la charte, **même texte** ; ⚠️ **changé avec votre accord écrit (12/10)** : « Se déconnecter » ne déconnecte plus que **l'appareil** (avant : tous les appareils du compte) ; la déconnexion de tous les appareils reste à la Direction (Réglages → Appareils connectés). Aussi dans la branche de l'étape 2 | ✅ accordé |
| Agenda — page | Mêmes 4 vues (Jour, Semaine, Mois, Année), même vue d'ouverture (Mois), même navigation (‹ › et « Aujourd'hui »), même légende des couleurs (Albi bleu, Rouffiac vert, 2 Zèbres orange) ; titre « 📅 Agenda » en double retiré (le titre de la page suffit) ; boutons ← → → chevrons ; téléphone : Mois en pastilles, Semaine empilée (comme avant) | ✅ accordé |
| Agenda — événements | Même affichage (heure, titre, trait de couleur) ; emoji 📝 d'une note → « · note » ; « Journée » pour un événement des calendriers sans heure (avant : « — ») | ✅ accordé |
| Agenda — saisie | Mêmes champs (titre, date, heure, note), mêmes contrôles ; fenêtre de la charte ; **correctif** : date proposée = aujourd'hui en **heure française** (avant : heure anglaise, la veille entre minuit et 2 h) ; **ajout** « Visible par les 3 magasins. » ; « Supprimer ? Oui / Non » dans la fenêtre → fenêtre de confirmation (« Supprimer cet événement ? ») ; emojis 🗑 ⏳ retirés | ✅ accordé |
| Agenda — détail d'un événement des calendriers | Même fiche en lecture seule (calendrier du magasin, heure ou « Journée entière », lieu, note, « Événement Google — lecture seule ») ; emojis 🕐 📆 📍 → icône au trait ; **ajout** « Du … au … » pour un événement sur plusieurs jours | ✅ accordé |
| Agenda — message « Google non configuré » | ⚠️ « Google non configuré » → « Calendriers des magasins non configurés » (sans emoji) | ✅ accordé |
| Agenda — choix G1 à G4 | ✅ décidé, **tous « avec »** : G1. événements de l'outil en **violet** (comme « À venir ») ; G2. semaine du **lundi au dimanche** ; G3. événement des calendriers sur plusieurs jours affiché **chaque jour**, avec « jusqu'au … » ; G4. bouton **« Nouvel événement »** toujours visible en haut | ✅ accordé |
| Factures — saisie | Mêmes champs (boutique, n°, date, client, adresse, email, désignation, montant TTC) et même ligne HT / TVA / TTC ; boutiques en liste (icône au trait au lieu de 🏪) ; emojis des boutons retirés (🖨 Imprimer, 📄 Télécharger le PDF, ✉️ Envoyer par mail, 🆕 Nouvelle facture, ⏳) | ✅ accordé |
| Factures — aperçu, impression, PDF, mail | **Identiques** (même facture, mêmes mentions légales, mêmes couleurs fixes, même brouillon Gmail depuis l'adresse de la société) ; sur ordinateur, même mise en page qu'avant | ✅ accordé |
| Factures — téléphone | **Ajout** : utilisable sur téléphone (avant : formulaire et aperçu côte à côte, débordant) ; l'aperçu est réduit à la largeur de l'écran ; l'impression et le PDF partent d'une facture **pleine taille** (largeur fixe) | ✅ accordé |
| Factures — choix F1, F2 | ✅ « avec » : sur téléphone, onglets « Saisie » / « Aperçu » ; mention « Numéro suivant d'après cet appareil » sous le n° | ✅ accordé |
| Finitions — couleurs des anciens écrans | Fenêtres d'import CSV, fiches d'achat, onglets de Réglages, confirmations « nom à retaper » : **même contenu et même fonctionnement**, couleurs de la charte (fond, cartes, bleu d'action, traits) au lieu de l'ancienne palette — en mode clair, le bleu devient celui du reste de l'outil ; **en mode sombre, fin du bleu nuit** de ces écrans | ✅ accordé (12/10) |
| Finitions — fenêtres, boutons, champs, tableaux | Fenêtres aux coins arrondis de la charte (fond assombri, sans flou), bouton de fermeture rond ; boutons arrondis (pleins pour l'action principale) ; champs gris clair de 44 px de haut, contour bleu au toucher ; titres de colonnes et libellés des champs en minuscules (avant : MAJUSCULES espacées) ; message d'erreur en encadré rouge | ✅ accordé (12/10) |
| Finitions — emojis | Retirés des titres, boutons et messages : 📂 / 📥 (titres des imports), ✅ « Import terminé », ⚠️ (avertissements, titre des confirmations « nom à retaper »), ⏳ (« Import… », « Enregistrement… », « Fusion… »), 💾 Enregistrer, 🛒 (titres des fiches d'achat), 🗑️ → icône corbeille, ✏️ Renommer, 🏪 Magasins / Quantités du magasin, 👤 Salariés, 🛠 Maintenance, 🔀 Fusionner, 🗓 Plan chèque / Dates perso, 🏢 pilote ; grand ✅ de réussite → coche dans un rond ; « ❌ » d'un magasin non reconnu à l'import → « (inconnu) ». **Gardés** : les emojis des stratégies (🆕 🚀 🛡️ 📉 🛑) et des statuts d'achat (✅ ⏳ ❌), qui sont des valeurs enregistrées | ✅ accordé (12/10) |
| Finitions — mode sombre, couleurs de code | Stratégies, modes de règlement (menus colorés de Réglages, pastilles du Plan), avoirs : **mêmes couleurs**, en teinte transparente sur fond sombre et texte clair (avant : pastilles claires éblouissantes, texte foncé peu lisible) ; mode clair inchangé. Ligne « Total » des Achats : fond de la charte | ✅ accordé (12/10) |
| Agenda — notes de 2 rendez-vous passés (calendrier de Bailly Albi) | Les notes des rendez-vous du **29/07/2025 à 14 h** et du **29/12/2025 à 14 h 30** contiennent un lien : elles ne sont plus affichées (décision B : une note avec un lien n'est ni envoyée ni affichée) ; le rendez-vous lui-même reste affiché | ✅ accordé (13/10) |

## 2 ter. Codes couleur de l'outil actuel (conservés)

| Code couleur | Règle | Où |
|---|---|---|
| **N° de référence du modèle** | Juste **après le nom du modèle**, même ligne. Même logique que l'outil actuel : nombre du N°, (N° − 1) modulo 3 → **1 rouge, 2 bleu, 3 vert**, 4 rouge… ; pas de nombre = pas de couleur. Teintes de la charte, lisibles en clair et en sombre | **Partout** où un N° apparaît : saisie, liste et détail des entrées, suivi des livraisons, écrans à venir |
| Jauges de livraison et % | 0 % gris · < 50 % orange · ≥ 50 % bleu · 100 % vert | Suivi des livraisons |
| Rien reçu | Ligne de marque / modèle atténuée | Suivi des livraisons |
| Détail par pointure | Vert complet · bleu partiel · gris rien reçu | Suivi des livraisons |
| Entrée pointée | Ligne grisée (comptes Direction) | Liste des entrées |
| Pointure saisie | Case verte (orange pour un retour) | Saisie d'une entrée |
| Couleur par saison | Pastille du sélecteur de saison | En-tête des pages liées à la saison |
| Couleurs des compteurs | **Trait de couleur** à gauche de chaque compteur (chiffre en noir) — une couleur par type | Accueil |
| Pastilles de comptage du menu | Une couleur par type (réassorts, défectueux, commandes) | Menu |
| Couleurs d'agenda | Une couleur par magasin — **barre de couleur** (décision du 11/10) | Agenda, bloc « À venir » |

**Statuts des entrées** (décisions du 11/10) :
- **Ordre des étapes, partout** (saisie, filtres, détail) : **Aucun → Enregistré → Imp. étiquettes** (dernière étape), puis Réassort et Retour. L'outil en ligne affichait « Imp. Etiquettes » **avant** « Enregistré » : corrigé dans la refonte et dans l'étape 2.
- **Couleurs selon la progression** : Enregistré **orange** (en cours), Imp. étiquettes **vert** (terminé), Réassort **bleu**, Retour **rouge** (l'outil actuel n'avait pas de couleur de statut).
- **Forme** : statut = **point plein suivi du mot** ; N° = **pastille pleine commençant par « N° »** — on ne les confond pas (point creux écarté).
- **Données inchangées** : la valeur enregistrée reste « Imp. Etiquettes » (sans accent) ; seuls l'affichage et l'ordre changent, aucune donnée existante n'est modifiée.

---

## 3. Deux directions pour l'ordinateur — ✅ **B choisie** (11/10)

> **Décision du 11/10 : direction B** (liste pleine largeur, détail et saisie dans une fenêtre au centre).
> Comme la liste n'est plus visible pendant la saisie, la fenêtre de saisie contient de quoi **éviter les doublons** quand on enchaîne les cartons :
> - un rappel **« Déjà enregistré aujourd'hui »** : les 3 dernières entrées du jour du magasin (heure, marque, modèle, N° coloré, paires) ;
> - si l'entrée en cours a la **même marque, le même modèle et le même N°** qu'une entrée du jour : simple information (« Déjà reçu aujourd'hui… autre carton ? ») ;
> - si en plus **les pointures et quantités sont identiques** : avertissement rouge juste au-dessus du bouton, qui devient « Enregistrer quand même… » et demande **un 2ᵉ toucher** pour confirmer.

Au téléphone, les deux directions sont identiques. Elles diffèrent sur ordinateur (et tablette en paysage) :

| | **A · Liste + panneau** (comme Mail) | **B · Liste + fenêtre** |
|---|---|---|
| Détail d'une entrée, saisie | dans un **panneau à droite**, la liste reste visible | dans une **fenêtre au centre**, la liste est masquée derrière |
| Avantages | on voit la liste se mettre à jour en saisissant ; idéal pour corriger plusieurs lignes à la suite (et pour la Direction, pointer en série) | plus simple, plus « une chose à la fois » |
| Inconvénients | demande un écran assez large (sinon bascule en fenêtre) | on perd la liste de vue pendant la saisie |

**Ma recommandation : A**, parce que les équipes saisissent carton par carton et pointent en série : voir la liste se remplir au fur et à mesure rassure et évite les doublons. Sur un écran étroit, A se comporte automatiquement comme B.

---

## 4. Charte (résumé — détail dans `maquettes/charte.html`)

- **Couleurs** : fond gris très clair, surfaces blanches, texte noir doux, **un seul bleu d'action** ; vert = fait, orange = à faire, rouge = problème/retour, **même sens partout**. Mode sombre complet.
- **Typographie** : police système de l'appareil, 3 tailles (13 / 15 / 17) + titre de page (26).
- **Sobriété (11/10)** : la couleur est **réservée aux repères** (N°, statuts, jauges, magasins, types de compteur) **et à l'urgence** (retard, doublon, erreur) ; chiffres, icônes et titres en noir ou gris ; un seul bleu pour l'action principale ; repères sous forme de **traits** (compteurs, agenda) ou de **pastilles** (N°), jamais en grands aplats. Appliquée à **tous les écrans**.
- **Point de couleur réservé au statut des entrées** (11/10) : il n'est utilisé nulle part ailleurs comme repère.
- **Position du N°** (11/10) : toujours **juste après le nom du modèle, sur la même ligne**, comme dans l'outil actuel — liste et détail des entrées, saisie, suivi des livraisons, « Déjà enregistré aujourd'hui ».
- **N° de référence du modèle** : couleur qui tourne sur 3 teintes (1 rouge, 2 bleu, 3 vert…), logique identique à l'outil actuel, partout (voir §2 ter).
- **Boutons** : arrondis, 44 px minimum ; bleu = action principale (une par écran), gris = secondaire, lien = discret, rouge pâle = destructif.
- **Listes au lieu des tableaux** : titre en gras, détail en gris dessous, état à droite (point + mot).
- **Formulaires** : étiquette au-dessus, erreur expliquée dessous, champs connus pré-remplis.
- **Ton (13/10)** : l'outil **tutoie** les équipes, partout et de la même façon (« Touche une pointure », « Choisis ton magasin », « Vérifie la connexion et réessaie », « Tu voulais dire… ? »). Phrases courtes, sans jargon. **Exception** : les mails envoyés hors de l'équipe (marques, SAV des fournisseurs, comptable) restent au vouvoiement.
- **Messages** : confirmation avec « Annuler » (en bas sur ordinateur, en haut sur téléphone), encarts colorés pour les avertissements, jamais de chargement infini.
- **Très peu d'animations** ; icônes au trait avec texte.

---

## Règles métier — Réassorts (vérifiées dans le code de l'outil en ligne, 13/10)

| Règle | Outil actuel | Refonte |
|---|---|---|
| Étapes | À réassortir → Demandé → Commandé → En route → Reçu | **Identiques** (« Demandé » gardé) : À réassortir = la commande est à passer, rien n'est envoyé ; Demandé = demande envoyée, on attend la réponse ; Commandé = la marque a confirmé |
| Mail à la marque | Fait passer « À réassortir » ou « Demandé » à **« Commandé »** | ⚠️ **Changé avec votre accord écrit (13/10)** : fait passer « À réassortir » à **« Demandé »** ; « Commandé » avec « étape suivante » quand la marque confirme ; sur un « Demandé », « Renvoyer le mail » (l'étape et sa date ne changent pas) |
| Compteur « Réassorts à commander » (accueil, pastille du menu) | « À réassortir » + « Demandé » | ⚠️ **Changé (13/10)** : « À réassortir » seulement |
| « Demandé » en cours | Compte comme en cours (pas d'alerte de rupture, quantités déjà en commande) | Identique |
| Retard | « En route » depuis 10 jours (orange) / 15 jours (rouge) | ⚠️ **Ajout (13/10)** : aussi « Demandé » depuis **7 jours** (orange), dans le filtre « En retard », le bloc « En retard » de l'accueil (« demandé il y a X jours — relancer la marque ») et la pastille du menu ; « Réassorts en route · dont X en retard » ne compte que les « En route » |
| Couleurs | À réassortir rouge, Demandé ambre, Commandé bleu, En route violet, Reçu vert | Identiques (mot de couleur et trait à gauche) |
| Relance d'un « Demandé » | — | **Ajout (13/10)** : « Renvoyer le mail » note la date de la dernière relance (« relancé le … » dans la fiche) ; l'étape et la date de la demande ne changent pas (le retard se compte depuis la première demande). Rangée dans l'historique des dates existant (`etapes.Relance`) : **aucune colonne ajoutée** |
| Étape suivante, étape à la main, réception, prix, stock, archivage, suppression | voir le tableau validé du 13/10 | Identiques (étape à la main avec confirmation pour revenir en arrière ; prix facultatif à la réception) |
| Mails SAV / défectueux / réassorts | Réassorts : adresse et n° client du magasin, sinon de la marque (refonte : d'abord le « mail commandes » du magasin). SAV et défectueux : **seulement ceux de la marque** (défaut) | **Corrigé (13/10, aussi dans l'outil en ligne)** : tous prennent l'adresse et le n° client du magasin, sinon ceux de la marque, sans espaces en trop ; « Enregistrer dans le répertoire » enregistre pour le magasin du dossier |

## Règles métier — Planning et Éléments de paie (vérifiées dans le code de l'outil en ligne)

**Planning** — même code dans l'outil en ligne, l'étape 2 et la refonte avant ce chantier.

| Règle | Outil actuel | Refonte |
|---|---|---|
| Qui voit et modifie | Tout le monde, tous les magasins | Identique : tous les comptes connectés (décision du 11/10, « Planning modifiable par tous ») |
| Lignes | Salariés dont le magasin est celui choisi (ou sans magasin), **gérants exclus** (Jérémie, Raphaël) ; remplaçants = noms des créneaux qui ne sont pas des salariés + ceux ajoutés à la main (ces derniers ne restent qu'à l'écran tant qu'aucun horaire n'est saisi) ; 4 lignes vides au minimum | Identique, **sans les lignes vides** (décision D) ; « Ajouter un remplaçant » en bas |
| Un créneau | Une case = un salarié × un jour × une semaine (lundi) × un magasin ; début, fin, note ; la fin doit être après le début ; « Repos » efface la case | Identique (message « L'heure de fin doit être après l'heure de début » ajouté) |
| Horaires proposés | 9h30 → 17h30 | Identique |
| Annuler | 20 dernières modifications, Ctrl+Z | Identique + bouton visible « Annuler la dernière modification » ; **correctif** : vise la bonne semaine |
| Impression | « Attendre la semaine suivante ? » : jusqu'à 3 semaines sur une page, semaines en attente gardées sur l'appareil ; n'imprime que les salariés qui ont au moins un horaire ; gérants exclus | ⚠️ **Changé (décision C)** : choix 1, 2 ou 3 semaines à partir de la semaine affichée ; page imprimée identique |
| Calculs | Aucun (pas de total d'heures) | Identique : aucun (décision B : un total sans la pause serait faux) |
| Reprendre la semaine précédente | — | **Ajout (décision A)** : recopie les horaires de la semaine d'avant **dans les cases vides seulement**, jamais ceux des gérants, après confirmation ; « Annuler » pendant 8 secondes |
| Base de données | — | **Aucune modification** (mêmes colonnes, mêmes lignes) |

**Éléments de paie** — l'outil en ligne et l'étape 2 diffèrent ; la refonte reprend **l'étape 2 sans rien affaiblir**.

| Règle | Outil en ligne (`main`) | Étape 2 (validée le 11/10, pas encore en ligne) | Refonte |
|---|---|---|---|
| Qui remplit | Tout appareil, sans connexion | Tout compte connecté | Identique à l'étape 2 |
| Relire une fiche remplie | Possible (la base n'était pas protégée) | **Impossible pour un compte magasin** (la base ne renvoie que les prénoms déjà remplis) ; fiche remplie → « Document déjà validé » + demande de modification | Identique à l'étape 2 (vérifié : la base renvoie 0 fiche et 0 envoi au compte magasin ; 2ᵉ dépôt et modification refusés) |
| Corriger une fiche | Récap protégé par le code 2201 | **Comptes Direction seulement** (« Corriger une saisie » dans le récap) | Identique à l'étape 2 |
| Avant l'enregistrement | Enregistrement direct | Écran **« Vérifie ta saisie »** (← Corriger / ✓ Confirmer et enregistrer) | Identique + avertissement si une ligne n'est pas dans le mois (P2) + total d'heures par rubrique (P3) |
| Liste des salariées | Toutes les salariées (tous magasins), gérants exclus | Identique | Identique |
| Société | À choisir à chaque fois | Identique | **Pré-remplie** d'après le magasin de la salariée, toujours modifiable (décision P1) |

**Ce que la paie envoie** (rien d'autre ne part) :

| Mail | Quand | Destinataire | Objet | Contenu |
|---|---|---|---|---|
| Récap mensuel | Outil en ligne : **automatiquement** quand la dernière salariée enregistre. Étape 2 et refonte : **d'un clic** par un compte Direction (« Récap à envoyer → » puis « Envoyer (auto) ») ; repli « Ouvrir dans Gmail » ou « Copier » | marion.fouquereau@lecussan.fr | « Éléments variables de paie — [Mois Année] » | « Bonjour Marion, … » puis, par société (B'Shoes, JR Shoes), chaque salariée avec ses rubriques ; signature Jérémie Seigné. L'envoi est noté (`paie_envois`) : « Récap déjà envoyé pour ce mois » |
| Saisies complètes | Étape 2 et refonte : quand la dernière salariée enregistre depuis un compte magasin | jeremie.seigne@gmail.com | « Paie — saisies complètes — [Mois Année] » | Aucune donnée de paie : seulement « toutes les salariées ont rempli… » et comment envoyer le récap |
| Demande de modification | Quand une salariée la dépose depuis une fiche déjà remplie (repli : brouillon Gmail) | jeremie.seigne@gmail.com | « Demande de modification paie — [Prénom] — [Mois Année] » | Prénom, mois, texte de la demande |

Le serveur n'accepte que ces 3 destinataires / objets, depuis un appareil connecté, avec un plafond (3 récaps / 24 h, 10 demandes / 24 h) ; en local, aucun mail ne part (les essais les interceptent).

**Ce que la paie calcule** : le mois en cours (« AAAA-MM ») et ◀ ▶ ; « X / N ont rempli » (gérants exclus) ; « tout le monde a rempli » ; dans le récap, le **total d'heures par rubrique** (heures supplémentaires, dimanche, jours fériés) = somme des heures saisies (« 3,5 » compte 3,5). Rien n'est calculé sur les congés et arrêts (dates du / au recopiées telles quelles).

**Rappel « À remplir avant le 25 »** : dans le menu, à côté de « Éléments de paie », du **15 au 25** de chaque mois, pour tous les comptes, que les fiches soient remplies ou non. Identique dans la refonte (déjà en place dans le menu).

**Correctif (refonte et étape 2)** : après le dépôt d'une fiche par un compte magasin, la liste restait sur « À remplir » jusqu'au rechargement (la base, volontairement, ne prévient pas un compte magasin des changements de fiches) — un 2ᵉ toucher rouvrait la saisie puis échouait. La liste est maintenant relue après chaque enregistrement. Corrigé aussi dans la branche `securite-etape2` (essais refaits sur la base de test).

## Règles métier — Direction : Achats, Plan de règlement, Réglages (vérifiées dans le code de l'outil en ligne)

Achats et Plan de règlement : même code dans l'outil en ligne, l'étape 2 et la refonte avant ce chantier. Paramètres : l'étape 2 ajoute « Appareils connectés », la refonte « Saisons » (décision du 12/10).

| Règle | Outil actuel | Refonte |
|---|---|---|
| Accès | Achats, Plan, Réglages (« Paramètres ») : comptes Direction seulement (menu et accès direct) | Identique (vérifié : menu, menu « Plus » du téléphone, liens directs → accueil) |
| Plan — chèques | Mode CHEQUE de la marque pilote : Σ réel achat du groupe ÷ nombre de chèques (défaut 4), fins de mois successives à partir de la 1ère réception (hors retours) ; ou plan chèque personnalisé de la saison | Identique (calcul déplacé tel quel) |
| Plan — autres modes | Par livraison : PHT réparti à parts égales sur les délais (jours après la livraison) ; délais par défaut selon le mode | Identique |
| Plan — avoirs | Retour avec défectueux « Avoir reçu » ou « Clôturé » : une ligne AVOIR à la date du retour | Identique |
| Plan — fournisseur réel | Marques d'un même groupe : réglées selon la marque pilote (plus petit n°), lignes au nom du groupe | Identique |
| Plan — pointage | Une clé par échéance (`cheque|…`, `liv|…`, `avoir|…`) | Identique (vérifié : une échéance cochée dans la refonte est cochée dans l'outil actuel, et inversement) |
| Plan — report des avoirs | Saison terminée (Été : 30/08, Hiver : fin février) + avoirs non pointés → « Reporter sur [saison suivante] » | Identique |
| Achats | Réel, quantité, PM = somme des univers ; totaux, filtres, mode discret, report des marques de la saison précédente, import CSV | Identique |
| Fiche d'achat — mode de règlement | Modifiable ; enregistre le mode de la marque × magasin **sans remettre les délais à zéro**, et sans tenir compte du fournisseur réel (défaut relevé à l'audit) | ⚠️ **Changé (A1)** : lecture seule, réglé dans Réglages → Modes de règlement |
| Saisons | Suppression : nom à retaper, Direction seulement | Identique |

**Comparaison des calculs (base de test, 12/10)** : outil actuel et refonte ouverts côte à côte, mêmes données, avec des marques d'essai couvrant chèques automatiques (3 chèques), plan chèque personnalisé, groupe de deux marques, LCR sans délais saisis, VIREMENT 30 / 60 jours, avoirs « Avoir reçu », « Clôturé » et « Mail envoyé », une échéance pointée, des échéances en retard. Résultat : chiffres du haut, mois, totaux de mois, sous-totaux par société et chaque ligne (date, magasin, fournisseur, mode, détail, source, montant, case cochée) **identiques** pour 14 filtres (aucun, chaque société, chaque magasin, chaque mode, deux marques, société + mode), avant et après pointage, et avec les points R1 à R3 : 56 comparaisons, 1 468 lignes. Le bloc « En retard » (R1) reprend exactement les 28 échéances non payées échues. Achats : 8 filtres, 139 lignes identiques.

**Comportements de l'outil actuel relevés pendant la comparaison — décisions du 12/10** :
1. Pointer un avoir augmente « Reste à payer » (l'avoir est négatif) : **calcul gardé** ; le mot « payé » devient **« déduit »** pour un avoir.
2. Plan chèque personnalisé, ligne sans date : **calcul gardé** (la ligne est ignorée) ; **avertissement** à l'enregistrement ; **numérotation des seuls chèques datés**. En production (12/10, lecture seule) : 8 plans personnalisés, **aucune ligne sans date ni sans montant**.
3. « En attente de 1ère réception » ne s'affichait jamais : **réparé** — bloc à part listant les marques en chèques dont rien n'est reçu, avec le montant commandé, sans date et **hors des totaux** (chiffres du haut et totaux de mois inchangés). En production (12/10, lecture seule) : **21 lignes marque × magasin** — Été 2026 : 3 (Sebago Albi, Shoopom Albi et Rouffiac), **31 155 €** ; Été 2027 : 18 (Aliwell, Menport, Miss Elastic, Palladium, Rautureau Apple Shoes, Reqins, Sebago, Shoopom, Sms), **79 793 €**.
4. Mode d'une marque non pilote ignoré dans un groupe : **règle voulue** ; mention « réglé avec le groupe … » dans sa fiche (fiche d'achat, Réglages → Modes, Répertoire pour la Direction).

**Comparaison refaite après ces ajustements (12/10)** : 56 comparaisons, 1 468 lignes — montants, dates, totaux, sous-totaux et cases cochées **identiques** ; seules différences, celles demandées : « déduit » sur les avoirs cochés, « Chèque 1/2 » au lieu de « 1/3 » quand une ligne du plan est sans date, et le nouveau bloc « En attente ». Une échéance cochée d'un côté est cochée de l'autre.

## Règles métier — Connexion et choix du magasin (vérifiées dans le code de l'outil en ligne)

| Règle | Outil en ligne / étape 2 | Refonte |
|---|---|---|
| Connexion | Adresse + mot de passe (Supabase, `signInWithPassword`) ; tant que l'appareil n'est pas connecté, seul l'écran de connexion s'affiche | **Inchangé** (fonction `Connexion`, `src/lib/supabase.js`, `CompteContext` non modifiés) |
| Durée de session | Réglages par défaut de Supabase : session mémorisée sur l'appareil, renouvelée automatiquement (jeton d'accès d'une heure) | **Inchangé** |
| Compte Direction | Rôle `direction` porté par le compte (la base vérifie les droits, l'écran s'adapte) | **Inchangé** |
| Déconnexion | `supabase.auth.signOut()` : réglage par défaut de Supabase = **tous les appareils connectés avec ce compte** sont déconnectés (vérifié sur la base de test : le 2ᵉ appareil ne peut plus renouveler sa session), bien que le texte dise « de cet appareil » | ⚠️ **Changé (accord écrit du 12/10, refonte et étape 2)** : `signOut({ scope: 'local' })`, l'appareil seulement ; Direction : Réglages → Appareils connectés pour tous les appareils |
| Choix du magasin | Mémorisé sur l'appareil (`magasin_courant`), demandé par le Cahier, les Réassorts, le SAV & défectueux et les Commandes quand il n'est pas choisi ; changeable dans le menu | **Inchangé** |

**Ce qui est touché dans le code** : `src/components/Connexion.jsx` — seulement l'écran (`EcranConnexion` : présentation, bouton « Afficher », phrase « Mot de passe oublié ? », traduction du message d'erreur) ; la fonction qui vérifie la session (`Connexion`) n'est pas modifiée. `src/components/StoreSelect.jsx` (présentation). `src/shell/Coque.jsx` : la fenêtre de confirmation de « Se déconnecter » (même appel `supabase.auth.signOut()`).

**Essais (base de test, 12/10)** : 31/31 — visiteur sans connexion (écran de connexion seul ; 0 ligne lisible dans 6 tables ; écriture et mail refusés) ; mauvais mot de passe et adresse inconnue (Supabase répond pareil, 400 `invalid_credentials` ; même message affiché ; toujours pas connecté) ; compte magasin (connexion, session gardée après rechargement, paie illisible, salariés non modifiables, pas d'écrans Direction, choix du magasin, déconnexion avec « Annuler » et « Se déconnecter ») ; compte Direction (connexion, écrans Direction).

**Déconnexion — décision du 12/10 (accord écrit)** : « Se déconnecter » ne coupe plus que l'appareil. Essai à deux appareils (navigateurs séparés, même compte), refonte et étape 2 : la déconnexion de A retire une seule session, B reste connecté et renouvelle sa session « une heure plus tard » ; la déconnexion à distance par la Direction retire les deux sessions (0 restante) et renvoie A et B à l'écran de connexion. Essais complets refaits : refonte (connexion) 30/30, étape 2 59/59.

## Règles métier — Agenda (vérifiées dans le code de l'outil en ligne)

**D'où viennent les événements, ce qui est lu, ce qui est écrit, qui modifie quoi**

| Source | Lu | Écrit | Qui peut modifier |
|---|---|---|---|
| **Événements saisis dans l'outil** (table `evenements` : titre, date, heure, note) — communs aux 3 magasins | Tous, à chaque ouverture et à chaque changement (temps réel) | Ajout, modification, suppression depuis l'Agenda (même enregistrement qu'avant) | **Tous les comptes connectés** (magasins et Direction), sur tous les événements (règle de la base : « comptes connectés » ; inchangé). En production : 6 événements, du 21 au 26/09 |
| **3 calendriers Google des magasins** (abonnements iCloud publiés : Albi, Rouffiac, 2 Zèbres) | Lus à la demande pour la période affichée, avec la clé Google de l'outil (calendriers publics) | **Jamais** : lecture seule dans l'outil (on les modifie dans le calendrier du magasin, sur le téléphone ou l'iPhone) | Personne depuis l'outil |

| Règle | Outil actuel | Refonte |
|---|---|---|
| Emplacement | Sur l'accueil | Page « Agenda » (accordé le 13/10) ; l'accueil garde le bloc « À venir » |
| Lecture des calendriers des magasins | Par l'appareil, directement chez Google (clé et identifiants dans le code publié ; copies Google lisibles par tous sans clé) | ⚠️ **Changé (13/10, branche `agenda-serveur`)** : par le serveur (`api/agenda`), pour un appareil connecté seulement, à partir des liens iCloud (secrets dans Vercel) ; mêmes événements à l'écran (comparés jour par jour sur octobre–novembre 2026, et année par année de 2012 à 2027 au niveau des données) ; **plus à jour** qu'avant (Google ne recopiait les calendriers que toutes les quelques heures) ; calendrier indisponible → message « Calendrier indisponible pour le moment : … », les autres restent affichés |
| Notes des rendez-vous (calendriers des magasins) | Celles que Google avait recopiées : 18 rendez-vous, tous passés (2 avec un lien) | ⚠️ **Changé (13/10, option B)** : les notes **sans lien** sont affichées (16 rendez-vous, tous passés) ; une note qui **contient un lien** n'est ni envoyée par le serveur ni affichée (11 rendez-vous, dont les 9 d'Albi que Google n'avait jamais recopiées) |
| Vues | Jour, Semaine (lundi → samedi), Mois (par défaut), Année | Identiques ; ⚠️ semaine du lundi au **dimanche** (G2) |
| Couleurs | Albi bleu, Rouffiac vert, 2 Zèbres orange (trait) ; événements de l'outil : bleu de l'outil | Magasins identiques ; ⚠️ événements de l'outil en **violet** (G1) |
| Date proposée à l'ajout | Le jour touché, sinon aujourd'hui en heure française (corrigé en ligne le 12/10, 8691471 ; l'heure anglaise restait dans les branches `securite-etape2` et `dev`, construites avant) | Identique : heure française |
| Heure d'un événement Google | Heure française de l'appareil | Identique |
| Événement Google sur plusieurs jours | Affiché seulement le **1er jour** ; s'il commence avant la période affichée, il n'apparaît pas (34 événements entre janvier 2026 et juin 2027, lus en lecture seule : 33 journées entières — 21 à Albi, 11 à Rouffiac, 1 aux 2 Zèbres — et 1 rendez-vous qui finit le lendemain) | ⚠️ Affiché **chaque jour** avec « jusqu'au … » (G3) |
| Clé Google absente | Agenda utilisable sans les calendriers des magasins, message | Identique |

**Clé Google restreinte — en place et vérifiée (12/10)** : dans la console Google, la clé n'est utilisable que depuis `https://suivi-pro-app.vercel.app/*`, `http://localhost:5173/*` et `http://localhost:5174/*`, et seulement pour Google Calendar API. Vérifié : refus sans site (« referer <empty> »), refus depuis un faux site (« https://exemple-pirate.com/ »), accord depuis le site en ligne et depuis les 2 adresses locales (3 appels chacun) ; dans un vrai navigateur, l'agenda local (5173 et 5174) charge les calendriers des magasins (réponses 200) ; agenda en ligne vérifié par vous. Limite : un programme peut imiter l'adresse du site — la vraie protection reste le plan A (calendriers lus par le serveur), prévu juste après l'étape 2. (Note : l'appel de géocodage signalé par la console était un essai de Claude, refusé.)

**Calendriers des magasins — ce qui est public (constat du 12/10, rien changé)** : les adresses (identifiants) des 3 calendriers et la clé Google sont **dans le code publié du site**, qui se télécharge sans connexion (la connexion protège les données de la base, pas le code). La clé fonctionne depuis n'importe où (essai sans passer par le site). Une personne extérieure qui ouvre ce code peut donc lire **tous les événements des 3 calendriers** — titres (ex. « RDV » avec un nom de client), dates, heures, lieux, notes — sur n'importe quelle période, et utiliser la clé pour d'autres lectures Google Calendar (quota du compte Google). Elle ne peut rien modifier. À traiter plus tard si vous le souhaitez (calendriers non publics lus par le serveur, ou clé restreinte au site).

**Essais (base de test, compte magasin Albi, 12/10)** : vue Mois comparée à l'outil actuel sur 4 mois (oct. 2026 → janv. 2027), mêmes données : **identique** jour par jour (12 jours avec événements) — avant les choix G1-G4 ; **après les choix** (étape 4), comparaison jour par jour en vue Jour sur octobre-novembre 2026 : tous les événements de l'outil actuel sont présents au même jour, seuls ajouts les jours suivants des événements sur plusieurs jours (G3) ; ajout, modification, suppression avec confirmation, vus aussi dans l'outil actuel ; date proposée à 0 h 30 le 14/10 : **14/10** (l'ancien calcul donnait le 13) ; G2 (7 jours, dimanche visible) et G3 (événement du 19 au 21/10 visible le 21) avec et sans ; téléphone : les 4 vues sans défilement de côté. Événement d'essai effacé.

## Règles métier — Factures (vérifiées dans le code de l'outil en ligne)

**Ce que l'écran lit et écrit** : **rien dans la base**. Seulement, sur l'appareil (navigateur) : la dernière boutique choisie (`factures_boutique`) et un compteur de numéro par société (`factures_seq::B'Shoes`, `factures_seq::JR Shoes`). Les factures ne sont **pas enregistrées** : il reste le PDF téléchargé et le mail envoyé. **Aucun lien** avec le Plan de règlement, les achats ou le pointage.

**Qui y a accès** : tous les comptes (magasins et Direction), comme aujourd'hui.

| Règle | Outil actuel | Refonte |
|---|---|---|
| Boutiques → société | Les 2 Zèbres et Bailly Albi → B'Shoes ; Bailly Rouffiac → JR Shoes ; logo et mention légale (raison sociale, adresse, téléphone, SIREN, TVA, IBAN) par boutique | Identique |
| Calcul | On saisit le TTC ; HT = TTC ÷ 1,20 arrondi au centime ; TVA = TTC − HT arrondie au centime | **Identique** (code inchangé) |
| Numéro | Année + compteur à 4 chiffres par société, **propre à chaque appareil** ; modifiable ; le compteur avance à l'impression, à l'envoi par mail et à « Nouvelle facture » | Identique |
| Date | Aujourd'hui en heure française, modifiable | Identique |
| PDF | Capture de l'aperçu, A4, nom « Facture_[n°]_[société].pdf » | Identique ; sur téléphone, capture de la facture pleine taille |
| Mail | Télécharge le PDF puis ouvre Gmail (adresse de la société : contact.baillyalbi@ pour B'Shoes, contact.baillyrouffiac@ pour JR Shoes), destinataire = email du client | Identique |

**Comparaison (12/10)** : outil actuel et refonte côte à côte, mêmes saisies — 3 boutiques × 8 montants (0 ; 0,01 ; 15 ; 59,90 ; 79,99 ; 100 ; 249,50 ; 1 234,56) : **texte complet de la facture et totaux HT / TVA / TTC identiques** (24 cas) ; brouillon Gmail identique ; compteur identique. Téléphone : saisie et aperçu sans défilement de côté, PDF produit (Facture_2026-0050_JRShoes.pdf). Compte magasin et compte Direction : accès.

**Constat à décider plus tard (rien changé)** : le compteur de numéro est **propre à chaque appareil**. Deux appareils de la même société (ex. Albi et Les 2 Zèbres, tous deux B'Shoes, ou deux postes d'un même magasin) proposent **le même numéro** ; vider les données du navigateur remet le compteur à zéro. Or les numéros de facture doivent se suivre sans doublon. Il faudrait un compteur partagé dans la base (et, si vous le souhaitez, un registre des factures émises) : modification de la base, à faire seulement avec votre accord écrit (voir « Idées pour plus tard »).

## Règles métier — Prix des retours (vérifiées dans le code, 13/10 ; branche `retours-prix`, pas encore en ligne)

| Règle | Outil actuel | Refonte (branche `retours-prix`) |
|---|---|---|
| Prix d'un retour créé depuis un **défectueux** ou un **SAV** | prix tapé → prix du modèle (saison active) → prix moyen de la marque (saison active) → 0 € | prix tapé → prix du modèle (saison active) → **prix du modèle d'une autre saison** (la plus récente) → prix moyen (saison active) → **prix moyen de la marque dans la saison où le modèle a été commandé** → 0 € (décisions du 13/10) |
| Prix d'un retour saisi au **Cahier** | prix du modèle (saison active), sinon **0 €** (pas de prix moyen) | ⚠️ **Changé (13/10)** : même ordre que ci-dessus (le prix moyen s'applique désormais aussi au Cahier) ; la saisie indique d'où vient le prix |
| Prix estimé | — | **Ajout (13/10)** : quand le prix vient d'une moyenne de la marque (et non du prix du modèle), la saisie et la fiche du retour l'indiquent : « prix estimé, à vérifier avec l'avoir de la marque » |
| Corriger le prix d'un retour existant | Impossible à l'écran (le prix est figé à la création) | **Ajout (13/10, validé)** : fiche d'un retour, **comptes Direction seulement** : « Prix du retour », effet sur le Plan de règlement d'après l'état du défectueux, « Corriger le prix » (prix proposé), confirmation, « Annuler » ; un compte magasin ne voit pas cette partie (la base ne le bloque pas : voir « Idées pour plus tard ») |
| Entrées reçues (hors retours) | prix du modèle × paires, sinon 0 € ; « Modifier » puis « Enregistrer » recalcule avec le prix du modèle | **Inchangé** (vérifié par essai : une entrée saisie à 0 € puis dont le modèle reçoit un prix est recalculée à l'enregistrement) |
| Avoir dans le Plan de règlement | si le défectueux lié est « Avoir reçu » ou « Clôturé » et le prix ≠ 0 € | **Inchangé** |

**Avant / après sur les vrais retours à 0 € (production, lecture seule, 13/10)**

| N° | Magasin · saison | Marque · modèle | Créé depuis | Avant | Après |
|---|---|---|---|---|---|
| 1299 | Rouffiac · Été 2026 | Tamaris 28236-42 | SAV | 25,86 € | 25,86 € (prix moyen, estimé) |
| 2393 | Albi · Hiver 2026 | Aliwell A125248, Dore | Cahier | 0 € | 42,63 € (prix moyen Été 2026, estimé) |
| 2416 | Albi · Hiver 2026 | Plakton CP_BETA_340010, Jungle | SAV | 0 € | 19,05 € (prix moyen Été 2026, estimé) |
| 2448 | Albi · Hiver 2026 | Eva Frutos 773, Leopardo | Défectueux | 0 € | 20,88 € (prix moyen Été 2026, estimé) |
| 2500 | Albi · Hiver 2026 | Carla Tortosa 25529, Platino | SAV | 0 € | 23,40 € (prix moyen Été 2026, estimé) |
| 2508 | Rouffiac · Hiver 2026 | Carla Tortosa 25529, Marron | Défectueux | 0 € | 23,40 € (prix moyen Été 2026, estimé) |
| 3321 | Rouffiac · Hiver 2026 | Miss Elastic 75050-67-05, Negro | SAV | 0 € | 39,00 € (prix moyen Été 2026, estimé) |
| 2389, 2390, 2475, 2913, 3421 | — | Bopy, Aliwell A126162, Pepe Jeans, Eva Frutos « . », Pellet | SAV | 0 € | 0 € (rien de connu pour ce modèle dans ce magasin) |

« Après » = prix qu'aurait reçu le retour s'il avait été créé avec la nouvelle règle ; les retours existants ne changent pas tout seuls (correction à la main par la Direction, liste dans `NETTOYAGES.md`, local). Les 25 retours qui ont déjà un prix auraient reçu le même prix.

## Plans préparés (non construits, 12/10)

### A. Calendriers des magasins lus par le serveur (point 2b) — ✅ **EN LIGNE depuis le 14/10** (solution B : liens iCloud lus par le serveur ; étapes d et e à faire, voir `JOUR-J-AGENDA.md`)

> **Constat du 13/10** : les copies Google des 3 calendriers étaient lisibles **sans clé et sans connexion** à une adresse publique de Google fabriquée à partir de leurs identifiants (eux-mêmes dans le code publié) : la restriction de la clé ne protégeait pas les événements. Le compte de service n'est pas possible (abonnements « à partir d'une URL », non partageables). **Solution retenue (votre accord du 13/10)** : le serveur lit directement les liens iCloud publiés (variables Vercel), puis désabonnement des 3 calendriers dans Google et suppression de la clé.

**But** : ni la clé Google ni les adresses des calendriers dans le code publié ; seuls les appareils connectés voient les événements des magasins.

**Principe** : une fonction serveur `api/agenda` (comme `api/send-mail`) reçoit la période demandée, **vérifie que l'appareil est connecté** (même contrôle que pour les mails), lit les 3 calendriers côté serveur, et renvoie les événements sous la même forme qu'aujourd'hui. L'agenda et le bloc « À venir » l'appellent au lieu d'appeler Google. Réponse gardée quelques minutes en mémoire pour limiter les appels.

**Lecture côté serveur — recommandé : compte de service Google** : les calendriers redeviennent **privés** et sont partagés seulement avec un « compte de service » (adresse technique Google) ; le serveur s'identifie avec la clé de ce compte. *Point à vérifier au début* : les 3 calendriers sont des abonnements à des calendriers iCloud (« import.calendar.google.com ») ; si Google ne permet pas de les partager avec un compte de service, repli : le serveur lit directement les liens iCloud publiés (gardés secrets dans Vercel).

**Ce que vous aurez à faire** (guidé pas à pas le moment venu) :
1. Console Google : créer le compte de service, télécharger sa clé (fichier JSON — à ne mettre ni dans le projet ni dans un mail).
2. Google Agenda : partager chacun des 3 calendriers avec l'adresse du compte de service (« Afficher tous les détails des événements »), puis **décocher « Rendre disponible publiquement »**.
3. Vercel → Settings → Environment Variables (Production, sans préfixe `VITE_`) : `GOOGLE_SERVICE_ACCOUNT` (contenu de la clé) et `GOOGLE_CALENDAR_IDS` (les 3 identifiants) ; puis **supprimer `VITE_GOOGLE_API_KEY`**.
4. Après vérification : supprimer l'ancienne clé dans la console Google.

**Ordre de mise en ligne** (sans coupure de l'agenda) : code avec la fonction serveur → vérification → calendriers rendus privés → suppression de l'ancienne clé.

**Effort** : petit à moyen (une fonction serveur et son équivalent en local, deux fichiers de l'agenda, essais) — environ une demi-journée, plus vos réglages Google et Vercel. **Aucune modification de la base.**

**Avec l'étape 2 ?** Possible (indépendant de la base) : il faudrait le construire et le tester dans la branche de l'étape 2 et suivre l'ordre ci-dessus le même jour. Recommandation : le faire **juste après** l'étape 2, pour ne pas ajouter de réglages Google / Vercel le jour de la mise en ligne de la protection — sauf si vous préférez tout regrouper. En attendant, la restriction de la clé (point 2a) limite l'usage de la clé aux pages de votre site.

### B. Numéros de facture partagés et registre des factures (point 3)

**But** : des numéros qui se suivent **sans doublon** pour chaque société, quel que soit l'appareil, et un registre des factures émises.

**Modifications de la base (ajouts, sans perte — avec votre accord écrit)** :
- table `factures_compteurs` : société, année, dernier numéro (une ligne par société et par année) ;
- table `factures` : société, numéro (unique par société), date, boutique, client (nom, adresse, email), désignation, HT, TVA, TTC, compte qui l'a émise, date d'émission, et « annulée » + motif (une facture n'est jamais effacée) ;
- une fonction en base `emettre_facture(...)` qui, **en une seule opération**, prend le numéro suivant de la société et enregistre la facture : deux appareils qui valident au même instant obtiennent deux numéros différents.

**Dans l'écran** : bouton « Valider la facture » ; le numéro est attribué **à ce moment-là** (avant : proposé par l'appareil, modifiable). Une fois validée, la facture est figée : on l'imprime, on télécharge le PDF, on l'envoie, on la retrouve dans le registre. Une erreur se corrige par une annulation (motif) et, si le cabinet le demande, par un avoir.

**Droits proposés** :
| | Compte magasin | Compte Direction |
|---|---|---|
| Émettre une facture | Oui (par la fonction : il ne choisit pas le numéro) | Oui |
| Lire le registre | Oui (pour réimprimer / renvoyer) | Oui |
| Modifier, effacer | Non | Non (la base l'interdit à tous) |
| Annuler (avec motif) | Non | Oui |
| Exporter le registre (CSV pour le cabinet) | Non | Oui |

**Reprendre la numérotation existante sans doublon** : relever le dernier numéro utilisé pour chaque société — sur chaque appareil qui fait des factures (je peux vous dire où le lire) et dans les mails « Facture 2026-… » envoyés depuis contact.baillyalbi@ et contact.baillyrouffiac@ ; le compteur de 2026 démarre **après le plus grand numéro trouvé**. S'il existe déjà des doublons, les lister avec le cabinet : selon sa réponse, on les garde tels quels (ils restent hors registre) ou on les note dans le registre comme factures historiques. À valider avec votre expert-comptable : le format (« 2026-0043 », remise à 1 chaque année par société), la reprise, et le traitement d'une erreur (annulation et avoir).

**Effort** : moyen (2 tables, 1 fonction, règles d'accès, écran Factures et registre, essais) — environ une journée.

## Idées pour plus tard (non construites)

| Idée | Pour quoi faire | Ce qu'il faudrait ajouter à la base |
|---|---|---|
| **Date du mail SAV** | Compter le retard d'un dossier SAV à partir de l'**envoi du mail à la marque** (et non de l'ouverture du dossier) ; afficher « mail envoyé il y a X jours » | Une colonne `sav.mail_at` (date et heure), remplie quand le dossier passe à « Mail marque envoyé » ; les dossiers existants resteraient sans date (retard compté depuis l'ouverture). Modification **additive**, sans perte de données — à faire avec votre accord écrit |
| **Livraisons attendues cette semaine** (accueil) | Voir les cartons attendus dans les jours qui viennent, avec le nombre de paires restant à recevoir | Une **date de livraison prévue** par marque × magasin × saison : colonne `parametres.livraison_prevue` (date), saisie dans Achats (ou importée avec le fichier des achats). Le reste à recevoir existe déjà (attendu − reçu). Pour aller plus loin : une date par modèle (`parametres.livraisons_modeles`, JSONB `{ modèle: date }`). Modification **additive** — à faire avec votre accord écrit |
| **Dater l'avoir du jour de réception** | Aujourd'hui l'avoir du Plan de règlement est daté du jour de création de la ligne « Retour » ; le dater du jour où l'avoir est reçu | Une date de réception de l'avoir sur le défectueux (`defectueux.avoir_at`), remplie au passage à « Avoir reçu » ; le Plan l'utiliserait à la place de la date du retour (repli sur la date du retour si vide). Modification **additive** — à faire avec votre accord écrit |
| **Avoir pour un retour saisi dans le Cahier** | Un retour saisi directement dans le Cahier (bouton Retour) n'a pas de défectueux, donc jamais d'avoir dans le Plan | Soit créer un défectueux lié à la saisie d'un retour au Cahier, soit un état d'avoir sur l'entrée elle-même (`entrees.avoir`, par ex. « attendu / reçu / refusé ») lu par le Plan. À concevoir — à faire avec votre accord écrit |
| **Réorganisation des Réglages (U4)** | « Achats & assortiment » (modèles, quantités, prix de la saison rangés avec les Achats plutôt que dans Réglages → Marques), « Réglages → Équipe » (salariés), mode de règlement réglé dans la fiche fournisseur du Répertoire (un seul endroit au lieu de Réglages + fiche d'achat), magasins et fusion de marques dans une partie « Maintenance » | Aucune modification de la base : seulement l'emplacement des écrans. Non faite maintenant (décision du 12/10) |
| **Total d'heures du planning, pause déduite** | Total d'heures **réellement travaillées** par salarié et par semaine (écran, éventuellement impression) — refusé sans la pause (décision B) | Une **durée de pause par créneau** : colonne `planning.pause` (nombre de minutes, vide = pas de pause), saisie avec les horaires (« Pause : 0 / 30 min / 1 h / autre »), et le total = Σ (fin − début − pause). Les créneaux existants resteraient sans pause (total à vérifier pour le passé). Modification **additive**, sans perte — à faire avec votre accord écrit. Variante sans changer la base : une pause fixe par règle (ex. 1 h dès 7 h de présence), moins juste |
| **Prix des entrées réservés à la Direction, dans la base** | Aujourd'hui seul l'écran cache la correction du prix d'un retour aux comptes magasin ; la base accepte qu'un compte magasin modifie le prix (PHT) de n'importe quelle entrée, comme tous les autres champs d'une entrée | Une règle (déclencheur) sur `entrees`, sur le modèle du contrôle du pointage (E7) : un compte magasin ne pourrait plus changer `pht` directement. ⚠️ Conséquence pour **toutes** les entrées : la saisie et la correction d'une entrée par un magasin recalculent le PHT (prix du modèle × paires) ; la règle devrait laisser passer ce recalcul (par ex. accepter un PHT égal au prix du modèle × paires, ou faire calculer le PHT par la base), sinon les magasins ne pourraient plus enregistrer ni corriger leurs entrées. À construire et tester sur la base de test, avec accord écrit pour la production |
| **Renouveler les liens iCloud publiés des 3 calendriers** | Couper l'accès de toute personne ou de tout téléphone qui connaîtrait l'adresse actuelle d'un calendrier (on ne sait pas s'ils ont été donnés ailleurs) | Rien dans la base. Dans le partage iCloud de chaque calendrier : décocher puis recocher « Calendrier public » (nouveau lien, l'ancien cesse de fonctionner **pour tout le monde**, y compris un téléphone abonné) ; mettre le nouveau lien dans Vercel et dans `~/.suivi-pro/agenda.env`, puis une mise en ligne |
| **Numéros de facture partagés (et registre des factures)** | Voir « Plans préparés — B » | Voir « Plans préparés — B » |

---

## 5. Ordre de construction (étape 3) — fait

1. **Socle** : charte dans le code, composants partagés, menu + onglets, liens directs, chargement par morceaux (U10), icône d'écran d'accueil (U14) — ✅ validé (12/10).
2. **Cahier des entrées** (entrées, saisie, suivi des livraisons — U1) — ✅ validé.
3. **Accueil « ma journée »** — ✅ validé.
4. **SAV & défectueux** (U5) — ✅ validé.
5. **Commandes clients** (U6) — ✅ validé.
6. **Réassorts** (U7, « Demandé » gardé) — ✅ validé.
7. **Répertoire** (U8) — ✅ validé.
8. **Planning** (U3) et **Éléments de paie** — ✅ validés.
9. **Direction** : Achats, Plan de règlement (U2), Réglages — ✅ validés.
10. **Connexion et choix du magasin** — ✅ validé.
11. **Agenda** — ✅ validé.
12. **Factures** — ✅ validé.
13. **Finitions communes** (fenêtres d'import, confirmations « nom à retaper », intérieur des Réglages et des fiches d'achat, mode sombre) — ✅ validées.

Un écran à la fois, montré en local, un commit par écran, suivi dans `SUIVI.md`.
**Aucune modification de la structure de la base** pour la refonte elle-même (le « Mail commandes » est rangé dans les coordonnées par magasin existantes, la relance d'un réassort dans l'historique des étapes existant).

## Finitions communes — vérifications (12/10)

- **Mode sombre** : 31 écrans et fenêtres parcourus (accueil, agenda, cahier et suivi, réassorts, commandes, SAV, défectueux, répertoire, factures, planning, paie, achats, plan de règlement, les 6 onglets de Réglages, fiche et nouvelle fiche d'achat, les 4 imports CSV, confirmation « nom à retaper », plan chèque, choix du magasin, connexion) : **aucun fond resté clair ni bleu nuit** (hors la facture, volontairement en couleurs fixes d'impression, et la pastille choisie, claire par conception de la charte).
- **Rien de changé dans le fonctionnement** : essais refaits après les finitions — Direction 16/16 (Achats identiques à l'outil actuel sur 8 filtres et 139 lignes, fiche d'achat, suppression de saison avec le nom à retaper, accès refusés au compte magasin), import CSV du Répertoire 8/8.
