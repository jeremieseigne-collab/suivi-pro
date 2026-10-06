import { useState, useMemo } from 'react'
import { useLiveQuery } from '../lib/useLiveQuery'
import { db } from '../db'
import { useSeason } from '../context/SeasonContext'
import { LoadingState } from '../components/shared'
import { getSociete } from '../data/societes'
import TopModal, { StockGrid } from './TopModal'
import ReassortModal from './ReassortModal'
import ReceptionModal from './ReceptionModal'
import { buildReassortMailUrl, coordMarque } from './mail'
import {
  ETAPES, ETAPES_ACTIVES, ETAPE_COLORS, ETAPE_ICONS, CELL, RETARD_ORANGE,
  fmtDate, joursDepuis, sortSizes, resteParPointure, isActif, retard, etatPointure, proposition, cleanStock, supprimerTop,
} from './constants'

const RETARD_COLOR = { orange: '#f97316', rouge: '#dc2626' }

function nextEtape(statut) { return ETAPES[ETAPES.indexOf(statut) + 1] }

// Saisie rapide du stock (pointures suivies uniquement)
function StockModal({ top, onClose }) {
  const [stock, setStock] = useState(() => Object.fromEntries(Object.entries(top.stock || {}).map(([k, v]) => [k, String(v)])))
  const [saving, setSaving] = useState(false)
  async function save() {
    setSaving(true)
    try {
      await db.topModeles.update(top.id, { stock: cleanStock(stock, top.pointures || []), stockAt: new Date().toISOString() })
      onClose()
    } catch (e) { alert('Erreur : ' + (e.message || e)); setSaving(false) }
  }
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 560 }}>
        <div className="modal-header">
          <h2>📝 Stock — {top.modele}</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <p style={{ fontSize: 14, color: 'var(--text-2)', margin: 0 }}>Combien de paires reste-t-il en magasin, par pointure ?</p>
          <StockGrid sizes={top.pointures || []} pointures={top.pointures || []} stock={stock} cible={top.cible || 1}
            onStock={(s, v) => setStock(st => ({ ...st, [s]: v }))} />
          <div className="modal-actions">
            <button className="btn-secondary" onClick={onClose}>Annuler</button>
            <button className="btn-primary" onClick={save} disabled={saving}>{saving ? '⏳…' : 'Enregistrer le stock'}</button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Petite frise des étapes d'un réassort
function Stepper({ statut }) {
  const idx = ETAPES.indexOf(statut)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
      {ETAPES.map((e, i) => (
        <div key={e} style={{ display: 'flex', alignItems: 'center', flex: i < ETAPES.length - 1 ? 1 : 'none' }}>
          <div title={e} style={{
            width: 22, height: 22, borderRadius: '50%', flexShrink: 0, fontSize: 11,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: i <= idx ? ETAPE_COLORS[statut] : 'var(--surface-3)',
            color: i <= idx ? '#fff' : 'var(--text-4)', fontWeight: 700,
            boxShadow: i === idx ? `0 0 0 3px ${ETAPE_COLORS[statut]}33` : 'none',
          }}>{i < idx ? '✓' : i + 1}</div>
          {i < ETAPES.length - 1 && <div style={{ flex: 1, height: 3, minWidth: 8, background: i < idx ? ETAPE_COLORS[statut] : 'var(--surface-3)' }} />}
        </div>
      ))}
    </div>
  )
}

function Badge({ color, children }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap', background: color + '1f', color, border: `1px solid ${color}55` }}>
      {children}
    </span>
  )
}

function smallBtn(color) {
  return { padding: '6px 10px', borderRadius: 8, border: `1px solid ${color || 'var(--border)'}`, background: 'var(--surface)', color: color || 'var(--text-2)', fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }
}

