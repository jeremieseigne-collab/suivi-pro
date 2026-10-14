// Petits éléments communs de l'écran Commandes fournisseurs
const niveau = p => p >= 100 ? 'ok' : p > 0 ? '' : 'zero'

export function Jauge({ p, hauteur = 6 }) {
  return <div className="barre" style={{ height: hauteur }}><i className={niveau(p)} style={{ width: `${Math.min(100, p)}%` }} /></div>
}

// Statut déduit par la base (vue achats_commandes_etat), écrit en mot de couleur (le point est réservé aux entrées)
const CLASSE = { 'Commandée': '', 'Partiellement reçue': 'info', 'Soldée': 'ok', 'Reçu': 'ok', 'Demandé': 'att', 'Commandé': '', 'En route': 'info' }
export function StatutCommande({ c }) {
  const annule = c.statut === 'Soldée' && c.qte_annulee > 0
  return <span className={`etat-mot ${CLASSE[c.statut] ?? ''}`}>{annule ? 'Soldée, reliquat annulé' : c.statut}</span>
}
