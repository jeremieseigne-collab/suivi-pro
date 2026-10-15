// Outils de l'écran Commandes fournisseurs (dates)
// AAAA-MM-JJ → JJ/MM/AA
export const fmtJour = iso => { const m = /^(\d{4})-(\d\d)-(\d\d)/.exec(iso || ''); return m ? `${m[3]}/${m[2]}/${m[1].slice(2)}` : '—' }

// Livraison prévue dépassée alors qu'il reste à livrer
export function enRetard(c) {
  if (!c.livraison_prevue || !(c.reste > 0)) return false
  const d = new Date(); const auj = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  return c.livraison_prevue < auj
}

const aujourdhuiIso = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }
export const joursDepuis = iso => Math.floor((Date.parse(aujourdhuiIso()) - Date.parse(iso)) / 86400000)

// Commande de saison qui traîne : il reste à livrer et rien ne s'est passé depuis plus de N jours
// (repère = la plus récente de : dernière réception, livraison prévue, date de commande, sinon date d'import).
// Signalée seulement : aucune annulation automatique (décision 10).
export function repereCommande(c, derniere) {
  return [derniere, c.livraison_prevue, c.date_commande].filter(Boolean).sort().pop() || String(c.cree_le || '').slice(0, 10)
}
export function traine(c, derniere, jours) {
  if (c.type === 'reassort' || !(c.reste > 0)) return false
  const r = repereCommande(c, derniere)
  return !!r && joursDepuis(r) > jours
}
