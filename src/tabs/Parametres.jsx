import { useState, useRef } from 'react'
import { useLiveQuery } from '../lib/useLiveQuery'
import { db } from '../db'
import { useSeason } from '../context/SeasonContext'

const MODES_REGLEMENT = ['', 'PRELEVEMENT', 'CHEQUE', 'GARANT', 'VIREMENT', 'GMS', 'LCR']

function SubNav({ tabs, active, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 4, marginBottom: 24, borderBottom: '1px solid #e2e8f0' }}>
      {tabs.map(t => (
        <button key={t.id} onClick={() => onChange(t.id)} style={{
          padding: '10px 18px', border: 'none', background: 'none', cursor: 'pointer',
          fontSize: 14, fontWeight: 500, borderBottom: '3px solid',
          borderBottomColor: active === t.id ? '#3b82f6' : 'transparent',
          color: active === t.id ? '#3b82f6' : '#64748b', whiteSpace: 'nowrap',
        }}>{t.label}</button>
      ))}
    </div>
  )
}

function TagChip({ label, onDelete }) {
  return (
    <span style={{
      display: 'flex', alignItems: 'center', gap: 6,
      background: '#f1f5f9', padding: '6px 12px', borderRadius: 20, fontSize: 14,
    }}>
      {label}
      <button onClick={onDelete} style={{
        background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8',
        fontSize: 16, padding: '0 2px', lineHeight: 1, borderRadius: 4,
      }}>×</button>
    </span>
  )
}

function AddForm({ placeholder, onAdd, disabled }) {
  const [value, setValue] = useState('')
  const [error, setError] = useState('')

  async function handle(e) {
    e.preventDefault()
    const v = value.trim()
    if (!v) return
    setError('')
    try {
      await onAdd(v)
      setValue('')
    } catch (err) {
      setError(err.message || 'Erreur')
    }
  }

  return (
    <form onSubmit={handle} style={{ marginTop: 12 }}>
      <div style={{ display: 'flex', gap: 8 }}>
        <input value={value} onChange={e => { setValue(e.target.value); setError('') }} placeholder={placeholder}
          className="search-input" style={{ maxWidth: 280 }} disabled={disabled} />
        <button type="submit" className="btn-primary" disabled={disabled || !value.trim()}>+ Ajouter</button>
      </div>
      {error && <p style={{ margin: '6px 0 0', fontSize: 13, color: '#dc2626' }}>⚠️ {error}</p>}
    </form>
  )
}

// ─── Section Magasins ───────────────────────────────────────────────────────
function SectionMagasins() {
  const magasins = useLiveQuery(() => db.magasins.orderBy('nom').toArray(), [])

  async function add(nom) {
    const existing = await db.magasins.where('nom').equals(nom).first()
    if (existing) throw new Error(`"${nom}" existe déjà`)
    await db.magasins.add({ nom })
  }

  async function del(id) {
    if (!confirm('Supprimer ce magasin ? Les entrées et données associées seront aussi effacées.')) return
    await Promise.all([
      db.magasins.delete(id),
      db.parametres.where('magasinId').equals(id).delete(),
      db.entrees.where('magasinId').equals(id).delete(),
      db.suivi.where('magasinId').equals(id).delete(),
      db.modesReglement.where('magasinId').equals(id).delete(),
    ])
  }

  return (
    <div className="store-card">
      <h3 style={{ marginBottom: 16, fontSize: 15, fontWeight: 700, color: '#0f172a' }}>🏪 Magasins</h3>
      {(magasins || []).length === 0
        ? <p style={{ color: '#94a3b8', fontSize: 14 }}>Aucun magasin — ajoutez-en un ci-dessous.</p>
        : <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {(magasins || []).map(m => <TagChip key={m.id} label={m.nom} onDelete={() => del(m.id)} />)}
          </div>
      }
      <AddForm placeholder="Nom du magasin…" onAdd={add} />
    </div>
  )
}

