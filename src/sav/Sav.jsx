import { useState, useMemo } from 'react'
import { useLiveQuery } from '../lib/useLiveQuery'
import { db } from '../db'
import { STATUTS_RETOUR, STATUTS_FORME, STATUT_COLORS } from './constants'
import SavModal from './SavModal'
import StoreSelect from '../components/StoreSelect'

function fmtDate(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  return isNaN(d) ? '—' : d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

function StatusStepper({ type, statut }) {
  const statuts = type === 'retour' ? STATUTS_RETOUR : STATUTS_FORME
  const idx = statuts.indexOf(statut)
  const color = STATUT_COLORS[statut] || '#94a3b8'
  return (
    <div style={{ marginTop: 10 }}>
      <div style={{ display: 'flex', gap: 3, marginBottom: 5 }}>
        {statuts.map((s, i) => (
          <div key={s} style={{
            flex: 1, height: 5, borderRadius: 3,
            background: i <= idx ? (STATUT_COLORS[s] || color) : 'var(--border)',
            transition: 'background 0.3s',
          }} />
        ))}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{
          display: 'inline-block', padding: '2px 10px', borderRadius: 20,
          fontSize: 11, fontWeight: 700,
          background: color + '22', color,
        }}>{statut}</span>
        <span style={{ fontSize: 11, color: 'var(--text-4)' }}>{idx + 1}/{statuts.length}</span>
      </div>
    </div>
  )
}

function SavCard({ row, onClick }) {
  const [hover, setHover] = useState(false)
  const isRetour = row.type === 'retour'
  return (
    <div onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: 'var(--surface)', border: `1px solid ${hover ? 'var(--accent)' : 'var(--border)'}`,
        borderRadius: 12, padding: '14px 18px', cursor: 'pointer',
        boxShadow: hover ? '0 4px 16px rgba(59,130,246,0.12)' : '0 1px 4px var(--shadow)',
        transition: 'all 0.15s ease',
      }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, justifyContent: 'space-between' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
            <span style={{
              fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
              background: isRetour ? '#fef3c7' : '#dbeafe',
              color: isRetour ? '#92400e' : '#1e40af',
            }}>
              {isRetour ? '🔄 Retour' : '👟 Forme'}
            </span>
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{row.clientNom || '—'}</span>
            {row.clientTel && <span style={{ fontSize: 12, color: 'var(--text-3)' }}>{row.clientTel}</span>}
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 2 }}>
            {isRetour
              ? [row.marqueNom, row.modele, row.pointure].filter(Boolean).join(' — ')
              : [row.marque, row.modele, row.pointure].filter(Boolean).join(' — ')}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-4)', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {row.magasinNom && <span>📍 {row.magasinNom}</span>}
            {row.salarie    && <span>👤 {row.salarie}</span>}
            <span>🗓 {fmtDate(row.createdAt)}</span>
          </div>
          {row.type === 'retour' && row.statut === 'Clôturé' && row.decision && (
            <div style={{ marginTop: 4, fontSize: 12, fontWeight: 600, color: '#10b981' }}>
              ✅ {row.decision}
            </div>
          )}
        </div>
        <span style={{ fontSize: 18, color: hover ? 'var(--accent)' : 'var(--text-5)', flexShrink: 0 }}>›</span>
      </div>
      <StatusStepper type={row.type} statut={row.statut} />
    </div>
  )
}

