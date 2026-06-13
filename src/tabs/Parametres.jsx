import { useState, useRef, useMemo } from 'react'
import { useLiveQuery } from '../lib/useLiveQuery'
import { db } from '../db'
import { useSeason } from '../context/SeasonContext'

const MODES_REGLEMENT = ['', 'PRELEVEMENT', 'CHEQUE', 'GARANT', 'VIREMENT', 'GMS', 'LCR']

function SubNav({ tabs, active, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 4, marginBottom: 24, borderBottom: '1px solid var(--border)' }}>
      {tabs.map(t => (
        <button key={t.id} onClick={() => onChange(t.id)} style={{
          padding: '10px 18px', border: 'none', background: 'none', cursor: 'pointer',
          fontSize: 14, fontWeight: 500, borderBottom: '3px solid',
          borderBottomColor: active === t.id ? 'var(--accent)' : 'transparent',
          color: active === t.id ? 'var(--accent)' : 'var(--text-3)', whiteSpace: 'nowrap',
        }}>{t.label}</button>
      ))}
    </div>
  )
}

function TagChip({ label, onDelete }) {
  return (
    <span style={{
      display: 'flex', alignItems: 'center', gap: 6,
      background: 'var(--surface-3)', padding: '6px 12px', borderRadius: 20, fontSize: 14, color: 'var(--text)',
    }}>
      {label}
      <button onClick={onDelete} style={{
        background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-4)',
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
      <h3 style={{ marginBottom: 16, fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>🏪 Magasins</h3>
      {(magasins || []).length === 0
        ? <p style={{ color: 'var(--text-4)', fontSize: 14 }}>Aucun magasin — ajoutez-en un ci-dessous.</p>
        : <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {(magasins || []).map(m => <TagChip key={m.id} label={m.nom} onDelete={() => del(m.id)} />)}
          </div>
      }
      <AddForm placeholder="Nom du magasin…" onAdd={add} />
    </div>
  )
}

// ─── Import CSV : Marque, Modèle, Quantité (pour le magasin sélectionné) ──────
function ImportCSVPanel({ magasinId, magasinNom, season }) {
  const fileRef = useRef(null)
  const [preview,   setPreview]   = useState(null)
  const [importing, setImporting] = useState(false)
  const [done,      setDone]      = useState(null)

  function parseCSV(text) {
    const out = []
    const lines = text.split(/\r?\n/).filter(l => l.trim())
    const sep = lines[0]?.includes(';') ? ';' : ','
    lines.forEach((line, i) => {
      const cols = line.split(sep).map(c => c.trim().replace(/^"|"$/g, ''))
      const marque = cols[0]
      if (!marque) return
      if (i === 0 && /^marque$/i.test(marque)) return // entête
      const modele = cols[1] || ''
      if (!modele) return
      out.push({ marque, modele, qte: parseInt(cols[2]) || 0 })
    })
    return out
  }

  async function handleFile(e) {
    const file = e.target.files[0]; if (!file) return
    e.target.value = ''
    setPreview(parseCSV(await file.text())); setDone(null)
  }

  async function handleImport() {
    if (!preview || !magasinId) return
    setImporting(true)
    try {
      const byMarque = {}
      for (const r of preview) { (byMarque[r.marque] ||= []).push(r) }
      let nbModeles = 0
      for (const [marque, items] of Object.entries(byMarque)) {
        let f = await db.fournisseurs.where('nom').equals(marque).first()
        if (!f) {
          const id = await db.fournisseurs.add({ nom: marque, modelesBySeason: { [season]: [] } })
          f = await db.fournisseurs.get(id)
        }
        // noms de modèles (niveau marque/saison)
        const current = f.modelesBySeason?.[season] ?? f.modeles ?? []
        const names = [...new Set([...current, ...items.map(i => i.modele)])].sort()
        await db.fournisseurs.update(f.id, { modelesBySeason: { ...(f.modelesBySeason || {}), [season]: names } })
        // quantités pour le magasin sélectionné
        const existing = await db.parametres.where({ fournisseurId: f.id, magasinId }).filter(p => p.season === season).first()
        const modeles = { ...(existing?.modeles || {}) }
        items.forEach(i => { modeles[i.modele] = i.qte })
        if (existing) await db.parametres.update(existing.id, { modeles })
        else          await db.parametres.add({ fournisseurId: f.id, magasinId, season, modeles })
        nbModeles += items.length
      }
      setDone({ modeles: nbModeles, marques: Object.keys(byMarque).length })
      setPreview(null)
    } finally {
      setImporting(false)
    }
  }

  return (
    <div style={{ marginTop: 16, padding: 16, background: 'var(--surface)', borderRadius: 10, border: '1px dashed var(--text-5)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ flex: 1 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-2)' }}>📂 Import CSV</span>
          <span style={{ fontSize: 12, color: 'var(--text-4)', marginLeft: 8 }}>
            Format : <code style={{ background: 'var(--surface-3)', padding: '1px 5px', borderRadius: 4 }}>Marque,Modèle,Quantité</code> (une ligne par modèle) — pour <strong>{magasinNom || '—'}</strong>
          </span>
        </div>
        <input ref={fileRef} type="file" accept=".csv,.txt" style={{ display: 'none' }} onChange={handleFile} />
        <button type="button" onClick={() => fileRef.current?.click()} disabled={!magasinId}
          style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-2)', cursor: magasinId ? 'pointer' : 'not-allowed', fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap' }}>
          Choisir un fichier CSV
        </button>
      </div>

      {!magasinId && <p style={{ marginTop: 8, fontSize: 12, color: '#f59e0b' }}>⚠️ Crée d'abord un magasin pour importer des quantités.</p>}

      {done && (
        <div style={{ marginTop: 10, padding: '8px 12px', background: '#d1fae5', borderRadius: 8, fontSize: 13, color: '#059669' }}>
          ✅ {done.modeles} modèle{done.modeles !== 1 ? 's' : ''} importé{done.modeles !== 1 ? 's' : ''} ({done.marques} marque{done.marques !== 1 ? 's' : ''}) pour {magasinNom}.
        </div>
      )}

      {preview && (
        <div style={{ marginTop: 12 }}>
          <p style={{ margin: '0 0 8px', fontSize: 13, color: 'var(--text-2)' }}>
            <strong>{preview.length}</strong> ligne{preview.length !== 1 ? 's' : ''} — quantités pour <strong>{magasinNom}</strong>
          </p>
          <div style={{ maxHeight: 220, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 8, background: 'var(--surface)' }}>
            {preview.map((row, i) => (
              <div key={i} style={{ padding: '6px 12px', borderBottom: '1px solid var(--surface-3)', fontSize: 13, display: 'flex', gap: 10, alignItems: 'baseline' }}>
                <span style={{ fontWeight: 700, minWidth: 140 }}>{row.marque}</span>
                <span style={{ flex: 1, color: 'var(--text-3)' }}>{row.modele}</span>
                <span style={{ fontWeight: 700, color: 'var(--text-2)' }}>{row.qte}</span>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <button type="button" onClick={handleImport} disabled={importing}
              style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: 'var(--accent-2)', color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>
              {importing ? '⏳ Importation…' : `✅ Importer (${magasinNom})`}
            </button>
            <button type="button" onClick={() => setPreview(null)}
              style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-2)', cursor: 'pointer', fontSize: 13 }}>
              Annuler
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Section Fournisseurs / Marques (modèles + quantité par magasin) ─────────
function SectionFournisseurs() {
  const { season }   = useSeason()
  const fournisseurs = useLiveQuery(() => db.fournisseurs.orderBy('nom').toArray(), [])
  const magasins     = useLiveQuery(() => db.magasins.orderBy('nom').toArray(), [])
  const params       = useLiveQuery(() => db.parametres.where('season').equals(season).toArray(), [season])
  const [selM,       setSelM]       = useState(null)
  const [newModele,  setNewModele]  = useState({})
  const [newQte,     setNewQte]     = useState({})
  const [editingId,  setEditingId]  = useState(null)
  const [editingNom, setEditingNom] = useState('')

  const selectedMagasin = selM ?? (magasins && magasins[0] ? magasins[0].id : null)
  const selMagasinNom   = (magasins || []).find(m => m.id === selectedMagasin)?.nom || ''

  // quantités du magasin sélectionné : { [fournisseurId]: { [modele]: qte } }
  const qteMap = useMemo(() => {
    const m = {}
    ;(params || []).filter(p => p.magasinId === selectedMagasin).forEach(p => { m[p.fournisseurId] = p.modeles || {} })
    return m
  }, [params, selectedMagasin])

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

  async function setModeleQte(fId, nom, qteRaw) {
    if (!selectedMagasin) return
    const existing = await db.parametres.where({ fournisseurId: fId, magasinId: selectedMagasin }).filter(p => p.season === season).first()
    const qte = (qteRaw === '' || qteRaw == null) ? null : (parseInt(qteRaw) || 0)
    if (existing) {
      const modeles = { ...(existing.modeles || {}) }
      if (qte == null) delete modeles[nom]
      else modeles[nom] = qte
      await db.parametres.update(existing.id, { modeles })
    } else if (qte != null) {
      await db.parametres.add({ fournisseurId: fId, magasinId: selectedMagasin, season, modeles: { [nom]: qte } })
    }
  }

  async function addModele(fId, nom, qte) {
    const f = await db.fournisseurs.get(fId)
    if (!f || !nom.trim()) return
    const current = f.modelesBySeason?.[season] ?? f.modeles ?? []
    const updated = [...new Set([...current, nom.trim()])].sort()
    await db.fournisseurs.update(fId, { modelesBySeason: { ...(f.modelesBySeason || {}), [season]: updated } })
    if (qte != null && qte !== '') await setModeleQte(fId, nom.trim(), qte)
    setNewModele(prev => ({ ...prev, [fId]: '' }))
    setNewQte(prev => ({ ...prev, [fId]: '' }))
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
      {/* Sélecteur de magasin pour les quantités */}
      <div className="store-card" style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', padding: 16 }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-2)' }}>🏪 Quantités du magasin :</span>
        <select value={selectedMagasin || ''} onChange={e => setSelM(Number(e.target.value))} className="sel">
          {(magasins || []).map(m => <option key={m.id} value={m.id}>{m.nom}</option>)}
        </select>
        <span style={{ fontSize: 12, color: 'var(--text-4)' }}>Les quantités ci-dessous concernent ce magasin.</span>
      </div>

      {(fournisseurs || []).map(f => {
        const modeles = f.modelesBySeason?.[season] ?? []
        const qtes = qteMap[f.id] || {}
        return (
          <div key={f.id} className="store-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, gap: 8 }}>
              {editingId === f.id ? (
                <form onSubmit={async e => { e.preventDefault(); await renommer(f.id, editingNom) }} style={{ display: 'flex', gap: 6, flex: 1 }}>
                  <input autoFocus value={editingNom} onChange={e => setEditingNom(e.target.value)} onKeyDown={e => e.key === 'Escape' && setEditingId(null)}
                    style={{ flex: 1, maxWidth: 240, padding: '4px 10px', border: '2px solid var(--accent)', borderRadius: 6, fontSize: 14, fontWeight: 700, outline: 'none', background: 'var(--surface)', color: 'var(--text)' }} />
                  <button type="submit" style={{ padding: '4px 12px', borderRadius: 6, border: 'none', background: 'var(--accent-2)', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>✓</button>
                  <button type="button" onClick={() => setEditingId(null)} style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-2)', cursor: 'pointer', fontSize: 13 }}>✕</button>
                </form>
              ) : (
                <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', margin: 0 }}>{f.nom}</h3>
              )}
              <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                {editingId !== f.id && (
                  <button onClick={() => { setEditingId(f.id); setEditingNom(f.nom) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', fontSize: 13, padding: '4px 8px', borderRadius: 6 }}>✏️ Renommer</button>
                )}
                <button onClick={() => del(f.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: 13, padding: '4px 8px', borderRadius: 6 }}>🗑️ Supprimer</button>
              </div>
            </div>

            {modeles.length === 0 ? (
              <span style={{ fontSize: 13, color: 'var(--text-4)' }}>Aucun modèle pour cette saison</span>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {modeles.map(m => (
                  <div key={m} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ flex: 1, fontSize: 14, color: 'var(--text)' }}>{m}</span>
                    <input
                      key={m + '_' + selectedMagasin + '_' + season}
                      type="number" min="0" inputMode="numeric"
                      defaultValue={qtes[m] ?? ''}
                      onBlur={e => setModeleQte(f.id, m, e.target.value)}
                      placeholder="qté"
                      title={`Quantité pour ${selMagasinNom}`}
                      style={{ width: 76, padding: '5px 8px', border: '1px solid var(--border)', borderRadius: 6, fontSize: 13, textAlign: 'center', background: 'var(--surface)', color: 'var(--text)' }}
                    />
                    <button onClick={() => delModele(f.id, m)} title="Retirer le modèle" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-4)', fontSize: 16, lineHeight: 1, padding: '0 4px' }}>×</button>
                  </div>
                ))}
              </div>
            )}

            <form onSubmit={e => { e.preventDefault(); addModele(f.id, newModele[f.id] || '', newQte[f.id]) }} style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
              <input value={newModele[f.id] || ''} onChange={e => setNewModele(prev => ({ ...prev, [f.id]: e.target.value }))} placeholder="Ajouter un modèle…"
                style={{ flex: 1, maxWidth: 220, padding: '6px 12px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 14, background: 'var(--surface)', color: 'var(--text)' }} />
              <input value={newQte[f.id] || ''} onChange={e => setNewQte(prev => ({ ...prev, [f.id]: e.target.value }))} type="number" min="0" placeholder="qté"
                style={{ width: 76, padding: '6px 8px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 14, textAlign: 'center', background: 'var(--surface)', color: 'var(--text)' }} />
              <button type="submit" style={{ padding: '6px 14px', background: 'var(--accent-bg)', border: '1px solid var(--accent-border)', borderRadius: 8, color: 'var(--accent-2)', cursor: 'pointer', fontSize: 13, fontWeight: 500 }}>+ Modèle</button>
            </form>
          </div>
        )
      })}

      <div className="store-card" style={{ background: 'var(--surface-2)' }}>
        <h3 style={{ marginBottom: 4, fontSize: 14, fontWeight: 600, color: 'var(--text-3)' }}>Ajouter une marque / fournisseur</h3>
        <AddForm placeholder="Nom de la marque…" onAdd={add} />
        <ImportCSVPanel magasinId={selectedMagasin} magasinNom={selMagasinNom} season={season} />
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
      <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', background: 'var(--surface-2)' }}>
        <p style={{ fontSize: 13, color: 'var(--text-3)', margin: 0 }}>
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
                          padding: '5px 8px', border: '1px solid var(--border)', borderRadius: 6,
                          fontSize: 12, background: MODE_COLORS[cur] || 'var(--surface)',
                          color: cur ? '#1e293b' : 'var(--text)', cursor: 'pointer',
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
              <tr><td colSpan={magasins.length + 1} style={{ textAlign: 'center', padding: 32, color: 'var(--text-4)' }}>
                Aucune marque — ajoutez-en dans l'onglet Marques.
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
