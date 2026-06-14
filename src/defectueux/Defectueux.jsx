import { useState, useMemo } from 'react'
import { useLiveQuery } from '../lib/useLiveQuery'
import { db } from '../db'
import { LoadingState } from '../components/shared'
import { getSociete } from '../data/societes'
import DefectueuxModal from './DefectueuxModal'
import { STATUTS, STATUT_COLOR } from './constants'
import { buildDefectueuxMailUrl } from './mail'

function fmtDate(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  return isNaN(d) ? '—' : d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

export default function Defectueux({ onHome }) {
  const [search,     setSearch]     = useState('')
  const [fStatut,    setFStatut]    = useState('')
  const [showForm,   setShowForm]   = useState(false)
  const [editDef,    setEditDef]    = useState(null)
  const [confirmDel, setConfirmDel] = useState(null)

  const data = useLiveQuery(async () => {
    const [defs, magasins, fournisseurs] = await Promise.all([
      db.defectueux.toArray(), db.magasins.toArray(), db.fournisseurs.toArray(),
    ])
    const magMap   = Object.fromEntries(magasins.map(m => [m.id, m.nom]))
    const fourById = Object.fromEntries(fournisseurs.map(f => [f.id, f]))
    defs.sort((a, b) => b.id - a.id)
    return defs.map(d => ({
      ...d,
      magasin:       magMap[d.magasinId] || '—',
      marque:        fourById[d.fournisseurId]?.nom || '—',
      societe:       getSociete(magMap[d.magasinId] || ''),
      fournisseurObj: fourById[d.fournisseurId] || null,
    }))
  }, [])

  const rows = data ?? []

  const filtered = useMemo(() => rows.filter(r => {
    if (fStatut && r.statut !== fStatut) return false
    if (search) {
      const q = search.toLowerCase()
      const hay = [r.marque, r.modele, r.numero, r.pointure, r.salarie, r.societe, r.note].map(v => (v || '').toLowerCase()).join(' ')
      if (!hay.includes(q)) return false
    }
    return true
  }), [rows, search, fStatut])

  const enCours = rows.filter(r => !['Clôturé', 'Refusé'].includes(r.statut)).length

  async function changeStatut(id, statut) {
    try { await db.defectueux.update(id, { statut }) } catch (e) { alert('Erreur : ' + (e.message || e)) }
  }
  async function handleDelete(id) {
    try { await db.defectueux.delete(id) } catch (e) { alert('Erreur : ' + (e.message || e)) } finally { setConfirmDel(null) }
  }

  function sendMail(r) {
    const url = buildDefectueuxMailUrl({
      modele: r.modele, pointure: r.pointure, note: r.note, salarie: r.salarie,
      societe: r.societe, email: r.fournisseurObj?.email, numeroClient: r.fournisseurObj?.numeroClient,
    })
    window.open(url, '_blank')
    if (r.statut === 'À traiter') db.defectueux.update(r.id, { statut: 'Mail envoyé' }).catch(() => {})
  }

  return (
    <div className="app">
      {showForm && <DefectueuxModal onClose={() => setShowForm(false)} onSaved={() => setShowForm(false)} />}
      {editDef  && <DefectueuxModal defect={editDef} onClose={() => setEditDef(null)} onSaved={() => setEditDef(null)} />}

      <header className="app-header">
        <div className="header-top" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button onClick={onHome} title="Retour à l'accueil"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 34, height: 34, borderRadius: 9, border: '1px solid var(--border)', background: 'var(--surface)', cursor: 'pointer', fontSize: 17, color: 'var(--text-2)', lineHeight: 1 }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface-2)'; e.currentTarget.style.color = 'var(--accent)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'var(--surface)'; e.currentTarget.style.color = 'var(--text-2)' }}>←</button>
            <h1>🛠️ Gestion des défectueux</h1>
          </div>
          <button className="btn-primary" onClick={() => setShowForm(true)}>+ Nouveau défectueux</button>
        </div>
        <div style={{ height: 16 }} />
      </header>

      <main className="app-main">
        <div className="tab-stats" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
          <div className="stat-card"><span className="stat-value">{rows.length}</span><span className="stat-label">Défectueux</span></div>
          <div className="stat-card"><span className="stat-value">{enCours}</span><span className="stat-label">En cours</span></div>
        </div>

        <div className="controls" style={{ flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
          <input type="text" placeholder="🔍 Marque, modèle, N°, salarié…" value={search} onChange={e => setSearch(e.target.value)} className="search-input" />
          <select value={fStatut} onChange={e => setFStatut(e.target.value)} className="sel">
            <option value="">Tous les états</option>
            {STATUTS.map(s => <option key={s}>{s}</option>)}
          </select>
        </div>

        {data === undefined ? <LoadingState /> : (
          <div className="store-card" style={{ marginTop: 0, padding: 0, overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>État</th><th>Date</th><th>N°</th><th>Société</th><th>Magasin</th>
                    <th>Salarié</th><th>Marque</th><th>Modèle</th><th>Pointure</th><th>Note</th><th></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 && (
                    <tr><td colSpan={11} style={{ textAlign: 'center', padding: 40, color: 'var(--text-4)' }}>
                      {rows.length === 0 ? 'Aucun défectueux — cliquez sur « + Nouveau défectueux ».' : 'Aucun résultat.'}
                    </td></tr>
                  )}
                  {filtered.map(r => (
                    <tr key={r.id}>
                      <td>
                        <select value={r.statut} onChange={e => changeStatut(r.id, e.target.value)}
                          style={{ border: 'none', borderRadius: 999, padding: '4px 8px', fontSize: 12, fontWeight: 600, cursor: 'pointer', outline: 'none', background: (STATUT_COLOR[r.statut] || {}).bg || 'var(--surface-3)', color: (STATUT_COLOR[r.statut] || {}).text || 'var(--text-3)' }}>
                          {STATUTS.map(s => <option key={s} value={s} style={{ background: 'var(--surface)', color: 'var(--text)' }}>{s}</option>)}
                        </select>
                      </td>
                      <td style={{ whiteSpace: 'nowrap', fontSize: 13, color: 'var(--text-3)' }}>{fmtDate(r.createdAt)}</td>
                      <td style={{ fontWeight: 700 }}>{r.numero || '—'}</td>
                      <td style={{ fontSize: 13 }}>{r.societe || '—'}</td>
                      <td style={{ fontSize: 13 }}>{r.magasin}</td>
                      <td style={{ fontSize: 13 }}>{r.salarie || '—'}</td>
                      <td><strong>{r.marque}</strong></td>
                      <td style={{ fontSize: 13 }}>{r.modele || '—'}</td>
                      <td style={{ fontSize: 13 }}>{r.pointure || '—'}</td>
                      <td style={{ fontSize: 12, color: 'var(--text-3)', maxWidth: 200 }}>
                        {r.note ? <span title={r.note} style={{ display: 'inline-block', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', verticalAlign: 'middle' }}>{r.note}</span> : '—'}
                      </td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        {confirmDel === r.id ? (
                          <span style={{ display: 'inline-flex', gap: 4 }}>
                            <button onClick={() => handleDelete(r.id)} style={{ padding: '3px 8px', borderRadius: 6, border: 'none', background: '#dc2626', color: '#fff', cursor: 'pointer', fontSize: 12 }}>Oui</button>
                            <button onClick={() => setConfirmDel(null)} style={{ padding: '3px 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-2)', cursor: 'pointer', fontSize: 12 }}>Non</button>
                          </span>
                        ) : (
                          <>
                            <button className="edit-btn" onClick={() => sendMail(r)} title="Envoyer le mail au SAV">✉️</button>
                            <button className="edit-btn" onClick={() => setEditDef(r)} title="Modifier">✏️</button>
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