function TopCard({ t, onEdit, onDelete, onStock, onNewReassort, onEditReassort, onAdvance, onMail, onReception, onArchive, onUnarchive, onRelance }) {
  const r = t.actif
  const niveau = r ? retard(r) : null
  const joursRoute = r?.statut === 'En route' ? joursDepuis(r.etapes?.['En route']) : null
  const borderColor = niveau ? RETARD_COLOR[niveau] : t.alerte ? CELL.rupture.border : t.termine ? '#86efac' : 'var(--border)'

  return (
    <div onClick={onEdit} style={{
      background: 'var(--surface)', border: `2px solid ${borderColor}`, borderRadius: 14, padding: 14,
      display: 'flex', flexDirection: 'column', gap: 10, cursor: 'pointer', boxShadow: '0 2px 10px var(--shadow)',
      opacity: t.archive ? 0.65 : 1,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.5, color: 'var(--text-4)', textTransform: 'uppercase' }}>{t.marque}</div>
          <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)', lineHeight: 1.2 }}>
            {t.modele}{t.numero && <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-3)', marginLeft: 6 }}>N°{t.numero}</span>}
          </div>
        </div>
        {r ? (
          <Badge color={niveau ? RETARD_COLOR[niveau] : ETAPE_COLORS[r.statut]}>
            {ETAPE_ICONS[r.statut]} {r.statut}{joursRoute != null ? ` · ${joursRoute} j` : ''}
          </Badge>
        ) : t.archive ? (
          <Badge color="#64748b">🗄 Archivé</Badge>
        ) : t.termine ? (
          <Badge color="#16a34a">✅ Réassort reçu</Badge>
        ) : t.alerte ? (
          <Badge color="#dc2626">⚠️ {t.ruptures} en rupture</Badge>
        ) : t.dernierRecu ? (
          <Badge color="#16a34a">✓ OK</Badge>
        ) : (
          <Badge color="#64748b">○ Aucun réassort</Badge>
        )}
      </div>

      {/* Mini-grille des pointures */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
        {t.pointures.map(s => {
          const c = CELL[etatPointure(t, s, t.enCommande)]
          const st = t.stock?.[s]
          return (
            <div key={s} title={`Pointure ${s} · stock ${st ?? 0}${t.enCommande[s] ? ` · ${t.enCommande[s]} en commande` : ''}`}
              style={{ minWidth: 38, padding: '2px 4px', borderRadius: 6, textAlign: 'center', background: c.bg, border: `1px solid ${c.border}`, color: c.text }}>
              <div style={{ fontSize: 11, fontWeight: 700 }}>{s}</div>
              <div style={{ fontSize: 12, fontWeight: 800 }}>
                {st ?? 0}{t.enCommande[s] ? <span style={{ fontSize: 10, fontWeight: 700 }}> +{t.enCommande[s]}</span> : null}
              </div>
            </div>
          )
        })}
      </div>

      <div style={{ fontSize: 12, color: 'var(--text-3)', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <span>📥 Reçu cette saison : <strong style={{ color: 'var(--text-2)' }}>{t.recuSaison}</strong>{t.derniere ? ` · dernière entrée ${t.derniere}` : ''}</span>
        <span>📝 Stock {t.stockAt ? `mis à jour il y a ${joursDepuis(t.stockAt)} j` : 'jamais saisi'}</span>
      </div>

      {!r && (
        t.dernierRecu ? (
          <div style={{ fontSize: 12, padding: '8px 10px', borderRadius: 10, background: '#16a34a14', border: '1px solid #16a34a40', color: 'var(--text-2)' }}>
            <strong style={{ color: '#16a34a' }}>✅ Dernier réassort reçu le {fmtDate(t.dernierRecu.etapes?.['Reçu'])}</strong>
            <span style={{ color: 'var(--text-3)' }}> · {sortSizes(Object.keys(t.dernierRecu.sizes || {})).map(s => `${s}×${t.dernierRecu.sizes[s]}`).join('  ')}</span>
            {t.histo.length > 1 && <span style={{ color: 'var(--text-4)' }}> · {t.histo.length} réassorts au total</span>}
          </div>
        ) : (
          <div style={{ fontSize: 12, padding: '8px 10px', borderRadius: 10, background: 'var(--surface-2)', border: '1px dashed var(--border)', color: 'var(--text-4)' }}>
            ○ Aucun réassort lancé pour ce modèle
          </div>
        )
      )}

      {r && (
        <div onClick={e => e.stopPropagation()} style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: 10, borderRadius: 10, background: 'var(--surface-2)' }}>
          <Stepper statut={r.statut} />
          <div style={{ fontSize: 12, color: 'var(--text-2)' }}>
            {sortSizes(Object.keys(r.sizes || {})).map(s => {
              const reste = (r.sizes[s] || 0) - (r.recu?.[s] || 0)
              return <span key={s} style={{ marginRight: 8, textDecoration: reste <= 0 ? 'line-through' : 'none', opacity: reste <= 0 ? 0.5 : 1 }}>{s}×{r.sizes[s]}</span>
            })}
            {r.par && <span style={{ color: 'var(--text-4)' }}> · par {r.par}</span>}
          </div>
          {niveau && (
            <div style={{ fontSize: 12, fontWeight: 700, color: RETARD_COLOR[niveau] }}>
              ⏰ En route depuis {joursRoute} jours — relancer la marque ?
            </div>
          )}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {nextEtape(r.statut) && nextEtape(r.statut) !== 'Reçu' && (
              <button style={smallBtn(ETAPE_COLORS[nextEtape(r.statut)])} onClick={() => onAdvance(r)}>
                → {ETAPE_ICONS[nextEtape(r.statut)]} {nextEtape(r.statut)}
              </button>
            )}
            {['À réassortir', 'Demandé'].includes(r.statut) && (
              <button style={smallBtn()} onClick={() => onMail(t, r)} title="Préparer le mail de commande à la marque">✉️ Commander par mail</button>
            )}
            {['Commandé', 'En route'].includes(r.statut) && (
              <button style={{ ...smallBtn('#10b981'), background: '#10b981', color: '#fff' }} onClick={() => onReception(t, r)}>📦 Réassort reçu</button>
            )}
            <button style={smallBtn()} onClick={() => onEditReassort(t, r)} title="Modifier le réassort">✏️</button>
          </div>
        </div>
      )}

      <div onClick={e => e.stopPropagation()} style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {!t.archive && <button style={smallBtn()} onClick={() => onStock(t)}>📝 Stock</button>}
        {t.archive && (
          <button style={smallBtn('var(--accent)')} onClick={() => onUnarchive(t)} title="Remettre ce modèle dans le suivi">↩ Désarchiver</button>
        )}
        {t.termine && (
          <>
            <button style={{ ...smallBtn('#16a34a'), background: '#16a34a', color: '#fff' }} onClick={() => onArchive(t)} title="Réassort terminé : ranger ce modèle dans les archives">🗄 Archiver</button>
            <button style={smallBtn()} onClick={() => onRelance(t)} title="Le modèle marche encore : reprendre le suivi et pouvoir relancer un réassort">↻ Relancer le suivi</button>
          </>
        )}
        {!r && !t.archive && !t.termine && (
          <button style={t.alerte ? { ...smallBtn('#dc2626'), background: '#dc2626', color: '#fff' } : smallBtn('var(--accent)')}
            onClick={() => onNewReassort(t)}>
            🔄 Lancer un réassort{Object.keys(t.prop).length ? ` (${Object.values(t.prop).reduce((a, b) => a + b, 0)} p.)` : ''}
          </button>
        )}
        <button style={{ ...smallBtn(), marginLeft: 'auto', color: 'var(--text-4)' }} onClick={() => onDelete(t)} title="Supprimer ce top modèle">🗑</button>
      </div>
    </div>
  )
}