// ─── Import CSV marques ──────────────────────────────────────────────────────
function ImportCSVPanel() {
  const { season } = useSeason()
  const fileRef  = useRef(null)
  const [preview,   setPreview]   = useState(null)
  const [importing, setImporting] = useState(false)
  const [done,      setDone]      = useState(null)

  function parseCSV(text) {
    const brandMap = {}
    const lines = text.split(/\r?\n/).filter(l => l.trim())
    const sep = lines[0]?.includes(';') ? ';' : ','
    lines.forEach((line, i) => {
      const cols = line.split(sep).map(c => c.trim().replace(/^"|"$/g, ''))
      const brand = cols[0]
      if (!brand) return
      if (i === 0 && /^marque$/i.test(brand)) return
      const models = cols.slice(1).filter(Boolean)
      if (!brandMap[brand]) brandMap[brand] = new Set()
      models.forEach(m => brandMap[brand].add(m))
    })
    return Object.entries(brandMap).map(([nom, modeles]) => ({ nom, modeles: [...modeles].sort() }))
  }

  async function handleFile(e) {
    const file = e.target.files[0]
    if (!file) return
    e.target.value = ''
    const text = await file.text()
    const parsed = parseCSV(text)
    const enriched = await Promise.all(parsed.map(async row => {
      const existing = await db.fournisseurs.where('nom').equals(row.nom).first()
      return { ...row, isNew: !existing, existingModeles: existing?.modelesBySeason?.[season] ?? existing?.modeles ?? [] }
    }))
    setPreview(enriched)
    setDone(null)
  }

  async function handleImport() {
    if (!preview) return
    setImporting(true)
    let added = 0, updated = 0
    try {
      for (const { nom, modeles, isNew, existingModeles } of preview) {
        if (isNew) {
          await db.fournisseurs.add({ nom, modelesBySeason: { [season]: modeles } })
          added++
        } else {
          const merged   = [...new Set([...existingModeles, ...modeles])].sort()
          const existing = await db.fournisseurs.where('nom').equals(nom).first()
          if (existing) {
            const modelesBySeason = { ...(existing.modelesBySeason || {}), [season]: merged }
            await db.fournisseurs.update(existing.id, { modelesBySeason })
            updated++
          }
        }
      }
      setDone({ added, updated })
      setPreview(null)
    } finally {
      setImporting(false)
    }
  }

  const newCount = preview?.filter(r => r.isNew).length ?? 0
  const updCount = preview?.filter(r => !r.isNew).length ?? 0

  return (
    <div style={{ marginTop: 16, padding: 16, background: '#f8fafc', borderRadius: 10, border: '1px dashed #cbd5e1' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ flex: 1 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#475569' }}>📂 Import CSV</span>
          <span style={{ fontSize: 12, color: '#94a3b8', marginLeft: 8 }}>
            Format : <code style={{ background: '#e2e8f0', padding: '1px 5px', borderRadius: 4 }}>Marque,Modele1,Modele2,…</code> (une ligne par marque)
          </span>
        </div>
        <input ref={fileRef} type="file" accept=".csv,.txt" style={{ display: 'none' }} onChange={handleFile} />
        <button type="button" onClick={() => fileRef.current?.click()}
          style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid #94a3b8', background: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap' }}>
          Choisir un fichier CSV
        </button>
      </div>

      {done && (
        <div style={{ marginTop: 10, padding: '8px 12px', background: '#d1fae5', borderRadius: 8, fontSize: 13, color: '#059669' }}>
          ✅ {done.added} marque{done.added !== 1 ? 's' : ''} ajoutée{done.added !== 1 ? 's' : ''}, {done.updated} mise{done.updated !== 1 ? 's' : ''} à jour.
        </div>
      )}

      {preview && (
        <div style={{ marginTop: 12 }}>
          <p style={{ margin: '0 0 8px', fontSize: 13, color: '#475569' }}>
            <strong>{preview.length}</strong> marque{preview.length !== 1 ? 's' : ''} détectée{preview.length !== 1 ? 's' : ''} —
            <span style={{ color: '#059669', marginLeft: 4 }}>🆕 {newCount} nouvelle{newCount !== 1 ? 's' : ''}</span>
            <span style={{ color: '#2563eb', marginLeft: 8 }}>🔄 {updCount} à mettre à jour</span>
          </p>
          <div style={{ maxHeight: 220, overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: 8, background: '#fff' }}>
            {preview.map(row => (
              <div key={row.nom} style={{ padding: '6px 12px', borderBottom: '1px solid #f1f5f9', fontSize: 13, display: 'flex', gap: 10, alignItems: 'baseline' }}>
                <span style={{ minWidth: 20 }}>{row.isNew ? '🆕' : '🔄'}</span>
                <span style={{ fontWeight: 700, minWidth: 150 }}>{row.nom}</span>
                <span style={{ color: '#64748b', fontSize: 12 }}>
                  {row.modeles.length > 0
                    ? row.modeles.join(', ')
                    : <em style={{ color: '#94a3b8' }}>aucun modèle</em>}
                </span>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <button type="button" onClick={handleImport} disabled={importing}
              style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: '#2563eb', color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>
              {importing ? '⏳ Importation…' : `✅ Importer ${preview.length} marque${preview.length !== 1 ? 's' : ''}`}
            </button>
            <button type="button" onClick={() => setPreview(null)}
              style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer', fontSize: 13 }}>
              Annuler
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Section Fournisseurs / Marques ─────────────────────────────────────────
function SectionFournisseurs() {
  const { season }   = useSeason()
  const fournisseurs = useLiveQuery(() => db.fournisseurs.orderBy('nom').toArray(), [])
  const [newModele,  setNewModele]  = useState({})
  const [editingId,  setEditingId]  = useState(null)
  const [editingNom, setEditingNom] = useState('')

  async function add(nom) {
    const existing = await db.fournisseurs.where('nom').equals(nom).first()
    if (existing) throw new Error(`"${nom}" existe déjà`)
    await db.fournisseurs.add({ nom, modelesBySeason: {} })
  }

  async function del(id) {
    if (!confirm('Supprimer cette marque ? Toutes ses entrées et paramètres seront effacés.')) return
    await Promise.all([
      db.fournisseurs.delete(id),
      db.parametres.where('fournisseurId').equals(id).delete(),
      db.entrees.where('fournisseurId').equals(id).delete(),
      db.suivi.where('fournisseurId').equals(id).delete(),
      db.modesReglement.where('fournisseurId').equals(id).delete(),
    ])
  }

  async function addModele(fId, nom) {
    const f = await db.fournisseurs.get(fId)
    if (!f || !nom.trim()) return
    const current = f.modelesBySeason?.[season] ?? f.modeles ?? []
    const updated = [...new Set([...current, nom.trim()])].sort()
    await db.fournisseurs.update(fId, { modelesBySeason: { ...(f.modelesBySeason || {}), [season]: updated } })
    setNewModele(prev => ({ ...prev, [fId]: '' }))
  }

  async function renommer(id, nouveauNom) {
    const nom = nouveauNom.trim()
    if (!nom) return
    const existing = await db.fournisseurs.where('nom').equals(nom).first()
    if (existing && existing.id !== id) throw new Error(`"${nom}" existe déjà`)
    await db.fournisseurs.update(id, { nom })
    setEditingId(null)
  }

  async function delModele(fId, nom) {
    const f = await db.fournisseurs.get(fId)
    if (!f) return
    const current = f.modelesBySeason?.[season] ?? f.modeles ?? []
    await db.fournisseurs.update(fId, { modelesBySeason: { ...(f.modelesBySeason || {}), [season]: current.filter(m => m !== nom) } })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {(fournisseurs || []).map(f => {
        const modeles = f.modelesBySeason?.[season] ?? []
        return (
        <div key={f.id} className="store-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, gap: 8 }}>
            {editingId === f.id ? (
              <form onSubmit={async e => { e.preventDefault(); await renommer(f.id, editingNom) }}
                style={{ display: 'flex', gap: 6, flex: 1 }}>
                <input
                  autoFocus
                  value={editingNom}
                  onChange={e => setEditingNom(e.target.value)}
                  onKeyDown={e => e.key === 'Escape' && setEditingId(null)}
                  style={{ flex: 1, maxWidth: 240, padding: '4px 10px', border: '2px solid #3b82f6', borderRadius: 6, fontSize: 14, fontWeight: 700, outline: 'none' }}
                />
                <button type="submit" style={{ padding: '4px 12px', borderRadius: 6, border: 'none', background: '#2563eb', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>✓</button>
                <button type="button" onClick={() => setEditingId(null)} style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', fontSize: 13 }}>✕</button>
              </form>
            ) : (
              <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', margin: 0 }}>{f.nom}</h3>
            )}
            <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
              {editingId !== f.id && (
                <button onClick={() => { setEditingId(f.id); setEditingNom(f.nom) }} style={{
                  background: 'none', border: 'none', cursor: 'pointer', color: '#64748b',
                  fontSize: 13, padding: '4px 8px', borderRadius: 6,
                }}>✏️ Renommer</button>
              )}
              <button onClick={() => del(f.id)} style={{
                background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444',
                fontSize: 13, padding: '4px 8px', borderRadius: 6,
              }}>🗑️ Supprimer</button>
            </div>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, minHeight: 28 }}>
            {modeles.length === 0
              ? <span style={{ fontSize: 13, color: '#94a3b8' }}>Aucun modèle pour cette saison</span>
              : modeles.map(m => (
                  <span key={m} style={{
                    background: '#eff6ff', color: '#2563eb', padding: '3px 10px',
                    borderRadius: 20, fontSize: 13, display: 'flex', alignItems: 'center', gap: 4,
                  }}>
                    {m}
                    <button onClick={() => delModele(f.id, m)} style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: '#93c5fd', fontSize: 14, padding: 0, lineHeight: 1,
                    }}>×</button>
                  </span>
                ))
            }
          </div>
          <form onSubmit={e => { e.preventDefault(); addModele(f.id, newModele[f.id] || '') }}
            style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <input
              value={newModele[f.id] || ''}
              onChange={e => setNewModele(prev => ({ ...prev, [f.id]: e.target.value }))}
              placeholder="Ajouter un modèle…"
              style={{ flex: 1, maxWidth: 260, padding: '6px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 14 }}
            />
            <button type="submit" style={{
              padding: '6px 14px', background: '#eff6ff', border: '1px solid #bfdbfe',
              borderRadius: 8, color: '#2563eb', cursor: 'pointer', fontSize: 13, fontWeight: 500,
            }}>+ Modèle</button>
          </form>
        </div>
      )})}
      <div className="store-card" style={{ background: '#f8fafc' }}>
        <h3 style={{ marginBottom: 4, fontSize: 14, fontWeight: 600, color: '#64748b' }}>Ajouter une marque / fournisseur</h3>
        <AddForm placeholder="Nom de la marque…" onAdd={add} />
        <ImportCSVPanel />
      </div>
    </div>
  )
}

// ─── Section Modes de règlement ─────────────────────────────────────────────
function SectionModes() {
  const magasins       = useLiveQuery(() => db.magasins.orderBy('nom').toArray(), [])
  const fournisseurs   = useLiveQuery(() => db.fournisseurs.orderBy('nom').toArray(), [])
  const modesReglement = useLiveQuery(() => db.modesReglement.toArray(), [])

  const modeMap = {}
  const idMap   = {}
  ;(modesReglement || []).forEach(m => {
    const k = m.fournisseurId + '_' + m.magasinId
    modeMap[k] = m.modeReglement || ''
    idMap[k]   = m.id
  })

  async function setMode(fId, mId, mode) {
    const k = fId + '_' + mId
    if (idMap[k]) {
      await db.modesReglement.update(idMap[k], { modeReglement: mode })
    } else {
      await db.modesReglement.add({ fournisseurId: fId, magasinId: mId, modeReglement: mode })
    }
  }

  const MODE_COLORS = {
    CHEQUE:      '#dbeafe', VIREMENT:    '#d1fae5', LCR: '#fef3c7',
    GARANT:      '#ede9fe', PRELEVEMENT: '#fee2e2', GMS: '#fce7f3',
  }

  if (!magasins || !fournisseurs) return null

  return (
    <div className="store-card" style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{ padding: '14px 20px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
        <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>
          Définissez le mode de règlement par marque × magasin. Il sera utilisé dans le plan de règlement.
        </p>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ minWidth: 140 }}>Marque</th>
              {magasins.map(m => <th key={m.id} style={{ textAlign: 'center', minWidth: 140 }}>{m.nom}</th>)}
            </tr>
          </thead>
          <tbody>
            {fournisseurs.map(f => (
              <tr key={f.id}>
                <td><strong>{f.nom}</strong></td>
                {magasins.map(m => {
                  const k = f.id + '_' + m.id
                  const cur = modeMap[k] || ''
                  return (
                    <td key={m.id} style={{ textAlign: 'center' }}>
                      <select
                        value={cur}
                        onChange={e => setMode(f.id, m.id, e.target.value)}
                        style={{
                          padding: '5px 8px', border: '1px solid #e2e8f0', borderRadius: 6,
                          fontSize: 12, background: MODE_COLORS[cur] || 'white', cursor: 'pointer',
                        }}
                      >
                        {MODES_REGLEMENT.map(mo => <option key={mo} value={mo}>{mo || '—'}</option>)}
                      </select>
                    </td>
                  )
                })}
              </tr>
            ))}
            {fournisseurs.length === 0 && (
              <tr><td colSpan={magasins.length + 1} style={{ textAlign: 'center', padding: 32, color: '#94a3b8' }}>
                Aucune marque — ajoutez-en dans l'onglet Marques.
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Section Suivi attendu ───────────────────────────────────────────────────
function SectionSuivi() {
  const magasins     = useLiveQuery(() => db.magasins.orderBy('nom').toArray(), [])
  const fournisseurs = useLiveQuery(() => db.fournisseurs.orderBy('nom').toArray(), [])
  const suiviRows    = useLiveQuery(() => db.suivi.toArray(), [])

  const suiviMap = {}
  const suiviIdMap = {}
  ;(suiviRows || []).forEach(s => {
    const k = s.fournisseurId + '_' + s.magasinId
    suiviMap[k]   = s.attendu || 0
    suiviIdMap[k] = s.id
  })

  async function setAttendu(fId, mId, val) {
    const k   = fId + '_' + mId
    const num = parseInt(val) || 0
    if (suiviIdMap[k]) {
      await db.suivi.update(suiviIdMap[k], { attendu: num })
    } else if (num > 0) {
      await db.suivi.add({ fournisseurId: fId, magasinId: mId, attendu: num })
    }
  }

  if (!magasins || !fournisseurs) return null

  return (
    <div className="store-card" style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{ padding: '14px 20px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
        <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>
          Quantités de paires attendues par marque × magasin. Utilisé dans le suivi des livraisons.
        </p>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ minWidth: 140 }}>Marque</th>
              {magasins.map(m => <th key={m.id} style={{ textAlign: 'center', minWidth: 120 }}>{m.nom}</th>)}
            </tr>
          </thead>
          <tbody>
            {fournisseurs.map(f => (
              <tr key={f.id}>
                <td><strong>{f.nom}</strong></td>
                {magasins.map(m => {
                  const k = f.id + '_' + m.id
                  return (
                    <td key={m.id} style={{ textAlign: 'center' }}>
                      <input
                        type="number" min="0"
                        value={suiviMap[k] || ''}
                        onChange={e => setAttendu(f.id, m.id, e.target.value)}
                        placeholder="0"
                        style={{
                          width: 80, padding: '5px 6px', border: '1px solid #e2e8f0',
                          borderRadius: 6, fontSize: 13, textAlign: 'center',
                        }}
                      />
                    </td>
                  )
                })}
              </tr>
            ))}
            {fournisseurs.length === 0 && (
              <tr><td colSpan={magasins.length + 1} style={{ textAlign: 'center', padding: 32, color: '#94a3b8' }}>
                Aucune marque configurée.
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Onglet principal ────────────────────────────────────────────────────────
export default function Parametres() {
  const [section, setSection] = useState('magasins')

  const TABS = [
    { id: 'magasins',     label: '🏪 Magasins' },
    { id: 'fournisseurs', label: '🏷️ Marques' },
    { id: 'modes',        label: '💳 Modes de règlement' },
  ]

  return (
    <div>
      <SubNav tabs={TABS} active={section} onChange={setSection} />
      {section === 'magasins'     && <SectionMagasins />}
      {section === 'fournisseurs' && <SectionFournisseurs />}
      {section === 'modes'        && <SectionModes />}
    </div>
  )
}
