import { useState, useMemo } from 'react'
import { useLiveQuery } from '../lib/useLiveQuery'
import { db } from '../db'
import { LoadingState, fmtTel } from '../components/shared'

// Coordonnées par magasin (le reste — compta, adresse, notes — est commun au fournisseur)
const STORE_KEYS = ['contact', 'telephone', 'contactSav', 'telephoneFixe', 'email', 'numeroClient', 'btob']

const inputStyle = { padding: '7px 9px', border: '1px solid var(--border)', borderRadius: 7, fontSize: 13, background: 'var(--surface)', color: 'var(--text)', width: '100%', outline: 'none', boxSizing: 'border-box' }
const labelStyle = { fontSize: 10, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.4px', margin: '10px 0 4px' }
const row2 = { display: 'flex', gap: 6 }
const linkBtn = on => ({ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, flexShrink: 0, borderRadius: 7, border: '1px solid var(--border)', textDecoration: 'none', fontSize: 15, background: on ? 'var(--accent-bg)' : 'var(--surface)', color: on ? 'var(--accent-2)' : 'var(--text-5)', cursor: on ? 'pointer' : 'default' })

function gmailHref(email) { return email ? `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(email)}` : undefined }
function urlHref(u) { return u ? (/^https?:\/\//i.test(u) ? u : 'https://' + u) : undefined }

// ─── Carte d'un fournisseur (pour le magasin sélectionné) ─────────────────────
function FournisseurCard({ f, magId, saveStore, saveCommon }) {
  const [open, setOpen] = useState(false)
  // valeur par magasin, avec repli sur l'ancienne colonne globale (données existantes)
  const sv = key => { const cm = f.coordsMagasin && f.coordsMagasin[magId]; return (cm && cm[key] != null) ? cm[key] : (f[key] || '') }

  const storeText = (key, placeholder, isTel) => (
    <input type={isTel ? 'tel' : 'text'} inputMode={isTel ? 'tel' : undefined} placeholder={placeholder}
      defaultValue={isTel ? fmtTel(sv(key)) : sv(key)}
      onChange={isTel ? e => { e.target.value = fmtTel(e.target.value) } : undefined}
      onBlur={e => saveStore(f, magId, key, isTel ? fmtTel(e.target.value) : e.target.value)}
      style={inputStyle} />
  )
  const commonText = (key, placeholder, isTel, type) => (
    <input type={type || (isTel ? 'tel' : 'text')} inputMode={isTel ? 'tel' : undefined} placeholder={placeholder}
      defaultValue={isTel ? fmtTel(f[key]) : (f[key] || '')}
      onChange={isTel ? e => { e.target.value = fmtTel(e.target.value) } : undefined}
      onBlur={e => saveCommon(f.id, key, isTel ? fmtTel(e.target.value) : e.target.value)}
      style={inputStyle} />
  )

  const email = sv('email'), btob = sv('btob'), emailCompta = f.emailCompta

  return (
    <div className="store-card" style={{ padding: '14px 16px' }}>
      <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', margin: '0 0 4px' }}>{f.nom}</h3>

      {/* ── Par magasin ── */}
      <div style={labelStyle}>👤 Commercial</div>
      <div style={row2}>{storeText('contact', 'Nom')}{storeText('telephone', '06 12 34 56 78', true)}</div>

      <div style={labelStyle}>🛟 SAV</div>
      <div style={row2}>{storeText('contactSav', 'Contact')}{storeText('telephoneFixe', '01 23 45 67 89', true)}</div>
      <div style={{ ...row2, marginTop: 6 }}>
        {storeText('email', 'sav@marque.com')}
        <a href={gmailHref(email)} target="_blank" rel="noopener noreferrer" onClick={e => { if (!email) e.preventDefault() }}
          title={email ? `Écrire à ${email}` : 'Renseigne un email'} style={linkBtn(!!email)}>✉️</a>
      </div>

      <div style={labelStyle}>🔑 Compte (ce magasin)</div>
      <div style={row2}>
        {storeText('numeroClient', 'N° client')}
      </div>
      <div style={{ ...row2, marginTop: 6 }}>
        {storeText('btob', 'https://espace-pro…')}
        <a href={urlHref(btob)} target="_blank" rel="noopener noreferrer" onClick={e => { if (!btob) e.preventDefault() }}
          title={btob ? 'Ouvrir l’espace BtoB' : 'Renseigne le lien'} style={linkBtn(!!btob)}>🔗</a>
      </div>

      {/* ── Commun au fournisseur (repliable) ── */}
      <button onClick={() => setOpen(o => !o)}
        style={{ marginTop: 12, width: '100%', textAlign: 'left', padding: '6px 8px', borderRadius: 7, border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text-3)', fontSize: 11, fontWeight: 700, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
        {open ? '▾' : '▸'} Comptabilité · adresse · notes <span style={{ fontWeight: 400, textTransform: 'none' }}>(commun)</span>
      </button>

      {open && (
        <div style={{ marginTop: 8 }}>
          <div style={labelStyle}>🧮 Comptabilité</div>
          <div style={row2}>{commonText('contactCompta', 'Contact')}{commonText('telCompta', '01 23 45 67 89', true)}</div>
          <div style={{ ...row2, marginTop: 6 }}>
            {commonText('emailCompta', 'compta@marque.com', false, 'email')}
            <a href={gmailHref(emailCompta)} target="_blank" rel="noopener noreferrer" onClick={e => { if (!emailCompta) e.preventDefault() }}
              title={emailCompta ? `Écrire à ${emailCompta}` : 'Renseigne un email'} style={linkBtn(!!emailCompta)}>✉️</a>
          </div>

          <div style={labelStyle}>📍 Adresse postale (société)</div>
          <textarea defaultValue={f.adresse || ''} onBlur={e => saveCommon(f.id, 'adresse', e.target.value)}
            placeholder="Adresse postale de la société" rows={2} style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }} />

          <div style={labelStyle}>📝 Notes</div>
          <textarea defaultValue={f.notes || ''} onBlur={e => saveCommon(f.id, 'notes', e.target.value)}
            placeholder="Infos diverses" rows={2} style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }} />
        </div>
      )}
    </div>
  )
}

