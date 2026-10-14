// Outils de l'écran Commandes fournisseurs (dates)
// AAAA-MM-JJ → JJ/MM/AA
export const fmtJour = iso => { const m = /^(\d{4})-(\d\d)-(\d\d)/.exec(iso || ''); return m ? `${m[3]}/${m[2]}/${m[1].slice(2)}` : '—' }

// Livraison prévue dépassée alors qu'il reste à livrer
export function enRetard(c) {
  if (!c.livraison_prevue || !(c.reste > 0)) return false
  const d = new Date(); const auj = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  return c.livraison_prevue < auj
}
