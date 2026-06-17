import { useState, useEffect, useMemo } from 'react'
import { useLiveQuery } from '../lib/useLiveQuery'
import { db } from '../db'
import { useSeason } from '../context/SeasonContext'
import { getSociete } from '../data/societes'
import { STATUTS_RETOUR, STATUTS_FORME, DECISIONS } from './constants'
import { buildSavRetourMailUrl } from './mail'

const inputStyle = { padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 14, fontFamily: 'inherit', outline: 'none', width: '100%', background: 'var(--surface)', color: 'var(--text)', boxSizing: 'border-box' }
const textareaStyle = { ...inputStyle, resize: 'vertical' }

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

function PointureInput({ value, onChange, sizes, disabled }) {
  const [manual, setManual] = useState(false)
  const btnStyle = { padding: '6px 10px', border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer', background: 'var(--surface)', color: 'var(--text-3)', fontSize: 14, fontFamily: 'inherit' }
  if (manual) return (
    <div style={{ display: 'flex', gap: 4 }}>
      <input value={value} onChange={e => onChange(e.target.value)} placeholder="Ex: 42" autoFocus inputMode="decimal"
        style={{ flex: 1, padding: '7px 10px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 14, fontFamily: 'inherit', outline: 'none', background: 'var(--surface)', color: 'var(--text)' }} />
      <button type="button" onClick={() => { onChange(''); setManual(false) }} style={btnStyle}>x</button>
    </div>
  )
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      <select value={value} onChange={e => onChange(e.target.value)} disabled={disabled} style={{ flex: 1 }}>
        <option value="">{disabled ? 'Choisir un modele' : (sizes.length ? 'Choisir' : '—')}</option>
        {sizes.map(s => <option key={s}>{s}</option>)}
      </select>
      <button type="button" onClick={() => setManual(true)} title="Saisir manuellement"
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

export default function SavModal({ sav, onClose, onSaved, defaultMagasinId, currentMagasin }) {
  const editing = !!sav?.id
  const { season } = useSeason()
  const magasins     = useLiveQuery(() => db.magasins.orderBy('nom').toArray(), [])
  const salaries     = useLiveQuery(() => db.salaries.orderBy('nom').toArray(), [])
  const fournisseurs = useLiveQuery(() => db.fournisseurs.orderBy('nom').toArray(), [])

  const filteredSalaries = useMemo(() => {
    if (!currentMagasin) return salaries || []
    return (salaries || []).filter(s => !s.magasin || s.magasin === currentMagasin)
  }, [salaries, currentMagasin])

  const [type, setType] = useState(sav?.type ?? 'retour')
  const [form, setForm] = useState({
    magasinId:     sav?.magasinId     ?? defaultMagasinId ?? '',
    salarie:       sav?.salarie       ?? '',
    clientNom:     sav?.clientNom     ?? '',
    clientTel:     sav?.clientTel     ?? '',
    fournisseurId: sav?.fournisseurId ?? '',
    modele:        sav?.modele        ?? '',
    pointure:      sav?.pointure      ?? '',
    probleme:      sav?.probleme      ?? '',
    note:          sav?.note          ?? '',
    statut:        sav?.statut        ?? (sav?.type === 'retour' ? 'Reçu' : 'Déposé'),
    decision:      sav?.decision      ?? '',
    marque:        sav?.marque        ?? '',
  })
  const [sizes,        setSizes]        = useState([])
  const [srcTypeKey,   setSrcTypeKey]   = useState('F')
  const [srcCategorie, setSrcCategorie] = useState('')
  const [saving,       setSaving]       = useState(false)
  const [error,       setError]       = useState('')
  const [step,        setStep]        = useState('form') // 'form' | 'email' | 'save-contact'
  const [savedCtx,    setSavedCtx]    = useState(null)
  const [manualEmail, setManualEmail] = useState('')
  const [prixManuel, setPrixManuel] = useState('')
  const [facturation, setFacturation] = useState(sav?.facturation ?? 'offert')
  const [prixReparation, setPrixReparation] = useState(sav?.prixReparation ? String(sav.prixReparation) : '')

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

  useEffect(() => {
    const fId = Number(form.fournisseurId)
    if (!fId || !form.modele) { setSizes([]); return }
    let cancelled = false
    ;(async () => {
      const rows = await db.entrees.where('fournisseurId').equals(fId).and(e => e.modele === form.modele).toArray()
      if (cancelled) return
      const s = new Set(); let tk = null; const catCounts = {}
      rows.forEach(e => {
        Object.entries(e.sizes || {}).forEach(([k, v]) => { if (v > 0) s.add(k) })
        if (!tk && e.typeKey) tk = e.typeKey
        const c = (e.categorie || '').trim()
        if (c) catCounts[c] = (catCounts[c] || 0) + 1
      })
      setSizes([...s].sort((a, b) => (parseFloat(a) || 0) - (parseFloat(b) || 0) || a.localeCompare(b)))
      setSrcTypeKey(tk || 'F')
      setSrcCategorie(Object.entries(catCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || '')
    })()
    return () => { cancelled = true }
  }, [form.fournisseurId, form.modele])

  const sizeOptions = useMemo(() => {
    const s = [...sizes]
    if (form.pointure && !s.includes(form.pointure)) s.unshift(form.pointure)
    return s
  }, [sizes, form.pointure])

  async function handleSave() {
    if (!form.magasinId)              { setError('Magasin obligatoire'); return }
    if (!form.clientNom.trim())       { setError('Nom du client obligatoire'); return }
    if ((type === 'retour' || type === 'reparation') && !form.fournisseurId) { setError('Marque obligatoire'); return }
    if ((type === 'retour' || type === 'reparation') && !form.modele)        { setError('Modèle obligatoire'); return }

    setSaving(true); setError('')
    try {
      const magasinId = Number(form.magasinId)
      const fournisseurId = (type === 'retour' || type === 'reparation') ? Number(form.fournisseurId) : null

      if (editing) {
        const prevStatut = sav.statut
        await db.sav.update(sav.id, {
          magasinId, salarie: form.salarie, clientNom: form.clientNom, clientTel: form.clientTel,
          fournisseurId, modele: form.modele, pointure: form.pointure, marque: form.marque,
          probleme: form.probleme, note: form.note, statut: form.statut, decision: form.decision,
          facturation: type === 'reparation' ? facturation : null,
          prixReparation: (type === 'reparation' && facturation === 'payant') ? parseFloat(prixReparation.replace(',', '.')) || null : null,
        })
        // Sync défectueux statut si passage à "Mail marque envoyé"
        if (type === 'retour' && sav.defectueuxId && prevStatut !== 'Mail marque envoyé' && form.statut === 'Mail marque envoyé') {
          try { await db.defectueux.update(sav.defectueuxId, { statut: 'Mail envoyé' }) } catch {}
        }
        onSaved?.(); onClose?.()
        return
      }

      // Création : auto-créer défectueux + entree Retour pour retour et réparation
      let defectueuxId = null
      if (type === 'retour' || type === 'reparation') {
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
        const todayFr = () => { const d = new Date(); const p = n => String(n).padStart(2,'0'); return `${p(d.getDate())}/${p(d.getMonth()+1)}/${d.getFullYear()}` }

        const entreeId = await db.entrees.add({
          statut: 'Retour', magasinId, fournisseurId, date: todayFr(), modele: form.modele,
          numero: '', categorie: srcCategorie || '', typeKey: srcTypeKey || 'F', total: -1, pht,
          sizes: form.pointure ? { [form.pointure]: -1 } : {}, season,
        })

        const noteDefect = type === 'retour'
          ? `Retour client — ${form.clientNom}${form.clientTel ? ` (${form.clientTel})` : ''} : ${form.probleme}`
          : `Réparation — ${form.clientNom}${form.clientTel ? ` (${form.clientTel})` : ''} : ${form.probleme}`

        defectueuxId = await db.defectueux.add({
          magasinId, fournisseurId, salarie: form.salarie,
          modele: form.modele, numero: '', pointure: form.pointure,
          note: noteDefect, statut: 'À traiter', season, entreeId,
        })
      }

      const savId = await db.sav.add({
        type, magasinId, salarie: form.salarie,
        clientNom: form.clientNom, clientTel: form.clientTel,
        fournisseurId, modele: form.modele, pointure: form.pointure, marque: form.marque,
        probleme: form.probleme, note: form.note,
        statut: type === 'retour' ? 'Reçu' : 'Déposé',
        decision: '', defectueuxId, season,
        facturation: type === 'reparation' ? facturation : null,
        prixReparation: (type === 'reparation' && facturation === 'payant') ? parseFloat(prixReparation.replace(',', '.')) || null : null,
      })

      if (type === 'retour' || type === 'reparation') {
        setSavedCtx({ savId, defectueuxId, fournisseur, societe })
        setSaving(false)
        setStep('email')
      } else {
        onSaved?.(); onClose?.()
      }
    } catch (e) {
      setError('Erreur : ' + (e.message || e)); setSaving(false)
    }
  }

  function buildMailUrl(email) {
    return buildSavRetourMailUrl({
      modele: form.modele, pointure: form.pointure, probleme: form.probleme, salarie: form.salarie,
      societe: savedCtx?.societe || societe || '',
      email: email ?? (savedCtx?.fournisseur?.email || manualEmail.trim()),
      numeroClient: savedCtx?.fournisseur?.numeroClient ?? fournisseur?.numeroClient,
    })
  }

  async function sendMail() {
    window.open(buildMailUrl(), '_blank')
    if (savedCtx?.savId) {
      try { await db.sav.update(savedCtx.savId, { statut: 'Mail marque envoyé' }) } catch {}
    }
    if (savedCtx?.defectueuxId) {
      try { await db.defectueux.update(savedCtx.defectueuxId, { statut: 'Mail envoyé' }) } catch {}
    }
    if (!savedCtx?.fournisseur?.email && manualEmail.trim()) {
      setStep('save-contact')
    } else {
      onSaved?.(); onClose?.()
    }
  }

  async function saveContactEmail() {
    try { await db.fournisseurs.update(savedCtx?.fournisseur?.id, { email: manualEmail.trim() }) } catch {}
    onSaved?.(); onClose?.()
  }

  const STATUTS = type === 'retour' ? STATUTS_RETOUR : STATUTS_FORME
  const title = step === 'save-contact' ? '📋 Enregistrer le contact'
    : step === 'email' ? '✅ Dossier SAV créé'
    : editing ? 'Modifier le dossier SAV'
    : '🛠️ Nouveau dossier SAV'

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 560 }}>
        <div className="modal-header">
          <h2>{title}</h2>
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
              Le dossier SAV est enregistré et la ligne a été ajoutée dans l'onglet Défectueux.
            </p>
            <p style={{ fontSize: 14, color: 'var(--text-2)' }}>
              Envoyer un mail au <strong>SAV de {savedCtx?.fournisseur?.nom}</strong> ?
              {savedCtx?.fournisseur?.email
                ? <> <br /><span style={{ fontSize: 13, color: 'var(--text-3)' }}>→ {savedCtx.fournisseur.email}</span></>
                : <>
                    <br />
                    <span style={{ fontSize: 13, color: '#f59e0b' }}>⚠️ Aucun email SAV dans le répertoire.</span>
                    <input type="email" value={manualEmail} onChange={e => setManualEmail(e.target.value)}
                      placeholder="Saisir l'email SAV manuellement"
                      style={{ marginTop: 10, ...inputStyle }} />
                  </>}
            </p>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => { onSaved?.(); onClose?.() }}>Non, terminer</button>
              <button className="btn-primary" onClick={sendMail} disabled={!savedCtx?.fournisseur?.email && !manualEmail.trim()}>
                ✉️ Envoyer le mail
              </button>
            </div>
          </div>

        ) : (
          <div className="modal-body">
            {/* Sélecteur de type (création uniquement) */}
            {!editing && (
              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                {[{ v: 'retour', label: '🔄 Retour client' }, { v: 'forme', label: '👟 Mise à la forme' }, { v: 'reparation', label: '🧵 Réparation' }].map(({ v, label }) => (
                  <button key={v} onClick={() => { setType(v); set('statut', v === 'retour' ? 'Reçu' : 'Déposé') }}
                    style={{
                      flex: 1, padding: '9px 12px', borderRadius: 8,
                      border: `2px solid ${type === v ? 'var(--accent)' : 'var(--border)'}`,
                      background: type === v ? 'var(--accent-bg)' : 'var(--surface)',
                      color: type === v ? 'var(--accent)' : 'var(--text-3)',
                      cursor: 'pointer', fontSize: 13, fontWeight: type === v ? 700 : 400,
                    }}>
                    {label}
                  </button>
                ))}
              </div>
            )}

            {/* Magasin + traité par */}
            <div className="form-grid">
              <div className="form-field">
                <label>Magasin *</label>
                <select value={form.magasinId} onChange={e => set('magasinId', e.target.value)}>
                  <option value="">— Choisir —</option>
                  {(magasins || []).map(m => <option key={m.id} value={m.id}>{m.nom}</option>)}
                </select>
              </div>
              <div className="form-field">
                <label>Trait&eacute; par</label>
                <SalarieInput value={form.salarie} onChange={v => set('salarie', v)} salaries={filteredSalaries} />
              </div>
            </div>

            {/* Client */}
            <div className="form-grid">
              <div className="form-field">
                <label>Nom du client *</label>
                <input value={form.clientNom} onChange={e => set('clientNom', e.target.value)}
                  placeholder="Nom Prénom" style={inputStyle} />
              </div>
              <div className="form-field">
                <label>Téléphone</label>
                <input value={form.clientTel} onChange={e => set('clientTel', e.target.value)}
                  placeholder="06 XX XX XX XX" inputMode="tel" style={inputStyle} />
              </div>
            </div>

            {/* Champs spécifiques au type */}
            {type === 'retour' ? (
              <>
                {magasin && (
                  <div style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 10 }}>
                    Société : <strong style={{ color: 'var(--text)' }}>{societe || '—'}</strong>
                  </div>
                )}
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
                    <label>Pointure</label>
                    <PointureInput
                      key={form.modele}
                      value={form.pointure}
                      onChange={v => set('pointure', v)}
                      sizes={sizeOptions}
                      disabled={!form.modele}
                    />
                  </div>
                </div>
                <div className="form-field">
                  <label>Description du problème</label>
                  <textarea value={form.probleme} onChange={e => set('probleme', e.target.value)}
                    rows={3} style={textareaStyle} placeholder="Décris le défaut ou le problème signalé par le client…" />
                </div>
                {!editing && (
                  <div className="form-field">
                    <label>Prix unitaire HT (€, optionnel)</label>
                    <input type="number" value={prixManuel} onChange={e => setPrixManuel(e.target.value)}
                      placeholder="Laisser vide si le prix est dans les parametres" min="0" step="0.01"
                      style={inputStyle} />
                  </div>
                )}
              </>
            ) : type === 'reparation' ? (
              <>
                <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                  {[{ v: 'offert', label: '🎁 Offert' }, { v: 'payant', label: '💰 Payant' }].map(({ v, label }) => (
                    <button key={v} type="button" onClick={() => setFacturation(v)}
                      style={{
                        flex: 1, padding: '9px 12px', borderRadius: 8,
                        border: `2px solid ${facturation === v ? (v === 'offert' ? '#10b981' : '#f59e0b') : 'var(--border)'}`,
                        background: facturation === v ? (v === 'offert' ? '#ecfdf5' : '#fffbeb') : 'var(--surface)',
                        color: facturation === v ? (v === 'offert' ? '#065f46' : '#92400e') : 'var(--text-3)',
                        cursor: 'pointer', fontSize: 13, fontWeight: facturation === v ? 700 : 400,
                      }}>
                      {label}
                    </button>
                  ))}
                </div>
                {facturation === 'payant' && (
                  <div className="form-field" style={{ marginBottom: 12 }}>
                    <label>Prix de la réparation (€)</label>
                    <input type="number" value={prixReparation} onChange={e => setPrixReparation(e.target.value)}
                      placeholder="Ex: 25.00" min="0" step="0.01" style={inputStyle} />
                  </div>
                )}
                {magasin && (
                  <div style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 10 }}>
                    Société : <strong style={{ color: 'var(--text)' }}>{societe || '—'}</strong>
                  </div>
                )}
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
                    <label>Pointure</label>
                    <PointureInput
                      key={form.modele}
                      value={form.pointure}
                      onChange={v => set('pointure', v)}
                      sizes={sizeOptions}
                      disabled={!form.modele}
                    />
                  </div>
                </div>
                <div className="form-field">
                  <label>Note / problème</label>
                  <textarea value={form.probleme} onChange={e => set('probleme', e.target.value)}
                    rows={3} style={textareaStyle} placeholder="Décris les réparations à faire…" />
                </div>
              </>
            ) : (
              <>
                <div className="form-grid">
                  <div className="form-field">
                    <label>Marque</label>
                    <input value={form.marque} onChange={e => set('marque', e.target.value)} placeholder="Ex: Clarks" style={inputStyle} />
                  </div>
                  <div className="form-field">
                    <label>Modèle</label>
                    <input value={form.modele} onChange={e => set('modele', e.target.value)} placeholder="Nom du modèle" style={inputStyle} />
                  </div>
                  <div className="form-field">
                    <label>Pointure</label>
                    <input value={form.pointure} onChange={e => set('pointure', e.target.value)} placeholder="Ex: 42" style={inputStyle} />
                  </div>
                </div>
                <div className="form-field">
                  <label>Note</label>
                  <textarea value={form.note} onChange={e => set('note', e.target.value)}
                    rows={2} style={textareaStyle} placeholder="Informations complémentaires…" />
                </div>
              </>
            )}

            {/* Statut + décision (édition) */}
            {editing && (
              <div className="form-grid">
                <div className="form-field">
                  <label>Statut</label>
                  <select value={form.statut} onChange={e => set('statut', e.target.value)}>
                    {STATUTS.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                {type === 'retour' && form.statut === 'Clôturé' && (
                  <div className="form-field">
                    <label>Décision</label>
                    <select value={form.decision} onChange={e => set('decision', e.target.value)}>
                      <option value="">— Choisir —</option>
                      {DECISIONS.map(d => <option key={d}>{d}</option>)}
                    </select>
                  </div>
                )}
              </div>
            )}

            {error && <div className="form-error">⚠️ {error}</div>}

            <div className="modal-actions">
              <button className="btn-secondary" onClick={onClose}>Annuler</button>
              {editing && type === 'retour' && (
                <button className="btn-secondary" onClick={() => window.open(buildMailUrl(fournisseur?.email), '_blank')}>
                  ✉️ Envoyer mail marque
                </button>
              )}
              <button className="btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? '⏳ Enregistrement…' : editing ? 'Enregistrer' : 'Créer le dossier'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
