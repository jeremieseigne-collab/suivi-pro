# Audit de l'outil — octobre 2026

> Rapport rédigé **sans rien modifier** à l'outil. Branche de travail : `refonte` (créée à partir de `dev`).
> Les numéros entre crochets (ex. **[I3]**) renvoient aux propositions de la partie 6 : c'est cette liste qu'il faudra trier.

---

## 0. Vérifications de sécurité (faites avant tout)

| Point | Résultat |
|---|---|
| À quelle base l'outil se connecte-t-il en local ? | **Base de développement** (`xrxmnblhpcxlefjcvczw`), séparée de la production (`fftfrbpcsazkkvahscbg`). ✅ On peut travailler sans risque pour les vraies données. |
| Branche Git | Nouvelle branche **`refonte`**, locale, rien n'a été envoyé sur GitHub. ✅ |
| Base de données | Aucune lecture ni écriture faite pendant l'audit. ✅ |
| ⚠️ Point d'attention | En local, l'outil **envoie de vrais e-mails** (App Paie : le récap part vraiment chez la comptable). Pendant la refonte, je propose de **couper l'envoi réel en local** (les mails seraient seulement affichés à l'écran). |
| ⚠️ Rituel de fin de session | Le fichier `CLAUDE.md` me demande, quand vous dites « c'est fini pour aujourd'hui », de **pousser et déployer automatiquement en production**. Ça contredit vos règles de sécurité : **je ne le ferai pas pendant ce chantier**, sauf demande explicite de votre part. |

Je n'ai **pas** ouvert l'outil dans un navigateur : il se serait connecté à la base de développement et aurait pu déclencher des envois de mails. Je vous pose la question à la fin.

---

## 1. Fonctionnement (en langage simple)

- **C'est un site web** (fabriqué avec React, une boîte à outils très répandue). Il s'ouvre dans le navigateur, sur ordinateur, tablette ou téléphone.
- **Les données** (entrées, achats, SAV, plannings…) sont rangées dans un « classeur en ligne » appelé **Supabase**. Quand quelqu'un modifie quelque chose, les autres écrans se mettent à jour tout seuls.
- **La mise en ligne** se fait sur **Vercel** : à chaque envoi sur la branche principale, le site public est remplacé par la nouvelle version.
- **Deux classeurs** existent : un de **test** (développement) et un **réel** (production). En local, on travaille sur celui de test.
- **Une petite partie « serveur »** sert uniquement à envoyer des e-mails depuis votre Gmail (App Paie).
- **Taille** : environ 12 700 lignes de code, réparties en une douzaine d'« apps » dans le même outil.

L'outil a grandi par ajouts successifs : chaque app a été construite à son tour, avec ses propres habitudes. C'est la principale raison de l'impression « chargée » et « pas homogène ».

---

## 2. Inventaire des écrans

Fréquences = **mon estimation** d'après le code, à corriger avec vous.

