# Grande vérification du plan C — récapitulatif (15/10/2026, mis à jour le 22/10)

> **22/10** : l'étape 5 « Reçu par marque » est **abandonnée** (doublon du Cahier) ; ses deux apports (filtre famille, export CSV) sont dans le Cahier (**étape 5 bis**). L'étape 6 a été reconstruite sur l'étape 5 bis.

> Pour votre retour. Tout se passe sur la **base de test** ; rien du plan C n'est en production.
> Seule mise en ligne du jour : **défectueux sur plusieurs paires** (b914345 → 11b8e1e, 13 h 51), vérifiée.

---

## 0. Avant de commencer

**Adresse unique pour tout le plan C : http://localhost:5178** (branche `plan-c-etape6`, qui contient les étapes 1, 2, 2 bis, 3, 7, 4, 5 bis et 6 dans cet ordre). Si la page ne répond pas, demandez-moi de relancer le serveur (`suivi-pro-etape6`, `npx vite --port 5178`).

**Comptes de la base de test** (mots de passe dans `~/.suivi-pro/comptes-base-de-test.txt`) :
- **Direction** : ligne `direction` du fichier ;
- **Magasin Bailly Albi** : ligne `albi` du fichier.
Pour passer d'un compte à l'autre : menu → Se déconnecter, puis se reconnecter. Choisir **Bailly Albi** comme magasin de l'appareil.

**Saison** : choisir **Été 2027** (sélecteur en haut à droite) pour tout ce qui est « suivi par commandes » ; **Hiver 2026** pour vérifier que les saisons d'avant ne changent pas.

**Données de test présentes** : vos commandes d'essai d'Été 2027 (Clarks, Sebago, birkenstock, Tamariss — magasins Les 2 Zèbres et Bailly Albi) et la commande de réassort n° 65. Mes données d'essai ont toutes été retirées.

**Panneau d'essai « avec / sans »** : retiré partout (tous les points tranchés, dernier le 22/10). Ce que vous voyez est la version définitive.

---

## 1. Contrôle de la mise en ligne du jour (production, https://suivi-pro-app.vercel.app)

Vérifié par moi (lecture seule) : site identique octet pour octet à la branche (51 fichiers), fonctions serveur refusées sans connexion, nombre de lignes de chaque table identique à la sauvegarde de 13 h 38 (`~/Sauvegardes/suivi-pro/prod-2026-10-15_13h38-avant-defectueux-multi-paires`).

