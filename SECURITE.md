# Plan — Protection des données (B6 étape 1) et plafond d'envoi de mails

> Statut (10/10/2026) : **accord écrit pour S1, S2, S3 sur la base de TEST uniquement** — fait et testé sur la base de test.
> La production demandera un **nouvel accord écrit**.
> Décisions prises le 10/10/2026 : avant la refonte · un compte par magasin + un compte direction · journal + plafond pour les mails.

---

## 1. Ce qu'on corrige

Aujourd'hui, **n'importe qui connaissant l'adresse du site peut lire, modifier ou effacer toutes les données** (17 tables, paie comprise) sans passer par l'outil, et peut **inonder** votre boîte et celle de Marion via l'envoi de mails. Le code PIN n'est qu'un masque à l'écran.

Après ce chantier :
- la base **ne répond plus qu'aux appareils connectés** avec un compte de l'outil ;
- l'envoi de mails **n'accepte que les appareils connectés**, et au plus **3 récaps / jour vers Marion** et **10 demandes / jour vers vous**.

Ce qui **ne change pas encore** (étapes suivantes, plus tard) : le code PIN reste un simple masque à l'écran entre comptes connectés ; la paie reste lisible par tout compte connecté.

---

## 2. Ce qui change pour les équipes

- **Un écran de connexion** à la première ouverture sur chaque appareil (identifiant + mot de passe du magasin). Ensuite l'appareil **reste connecté** (plus besoin de se reconnecter, sauf déconnexion volontaire ou effacement du navigateur).
- Un bouton **« Se déconnecter »** dans le menu.
- Rien d'autre ne change dans l'utilisation.

5 comptes (identifiants = vraies adresses, en production uniquement ; la base de test utilise des adresses fictives) :

| Compte | Identifiant | Pour |
|---|---|---|
| Bailly Albi | contact.baillyalbi@gmail.com | appareils du magasin d'Albi |
| Bailly Rouffiac | contact.baillyrouffiac@gmail.com | appareils de Rouffiac |
| Les 2 Zèbres | contact.les2zebres@gmail.com | appareils des 2 Zèbres |
| Direction 1 — Jérémie Seigné | jeremie.seigne@gmail.com | vous |
| Direction 2 — Raphaël Seigné | raphaelseigne04@gmail.com | Raphaël (gère Rouffiac) |

Pour cette étape 1, les 5 comptes ont exactement les mêmes droits (tout compte connecté). La distinction magasin / Direction arrive à l'étape 2.

---|---|
| Bailly Albi | appareils du magasin d'Albi |
| Bailly Rouffiac | appareils de Rouffiac |
| Les 2 Zèbres | appareils des 2 Zèbres |
| Direction | vous |

---

## 3. Modifications de structure de la base (ce qui demande votre accord)

| # | Modification | Conséquence | Comment l'annuler |
|---|---|---|---|
| S1 | **Activer le filtrage** (« RLS ») sur les 17 tables existantes, avec une seule règle : *un compte connecté peut tout faire, un visiteur anonyme rien* | La clé publique seule ne donne plus accès à rien. **Aucune donnée n'est modifiée ni supprimée.** | Une commande désactive le filtrage sur les 17 tables (retour exact à aujourd'hui) |
| S2 | **Nouvelle table `mail_envois`** (date, destinataire, objet) — ajout seul | Sert à compter les envois. Filtrage activé **sans aucune règle** : illisible et non modifiable depuis l'extérieur, seule la fonction d'envoi y accède | Supprimer la table (elle ne contient que le journal des mails) |
| S3 | **Création des 5 comptes** + **fermeture des inscriptions publiques** dans Supabase | Personne ne peut se créer un compte soi-même | Supprimer les comptes / rouvrir les inscriptions |

Tout est fait **d'abord sur la base de test**, testé en local, puis sur la production après votre feu vert.

---

## 4. Ce qui change dans le code

- `src/lib/supabase.js` : la connexion garde la session de l'appareil (déjà le comportement par défaut de Supabase).
- **Écran de connexion** (simple, au style actuel — il sera redessiné avec la refonte) affiché tant que l'appareil n'est pas connecté ; bouton « Se déconnecter ».
- `api/send-mail.js` : refuse toute demande sans **jeton de connexion valide** ; compte les envois du jour dans `mail_envois` et refuse au-delà du plafond.
- `src/paie/mail.js` : envoie le jeton de connexion avec la demande.

---

## 5. Ce que vous aurez à faire (je vous guide pas à pas)