export default function Sav({ onHome }) {
  const [showModal, setShowModal]   = useState(false)
  const [editSav,   setEditSav]     = useState(null)
  const [filterType, setFilterType] = useState('') // '' | 'retour' | 'forme'
  const [confirmDel, setConfirmDel] = useState(null)
  const [magasin, setMagasin] = useState(() => {
    try { return JSON.parse(localStorage.getItem('sav_magasin') || 'null') } catch { return null }
  })

  function selectMagasin(m) { localStorage.setItem('sav_magasin', JSON.stringify(m)); setMagasin(m) }
  function changeMagasin() { localStorage.removeItem('sav_magasin'); setMagasin(null) }

  const data = useLiveQuery(async () => {
    const [savs, magasins, fournisseurs] = await Promise.all([
      db.sav.toArray(), db.magasins.toArray(), db.fournisseurs.toArray(),
    ])
    const magMap  = Object.fromEntries(magasins.map(m => [m.id, m.nom]))
    const fourMap = Object.fromEntries(fournisseurs.map(f => [f.id, f.nom]))
    savs.sort((a, b) => b.id - a.id)
    return { savs: savs.map(s => ({ ...s, magasinNom: magMap[s.magasinId] || '—', marqueNom: fourMap[s.fournisseurId] || '' })), magasins }
  }, [])

  const rows    = data?.savs    ?? []

  const magRows = useMemo(() => magasin ? rows.filter(r => r.magasinId === magasin.id) : rows, [rows, magasin])

  const filtered = useMemo(() => magRows.filter(r => {
    if (filterType && r.type !== filterType) return false
    return true
  }), [magRows, filterType])

  const enCours = magRows.filter(r => r.statut !== 'Clôturé' && r.statut !== 'Récupéré').length

  async function handleDelete(id) {
    try { await db.sav.delete(id) } catch (e) { alert('Erreur : ' + e.message) } finally { setConfirmDel(null) }
  }

  function refresh() { setShowModal(false); setEditSav(null) }

  if (!magasin) return <StoreSelect onSelect={selectMagasin} onHome={onHome}
    theme={{ accent: '#0891b2', border: '#67e8f9', shadow: 'rgba(8,145,178,0.18)', gradient: 'linear-gradient(135deg, #0891b2, #0e7490)', icon: '🔧' }} />

  return (
    <div className="app">
      {showModal && <SavModal onClose={() => setShowModal(false)} onSaved={refresh} defaultMagasinId={magasin?.id} currentMagasin={magasin?.nom} />}
      {editSav   && <SavModal sav={editSav} onClose={() => setEditSav(null)} onSaved={refresh} defaultMagasinId={magasin?.id} currentMagasin={magasin?.nom} />}

      <header className="app-header">
        <div className="header-top" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button onClick={onHome} title="Retour"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 34, height: 34, borderRadius: 9, border: '1px solid var(--border)', background: 'var(--surface)', cursor: 'pointer', fontSize: 17, color: 'var(--text-2)', lineHeight: 1 }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface-2)'; e.currentTarget.style.color = 'var(--accent)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'var(--surface)'; e.currentTarget.style.color = 'var(--text-2)' }}>←</button>
            <h1>🔧 SAV</h1>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button onClick={changeMagasin}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 20, border: '2px solid #67e8f9', background: '#ecfeff', color: '#0891b2', fontWeight: 700, fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap' }}>
              🏪 {magasin.nom} &#9662;
            </button>
            <button className="btn-primary" onClick={() => setShowModal(true)}>+ Nouveau dossier</button>
          </div>
        </div>
        <div style={{ height: 12 }} />
      </header>

      <main className="app-main">
        {/* Stats */}
        <div className="tab-stats" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: 16 }}>
          <div className="stat-card"><span className="stat-value">{magRows.length}</span><span className="stat-label">Dossiers</span></div>
          <div className="stat-card"><span className="stat-value">{enCours}</span><span className="stat-label">En cours</span></div>
          <div className="stat-card">
            <span className="stat-value">{magRows.filter(r => r.type === 'retour').length}</span>
            <span className="stat-label">Retours</span>
          </div>
        </div>

        {/* Filtres */}
        <div className="controls" style={{ flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
          <div style={{ display: 'flex', gap: 6 }}>
            {[{ v: '', label: 'Tous' }, { v: 'retour', label: 'Retours' }, { v: 'forme', label: 'Forme' }].map(({ v, label }) => (
              <button key={v} onClick={() => setFilterType(v)}
                style={{
                  padding: '6px 14px', borderRadius: 20, border: `1px solid ${filterType === v ? 'var(--accent)' : 'var(--border)'}`,
                  background: filterType === v ? 'var(--accent-bg)' : 'var(--surface)',
                  color: filterType === v ? 'var(--accent)' : 'var(--text-3)',
                  cursor: 'pointer', fontSize: 13, fontWeight: filterType === v ? 700 : 400,
                }}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Liste */}
        {data === undefined ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-4)' }}>Chargement…</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 48, color: 'var(--text-4)' }}>
            {magRows.length === 0 ? 'Aucun dossier SAV — cliquez sur « + Nouveau dossier ».' : 'Aucun résultat pour ces filtres.'}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filtered.map(row => (
              <div key={row.id} style={{ position: 'relative' }}>
                <SavCard row={row} onClick={() => setEditSav(row)} />
                {confirmDel === row.id ? (
                  <div style={{ position: 'absolute', top: 10, right: 10, display: 'flex', gap: 4, background: 'var(--surface)', padding: 6, borderRadius: 8, border: '1px solid var(--border)', boxShadow: '0 4px 12px var(--shadow)' }}>
                    <button onClick={e => { e.stopPropagation(); handleDelete(row.id) }}
                      style={{ padding: '3px 10px', borderRadius: 6, border: 'none', background: '#dc2626', color: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                      Supprimer
                    </button>
                    <button onClick={e => { e.stopPropagation(); setConfirmDel(null) }}
                      style={{ padding: '3px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-3)', cursor: 'pointer', fontSize: 12 }}>
                      Annuler
                    </button>
                  </div>
                ) : (
                  <button onClick={e => { e.stopPropagation(); setConfirmDel(row.id) }}
                    style={{ position: 'absolute', top: 10, right: 10, padding: '4px 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-4)', cursor: 'pointer', fontSize: 13, opacity: 0.6 }}
                    title="Supprimer">🗑</button>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
