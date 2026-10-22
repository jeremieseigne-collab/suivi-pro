// Reçu N-1 de l'écran Achats (plan C, étape 7 bis) : calculé d'après le Cahier, ou saisi à la main (parametres.recu_n1_saisi).
// Calcul : somme en euros (PHT) des entrées du Cahier de la MÊME saison l'année précédente (Été 2027 lit Été 2026, Hiver 2027 lit
// Hiver 2026…), par marque et par magasin ; réceptions et réassorts comptent, les retours non. Les entrées à 0 € rendent le chiffre
// sous-estimé : leur nombre est donné pour que l'on s'en méfie. Fonctions pures.

// « ETE_2027 » → « ETE_2026 » ; « HIVER_2026 » → « HIVER_2025 » (null si l'identifiant n'est pas de ce format)
export function saisonPrecedente(id) {
  const m = /^(ETE|HIVER)_(\d{4})$/.exec(id || '')
  return m ? `${m[1]}_${Number(m[2]) - 1}` : null
}

// entrees : entrées de la saison N-1 → { 'fournisseurId_magasinId': { montant, nb, sansPrix } }
export function calculerRecuN1(entrees) {
  const out = {}
  for (const e of entrees || []) {
    if (e.statut === 'Retour' || !e.fournisseurId || !e.magasinId) continue
    const x = out[e.fournisseurId + '_' + e.magasinId] ||= { montant: 0, nb: 0, sansPrix: 0 }
    const pht = Number(e.pht) || 0
    x.montant += pht; x.nb++
    if (!(pht > 0)) x.sansPrix++
  }
  return out
}

// Reçu N-1 d'une ligne d'achat : { valeur, saisi, calc (ou null), garde (montant saisi mis de côté quand le calcul est utilisé) }
export function recuN1De(ligne, calcul) {
  const calc = calcul?.[ligne.fournisseurId + '_' + ligne.magasinId] || null
  const saisi = !!ligne.recuN1Saisi
  const stocke = Number(ligne.recuN1) || 0
  return { saisi, calc, valeur: saisi ? stocke : (calc ? calc.montant : 0), garde: !saisi && stocke > 0 ? stocke : 0 }
}

export const textSansPrix = n => `${n} entrée${n > 1 ? 's' : ''} sans prix`

// Fusion de deux marques (Réglages → Marques) : « la cible gagne, la source comble les trous » — la source ne prend la place que si
// son montant est saisi et celui de la cible ne l'est pas. Renvoie les deux champs à écrire sur la ligne conservée.
export function fusionnerRecuN1(cible, source) {
  const prendSource = !cible.recuN1Saisi && !!source.recuN1Saisi
  return { recuN1: prendSource ? (source.recuN1 || 0) : (cible.recuN1 || 0), recuN1Saisi: !!(cible.recuN1Saisi || source.recuN1Saisi) }
}
