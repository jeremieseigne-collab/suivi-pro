// Points à trancher de l'écran Commandes fournisseurs (plan C, étape 2) : AVEC par défaut ; essai « sans » en local (panneau d'essai)
export const POINTS_FOURNISSEURS = [
  { cle: 'cf-menu-sous-cahier', titre: 'Menu : « Commandes fournisseurs » juste sous « Cahier des entrées » (sans : en fin du premier groupe, après Factures)' },
  { cle: 'cf-groupe-marque',    titre: 'Liste groupée par marque (sans : une seule liste, la plus récente en haut)' },
  { cle: 'cf-barre',            titre: 'Barre « reçu / commandé » sur chaque commande (sans : chiffres seuls)' },
  { cle: 'cf-montant-carte',    titre: 'Direction : montant de la commande sur la carte (sans : seulement dans le détail)' },
  { cle: 'cf-encart-retard',    titre: 'Encart « livraison prévue dépassée » en haut de la liste (sans : seulement le mot orange sur la carte)' },
]
