import { useState, useMemo } from 'react'
import { useLiveQuery } from '../lib/useLiveQuery'
import { db } from '../db'
import { LoadingState } from '../components/shared'
import CommandeModal from './CommandeModal'
import { MAGASINS, SALARIES, PROVENANCES, STATUTS, STATUTS_CLOS, STATUT_COLOR, PROVENANCE_COLOR } from './constants'

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

// ─── Écran de sélection du magasin ────────────────────────────────────────────
function StoreSelect({ onSelect, onHome }) {
  const [hover, setHover] = useState(null)
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', padding: 24,
      background: 'var(--bg-grad)',
    }}>
      <button
        onClick={onHome}
        style={{ position: 'fixed', top: 20, left: 20, border: '1px solid var(--border)', background: 'var(--surface)', borderRadius: 9, width: 38, height: 38, cursor: 'pointer', fontSize: 17, color: 'var(--text-2)' }}
        title="Retour à l'accueil"
      >←</button>

      <div style={{ textAlign: 'center', marginBottom: 36 }}>
        <div style={{ fontSize: 34 }}>🏪</div>
        <h1 style={{ fontSize: 30, fontWeight: 800, color: 'var(--text)', letterSpacing: -0.5, marginTop: 6 }}>
          Dans quel magasin êtes-vous ?
        </h1>
        <p style={{ fontSize: 15, color: 'var(--text-3)', marginTop: 8 }}>
          Les commandes seront enregistrées pour ce magasin
        </p>
      </div>

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center' }}>
        {MAGASINS.map(m => (
          <button
            key={m}
            onClick={() => onSelect(m)}
            onMouseEnter={() => setHover(m)}
            onMouseLeave={() => setHover(null)}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
              background: 'var(--surface)', border: '2px solid', borderColor: hover === m ? '#7c3aed' : 'var(--border)',
              borderRadius: 18, padding: '28px 24px', cursor: 'pointer', width: 200,
              boxShadow: hover === m ? '0 14px 34px rgba(124,58,237,0.18)' : '0 4px 16px var(--shadow)',
              transform: hover === m ? 'translateY(-4px)' : 'none', transition: 'all 0.2s ease',
            }}
          >
            <div style={{
              width: 56, height: 56, borderRadius: 14,
              background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28,
            }}>🏪</div>
            <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', textAlign: 'center' }}>{m}</span>
          </button>
        ))}
      </div>
    </div>
  )
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
  const [magasin, setMagasinState] = useState(() => localStorage.getItem('commandes_magasin') || '')
  const [search,     setSearch]     = useState('')
  const [fStatut,    setFStatut]    = useState('')
  const [fProv,      setFProv]      = useState('')
  const [fSalarie,   setFSalarie]   = useState('')
  const [showForm,   setShowForm]   = useState(false)
  const [editCmd,    setEditCmd]    = useState(null)
  const [confirmDel, setConfirmDel] = useState(null)
  const [noteView,   setNoteView]   = useState(null)

  function setMagasin(m) {
    localStorage.setItem('commandes_magasin', m)
    setMagasinState(m)
  }

  const data = useLiveQuery(async () => {
    const rows = await db.commandes.toArray()
    rows.sort((a, b) => b.id - a.id) // plus récentes en premier
    return rows
  }, [])

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
  if (!magasin) return <StoreSelect onSelect={setMagasin} onHome={onHome} />

  return (
    <div className="app">
      {showForm && <CommandeModal defaultMagasin={magasin} onClose={() => setShowForm(false)} onSaved={() => setShowForm(false)} />}
      {editCmd  && <CommandeModal commande={editCmd} defaultMagasin={magasin} onClose={() => setEditCmd(null)} onSaved={() => setEditCmd(null)} />}
      {noteView && <NoteView commande={noteView} onClose={() => setNoteView(null)} />}

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
              onClick={() => setMagasin('')}
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
            {SALARIES.map(s => <option key={s}>{s}</option>)}
          </select>
        </div>

        {data === undefined ? <LoadingState /> : (
          <div className="store-card" style={{ marginTop: 0, padding: 0, overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th><th>Salarié</th><th>Provenance</th><th>Client</th>
                    <th>Téléphone</th><th>Marque</th><th>Modèle</th><th>Réf N°</th><th>Pointure</th>
                    <th>État</th><th></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 && (
                    <tr><td colSpan={11} style={{ textAlign: 'center', padding: 40, color: 'var(--text-4)' }}>
                      {rows.length === 0 ? 'Aucune commande pour ce magasin — cliquez sur « + Nouvelle commande ».' : 'Aucun résultat.'}
                    </td></tr>
                  )}
                  {filtered.map(r => (
                    <tr key={r.id}>
                      <td style={{ whiteSpace: 'nowrap', fontSize: 13, color: 'var(--text-3)' }}>{fmtDate(r.date || r.createdAt)}</td>
                      <td style={{ fontSize: 13 }}>{r.salarie || '—'}</td>
                      <td><Pill map={PROVENANCE_COLOR} value={r.provenance} /></td>
                      <td>
                        <strong>{[r.clientPrenom, r.clientNom].filter(Boolean).join(' ') || '—'}</strong>
                        {r.note && (
                          <button
                            onClick={() => setNoteView(r)}
                            title="Voir la note"
                            style={{ marginLeft: 6, border: 'none', background: 'none', cursor: 'pointer', fontSize: 15, padding: 0, verticalAlign: 'middle' }}
                          >📝</button>
                        )}
                      </td>
                      <td style={{ whiteSpace: 'nowrap', fontSize: 13 }}>{r.telephone || '—'}</td>
                      <td>{r.marque || '—'}</td>
                      <td style={{ fontSize: 13 }}>{r.modele || '—'}</td>
                      <td style={{ fontSize: 13 }}>{r.reference || '—'}</td>
                      <td style={{ fontSize: 13 }}>{r.pointure || '—'}</td>
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
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
