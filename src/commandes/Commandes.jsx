import { useState, useMemo } from 'react'
import { useLiveQuery } from '../lib/useLiveQuery'
import { db } from '../db'
import { LoadingState, fmtTel } from '../components/shared'
import CommandeModal from './CommandeModal'
import StoreSelect from '../components/StoreSelect'
import { useMagasin } from '../context/MagasinContext'
import { magasinCommandes, PROVENANCES, STATUTS, STATUTS_CLOS, STATUT_COLOR, PROVENANCE_COLOR } from './constants'

function Pill({ map, value }) {
  if (!value) return <span style={{ color: 'var(--text-5)' }}>—</span>
  const c = map[value] || { bg: '#f1f5f9', text: 'var(--text-3)' }
  return (
    <span style={{ padding: '3px 10px', borderRadius: 999, fontSize: 12, fontWeight: 600, background: c.bg, color: c.text, whiteSpace: 'nowrap' }}>
      {value}
    </span>
  )
}

function fmtDate(val) {
  if (!val) return '—'
  const d = new Date(val)
  if (isNaN(d)) return '—'
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

// ─── Popup d'affichage d'une note ─────────────────────────────────────────────
function NoteView({ commande, onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 460 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>📝 Note — {[commande.clientPrenom, commande.clientNom].filter(Boolean).join(' ') || 'commande'}</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <p style={{ whiteSpace: 'pre-wrap', fontSize: 15, color: 'var(--text)', lineHeight: 1.5 }}>
            {commande.note}
          </p>
        </div>
      </div>
    </div>
  )
}

export default function Commandes({ onHome }) {
  const { magasin: magasinCourant, setMagasin: setMagasinCourant } = useMagasin()
  const magasin = magasinCommandes(magasinCourant?.nom)
  const [search,     setSearch]     = useState('')
  const [fStatut,    setFStatut]    = useState('')
  const [fProv,      setFProv]      = useState('')
  const [fSalarie,   setFSalarie]   = useState('')
  const [showForm,   setShowForm]   = useState(false)
  const [editCmd,    setEditCmd]    = useState(null)
  const [confirmDel, setConfirmDel] = useState(null)
  const [noteView,   setNoteView]   = useState(null)
  const [hoverNote,  setHoverNote]  = useState(null)


  const data = useLiveQuery(async () => {
    const rows = await db.commandes.toArray()
    rows.sort((a, b) => b.id - a.id) // plus récentes en premier
    return rows
  }, [])

  const salaries = useLiveQuery(() => db.salaries.orderBy('nom').toArray(), [])
  const salarieNames = useMemo(() =>
    (salaries || []).filter(s => !s.magasin || s.magasin === magasin).map(s => s.nom),
    [salaries, magasin]
  )

  const rows = useMemo(() => (data ?? []).filter(r => r.magasin === magasin), [data, magasin])

  const filtered = useMemo(() => rows.filter(r => {
    if (fStatut  && r.statut     !== fStatut)  return false
    if (fProv    && r.provenance !== fProv)    return false
    if (fSalarie && r.salarie    !== fSalarie) return false
    if (search) {
      const q = search.toLowerCase()
      const hay = [r.clientNom, r.clientPrenom, r.telephone, r.marque, r.modele, r.reference, r.pointure]
        .map(v => (v || '').toLowerCase()).join(' ')
      if (!hay.includes(q)) return false
    }
    return true
  }), [rows, search, fStatut, fProv, fSalarie])

  const enCours  = rows.filter(r => !STATUTS_CLOS.includes(r.statut)).length
  const retirees = rows.filter(r => r.statut === 'Retirée').length

  async function changeStatut(id, statut) {
    try { await db.commandes.update(id, { statut }) }
    catch (e) { alert('Erreur : ' + (e.message || e)) }
  }

  async function handleDelete(id) {
    try { await db.commandes.delete(id) }
    catch (e) { alert('Erreur : ' + (e.message || e)) }
    finally { setConfirmDel(null) }
  }

  // Tant qu'aucun magasin n'est choisi → écran de sélection
  if (!magasin) return <StoreSelect onSelect={setMagasinCourant} onHome={onHome}
    theme={{ accent: '#6d28d9', border: '#c4b5fd', shadow: 'rgba(109,40,217,0.18)', gradient: 'linear-gradient(135deg, #8b5cf6, #6d28d9)', icon: '🛍️' }} />

  return (
    <div className="app">
      {showForm && <CommandeModal defaultMagasin={magasin} salaries={salarieNames} onClose={() => setShowForm(false)} onSaved={() => setShowForm(false)} />}
      {editCmd  && <CommandeModal commande={editCmd} defaultMagasin={magasin} salaries={salarieNames} onClose={() => setEditCmd(null)} onSaved={() => setEditCmd(null)} />}
      {noteView && <NoteView commande={noteView} onClose={() => setNoteView(null)} />}
      {hoverNote && (
        <div style={{
          position: 'fixed', top: hoverNote.top, left: hoverNote.left, width: 300, maxWidth: '90vw', zIndex: 500,
          background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10,
          boxShadow: '0 8px 24px var(--shadow-lg)', padding: '10px 14px', fontSize: 13, color: 'var(--text)',
          whiteSpace: 'pre-wrap', lineHeight: 1.45, pointerEvents: 'none',
        }}>
          {hoverNote.client && <div style={{ fontWeight: 700, marginBottom: 4, fontSize: 12, color: 'var(--text-3)' }}>📝 {hoverNote.client}</div>}
          {hoverNote.text}
        </div>
      )}

      <header className="app-header">
        <div className="header-top" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              onClick={onHome}
              title="Retour à l'accueil"
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: 34, height: 34, borderRadius: 9, border: '1px solid var(--border)',
                background: 'var(--surface)', cursor: 'pointer', fontSize: 17, color: 'var(--text-2)', lineHeight: 1,
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface-2)'; e.currentTarget.style.color = 'var(--accent)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'var(--surface)'; e.currentTarget.style.color = 'var(--text-2)' }}
            >←</button>
            <h1>🛍️ Commandes Clients</h1>
            <button
              onClick={() => setMagasinCourant(null)}
              title="Changer de magasin"
              style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 20,
                border: '2px solid #c4b5fd', background: '#ede9fe', color: '#6d28d9',
                fontWeight: 700, fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap',
              }}
            >🏪 {magasin} ▾</button>
          </div>
          <button className="btn-primary" onClick={() => setShowForm(true)}>+ Nouvelle commande</button>
        </div>
        <div style={{ height: 16 }} />
      </header>

      <main className="app-main">
        <div className="tab-stats" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
          {[
            { value: rows.length, label: 'Commandes' },
            { value: enCours,     label: 'En cours' },
            { value: retirees,    label: 'Retirées' },
          ].map(s => (
            <div key={s.label} className="stat-card">
              <span className="stat-value">{s.value}</span>
              <span className="stat-label">{s.label}</span>
            </div>
          ))}
        </div>

        <div className="controls" style={{ flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
          <input
            type="text" placeholder="🔍 Client, téléphone, marque, modèle, réf…" value={search}
            onChange={e => setSearch(e.target.value)} className="search-input"
          />
          <select value={fStatut} onChange={e => setFStatut(e.target.value)} className="sel">
            <option value="">Tous les états</option>
            {STATUTS.map(s => <option key={s}>{s}</option>)}
          </select>
          <select value={fProv} onChange={e => setFProv(e.target.value)} className="sel">
            <option value="">Toutes provenances</option>
            {PROVENANCES.map(p => <option key={p}>{p}</option>)}
          </select>
          <select value={fSalarie} onChange={e => setFSalarie(e.target.value)} className="sel">
            <option value="">Tous les salariés</option>
            {salarieNames.map(s => <option key={s}>{s}</option>)}
          </select>
        </div>

        {data === undefined ? <LoadingState /> : (
          <div className="store-card" style={{ marginTop: 0, padding: 0, overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>État</th><th>Date</th><th>Salarié</th><th>Provenance</th><th>Client</th>
                    <th>Téléphone</th><th>Marque</th><th>Modèle</th><th>Réf N°</th><th>Pointure</th>
                    <th>Note</th><th></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 && (
                    <tr><td colSpan={12} style={{ textAlign: 'center', padding: 40, color: 'var(--text-4)' }}>
                      {rows.length === 0 ? 'Aucune commande pour ce magasin — cliquez sur « + Nouvelle commande ».' : 'Aucun résultat.'}
                    </td></tr>
                  )}
                  {filtered.map(r => {
                    const clientName = [r.clientPrenom, r.clientNom].filter(Boolean).join(' ')
                    return (
                    <tr key={r.id}
                      style={{
                        background: STATUTS_CLOS.includes(r.statut) ? 'var(--surface-3)' : undefined,
                        opacity: STATUTS_CLOS.includes(r.statut) ? 0.55 : undefined,
                      }}
                      onMouseEnter={e => {
                        if (!r.note) return
                        const cell = e.currentTarget.querySelector('[data-note-cell]')
                        if (!cell) return
                        const rect = cell.getBoundingClientRect()
                        setHoverNote({ text: r.note, client: clientName, top: rect.bottom + 6, left: Math.max(8, rect.right - 300) })
                      }}
                      onMouseLeave={() => setHoverNote(null)}
                    >
                      <td>
                        <select
                          value={r.statut}
                          onChange={e => changeStatut(r.id, e.target.value)}
                          style={{
                            border: 'none', borderRadius: 999, padding: '4px 8px', fontSize: 12, fontWeight: 600,
                            cursor: 'pointer', outline: 'none',
                            background: (STATUT_COLOR[r.statut] || {}).bg || 'var(--surface-3)',
                            color: (STATUT_COLOR[r.statut] || {}).text || 'var(--text-3)',
                          }}
                        >
                          {STATUTS.map(s => <option key={s} value={s} style={{ background: 'var(--surface)', color: 'var(--text)' }}>{s}</option>)}
                        </select>
                      </td>
                      <td style={{ whiteSpace: 'nowrap', fontSize: 13, color: 'var(--text-3)' }}>{fmtDate(r.date || r.createdAt)}</td>
                      <td style={{ fontSize: 13 }}>{r.salarie || '—'}</td>
                      <td><Pill map={PROVENANCE_COLOR} value={r.provenance} /></td>
                      <td><strong>{clientName || '—'}</strong></td>
                      <td style={{ whiteSpace: 'nowrap', fontSize: 13 }}>{r.telephone ? fmtTel(r.telephone) : '—'}</td>
                      <td>{r.marque || '—'}</td>
                      <td style={{ fontSize: 13 }}>{r.modele || '—'}</td>
                      <td style={{ fontSize: 13 }}>{r.reference || '—'}</td>
                      <td style={{ fontSize: 13 }}>{r.pointure || '—'}</td>
                      <td data-note-cell onClick={() => r.note && setNoteView(r)} style={{ cursor: r.note ? 'pointer' : 'default' }}>
                        {r.note
                          ? <span style={{ display: 'inline-block', maxWidth: 170, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 12, color: 'var(--accent-2)', background: 'var(--accent-bg)', padding: '3px 8px', borderRadius: 6, verticalAlign: 'middle' }}>📝 {r.note}</span>
                          : <span style={{ color: 'var(--text-5)' }}>—</span>}
                      </td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        {confirmDel === r.id ? (
                          <span style={{ display: 'inline-flex', gap: 4 }}>
                            <button onClick={() => handleDelete(r.id)}
                              style={{ padding: '3px 8px', borderRadius: 6, border: 'none', background: '#dc2626', color: '#fff', cursor: 'pointer', fontSize: 12 }}>Oui</button>
                            <button onClick={() => setConfirmDel(null)}
                              style={{ padding: '3px 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-2)', cursor: 'pointer', fontSize: 12 }}>Non</button>
                          </span>
                        ) : (
                          <>
                            <button className="edit-btn" onClick={() => setEditCmd(r)} title="Modifier">✏️</button>
                            <button className="edit-btn" onClick={() => setConfirmDel(r.id)} title="Supprimer">🗑</button>
                          </>
                        )}
                      </td>
                    </tr>
                  )})}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
