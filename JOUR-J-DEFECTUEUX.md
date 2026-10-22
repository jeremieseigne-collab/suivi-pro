# Jour J — défectueux et retours clients sur plusieurs paires

> **Déclencheur** : votre essai validé (15/10) et votre commande. Rien ne part avant que vous lanciez vous-même le `git push`.
> Branche : **`defectueux-multi-paires`** (dossier `Projets/App suivi Pro/suivi-pro-defectueux`), partie de la version en ligne (**b914345**) ; un seul commit d'application : **f35b475**.
> **Aucune modification de la base** : les paires sont écrites dans les colonnes existantes (`entrees.sizes`, `total`, `pht`, `defectueux.pointure`, `sav.pointure`). Pas de variable Vercel à changer.
> Fichiers touchés : `src/savdef/` (Champs, SaisieDefectueux, SaisieSav, ListeDefectueux, regles, nouveau `paires.js`), `src/defectueux/mail.js`, `src/sav/mail.js`, `CLAUDE.md`.

## Déroulé

| # | Qui | Quoi | Marche arrière |
|---|---|---|---|
| a | Claude | **Contrôles** : `origin/main` toujours **b914345** ; la branche n'ajoute que f35b475 (+ ce document et le message aux équipes) ; construction de référence depuis une copie neuve : 51 fichiers, aucun fichier d'essai ni secret. ✅ fait le 15/10 | — |
| b | **Vous** | **Recopier `.prod-db-url.local`** depuis l'autre Mac (AirDrop ou clé USB) dans `~/Projets/App suivi Pro/suivi-livraisons/` (celui de l'iMac est périmé : mot de passe refusé), puis me le dire | — |
| c | Claude | **Sauvegarde fraîche de la production** (lecture seule) : `~/Sauvegardes/suivi-pro/prod-2026-10-JJ_HHhMM-avant-defectueux-multi-paires/` (`base-complete.dump`, `nombre-de-lignes.txt`, `LISEZMOI.txt`), vérifiée ; puis re-vérification que `origin/main` est toujours b914345 | — |
| d | **Vous** | Lancer : `cd "/Users/jeremie/Projets/App suivi Pro/suivi-pro-defectueux" && git push origin defectueux-multi-paires:main` — la dernière ligne doit ressembler à `b914345..xxxxxxx  defectueux-multi-paires -> main`. Vercel met en ligne tout seul (1 à 2 minutes) | voir « Marche arrière » |
| e | Claude | **Vérifications en lecture seule** : le site sert la construction de référence (à l'adresse et la clé publique de la base près) ; aucun fichier d'essai ; `api/send-mail` et `api/agenda` toujours refusés sans connexion ; nombre de lignes des tables inchangé (aucune écriture de ma part) | — |
| f | **Vous** | **Contrôle à l'écran** (recharger la page) : SAV & défectueux → « Nouveau défectueux » : la grille « Paires défectueuses » ; un essai réel n'est pas nécessaire (sinon, créez un défectueux puis supprimez-le avec sa ligne « Retour » du Cahier) ; ouvrir un ancien défectueux : il s'affiche comme avant | — |
| g | Vous | Envoyer le message aux équipes (`MESSAGE-EQUIPES-DEFECTUEUX.md`) | — |
| h | Claude | Mettre à jour `CLAUDE.md`, `SUIVI.md` ; `dev` à votre signal | — |

## Marche arrière

1. **Immédiate, sans toucher au code** : Vercel → projet suivi-pro → **Deployments** → le déploiement **b914345** (« Agenda… v2 », 14/10) → « … » → **Promote to Production**. Le site revient à la version d'avant en quelques secondes.
2. **Puis, pour remettre `main` d'accord avec le site** : la branche `defectueux-retour` est **prête et poussée** (annulation de f35b475, sans réécrire l'historique ; code identique à b914345, seuls ces deux documents en plus) ; vous lancez `cd "/Users/jeremie/Projets/App suivi Pro/suivi-pro-defectueux" && git push origin defectueux-retour:main`.

**Données après une marche arrière** : rien n'est perdu ni faux. Les dossiers créés entre-temps gardent leur ligne « Retour » juste (pointures, nombre de paires, montant) et leur avoir au Plan ; l'ancienne version affiche le résumé « 38 ×2, 39 ×1 » comme une pointure, et son mail dirait « une paire … pointure 38 ×2, 39 ×1 » (à corriger à la main le cas échéant). Aucune restauration de la base n'est nécessaire.

## Essais faits (base de test, 15/10)

`~/.suivi-pro/essais/cdp-defectueux-multi.mjs` : **33/33** à l'écran (téléphone, compte magasin) — création de 3 paires, une seule ligne « Retour » (−3, prix × 3), mail (objet « 3 paires », détail des pointures), modification tant que « À traiter » (la ligne suit), lecture seule après le mail, SAV « Retour client » avec une pointure tapée, réparation inchangée, avoir unique au Plan de règlement, mail d'un ancien dossier inchangé, dossiers existants identiques avant / après. Puis votre essai validé.