export default function Repertoire() {
  const fournisseurs = useLiveQuery(() => db.fournisseurs.orderBy('nom').toArray(), [])
  const magasins     = useLiveQuery(() => db.magasins.orderBy('nom').toArray(), [])
  const [search, setSearch] = useState('')
  const [newNom, setNewNom] = useState('')
  const [error,  setError]  = useState('')
  const [magId,  setMagId]  = useState(() => {
    const v = localStorage.getItem('repertoire_magasin')
    return v ? Number(v) : null
  })

  function selectMag(id) { localStorage.setItem('repertoire_magasin', String(id)); setMagId(id) }

  // magasin par défaut = le 1er, si rien en mémoire
  const effectiveMagId = useMemo(() => {
    if (magId && (magasins || []).some(m => m.id === magId)) return magId
    return (magasins || [])[0]?.id ?? null
  }, [magId, magasins])

  async function saveStore(f, mId, key, value) {
    const cm = { ...(f.coordsMagasin || {}) }
    cm[mId] = { ...(cm[mId] || {}), [key]: value }
    await db.fournisseurs.update(f.id, { coordsMagasin: cm })
  }
  async function saveCommon(fId, key, value) {
    await db.fournisseurs.update(fId, { [key]: value })
  }

  async function addFournisseur(e) {
    e.preventDefault()
    const nom = newNom.trim()
    if (!nom) return
    const existing = await db.fournisseurs.where('nom').equals(nom).first()
    if (existing) { setError(`"${nom}" existe déjà`); return }
    await db.fournisseurs.add({ nom, modelesBySeason: {} })
    setNewNom(''); setError('')
  }

  const list = useMemo(() => {
    const all = fournisseurs || []
    if (!search) return all
    const q = search.toLowerCase()
    return all.filter(f => {
      const cm = (f.coordsMagasin && f.coordsMagasin[effectiveMagId]) || {}
      const storeVals = STORE_KEYS.map(k => (cm[k] != null ? cm[k] : f[k]) || '')
      const vals = [f.nom, f.contactCompta, f.telCompta, f.emailCompta, f.notes, ...storeVals]
      return vals.some(v => String(v).toLowerCase().includes(q))
    })
  }, [fournisseurs, search, effectiveMagId])

  if (fournisseurs === undefined || magasins === undefined) return <LoadingState />

  const magNom = (magasins.find(m => m.id === effectiveMagId) || {}).nom || ''

  return (
    <div>
      {/* Sélecteur de magasin */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14, alignItems: 'center' }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-3)' }}>Magasin :</span>
        {magasins.map(m => {
          const on = m.id === effectiveMagId
          return (
            <button key={m.id} onClick={() => selectMag(m.id)}
              style={{
                padding: '6px 14px', borderRadius: 20, cursor: 'pointer', fontSize: 13,
                border: `2px solid ${on ? 'var(--accent)' : 'var(--border)'}`,
                background: on ? 'var(--accent-bg)' : 'var(--surface)',
                color: on ? 'var(--accent)' : 'var(--text-3)', fontWeight: on ? 700 : 400,
              }}>
              🏪 {m.nom}
            </button>
          )
        })}
      </div>

      <div className="controls" style={{ marginBottom: 16, gap: 8, flexWrap: 'wrap' }}>
        <input className="search-input" placeholder="🔍 Fournisseur, contact, email…" value={search} onChange={e => setSearch(e.target.value)} />
        <form onSubmit={addFournisseur} style={{ display: 'flex', gap: 8 }}>
          <input className="sel" style={{ minWidth: 180 }} placeholder="Nouveau fournisseur…" value={newNom} onChange={e => { setNewNom(e.target.value); setError('') }} />
          <button type="submit" className="btn-primary" disabled={!newNom.trim()}>+ Ajouter</button>
        </form>
      </div>
      {error && <p style={{ color: '#dc2626', fontSize: 13, marginBottom: 12 }}>⚠️ {error}</p>}

      <p style={{ fontSize: 12, color: 'var(--text-4)', margin: '0 0 12px' }}>
        Contacts <strong>commercial / SAV / compte</strong> propres à <strong>{magNom || 'ce magasin'}</strong> ; comptabilité, adresse et notes communes au fournisseur.
      </p>

      {list.length === 0 ? (
        <div className="empty"><p>{fournisseurs.length === 0 ? 'Aucun fournisseur — ajoutez-en un ci-dessus.' : 'Aucun résultat.'}</p></div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 14 }}>
          {list.map(f => (
            <FournisseurCard key={f.id + '-' + effectiveMagId} f={f} magId={effectiveMagId} saveStore={saveStore} saveCommon={saveCommon} />
          ))}
        </div>
      )}
    </div>
  )
}
