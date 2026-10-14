// Calcul du Plan de règlement — DÉPLACÉ TEL QUEL depuis src/tabs/PlanReglement.jsx (outil actuel) : mêmes échéances, mêmes montants,
// mêmes dates, mêmes clés de pointage. Seuls ajouts (décisions du 12/10) : numérotation des chèques personnalisés limitée aux chèques
// datés, et la liste à part « En attente de 1ère réception » (chequesEnAttente), hors des échéances et des totaux.
import { getSociete } from '../data/societes'
import { DEFAULT_NB_CHEQUE, DEFAULT_DELAIS } from '../data/reglement'

// ─── Utilitaires dates ───────────────────────────────────────────────────────
// Accepte JJ/MM/AAAA (entrées) et AAAA-MM-JJ (plans chèque saisis via <input type="date">)
export function parseDate(str) {
  if (!str) return null
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(str).trim())
  if (iso) return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]))
  const parts = String(str).split('/')
  if (parts.length !== 3) return null
  const [d, m, y] = parts
  const date = new Date(Number(y), Number(m) - 1, Number(d))
  return isNaN(date.getTime()) ? null : date
}
function endOfMonth(date, monthsAhead = 0) {
  const d = new Date(date)
  d.setMonth(d.getMonth() + monthsAhead + 1, 0)
  return d
}
function addDays(date, days) {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}
export function fmtDate(date) { return date ? date.toLocaleDateString('fr-FR') : '' }
export function monthKey(date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}` }
export function monthLabel(key) {
  const [y, m] = key.split('-')
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
}

// ─── Règles de paiement ───────────────────────────────────────────────────────
// CHEQUE : montant ÷ nb, sur nb fins de mois successives (à partir de la 1ère réception)
function echeancesCheque(fournisseur, magasin, reelTotal, firstDate, nb, keyBase) {
  if (!firstDate || !reelTotal || !nb) return []
  return Array.from({ length: nb }, (_, i) => ({
    date:        endOfMonth(firstDate, i),
    montant:     reelTotal / nb,
    info:        `Échéance ${i + 1}/${nb}`,
    fournisseur, magasin, mode: 'CHEQUE',
    societe:     getSociete(magasin),
    source: `Commande totale (${reelTotal.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })})`,
    key: `${keyBase}|${i}`,
  }))
}

// CHEQUE personnalisé : liste de chèques { date, montant } saisie par saison (Paramètres → Modes de règlement)
function echeancesChequeCustom(fournisseur, magasin, cheques, keyBase) {
  // Décision du 12/10 : seuls les chèques datés (et avec un montant) sont numérotés (« Chèque 1/2 » pour 2 chèques réels).
  // Montants, dates et clés de pointage (rang d'origine) inchangés.
  const valides = cheques.filter(c => parseDate(c.date) && Number(c.montant)).length
  let rang = 0
  return cheques.map((c, i) => {
    const date = parseDate(c.date)
    const montant = Number(c.montant)
    if (!date || !montant) return null
    rang++
    return {
      date, montant,
      info: `Chèque ${rang}/${valides}`,
      fournisseur, magasin, mode: 'CHEQUE',
      societe: getSociete(magasin),
      source: 'Plan chèque personnalisé',
      key: `${keyBase}|${i}`,
    }
  }).filter(Boolean)
}

// Autres modes : montant réparti à parts égales sur la liste de délais (jours après livraison)
function echeancesLivraison(fournisseur, magasin, montant, livraisonDate, mode, delais, keyBase) {
  if (!livraisonDate || !montant || montant <= 0 || !delais || !delais.length) return []
  const n = delais.length
  return delais.map((d, i) => ({
    date:    addDays(livraisonDate, d),
    montant: montant / n,
    info:    d === 0 ? 'Jour de livraison' : (n > 1 ? `${d} jours (${i + 1}/${n})` : `${d} jours`),
    fournisseur, magasin, mode, societe: getSociete(magasin),
    source:  `Livraison du ${fmtDate(livraisonDate)}`,
    key: `${keyBase}|${i}`,
  }))
}

export const MODE_COLORS = {
  CHEQUE:      { bg: '#dbeafe', color: '#1d4ed8' },
  VIREMENT:    { bg: '#d1fae5', color: '#065f46' },
  LCR:         { bg: '#fef3c7', color: '#92400e' },
  GARANT:      { bg: '#ede9fe', color: '#5b21b6' },
  PRELEVEMENT: { bg: '#fee2e2', color: '#991b1b' },
  GMS:         { bg: '#fce7f3', color: '#9d174d' },
  AVOIR:       { bg: '#ccfbf1', color: '#0f766e' },
}

export function eur(n) { return n.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }) }
export function dateKey(d) { return d ? `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}` : '' }
export function isoStr(d) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }

// Date limite d'une saison : Été YYYY → 30/08/YYYY ; Hiver YYYY → dernier jour de février YYYY+1
export function seasonDeadline(seasonId) {
  const mt = /^(.+)_(\d{4})$/.exec(seasonId || '')
  if (!mt) return null
  const type = mt[1], year = parseInt(mt[2])
  if (type === 'ETE')   return new Date(year, 7, 30)      // 30 août
  if (type === 'HIVER') return new Date(year + 1, 2, 0)   // dernier jour de février (28/29) de l'année suivante
  return null
}


// ─── Fournisseurs (plan C, étape 2 bis) : la marque → son fournisseur, qui porte la règle et le plan chèque ───
// cleDe(marqueId) → n° du fournisseur ; nom(fr) → nom affiché ; clePointage(fr) → clé des pointages de chèques
// (n° de l'ancienne marque pilote pour les fournisseurs convertis) ; ordre = fournisseurs dans l'ordre de leur
// première marque (même ordre de parcours que l'ancien calcul par groupe).
export function groupes({ fournisseurs, fournisseursReels, reglements, plansCheques }, season) {
  const frById = Object.fromEntries((fournisseursReels || []).map(f => [f.id, f]))
  const marque = Object.fromEntries((fournisseurs || []).map(f => [f.id, f]))
  const regles = Object.fromEntries((reglements || []).map(r => [`${r.fournisseurReelId}_${r.magasinId}`, { mode: r.modeReglement || '', cond: r.condition || {} }]))
  const plans = Object.fromEntries((plansCheques || []).filter(p => p.season === season).map(p => [`${p.fournisseurReelId}|${p.magasinId}`, p.cheques]))
  const ordre = []
  for (const f of [...(fournisseurs || [])].sort((a, b) => a.id - b.id)) if (frById[f.fournisseurReelId] && !ordre.includes(f.fournisseurReelId)) ordre.push(f.fournisseurReelId)
  return {
    ordre,
    cleDe: fId => { const fr = frById[marque[fId]?.fournisseurReelId]; return fr ? fr.id : null },
    nom: gk => frById[gk]?.nom ?? '',
    clePointage: gk => frById[gk]?.clePointage,
    regle: (gk, magasinId) => regles[`${gk}_${magasinId}`],
    planCheque: (gk, magasinId) => plans[`${gk}|${magasinId}`],
  }
}

// Toutes les échéances d'une saison (corps identique à la requête de l'outil actuel)
export function calculerPlan({ params, entrees, magasins, fournisseurs, fournisseursReels, reglements, plansCheques, defectueux, pointages }, season) {
    const magasinMap      = Object.fromEntries(magasins.map(m => [m.id, m.nom]))
    const g = groupes({ fournisseurs, fournisseursReels, reglements, plansCheques }, season)

    // Regroupement par fournisseur (plan C, étape 2 bis) : la marque → son fournisseur ; le fournisseur porte la règle
    // de règlement et le plan chèque (repris de l'ancienne marque pilote). Même calcul qu'avant, mêmes clés de pointage.
    const groupKeyOf = g.cleDe
    const regleForGroup = g.regle

    // statut du défectueux par entrée liée (pour ne compter l'avoir qu'une fois confirmé)
    const defStatutByEntree = {}
    defectueux.forEach(d => { if (d.entreeId) defStatutByEntree[d.entreeId] = d.statut })

    const result = []

    // ── 1. CHEQUE par (fournisseur × magasin) : Σ reelN du groupe ÷ N, 1ère réception la plus ancienne ──
    const firstRecepGM = {}   // `${gk}|${magasinId}` -> Date la plus ancienne
    entrees.forEach(e => {
      if (e.statut === 'Retour') return
      const gk = groupKeyOf(e.fournisseurId)
      if (!gk || !magasinMap[e.magasinId]) return
      const date = parseDate(e.date)
      if (!date) return
      const kk = `${gk}|${e.magasinId}`
      if (!firstRecepGM[kk] || date < firstRecepGM[kk]) firstRecepGM[kk] = date
    })
    const reelByGM = {}        // `${gk}|${magasinId}` -> Σ reelN
    params.forEach(p => {
      const gk = groupKeyOf(p.fournisseurId)
      if (!gk) return
      const kk = `${gk}|${p.magasinId}`
      if (p.reelN) reelByGM[kk] = (reelByGM[kk] || 0) + p.reelN
    })
    // Une série de chèques par (fournisseur × magasin) dont la règle est CHEQUE (même ordre de parcours qu'avant)
    const seenGM = new Set()
    g.ordre.forEach(gk => {
      magasins.forEach(m => {
        const kk = `${gk}|${m.id}`
        if (seenGM.has(kk)) return
        seenGM.add(kk)
        const regle = regleForGroup(gk, m.id)
        if (!regle || regle.mode !== 'CHEQUE') return
        const keyBase = `cheque|${g.clePointage(gk)}|${m.id}|${season}`
        const cheques = g.planCheque(gk, m.id)
        if (Array.isArray(cheques) && cheques.length) {
          result.push(...echeancesChequeCustom(g.nom(gk), m.nom, cheques, keyBase))
        } else if (reelByGM[kk]) {
          const nb = parseInt(regle.cond.nb) || DEFAULT_NB_CHEQUE
          result.push(...echeancesCheque(g.nom(gk), m.nom, reelByGM[kk], firstRecepGM[kk], nb, keyBase))
        }
      })
    })

    // ── 2. Autres modes : par livraison individuelle (pht + date), règle du fournisseur ──
    entrees.forEach(e => {
      if (e.statut === 'Retour') return // traité séparément comme avoir
      const gk = groupKeyOf(e.fournisseurId)
      const mNom = magasinMap[e.magasinId]
      if (!gk || !mNom || !e.pht || !e.date) return
      const date = parseDate(e.date)
      if (!date) return

      const regle = regleForGroup(gk, e.magasinId)
      const mode = regle?.mode
      if (!mode || mode === 'CHEQUE') return
      const delais = (Array.isArray(regle.cond.delais) && regle.cond.delais.length) ? regle.cond.delais : (DEFAULT_DELAIS[mode] || [])

      result.push(...echeancesLivraison(g.nom(gk), mNom, e.pht, date, mode, delais, `liv|${e.id}`))
    })

    // ── 3. Avoirs (retours/défectueux) : une échéance unique à la date du retour, sans règle.
    //    Affiché seulement si le défectueux lié est « Avoir reçu » ou « Clôturé ». ──
    entrees.forEach(e => {
      if (e.statut !== 'Retour') return
      if (!['Avoir reçu', 'Clôturé'].includes(defStatutByEntree[e.id])) return
      const gk = groupKeyOf(e.fournisseurId)
      const mNom = magasinMap[e.magasinId]
      if (!gk || !mNom || !e.pht || !e.date) return
      const date = parseDate(e.date)
      if (!date) return
      result.push({
        date, montant: e.pht, info: 'Avoir', mode: 'AVOIR',
        fournisseur: g.nom(gk), magasin: mNom, societe: getSociete(mNom),
        source: `Retour${e.modele ? ' ' + e.modele : ''}`,
        key: `avoir|${e.id}`,
        entreeId: e.id,
      })
    })

    // Pointage : marque chaque échéance payée ou non (via sa clé stable)
    const paidSet = new Set(pointages.map(p => p.cle))
    result.forEach(e => { e.paye = paidSet.has(e.key) })

    return {
      echeances: result.sort((a, b) => {
        if (!a.date && !b.date) return 0
        if (!a.date) return 1
        if (!b.date) return -1
        return a.date - b.date
      }),
      magasins: magasins.map(m => m.nom).sort(),
    }
}

// ─── Regroupements de l'affichage (repris tels quels de l'outil actuel) ───
export function filtrer(allEcheances, { societeFilter, magasinFilter, marqueFilter, modeFilter }) {
  return allEcheances.filter(e => {
    if (societeFilter && e.societe    !== societeFilter) return false
    if (magasinFilter && e.magasin    !== magasinFilter) return false
    if (marqueFilter  && e.fournisseur !== marqueFilter) return false
    if (modeFilter    && e.mode        !== modeFilter)   return false
    return true
  })
}

export function parMois(withDate) {
  const groups = {}
  withDate.forEach(e => {
    const key = monthKey(e.date)
    if (!groups[key]) groups[key] = { total: 0, items: [] }
    groups[key].total += e.montant
    groups[key].items.push(e)
  })
  return groups
}

export function totaux(filtered) {
  const totalGeneral = filtered.reduce((s, e) => s + e.montant, 0)
  const totalPaye    = filtered.filter(e => e.paye).reduce((s, e) => s + e.montant, 0)
  return { totalGeneral, totalPaye, totalReste: totalGeneral - totalPaye }
}

// Dans un mois : par société (ordre alphabétique), puis par fournisseur + même date (une ligne, ou un groupe dépliable)
export function groupesDuMois(items) {
  const bySociete = {}
  items.forEach(e => {
    const s = e.societe || e.magasin
    if (!bySociete[s]) bySociete[s] = { total: 0, items: [] }
    bySociete[s].total += e.montant
    bySociete[s].items.push(e)
  })
  return Object.entries(bySociete).sort(([a], [b]) => a.localeCompare(b)).map(([soc, grp]) => {
    const groups = {}
    grp.items.forEach(e => {
      const gk = `${e.fournisseur}|${dateKey(e.date)}`
      if (!groups[gk]) groups[gk] = { items: [], total: 0, fournisseur: e.fournisseur, date: e.date }
      groups[gk].items.push(e); groups[gk].total += e.montant
    })
    const lignes = Object.values(groups).sort((a, b) => a.date - b.date || a.fournisseur.localeCompare(b.fournisseur))
    return { soc, total: grp.total, lignes }
  })
}

// ─── En attente de 1ère réception (décision du 12/10) ───
// Marques (ou groupes) en CHEQUE, sans plan chèque personnalisé, avec un réel achat mais aucune réception (hors retours) :
// le calcul ci-dessus ne produit alors aucune échéance. On les liste à part, sans date, hors des échéances et des totaux.
// Mêmes règles que calculerPlan pour le groupe, la marque pilote, la règle et la 1ère réception.
export function chequesEnAttente({ params, entrees, magasins, fournisseurs, fournisseursReels, reglements, plansCheques }, season) {
  const magasinMap      = Object.fromEntries(magasins.map(m => [m.id, m.nom]))
  const g = groupes({ fournisseurs, fournisseursReels, reglements, plansCheques }, season)
  const groupKeyOf = g.cleDe
  const recu = new Set()
  entrees.forEach(e => {
    if (e.statut === 'Retour') return
    const gk = groupKeyOf(e.fournisseurId)
    if (!gk || !magasinMap[e.magasinId] || !parseDate(e.date)) return
    recu.add(`${gk}|${e.magasinId}`)
  })
  const reelByGM = {}
  params.forEach(p => {
    const gk = groupKeyOf(p.fournisseurId)
    if (!gk) return
    const kk = `${gk}|${p.magasinId}`
    if (p.reelN) reelByGM[kk] = (reelByGM[kk] || 0) + p.reelN
  })
  const out = [], seen = new Set()
  g.ordre.forEach(gk => {
    magasins.forEach(m => {
      const kk = `${gk}|${m.id}`
      if (seen.has(kk)) return
      seen.add(kk)
      const regle = g.regle(gk, m.id)
      if (!regle || regle.mode !== 'CHEQUE') return
      const plan = g.planCheque(gk, m.id)
      if (Array.isArray(plan) && plan.length) return
      if (!reelByGM[kk] || recu.has(kk)) return
      const nb = parseInt(regle.cond.nb) || DEFAULT_NB_CHEQUE
      out.push({ fournisseur: g.nom(gk), magasin: m.nom, societe: getSociete(m.nom), mode: 'CHEQUE', montant: reelByGM[kk], nb,
        info: `Aucune réception — ${nb} chèque${nb > 1 ? 's' : ''} prévu${nb > 1 ? 's' : ''} à partir de la 1ère réception` })
    })
  })
  return out.sort((a, b) => a.fournisseur.localeCompare(b.fournisseur) || a.magasin.localeCompare(b.magasin))
}
