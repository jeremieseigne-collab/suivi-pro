import { useState, useEffect, useMemo } from 'react'
import { useLiveQuery } from '../lib/useLiveQuery'
import { db } from '../db'
import { useSeason } from '../context/SeasonContext'
import { getSociete } from '../data/societes'
import { STATUTS } from './constants'
import { buildDefectueuxMailUrl } from './mail'

const todayFr = () => { const d = new Date(); const p = n => String(n).padStart(2, '0'); return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}` }
const textareaStyle = { padding: '9px 12px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 14, fontFamily: 'inherit', resize: 'vertical', outline: 'none', width: '100%', background: 'var(--surface)', color: 'var(--text)' }

export default function DefectueuxModal({ defect, onClose, onSaved }) {
  const editing = !!defect?.id
  const { season } = useSeason()
  const magasins     = useLiveQuery(() => db.magasins.orderBy('nom').toArray(), [])
  const salaries     = useLiveQuery(() => db.salaries.orderBy('nom').toArray(), [])
  const fournisseurs = useLiveQuery(() => db.fournisseurs.orderBy('nom').toArray(), [])

  const [form, setForm] = useState({
    magasinId:     defect?.magasinId     ?? '',
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
        onSaved?.(); onClose?.()
        return
      }

      // Prix unitaire HT du modèle (magasin/saison) → PHT négatif (c'est un retour)
      let unit = 0
      const param = await db.parametres.where({ fournisseurId, magasinId }).filter(p => p.season === season).first()
      if (param) {
        const q = param.modeles?.[form.modele], px = param.prixModeles?.[form.modele]
        if (q > 0 && px > 0) unit = px / q
        else if (param.pm) unit = param.pm
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
                <select value={form.salarie} onChange={e => set('salarie', e.target.value)}>
                  <option value="">— Choisir —</option>
                  {(salaries || []).map(s => <option key={s.id}>{s.nom}</option>)}
                </select>
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
                <select value={form.fournisseurId} onChange={e => setForm(f => ({ ...f, fournisseurId: e.target.value, modele: '', pointure: '' }))}>
                  <option value="">— Choisir —</option>
                  {(fournisseurs || []).map(f => <option key={f.id} value={f.id}>{f.nom}</option>)}
                </select>
              </div>
              <div className="form-field">
                <label>Modèle *</label>
                <select value={form.modele} onChange={e => setForm(f => ({ ...f, modele: e.target.value, pointure: '' }))} disabled={!form.fournisseurId}>
                  <option value="">{form.fournisseurId ? '— Choisir —' : 'Choisis une marque'}</option>
                  {models.map(m => <option key={m}>{m}</option>)}
                </select>
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
