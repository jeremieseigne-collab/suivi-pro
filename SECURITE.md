# Plan — Protection des données (B6 étape 1) et plafond d'envoi de mails

> Statut (10/10/2026) : **accord écrit pour S1, S2, S2 bis, S3 sur la base de TEST uniquement** — faits et testés sur la base de test (instructions : `supabase-securite.sql`).
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
2. ~~*(Seulement si option A)* **Dans Vercel**~~ *(option B choisie : rien à faire dans Vercel)*, ajouter une variable `SUPABASE_SERVICE_ROLE_KEY` (copiée depuis Supabase → Project Settings → API), environnement Production. Elle permet à la fonction d'envoi d'écrire dans le journal. *(Je n'ai pas la clé Vercel sur cet ordinateur.)*
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
| Accord | déjà couvert par S2 | **✅ CHOISIE — accord écrit du 10/10 (base de test uniquement)** |

État sur la base de test : S1 (filtrage), S2 (journal), **S2 bis (plafond : 10ᵉ envoi accepté, 11ᵉ refusé vers la direction ; 3ᵉ accepté, 4ᵉ refusé vers la comptable)**, S3 (5 comptes de test) faits et testés ; **inscriptions encore ouvertes** (à fermer dans le tableau de bord). **Plus aucune variable à ajouter dans Vercel.**

---
---

# Étape 2 — Paie réservée à la Direction, code PIN vérifié par la base

> Statut (11/10/2026) : **accord écrit pour E1-E5 + E4 bis sur la base de TEST uniquement — faits et testés** (instructions : `supabase-securite-etape2.sql`, code : branche `securite-etape2`).
> **E6 n'a pas été nécessaire** : l'appareil compare la liste des salariés aux prénoms fournis par `paie_remplies` (aucune fonction en plus).
> Production : nouvel accord écrit, **pas avant que les 3 magasins se soient connectés sans problème lundi 12/10**.
> Étape 1 en ligne depuis le 11/10/2026 14h28.
> **Choix faits le 11/10** : récap envoyé d'**un clic par la Direction** (option 1) · **Achats réservés à la Direction** · **Planning modifiable par tous** (inchangé).

## 1. Ce qui change

| | Aujourd'hui | Après l'étape 2 |
|---|---|---|
| **Saisies de paie** | Lisibles par tout compte connecté (les 3 magasins) | Un compte magasin peut **déposer** une saisie, **jamais en relire** une. Seuls les **2 comptes Direction** lisent, corrigent et envoient |
| **Liste « rempli / à remplir »** | Calculée en chargeant toutes les saisies | Fournie par la base **sans le contenu** (juste les prénoms déjà remplis) |
| **Récap à la comptable** | Fabriqué et envoyé par l'appareil du magasin qui valide en dernier | Quand la dernière salariée valide, **Jérémie reçoit un mail** « toutes les saisies sont faites » ; un compte Direction ouvre le récap et clique **Envoyer** |
| **Achats** | Visibles et modifiables par tous | **Direction seulement** (écran et modifications) |
| **Planning** | Modifiable par tous | **inchangé** |
| **Pointage des entrées** | Possible pour tous | **Direction seulement** (E7, décision du 11/10) |
| **Code PIN 2201** | Écrit dans le site, contournable | **Supprimé**. Plan de règlement et Paramètres (et le récap de paie) n'apparaissent que pour les comptes Direction, et la base refuse les écritures sensibles aux comptes magasin |
| **Déconnecter les appareils d'un magasin** | Une commande lancée par Claude | Un bouton dans Paramètres, réservé à la Direction |

Les 2 comptes Direction (Jérémie, Raphaël) ont exactement les mêmes droits.

## 2. Modifications de structure (demandent votre accord écrit)

| # | Modification | Conséquence | Annulation |
|---|---|---|---|
| E1 | **Marquer les 2 comptes Direction** (« direction » dans leurs informations de compte, non modifiable par l'utilisateur) | Après le marquage, chacun doit se reconnecter une fois (ou attendre ≤ 1 h) | Retirer la marque |
| E2 | **Fonction `est_direction()`** | Sert aux règles ci-dessous | La supprimer |
| E3 | **Règles sur la paie** : compte magasin = dépôt seul ; Direction = tout. **Fonction `paie_remplies(période)`** (prénoms remplis, sans contenu) | Les appareils des magasins ne peuvent plus lire aucune saisie | Remettre la règle « tout compte connecté » |
| E4 | **Règles « Direction seulement » en écriture** sur : pointages de paiement (`reglement_paye`, aussi en lecture), modes de règlement, salariés, magasins, envois de paie | Un compte magasin ne peut plus les modifier (il peut toujours lire ce dont l'outil a besoin, ex. la liste des salariés) | Remettre la règle « tout compte connecté » |
| E5 | **Fonction `deconnecter_compte(adresse)`**, réservée Direction | Révoque toutes les sessions d'un compte (déconnexion ≤ 1 h) | La supprimer |
| E4 bis | **Achats réservés à la Direction** : écriture sur les lignes d'achat (`parametres` : budgets, modèles, prix, plans chèque) réservée à la Direction ; menu « Achats » masqué pour les magasins | Les magasins ne voient plus l'écran Achats et ne peuvent plus modifier montants ni modèles. ⚠️ Ils peuvent encore **lire** ces lignes techniquement (l'outil en a besoin pour le prix des entrées) : la confidentialité des budgets n'est donc assurée qu'à l'écran, pas en base | Remettre la règle « tout compte connecté » |
| ~~E6~~ | ~~Fonction `paie_complete(période)`~~ — **non nécessaire, non créée** | | |
| E7 | **Pointage des entrées réservé à la Direction** : la base refuse à un compte magasin de pointer, dépointer ou créer une entrée déjà pointée (il crée et corrige ses entrées normalement) ; le pointage est masqué aux comptes magasin dans l'écran Entrées | Les magasins ne voient plus la colonne « Pointé », le filtre ni les boutons « Pointer / Dépointer » | Supprimer la règle (1 commande, en bas de `supabase-securite-etape2.sql`) |

Aucune donnée n'est modifiée ni supprimée. Tout est testé d'abord sur la base de test.

## 3. Choix à faire : l'envoi du récap à la comptable

Un appareil de magasin ne pourra plus lire les saisies, donc il ne pourra plus fabriquer le récap. Deux possibilités :

| | **Option 1 — un clic de la Direction** (recommandée) | **Option 2 — envoi automatique** |
|---|---|---|
| ✅ **Choisie** — Fonctionnement | Quand la dernière salariée valide, **vous recevez un mail** « Toutes les saisies d'octobre sont faites ». Vous ouvrez le récap (compte Direction) et cliquez **Envoyer** | Le serveur fabrique et envoie le récap tout seul, comme aujourd'hui |
| Secret à gérer | **Aucun** | La clé secrète `SUPABASE_SERVICE_ROLE_KEY` à ajouter dans Vercel (jamais dans le code ni le projet) |
| Bonus | Vous relisez avant envoi | Zéro action |
| E6 | une petite fonction « toutes remplies ? » pour déclencher votre mail (sans contenu) | rien en base, mais la clé dans Vercel |

## 4. Effort et mise en ligne

- **2 à 3 jours**, test complet sur la base de test compris.
- Mise en ligne comme l'étape 1 : sauvegarde → E1-E5 (et E6) → code → vous vous reconnectez avec le compte Direction → vérifications. Retour arrière : remettre les règles de l'étape 1 (1 commande) + « Instant Rollback ».
- Pour les équipes : la saisie de paie ne change pas ; **Plan de règlement, Paramètres et Achats disparaissent de leur menu**. Seul changement visible à annoncer : **les Achats**.
- Nouveau mail autorisé (ajouté à la liste fermée du serveur) : « Paie — saisies complètes — [mois] », vers Jérémie uniquement, compté dans son plafond de 10 / 24 h.

## 5. Ce qui a été construit et testé (base de test, 11/10)

- **Choix du 11/10** : rien de la liste (salariés, modèles/prix/grilles, modes de règlement) ne reste ouvert aux magasins ; écran « Vérifiez votre saisie » ajouté à la paie.
- **Dépôt d'une fiche de paie par un compte magasin** : enregistré « sans relecture » (la base refuse de lui renvoyer la fiche) ; une deuxième fiche pour la même personne et le même mois est refusée.
- **Testé** (comptes de test) : magasin = 0 fiche lisible, dépôt OK, écrasement refusé, salariés/achats non modifiables, pointages illisibles, déconnexion d'un autre compte refusée ; Direction = lecture, correction, modifications, pointages, déconnexion à distance effective (session coupée).
- **Écran** : avec un compte magasin, le menu n'affiche plus Achats, Plan de règlement, Paramètres ; avec un compte Direction, oui. Code PIN supprimé du site. Nouvel onglet Paramètres → « Appareils connectés ».
- **Mail « Paie — saisies complètes — [mois] »** vers Jérémie : ajouté à la liste fermée du serveur, compté dans le plafond de 10 / 24 h.
- **Limite mineure** : la liste « rempli / à remplir » d'un appareil magasin se met à jour au prochain changement dans l'outil (et non à l'instant où une collègue d'un autre magasin dépose sa fiche).
- **Suppression de saison** : réservée à la Direction (nom à retaper ; plus de code PIN).
- **E7 (pointage)** : accord écrit du 11/10 pour la base de test ; fait et testé sur une entrée de test (magasin : création et correction OK, pointage et création d'une entrée pointée refusés ; Direction : pointage OK). Écran Entrées : colonne, filtre et boutons de pointage masqués aux comptes magasin.
- **Part aussi avec l'étape 2 (11/10)** : ordre des statuts des entrées corrigé dans l'outil actuel — **Aucun → Enregistré → Imp. Etiquettes**, puis Réassort, Retour (nouvelle entrée, correction, changement groupé, filtre). Aucune donnée modifiée (valeur « Imp. Etiquettes » inchangée). Testé en local : les 3 listes et le filtre suivent le nouvel ordre.