| Écran | À quoi il sert | Qui | Fréquence estimée |
|---|---|---|---|
| **Accueil** | Compteurs d'alertes (réassorts, SAV, défectueux, commandes) + Agenda partagé | Tous | Plusieurs fois / jour |
| **Agenda** (sur l'accueil) | Événements partagés + 3 calendriers Google des magasins (lecture seule) | Tous | Tous les jours |
| **Cahier des entrées → Entrées** | Saisir chaque livraison reçue (marque, modèle, pointures), pointer les lignes, changer les statuts | **Équipes** | **Plusieurs fois / jour** ⭐ |
| **Cahier des entrées → Suivi livraisons** | Voir, par magasin et par marque, ce qui est reçu vs attendu | Équipes + vous | Tous les jours |
| **Top modèles & réassorts** | Suivre les modèles phares, lancer et réceptionner les réassorts | Équipes + vous | Tous les jours |
| **SAV** | Retours clients, réparations, mise à la forme (minuteur 48 h) | **Équipes** | Tous les jours |
| **Défectueux** | Paires défectueuses à renvoyer à la marque, suivi de l'avoir | Équipes | Plusieurs fois / semaine |
| **Commandes clients** | Commandes passées pour un client, jusqu'au retrait | **Équipes** | Tous les jours |
| **Planning** | Horaires de la semaine par magasin, impression | Vous / gérants | 1 fois / semaine |
| **Éléments de paie** | Chaque salariée déclare ses heures sup, congés… ; récap envoyé à la comptable | Équipes + vous | 1 fois / mois |
| **Factures** | Faire une facture client (PDF, mail) | Vous / équipes | Occasionnel |
| **Répertoire** | Contacts des fournisseurs, par magasin | Tous | Plusieurs fois / semaine |
| **Achats** | Budget d'achat par marque × magasin × saison | **Vous** | Début de saison, puis consultation |
| **Plan de règlement** 🔒 | Ce qu'il faut payer et quand (chèques, LCR, avoirs) | **Vous** | Chaque semaine / mois |
| **Paramètres** 🔒 | Magasins, salariés, marques et modèles, modes de règlement | **Vous** | Début de saison + ponctuel |

Fichiers présents mais **inutilisés** : `PlanAchat.jsx` (ne fonctionnerait même plus), `migrate.js` (ancienne migration terminée).

---

## 3. Ergonomie, écran par écran

### Ce qui revient partout
- **Pas de « charte » commune** : chaque app a son en-tête, son bouton retour, sa façon de choisir le magasin, ses couleurs. Exemple : « Clôturé » est vert dans le SAV mais violet dans Défectueux.
- **4 façons différentes de changer un statut** (menu dans la ligne, boutons d'étape, statut automatique, champ dans le formulaire). Et **4 façons de supprimer** quelque chose.
- **Tableaux trop larges** : Entrées (12 colonnes), Commandes (12), Défectueux (11), Achats (10), Plan de règlement (8). Sur téléphone et tablette, il faut faire défiler de côté.
- **Boutons trop petits pour le doigt** : cases à cocher de 15 px, icônes ✏️ 🗑 pâles, boutons de 34 px (le minimum confortable est ~44 px). La moitié des textes sont en 12-13 px.
- **Actions visibles seulement au survol de la souris** : copier un créneau du Planning, supprimer un remplaçant, lire la note d'une commande. **Invisibles sur tablette et téléphone.**
- **Deux boutons flottants** (☰ en bas à gauche, 🌙 en bas à droite) qui **recouvrent** les tableaux et les boutons des fenêtres sur tablette.
- **Mode sombre incomplet** : environ 500 couleurs sont écrites « en dur » dans le code, donc certaines zones restent blanches en mode sombre.
- **Icônes = emojis** : leur rendu change d'un appareil à l'autre et donne l'aspect « daté ».
- **Attente forcée de 1,5 s** après chaque enregistrement (entrées, achats), qui ralentit la saisie en série.
- **Le bouton « retour » du navigateur ou un rafraîchissement ramènent toujours à l'accueil.** Impossible d'envoyer un lien direct vers un écran.

### Accueil
- « Bonjour 👋 + date + magasin » puis « Aujourd'hui · magasin » : information répétée.
- Les compteurs à 0 restent affichés et prennent de la place.
- L'Agenda propose 4 vues (Jour/Semaine/Mois/Année) : lourd pour un accueil. La vue Semaine **cache le dimanche**.

### Cahier des entrées ⭐ (l'écran le plus utilisé)
- **En arrivant, on tombe sur « Suivi livraisons » alors qu'on vient le plus souvent pour saisir une entrée.**
- Onglet Entrées : 4 compteurs peu utiles (« lignes totales », « lignes filtrées »), **6 menus de filtre** toujours visibles (dont « Société », inutile quand le magasin est déjà choisi), puis le tableau. Sur téléphone : **9 rangées de filtres** avant de voir la première ligne.
- Le Suivi livraisons **ignore le magasin choisi** (il montre les 3), alors que l'onglet Entrées en tient compte. Les compteurs du haut ne suivent pas les filtres.
- La recherche ne trouve pas par **N°**. Les lignes ne sont pas triées par date.
- Grille de pointures Enfant = 47 cases ; 7 onglets de grille + Copier/Coller qui s'empilent sur petit écran.
- **« Enregistrer et continuer » remet la grille sur Femme** : pour une série de Crocs (double pointure), il faut rechoisir à chaque fois.
- **Saisir un retour** : choisir le modèle pré-remplit… le reste à recevoir. Il faut tout effacer à la main.
- « Tout sélectionner » coche aussi les lignes des pages qu'on ne voit pas, et la sélection reste active quand on change les filtres → risque de modifier des lignes sans le voir.
- L'écran « ✅ Import terminé » ne s'affiche jamais (la fenêtre se ferme avant).

### Top modèles & réassorts
- 5 étapes (À réassortir → Demandé → Commandé → En route → Reçu) : « Demandé » fait doublon avec « À réassortir ».
- Sur téléphone, les lignes n'ont **aucun bouton** : il faut toujours ouvrir le détail.
- 5 fenêtres différentes (détail, modèle, stock, réassort, réception).

### SAV
- Création d'un retour : ~14 actions. Le champ magasin est affiché alors qu'il est déjà connu.
- La note-journal s'enrichit quand on clique ailleurs (sans le vouloir).
- « Terminer » et « Clôturer » sur la mise à la forme : différence peu claire.
- Le bouton ✏️ flotte par-dessus la carte et chevauche le texte sur petit écran.
- **Double saisie avec Défectueux** : il faut passer le défectueux à « Avoir reçu » dans une app, **puis** clôturer le SAV dans l'autre.

### Défectueux
- Le tableau affiche les colonnes Magasin et Société alors qu'il est déjà filtré sur un magasin.
- Le compteur « Défectueux » compte les 3 magasins, les autres non.
- Le champ « État » à la création ne sert à rien (c'est toujours « À traiter »).

### Commandes clients
- ~13 actions pour une commande. La marque est en texte libre (fautes de frappe possibles).
- Les commandes retirées/annulées restent dans la liste (seulement grisées) : la liste ne fait que grandir.
- Pas de bouton « appeler / SMS » quand la commande est reçue.

### Planning
- **Aucune copie de la semaine précédente** : environ 50 à 100 clics pour remplir une semaine.
- Grille de 700 px minimum : défilement de côté sur téléphone, la colonne des noms ne reste pas fixe.
- Annuler (Ctrl+Z) n'existe qu'au clavier : impossible sur tablette.
- Le système « imprimer maintenant ou attendre la semaine suivante » est déroutant.
- Les créneaux sont liés au **prénom** : renommer une salariée fait « disparaître » son planning en ligne remplaçant.

### Éléments de paie
- Écran plutôt sobre, c'est le plus réussi.
- La salariée doit **choisir sa société à chaque fois** (pourrait être déduite de son magasin).
- Les dates ne sont pas limitées au mois concerné.

### Factures
- Formulaire et aperçu côte à côte, non adapté au téléphone.
- Envoi : le PDF est téléchargé, puis il faut **le glisser à la main** dans Gmail.

### Répertoire
- Les numéros de téléphone sont des champs de saisie : **pas d'appel en un toucher** sur téléphone.

### Achats
- 4 compteurs + mode discret + report N-1 + pastilles stratégie + pastilles univers + barre de répartition + filtres + tableau : **beaucoup d'éléments sur un seul écran**.
- « + Nouveau fournisseur » crée en réalité une **ligne d'achat**.
- La saisie se fait ligne par ligne via une fenêtre (~5 actions par marque × magasin).

### Plan de règlement
- Il faut descendre au-delà de tous les mois passés pour trouver le mois en cours.
- Pas de bloc « en retard, pas encore payé ».

### Paramètres
- 970 lignes de code, 4 onglets qui mélangent des choses très différentes :
  - **Magasins** → c'est bien un réglage ;
  - **Salariés** → sert à 5 apps, mériterait un espace « Équipe » ;
  - **Marques & modèles** → ce n'est pas un réglage, c'est **l'assortiment de la saison** (à côté d'Achats) ;
  - **Modes de règlement** → serait plus naturel dans la fiche fournisseur ;
  - **Fusion de marques** (action irréversible) affichée en haut à chaque visite.
- Pas de recherche : avec plus de 100 marques, des centaines de champs à l'écran.
- Le **mode de règlement** se modifie à 3 endroits, avec des règles différentes (voir partie 5).

---

## 4. Parcours des tâches quotidiennes

| Tâche | Aujourd'hui | Ce qui pourrait être raccourci | Après (estimation) |
|---|---|---|---|
| **Saisir une livraison** | ~9 clics + pointures + 1,5 s d'attente | Ouvrir directement sur Entrées ; bouton « + Entrée » toujours visible ; marque par recherche ; garder la grille et la marque pour la ligne suivante ; supprimer l'attente | **~5 clics** + pointures |
| **Saisir un retour** | ~11 clics + effacer la grille | Bouton « Retour » dédié, grille vide | ~5 clics |
| **Suivre la livraison d'une marque** | 3 à 5 clics (déplier magasin → marque → fenêtre → modèle) | Magasin courant ouvert d'office, modèles affichés directement | 1-2 clics |
| **Pointer des lignes** | 1 clic / ligne (rond de 28 px) | Rond plus grand ; « pointer » directement depuis le détail | Inchangé, plus confortable |
| **Changer le statut d'une ligne** | 4 actions (✏️ → menu → Enregistrer → attente) | Statut modifiable dans la ligne | 2 clics |
| **Pointer une facture fournisseur / un paiement** | Plan de règlement → PIN → descendre au mois → cocher | Ouvrir sur le mois en cours + bloc « en retard » | 2-3 clics |
| **Commande client** | ~13 actions | Dernier salarié mémorisé, marque par recherche, nom + prénom en un champ | ~8 actions |
| **Dossier SAV retour** | ~14 actions + double clôture avec Défectueux | Champs connus masqués ; clôture qui met à jour les deux | ~9 actions, une seule clôture |
| **Réassort complet** | ~15 actions | Fusion « créer + envoyer le mail », suppression de l'étape « Demandé », boutons sur mobile | ~9 actions |
| **Planning de la semaine** | 50-100 clics | « Dupliquer la semaine précédente » puis ajuster | ~10 clics |
| **Facture client par mail** | 8-10 étapes + glisser le PDF | Envoi direct avec le PDF joint | ~5 étapes |
| **Trouver le téléphone d'un fournisseur** | 4 étapes, pas d'appel direct | Recherche globale + appel en un toucher | 2 étapes |

---

## 5. Technique : ce qui est fragile, lent ou risqué

### 🔴 Erreurs qui faussent des données (à corriger en priorité)
1. **Corriger une entrée peut remettre son prix (PHT) à 0.** À l'ouverture de la fenêtre de correction, le prix est recalculé à partir du prix du modèle dans les paramètres ; si le modèle n'a pas de prix (fréquent pour les entrées importées en CSV), l'enregistrement **écrase le prix par 0**. Conséquence : trésorerie et plan de règlement faussés. *(Vérifié dans le code.)*
2. **Les plans de chèques saisis à la main n'apparaissent jamais dans le Plan de règlement.** La fenêtre enregistre la date au format `2026-11-30`, le plan de règlement attend `30/11/2026` : chaque chèque est ignoré, et le calcul automatique n'est pas utilisé non plus. Les fournisseurs concernés **disparaissent du plan**. *(Vérifié dans le code.)*
3. **Corriger une entrée en changeant sa grille** (ex. Femme → DP) **efface les pointures** qui n'existent pas dans la nouvelle grille.
4. **Changer le mode de règlement depuis Achats** ne remet pas les délais à zéro (passer de LCR 30 j à Virement garde « 30 j »), et ignore le regroupement par vrai fournisseur.
5. Les marques en chèque **sans encore de réception** disparaissent du plan sans prévenir.
6. **Pointages de paiement fragiles** : changer le nombre de chèques ou ajouter une marque à un groupe peut décaler ou perdre ce qui a été coché « payé ».

### 🔴 Sécurité
1. **L'envoi de mails est ouvert à tout Internet.** La fonction qui envoie des mails depuis votre Gmail accepte **n'importe quel destinataire et n'importe quel texte**, sans aucune vérification. Quelqu'un qui la découvre peut envoyer des mails frauduleux signés « B'Shoes & JR Shoes » → risque de **suspension du compte Gmail**. Correction simple : la fonction ne doit accepter que les 2 mails prévus (récap paie, demande de modification), avec des destinataires fixés. *(Vérifié dans le code.)*
2. **Les données ne sont pas protégées.** La « clé » d'accès à la base est publique (normal pour ce type d'outil), mais **aucune règle de protection n'est activée** : toute personne qui connaît l'adresse du site peut, avec un peu de technique, lire et modifier **toutes** les données (paies, salariés, IBAN, chiffres d'achat). Le code PIN 2201 est écrit en clair dans le site : c'est une barrière visuelle, pas une protection. La confidentialité de la paie n'existe donc qu'à l'écran.
   → C'est un **chantier à part** (il touche la structure de la base, donc votre accord est nécessaire), mais je vous recommande de l'envisager.
3. **Numérotation des factures** : le compteur est stocké **dans chaque navigateur**. Deux postes (ou un cache vidé) = **numéros en double**, ce qui est interdit en France (numérotation unique et continue). Les factures ne sont **pas archivées** (conservation obligatoire 10 ans). Quelques mentions légales manquent (pénalités de retard, indemnité de 40 € en B2B…).
4. **Suppressions dangereuses sans filet** :
   - **Supprimer une saison** (petite poubelle dans le sélecteur de saison, **sans code PIN**, sur n'importe quel écran) efface **toutes les entrées et tous les achats** de la saison, pour tout le monde, sans sauvegarde.
   - Supprimer une marque ou un magasin efface aussi toutes leurs entrées, toutes saisons.
   - La fusion de marques peut s'arrêter à moitié en cas de coupure réseau.

### 🟠 Fragilités
- **Enregistrements « en chaîne » non sécurisés** : créer un SAV écrit 3 choses (entrée retour, défectueux, dossier SAV). Si la 3ᵉ échoue, les 2 premières restent, et un nouveau clic les **duplique**. Même chose pour la réception d'un réassort.
- **Supprimer un SAV ou un défectueux** laisse l'entrée « Retour » dans le Cahier.
- **Deux personnes qui modifient le même dossier SAV** : la dernière enregistrée écrase la note ou le statut de l'autre.
- Beaucoup de liens se font **par le nom** (magasin, marque, salariée) au lieu d'un identifiant : un renommage casse le lien.
- **Les saisons sont mémorisées dans chaque navigateur** : un nouveau poste ou une tablette réinitialisée ne connaît pas les saisons créées ailleurs.
- **Dates fausses entre minuit et 2 h** à plusieurs endroits (calcul en heure de Londres) ; et une tablette jamais rechargée garde la date de la veille dans le formulaire d'entrée.
- **Réimporter le même CSV crée des doublons** (aucune détection). Certains imports gèrent mal les guillemets et les montants avec virgule.
- En cas de coupure réseau, certains écrans restent **bloqués sur « chargement »** sans message d'erreur.

### 🟡 Lenteur
- **Tout le site est téléchargé d'un bloc (1,4 Mo)**, y compris les outils de PDF qui ne servent qu'aux factures → première ouverture lente sur téléphone en 4G.
- **Chaque modification, n'importe où, fait tout recharger partout** : quand une collègue d'Albi modifie un planning, la tablette de Rouffiac recharge toutes ses entrées, réassorts, SAV… (40 abonnements, chacun recharge sa table entière). Plus il y a de données et d'utilisateurs, plus c'est lent.
- La liste des entrées charge **toute la saison** puis filtre sur l'appareil.
- Pointer 20 lignes = 20 enregistrements l'un après l'autre = 20 rechargements.

### 🟡 Code dupliqué (source de bugs « corrigé ici, pas là »)
- Formulaire de nouvelle entrée et fenêtre de correction : **~240 lignes identiques** (65 %). Le bug du prix à 0 vient de là.
- Fenêtres d'ajout et de modification d'achat : **~180 lignes identiques** (70 %).
- Champs « salarié / marque / modèle / pointure » copiés dans 3 apps (~300 lignes).
- 3 versions de la lecture de CSV, 3 copies des listes de statuts, 4 copies du formatage de date, 3 techniques d'impression différentes.
- Le contrôle automatique du code signale **48 problèmes** (dont 26 erreurs).

---

## 6. Propositions de plus-value

Effort : **petit** = moins d'une demi-journée · **moyen** = 1 à 2 jours · **gros** = plusieurs jours.
⚠️ = nécessite de modifier la structure de la base (votre accord écrit, explications avant).

### 🔴 Indispensable

| # | Proposition | Bénéfice concret | Effort |
|---|---|---|---|
| **I1** | **Corriger les 2 erreurs de calcul** (prix à 0 à la correction d'une entrée ; plans de chèques invisibles) + l'effacement des pointures en changeant de grille | Trésorerie et plan de règlement justes | Petit |
| **I2** | **Fermer l'envoi de mails ouvert** (seuls les mails prévus, destinataires fixés) | Éviter que votre Gmail serve à envoyer du spam et soit suspendu | Petit |
| **I3** | **Protéger les suppressions** : supprimer une saison/marque/magasin → code PIN + saisie du nom pour confirmer ; fusion de marques déplacée dans un coin « Maintenance » | Plus de risque d'effacer une saison d'un clic malheureux | Petit |
| **I4** | **Charte commune** (couleurs, textes, boutons, listes, formulaires, messages) inspirée d'Iris, en sobre, mode sombre complet, icônes au trait à la place des emojis | Outil homogène, moderne, lisible toute la journée | Moyen |
| **I5** | **Navigation unique** : un seul menu (barre latérale sur ordinateur, barre en bas sur téléphone), un seul en-tête, un seul sélecteur de magasin, plus de boutons flottants | On se repère pareil dans toutes les apps ; rien ne masque l'écran | Moyen |
| **I6** | **Listes en « cartes » sur téléphone/tablette** à la place des tableaux de 12 colonnes ; boutons de 44 px ; plus aucune action cachée au survol | Utilisable au doigt partout, sans défilement de côté | Moyen (par écran) |
| **I7** | **Cahier des entrées repensé** : ouverture sur la saisie, bouton « + Entrée » toujours visible, filtres repliés (magasin déjà connu), marque par recherche, grille et marque conservées pour la ligne suivante, bouton « Retour » à grille vide, statut modifiable dans la ligne, recherche par N°, tri par date, plus d'attente de 1,5 s | Saisie ~2× plus rapide pour l'écran le plus utilisé | Moyen |
| **I8** | **Fusionner les doublons de code** derrière chaque écran refait (un seul formulaire d'entrée, un seul formulaire d'achat, des champs partagés) | Un bug corrigé l'est partout ; refonte plus solide | Moyen (fait au fil de la refonte) |
| **I9** | **Messages clairs en cas de problème** (« connexion perdue, réessayez » au lieu d'un chargement infini) et enregistrements « en chaîne » sécurisés (pas de doublon si on reclique) | Les équipes savent quand une saisie n'est pas passée | Petit-moyen |

### 🟠 Utile

| # | Proposition | Bénéfice concret | Effort |
|---|---|---|---|
| **U1** | **Suivi livraisons centré sur le magasin courant**, modèles et pointures affichés directement (sans fenêtre) | Réponse à « où en est la marque X ? » en 1 clic | Petit |
| **U2** | **Plan de règlement** qui s'ouvre sur le mois en cours, avec un bloc « En retard, non payé » | Vous voyez tout de suite ce qu'il faut payer | Petit |
| **U3** | **Planning : « Dupliquer la semaine précédente »**, total d'heures par salariée, bouton Annuler visible, impression simplifiée (1, 2 ou 3 semaines) | 50-100 clics → ~10 | Moyen |
| **U4** | **Réorganiser Paramètres** : « Assortiment » (marques & modèles, à côté d'Achats), « Équipe » (salariés), réglage du mode de règlement dans la fiche fournisseur, recherche partout | Chaque réglage là où on le cherche | Moyen |
| **U5** | **Une seule clôture SAV ↔ Défectueux** : clôturer le SAV propose de mettre à jour le défectueux (et inversement) | Fin de la double saisie | Petit-moyen |
| **U6** | **Commandes** : commandes closes masquées par défaut, dernier salarié mémorisé, bouton « Appeler / SMS le client » | Liste courte, client prévenu en 1 toucher | Petit |
| **U7** | **Réassorts** : suppression de l'étape « Demandé », boutons d'action sur téléphone | ~15 → ~9 actions | Petit |
| **U8** | **Répertoire** : appel et mail en un toucher, recherche immédiate | Joindre un fournisseur en 2 secondes | Petit |
| **U9** | **Lien direct par écran** : le bouton retour du navigateur fonctionne, on peut mettre un écran en favori sur la tablette du magasin | Moins de clics pour arriver au bon endroit | Moyen |
| **U10** | **Outil plus rapide** : chargement en morceaux (chaque app se charge quand on l'ouvre), mises à jour en temps réel ciblées | Ouverture plus rapide, moins de rechargements, tablettes moins sollicitées | Moyen |
| **U11** | **Paie** : société déduite du magasin, dates limitées au mois | Moins d'erreurs côté salariées | Petit |
| **U12** | ⚠️ **Saisons partagées** (rangées dans la base au lieu de chaque navigateur) | Un nouvel appareil connaît d'office les saisons | Moyen |
| **U13** | ⚠️ **Factures conformes** : numéro unique géré par la base, archivage de chaque facture, mentions légales complètes | Conformité légale, plus de numéros en double | Moyen |

### 🟢 Bonus

| # | Proposition | Bénéfice concret | Effort |
|---|---|---|---|
| **B1** | **Recherche globale** (une seule barre : marque, modèle, client, n° de commande, fournisseur) | Trouver n'importe quoi sans savoir dans quelle app | Moyen |
| **B2** | **Accueil « ma journée »** : uniquement ce qui demande une action aujourd'hui (livraisons attendues, SAV à relancer, commandes reçues à prévenir, réassorts en retard) | Les équipes savent quoi faire en arrivant | Petit-moyen |
| **B3** | **Facture envoyée directement avec le PDF joint** (plus de glisser-déposer) | 3-4 étapes en moins, pratique sur tablette | Moyen |
| **B4** | **Import CSV anti-doublons** (prévient si les lignes existent déjà) | Pas de doubles comptages après un réimport | Petit |
| **B5** | **Export de sauvegarde** (un fichier Excel de la saison) avant les opérations risquées, et à la demande | Filet de sécurité, archives | Petit-moyen |
| **B6** | ⚠️ **Vraie protection des données** (connexion par magasin ou par personne, règles d'accès dans la base, paie réellement confidentielle) | Données protégées même si l'adresse du site circule | Gros |
| **B7** | **Saisie de livraison au scan** (lecture du code-barres de la boîte avec la caméra de la tablette) | Saisie encore plus rapide et sans faute, *si* les étiquettes fournisseurs s'y prêtent | Gros |

---

## 7. Ce que je recommande pour démarrer

1. **Tout de suite, avant la refonte** : I1 + I2 + I3 (petits, gros bénéfice, protègent vos données). Ils pourraient même partir en production rapidement, séparément de la refonte, si vous le souhaitez.
2. **Le cœur de la refonte** : I4 → I5 → I6, en commençant par le **Cahier des entrées** (I7), puis SAV, Commandes, Réassorts.
3. **Au fil de l'eau** : I8 et I9 sont faits écran par écran, sans effort séparé.
4. **Ensuite**, selon votre tri : les « Utile », puis les « Bonus ».

---

## 8. Vos réponses (10/10/2026)

- **Appareils** : ordinateur de caisse + tablette en magasin ; vous surtout sur ordinateur. → Priorité au confort **souris + doigt** sur grand et moyen écran ; le téléphone reste correct mais n'est pas la cible n°1.
- **Saisie des livraisons** : au déballage, **carton par carton**, plusieurs saisies d'affilée de la même marque. → Le formulaire d'entrée doit **garder la marque, la grille et la date** d'une saisie à l'autre et enchaîner sans attente (I7).
- **Urgences I1-I2-I3** : à corriger **en premier**, sur une branche à part, mise en ligne indépendante de la refonte quand vous le décidez.
- **Lancement local** : autorisé sur la base de **test**, après avoir **coupé l'envoi réel de mails** en local.
