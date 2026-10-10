# Suivi du chantier de refonte

> Mis à jour à chaque étape. Branches : `refonte` (dossier `Projets/suivi-pro-refonte`), `securite` (dossier `Projets/suivi-pro`).

## Où on en est

| Étape | État |
|---|---|
| 1. Audit (`AUDIT.md`) | ✅ fait, propositions triées |
| Correctifs urgents I1-I2-I3 | ✅ **en ligne** depuis le 10/10/2026 01h13 (5 commits, vérifiés ensemble) |
| Sécurité B6 étape 1 + plafond mails (`SECURITE.md`, branche `securite`) | ⏳ **fait et testé sur la base de test** (accord du 10/10, test uniquement) ; reste : fermer les inscriptions (tableau de bord), choix A/B du plafond, vraies adresses, puis **nouvel accord écrit** pour la production |
| **Sécurité B6 étape 2** — paie réservée au compte Direction, PIN vérifié côté serveur | à faire **juste après l'étape 1**, avant la refonte — effort **moyen à gros (2 à 3 jours)** |
| 2. Plan, charte, maquettes (`PLAN-REFONTE.md`, `maquettes/`) | ⏳ à valider |
| 3. Construction écran par écran | à venir |
| 4. Préparation de la mise en ligne | à venir |

## Décisions prises

- 10/10 — Retenu : I1-I9, U1, U2, U3, U5, U6, U7, U8, U14, B2. Écarté pour l'instant : U12, U13. B6 : étape 1 avancée **avant** la refonte.
- 10/10 — Équipes sur ordinateur de caisse, tablette **et téléphone** : écrans magasin conçus d'abord pour le téléphone, testés aux 3 tailles.
- 10/10 — Saisie des livraisons au déballage, carton par carton → garder marque / N° / date / grille entre deux saisies.
- 10/10 — Comptes de connexion : un par magasin + un compte direction, identifiants = vraies adresses mail.
- 10/10 — Mails : journal + plafond (3 récaps/jour vers Marion, 10 demandes/jour vers vous).
- 10/10 — Le rituel de fin de session du `CLAUDE.md` (déploiement automatique) est **suspendu** pendant le chantier.
- 10/10 — En local, les mails ne partent jamais (affichés dans le terminal) ; `SEND_REAL_MAIL=1` pour réactiver.

## Points à retenir

- Sauvegardes de la production : `~/Sauvegardes/suivi-pro/` (notice `LISEZMOI.txt` ; restauration testée — **ne pas oublier l'étape des autorisations**).
- Écarts de structure base de test / production : colonne inutilisée `commandes.type` (test seulement) ; `sav.id` numéroté différemment. Sans effet sur l'outil.
- À reprendre par vous : 13 retours à 0 €, 57 entrées à 0 € (liste dans `VERIFICATIONS-PROD.md`, local) ; chèque Reqins Albi daté du 15/09 à vérifier ; mot de passe d'application « Suivi Pro local » sur bshoes.albi à supprimer s'il ne sert plus.

## Sécurité B6 étape 2 (prévue juste après l'étape 1)

- **Compte Direction reconnu par la base** (marque « direction » sur le compte) : les règles d'accès distinguent comptes magasin et Direction.
- **Paie** : les comptes magasin peuvent **déposer** une saisie mais **pas relire** celles des autres ; la liste « rempli / à remplir » passe par une vue sans le contenu ; récap, corrections et envoi réservés à la Direction ; l'envoi automatique du récap se fait côté serveur.
- **Code PIN supprimé du site** : Plan de règlement, Réglages (et ce qu'on décidera de réserver) ne s'ouvrent qu'avec le compte Direction, **vérifié par la base** et non plus à l'écran.
- **Bouton « Déconnecter tous les appareils d'un magasin »** dans Réglages.
- Limite à connaître : avec un compte par magasin, une collègue peut remplir la paie « au nom » d'une autre sur le même appareil. Seuls des comptes par personne régleraient ce point (à rediscuter si besoin).
- Effort : **moyen à gros, 2 à 3 jours** (test complet sur la base de test compris). Modifie la structure de la base → accord écrit.

## Reste à faire

- [x] Accord écrit (base de test) et construction de la protection étape 1 sur la base de test
- [ ] Fermer les inscriptions (base de test), choix A/B du plafond, vraies adresses, nouvel accord écrit pour la production
- [ ] Sécurité étape 2 (paie Direction, PIN côté serveur)
- [ ] Validation du plan et des maquettes (direction A ou B)
- [ ] Étape 3 : socle, puis les écrans dans l'ordre du plan
