import { useState, useRef, useMemo } from 'react'
import { useLiveQuery } from '../lib/useLiveQuery'
import { db } from '../db'
import { useSeason } from '../context/SeasonContext'
import { DEFAULT_DELAIS, DEFAULT_NB_CHEQUE } from '../data/reglement'

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

// ─── Section Salariés ────────────────────────────────────────────────────────
function SectionSalaries() {
  const salaries = useLiveQuery(() => db.salaries.orderBy('nom').toArray(), [])

  async function add(nom) {
    const existing = await db.salaries.where('nom').equals(nom).first()
    if (existing) throw new Error(`"${nom}" existe déjà`)
    await db.salaries.add({ nom })
  }

  async function del(id) {
    if (!confirm('Supprimer ce salarié ? Il ne sera plus proposé dans les listes (les commandes déjà enregistrées gardent son nom).')) return
    await db.salaries.delete(id)
  }

  return (
    <div className="store-card">
      <h3 style={{ marginBottom: 16, fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>👤 Salariés</h3>
      {(salaries || []).length === 0
        ? <p style={{ color: 'var(--text-4)', fontSize: 14 }}>Aucun salarié — ajoutez-en un ci-dessous.</p>
        : <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {(salaries || []).map(s => <TagChip key={s.id} label={s.nom} onDelete={() => del(s.id)} />)}
          </div>
      }
      <AddForm placeholder="Nom du salarié…" onAdd={add} />
    </div>
  )
}

// Découpe une ligne CSV en respectant les guillemets (virgules autorisées dans les champs)
function parseCsvLine(line, sep) {
  const out = []
  let cur = '', inQ = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (inQ) {
      if (ch === '"') {
        if (line[i + 1] === '"') { cur += '"'; i++ } // guillemet échappé ""
        else inQ = false
      } else cur += ch
    } else if (ch === '"') {
      inQ = true
    } else if (ch === sep) {
      out.push(cur); cur = ''
    } else cur += ch
  }
  out.push(cur)
  return out.map(c => c.trim())
}

// Nombre tolérant : "684.00", "684,00", "1 234,56", "684 €" → number
function parseNum(s) {
  let v = String(s ?? '').replace(/[^\d.,-]/g, '').trim()
  if (v.includes(',') && v.includes('.')) {
    v = v.lastIndexOf(',') > v.lastIndexOf('.') ? v.replace(/\./g, '').replace(',', '.') : v.replace(/,/g, '')
  } else if (v.includes(',')) {
    v = v.replace(',', '.')
  }
  return parseFloat(v) || 0
}

// ─── Import CSV : Marque, Modèle, Quantité, PA HT (colonnes suivantes ignorées) ──
function ImportCSVPanel({ magasinId, magasinNom, season }) {
  const fileRef = useRef(null)
  const [preview,   setPreview]   = useState(null)
  const [importing, setImporting] = useState(false)
  const [done,      setDone]      = useState(null)

  function parseCSV(text) {
    const out = []
    const lines = text.split(/\r?\n/).filter(l => l.trim())
    // séparateur : ';' s'il domine sur la 1ère ligne, sinon ','
    const head = lines[0] || ''
    const sep = (head.match(/;/g) || []).length > (head.match(/,/g) || []).length ? ';' : ','
    lines.forEach((line, i) => {
      const cols = parseCsvLine(line, sep)
      const marque = (cols[0] || '').trim()
      if (!marque) return
      if (i === 0 && /^marques?$/i.test(marque)) return // entête (Marque/Marques)
      const modele = (cols[1] || '').trim()
      if (!modele) return
      // cols 0..3 = Marque, Modèle, Qté, PA HT ; les colonnes suivantes sont ignorées
      out.push({
        marque, modele,
        qte:  parseInt(String(cols[2] || '').replace(/[^\d-]/g, '')) || 0,
        prix: parseNum(cols[3]),
      })
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
        // quantités + prix HT total pour le magasin sélectionné
        const existing = await db.parametres.where({ fournisseurId: f.id, magasinId }).filter(p => p.season === season).first()
        const modeles     = { ...(existing?.modeles || {}) }
        const prixModeles = { ...(existing?.prixModeles || {}) }
        items.forEach(i => { modeles[i.modele] = i.qte; if (i.prix) prixModeles[i.modele] = i.prix })
        if (existing) await db.parametres.update(existing.id, { modeles, prixModeles })
        else          await db.parametres.add({ fournisseurId: f.id, magasinId, season, modeles, prixModeles })
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
Colonnes lues : <code style={{ background: 'var(--surface-3)', padding: '1px 5px', borderRadius: 4 }}>Marque, Modèle, Qté, PA HT</code> (les colonnes suivantes sont ignorées) — pour <strong>{magasinNom || '—'}</strong>
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
                <span style={{ color: 'var(--text-3)', minWidth: 50, textAlign: 'right' }}>{row.qte} u.</span>
                <span style={{ fontWeight: 700, color: 'var(--text-2)', minWidth: 70, textAlign: 'right' }}>{row.prix ? row.prix.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }) : '—'}</span>
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
  const [newPrix,    setNewPrix]    = useState({})
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

  // prix HT total du magasin sélectionné : { [fournisseurId]: { [modele]: prixHTtotal } }
  const prixMap = useMemo(() => {
    const m = {}
    ;(params || []).filter(p => p.magasinId === selectedMagasin).forEach(p => { m[p.fournisseurId] = p.prixModeles || {} })
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

  async function setModelePrix(fId, nom, prixRaw) {
    if (!selectedMagasin) return
    const existing = await db.parametres.where({ fournisseurId: fId, magasinId: selectedMagasin }).filter(p => p.season === season).first()
    const prix = (prixRaw === '' || prixRaw == null) ? null : (parseFloat(String(prixRaw).replace(',', '.')) || 0)
    if (existing) {
      const prixModeles = { ...(existing.prixModeles || {}) }
      if (prix == null) delete prixModeles[nom]
      else prixModeles[nom] = prix
      await db.parametres.update(existing.id, { prixModeles })
    } else if (prix != null) {
      await db.parametres.add({ fournisseurId: fId, magasinId: selectedMagasin, season, prixModeles: { [nom]: prix } })
    }
  }

  async function addModele(fId, nom, qte, prix) {
    const f = await db.fournisseurs.get(fId)
    if (!f || !nom.trim()) return
    const current = f.modelesBySeason?.[season] ?? f.modeles ?? []
    const updated = [...new Set([...current, nom.trim()])].sort()
    await db.fournisseurs.update(fId, { modelesBySeason: { ...(f.modelesBySeason || {}), [season]: updated } })
    if (qte != null && qte !== '')   await setModeleQte(fId, nom.trim(), qte)
    if (prix != null && prix !== '') await setModelePrix(fId, nom.trim(), prix)
    setNewModele(prev => ({ ...prev, [fId]: '' }))
    setNewQte(prev => ({ ...prev, [fId]: '' }))
    setNewPrix(prev => ({ ...prev, [fId]: '' }))
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
        const qtes  = qteMap[f.id] || {}
        const prixes = prixMap[f.id] || {}
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
                {modeles.map(m => {
                  const q = qtes[m], px = prixes[m]
                  const unit = (q && px) ? px / q : null
                  return (
                  <div key={m} style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ flex: 1, minWidth: 110, fontSize: 14, color: 'var(--text)' }}>{m}</span>
                    <input
                      key={m + '_q_' + selectedMagasin + '_' + season}
                      type="number" min="0" inputMode="numeric"
                      defaultValue={qtes[m] ?? ''}
                      onBlur={e => setModeleQte(f.id, m, e.target.value)}
                      placeholder="qté"
                      title={`Quantité pour ${selMagasinNom}`}
                      style={{ width: 70, padding: '5px 8px', border: '1px solid var(--border)', borderRadius: 6, fontSize: 13, textAlign: 'center', background: 'var(--surface)', color: 'var(--text)' }}
                    />
                    <input
                      key={m + '_p_' + selectedMagasin + '_' + season}
                      type="number" min="0" step="0.01"
                      defaultValue={prixes[m] ?? ''}
                      onBlur={e => setModelePrix(f.id, m, e.target.value)}
                      placeholder="Prix HT €"
                      title={`Prix HT total du modèle pour ${selMagasinNom}`}
                      style={{ width: 96, padding: '5px 8px', border: '1px solid var(--border)', borderRadius: 6, fontSize: 13, textAlign: 'center', background: 'var(--surface)', color: 'var(--text)' }}
                    />
                    <span style={{ fontSize: 11, color: 'var(--text-4)', minWidth: 78, textAlign: 'right' }}>
                      {unit != null ? `${unit.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} €/u` : ''}
                    </span>
                    <button onClick={() => delModele(f.id, m)} title="Retirer le modèle" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-4)', fontSize: 16, lineHeight: 1, padding: '0 4px' }}>×</button>
                  </div>
                )})}
              </div>
            )}

            <form onSubmit={e => { e.preventDefault(); addModele(f.id, newModele[f.id] || '', newQte[f.id], newPrix[f.id]) }} style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
              <input value={newModele[f.id] || ''} onChange={e => setNewModele(prev => ({ ...prev, [f.id]: e.target.value }))} placeholder="Ajouter un modèle…"
                style={{ flex: 1, minWidth: 150, maxWidth: 200, padding: '6px 12px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 14, background: 'var(--surface)', color: 'var(--text)' }} />
              <input value={newQte[f.id] || ''} onChange={e => setNewQte(prev => ({ ...prev, [f.id]: e.target.value }))} type="number" min="0" placeholder="qté"
                style={{ width: 70, padding: '6px 8px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 14, textAlign: 'center', background: 'var(--surface)', color: 'var(--text)' }} />
              <input value={newPrix[f.id] || ''} onChange={e => setNewPrix(prev => ({ ...prev, [f.id]: e.target.value }))} type="number" min="0" step="0.01" placeholder="Prix HT €" title="Prix HT total du modèle"
                style={{ width: 96, padding: '6px 8px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 14, textAlign: 'center', background: 'var(--surface)', color: 'var(--text)' }} />
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

// ─── Modale : plan chèque personnalisé (dates + montants) par saison ─────────
function ChequePlanModal({ fournisseur, magasin, seasonLabel, initial, onSave, onClose }) {
  const [rows, setRows] = useState(initial.length ? initial.map(c => ({ date: c.date || '', montant: c.montant ?? '' })) : [{ date: '', montant: '' }])
  const set = (i, field, val) => setRows(rs => rs.map((r, j) => j === i ? { ...r, [field]: val } : r))
  const add = () => setRows(rs => [...rs, { date: '', montant: '' }])
  const del = i => setRows(rs => rs.filter((_, j) => j !== i))
  const total = rows.reduce((s, r) => s + (Number(r.montant) || 0), 0)

  function save() {
    const clean = rows.filter(r => r.date && Number(r.montant)).map(r => ({ date: r.date, montant: Number(r.montant) }))
    onSave(clean)
  }

  const inp = { padding: '7px 9px', border: '1px solid var(--border)', borderRadius: 7, fontSize: 13, outline: 'none', background: 'var(--surface)', color: 'var(--text)' }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(15,23,42,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={onClose}>
      <div style={{ background: 'var(--surface)', borderRadius: 14, padding: 24, width: 440, maxWidth: '100%', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px var(--shadow-lg)' }} onClick={e => e.stopPropagation()}>
        <h2 style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 800, color: 'var(--text)' }}>🗓 Plan chèque</h2>
        <p style={{ margin: '0 0 16px', fontSize: 13, color: 'var(--text-3)' }}>
          {fournisseur} × {magasin} — <strong>{seasonLabel}</strong><br />
          Saisis chaque chèque (date d'encaissement + montant). Remplace le calcul automatique.
        </p>

        {rows.map((r, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: 12, color: 'var(--text-4)', width: 18 }}>{i + 1}</span>
            <input type="date" value={r.date} onChange={e => set(i, 'date', e.target.value)} style={{ ...inp, flex: 1 }} />
            <input type="number" min="0" step="0.01" placeholder="montant" value={r.montant} onChange={e => set(i, 'montant', e.target.value)} style={{ ...inp, width: 110 }} />
            <span style={{ fontSize: 13, color: 'var(--text-3)' }}>€</span>
            <button onClick={() => del(i)} title="Supprimer" style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#cbd5e1', fontSize: 15 }}
              onMouseEnter={e => e.currentTarget.style.color = '#ef4444'} onMouseLeave={e => e.currentTarget.style.color = '#cbd5e1'}>🗑</button>
          </div>
        ))}

        <button onClick={add} style={{ marginTop: 2, padding: '6px 12px', borderRadius: 8, border: '1px dashed var(--border)', background: 'var(--surface)', color: 'var(--accent)', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
          ＋ Ajouter un chèque
        </button>

        <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--border)', fontSize: 14, color: 'var(--text-2)' }}>
          Total : <strong>{total.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })}</strong>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 18 }}>
          <button onClick={onClose} style={{ padding: '10px 18px', borderRadius: 9, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-2)', cursor: 'pointer', fontSize: 14 }}>Annuler</button>
          <button onClick={save} style={{ padding: '10px 22px', borderRadius: 9, border: 'none', background: 'var(--accent)', color: 'var(--on-accent, #fff)', cursor: 'pointer', fontSize: 14, fontWeight: 700 }}>Enregistrer</button>
        </div>
      </div>
    </div>
  )
}

// ─── Section Modes de règlement ─────────────────────────────────────────────
function SectionModes() {
  const { season, seasons } = useSeason()
  const seasonLabel    = (seasons.find(s => s.id === season) || {}).label || season
  const magasins       = useLiveQuery(() => db.magasins.orderBy('nom').toArray(), [])
  const fournisseurs   = useLiveQuery(() => db.fournisseurs.orderBy('nom').toArray(), [])
  const modesReglement = useLiveQuery(() => db.modesReglement.toArray(), [])
  const params         = useLiveQuery(() => db.parametres.where('season').equals(season).toArray(), [season])

  const [chequeModal, setChequeModal] = useState(null) // { fId, mId, fNom, mNom }

  const modeMap = {}
  const idMap   = {}
  const condMap = {}
  ;(modesReglement || []).forEach(m => {
    const k = m.fournisseurId + '_' + m.magasinId
    modeMap[k] = m.modeReglement || ''
    idMap[k]   = m.id
    condMap[k] = m.condition || {}
  })

  // Plan chèque par saison (stocké dans parametres.cheques)
  const chequesMap = {}
  ;(params || []).forEach(p => { chequesMap[p.fournisseurId + '_' + p.magasinId] = Array.isArray(p.cheques) ? p.cheques : [] })

  async function setCheques(fId, mId, cheques) {
    // recherche en base (et pas seulement dans le snapshot) pour ne jamais créer de doublon de ligne parametres
    const existing = await db.parametres.where({ fournisseurId: fId, magasinId: mId }).filter(p => p.season === season).first()
    if (existing) await db.parametres.update(existing.id, { cheques })
    else          await db.parametres.add({ fournisseurId: fId, magasinId: mId, season, cheques })
  }

  async function setMode(fId, mId, mode) {
    const k = fId + '_' + mId
    // changer de mode réinitialise la condition (elle dépend du mode)
    if (idMap[k]) await db.modesReglement.update(idMap[k], { modeReglement: mode, condition: {} })
    else          await db.modesReglement.add({ fournisseurId: fId, magasinId: mId, modeReglement: mode, condition: {} })
  }

  async function setCondition(fId, mId, condition) {
    const k = fId + '_' + mId
    if (idMap[k]) await db.modesReglement.update(idMap[k], { condition })
    else          await db.modesReglement.add({ fournisseurId: fId, magasinId: mId, condition })
  }

  const MODE_COLORS = {
    CHEQUE:      '#dbeafe', VIREMENT:    '#d1fae5', LCR: '#fef3c7',
    GARANT:      '#ede9fe', PRELEVEMENT: '#fee2e2', GMS: '#fce7f3',
  }
  const inputStyle = { width: 92, padding: '4px 6px', border: '1px solid var(--border)', borderRadius: 6, fontSize: 12, textAlign: 'center', background: 'var(--surface)', color: 'var(--text)' }

  if (!magasins || !fournisseurs) return null

  return (
    <>
    <div className="store-card" style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', background: 'var(--surface-2)' }}>
        <p style={{ fontSize: 13, color: 'var(--text-3)', margin: 0 }}>
          Mode de règlement <strong>et conditions</strong> par marque × magasin (utilisé dans le plan de règlement).
          <br /><strong>CHEQUE</strong> : nombre de chèques (montant ÷ N sur N fins de mois) <em>ou</em> bouton 🗓 pour saisir un <strong>plan chèque personnalisé</strong> (dates + montants), <strong>par saison</strong> (saison active : <strong>{seasonLabel}</strong>) — le plan perso remplace le calcul auto. <strong>Autres</strong> : délais en jours, séparés par des virgules — ex. <code style={{ background: 'var(--surface-3)', padding: '1px 5px', borderRadius: 4 }}>0</code> (jour de livraison), <code style={{ background: 'var(--surface-3)', padding: '1px 5px', borderRadius: 4 }}>30, 60</code> (2 échéances). Vide = valeur par défaut.
        </p>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ minWidth: 140 }}>Marque</th>
              {magasins.map(m => <th key={m.id} style={{ textAlign: 'center', minWidth: 150 }}>{m.nom}</th>)}
            </tr>
          </thead>
          <tbody>
            {fournisseurs.map(f => (
              <tr key={f.id}>
                <td><strong>{f.nom}</strong></td>
                {magasins.map(m => {
                  const k = f.id + '_' + m.id
                  const cur = modeMap[k] || ''
                  const cond = condMap[k] || {}
                  return (
                    <td key={m.id} style={{ textAlign: 'center', verticalAlign: 'top' }}>
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
                      {cur === 'CHEQUE' && (() => {
                        const plan = chequesMap[k] || []
                        return (
                          <div style={{ marginTop: 5, display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center' }}>
                            <div>
                              <input key={k + '-ch'} type="number" min="1" defaultValue={cond.nb ?? ''}
                                onBlur={e => setCondition(f.id, m.id, { nb: parseInt(e.target.value) || null })}
                                placeholder={String(DEFAULT_NB_CHEQUE)} title="Nombre de chèques (calcul auto)"
                                disabled={plan.length > 0}
                                style={{ ...inputStyle, width: 64, opacity: plan.length > 0 ? 0.45 : 1 }} />
                              <span style={{ fontSize: 11, color: 'var(--text-4)', marginLeft: 4 }}>chèq.</span>
                            </div>
                            <button onClick={() => setChequeModal({ fId: f.id, mId: m.id, fNom: f.nom, mNom: m.nom })}
                              title="Plan chèque personnalisé (dates + montants), par saison"
                              style={{
                                padding: '3px 8px', borderRadius: 6, fontSize: 11, cursor: 'pointer',
                                border: '1px solid', borderColor: plan.length ? 'var(--accent)' : 'var(--border)',
                                background: plan.length ? 'var(--accent-bg)' : 'var(--surface)',
                                color: plan.length ? 'var(--accent)' : 'var(--text-3)', fontWeight: plan.length ? 700 : 400,
                              }}>
                              🗓 {plan.length ? `${plan.length} date(s)` : 'Dates perso'}
                            </button>
                          </div>
                        )
                      })()}
                      {cur && cur !== 'CHEQUE' && (
                        <div style={{ marginTop: 5 }}>
                          <input key={k + '-de'} type="text" defaultValue={(cond.delais || []).join(', ')}
                            onBlur={e => setCondition(f.id, m.id, { delais: e.target.value.split(/[^0-9]+/).filter(Boolean).map(Number) })}
                            placeholder={(DEFAULT_DELAIS[cur] || []).join(', ')} title="Délais en jours (séparés par des virgules)"
                            style={inputStyle} />
                          <span style={{ fontSize: 11, color: 'var(--text-4)', marginLeft: 4 }}>j.</span>
                        </div>
                      )}
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
    {chequeModal && (
      <ChequePlanModal
        fournisseur={chequeModal.fNom} magasin={chequeModal.mNom} seasonLabel={seasonLabel}
        initial={chequesMap[chequeModal.fId + '_' + chequeModal.mId] || []}
        onSave={async (cheques) => { await setCheques(chequeModal.fId, chequeModal.mId, cheques); setChequeModal(null) }}
        onClose={() => setChequeModal(null)}
      />
    )}
    </>
  )
}

// ─── Onglet principal ────────────────────────────────────────────────────────
export default function Parametres() {
  const [section, setSection] = useState('magasins')

  const TABS = [
    { id: 'magasins',     label: '🏪 Magasins' },
    { id: 'salaries',     label: '👤 Salariés' },
    { id: 'fournisseurs', label: '🏷️ Marques' },
    { id: 'modes',        label: '💳 Modes de règlement' },
  ]

  return (
    <div>
      <SubNav tabs={TABS} active={section} onChange={setSection} />
      {section === 'magasins'     && <SectionMagasins />}
      {section === 'salaries'     && <SectionSalaries />}
      {section === 'fournisseurs' && <SectionFournisseurs />}
      {section === 'modes'        && <SectionModes />}
    </div>
  )
}
