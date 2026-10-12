# Jour J — mise en ligne de la sécurité étape 2

> **Déclencheur** : votre accord écrit avec la date (« on met en ligne l'étape 2 »). Rien ne se fait avant, même dans une nouvelle conversation.
> Branche : **`securite-etape2`** (dossier `Projets/suivi-pro`) = version en ligne (8829c91) + étape 2 + déconnexion « cet appareil seulement ». Essais sur la base de test : 59/59, deux appareils 8/8, correctifs en ligne 14/14.
> Instructions de base : **`supabase-securite-etape2.sql`** (E1 à E7 ; retour arrière en bas du fichier). Aucune donnée n'est modifiée ni supprimée.
> Moment conseillé : magasins fermés (dimanche ou soir), avec 1 h devant vous.

## Pourquoi cet ordre
- Les **fonctions** (étape 4) n'ont aucun effet sur l'outil en ligne actuel, mais le nouveau code en a besoin (liste « rempli / à remplir » de la paie).
- Les **règles** (étape 8) gêneraient l'outil actuel (paie, achats des magasins) : elles passent **juste après** le nouveau code.
- Entre les étapes 6 et 8 (quelques minutes), la base applique encore les règles de l'étape 1 : rien n'est ouvert à l'extérieur (connexion obligatoire), seuls les droits magasin / Direction ne sont pas encore séparés.

## Déroulé

| # | Qui | Quoi |
|---|---|---|
| 1 | Claude | **Contrôles** : `git fetch` ; `origin/main` est toujours **8829c91** (sinon on s'arrête et on en parle) ; `securite-etape2` contient `origin/main`. Construction locale de la branche. |
| 2 | Claude | **Sauvegarde fraîche de la production** dans `~/Sauvegardes/suivi-pro/prod-AAAA-MM-JJ_HHhMM-avant-etape2/` (+ `LISEZMOI.txt`), vérifiée (18 tables, nombres de lignes). |
| 3 | Claude | **E1** : marquer les 2 comptes Direction (jeremie.seigne@gmail.com, raphaelseigne04@gmail.com). Sans effet sur l'outil actuel. |
| 4 | Claude | **Fonctions** E2 (`est_direction`), E3 (`paie_remplies`), E5 (`deconnecter_compte`), fonction du pointage E7 (sans encore l'attacher). Sans effet sur l'outil actuel. Vérification en lecture seule. |
| 5 | **Vous** | Lancer la commande de mise en ligne du code : `cd "/Users/jeremieseigne/Projets /suivi-pro" && git push origin securite-etape2:main` |
| 6 | Claude | **Vérifier le déploiement** en lecture seule : le site sert exactement la construction locale de la branche (comparaison octet pour octet), plus de code PIN dans le code publié. |
| 7 | **Vous** | **Reconnexion des 2 comptes Direction** : sur le site en ligne, menu → « Se déconnecter » puis se reconnecter avec votre compte (la marque « Direction » n'est lue qu'à la connexion). **Raphaël fait de même** sur ses appareils (sinon ses écrans Direction apparaissent au plus tard dans l'heure). Vous vérifiez que vous voyez Achats, Plan de règlement, Paramètres. |
| 8 | Claude | **Règles** E3 (paie), E4 et E4 bis (écritures Direction seulement : salariés, magasins, modes de règlement, achats, pointages, envois de paie), **E7** (attacher le contrôle du pointage). |
| 9 | Claude + vous | **Vérifications** (aucun mail réel, aucune donnée réelle modifiée) : en lecture seule — règles en place, accès sans connexion toujours refusé ; simulation d'un compte magasin dans une transaction annulée : 0 fiche de paie lisible, ajout d'un salarié « Zz test » refusé ; **vous** : avec votre compte, ouvrir Éléments de paie (récap visible), Achats, Plan de règlement, Paramètres → Appareils connectés (sans rien déconnecter). |
| 10 | Claude | `dev` mis à jour sur `main` (envoi à votre signal, pour l'autre ordinateur) ; refonte mise à jour. |
| 11 | Vous | Envoyer le message aux équipes (`MESSAGE-EQUIPES-ETAPE2.md`, date remplie) — idéalement la veille. Rien à faire pour elles : identifiants inchangés, pas de reconnexion. |

## Marche arrière

| Problème | Action | Effet |
|---|---|---|
| Une règle bloque un écran | Claude exécute le bloc **« RETOUR ARRIÈRE »** de `supabase-securite-etape2.sql` (règles de l'étape 1 + retrait du contrôle de pointage) | Immédiat ; aucune donnée touchée ; le nouveau code continue de fonctionner |
| Le nouveau code pose problème | **Vous** : Vercel → Deployments → déploiement **8829c91** → « Promote to Production » ; **puis** Claude exécute le « RETOUR ARRIÈRE » (l'ancien code a besoin des règles de l'étape 1) | Retour exact à la version d'aujourd'hui |
| Données | Restauration depuis la sauvegarde de l'étape 2 (voir `LISEZMOI.txt`, ⚠️ étape des autorisations) | Seulement en dernier recours |

Les marques Direction (E1) et les fonctions (E2, E3, E5) peuvent rester en place : elles n'ont aucun effet sur l'ancienne version.

## Ce qui change pour les équipes (rappel du message)
Achats, Plan de règlement, Paramètres et le pointage des entrées disparaissent pour les comptes magasin ; la paie passe par « Vérifie ta saisie » et une fiche validée ne se relit plus ; « Enregistré » avant « Imp. étiquettes » ; « Se déconnecter » ne déconnecte que l'appareil.
