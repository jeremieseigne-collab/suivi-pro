# Suivi du chantier de refonte

> Mis à jour à chaque étape — **dernière mise à jour : dimanche 11 octobre 2026, protection mise en ligne**.
> Branches : `refonte` (dossier `Projets/suivi-pro-refonte`), `securite` (dossier `Projets/suivi-pro`). En production : `main` = correctifs I1-I3 + protection (d3b32c4) ; `dev` identique.

## Où on en est

| Étape | État |
|---|---|
| 1. Audit (`AUDIT.md`) | ✅ fait, propositions triées |
| Correctifs urgents I1-I2-I3 | ✅ **en ligne** depuis le 10/10/2026 01h13 (5 commits, vérifiés ensemble) |
| Sécurité B6 étape 1 + plafond mails (`SECURITE.md`) | ✅ **EN LIGNE depuis le dimanche 11/10/2026** : code à 14h20, filtrage activé à 14h28 (fenêtre d'exposition ~6 min). Vérifié : anonyme = 0 ligne / écriture refusée ; comptes connectés OK ; mail sans connexion refusé ; vrai mail reçu et noté au journal |
| **Sécurité B6 étape 2** — paie réservée aux comptes Direction, PIN vérifié par la base | ⏳ **plan écrit** (`SECURITE.md`, partie « Étape 2 », branche `securite`) avec vos choix du 11/10 ; **en attente de votre accord écrit** (E1 à E6, base de test d'abord) — 2 à 3 jours |
| 2. Plan, charte, maquettes (`PLAN-REFONTE.md`, `maquettes/`) | ⏳ à valider |
| 3. Construction écran par écran | à venir |
| 4. Préparation de la mise en ligne | à venir |

## Décisions prises

- 10/10 — Retenu : I1-I9, U1, U2, U3, U5, U6, U7, U8, U14, B2. Écarté pour l'instant : U12, U13. B6 : étape 1 avancée **avant** la refonte.
- 10/10 — Équipes sur ordinateur de caisse, tablette **et téléphone** : écrans magasin conçus d'abord pour le téléphone, testés aux 3 tailles.
- 10/10 — Saisie des livraisons au déballage, carton par carton → garder marque / N° / date / grille entre deux saisies.
- 10/10 — Comptes de connexion : **5 comptes** — un par magasin (contact.baillyalbi@, contact.baillyrouffiac@, contact.les2zebres@gmail.com) + **2 comptes Direction** (Jérémie, Raphaël).
- 10/10 — Mails : journal + plafond (3 récaps / 24 h vers Marion, 10 demandes / 24 h vers vous), **option B** (fonction en base, aucune clé secrète).
- 10/10 — Les 2 comptes Direction (Jérémie, Raphaël) ont les mêmes droits.
- 11/10 — Étape 2 : récap de paie envoyé d'un clic par la Direction (mail « saisies complètes » à Jérémie) ; Achats réservés à la Direction ; Planning modifiable par tous.
- 11/10 — Règle ajoutée au CLAUDE.md : **aucun test destructif sur la production**.
- 11/10 — Mots de passe de production recopiés en lieu sûr par vous ; fichiers `comptes-production.txt` et `messages-equipes.txt` supprimés.
- 10/10 — Les ~65 suppressions de marques en production depuis juin sont bien de vous (nettoyage et fusion de doublons) : pas d'activité suspecte.
- 10/10 — Le rituel de fin de session du `CLAUDE.md` (déploiement automatique) est **suspendu** pendant le chantier.
- 10/10 — En local, les mails ne partent jamais (affichés dans le terminal) ; `SEND_REAL_MAIL=1` pour réactiver.

## Points à retenir

- Sauvegardes de la production : `~/Sauvegardes/suivi-pro/` (notice `LISEZMOI.txt` ; restauration testée — **ne pas oublier l'étape des autorisations**).
- Écarts de structure base de test / production : colonne inutilisée `commandes.type` (test seulement) ; `sav.id` numéroté différemment. Sans effet sur l'outil.
- À reprendre par vous : 13 retours à 0 €, 57 entrées à 0 € (liste dans `VERIFICATIONS-PROD.md`, local) ; chèque Reqins Albi daté du 15/09 à vérifier ; mot de passe d'application « Suivi Pro local » sur bshoes.albi à supprimer s'il ne sert plus.

## 📅 JOUR J — dimanche 11 octobre : mise en ligne de la protection

> **Déclencheur** : vous écrivez « **on met en ligne** ». Rien ne se fait avant, même dans une nouvelle conversation.
> Accord écrit déjà donné (10/10) pour S1, S2, S2 bis, S3 en production. Magasins fermés.

### Où sont les choses
- Code : branche **`securite`** (dossier `Projets/suivi-pro`), partie de la version en ligne (`main`) + 8 commits : connexion, déconnexion, mails réservés aux appareils connectés, plafond, `SECURITE.md`, `supabase-securite.sql`.
- Instructions de base testées : **`supabase-securite.sql`** (S2, S2 bis, puis S1 en dernier ; retour arrière en bas du fichier).
- Mots de passe de production : `~/.suivi-pro/comptes-production.txt` (privé, hors projet). Messages équipes : `~/.suivi-pro/messages-equipes.txt`.
- Production : projet Supabase `fftfrbpcsazkkvahscbg` (`.prod-db-url.local`), site `https://suivi-pro-app.vercel.app`.

### Déroulé (dans cet ordre)
1. **Contrôles** : `git fetch` — rien de nouveau sur `origin/main` / `origin/dev` (sinon s'arrêter et en parler) ; `securite` part bien de `origin/main`.
2. **Sauvegarde fraîche de la production** dans `~/Sauvegardes/suivi-pro/prod-AAAA-MM-JJ_HHhMM-avant-protection/` (+ copie de `LISEZMOI.txt`), vérifiée (17 tables).
3. **Vous** : fermer les inscriptions de la production — Supabase → projet `fftfrbpcsazkkvahscbg` → Authentication → Sign In / Providers → désactiver « Allow new users to sign up » → Save. **Claude vérifie** (`/auth/v1/settings` → `disable_signup: true`). ⛔ Ne pas aller plus loin tant que ce n'est pas fermé.
4. **Claude crée les 5 comptes** de production (même méthode que sur la base de test, mots de passe du fichier privé) et teste une connexion.
5. **Claude applique S2 + S2 bis** (journal + fonction de plafond) sur la production. Sans effet sur l'outil actuel.
6. **Mise en ligne du code** : `main` avancé sur `securite` (avance simple), envoi sur GitHub → Vercel. Attendre que le site en ligne contienne « Connectez cet appareil ». À partir d'ici, tout appareil non connecté voit l'écran de connexion.
7. **Vous** : vous connecter sur le site en ligne avec le compte Direction 1, vérifier que tout s'affiche.
8. **Claude active S1 (filtrage) immédiatement** — fenêtre d'exposition limitée aux étapes 6 → 8.
9. **Vérifications ensemble** :
   - accès anonyme direct à la base : 0 ligne visible, écriture refusée ;
   - outil connecté : lecture, saisie, mise à jour en temps réel (2 appareils ou 2 onglets) ;
   - mail sans connexion : refusé ; appel anonyme du plafond : refusé ;
   - une vraie « demande de modification paie » envoyée à vous depuis l'outil connecté : reçue, et notée dans le journal.
10. **Synchroniser `dev`** sur `main` et l'envoyer (pour l'autre ordinateur). Fusionner aussi dans `refonte`.
11. Les équipes se connectent lundi à l'ouverture avec le message reçu samedi.

### En cas de problème
- **Désactiver S1** (bloc « RETOUR ARRIÈRE » en bas de `supabase-securite.sql`) : effet immédiat, aucune donnée touchée.
- **Vercel → Deployments → déploiement précédent → « Instant Rollback »** : l'ancienne version (sans connexion) revient.
- Les comptes, le journal et la fonction de plafond peuvent rester en place : ils n'ont aucun effet sur l'ancienne version.
- Restauration complète : voir `LISEZMOI.txt` de la sauvegarde (⚠️ étape des autorisations).

### Après le jour J
- Sécurité étape 2 (paie réservée aux 2 comptes Direction, PIN vérifié par la base) — 2 à 3 jours, accord écrit à demander.
- Puis reprise de la refonte : validation du plan et des maquettes (direction A recommandée).

## Sécurité B6 étape 2 (prévue juste après l'étape 1)

- **Deux comptes Direction** : Jérémie (jeremie.seigne@gmail.com) et Raphaël (raphaelseigne04@gmail.com, gère Rouffiac), reconnus par la base (marque « direction » sur le compte) : les règles d'accès distinguent comptes magasin et Direction.
- **Périmètre du compte de Raphaël : tout, comme Jérémie** (décision du 10/10) — les deux comptes Direction ont exactement les mêmes droits.
- **Paie** : les comptes magasin peuvent **déposer** une saisie mais **pas relire** celles des autres ; la liste « rempli / à remplir » passe par une vue sans le contenu ; récap, corrections et envoi réservés à la Direction ; l'envoi automatique du récap se fait côté serveur.
- **Code PIN supprimé du site** : Plan de règlement, Réglages (et ce qu'on décidera de réserver) ne s'ouvrent qu'avec le compte Direction, **vérifié par la base** et non plus à l'écran.
- **Bouton « Déconnecter tous les appareils d'un magasin »** dans Réglages.
- Limite à connaître : avec un compte par magasin, une collègue peut remplir la paie « au nom » d'une autre sur le même appareil. Seuls des comptes par personne régleraient ce point (à rediscuter si besoin).
- Effort : **moyen à gros, 2 à 3 jours** (test complet sur la base de test compris). Modifie la structure de la base → accord écrit.

## Reste à faire

- [x] Accord écrit (base de test) et construction de la protection étape 1 sur la base de test
- [x] Choix du plafond (option B), vraies adresses (5 comptes)
- [x] Inscriptions fermées sur la base de test (vérifié le 10/10)
- [x] Accord écrit pour la production : S1, S2, S2 bis, S3 (10/10)
- [x] Messages aux équipes datés du dimanche 11 octobre (à envoyer le samedi 10 par vous)
- [x] **Jour J — dimanche 11 octobre** : fait (étapes 1 à 10) ; sauvegarde `~/Sauvegardes/suivi-pro/prod-2026-10-11_14h17-avant-protection/`
- [ ] Sécurité étape 2 (paie Direction, PIN côté serveur)
- [ ] Validation du plan et des maquettes (direction A ou B)
- [ ] Étape 3 : socle, puis les écrans dans l'ordre du plan
