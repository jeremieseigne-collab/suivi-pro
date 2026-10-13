# Jour J — mise en ligne de la refonte

> **Déclencheur** : votre accord écrit (« on met en ligne la refonte »). Rien ne se fait avant, même dans une nouvelle conversation.
> Branche : **`refonte`** (dossier `Projets/suivi-pro-refonte`). Elle contient déjà toute la version en ligne (étape 2, 31eec8e) : l'envoi est un simple ajout, sans conflit.
> **Aucune modification de la base** : la refonte lit et écrit les mêmes tables, les mêmes colonnes et les mêmes fonctions que l'étape 2 (structure de la base de test et de la production comparée le 13/10 : identique).
> Moment conseillé : magasins fermés ou heure calme, avec 30 min devant vous.

## Déroulé

| # | Qui | Quoi |
|---|---|---|
| 1 | Claude | **Contrôles** : `git fetch` ; `origin/main` est toujours **31eec8e** (sinon on s'arrête et on en parle) ; `refonte` contient `origin/main` ; construction locale de la branche sans erreur. |
| 2 | Claude | **Sauvegarde fraîche de la production** dans `~/Sauvegardes/suivi-pro/prod-AAAA-MM-JJ_HHhMM-avant-refonte/` (+ `LISEZMOI.txt`), vérifiée (18 tables, nombres de lignes). Par prudence : la refonte ne modifie aucune donnée à la mise en ligne. |
| 3 | **Vous** | Lancer la commande de mise en ligne (copier-coller dans le Terminal) : `cd "/Users/jeremieseigne/Projets /suivi-pro-refonte" && git push origin refonte:main` — la dernière ligne doit ressembler à `31eec8e..xxxxxxx  refonte -> main`. |
| 4 | Claude | **Vérifier le déploiement** en lecture seule (2 à 3 min après) : le site sert exactement la construction locale de la branche (comparaison octet pour octet). |
| 5 | **Vous** | **Contrôles à l'écran** (voir plus bas), sur ordinateur puis sur téléphone. |
| 6 | Claude | Mettre `dev` à jour sur `main` (envoi à votre signal, pour l'autre ordinateur) ; remettre en place le rituel de fin de session dans CLAUDE.md (suspendu pendant la refonte). |
| 7 | Vous | Envoyer le message aux équipes (plus bas). Rien à faire pour elles : mêmes identifiants, pas de reconnexion. |

## Contrôles à l'écran (étape 5)

Sur **https://suivi-pro-app.vercel.app**, recharger la page (sur téléphone : fermer l'onglet et le rouvrir).

1. **Accueil** : nouvelle apparence ; « Bonjour », les 3 raccourcis, les compteurs, « En retard », « À venir » avec les rendez-vous des magasins.
2. **Menu** : Accueil, Agenda, Cahier des entrées, Top modèles & réassorts, Commandes clients, SAV & défectueux, Répertoire, Factures, Planning, Éléments de paie, puis **Direction** : Achats, Plan de règlement, Réglages.
3. **Cahier des entrées** : la liste du magasin s'affiche, avec la saison en cours ; ouvrir une entrée puis fermer **sans rien modifier**.
4. **Plan de règlement** : mêmes montants en haut qu'avant (« Total à régler », « Reste à payer ») ; le bloc « En retard » apparaît en tête.
5. **Achats** : mêmes totaux qu'avant.
6. **Agenda** : les 3 calendriers des magasins apparaissent (couleurs bleu, vert, orange).
7. **Téléphone** : onglets en bas (Accueil, Entrées, Clients, Réassorts, Plus) ; « Plus » ouvre le reste.
8. Si possible, demander à un magasin d'ouvrir l'outil sur son appareil : il voit la nouvelle apparence, sans Achats, Plan de règlement ni Réglages.

Aucun essai d'écriture sur les vraies données : on ouvre et on regarde seulement.

## Appareils restés ouverts sur l'ancienne version

- Un appareil qui n'a pas rechargé la page garde l'ancienne version **jusqu'au prochain rechargement**. Les deux versions écrivent les mêmes données de la même façon : **rien ne s'abîme** (vérifié le 13/10, voir « Coexistence » plus bas).
- Pour passer à la nouvelle version : recharger la page (ordinateur) ou fermer et rouvrir l'onglet / l'application (téléphone, tablette).

## Marche arrière

| Problème | Action | Effet |
|---|---|---|
| La refonte pose problème | **Vous** : Vercel → projet suivi-pro → **Deployments** → le déploiement **31eec8e** (« Étape 2 : déroulé du jour J… ») → menu « … » → **« Promote to Production »** (ou « Instant Rollback »). Puis recharger la page sur chaque appareil. | Retour exact à la version de l'étape 2 en moins d'une minute. Aucune donnée à restaurer : les données écrites par la refonte sont lisibles par l'étape 2 (mêmes tables, mêmes colonnes). |
| Ensuite | Claude remet la branche `main` sur GitHub en accord avec la version remise en ligne (commande que vous lancerez vous-même), **avant** toute nouvelle mise en ligne. | Évite qu'un envoi ultérieur remette la refonte en ligne par surprise. |
| Données | Restauration depuis la sauvegarde de l'étape 2 (voir `LISEZMOI.txt`) | Seulement en dernier recours ; non prévu. |

La base n'a rien à défaire : l'étape 2 (règles, fonctions, comptes Direction) reste en place dans les deux cas.

## Coexistence des deux versions (vérifié le 13/10)

| Point | Ancienne version (étape 2) | Refonte | Risque |
|---|---|---|---|
| Tables, colonnes, fonctions de la base | — | Identiques (même couche d'accès, même correspondance des noms de colonnes) | Aucun |
| Pointage du Plan de règlement | Mêmes clés | Mêmes clés (essai croisé : coché d'un côté, vu coché de l'autre) | Aucun |
| Mail de réassort | Passe à « Commandé » | Passe à « Demandé » | Aucun : les deux états existent dans les deux versions ; un appareil ancien compte encore « Demandé » dans « à commander » |
| Relance d'un réassort (date notée dans l'historique) | Conservée quand l'ancienne version modifie le réassort | Écrite | Aucun |
| « Mail commandes » du Répertoire | Non affiché, **conservé** quand l'ancienne version enregistre une coordonnée | Écrit | Aucun ; un mail de réassort envoyé depuis un appareil ancien part au mail SAV (comme aujourd'hui) |
| Fiche d'achat | Enregistre aussi le mode de règlement | Mode en lecture seule | Aucun (comportement actuel inchangé côté ancien) |
| Noms de magasin des commandes | Mêmes noms | Mêmes noms | Aucun |
| Planning : semaines en attente d'impression | Gardées sur l'appareil | Choix 1, 2 ou 3 semaines | Aucun (rien dans la base) |
| Fichiers du site après la mise en ligne | L'ancienne version tient en un seul fichier, déjà chargé | La refonte charge chaque écran à l'ouverture | Aucun le jour J. Pour les mises en ligne **suivantes** : un appareil resté ouvert sur la refonte recharge automatiquement la page s'il ne trouve plus un écran (correctif du 13/10), au lieu d'une page blanche |

---

## Message aux équipes (à envoyer le mardi 13 octobre 2026)

**Objet : Suivi Pro — nouvelle version à partir du mardi 13 octobre**

Bonjour à toutes,

À partir d'aujourd'hui, **mardi 13 octobre**, Suivi Pro change sur deux points : quelques rubriques de gestion sont réservées à la direction, et l'outil change d'apparence pour être plus simple, sur téléphone comme sur ordinateur.

**Vos données ne bougent pas**, votre adresse et votre mot de passe non plus, et vous n'avez pas à vous reconnecter. Si vous voyez encore l'ancienne apparence, rechargez la page (ou fermez et rouvrez l'onglet sur téléphone).

**Réservé à la direction**
- Achats, Plan de règlement et Paramètres (appelés désormais « Réglages ») disparaissent du menu des magasins, ainsi que le pointage des entrées.
- Ajouter ou modifier un salarié, un magasin, les modèles de la saison (quantités, prix, pointures), les modes de règlement, ou supprimer une saison : demandez à Jérémie ou à Raphaël.
- **Paie** : relisez bien l'écran « Vérifie ta saisie ». Une fois validée, votre fiche ne peut plus être corrigée par vous ; en cas d'erreur, touchez votre prénom et envoyez une demande à la direction.

**Pour vous repérer**
- Sur ordinateur et tablette, le **menu** reste à gauche ; sur téléphone, des **onglets en bas** : Accueil, Entrées, Clients (commandes et SAV), Réassorts, et « Plus » pour le reste.
- Le **magasin de l'appareil** se choisit une fois, en haut du menu (ou dans « Plus ») : il vaut pour tous les écrans.
- Après chaque modification, un message propose **« Annuler »** pendant quelques secondes.
- **« Se déconnecter »** ne déconnecte que l'appareil sur lequel vous le touchez.

**Cahier des entrées**
- Il s'ouvre sur la liste des **Entrées** (le suivi des livraisons est le 2ᵉ onglet).
- Pour saisir les pointures, **touchez la pointure** : chaque toucher ajoute une paire (« − » pour corriger). Au clavier, on tape toujours le nombre.
- Pour corriger une entrée, **touchez la ligne** : sa fiche s'ouvre. Pour un retour, choisissez **Retour** en haut de la saisie.
- **Marque absente ?** Tapez son nom puis « Créer la marque » (l'outil propose d'abord une marque au nom proche, pour éviter les doublons).
- **Plusieurs entrées d'un coup** : « Sélectionner », cochez, puis « Statut » ou « Plus ».
- Dans les statuts, « Enregistré » vient désormais **avant** « Imp. étiquettes ».

**Accueil** : trois raccourcis (Saisir une entrée, Commande client, Dossier SAV), les compteurs qui ne sont pas à zéro, « En retard » et « À venir » (les prochains rendez-vous ; « Voir l'agenda » ouvre l'agenda complet).

**Ailleurs**
- **Réassorts** : « Commander par mail » met le réassort à **« Demandé »** ; quand la marque confirme, passez-le à « Commandé ». Un « Demandé » sans réponse depuis 7 jours apparaît en retard : relancez la marque.
- **SAV et défectueux** sont réunis dans un seul écran à deux onglets.
- **Planning** : « Reprendre la semaine précédente », « Annuler la dernière modification », et l'impression de 1, 2 ou 3 semaines.
- **Paie** : la société est pré-remplie d'après votre magasin.
- **Agenda** : la semaine va du lundi au dimanche, et le bouton « Nouvel événement » est toujours en haut.
- **Factures** : utilisables sur téléphone (onglets « Saisie » et « Aperçu ») ; vérifiez que le numéro proposé n'a pas déjà servi sur un autre appareil.

Le détail de chaque écran est dans le document joint. En cas de doute, demandez à Jérémie ou à Raphaël.

Merci,
Jérémie

> Document joint : les rubriques « Détail » de `MESSAGE-EQUIPES-REFONTE.md` (menu, connexion, accueil, répertoire, réassorts, commandes, SAV & défectueux, planning, paie, agenda, cahier, factures), plus le détail « Ce qui ne sera plus possible avec le compte du magasin » de `MESSAGE-EQUIPES-ETAPE2.md`.
