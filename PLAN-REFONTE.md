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
- **Annuler** après une action courante (pointer, enregistrer…) au lieu des confirmations à répétition.

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

## 3. Deux directions pour l'ordinateur

Au téléphone, les deux directions sont identiques. Elles diffèrent sur ordinateur (et tablette en paysage) :

| | **A · Liste + panneau** (comme Mail) | **B · Liste + fenêtre** |
|---|---|---|
| Détail d'une entrée, saisie | dans un **panneau à droite**, la liste reste visible | dans une **fenêtre au centre**, la liste est masquée derrière |
| Avantages | on voit la liste se mettre à jour en saisissant ; idéal pour pointer ou corriger plusieurs lignes à la suite | plus simple, plus « une chose à la fois » |
| Inconvénients | demande un écran assez large (sinon bascule en fenêtre) | on perd la liste de vue pendant la saisie |

**Ma recommandation : A**, parce que les équipes saisissent carton par carton et pointent en série : voir la liste se remplir au fur et à mesure rassure et évite les doublons. Sur un écran étroit, A se comporte automatiquement comme B.

---

## 4. Charte (résumé — détail dans `maquettes/charte.html`)

- **Couleurs** : fond gris très clair, surfaces blanches, texte noir doux, **un seul bleu d'action** ; vert = fait, orange = à faire, rouge = problème/retour, **même sens partout**. Mode sombre complet.
- **Typographie** : police système de l'appareil, 3 tailles (13 / 15 / 17) + titre de page (26).
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
