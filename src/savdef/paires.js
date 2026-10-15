// Paires d'un défectueux ou d'un retour client : { pointure: nombre de paires } ↔ résumé « 38 ×2, 39 ×1 ».
// Une seule paire s'écrit comme avant (« 38 ») : les dossiers existants se lisent et s'affichent sans changement.

const tri = (a, b) => (parseFloat(a) || 0) - (parseFloat(b) || 0) || a.localeCompare(b)

export function nbPaires(paires) {
  return Object.values(paires || {}).reduce((s, q) => s + (Number(q) || 0), 0)
}

export function resumePaires(paires) {
  const l = Object.entries(paires || {}).filter(([, q]) => Number(q) > 0).sort(([a], [b]) => tri(a, b))
  if (nbPaires(paires) <= 1) return l[0]?.[0] || ''
  return l.map(([p, q]) => `${p} ×${q}`).join(', ')
}

// Relit un résumé (ou une pointure seule des dossiers existants)
export function lirePaires(texte) {
  const o = {}
  String(texte || '').split(/,\s+/).forEach(bout => {
    const m = /^(.+?)\s*×\s*(\d+)$/.exec(bout.trim())
    const p = (m ? m[1] : bout).trim(), q = m ? Number(m[2]) : 1
    if (p && q > 0) o[p] = (o[p] || 0) + q
  })
  return o
}

// Nombre de paires d'un dossier d'après son résumé (dossier sans pointure : une paire)
export const nbPairesDossier = texte => nbPaires(lirePaires(texte)) || 1

// Ligne « Retour » du Cahier : quantités négatives par pointure
export const sizesRetour = paires => Object.fromEntries(Object.entries(paires || {}).filter(([, q]) => Number(q) > 0).map(([p, q]) => [p, -Number(q)]))
