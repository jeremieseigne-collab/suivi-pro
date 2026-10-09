# Plan — Protection des données (B6 étape 1) et plafond d'envoi de mails

> Statut : **proposition, en attente de votre accord écrit**. Rien n'a été modifié dans les bases.
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

4 comptes :

| Compte | Pour |
|---|---|
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
| S3 | **Création des 4 comptes** + **fermeture des inscriptions publiques** dans Supabase | Personne ne peut se créer un compte soi-même | Supprimer les comptes / rouvrir les inscriptions |

Tout est fait **d'abord sur la base de test**, testé en local, puis sur la production après votre feu vert.

---

## 4. Ce qui change dans le code

- `src/lib/supabase.js` : la connexion garde la session de l'appareil (déjà le comportement par défaut de Supabase).
- **Écran de connexion** (simple, au style actuel — il sera redessiné avec la refonte) affiché tant que l'appareil n'est pas connecté ; bouton « Se déconnecter ».
- `api/send-mail.js` : refuse toute demande sans **jeton de connexion valide** ; compte les envois du jour dans `mail_envois` et refuse au-delà du plafond.
- `src/paie/mail.js` : envoie le jeton de connexion avec la demande.

---

## 5. Ce que vous aurez à faire (je vous guide pas à pas)

1. **Choisir les identifiants** des 4 comptes (une adresse mail par compte — voir question ci-dessous) et me laisser définir des mots de passe que vous noterez.
2. **Dans Vercel**, ajouter une variable `SUPABASE_SERVICE_ROLE_KEY` (copiée depuis Supabase → Project Settings → API), environnement Production. Elle permet à la fonction d'envoi d'écrire dans le journal. *(Je n'ai pas la clé Vercel sur cet ordinateur.)*
3. **Le jour J**, connecter chaque appareil des magasins (ou laisser les équipes le faire avec le message que je préparerai).

---

## 6. Mise en ligne — l'ordre compte

Si on active le filtrage **avant** que l'écran de connexion soit en ligne et que les appareils soient connectés, l'outil n'affiche plus rien. D'où l'ordre :

1. Sauvegarde fraîche de la production.
2. Création des comptes + fermeture des inscriptions (S3) et table `mail_envois` (S2).
3. Mise en ligne du nouveau code (l'outil marche déjà avec ou sans filtrage).
4. Connexion des appareils des magasins (magasins fermés, ou au fil de la journée).
5. **Activation du filtrage (S1)** — instantanée.
6. Vérifications ensemble : l'outil fonctionne une fois connecté ; un accès anonyme direct à la base est refusé ; un envoi de mail sans connexion est refusé ; le plafond fonctionne.

**Retour arrière** : désactiver le filtrage (1 commande, effet immédiat) et, si besoin, « Instant Rollback » dans Vercel. Aucune donnée n'est touchée dans un sens comme dans l'autre.

Effort : 1 à 2 jours, test complet sur la base de test compris.
