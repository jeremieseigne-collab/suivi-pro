// Points à trancher de l'étape 2 bis (fournisseurs et marques) : AVEC par défaut ; essai « sans » en local (panneau d'essai)
export const POINTS_2BIS = [
  { cle: 'r-fournisseur-ligne',    titre: 'Répertoire : nom du fournisseur sous la marque quand il diffère (sans : seulement dans la fiche)' },
  { cle: 'r-contacts-propres-tous', titre: 'Répertoire : tous les comptes peuvent passer une marque en « contacts propres » (sans : Direction seulement)' },
  { cle: 'fm-mode-liste',          titre: 'Fournisseurs et marques : mode de règlement de chaque magasin rappelé dans la liste (sans : seulement dans la fiche)' },
  { cle: 'fm-homonymes',           titre: 'Fournisseurs et marques : encart des noms proches (fournisseurs ou marques à vérifier) en haut (sans : seulement dans la fiche)' },
  { cle: 'fm-sans-marque-a-part',  titre: 'Fournisseurs et marques : fournisseurs « sans marque » à part, en bas (sans : mêlés à la liste)' },
  { cle: 'cf-niveau-marque',       titre: 'Commandes fournisseurs : sous-titre de marque seulement quand le fournisseur a plusieurs marques (sans : toujours)' },
]