export default function Reassort({ magasin }) {
  const { season } = useSeason()
  const [vue,     setVue]     = useState('magasin') // 'magasin' | 'tous'
  const [search,  setSearch]  = useState('')
  const [filtre,  setFiltre]  = useState('')        // '' | 'rupture' | 'encours' | 'retard' | 'recu' | 'aucun' | 'archive'
  const [modal,   setModal]   = useState(null)      // { type, top, reassort }

  const data = useLiveQuery(async () => {
    const [tops, reassorts, magasins, fournisseurs, entrees, salaries] = await Promise.all([
      db.topModeles.where('season').equals(season).toArray(),
      db.reassorts.where('season').equals(season).toArray(),
      db.magasins.toArray(),
      db.fournisseurs.toArray(),
      db.entrees.where('season').equals(season).toArray(),
      db.salaries.orderBy('nom').toArray(),
    ])
    return { tops, reassorts, magasins, fournisseurs, entrees, salaries }
  }, [season])

  const enriched = useMemo(() => {
    if (!data) return []
    const fById = Object.fromEntries(data.fournisseurs.map(f => [f.id, f]))
    const magById = Object.fromEntries(data.magasins.map(m => [m.id, m.nom]))
    // Reçu par magasin × marque × modèle (hors retours)
    const recu = {}
    data.entrees.forEach(e => {
      if (e.statut === 'Retour') return
      const k = `${e.magasinId}|${e.fournisseurId}|${e.modele}`
      const cur = recu[k] || (recu[k] = { total: 0, last: null, lastDate: '' })
      cur.total += Number(e.total) || 0
      if (!cur.last || e.id > cur.last) { cur.last = e.id; cur.lastDate = e.date }
    })
    return data.tops.map(t => {
      const pointures = t.pointures || []
      const histo = data.reassorts.filter(r => r.topId === t.id).sort((a, b) => b.id - a.id)
      const actif = histo.find(isActif) || null
      const dernierRecu = histo.find(r => r.statut === 'Reçu') || null
      const enCommande = {}
      histo.filter(isActif).forEach(r => Object.entries(resteParPointure(r)).forEach(([s, q]) => { enCommande[s] = (enCommande[s] || 0) + q }))
      const etats = pointures.map(s => etatPointure(t, s, enCommande))
      const rc = recu[`${t.magasinId}|${t.fournisseurId}|${t.modele}`]
      const archive = !!t.archivedAt
      // Réassort reçu et suivi pas encore relancé : on n'en propose plus
      const recuLe = dernierRecu?.etapes?.['Reçu'] || ''
      const termine = !archive && !actif && !!dernierRecu && (!t.relanceAt || recuLe > t.relanceAt)
      return {
        ...t, pointures, histo, actif, dernierRecu, enCommande,
        marque: fById[t.fournisseurId]?.nom || '—', fournisseurObj: fById[t.fournisseurId],
        magasinNom: magById[t.magasinId] || '—',
        ruptures: etats.filter(e => e === 'rupture').length,
        archive, termine,
        // À réassortir = ruptures, hors réassort en cours / reçu en attente / archivé
        alerte: !archive && !termine && !actif && etats.includes('rupture'),
        prop: proposition({ ...t, pointures }, enCommande),
        recuSaison: rc?.total || 0, derniere: rc?.lastDate || '',
      }
    })
  }, [data])

  // Priorité d'affichage : retards, ruptures sans réassort, réassorts en cours, OK
  function priorite(t) {
    const n = t.actif ? retard(t.actif) : null
    if (n === 'rouge') return 0
    if (n === 'orange') return 1
    if (t.alerte) return 2
    if (t.actif) return 3
    if (t.termine) return 5
    return 4
  }

  const tops = useMemo(() => enriched
    .filter(t => t.magasinId === magasin.id)
    .filter(t => {
      if (filtre === 'archive' ? !t.archive : t.archive) return false
      if (filtre === 'rupture' && !t.alerte) return false
      if (filtre === 'encours' && !t.actif) return false
      if (filtre === 'retard' && !(t.actif && retard(t.actif))) return false
      if (filtre === 'recu'   && !t.termine) return false
      if (filtre === 'aucun'  && t.histo.length > 0) return false
      if (search) {
        const q = search.toLowerCase()
        if (![t.marque, t.modele, t.numero, t.note].join(' ').toLowerCase().includes(q)) return false
      }
      return true
    })
    .sort((a, b) => priorite(a) - priorite(b) || a.marque.localeCompare(b.marque) || a.modele.localeCompare(b.modele)),
  [enriched, magasin.id, filtre, search])

  const mine = enriched.filter(t => t.magasinId === magasin.id)
  const stats = {
    tops:     mine.filter(t => !t.archive).length,
    rupture:  mine.filter(t => t.alerte).length,
    encours:  mine.filter(t => t.actif).length,
    enroute:  mine.filter(t => t.actif?.statut === 'En route').length,
    retard:   mine.filter(t => t.actif && retard(t.actif)).length,
    recu:     mine.filter(t => t.termine).length,
    aucun:    mine.filter(t => !t.archive && t.histo.length === 0).length,
    archive:  mine.filter(t => t.archive).length,
  }

  const salariesMag = (data?.salaries || []).filter(s => !s.magasin || s.magasin === magasin.nom)
  const topById = Object.fromEntries(enriched.map(t => [t.id, t]))

  async function advance(r) {
    const next = nextEtape(r.statut)
    if (!next || next === 'Reçu') return
    try {
      await db.reassorts.update(r.id, { statut: next, etapes: { ...(r.etapes || {}), [next]: new Date().toISOString() } })
    } catch (e) { alert('Erreur : ' + (e.message || e)) }
  }

  function sendMail(t, r) {
    const f = t.fournisseurObj
    const reste = resteParPointure(r)
    window.open(buildReassortMailUrl({
      modele: t.modele, numero: t.numero, sizes: Object.keys(reste).length ? reste : r.sizes,
      magasin: t.magasinNom, salarie: r.par, societe: getSociete(t.magasinNom),
      email: coordMarque(f, t.magasinId, 'email'), numeroClient: coordMarque(f, t.magasinId, 'numeroClient'),
    }), '_blank')
    if (['À réassortir', 'Demandé'].includes(r.statut)) {
      db.reassorts.update(r.id, { statut: 'Commandé', etapes: { ...(r.etapes || {}), Commandé: new Date().toISOString() } }).catch(() => {})
    }
  }

  async function majTop(t, changes) {
    try { await db.topModeles.update(t.id, changes) } catch (e) { alert('Erreur : ' + (e.message || e)) }
  }

  async function deleteTop(t) {
    const nb = t.histo.length
    const msg = `Supprimer le top modèle « ${t.modele} » (${t.marque}) ?`
      + (nb ? `\n\nSes ${nb} réassort${nb > 1 ? 's' : ''} ser${nb > 1 ? 'ont' : 'a'} aussi supprimé${nb > 1 ? 's' : ''}. Les entrées déjà créées dans le Cahier restent.` : '')
    if (!window.confirm(msg)) return
    try { await supprimerTop(t.id) } catch (e) { alert('Erreur : ' + (e.message || e)) }
  }

  const close = () => setModal(null)
  const handlers = {
    onEdit:         t => setModal({ type: 'top', top: t }),
    onDelete:       deleteTop,
    onArchive:      t => majTop(t, { archivedAt: new Date().toISOString() }),
    onUnarchive:    t => majTop(t, { archivedAt: null, relanceAt: new Date().toISOString() }),
    onRelance:      t => majTop(t, { relanceAt: new Date().toISOString() }),
    onStock:        t => setModal({ type: 'stock', top: t }),
    onNewReassort:  t => setModal({ type: 'reassort', top: t }),
    onEditReassort: (t, r) => setModal({ type: 'reassort', top: t, reassort: r }),
    onAdvance:      advance,
    onMail:         sendMail,
    onReception:    (t, r) => setModal({ type: 'reception', top: t, reassort: r }),
  }

  if (data === undefined) return <LoadingState />

  // Vue « Tous magasins » : réassorts en cours des 3 boutiques, regroupés par marque
  const recusTous = data.reassorts
    .filter(r => r.statut === 'Reçu' && joursDepuis(r.etapes?.['Reçu']) <= 30 && topById[r.topId])
    .sort((a, b) => (b.etapes?.['Reçu'] || '').localeCompare(a.etapes?.['Reçu'] || ''))
  const actifsTous = data.reassorts.filter(isActif).map(r => ({ r, t: topById[r.topId] })).filter(x => x.t)
  const parMarque = {}
  actifsTous.forEach(x => { (parMarque[x.t.marque] ||= []).push(x) })

  const chip = (id, label, n, color) => (
    <button key={id} onClick={() => setFiltre(f => f === id ? '' : id)}
      style={{
        padding: '6px 12px', borderRadius: 20, fontSize: 13, fontWeight: 600, cursor: 'pointer',
        border: `1px solid ${filtre === id ? color : 'var(--border)'}`,
        background: filtre === id ? color + '1f' : 'var(--surface)', color: filtre === id ? color : 'var(--text-2)',
      }}>{label} {n > 0 && <strong>({n})</strong>}</button>
  )

  return (
    <>
      {modal?.type === 'top'       && <TopModal top={modal.top} magasinId={magasin.id} historique={modal.top?.histo || []} onClose={close} />}
      {modal?.type === 'stock'     && <StockModal top={modal.top} onClose={close} />}
      {modal?.type === 'reassort'  && <ReassortModal top={modal.top} reassort={modal.reassort} proposition={modal.top.prop} enCommande={modal.top.enCommande} salaries={salariesMag} onClose={close} />}
      {modal?.type === 'reception' && <ReceptionModal top={modal.top} reassort={modal.reassort} magasinNom={modal.top.magasinNom} onClose={close} />}

      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'inline-flex', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
          {[['magasin', `🏪 ${magasin.nom}`], ['tous', '🌐 Tous magasins']].map(([id, label]) => (
            <button key={id} onClick={() => setVue(id)}
              style={{ padding: '8px 14px', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700, background: vue === id ? 'var(--accent)' : 'var(--surface)', color: vue === id ? 'var(--on-accent)' : 'var(--text-2)' }}>
              {label}
            </button>
          ))}
        </div>
        {vue === 'magasin' && (
          <button className="btn-primary" style={{ marginLeft: 'auto' }} onClick={() => setModal({ type: 'top', top: null })}>+ Ajouter un top modèle</button>
        )}
      </div>

      {vue === 'magasin' ? (
        <>
          <div className="tab-stats" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))' }}>
            <div className="stat-card"><span className="stat-value">{stats.tops}</span><span className="stat-label">Top modèles</span></div>
            <div className="stat-card"><span className="stat-value" style={{ color: stats.rupture ? '#dc2626' : undefined }}>{stats.rupture}</span><span className="stat-label">À réassortir</span></div>
            <div className="stat-card"><span className="stat-value">{stats.encours}</span><span className="stat-label">Réassorts en cours</span></div>
            <div className="stat-card"><span className="stat-value" style={{ color: stats.enroute ? '#8b5cf6' : undefined }}>{stats.enroute}</span><span className="stat-label">🚚 En route</span></div>
            <div className="stat-card"><span className="stat-value" style={{ color: stats.retard ? '#f97316' : undefined }}>{stats.retard}</span><span className="stat-label">⏰ En retard (+{RETARD_ORANGE} j)</span></div>
          </div>

          <div className="controls" style={{ flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
            <input type="text" placeholder="🔍 Marque, modèle, N°…" value={search} onChange={e => setSearch(e.target.value)} className="search-input" />
            {chip('rupture', '⚠️ À réassortir', stats.rupture, '#dc2626')}
            {chip('encours', '🔄 En cours', stats.encours, '#3b82f6')}
            {chip('retard', '⏰ En retard', stats.retard, '#f97316')}
            {chip('recu', '✅ Réassortis', stats.recu, '#16a34a')}
            {chip('aucun', '○ Sans réassort', stats.aucun, '#64748b')}
            {chip('archive', '🗄 Archivés', stats.archive, '#64748b')}
          </div>

          <div style={{ display: 'flex', gap: 12, fontSize: 12, color: 'var(--text-3)', marginBottom: 12, flexWrap: 'wrap' }}>
            {[['rupture', 'Rupture'], ['commande', 'En commande'], ['ok', 'OK']].map(([k, l]) => (
              <span key={k} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 12, height: 12, borderRadius: 3, background: CELL[k].bg, border: `1px solid ${CELL[k].border}` }} />{l}
              </span>
            ))}
          </div>

          {tops.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 16px', color: 'var(--text-3)' }}>
              <div style={{ fontSize: 40 }}>⭐</div>
              {mine.length === 0
                ? <p>Aucun top modèle pour {magasin.nom} cette saison.<br />Ajoute tes meilleures ventes pour suivre leurs réassorts.</p>
                : <p>Aucun modèle ne correspond au filtre.</p>}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 14 }}>
              {tops.map(t => <TopCard key={t.id} t={t} {...handlers} />)}
            </div>
          )}
        </>
      ) : (
        <>
          {actifsTous.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 16px', color: 'var(--text-3)' }}>Aucun réassort en cours dans les magasins.</div>
          ) : Object.keys(parMarque).sort().map(marque => (
            <div key={marque} style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)', marginBottom: 6 }}>
                {marque} <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-4)' }}>· {parMarque[marque].length} réassort{parMarque[marque].length > 1 ? 's' : ''}</span>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr><th>Magasin</th><th>Modèle</th><th>Pointures</th><th>Étape</th><th>Depuis</th><th>Par</th><th></th></tr>
                  </thead>
                  <tbody>
                    {parMarque[marque].sort((a, b) => ETAPES_ACTIVES.indexOf(b.r.statut) - ETAPES_ACTIVES.indexOf(a.r.statut)).map(({ r, t }) => {
                      const niveau = retard(r)
                      const depuis = joursDepuis(r.etapes?.[r.statut] || r.createdAt)
                      const reste = resteParPointure(r)
                      return (
                        <tr key={r.id}>
                          <td style={{ fontWeight: 600 }}>{t.magasinNom}</td>
                          <td>{t.modele}{t.numero && <span style={{ color: 'var(--text-4)', fontSize: 12 }}> N°{t.numero}</span>}</td>
                          <td style={{ fontSize: 13 }}>{sortSizes(Object.keys(reste)).map(s => `${s}×${reste[s]}`).join('  ')}</td>
                          <td><Badge color={niveau ? RETARD_COLOR[niveau] : ETAPE_COLORS[r.statut]}>{ETAPE_ICONS[r.statut]} {r.statut}</Badge></td>
                          <td style={{ fontSize: 13, color: niveau ? RETARD_COLOR[niveau] : 'var(--text-3)', fontWeight: niveau ? 700 : 400 }}>
                            {depuis != null ? `${depuis} j` : '—'} <span style={{ color: 'var(--text-4)', fontWeight: 400 }}>({fmtDate(r.etapes?.[r.statut] || r.createdAt)})</span>
                          </td>
                          <td style={{ fontSize: 13 }}>{r.par || '—'}</td>
                          <td style={{ whiteSpace: 'nowrap' }}>
                            {nextEtape(r.statut) && nextEtape(r.statut) !== 'Reçu' && (
                              <button style={smallBtn(ETAPE_COLORS[nextEtape(r.statut)])} onClick={() => advance(r)}>→ {nextEtape(r.statut)}</button>
                            )}
                            {['Commandé', 'En route'].includes(r.statut) && (
                              <button style={{ ...smallBtn('#10b981'), marginLeft: 4 }} onClick={() => setModal({ type: 'reception', top: t, reassort: r })}>📦 Reçu</button>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}

          <div style={{ marginTop: 28 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)', marginBottom: 6 }}>
              ✅ Reçus ces 30 derniers jours <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-4)' }}>· {recusTous.length}</span>
            </div>
            {recusTous.length === 0 ? (
              <div style={{ fontSize: 13, color: 'var(--text-4)' }}>Aucun réassort reçu récemment.</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table">
                  <thead><tr><th>Reçu le</th><th>Magasin</th><th>Marque</th><th>Modèle</th><th>Pointures</th><th>Par</th></tr></thead>
                  <tbody>
                    {recusTous.map(r => {
                      const t = topById[r.topId]
                      return (
                        <tr key={r.id} style={{ opacity: 0.85 }}>
                          <td style={{ fontSize: 13 }}>{fmtDate(r.etapes?.['Reçu'])}</td>
                          <td style={{ fontWeight: 600 }}>{t.magasinNom}</td>
                          <td>{t.marque}</td>
                          <td>{t.modele}{t.numero && <span style={{ color: 'var(--text-4)', fontSize: 12 }}> N°{t.numero}</span>}</td>
                          <td style={{ fontSize: 13 }}>{sortSizes(Object.keys(r.sizes || {})).map(s => `${s}×${r.sizes[s]}`).join('  ')}</td>
                          <td style={{ fontSize: 13 }}>{r.par || '—'}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </>
  )
}
