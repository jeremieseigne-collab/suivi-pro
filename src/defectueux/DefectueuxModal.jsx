import { useState, useEffect, useMemo } from 'react'
import { useLiveQuery } from '../lib/useLiveQuery'
import { db } from '../db'
import { useSeason } from '../context/SeasonContext'
import { getSociete } from '../data/societes'
import { STATUTS } from './constants'
import { buildDefectueuxMailUrl } from './mail'

const todayFr = () => { const d = new Date(); const p = n => String(n).padStart(2, '0'); return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}` }
const textareaStyle = { padding: '9px 12px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 14, fontFamily: 'inherit', resize: 'vertical', outline: 'none', width: '100%', background: 'var(--surface)', color: 'var(--text)' }

function SalarieInput({ value, onChange, salaries }) {
  const [manual, setManual] = useState(false)
  const btnStyle = { padding: '6px 10px', border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer', background: 'var(--surface)', color: 'var(--text-3)', fontSize: 14, fontFamily: 'inherit' }
  if (manual) return (
    <div style={{ display: 'flex', gap: 4 }}>
      <input value={value} onChange={e => onChange(e.target.value)} placeholder="Nom et prenom" autoFocus
        style={{ flex: 1, padding: '7px 10px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 14, fontFamily: 'inherit', outline: 'none', background: 'var(--surface)', color: 'var(--text)' }} />
      <button type="button" onClick={() => { onChange(''); setManual(false) }} style={btnStyle}>x</button>
    </div>
  )
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      <select value={value} onChange={e => onChange(e.target.value)} style={{ flex: 1 }}>
        <option value="">Choisir</option>
        {salaries.map(s => <option key={s.id}>{s.nom}</option>)}
      </select>
      <button type="button" onClick={() => setManual(true)} title="Saisir manuellement"
        style={{ ...btnStyle, fontWeight: 700, fontSize: 18, lineHeight: 1, padding: '4px 11px' }}>+</button>
    </div>
  )
}

function FournisseurInput({ value, onChange, fournisseurs, onAdd }) {
  const [adding, setAdding] = useState(false)
  const [nom, setNom] = useState('')
  const [saving, setSaving] = useState(false)
  const btnStyle = { padding: '6px 10px', border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer', background: 'var(--surface)', color: 'var(--text-3)', fontSize: 14, fontFamily: 'inherit' }
  async function confirm() {
    if (!nom.trim()) return
    setSaving(true)
    try { await onAdd(nom.trim()) } catch { /* ignore */ } finally { setSaving(false); setAdding(false); setNom('') }
  }
  if (adding) return (
    <div style={{ display: 'flex', gap: 4 }}>
      <input value={nom} onChange={e => setNom(e.target.value)} placeholder="Nom de la marque" autoFocus
        onKeyDown={e => { if (e.key === 'Enter') confirm(); if (e.key === 'Escape') { setAdding(false); setNom('') } }}
        style={{ flex: 1, padding: '7px 10px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 14, fontFamily: 'inherit', outline: 'none', background: 'var(--surface)', color: 'var(--text)' }} />
      <button type="button" onClick={confirm} disabled={!nom.trim() || saving}
        style={{ ...btnStyle, background: nom.trim() ? '#2563eb' : 'var(--border)', color: nom.trim() ? '#fff' : 'var(--text-4)', border: 'none', fontWeight: 600 }}>OK</button>
      <button type="button" onClick={() => { setAdding(false); setNom('') }} style={btnStyle}>x</button>
    </div>
  )
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      <select value={value} onChange={e => onChange(e.target.value)} style={{ flex: 1 }}>
        <option value="">Choisir</option>
        {fournisseurs.map(f => <option key={f.id} value={f.id}>{f.nom}</option>)}
      </select>
      <button type="button" onClick={() => setAdding(true)} title="Ajouter une marque"
        style={{ ...btnStyle, fontWeight: 700, fontSize: 18, lineHeight: 1, padding: '4px 11px' }}>+</button>
    </div>
  )
}

function ModeleInput({ value, onChange, models, disabled, canAdd, onAdd }) {
  const [adding, setAdding] = useState(false)
  const [nom, setNom] = useState('')
  const [saving, setSaving] = useState(false)
  const btnStyle = { padding: '6px 10px', border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer', background: 'var(--surface)', color: 'var(--text-3)', fontSize: 14, fontFamily: 'inherit' }
  async function confirm() {
    if (!nom.trim()) return
    setSaving(true)
    try { await onAdd(nom.trim()) } catch { /* ignore */ } finally { setSaving(false); setAdding(false); setNom('') }
  }
  if (adding) return (
    <div style={{ display: 'flex', gap: 4 }}>
      <input value={nom} onChange={e => setNom(e.target.value)} placeholder="Nom du modele" autoFocus
        onKeyDown={e => { if (e.key === 'Enter') confirm(); if (e.key === 'Escape') { setAdding(false); setNom('') } }}
        style={{ flex: 1, padding: '7px 10px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 14, fontFamily: 'inherit', outline: 'none', background: 'var(--surface)', color: 'var(--text)' }} />
      <button type="button" onClick={confirm} disabled={!nom.trim() || saving}
        style={{ ...btnStyle, background: nom.trim() ? '#2563eb' : 'var(--border)', color: nom.trim() ? '#fff' : 'var(--text-4)', border: 'none', fontWeight: 600 }}>OK</button>
      <button type="button" onClick={() => { setAdding(false); setNom('') }} style={btnStyle}>x</button>
    </div>
  )
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      <select value={value} onChange={e => onChange(e.target.value)} disabled={disabled} style={{ flex: 1 }}>
        <option value="">{disabled ? 'Choisir une marque' : 'Choisir'}</option>
        {models.map(m => <option key={m}>{m}</option>)}
      </select>
      {canAdd && (
        <button type="button" onClick={() => setAdding(true)} title="Ajouter un modele"
          style={{ ...btnStyle, fontWeight: 700, fontSize: 18, lineHeight: 1, padding: '4px 11px' }}>+</button>
      )}
    </div>
  )
}

export default function DefectueuxModal({ defect, onClose, onSaved, defaultMagasinId, currentMagasin }) {
  const editing = !!defect?.id
  const { season } = useSeason()
  const magasins     = useLiveQuery(() => db.magasins.orderBy('nom').toArray(), [])
  const salaries     = useLiveQuery(() => db.salaries.orderBy('nom').toArray(), [])
  const fournisseurs = useLiveQuery(() => db.fournisseurs.orderBy('nom').toArray(), [])

  const filteredSalaries = useMemo(() => {
    if (!currentMagasin) return salaries || []
    return (salaries || []).filter(s => !s.magasin || s.magasin === currentMagasin)
  }, [salaries, currentMagasin])

  const [form, setForm] = useState({
    magasinId:     defect?.magasinId     ?? defaultMagasinId ?? '',
    salarie:       defect?.salarie       ?? '',
    fournisseurId: defect?.fournisseurId ?? '',
    modele:        defect?.modele        ?? '',
    numero:        defect?.numero        ?? '',
    pointure:      defect?.pointure      ?? '',
    note:          defect?.note          ?? '',
    statut:        defect?.statut        ?? 'À traiter',
  })
  const [sizes,       setSizes]       = useState([])
  const [srcTypeKey,  setSrcTypeKey]  = useState('F')
  const [srcCategorie, setSrcCategorie] = useState('')
  const [saving,     setSaving]     = useState(false)
  const [error,      setError]      = useState('')
  const [step,       setStep]       = useState('form') // 'form' | 'email' | 'save-contact'
  const [savedCtx,   setSavedCtx]   = useState(null)
  const [manualEmail, setManualEmail] = useState('')
  const [prixManuel, setPrixManuel] = useState('')

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  const fournisseur = useMemo(() => (fournisseurs || []).find(f => f.id === Number(form.fournisseurId)), [fournisseurs, form.fournisseurId])
  const magasin     = (magasins || []).find(m => m.id === Number(form.magasinId))
  const societe     = getSociete(magasin?.nom || '')

  const models = useMemo(() => {
    if (!fournisseur) return []
    const s = new Set()
    Object.values(fournisseur.modelesBySeason || {}).forEach(arr => (arr || []).forEach(m => s.add(m)))
    return [...s].sort()
  }, [fournisseur])

  // Pointures existantes pour ce modèle (depuis les entrées)
  useEffect(() => {
    const fId = Number(form.fournisseurId)
    if (!fId || !form.modele) { setSizes([]); return }
    let cancelled = false
    ;(async () => {
      const rows = await db.entrees.where('fournisseurId').equals(fId).and(e => e.modele === form.modele).toArray()
      if (cancelled) return
      const s = new Set(); let tk = null; const numCounts = {}; const catCounts = {}
      rows.forEach(e => {
        Object.entries(e.sizes || {}).forEach(([k, v]) => { if (v > 0) s.add(k) })
        if (!tk && e.typeKey) tk = e.typeKey
        const n = (e.numero || '').trim()
        if (n) numCounts[n] = (numCounts[n] || 0) + 1
        const c = (e.categorie || '').trim()
        if (c) catCounts[c] = (catCounts[c] || 0) + 1
      })
      setSizes([...s].sort((a, b) => (parseFloat(a) || 0) - (parseFloat(b) || 0) || a.localeCompare(b)))
      setSrcTypeKey(tk || 'F')
      setSrcCategorie(Object.entries(catCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || '')
      // N° associé au modèle = le plus fréquent dans les entrées (auto, en création)
      const bestNum = Object.entries(numCounts).sort((a, b) => b[1] - a[1])[0]?.[0]
      if (!editing && bestNum) setForm(f => ({ ...f, numero: bestNum }))
    })()
    return () => { cancelled = true }
  }, [form.fournisseurId, form.modele])

  async function handleSave() {
    if (!form.magasinId)     { setError('Magasin obligatoire'); return }
    if (!form.fournisseurId) { setError('Marque obligatoire');  return }
    if (!form.modele)        { setError('Modèle obligatoire');  return }
    setSaving(true); setError('')
    try {
      const magasinId = Number(form.magasinId), fournisseurId = Number(form.fournisseurId)

      if (editing) {
        await db.defectueux.update(defect.id, {
          magasinId, fournisseurId, salarie: form.salarie, modele: form.modele,
          numero: form.numero, pointure: form.pointure, note: form.note, statut: form.statut,
        })
        // Sync SAV — on vérifie à chaque save si le SAV doit être mis à jour
        if (['Mail envoyé', 'Avoir reçu', 'Clôturé', 'Refusé'].includes(form.statut)) {
          const linkedSav = await db.sav.where('defectueuxId').equals(defect.id).first()
          if (linkedSav && (linkedSav.type === 'retour' || linkedSav.type === 'reparation')) {
            if (form.statut === 'Mail envoyé'
              && !['Mail marque envoyé', 'Réponse reçue', 'Clôturé'].includes(linkedSav.statut)) {
              await db.sav.update(linkedSav.id, { statut: 'Mail marque envoyé' })
            } else if (['Avoir reçu', 'Clôturé', 'Refusé'].includes(form.statut)
              && linkedSav.statut !== 'Clôturé') {
              await db.sav.update(linkedSav.id, { statut: 'Clôturé' })
            }
          }
        }
        onSaved?.(); onClose?.()
        return
      }

      // Prix unitaire HT du modèle (magasin/saison) → PHT négatif (c'est un retour)
      let unit = prixManuel ? parseFloat(prixManuel.replace(',', '.')) || 0 : 0
      if (!unit) {
        const param = await db.parametres.where({ fournisseurId, magasinId }).filter(p => p.season === season).first()
        if (param) {
          const q = param.modeles?.[form.modele], px = param.prixModeles?.[form.modele]
          if (q > 0 && px > 0) unit = px / q
          else if (param.pm) unit = param.pm
        }
      }
      const pht = unit > 0 ? -Math.round(unit * 100) / 100 : 0

      // Entrée "Retour" : −1 unité (se déduit du total livré) dans le Cahier des entrées
      const entreeId = await db.entrees.add({
        statut: 'Retour', magasinId, fournisseurId, date: todayFr(), modele: form.modele,
        numero: form.numero, categorie: srcCategorie || '', typeKey: srcTypeKey || 'F', total: -1, pht,
        sizes: form.pointure ? { [form.pointure]: -1 } : {}, season,
      })

      const defId = await db.defectueux.add({
        magasinId, fournisseurId, salarie: form.salarie, modele: form.modele,
        numero: form.numero, pointure: form.pointure, note: form.note, statut: form.statut, season, entreeId,
      })

      setSavedCtx({ defId, fournisseur, societe })
      setStep('email')
    } catch (e) {
      setError('Erreur : ' + (e.message || e)); setSaving(false)
    }
  }

  function buildMailUrl() {
    return buildDefectueuxMailUrl({
      modele: form.modele, pointure: form.pointure, note: form.note, salarie: form.salarie,
      societe: savedCtx?.societe || '', email: savedCtx?.fournisseur?.email || manualEmail.trim(),
      numeroClient: savedCtx?.fournisseur?.numeroClient,
    })
  }

  async function sendMail() {
    window.open(buildMailUrl(), '_blank')
    if (savedCtx?.defId && form.statut === 'À traiter') {
      try { await db.defectueux.update(savedCtx.defId, { statut: 'Mail envoyé' }) } catch { /* ignore */ }
    }
    if (!savedCtx?.fournisseur?.email && manualEmail.trim()) {
      setStep('save-contact')
    } else {
      onSaved?.(); onClose?.()
    }
  }
  function skipMail() { onSaved?.(); onClose?.() }

  async function saveContactEmail() {
    try { await db.fournisseurs.update(savedCtx?.fournisseur?.id, { email: manualEmail.trim() }) } catch { /* ignore */ }
    onSaved?.(); onClose?.()
  }

  // Options de pointure (inclut la valeur enregistrée même si absente des entrées)
  const sizeOptions = useMemo(() => {
    const s = [...sizes]
    if (form.pointure && !s.includes(form.pointure)) s.unshift(form.pointure)
    return s
  }, [sizes, form.pointure])

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{step === 'save-contact' ? '📋 Enregistrer le contact' : step === 'email' ? '✅ Défectueux enregistré' : (editing ? 'Modifier le défectueux' : '🛠️ Nouveau défectueux')}</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {step === 'save-contact' ? (
          <div className="modal-body">
            <p style={{ fontSize: 15, color: 'var(--text)' }}>
              Le mail a été envoyé à <strong>{manualEmail}</strong>.
            </p>
            <p style={{ fontSize: 14, color: 'var(--text-2)' }}>
              Souhaitez-vous enregistrer cet email dans la fiche SAV de <strong>{savedCtx?.fournisseur?.nom}</strong> ?
            </p>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => { onSaved?.(); onClose?.() }}>Non, terminer</button>
              <button className="btn-primary" onClick={saveContactEmail}>📋 Enregistrer dans le répertoire</button>
            </div>
          </div>
        ) : step === 'email' ? (
          <div className="modal-body">
            <p style={{ fontSize: 15, color: 'var(--text)' }}>
              Le défectueux est enregistré et l'entrée « Retour » a été créée dans le Cahier des entrées.
            </p>
            <p style={{ fontSize: 14, color: 'var(--text-2)' }}>
              Envoyer un mail au <strong>SAV de {savedCtx?.fournisseur?.nom}</strong> ?
              {savedCtx?.fournisseur?.email
                ? <> <br /><span style={{ fontSize: 13, color: 'var(--text-3)' }}>→ {savedCtx.fournisseur.email}</span></>
                : <>
                    <br />
                    <span style={{ fontSize: 13, color: '#f59e0b' }}>⚠️ Aucun email SAV dans le répertoire.</span>
                    <input
                      type="email"
                      value={manualEmail}
                      onChange={e => setManualEmail(e.target.value)}
                      placeholder="Saisir l'email SAV manuellement"
                      style={{ marginTop: 10, padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 14, width: '100%', background: 'var(--surface)', color: 'var(--text)', outline: 'none', fontFamily: 'inherit' }}
                    />
                  </>}
            </p>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={skipMail}>Non, terminer</button>
              <button className="btn-primary" onClick={sendMail} disabled={!savedCtx?.fournisseur?.email && !manualEmail.trim()}>✉️ Envoyer le mail</button>
            </div>
          </div>
        ) : (
          <div className="modal-body">
            <div className="form-grid">
              <div className="form-field">
                <label>Magasin *</label>
                <select value={form.magasinId} onChange={e => set('magasinId', e.target.value)}>
                  <option value="">— Choisir —</option>
                  {(magasins || []).map(m => <option key={m.id} value={m.id}>{m.nom}</option>)}
                </select>
              </div>
              <div className="form-field">
                <label>Salarié</label>
                <SalarieInput value={form.salarie} onChange={v => set('salarie', v)} salaries={filteredSalaries} />
              </div>
              <div className="form-field">
                <label>État</label>
                <select value={form.statut} onChange={e => set('statut', e.target.value)}>
                  {STATUTS.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
            </div>

            <div style={{ fontSize: 13, color: 'var(--text-3)' }}>
              Société concernée : <strong style={{ color: 'var(--text)' }}>{societe || '—'}</strong>
            </div>

            <div className="form-grid">
              <div className="form-field">
                <label>Marque *</label>
                <FournisseurInput
                  value={form.fournisseurId}
                  onChange={v => setForm(f => ({ ...f, fournisseurId: v, modele: '', pointure: '' }))}
                  fournisseurs={fournisseurs || []}
                  onAdd={async (nom) => {
                    const id = await db.fournisseurs.add({ nom, modelesBySeason: {} })
                    setForm(f => ({ ...f, fournisseurId: String(id), modele: '', pointure: '' }))
                  }}
                />
              </div>
              <div className="form-field">
                <label>Modèle *</label>
                <ModeleInput
                  key={form.fournisseurId}
                  value={form.modele}
                  onChange={v => setForm(f => ({ ...f, modele: v, pointure: '' }))}
                  models={models}
                  disabled={!form.fournisseurId}
                  canAdd={!!form.fournisseurId}
                  onAdd={async (nom) => {
                    const fId = Number(form.fournisseurId)
                    const existing = fournisseur?.modelesBySeason || {}
                    const arr = existing[season] || []
                    if (!arr.includes(nom)) {
                      await db.fournisseurs.update(fId, { modelesBySeason: { ...existing, [season]: [...arr, nom] } })
                    }
                    setForm(f => ({ ...f, modele: nom, pointure: '' }))
                  }}
                />
              </div>
              <div className="form-field">
                <label>N°</label>
                <input value={form.numero} onChange={e => set('numero', e.target.value)} placeholder="1, 2, 3…" inputMode="numeric" />
              </div>
            </div>

            <div className="form-grid">
              <div className="form-field">
                <label>Pointure</label>
                <select value={form.pointure} onChange={e => set('pointure', e.target.value)} disabled={!form.modele}>
                  <option value="">{!form.modele ? 'Choisis un modèle' : (sizeOptions.length ? '— Choisir —' : 'Aucune pointure reçue')}</option>
                  {sizeOptions.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
            </div>

            <div className="form-field">
              <label>Note / problème</label>
              <textarea value={form.note} onChange={e => set('note', e.target.value)} rows={3} style={textareaStyle} placeholder="Décris le défaut…" />
            </div>

            {!editing && (
              <div className="form-field">
                <label>Prix unitaire HT (€, optionnel)</label>
                <input type="number" value={prixManuel} onChange={e => setPrixManuel(e.target.value)}
                  placeholder="Laisser vide si le prix est dans les parametres" min="0" step="0.01"
                  style={{ padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 14, fontFamily: 'inherit', outline: 'none', width: '100%', background: 'var(--surface)', color: 'var(--text)', boxSizing: 'border-box' }} />
              </div>
            )}

            {error && <div className="form-error">⚠️ {error}</div>}

            <div className="modal-actions">
              <button className="btn-secondary" onClick={onClose}>Annuler</button>
              <button className="btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? '⏳ Enregistrement…' : (editing ? 'Enregistrer' : 'Enregistrer le défectueux')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
