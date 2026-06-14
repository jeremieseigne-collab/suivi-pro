import { useState, useMemo } from 'react'
import { useLiveQuery } from '../lib/useLiveQuery'
import { db } from '../db'
import { LoadingState } from '../components/shared'

// Coordonnées regroupées par bloc logique
const GROUPS = [
  { title: '👤 Commercial', fields: [
    { key: 'contact',       label: 'Nom',      type: 'text', placeholder: 'Nom du commercial' },
    { key: 'telephone',     label: 'Portable', type: 'tel',  placeholder: '06 12 34 56 78' },
  ] },
  { title: '🛟 SAV', fields: [
    { key: 'contactSav',    label: 'Contact',       type: 'text',  placeholder: 'Nom du contact SAV' },
    { key: 'telephoneFixe', label: 'Téléphone fixe', type: 'tel',  placeholder: '01 23 45 67 89' },
    { key: 'email',         label: 'Email',          type: 'email', placeholder: 'sav@marque.com' },
  ] },
  { title: '🔑 Compte fournisseur', fields: [
    { key: 'numeroClient', label: 'N° client', type: 'text', placeholder: 'Notre n° client' },
    { key: 'btob',         label: 'Espace BtoB', type: 'url', placeholder: 'https://…' },
  ] },
  { title: '📍 Adresse postale (société)', fields: [
    { key: 'adresse', label: '', type: 'textarea', placeholder: 'Adresse postale de la société' },
  ] },
  { title: '📝 Notes', fields: [
    { key: 'notes', label: '', type: 'textarea', placeholder: 'Infos diverses' },
  ] },
]

const SEARCH_KEYS = ['nom', 'contact', 'telephone', 'contactSav', 'telephoneFixe', 'email', 'numeroClient']
const inputStyle = { padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 14, background: 'var(--surface)', color: 'var(--text)', width: '100%', outline: 'none' }

export default function Repertoire() {
  const fournisseurs = useLiveQuery(() => db.fournisseurs.orderBy('nom').toArray(), [])
  const [search, setSearch] = useState('')
  const [newNom, setNewNom] = useState('')
  const [error,  setError]  = useState('')

  async function updateField(id, key, value) {
    await db.fournisseurs.update(id, { [key]: value })
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
    return all.filter(f => SEARCH_KEYS.some(k => (f[k] || '').toLowerCase().includes(q)))
  }, [fournisseurs, search])

  if (fournisseurs === undefined) return <LoadingState />

  return (
    <div>
      <div className="controls" style={{ marginBottom: 16, gap: 8, flexWrap: 'wrap' }}>
        <input className="search-input" placeholder="🔍 Fournisseur, contact, email…" value={search} onChange={e => setSearch(e.target.value)} />
        <form onSubmit={addFournisseur} style={{ display: 'flex', gap: 8 }}>
          <input className="sel" style={{ minWidth: 180 }} placeholder="Nouveau fournisseur…" value={newNom} onChange={e => { setNewNom(e.target.value); setError('') }} />
          <button type="submit" className="btn-primary" disabled={!newNom.trim()}>+ Ajouter</button>
        </form>
      </div>
      {error && <p style={{ color: '#dc2626', fontSize: 13, marginBottom: 12 }}>⚠️ {error}</p>}

      {list.length === 0 ? (
        <div className="empty"><p>{fournisseurs.length === 0 ? 'Aucun fournisseur — ajoutez-en un ci-dessus.' : 'Aucun résultat.'}</p></div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 14 }}>
          {list.map(f => (
            <div key={f.id} className="store-card">
              <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', margin: '0 0 12px' }}>{f.nom}</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {GROUPS.map(g => (
                  <div key={g.title}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>{g.title}</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {g.fields.map(fl => (
                        <div key={fl.key} style={{ flex: fl.type === 'textarea' ? '1 1 100%' : '1 1 140px', display: 'flex', flexDirection: 'column', gap: 3 }}>
                          {fl.label && <label style={{ fontSize: 10, color: 'var(--text-4)' }}>{fl.label}</label>}
                          {fl.type === 'textarea' ? (
                            <textarea key={f.id + fl.key} defaultValue={f[fl.key] || ''} onBlur={e => updateField(f.id, fl.key, e.target.value)}
                              placeholder={fl.placeholder} rows={2} style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }} />
                          ) : fl.key === 'email' ? (
                            <div style={{ display: 'flex', gap: 6 }}>
                              <input key={f.id + fl.key} type="email" defaultValue={f.email || ''} onBlur={e => updateField(f.id, 'email', e.target.value)}
                                placeholder={fl.placeholder} style={{ ...inputStyle, flex: 1 }} />
                              <a
                                href={f.email ? `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(f.email)}` : undefined}
                                target="_blank" rel="noopener noreferrer"
                                title={f.email ? `Écrire à ${f.email} (Gmail)` : 'Renseigne un email d’abord'}
                                onClick={e => { if (!f.email) e.preventDefault() }}
                                style={{
                                  display: 'flex', alignItems: 'center', justifyContent: 'center', width: 40, flexShrink: 0,
                                  borderRadius: 8, border: '1px solid var(--border)', textDecoration: 'none', fontSize: 16,
                                  background: f.email ? 'var(--accent-bg)' : 'var(--surface)',
                                  color: f.email ? 'var(--accent-2)' : 'var(--text-5)',
                                  cursor: f.email ? 'pointer' : 'default',
                                }}
                              >✉️</a>
                            </div>
                          ) : fl.key === 'btob' ? (
                            <div style={{ display: 'flex', gap: 6 }}>
                              <input key={f.id + fl.key} type="url" defaultValue={f.btob || ''} onBlur={e => updateField(f.id, 'btob', e.target.value)}
                                placeholder={fl.placeholder} style={{ ...inputStyle, flex: 1 }} />
                              <a
                                href={f.btob ? (/^https?:\/\//i.test(f.btob) ? f.btob : 'https://' + f.btob) : undefined}
                                target="_blank" rel="noopener noreferrer"
                                title={f.btob ? 'Ouvrir l’espace BtoB' : 'Renseigne le lien d’abord'}
                                onClick={e => { if (!f.btob) e.preventDefault() }}
                                style={{
                                  display: 'flex', alignItems: 'center', justifyContent: 'center', width: 40, flexShrink: 0,
                                  borderRadius: 8, border: '1px solid var(--border)', textDecoration: 'none', fontSize: 16,
                                  background: f.btob ? 'var(--accent-bg)' : 'var(--surface)',
                                  color: f.btob ? 'var(--accent-2)' : 'var(--text-5)',
                                  cursor: f.btob ? 'pointer' : 'default',
                                }}
                              >🔗</a>
                            </div>
                          ) : (
                            <input key={f.id + fl.key} type={fl.type} defaultValue={f[fl.key] || ''} onBlur={e => updateField(f.id, fl.key, e.target.value)}
                              placeholder={fl.placeholder} style={inputStyle} />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