**À contrôler à l'écran (avec votre compte, page rechargée)** :
1. SAV & défectueux → « Nouveau défectueux » : marque, modèle, puis la grille **« Paires défectueuses »** — un toucher = une paire (le nombre s'affiche sur la case), « − 38 » retire une paire, le total « N paires : … » s'affiche dessous. **Fermer sans enregistrer** (ou, pour un vrai essai, créer puis supprimer le défectueux et sa ligne « Retour » du Cahier).
2. SAV → « Nouveau dossier » → « Retour client » : même grille « Paires rapportées », plus « Autre pointure ». « Réparation » : choix d'une seule pointure, comme avant.
3. Ouvrir un ancien défectueux : il s'affiche comme avant (« Pointure 38 »).
4. Puis envoyer le message aux équipes : `MESSAGE-EQUIPES-DEFECTUEUX.md` (branche `defectueux-multi-paires`).

Marche arrière (si besoin) : Vercel → Deployments → **b914345** → Promote to Production ; puis `cd "/Users/jeremie/Projets/App suivi Pro/suivi-pro-defectueux" && git push origin defectueux-retour:main`. Aucune restauration de base.

---

## 2. Parcours d'essai pas à pas (http://localhost:5178)

### A. Commandes fournisseurs (étapes 1, 2, 2 bis) — compte Direction, Été 2027
1. Menu → **Commandes fournisseurs** : liste groupée par fournisseur puis marque ; puces de magasin et de statut ; filtres fournisseur et famille ; recherche.
2. **Importer une commande** : un fichier de `~/.suivi-pro/essais/fichiers-commande-E27/` → aperçu (articles, paires, montant), validation. Réimporter la même commande → récapitulatif des changements.
3. Ouvrir une commande : modèles-coloris, grille des tailles, réceptions, journal (replié : un toucher sur « Journal »).
4. Réglages → **Fournisseurs et marques** : fournisseurs, marques rattachées, règlement par magasin, plan chèque.
5. Compte **albi** : mêmes écrans, sans prix ni montants ; pas d'import.

### B. Réception rattachée (étape 3) — compte albi, Été 2027
1. **Cahier des entrées** → « Entrée » : marque → commande (choisie d'office s'il n'y en a qu'une) → modèle-coloris → pointures pré-remplies avec le reste ; « Ajouter un autre modèle » (carton) ; « Enregistrer la réception ».
2. Une pointure non commandée : confirmation « hors commande ». Message avec « Annuler ».
3. Dans la liste du Cahier : « Commande BC … » sous la réception ; fiche de l'entrée : encart de la commande ; « Modifier » corrige la réception (et le N° du modèle).
4. **Suivi des livraisons** d'Été 2027 : attendu d'après les commandes.
5. Hiver 2026 : la saisie « Entrée » est l'ancienne, inchangée.

### C. Achats (étape 7) — compte Direction
1. Hiver 2026 : mêmes chiffres qu'avant (tableau sur ordinateur, lignes sur deux niveaux au téléphone) ; filtres, stratégies, catégories, répartition, mode discret, détail par univers.
2. Été 2027 : colonnes **Commandé net**, **Reçu**, **Écart** ; statut déduit des commandes ; marques commandées sans ligne d'achat (le crayon crée la ligne).

### D. Reliquat (étape 4) — compte Direction, Été 2027
1. Commandes fournisseurs : encart **« commandes de saison avec un reste à livrer, sans réception depuis plus de 30 jours »** (filtre « Rien depuis N j », 15 / 30 / 60 / 90).
2. Ouvrir une commande avec un reste (ex. Clarks · Les 2 Zèbres) : **Annuler le reliquat (N)** → motif obligatoire → la fenêtre est **centrée au-dessus de tout l'écran** (correction du jour, à vérifier dans votre navigateur, Safari compris) → journal. Puis **Rétablir**. Dans un modèle : « Annuler le reliquat du modèle », et taille par taille.
3. Compte albi : l'encart est visible (quantités), aucun bouton d'annulation.

### E. Famille et export dans le Cahier (étape 5 bis) — deux comptes
1. **Cahier des entrées** → onglet « Entrées » → **Filtres** → « Famille » (Été 2027 : familles du fichier de commande, ex. « 11 Femme » ; entrées sans commande : leur catégorie). Combiner avec la recherche et les autres filtres.
2. Direction : **Exporter CSV** (à côté de « Filtres ») → le fichier contient exactement les entrées affichées (toutes, pas seulement la page), avec famille, paires, PHT et commande. L'export de la sélection (« Sélectionner » → « Plus ») a le même format.
3. Onglet **Suivi des livraisons** → liste « Famille » (si au moins deux familles) : chaque marque ne garde que les modèles de la famille, les chiffres du haut sont recalculés.
4. Hiver 2026 : familles = catégories des entrées.
5. Compte albi : filtre famille oui, pas d'export.
6. Il n'y a plus d'écran « Reçu par marque » dans le menu.

### F. Réassorts en commandes (étape 6) — compte albi, Été 2027
1. **Top modèles & réassorts** → « Nouveau top modèle » (une marque et un modèle d'une de vos commandes d'Été 2027, ex. Clarks · un modèle de la commande) → « Lancer un réassort » : si le modèle est dans la commande de saison, « Prix repris de la commande de saison : … » ; sinon champ « Prix unitaire HT ». Étape **« Commandé »** → « Lancer le réassort ».
2. Commandes fournisseurs : la **commande de réassort** apparaît (mot « réassort »).
3. Revenir à la fiche : « → En route » ; puis **« Réassort reçu »** : la **saisie de réception commune** s'ouvre sur la commande du réassort, pointures pré-remplies → « Enregistrer la réception » → le réassort passe à **« Reçu »**, le stock du top augmente, le Cahier montre une entrée « Réassort ».
4. Variante : réception partielle depuis le **Cahier** (« Entrée » → la commande de réassort) → le réassort reste « En route » avec le reçu à jour.
5. Revenir à « À réassortir » sans réception : la commande disparaît. Hiver 2026 : tout est comme aujourd'hui.
6. Les 4 comportements tranchés « avec » : prix demandé si absent de la commande de saison, stock suivi, mention de la commande dans la fiche, réception possible depuis « Entrée » du Cahier.

### G. Défectueux sur plusieurs paires — déjà en ligne (§ 1)
Le plan C ne contient pas encore cette nouveauté (voir § 4, fusion avec `main`).

---

## 3. Points en attente de vos choix

> Les 4 points de l'étape 6 sont tranchés le 22/10 (tous « avec ») ; plus aucun panneau d'essai.

| Étape | Point | Ma recommandation |
|---|---|---|
| 4 | Fenêtre « Annuler le reliquat » : **à vérifier dans votre navigateur** (correction faite, non reproduite dans Chrome d'essai) | — |
| Vercel | **Aperçus de branches publics et branchés sur la base de production** (chaque branche poussée crée une adresse `…vercel.app` qui lit et écrit la vraie base, sans protection) | (a) variables *Preview* → base de test, **et/ou** (b) Deployment Protection → « Vercel Authentication » pour les aperçus. À faire par vous dans Vercel |
| Agenda | Anciennes adresses publiques Google des 3 calendriers encore lisibles (`JOUR-J-AGENDA.md`, étape e) | Renouveler les 3 liens iCloud publiés (option décrite dans le document) |

---

## 4. État des branches (GitHub, 15/10 vers 14 h 30)

| Branche | Commit | Contenu | État |
|---|---|---|---|
| `main` | 11b8e1e | version en ligne : refonte + agenda serveur + **défectueux multi-paires** | **en production** |
| `dev` | d8e1205 | ancien point de synchronisation (14/10) | en retard : ne contient ni les défectueux ni le plan C |
| `defectueux-multi-paires` | 11b8e1e | = `main` | en ligne |
| `defectueux-retour` | 6ddbbc3 | marche arrière prête (code = b914345) | à garder quelques jours |
| `plan-c-etape1` → `etape2` → `etape2bis` → `etape3` → `etape7` → `etape4` → `etape5bis` → `etape6` | 7e4dd41 → 476ca93 → 86d4b6b → f00a64b → b63eb73 → 6ebb65e → 057b3d8 → **dernier commit de `plan-c-etape6`** | chaque étape part de la précédente ; **`plan-c-etape6` contient tout le plan C** | base de test seulement ; points 5 et 6 à trancher |

**Base de test** : SQL appliqués dans l'ordre `supabase-plan-c.sql`, `-complements.sql`, `-2bis.sql`, `-etape3.sql`, `-etape6.sql` (chacun avec son fichier d'annulation, aller-retour vérifié). Sauvegardes avant chaque étape dans `~/Sauvegardes/suivi-pro/test-…`.

**Essais repassés aujourd'hui sur le code de l'étape 6** : étape 3 35/35, étape 4 35/35, étape 5 25/25, étape 6 34/34, base étape 1 69/69, base étape 2 bis 37/37. Plan de règlement identique avant / après l'étape 6 (Été 2027, Hiver 2026).

---

## 5. Ce qui restera avant la mise en production du plan C (rien n'est commencé)

1. ✅ Points de l'étape 6 tranchés et panneau retiré (22/10). Reste : **votre vérification d'ensemble à l'écran**.
2. **Réunir le plan C et la version en ligne** : fusionner `main` dans `plan-c-etape6`. Un seul conflit prévu, simple : `src/savdef/Champs.jsx` (lignes d'import : la grille des paires des défectueux d'un côté, l'enregistrement des contacts du plan C de l'autre). Puis repasser tous les essais (défectueux compris : leur mail lit les contacts du plan C).
3. **Remettre `dev` à jour** (il a deux jours de retard) avec votre accord.
4. **Migration de la base de production** (votre accord écrit et votre commande, comme toujours) :
   - sauvegarde fraîche de la production (le fichier `.prod-db-url.local` de l'iMac fonctionne de nouveau) ;
   - **répétition générale sur une copie de la production** restaurée dans la base de test : SQL dans l'ordre `supabase-plan-c.sql` → `-complements.sql` → `-2bis.sql` (dont la conversion des groupes de marques en fournisseurs et la reprise des modes de règlement et plans chèques) → `-etape3.sql` → `-etape6.sql` ; puis **comparaison ligne par ligne du Plan de règlement** avant / après sur cette copie (déjà faite pour 2 bis : 2 281 échéances identiques ; à refaire avec tout le plan C), contrôle des contacts (5 252 lectures identiques pour 2 bis), du Cahier, des Achats ;
   - remplir la table de correspondance des magasins (les 3 correspondances décidées) ;
   - mise en ligne coordonnée : SQL appliqué en production **puis** code envoyé (`git push` lancé par vous), dans la même fenêtre, hors des heures d'ouverture ; vérifications en lecture seule ; marche arrière prête (fichiers d'annulation + promotion de l'ancien déploiement).
5. **Message aux équipes** du plan C (réceptions rattachées, filtre famille du Cahier, réassorts en commandes ; cohabitation Hiver 2026 jusqu'au 31/03/2027).
6. **Échéance** : étapes 1 à 3 en ligne **avant fin janvier 2027** (premières commandes d'Été 2027).
