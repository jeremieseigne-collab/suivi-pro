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
| Commandes clients | Commandes retirées / annulées | ↔ ✅ masquées par défaut (U6), accessibles par un filtre |
| Réassorts | Étape « Demandé » | ✅ supprimée (U7) |
| Défectueux | Colonnes Magasin et Société ; champ « État » à la création | ⏸ à décider sur la maquette de l'écran |
| SAV | Champ magasin à la création | ⏸ à décider sur la maquette de l'écran |
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
| Cahier — saisie | Liste des marques : recherche au lieu du menu déroulant ; **ajout (13/10) : « Créer la marque … »** quand la recherche ne trouve rien, sans quitter la saisie (l'outil actuel ne le permettait pas depuis le Cahier, seulement depuis SAV, défectueux, répertoire, top modèles) ; modèle : liste de la saison + **saisie libre conservée** | ⏳ **à valider** (corrigé le 13/10) |
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

## 2 ter. Codes couleur de l'outil actuel (conservés)

| Code couleur | Règle | Où |
|---|---|---|
| **N° de commande** | Juste **après le nom du modèle**, même ligne. Même logique que l'outil actuel : nombre du N°, (N° − 1) modulo 3 → **1 rouge, 2 bleu, 3 vert**, 4 rouge… ; pas de nombre = pas de couleur. Teintes de la charte, lisibles en clair et en sombre | **Partout** où un N° apparaît : saisie, liste et détail des entrées, suivi des livraisons, écrans à venir |
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
- **N° de commande** : couleur qui tourne sur 3 teintes (1 rouge, 2 bleu, 3 vert…), logique identique à l'outil actuel, partout (voir §2 ter).
- **Boutons** : arrondis, 44 px minimum ; bleu = action principale (une par écran), gris = secondaire, lien = discret, rouge pâle = destructif.
- **Listes au lieu des tableaux** : titre en gras, détail en gris dessous, état à droite (point + mot).
- **Formulaires** : étiquette au-dessus, erreur expliquée dessous, champs connus pré-remplis.
- **Messages** : confirmation en bas avec « Annuler », encarts colorés pour les avertissements, jamais de chargement infini.
- **Très peu d'animations** ; icônes au trait avec texte.

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
