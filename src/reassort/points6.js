// Points à trancher de l'étape 6 (réassorts en commandes) : AVEC par défaut ; essai « sans » en local (panneau d'essai, saisons suivies par commandes)
export const POINTS_6 = [
  { cle: 'r6-prix',    titre: 'Nouveau réassort : champ « Prix unitaire HT » quand la commande de saison ne donne pas le prix du modèle (sans : réception à 0 €, à régulariser)' },
  { cle: 'r6-stock',   titre: 'Réception d’un réassort : les paires reçues s’ajoutent au stock du top modèle, comme aujourd’hui avec la case cochée (sans : stock inchangé, à mettre à jour à la main)' },
  { cle: 'r6-lien',    titre: 'Fiche du top modèle : mention de la commande du réassort et lien « Voir dans Commandes fournisseurs » (sans : rien de plus qu’aujourd’hui)' },
  { cle: 'r6-cahier',  titre: 'Cahier : la réception d’un réassort peut aussi se faire depuis « Entrée » (commande de réassort proposée avec les commandes de saison) (sans : seulement depuis l’écran Réassorts)' },
]
