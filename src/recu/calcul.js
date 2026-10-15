// Reçu par marque (plan C, étape 5) : calcul pur, en lecture seule.
// Même calcul pour toutes les saisons, à partir des entrées du Cahier (hors retours) : chaque entrée est découpée par taille
// (ce sont exactement les mouvements d'entrée de la réception) ; le montant HT est le PHT de l'entrée, réparti au prorata des paires.
// Saisons suivies par commandes : la famille vient de la ligne de commande ; saisons passées : de la catégorie de l'entrée
// (mouvements « recréés » à l'écran, rien n'est écrit en base).

const TRI_TAILLE = (a, b) => (parseFloat(a) || 0) - (parseFloat(b) || 0) || String(a).localeCompare(String(b), 'fr', { numeric: true })
export const dateIso = fr => { const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(fr || ''); return m ? `${m[3]}-${m[2]}-${m[1]}` : '' }

// options : { suivie, avecSansCommande, avecReassorts, familleDe(entree) }
export function mouvements(entrees, { suivie = false, avecSansCommande = true, avecReassorts = true, familleDe = () => '' } = {}) {
  const out = []
  for (const e of entrees) {
    if (e.statut === 'Retour') continue
    if (suivie && !e.commandeId && !avecSansCommande) continue
    if (!avecReassorts && e.statut === 'Réassort') continue
    const total = Number(e.total) || 0, pht = Number(e.pht) || 0
    let tailles = Object.entries(e.sizes || {}).map(([t, q]) => [t, Number(q) || 0]).filter(([, q]) => q !== 0)
    if (!tailles.length && total) tailles = [['', total]]
    const famille = familleDe(e) || ''
    for (const [taille, q] of tailles) {
      out.push({ entreeId: e.id, date: dateIso(e.date), magasinId: e.magasinId, fournisseurId: e.fournisseurId, modele: e.modele || '', taille, q,
        montant: total ? pht * q / total : 0, famille, horsCommande: suivie && !e.commandeId })
    }
  }
  return out
}

// Par marque → modèles-coloris → tailles ; avec le détail par magasin de chaque marque
export function parMarque(mvts) {
  const g = new Map()
  for (const m of mvts) {
    if (!g.has(m.fournisseurId)) g.set(m.fournisseurId, { fournisseurId: m.fournisseurId, paires: 0, montant: 0, receptions: new Set(), derniere: '', magasins: new Map(), modeles: new Map() })
    const x = g.get(m.fournisseurId)
    x.paires += m.q; x.montant += m.montant; x.receptions.add(m.entreeId); if (m.date > x.derniere) x.derniere = m.date
    x.magasins.set(m.magasinId, (x.magasins.get(m.magasinId) || 0) + m.q)
    if (!x.modeles.has(m.modele)) x.modeles.set(m.modele, { modele: m.modele, paires: 0, montant: 0, famille: m.famille, horsCommande: false, tailles: new Map() })
    const md = x.modeles.get(m.modele)
    md.paires += m.q; md.montant += m.montant; md.horsCommande ||= m.horsCommande
    md.tailles.set(m.taille, (md.tailles.get(m.taille) || 0) + m.q)
  }
  return [...g.values()].map(x => ({
    ...x, receptions: x.receptions.size,
    magasins: [...x.magasins.entries()].map(([magasinId, paires]) => ({ magasinId, paires })),
    modeles: [...x.modeles.values()].map(md => ({ ...md, tailles: [...md.tailles.entries()].map(([taille, q]) => ({ taille, q })).sort((a, b) => TRI_TAILLE(a.taille, b.taille)) }))
      .sort((a, b) => b.paires - a.paires || a.modele.localeCompare(b.modele, 'fr')),
  }))
}

// Export CSV (Direction) : une ligne par magasin × marque × modèle × taille ; séparateur « ; », nombres à la française, BOM pour Excel
export function csvRecu(mvts, { saison, nomMagasin, nomMarque }) {
  const k = new Map()
  for (const m of mvts) {
    const cle = [m.magasinId, m.fournisseurId, m.modele, m.taille].join('|')
    const x = k.get(cle) || { ...m, q: 0, montant: 0, receptions: new Set() }
    x.q += m.q; x.montant += m.montant; x.receptions.add(m.entreeId); k.set(cle, x)
  }
  const cell = v => { const s = String(v ?? ''); return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s }
  const nombre = v => String(Math.round((Number(v) || 0) * 100) / 100).replace('.', ',')
  const lignes = [...k.values()].sort((a, b) => nomMagasin(a.magasinId).localeCompare(nomMagasin(b.magasinId), 'fr') || nomMarque(a.fournisseurId).localeCompare(nomMarque(b.fournisseurId), 'fr')
    || a.modele.localeCompare(b.modele, 'fr') || TRI_TAILLE(a.taille, b.taille))
    .map(x => [saison, nomMagasin(x.magasinId), nomMarque(x.fournisseurId), x.modele, x.famille, x.taille, x.q, nombre(x.montant), x.receptions.size])
  return '﻿' + [['Saison', 'Magasin', 'Marque', 'Modèle', 'Famille', 'Taille', 'Paires', 'Montant HT', 'Réceptions'], ...lignes].map(l => l.map(cell).join(';')).join('\r\n')
}
