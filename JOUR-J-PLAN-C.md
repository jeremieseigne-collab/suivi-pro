# Jour J — mise en ligne du plan C

> **Déclencheur** : votre accord écrit **avec la date** (« on met en ligne le plan C le … »). Rien ne se fait avant, même dans une nouvelle conversation.
> **Code** : branche **`plan-c-fusion`** (dossier `Projets/App suivi Pro/suivi-pro-fusion`) = tout le plan C (étapes 1, 2, 2 bis, 3, 7, 4, 5 bis, 6, 7 bis) **+ la version en ligne** (`main` 11b8e1e, défectueux sur plusieurs paires), + les correctifs du 22-23/10 (annulation d'une suppression groupée, réceptions exclues de la suppression groupée). `dev` = cette branche.
> **Base** : 6 fichiers SQL, dans cet ordre, **chacun en une seule transaction** (une erreur = rien d'appliqué pour ce fichier, on s'arrête) :
> `supabase-plan-c.sql` → `supabase-plan-c-2bis.sql` → `supabase-plan-c-complements.sql` → `supabase-plan-c-etape3.sql` → `supabase-plan-c-etape6.sql` → `supabase-plan-c-etape7bis.sql`.
> Ils **ajoutent** (tables, colonnes, fonctions, déclencheurs, règles d'accès, temps réel) ; aucune donnée existante n'est effacée. Trois écritures voulues : fournisseurs créés à partir des marques et de leurs groupes (dans de nouvelles tables), réassorts « Commandé / En route » d'Été 2027 et après repris en commandes (aucun aujourd'hui), Reçu N-1 déjà tapés marqués « saisi ».
> **Répétition générale du 23/10 sur une copie de la production** : voir le dernier chapitre.
> **Date : vendredi 23 octobre 2026, à partir de 19 h 30**, magasins fermés, avec **45 minutes** devant vous. Personne ne saisit pendant ce temps (le message aux équipes, envoyé avant 19 h 30, le demande).

## Ce que les magasins vivent

- **Pendant le SQL (≈ 10 secondes)** : l'outil reste utilisable. Mesuré à la répétition : 9 s pour les 6 fichiers ; une sonde qui interrogeait l'outil toutes les 250 ms n'a eu **aucune erreur**, une seule réponse ralentie (1,4 s au lieu de 0,1 s).
- **Entre le SQL et le nouveau code (2 à 5 minutes)** : les appareils gardent l'ancienne version, qui **fonctionne sur la base migrée** (le plan C n'enlève rien de ce qu'elle lit ou écrit ; vérifié à la répétition, voir plus bas). Seules précautions, pour la Direction : ne pas modifier les modes de règlement ni les groupes de marques dans Réglages pendant ces minutes (l'ancienne version les écrit à l'ancien endroit, le plan C les lit au nouveau).
- **Après la mise en ligne** : chaque appareil passe à la nouvelle version au prochain rechargement de la page (téléphone : fermer et rouvrir l'onglet). Un appareil resté ouvert sur l'ancienne version continue de fonctionner.
- **Temps d'indisponibilité totale : aucun** ; ralentissement possible de l'ordre d'une seconde pendant les ≈ 10 s du SQL.

## Déroulé — vendredi 23 octobre 2026, à partir de 19 h 30

Toutes les commandes « **Vous** » se collent telles quelles dans le **Terminal** du Mac (zsh, le shell par défaut ; elles refusent de tourner ailleurs). Elles lisent la connexion à la production dans `.prod-db-url.local`, **ne l'affichent jamais** (un éventuel message d'erreur est filtré), vérifient d'abord que le fichier vise bien la production et **s'arrêtent à la première erreur**. Claude ne fait **aucune écriture en production** : il ne lance que des lectures (sauvegarde, vérifications).

| # | Qui | Quoi | Si ça ne va pas |
|---|---|---|---|
| 1 | Claude | **Aucun essai ne tourne** (règle « scripts d'essai » de CLAUDE.md) : arrêt des serveurs locaux d'essai (5173, 5179, 5180) et des navigateurs d'essai, vérification qu'aucun script d'essai n'est en cours. Rien ne sera relancé avant la fin de l'étape 13. | — |
| 2 | Claude | **Sauvegarde complète de la production, vérifiée** (lecture seule ; ≈ 1 min) : `node ~/.suivi-pro/repetition/sauvegarde-complete.mjs prod prod-2026-10-23_HHhMM-avant-plan-c` → `~/Sauvegardes/suivi-pro/prod-2026-10-23_…-avant-plan-c/` (`base-complete.dump`, `base-complete.sql`, `nombre-de-lignes.txt`, `temps-reel.txt`, `LISEZMOI.txt`). **Vérification** : restaurée dans une base jetable du serveur de test, chaque table comparée à la production (nombre de lignes + empreinte du contenu), base jetable supprimée. Puis **relevé d'avant** (lecture seule) : `node ~/.suivi-pro/repetition/verif-jour-j.mjs prod avant` (coordonnées de chaque marque × magasin, nombre de lignes, Reçu N-1 tapés, réassorts). | Sauvegarde non identique : **on s'arrête**. |
| 3 | Claude | **Contrôles du code** (lecture seule) : `origin/main` est toujours **11b8e1e** (sinon on s'arrête) ; `plan-c-fusion` contient `origin/main` ; construction locale sans erreur ; `plan-c-retour` (code = 11b8e1e) à jour sur la tête de `plan-c-fusion` et poussée. | On s'arrête. |
| 4 | **Vous** | **Noter deux chiffres** sur https://suivi-pro-app.vercel.app (compte Direction) : Plan de règlement, Hiver 2026 : « Total à régler » et « Reste à payer ». | — |
| 5 | **Vous** | **SQL du plan C** : commande **S** ci-dessous (≈ 10 s). Vous devez voir 6 lignes « ✔ … appliqué », une ligne « NOTICE: Conversion : 101 marques, 100 fournisseurs, 172 modes, 8 plans chèques » (chiffres de la répétition ; ils peuvent varier si une marque a été ajoutée depuis), un petit tableau vide « synchroniser_reassort (0 rows) » (normal : aucun réassort d'Été 2027 à reprendre), puis « TERMINÉ : les 6 fichiers sont appliqués ». | « ARRÊT : erreur dans … » : ce fichier n'a rien appliqué, les suivants n'ont pas été lancés. Copiez-moi le message ; marche arrière **A** si on renonce. |
| 6 | Claude | **Vérifications d'après le SQL** (lecture seule) : `node ~/.suivi-pro/repetition/verif-jour-j.mjs prod apres` — 26 tables ; anciennes tables au même nombre de lignes ; coordonnées identiques à l'étape 2 ; correspondance des 3 magasins ; chaque marque a un fournisseur ; Reçu N-1 tapés tous « saisi » ; réassorts inchangés ; filtrage par ligne sur toutes les tables ; temps réel. Doit finir par « TOUT EST CONFORME ». | Écart : marche arrière **A**. |
| 7 | **Vous** | **Mise en ligne du code** : `cd "/Users/jeremie/Projets/App suivi Pro/suivi-pro-fusion" && git push origin plan-c-fusion:main` — la dernière ligne doit ressembler à `11b8e1e..xxxxxxx  plan-c-fusion -> main`. Vercel met en ligne tout seul (1 à 2 minutes). | Refus (main a bougé) : rien n'a changé côté code ; on s'arrête. |
| 8 | Claude | **Vérifier le déploiement** (lecture seule) : le site sert exactement la construction locale de la branche (comparaison octet pour octet, à l'adresse et la clé publique près) ; `api/send-mail` et `api/agenda` refusés sans connexion. | Marche arrière **B**. |
| 9 | **Vous** | **Marquage « saisi » rejoué** : commande **M** ci-dessous (au cas où un Reçu N-1 aurait été tapé avec l'ancienne version entre les étapes 5 et 8). Attendu : `UPDATE 0`. | — |
| 10 | **Vous** | **Contrôles à l'écran** (liste plus bas), page rechargée, sur ordinateur puis téléphone ; les deux chiffres de l'étape 4 doivent être identiques. | Marche arrière **B**. |
| 11 | **Vous** | **Décision « on garde »** : c'est le **point de non-retour** (voir plus bas). | — |
| 12 | Vous | Si besoin, un mot aux équipes pour dire que c'est fini (le message principal part **avant 19 h 30**, plus bas). | — |
| 13 | Claude | Mettre à jour `CLAUDE.md`, `SUIVI.md`, `VERIFICATION-PLAN-C.md` ; `dev` = `main` ; effacer le relevé d'avant (`~/.suivi-pro/repetition/jour-j-avant-prod.json`, coordonnées réelles) ; relance des essais **seulement après** (sur la base de test). | — |

### Commande S — SQL du plan C (étape 5)

```zsh
cd "/Users/jeremie/Projets/App suivi Pro/suivi-pro-fusion" && ( [ -n "$ZSH_VERSION" ] || { echo "ARRÊT : à coller dans le Terminal en zsh (le shell par défaut du Mac)"; exit 1; }; setopt pipefail; LIEN=../suivi-livraisons/.prod-db-url.local; grep -q fftfrbpcsazkkvahscbg $LIEN || { echo "ARRÊT : ce fichier ne contient pas le lien de la production"; exit 1; }; for f in supabase-plan-c.sql supabase-plan-c-2bis.sql supabase-plan-c-complements.sql supabase-plan-c-etape3.sql supabase-plan-c-etape6.sql supabase-plan-c-etape7bis.sql; do echo "→ $f"; if /opt/homebrew/opt/libpq/bin/psql -X -q -v ON_ERROR_STOP=1 -d "$(cat $LIEN)" -f "$f" 2>&1 | sed -E 's#postgres(ql)?://[^ ]*#<lien masqué>#g; s#(user|utilisateur) "[^"]*"#\1 "<masqué>"#g; s#(server at|serveur) "[^"]*"#\1 "<masqué>"#g'; then echo "  ✔ $f appliqué"; else echo "ARRÊT : erreur dans $f — ce fichier n'a rien appliqué, les suivants n'ont pas été lancés"; exit 1; fi; done; echo "TERMINÉ : les 6 fichiers sont appliqués" )
```

### Commande M — marquage « saisi » rejoué (étape 9)

```zsh
cd "/Users/jeremie/Projets/App suivi Pro/suivi-pro-fusion" && ( [ -n "$ZSH_VERSION" ] || { echo "ARRÊT : à coller dans le Terminal en zsh (le shell par défaut du Mac)"; exit 1; }; setopt pipefail; LIEN=../suivi-livraisons/.prod-db-url.local; grep -q fftfrbpcsazkkvahscbg $LIEN || { echo "ARRÊT : ce fichier ne contient pas le lien de la production"; exit 1; }; /opt/homebrew/opt/libpq/bin/psql -X -v ON_ERROR_STOP=1 -d "$(cat $LIEN)" -c "update public.parametres set recu_n1_saisi = true where coalesce(recu_n1, 0) <> 0 and not recu_n1_saisi;" 2>&1 | sed -E 's#postgres(ql)?://[^ ]*#<lien masqué>#g; s#(user|utilisateur) "[^"]*"#\1 "<masqué>"#g; s#(server at|serveur) "[^"]*"#\1 "<masqué>"#g' )
```

### Commande A — marche arrière de la base (cas A)

```zsh
cd "/Users/jeremie/Projets/App suivi Pro/suivi-pro-fusion" && ( [ -n "$ZSH_VERSION" ] || { echo "ARRÊT : à coller dans le Terminal en zsh (le shell par défaut du Mac)"; exit 1; }; setopt pipefail; LIEN=../suivi-livraisons/.prod-db-url.local; grep -q fftfrbpcsazkkvahscbg $LIEN || { echo "ARRÊT : ce fichier ne contient pas le lien de la production"; exit 1; }; for f in supabase-plan-c-etape7bis-annulation.sql supabase-plan-c-etape6-annulation.sql supabase-plan-c-etape3-annulation.sql supabase-plan-c-complements-annulation.sql supabase-plan-c-2bis-annulation.sql supabase-plan-c-annulation.sql; do echo "→ $f"; if /opt/homebrew/opt/libpq/bin/psql -X -q -v ON_ERROR_STOP=1 -d "$(cat $LIEN)" -f "$f" 2>&1 | sed -E 's#postgres(ql)?://[^ ]*#<lien masqué>#g; s#(user|utilisateur) "[^"]*"#\1 "<masqué>"#g; s#(server at|serveur) "[^"]*"#\1 "<masqué>"#g'; then echo "  ✔ $f appliqué"; else echo "ARRÊT : erreur dans $f — ce fichier n'a rien appliqué, les suivants n'ont pas été lancés"; exit 1; fi; done; echo "TERMINÉ : la base est revenue à l'état d'avant le plan C" )
```

Les trois commandes ont été essayées le 23/10 sur des bases jetables du serveur de test (même texte, seul le fichier de connexion changeait) : arrêt à la première erreur sans rien appliquer, parcours complets réussis (A puis S sur une base contenant des commandes, réceptions et suppressions journalisées), aucune partie de la connexion affichée.

## Contrôles à l'écran (étape 10)

Sur **https://suivi-pro-app.vercel.app**, page rechargée. On regarde, on n'écrit rien de réel.

1. **Plan de règlement** (Direction), Hiver 2026 puis Été 2026 : mêmes « Total à régler » et « Reste à payer » qu'avant (notés à l'étape 4) ; un chèque déjà coché l'est toujours.
2. **Achats**, Été 2027 : vos Reçu N-1 tapés s'affichent avec le mot « saisi » ; Objectif et Réel inchangés.
3. **Réglages → Fournisseurs et marques** : la liste des fournisseurs ; « Rautureau Apple Shoes » regroupe No Name et Schmoove ; le mode de règlement de deux ou trois fournisseurs comme avant.
4. **Commandes fournisseurs** : l'écran s'ouvre (vide tant qu'aucune commande n'est importée).
5. **Cahier des entrées**, Hiver 2026 : la liste et le Suivi des livraisons comme avant ; « Entrée » ouvre l'ancienne saisie. Été 2027 : « Entrée » propose de choisir une commande (aucune encore).
6. **Répertoire** : ouvrir une marque, les coordonnées du magasin sont celles d'avant.
7. **SAV & défectueux**, **Réassorts**, **Agenda** : s'ouvrent comme avant.
8. **Deux appareils** : une modification faite sur l'un apparaît sur l'autre sans recharger (temps réel).

## Marche arrière

| Cas | Quand | Action | Effet |
|---|---|---|---|
| **A** — base seulement | Le SQL est passé (étapes 5-6), le code n'est pas parti | Rien d'urgent : l'ancienne version fonctionne sur la base migrée. Pour tout retirer : **Vous** lancez la **commande A** (plus haut), qui applique les annulations dans l'ordre inverse : `supabase-plan-c-etape7bis-annulation.sql` → `-etape6-annulation.sql` → `-etape3-annulation.sql` → `-complements-annulation.sql` → `-2bis-annulation.sql` → `supabase-plan-c-annulation.sql` (**5,8 s** à la répétition, aucune erreur côté outil). | Base revenue à l'identique d'avant (vérifié à la répétition : tables, données, structure, droits). |
| **B** — code et base | Le code est parti (étape 7), **avant** la décision « on garde » | 1. **Vous** : Vercel → projet suivi-pro → Deployments → le déploiement **11b8e1e** (« JOUR-J-DEFECTUEUX : branche de marche arrière prête ») → « … » → **Promote to Production** (retour en moins d'une minute). 2. **Vous** : `cd "/Users/jeremie/Projets/App suivi Pro/suivi-pro-fusion" && git push origin plan-c-retour:main` (remet `main` d'accord avec le site, sans réécrire l'historique). 3. Puis, si on retire aussi la base : cas **A**. | Retour exact à la version d'aujourd'hui. |
| **C** — catastrophe | Données abîmées | Restauration de la sauvegarde de l'étape 2 (procédure du `LISEZMOI.txt` de la sauvegarde, avec l'étape obligatoire des droits et du temps réel). | Efface tout ce qui a été saisi après la sauvegarde : dernier recours. |

### Point de non-retour

**La décision « on garde » (étape 11)**, ou au plus tard la **première donnée du plan C saisie pour de vrai** : import d'une commande, réception rattachée à une commande, réassort d'Été 2027 passé à « Commandé », règlement ou plan chèque modifié dans « Fournisseurs et marques », contact enregistré au fournisseur. Après cela, les annulations SQL **effaceraient ces données** (elles suppriment les tables et colonnes du plan C) et l'ancienne version ne verrait pas les changements faits au nouvel endroit. On ne revient plus en arrière : on corrige en avant (avec sauvegarde, comme toujours).

---

## Message aux équipes (à envoyer le vendredi 23 octobre 2026, avant 19 h 30)

**Objet : Suivi Pro — mise à jour ce soir vendredi 23 octobre : les commandes fournisseurs arrivent**

Bonjour à toutes et à tous,

À partir de **demain matin, samedi 24 octobre**, Suivi Pro connaît les **commandes passées aux fournisseurs**, à partir de l'été 2027. Rien ne change pour l'hiver 2026, que vous continuez à saisir comme aujourd'hui jusqu'au 31 mars 2027.

**Été 2027 : les entrées se font à partir de la commande**
- Dans le **Cahier des entrées**, « Entrée » vous fait choisir la **marque**, puis la **commande** (choisie d'office s'il n'y en a qu'une), puis le **modèle**. Les pointures sont **déjà remplies avec ce qui reste à recevoir** : vous corrigez seulement ce qui diffère du carton.
- Un carton contient plusieurs modèles ? Touchez « **Ajouter un autre modèle** », puis « **Enregistrer la réception** ».
- Une pointure qui n'était pas commandée : l'outil vous demande de confirmer.
- Le **Suivi des livraisons** d'Été 2027 compare ce qui est reçu à ce qui est **commandé**. Il se remplit au fur et à mesure que les commandes sont enregistrées par la direction.
- Nouvel écran **Commandes fournisseurs** (menu) : vous y voyez les commandes de votre magasin et ce qui reste à livrer (sans les prix).

**Réassorts d'Été 2027**
- Rien ne change dans l'écran des réassorts. Quand la marque **confirme** (« → Commandé »), le réassort devient une commande ; sa réception se fait avec la même saisie que les autres réceptions (« Réassort reçu », ou « Entrée » du Cahier).

**Le reste**
- **Filtre « Famille »** dans le Cahier (Entrées et Suivi des livraisons).
- **Répertoire** : quand plusieurs marques ont le même fournisseur, leurs coordonnées communes sont celles du fournisseur ; vos coordonnées de magasin ne bougent pas.
- **Suppression de plusieurs entrées** : une réception d'Été 2027 ne se supprime pas dans un lot ; ouvrez-la et utilisez « Supprimer » dans sa fiche (l'outil vous prévient que c'est définitif).

Demain matin, si vous voyez encore l'ancien affichage, rechargez la page (sur téléphone : fermez et rouvrez l'onglet). Vos identifiants ne changent pas.

**Ce soir, vendredi 23 octobre, de 19 h 30 à 20 h 30**, merci de ne rien saisir dans Suivi Pro (mise à jour en cours).

En cas de doute, demandez à Jérémie ou à Raphaël.

Merci,
Jérémie

---

## Répétition générale (23/10/2026, base de test, copie de la production)

Copie fraîche de la production (lecture seule, 23/10 matin : 18 tables, 2 179 entrées, 101 marques, 208 lignes d'achat) chargée dans la base de test, puis migrée avec les 6 fichiers dans l'ordre du jour J.

**Précautions (celles du 13/10)** : mots de passe des 5 comptes de test remplacés par des mots de passe temporaires et toutes les sessions fermées avant le chargement, empreintes d'origine remises **à l'identique** à la fin (connexion vérifiée) ; inscriptions fermées (refus vérifié) ; règles de l'étape 2 actives sur la copie (filtrage sur les 18 tables, 22 règles comme en production ; rien sans connexion ; pas de paie pour un compte magasin) ; aucun courriel réel possible (les serveurs locaux n'envoient jamais, faute de `SEND_REAL_MAIL`) ; aucun script d'essai pendant la migration.

**Durées**

| Opération | Durée | Ressenti par l'outil (sonde toutes les 250 ms) |
|---|---|---|
| Migration (6 fichiers) | **8,98 s** (3,47 + 2,25 + 0,80 + 0,71 + 1,19 + 0,56) | 0 erreur ; 1 réponse sur 57 à 1,4 s (sinon ≈ 0,1 s) |
| Annulation complète (6 fichiers, ordre inverse) | **5,76 s** | 0 erreur ; au plus 0,5 s |
| Réapplication | **8,39 s** | 0 erreur ; 1 réponse sur 57 à 1,7 s |

**Comparaison avant / après, écran par écran** (ancienne version sur la base d'avant ↔ nouvelle version sur la base migrée ; Direction, tous les magasins ; tous les filtres de chaque écran ; 24 017 lignes)

| Écran | Été 2026 | Hiver 2026 | Été 2027 |
|---|---|---|---|
| Plan de règlement (société, magasin, mode, chaque marque ; tout déplié, coches de pointage comprises) | 45 filtres, 10 521 lignes, **0 écart** | 57 filtres, 8 660 lignes, **0 écart** | 6 filtres, 96 lignes, **0 écart** |
| Achats (colonnes communes ; chiffres du haut) | 18 filtres, 366 lignes, **0 écart** | 18 filtres, 404 lignes, **0 écart** | 17 filtres, 457 lignes, **0 écart** |
| Suivi des livraisons (total, marques × magasin, chaque modèle) | 74 marques × magasin, 1 070 modèles, **0 écart** | 62 marques × magasin, 1 307 modèles, **0 écart** | **écart voulu**, ci-dessous |

Écarts, un par un :
1. **Suivi des livraisons d'Été 2027** : avant, 72 marques × magasin, 21 modèles, **13 257 paires attendues** (saisies dans l'ancien modèle : Réglages → Marques) ; après, vide (« 0 paire attendue »). C'est la décision 14 du plan C : Été 2027 est la première saison suivie **par commandes** ; son attendu viendra des commandes importées (aucune en production aujourd'hui). Hiver 2026 et Été 2026 ne changent pas.
2. **Achats, Reçu N-1** : les **112** montants déjà tapés (1 en Été 2026, 53 en Hiver 2026, 58 en Été 2027) sont gardés tels quels, avec le mot « saisi » ; les 14 lignes d'Été 2027 sans Reçu N-1 restent sans montant (« — » : ces marques n'ont pas d'entrée en Été 2026) ; total « Reçu N-1 » d'Été 2027 identique (358 802 €).
3. **Achats, colonnes et cartes nouvelles** (étape 7 bis, voulues) : Décision, Évolution, Reste à engager ; cartes « Évolution » (+19 % en Été 2027) et « Reste à engager » (−21 578 €). Les colonnes retirées le 22/10 (commandé net, reçu, écart) ne sont pas comparées.

**Autres contrôles**
- **Ancienne version sur la base migrée** (appareils pas encore rechargés) : Plan, Achats (861 lignes complètes, Reçu N-1 compris) et Suivi d'Hiver 2026 et Été 2027 **identiques à avant la migration** (0 écart) : l'ancienne version continue de fonctionner pendant la transition.
- **Coordonnées des marques** (adresses des mails SAV, défectueux, réassorts) : 3 939 lectures (101 marques × 3 magasins × 13 champs), **0 écart** entre l'ancienne règle sur l'ancienne base et la nouvelle règle sur la base migrée.
- **Correspondance des magasins** : 1 Bailly Albi → Bailly Albi, 2 Les 2 Zèbres → Les 2 Zèbres, 3 Bailly Rouffiac → Bailly Rouffiac Tolosan.
- **Fournisseurs** : 101 marques → 100 fournisseurs (Rautureau Apple Shoes = No Name + Schmoove), 172 règlements, 8 plans chèques ; aucune marque sans fournisseur ; 2 marques gardent leurs contacts propres (contacts différents de leur fournisseur).
- **Réassorts en cours** : les 8 réassorts de la production sont d'Hiver 2026 → aucun n'est repris en commande (règle : Été 2027 et après) ; ils sont inchangés.
- **Temps réel** juste après la migration : avis reçus en 0,25 à 0,57 s sur une ancienne table (entrées) et deux nouvelles.
- **Aller-retour** : après annulation complète, la base est **identique à avant la migration** (18 tables, contenu octet pour octet, structure, droits, temps réel) ; après réapplication, identique au premier passage (aux dates de création près des nouvelles lignes).
- **Fin** : base de test remise exactement dans son état d'avant la répétition (26 tables, structure, droits, temps réel), aucune donnée réelle restante (vérifié : aucune base jetable, aucun nom de la production), copie de la production, photos et relevés effacés de l'ordinateur ; mots de passe des comptes de test rendus.

Outils (hors du projet) : `~/.suivi-pro/repetition/` (`repetition.mjs`, `migrer-mesure.sh`, `sonde-api.mjs`, `temps-reel.mjs`, `contacts-repetition.mjs`, `comptes-repetition.mjs`, `verif-acces.mjs`, rapports de synthèse) et `~/.suivi-pro/essais/` (`photo-repetition.mjs`, `lancer-photo.sh`, `comparer-photos.mjs`, `garde-base-test.mjs`).

