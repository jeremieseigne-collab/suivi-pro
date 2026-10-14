// Lecture des contacts d'une marque (plan C, étape 2 bis, décisions Q2, Q3) — fonctions pures.
// Contacts par magasin (commercial, mail commandes, SAV, n° client, BtoB) : 1. la marque pour ce magasin (si elle a ses
// propres contacts) ; 2. le fournisseur pour ce magasin ; 3. le fournisseur, commun ; 4. l'ancienne adresse commune de la marque.
// Société (comptabilité, adresse postale, notes) : le fournisseur, sinon l'ancienne valeur de la marque.
export const CLES_SOCIETE = ['contactCompta', 'telCompta', 'emailCompta', 'adresse', 'notes']
const txt = v => String(v ?? '').trim()
const duMagasin = (o, magasinId, key) => txt(o?.coordsMagasin?.[magasinId]?.[key])

export function contactDe(marque, fournisseur, magasinId, key) {
  if (!marque) return ''
  if (CLES_SOCIETE.includes(key)) return txt(fournisseur?.[key]) || txt(marque[key])
  return (marque.contactsHerites === false ? duMagasin(marque, magasinId, key) : '')
    || duMagasin(fournisseur, magasinId, key) || txt(fournisseur?.[key]) || txt(marque[key])
}

// Où écrire un contact modifié : au fournisseur quand la marque en hérite, sinon à la marque ; la société toujours au fournisseur
export const ecritAuFournisseur = (marque, key) => CLES_SOCIETE.includes(key) || marque?.contactsHerites !== false
