# Plan de la refonte — étape 2

> À valider avant la construction. Maquettes : ouvrir `maquettes/index.html` dans le navigateur (charte : `maquettes/charte.html`).
> Retenu à l'audit : I1 à I9, U1, U2, U3, U5, U6, U7, U8, U14, B2. Protection des données (B6 étape 1) : chantier séparé, avant la refonte (voir `SECURITE.md`, branche `securite`).

---

## 1. Nouvelle organisation

### Le menu

| Ordinateur / tablette (barre latérale) | Téléphone (5 onglets en bas) | Pour qui |
|---|---|---|
| **Magasin** (sélecteur en haut du menu) | dans « Plus » | Tous |
| **Accueil** — « ma journée » | Accueil | Tous |
| **Cahier des entrées** (Entrées · Suivi des livraisons) | Entrées | Équipes |
| **Réassorts** (top modèles) | Réassorts | Équipes |
| **Commandes clients** | Clients | Équipes |
| **SAV & défectueux** | Clients | Équipes |
| **Répertoire** | Plus | Tous |
| **Agenda** (page complète ; « À venir » sur l'accueil) | Plus | Tous |
| *Équipe* — **Planning** | Plus | Vous / gérants |
| *Équipe* — **Éléments de paie** | Plus | Équipes (1×/mois) |
| *Direction* — **Achats & assortiment** | Plus | Vous |
| *Direction* — **Plan de règlement** | Plus | Vous |
| *Direction* — **Factures** | Plus | Vous |
| *Direction* — **Réglages** | Plus | Vous |
| Se déconnecter (bas du menu) | Plus | Tous |

L'onglet « Clients » du téléphone ouvre une page avec deux entrées : Commandes clients et SAV & défectueux.

### Ce qui est regroupé

| Avant | Après | Pourquoi |
|---|---|---|
| SAV + Défectueux (2 apps) | **SAV & défectueux** (une app, 2 onglets) | Un retour client crée déjà un défectueux ; une seule clôture (U5) |
| Paramètres → Marques & modèles + Achats | **Achats & assortiment** | Les modèles, quantités et prix de la saison sont de l'assortiment, pas un réglage (U4) |
| Paramètres → Salariés | **Réglages → Équipe** | Utilisé par 5 apps |
| Paramètres → Modes de règlement | **Fiche fournisseur** (Répertoire, partie Direction) | Un seul endroit pour le mode de règlement (fin des 3 endroits) |
| Paramètres → Magasins, fusion de marques | **Réglages** (fusion dans « Maintenance ») | Réglages rares |
| Bouton 🌙 flottant | Suit le réglage clair/sombre de l'appareil (option dans Réglages) | Plus de bouton qui masque l'écran |
| Bouton ☰ flottant | Barre latérale (ordinateur) / onglets (téléphone) | Idem |

### Ce qui est supprimé
- Les compteurs peu utiles en haut des écrans (« lignes totales », « lignes filtrées », « nombre de magasins »…).
- Le bouton retour ← en haut de chaque app (le menu est toujours visible ; le retour du navigateur fonctionne).
- Les 6 menus de filtres toujours visibles du Cahier → 3 pastilles + un bouton « Filtres ».
- Les fichiers inutilisés (`PlanAchat.jsx`, `migrate.js` et ses dépendances).

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
| **Marque absente de la liste** | impossible depuis le Cahier (il fallait passer par le SAV, les défectueux, le répertoire ou les top modèles) | **« Créer la marque … »** directement depuis la saisie ; l'outil propose d'abord une marque existante au nom proche (« Vouliez-vous dire … ? ») et demande confirmation du nom exact |
| **Actions sur plusieurs entrées** | statut et pointage seulement | « Sélectionner » → barre en bas : **Changer le statut**, Tout sélectionner, Annuler (+ Pointer pour la Direction) ; menu **« Plus »** : changer la **date**, la **catégorie**, **copier un récapitulatif** ; pour la Direction : Dépointer, changer le **magasin**, la **saison**, **exporter en CSV**. Chaque modification est confirmée puis peut être annulée |
| **Agenda** | affiché en entier sur l'accueil (Jour / Semaine / Mois / Année) | l'accueil montre **« À venir »** (4 prochains rendez-vous) ; l'agenda complet s'ouvre avec **« Voir l'agenda »** (ou en touchant un rendez-vous) : c'est là qu'on ajoute ou modifie un événement |
| **Raccourcis de l'accueil** | — | **Saisir une entrée**, **Commande client**, **Dossier SAV** ouvrent directement le formulaire |
| **Supprimer plusieurs entrées** | impossible (une par une) | menu « Plus » → **Supprimer** (en rouge) : fenêtre avec le détail, nombre à retaper au-delà de 5, entrées pointées protégées, « Annuler » pendant 10 s |

---

## 2 bis. Ce qui est retiré, masqué ou déplacé

> ⛔ **Règle de construction** (décision du 11/10, aussi dans `CLAUDE.md`) : **rien ne disparaît de l'outil s'il n'est pas dans cette liste, avec l'accord de l'utilisateur ligne par ligne.** En cas de doute, on garde et on demande.
> Légende : ✅ accordé · ⏸ à décider plus tard (rien n'est retiré d'ici là) · ↔ déplacé (toujours accessible ailleurs).

| Écran | Élément | Décision |
|---|---|---|
| Partout | Bouton retour ← en haut de chaque app | ✅ retiré (menu toujours visible, retour du navigateur) |
| Partout | Boutons flottants ☰ et 🌙 | ✅ retirés (menu / onglets ; thème suivant l'appareil, option dans Réglages) |
| Partout | Emojis des menus | ✅ remplacés par des icônes avec texte |
| Partout | Sous-titre « B'Shoes · JR Shoes » sous le logo | ✅ retiré (11/10) |
| Partout — compte magasin | Achats, Plan de règlement, Paramètres | ✅ masqués (sécurité étape 2) |
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
| Réassorts | Étape « Demandé » | ✅ supprimée (U7) |
| Défectueux | Colonnes Magasin et Société ; champ « État » à la création | ✅ décidé (13/10) : **magasin** sur la ligne pour les comptes **Direction** (même règle que le Cahier ; la liste est toujours celle du magasin choisi) ; **société** retirée de la ligne, visible dans la **fiche** ; champ « État » **retiré à la création** (créé « À traiter », l'état se change dans la fiche ; il reste dans « Modifier ») |
| SAV | Champ magasin à la création | ✅ décidé (13/10) : **toujours visible**, magasins en pastilles (un toucher) ; **pré-rempli** avec le magasin de l'appareil pour un compte magasin ; **à choisir** avec un compte Direction |
| Planning | 4 lignes vides ajoutées d'office | ⏸ à décider sur la maquette de l'écran |
| Achats, Paie, Factures, Répertoire, Plan de règlement | — | rien de retiré prévu à ce jour |
| Socle — titres des pages | Emoji devant le titre (« 📥 Cahier des entrées » → « Cahier des entrées ») | ✅ accordé (12/10) |
| Socle — onglets du Cahier | Emojis des onglets (« 📦 Suivi livraisons », « 📥 Entrées ») | ✅ accordé (12/10) |
| Socle — menu | Groupes « Au quotidien » / « Gestion » → premier groupe sans titre, « Équipe », « Direction » ; Répertoire et Factures remontés dans le premier groupe ; logo 👟 → pastille « S » | ✅ accordé (12/10) |
| Socle — sélecteur de saison | Pastille à la couleur de la saison (choix et ajout) | ✅ accordé (12/10) |
| Socle — suppression de saison | ↔ **retirée de l'en-tête**, déplacée dans **Paramètres → Saisons** (puis Réglages), réservée à la Direction, nom à retaper | ✅ décidé (12/10) — une croix à côté d'une pastille se lit « fermer » |
| Socle — apparence | Bouton 🌙 flottant → réglage **Auto / Clair / Sombre** dans le menu (« Auto » pour qui n'a jamais choisi ; un choix déjà fait est conservé) | ✅ accordé (boutons flottants) |
| Cahier — onglet d'ouverture | S'ouvre sur **Entrées** (le suivi devient le 2ᵉ onglet) | ✅ accordé (plan) — **à annoncer aux équipes** |
| Cahier — saisie | Bouton « Enregistrer » (qui fermait la fenêtre) et « Enregistrer et continuer » → **un seul « Enregistrer »** qui garde la fenêtre ouverte pour le carton suivant ; on ferme avec ✕ — **confirmation si une saisie est commencée** (13/10) | ✅ accordé (13/10) |
| Cahier — saisie | Champs Magasin, Date, N° et Grille regroupés sur une ligne résumé, avec « Modifier » pour les changer | ✅ accordé (13/10) |
| Cahier — saisie | Liste des marques : recherche au lieu du menu déroulant ; **ajout (13/10) : « Créer la marque … »** quand la recherche ne trouve rien, sans quitter la saisie, **avec garde-fous contre les doublons** : même nom à la casse/aux accents/aux espaces/à la ponctuation près → la marque existante est proposée, pas de création ; nom proche (1 lettre d'écart, 2 pour les noms de 6 lettres et plus) → « Vouliez-vous dire … ? » d'abord ; confirmation affichant le nom exact enregistré (espaces en trop retirés ; majuscule au début de chaque mot, sauf les mots de liaison et, de, du, des, la, le, les, en, à quand ils ne sont pas en premier — « Coco et Abricot » ; un nom tapé tout en majuscules reste tel quel — « UGG ») (l'outil actuel ne le permettait pas depuis le Cahier, seulement depuis SAV, défectueux, répertoire, top modèles) ; modèle : liste de la saison + **saisie libre conservée** | ✅ accordé (13/10) |
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
| Menu | Pastilles de comptage colorées (Réassorts, Défectueux, Commandes) et rappel orange « À remplir avant le 25 » sur la paie | ⚠️ absents de la maquette — **gardés**, à dessiner |
| Partout | **Sélecteur de saison** (pastille de couleur par saison) | ⚠️ absent de la maquette — **gardé**, à dessiner |
| Cahier — Entrées | Bouton « Importer CSV » ; sélection multiple + changement de statut groupé | ⚠️ absents de la maquette — **gardés**, à dessiner |
| Saisie d'une entrée | Champs **Catégorie** et **Statut** à la création | ✅ **gardés** (11/10) : pré-remplis quand l'outil peut les déduire (catégorie depuis la grille), **toujours visibles et modifiables d'un toucher** ; jamais de valeur choisie sans que la vendeuse la voie |
| Saisie d'une entrée | **Copier / Coller** une grille de pointures | ⚠️ absent de la maquette — **gardé**, à dessiner |
| Agenda | Couleurs par magasin (Albi bleu, Rouffiac vert, 2 Zèbres orange) | ⚠️ maquette avec d'autres couleurs — **gardées** |
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
| Commandes — en-tête et compteurs | Bouton ←, titre avec emoji, bouton magasin violet → en-tête commun ; cartes « Commandes / En cours / Retirées » → ligne de résumé (« Bailly Albi · 42 commandes · 5 en cours · 26 retirées ») | ⏳ **à valider** |
| Commandes — liste | Tableau de 12 colonnes → **liste** : client (prénom nom) · téléphone ; marque · modèle · réf. · pointure ; date · salarié · provenance (couleur du magasin) ; note sur une ligne ; état à droite (mot de couleur, mêmes teintes). Toutes les informations restent | ⏳ **à valider** |
| Commandes — filtres | Menus État / Provenance / Salarié → pastilles « En cours » (par défaut), À commander, Commandée, Reçue, Client prévenu, « Retirées / annulées » + bouton « Filtres » (provenance, salarié) ; recherche identique | ⏳ **à valider** |
| Commandes — état et boutons | Menu d'état dans la ligne → **toucher la ligne ouvre la fiche**, état en un toucher avec « Annuler » ; ✏️ 🗑 ↔ dans la fiche (Modifier, Supprimer avec confirmation au lieu de « Oui / Non ») ; note : bulle au survol et fenêtre → note sur la ligne et en entier dans la fiche | ⏳ **à valider** |
| Commandes — appeler / SMS | **Ajout (U6)** : boutons « Appeler » et « SMS » dans la fiche quand un téléphone est saisi | ⏳ **à valider** |
| Commandes — saisie | Mêmes champs et mêmes données ; salarié en pastilles + « Autre », **obligatoire** comme aujourd'hui, **dernier salarié mémorisé** sur l'appareil (U6) ; provenance en pastilles (couleur du magasin) ; **date du jour en heure française** (validé) ; ✕ avec confirmation si la saisie est commencée | ⏳ **à valider** |
| Commandes — accueil | Le compteur « Clients à prévenir » ouvre les commandes **filtrées sur « Reçue »** (avant : la liste complète) | ⏳ **à valider** |
| Commandes — points à trancher (essai local) | A. champ « État » à la création ; B. marque : suggestions du Répertoire (texte libre gardé, rien n'est créé) ; C. SMS pré-rempli (« Bonjour Léa, votre commande Clarks Desert 39 est arrivée au magasin Bailly Albi. À bientôt ! ») ; D. après Appeler / SMS d'une commande « Reçue », proposer « Client prévenu » ; E. bouton « étape suivante » sur chaque ligne (→ Commandée, → Reçue…) | ⏳ **à trancher** : construits **avec et sans**, affichés « avec » |

## 2 ter. Codes couleur de l'outil actuel (conservés)

| Code couleur | Règle | Où |
|---|---|---|
| **N° de référence du modèle** | Juste **après le nom du modèle**, même ligne. Même logique que l'outil actuel : nombre du N°, (N° − 1) modulo 3 → **1 rouge, 2 bleu, 3 vert**, 4 rouge… ; pas de nombre = pas de couleur. Teintes de la charte, lisibles en clair et en sombre | **Partout** où un N° apparaît : saisie, liste et détail des entrées, suivi des livraisons, écrans à venir |
| Jauges de livraison et % | 0 % gris · < 50 % orange · ≥ 50 % bleu · 100 % vert | Suivi des livraisons |
| Rien reçu | Ligne de marque / modèle atténuée | Suivi des livraisons |
| Détail par pointure | Vert complet · bleu partiel · gris rien reçu | Suivi des livraisons |
| Entrée pointée | Ligne grisée (comptes Direction) | Liste des entrées |
| Pointure saisie | Case verte (orange pour un retour) | Saisie d'une entrée |
| Couleur par saison | Pastille du sélecteur de saison | En-tête (à dessiner) |
| Couleurs des compteurs | **Trait de couleur** à gauche de chaque compteur (chiffre en noir) — une couleur par type | Accueil |
| Pastilles de comptage du menu | Une couleur par type (réassorts, défectueux, commandes) | Menu (à dessiner) |
| Couleurs d'agenda | Une couleur par magasin — **barre de couleur** (décision du 11/10) | Agenda, bloc « À venir » |

**Statuts des entrées** (décisions du 11/10) :
- **Ordre des étapes, partout** (saisie, filtres, détail) : **Aucun → Enregistré → Imp. étiquettes** (dernière étape), puis Réassort et Retour. ⚠️ L'outil actuel affiche « Imp. Etiquettes » **avant** « Enregistré » dans ses listes : à corriger dans la refonte.
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
- **Messages** : confirmation en bas avec « Annuler », encarts colorés pour les avertissements, jamais de chargement infini.
- **Très peu d'animations** ; icônes au trait avec texte.

---

## Idées pour plus tard (non construites)

| Idée | Pour quoi faire | Ce qu'il faudrait ajouter à la base |
|---|---|---|
| **Date du mail SAV** | Compter le retard d'un dossier SAV à partir de l'**envoi du mail à la marque** (et non de l'ouverture du dossier) ; afficher « mail envoyé il y a X jours » | Une colonne `sav.mail_at` (date et heure), remplie quand le dossier passe à « Mail marque envoyé » ; les dossiers existants resteraient sans date (retard compté depuis l'ouverture). Modification **additive**, sans perte de données — à faire avec votre accord écrit |
| **Livraisons attendues cette semaine** (accueil) | Voir les cartons attendus dans les jours qui viennent, avec le nombre de paires restant à recevoir | Une **date de livraison prévue** par marque × magasin × saison : colonne `parametres.livraison_prevue` (date), saisie dans Achats (ou importée avec le fichier des achats). Le reste à recevoir existe déjà (attendu − reçu). Pour aller plus loin : une date par modèle (`parametres.livraisons_modeles`, JSONB `{ modèle: date }`). Modification **additive** — à faire avec votre accord écrit |
| **Dater l'avoir du jour de réception** | Aujourd'hui l'avoir du Plan de règlement est daté du jour de création de la ligne « Retour » ; le dater du jour où l'avoir est reçu | Une date de réception de l'avoir sur le défectueux (`defectueux.avoir_at`), remplie au passage à « Avoir reçu » ; le Plan l'utiliserait à la place de la date du retour (repli sur la date du retour si vide). Modification **additive** — à faire avec votre accord écrit |
| **Avoir pour un retour saisi dans le Cahier** | Un retour saisi directement dans le Cahier (bouton Retour) n'a pas de défectueux, donc jamais d'avoir dans le Plan | Soit créer un défectueux lié à la saisie d'un retour au Cahier, soit un état d'avoir sur l'entrée elle-même (`entrees.avoir`, par ex. « attendu / reçu / refusé ») lu par le Plan. À concevoir — à faire avec votre accord écrit |

---

## 5. Ordre de construction (étape 3)

1. **Socle** : charte dans le code, composants partagés (boutons, listes, champs, fenêtres, messages), menu + onglets, liens directs, chargement par morceaux (U10), icône d'écran d'accueil (U14). *(La connexion vient du chantier sécurité.)*
2. **Cahier des entrées** (entrées, saisie, suivi des livraisons — U1).
3. **Accueil « ma journée »**.
4. **SAV & défectueux** (U5).
5. **Commandes clients** (U6).
6. **Réassorts** (U7).
7. **Répertoire** (U8).
8. **Planning** (U3) et **Éléments de paie**.
9. **Direction** : Achats & assortiment, Plan de règlement (U2), Factures, Réglages.

Un écran à la fois, montré en local, un commit par écran, suivi dans `SUIVI.md`.
**Aucune modification de la structure de la base** n'est prévue pour la refonte elle-même.
