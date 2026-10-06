import { db } from '../db'

// Étapes d'un réassort (dans l'ordre)
export const ETAPES = ['À réassortir', 'Demandé', 'Commandé', 'En route', 'Reçu']
export const ETAPES_ACTIVES = ETAPES.slice(0, 4)

export const ETAPE_COLORS = {
  'À réassortir': '#ef4444',
  'Demandé':      '#f59e0b',
  'Commandé':     '#3b82f6',
  'En route':     '#8b5cf6',
  'Reçu':         '#10b981',
}

export const ETAPE_ICONS = {
  'À réassortir': '⚠️',
  'Demandé':      '🙋',
  'Commandé':     '🛒',
  'En route':     '🚚',
  'Reçu':         '✅',
}

// Alerte de retard d'un réassort « En route » (en jours)
export const RETARD_ORANGE = 10
export const RETARD_ROUGE  = 15

export const CATEGORIES = ['', 'Acc', 'Femme', 'Homme', 'Enfant', 'Bébé']
export const CAT_TO_KEY = { 'Femme': 'F', 'Homme': 'H', 'Enfant': 'E', 'Bébé': 'B', 'Acc': 'ACC' }

// Couleurs des cases pointure (mini-grille)
export const CELL = {
  rupture:  { bg: '#fee2e2', border: '#fca5a5', text: '#b91c1c' },
  commande: { bg: '#ffedd5', border: '#fdba74', text: '#c2410c' },
  ok:       { bg: '#dcfce7', border: '#86efac', text: '#15803d' },
  inconnu:  { bg: 'var(--surface-2)', border: 'var(--border)', text: 'var(--text-4)' },
}

export const todayFr = () => { const d = new Date(); const p = n => String(n).padStart(2, '0'); return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}` }

export function fmtDate(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  return isNaN(d) ? '—' : d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

export function joursDepuis(iso) {
  if (!iso) return null
  const t = new Date(iso).getTime()
  return isNaN(t) ? null : Math.floor((Date.now() - t) / 86400000)
}

// Tri des pointures (numérique puis texte)
export function sortSizes(arr) {
  return [...arr].sort((a, b) => (parseFloat(a) || 0) - (parseFloat(b) || 0) || String(a).localeCompare(String(b)))
}

// Quantité encore attendue par pointure pour un réassort (commandé − reçu)
export function resteParPointure(r) {
  const out = {}
  Object.entries(r?.sizes || {}).forEach(([s, q]) => {
    const reste = (Number(q) || 0) - (Number(r.recu?.[s]) || 0)
    if (reste > 0) out[s] = reste
  })
  return out
}

export const isActif = r => r && r.statut !== 'Reçu'

// Niveau de retard d'un réassort : null | 'orange' | 'rouge'
export function retard(r) {
  if (!r || r.statut !== 'En route') return null
  const j = joursDepuis(r.etapes?.['En route'])
  if (j == null) return null
  if (j >= RETARD_ROUGE) return 'rouge'
  if (j >= RETARD_ORANGE) return 'orange'
  return null
}

// État d'une pointure d'un top modèle
export function etatPointure(top, s, enCommande) {
  if ((enCommande?.[s] || 0) > 0) return 'commande'
  const st = top.stock?.[s]
  if (st === undefined || st === null || st === '') return 'inconnu'
  return Number(st) < (top.cible || 1) ? 'rupture' : 'ok'
}

// Quantités proposées pour un réassort = cible − stock − déjà en commande
export function proposition(top, enCommande) {
  const out = {}
  ;(top.pointures || []).forEach(s => {
    const st = top.stock?.[s]
    if (st === undefined || st === null || st === '') return
    const q = (top.cible || 1) - Number(st) - (enCommande?.[s] || 0)
    if (q > 0) out[s] = q
  })
  return out
}

// Nettoie le stock saisi : { '38': '2', '39': '' } → { '38': 2 }
export function cleanStock(stock, pointures) {
  const out = {}
  pointures.forEach(s => { const v = stock[s]; if (v !== undefined && v !== '' && v !== null) out[s] = Math.max(0, parseInt(v) || 0) })
  return out
}

// Supprime un top modèle et ses réassorts (les entrées déjà créées dans le Cahier restent)
export async function supprimerTop(topId) {
  const rs = await db.reassorts.where('topId').equals(topId).toArray()
  for (const r of rs) await db.reassorts.delete(r.id)
  await db.topModeles.delete(topId)
}
