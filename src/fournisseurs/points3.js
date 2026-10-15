// Points à trancher de l'étape 3 (réception rattachée) : AVEC par défaut ; essai « sans » en local (panneau d'essai)
export const POINTS_3 = [
  { cle: 'r3-sans-commande', titre: 'Réception : lien « Entrée sans commande » (ancienne saisie) pour une saison suivie par commandes (sans : réceptions rattachées seulement)' },
  { cle: 'r3-annuler',       titre: 'Après l’enregistrement : « Annuler » dans le message (supprime la réception) (sans : pas d’annulation)' },
  { cle: 'r3-recap-reste',   titre: 'Après l’enregistrement : reste à livrer de la commande affiché dans la fenêtre (sans : message seul)' },
  { cle: 'r3-mention-liste', titre: 'Cahier : mention « BC … » de la commande sous chaque réception (sans : seulement « hors commande » et dans la fiche)' },
]