1. ~~Choisir les identifiants~~ ✅ fait (voir §2). Me laisser définir les mots de passe des 5 comptes, que vous noterez et transmettrez à chaque magasin.
2. *(Seulement si option A, voir §9)* **Dans Vercel**, ajouter une variable `SUPABASE_SERVICE_ROLE_KEY` (copiée depuis Supabase → Project Settings → API), environnement Production. Elle permet à la fonction d'envoi d'écrire dans le journal. *(Je n'ai pas la clé Vercel sur cet ordinateur.)*
3. **Le jour J**, connecter chaque appareil des magasins (ou laisser les équipes le faire avec le message que je préparerai).

---

## 6. Mise en ligne — ordre révisé (données ouvertes le moins longtemps possible)

**Oui, on peut activer le filtrage dès que vous êtes connecté avec un compte**, sans attendre les appareils des magasins. Raison : le nouveau code affiche l'écran de connexion à **tout** appareil non connecté, avec ou sans filtrage. Le filtrage ne change donc rien pour les appareils pas encore connectés ; il ferme seulement l'accès direct à la base.

1. Sauvegarde fraîche de la production.
2. Création des 5 comptes + **fermeture des inscriptions** (S3) ; table du journal (S2).
3. Mise en ligne du nouveau code.
4. Vous vous connectez avec le compte Direction et vérifiez que tout s'affiche.
5. **Activation du filtrage (S1) immédiatement** — la fenêtre d'exposition se limite à quelques minutes (entre 3 et 5).
6. Vérifications ensemble (accès anonyme refusé, envoi de mail sans connexion refusé, plafond).
7. Les appareils des magasins se connectent au fil de l'eau.

La vraie contrainte n'est pas le filtrage mais **la connexion des appareils** : dès l'étape 3, un appareil non connecté ne montre plus que l'écran de connexion. Il faut donc que les équipes aient **le mot de passe de leur magasin avant l'étape 3** (message prêt), et le faire magasins fermés. Un appareil resté ouvert sur l'ancienne page affichera des erreurs jusqu'à ce qu'on le recharge.

**Retour arrière** : désactiver le filtrage (1 commande, effet immédiat) et, si besoin, « Instant Rollback » dans Vercel. Aucune donnée n'est touchée dans un sens comme dans l'autre.

---

## 7. Déconnecter un appareil à distance (salarié qui part, téléphone perdu)

**Changer le mot de passe du magasin ne suffit pas à coup sûr** : un appareil déjà connecté garde sa session. Procédure complète :
1. Changer le mot de passe du compte du magasin (Supabase → Authentication → Users).
2. **Révoquer toutes les sessions de ce compte** (une commande que je lance, ou le tableau de bord Supabase).
3. Les appareils concernés sont déconnectés **au plus tard 1 heure après** (durée de validité d'une session ; réglable plus courte, par ex. 15 min).
4. Reconnecter les appareils légitimes avec le nouveau mot de passe.

Avec un compte par magasin, on ne peut pas viser **un seul** appareil : tous les appareils de ce magasin devront se reconnecter. Un bouton « Déconnecter tous les appareils de ce magasin » sera ajouté dans Réglages avec l'étape 2 (compte Direction).

---

## 8. Ce que le test a révélé : les inscriptions libres sont ouvertes

Sur la base de test (et très probablement en production), **n'importe qui peut se créer un compte** avec sa propre adresse. Avec la règle « tout compte connecté peut tout faire », ce serait une porte d'entrée complète. **La fermeture des inscriptions (S3) est donc indispensable** et doit être faite **avant** l'activation du filtrage. Ce réglage se change uniquement dans le tableau de bord Supabase : Authentication → Sign In / Providers → désactiver « Allow new users to sign up ». *(À faire par vous sur la base de test maintenant, puis sur la production le jour J — je vous guide.)*

---

## 9. La clé secrète `SUPABASE_SERVICE_ROLE_KEY`

Engagement : cette clé ne sera **jamais** dans le code, **jamais** dans un fichier du projet (même ignoré par Git), **jamais** dans une variable commençant par `VITE_` (ces variables sont copiées dans le site public).

Deux façons de faire fonctionner le journal des mails :

| | **Option A — clé secrète** (prévue) | **Option B — fonction en base** (recommandée) |
|---|---|---|
| Principe | La fonction d'envoi écrit dans le journal avec la clé secrète | Une petite fonction dans la base (« noter l'envoi et vérifier le plafond ») est appelée avec la connexion de l'appareil |
| Clé secrète | Dans Vercel uniquement (variable `SUPABASE_SERVICE_ROLE_KEY`, Production) ; en local, rangée **hors du projet** (`~/.suivi-pro/`) | **Aucune clé secrète nécessaire**, rien à ajouter dans Vercel |
| Inconvénient | Une clé toute-puissante de plus à protéger | Un compte connecté pourrait « consommer » le plafond du jour (bloquer l'envoi), sans pouvoir envoyer de mail par ce biais |
| Accord | déjà couvert par S2 | **nouvel élément de structure (S2 bis) : demande votre accord écrit** |

État sur la base de test : S1 (filtrage), S2 (table du journal), S3 (5 comptes de test) faits et testés ; **inscriptions encore ouvertes** (à fermer dans le tableau de bord) ; plafond des mails en attente du choix A / B.
