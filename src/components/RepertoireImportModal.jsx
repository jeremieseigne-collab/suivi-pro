import { useState } from 'react'
import { db } from '../db'
import { fmtTel } from './shared'

// Normalise un libellé d'en-tête (minuscules, sans accents, alphanumérique)
const norm = s => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim()

// Champs par magasin (rangés dans coords_magasin[magId]) et champs communs (sur le fournisseur)
const STORE_KEYS  = ['contact', 'telephone', 'contactSav', 'telephoneFixe', 'email', 'numeroClient', 'btob']
const COMMON_KEYS = ['contactCompta', 'telCompta', 'emailCompta', 'adresse', 'notes']
const TEL_KEYS    = new Set(['telephone', 'telephoneFixe', 'telCompta'])

// En-têtes acceptés → champ (correspondance exacte après normalisation)
const ALIASES = {
  _magasin:      ['magasin', 'boutique', 'store'],
  _marque:       ['marque', 'fournisseur', 'nom', 'enseigne', 'marque fournisseur'],
  contact:       ['contact', 'commercial', 'contact commercial', 'nom commercial', 'representant'],
  telephone:     ['telephone', 'tel', 'portable', 'mobile', 'gsm', 'tel commercial', 'telephone commercial', 'tel portable'],
  contactSav:    ['contact sav', 'sav', 'nom sav', 'contact apres vente'],
  telephoneFixe: ['telephone fixe', 'fixe', 'tel fixe', 'tel sav', 'telephone sav', 'ligne fixe'],
  email:         ['email', 'mail', 'e mail', 'courriel', 'email sav', 'mail sav'],
  numeroClient:  ['n client', 'numero client', 'no client', 'code client', 'compte client', 'numero de client'],
  btob:          ['btob', 'b to b', 'espace pro', 'espace btob', 'site', 'lien', 'url', 'site web', 'portail'],
  contactCompta: ['contact compta', 'compta', 'comptabilite', 'contact comptabilite', 'nom compta'],
  telCompta:     ['tel compta', 'telephone compta', 'tel comptabilite', 'telephone comptabilite'],
  emailCompta:   ['email compta', 'mail compta', 'email comptabilite', 'mail comptabilite'],
  adresse:       ['adresse', 'adresse postale'],
  notes:         ['notes', 'note', 'remarque', 'remarques', 'commentaire', 'commentaires', 'infos', 'divers'],
}
const FIELD_BY_NORM = {}
for (const [field, aliases] of Object.entries(ALIASES)) for (const a of aliases) FIELD_BY_NORM[a] = field

const FIELD_LABEL = {
  _magasin: 'Magasin', _marque: 'Marque', contact: 'Commercial', telephone: 'Tél. commercial',
  contactSav: 'Contact SAV', telephoneFixe: 'Tél. SAV', email: 'Email SAV', numeroClient: 'N° client',
  btob: 'BtoB', contactCompta: 'Contact compta', telCompta: 'Tél. compta', emailCompta: 'Email compta',
  adresse: 'Adresse', notes: 'Notes',
}

function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter(l => l.trim())
  if (!lines.length) return null
  const sep = (lines[0].match(/;/g)?.length || 0) >= (lines[0].match(/,/g)?.length || 0) ? ';' : ','
  const rawHeaders = lines[0].split(sep).map(h => h.trim())
  const fieldByCol = rawHeaders.map(h => FIELD_BY_NORM[norm(h)] || null)
  const rows = lines.slice(1).map(l => {
    const cells = l.split(sep)
    const o = {}
    fieldByCol.forEach((field, i) => { if (field) o[field] = (cells[i] || '').trim() })
    return o
  }).filter(o => o._marque)   // une ligne sans marque n'a aucun sens
  const recognized = rawHeaders.filter((h, i) => fieldByCol[i])
  const ignored    = rawHeaders.filter((h, i) => !fieldByCol[i])
  return { rows, recognized, ignored }
}

export default function RepertoireImportModal({ onClose, onDone }) {
  const [parsed, setParsed] = useState(null)
  const [fileName, setFileName] = useState('')
  const [error, setError] = useState('')
  const [importing, setImporting] = useState(false)
  const [done, setDone] = useState(null)

  function onFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name); setError(''); setDone(null)
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const res = parseCSV(String(reader.result))
        if (!res || !res.rows.length) { setError('Aucune ligne exploitable (vérifie qu\'il y a une colonne Marque).'); setParsed(null); return }
        if (!res.recognized.includes('Magasin') && !Object.values(res.rows[0]).length) { /* ok */ }
        setParsed(res)
      } catch (err) { setError('Lecture impossible : ' + (err.message || err)); setParsed(null) }
    }
    reader.readAsText(file, 'utf-8')
  }

  async function doImport() {
    if (!parsed) return
    setImporting(true); setError('')
    try {
      const [fournisseurs, mags] = await Promise.all([db.fournisseurs.toArray(), db.magasins.toArray()])
      const fByName = {}; fournisseurs.forEach(f => { fByName[norm(f.nom)] = f })
      const mByName = {}; mags.forEach(m => { mByName[norm(m.nom)] = m })

      const patches = {}   // fId -> { coords: { [magId]: {...} }, common: {...} }
      let unknownMag = 0

      for (const r of parsed.rows) {
        let f = fByName[norm(r._marque)]
        if (!f) {
          const id = await db.fournisseurs.add({ nom: r._marque, modelesBySeason: {} })
          f = { id, nom: r._marque }
          fByName[norm(r._marque)] = f
        }
        if (!patches[f.id]) patches[f.id] = { coords: {}, common: {} }
        for (const k of COMMON_KEYS) if (r[k]) patches[f.id].common[k] = r[k]
        const mag = r._magasin ? mByName[norm(r._magasin)] : null
        if (mag) {
          const cur = patches[f.id].coords[mag.id] || {}
          for (const k of STORE_KEYS) if (r[k]) cur[k] = TEL_KEYS.has(k) ? fmtTel(r[k]) : r[k]
          patches[f.id].coords[mag.id] = cur
        } else if (STORE_KEYS.some(k => r[k])) {
          unknownMag++
        }
      }

      let nbF = 0
      for (const fId of Object.keys(patches)) {
        const current = await db.fournisseurs.get(Number(fId))
        const newCoords = { ...(current?.coordsMagasin || {}) }
        for (const [magId, fields] of Object.entries(patches[fId].coords)) {
          newCoords[magId] = { ...(newCoords[magId] || {}), ...fields }
        }
        const common = { ...patches[fId].common }
        if (common.telCompta) common.telCompta = fmtTel(common.telCompta)
        await db.fournisseurs.update(Number(fId), { coordsMagasin: newCoords, ...common })
        nbF++
      }
      setDone({ fournisseurs: nbF, lignes: parsed.rows.length, unknownMag })
    } catch (err) {
      setError('Erreur : ' + (err.message || err))
    }
    setImporting(false)
  }

  const cell = { padding: '4px 8px', fontSize: 12, borderBottom: '1px solid var(--surface-3)', textAlign: 'left', whiteSpace: 'nowrap' }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 720 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>📥 Importer des contacts (CSV)</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          {done ? (
            <>
              <p style={{ fontSize: 15, color: 'var(--text)' }}>
                ✅ Import terminé : <strong>{done.fournisseurs}</strong> fournisseur(s) mis à jour à partir de <strong>{done.lignes}</strong> ligne(s).
              </p>
              {done.unknownMag > 0 && (
                <p style={{ fontSize: 13, color: '#f59e0b' }}>
                  ⚠️ {done.unknownMag} ligne(s) avec un <strong>magasin non reconnu</strong> : les contacts « par magasin » de ces lignes n'ont pas été importés (vérifie l'orthographe du magasin). Les infos communes (compta/adresse/notes) ont été enregistrées.
                </p>
              )}
              <div className="modal-actions">
                <button className="btn-primary" onClick={() => { onDone?.(); onClose?.() }}>Fermer</button>
              </div>
            </>
          ) : (
            <>
              <p style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 0 }}>
                Le fichier doit avoir une 1ʳᵉ ligne d'en-têtes (séparateur <code>;</code> ou <code>,</code>). Colonnes reconnues : <strong>Magasin, Marque, Contact, Téléphone, Contact SAV, Téléphone fixe, Email, N° client, BtoB, Contact compta, Tél compta, Email compta, Adresse, Notes</strong>. Les contacts commercial/SAV/compte vont sur le <strong>magasin de la ligne</strong> ; comptabilité/adresse/notes sont communes au fournisseur.
              </p>

              <input type="file" accept=".csv,text/csv,text/plain" onChange={onFile} style={{ fontSize: 13 }} />
              {fileName && <div style={{ fontSize: 12, color: 'var(--text-4)', marginTop: 4 }}>Fichier : {fileName}</div>}
              {error && <div className="form-error" style={{ marginTop: 10 }}>⚠️ {error}</div>}

              {parsed && (
                <div style={{ marginTop: 14 }}>
                  <div style={{ fontSize: 13, marginBottom: 8 }}>
                    <strong>{parsed.rows.length}</strong> ligne(s) détectée(s).
                    {parsed.ignored.length > 0 && (
                      <span style={{ color: 'var(--text-4)' }}> Colonnes ignorées : {parsed.ignored.join(', ')}.</span>
                    )}
                  </div>
                  <div style={{ maxHeight: 260, overflow: 'auto', border: '1px solid var(--border)', borderRadius: 8 }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ background: 'var(--surface-2)' }}>
                          {parsed.recognized.length === 0
                            ? <th style={cell}>—</th>
                            : ['_marque', '_magasin', ...STORE_KEYS, ...COMMON_KEYS]
                                .filter(k => parsed.rows.some(r => r[k]))
                                .map(k => <th key={k} style={{ ...cell, fontWeight: 700 }}>{FIELD_LABEL[k]}</th>)}
                        </tr>
                      </thead>
                      <tbody>
                        {parsed.rows.slice(0, 50).map((r, i) => (
                          <tr key={i}>
                            {['_marque', '_magasin', ...STORE_KEYS, ...COMMON_KEYS]
                              .filter(k => parsed.rows.some(rr => rr[k]))
                              .map(k => <td key={k} style={cell}>{TEL_KEYS.has(k) ? fmtTel(r[k]) : (r[k] || '')}</td>)}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {parsed.rows.length > 50 && <div style={{ fontSize: 11, color: 'var(--text-4)', marginTop: 4 }}>(aperçu des 50 premières lignes)</div>}
                </div>
              )}

              <div className="modal-actions">
                <button className="btn-secondary" onClick={onClose}>Annuler</button>
                <button className="btn-primary" onClick={doImport} disabled={!parsed || importing}>
                  {importing ? '⏳ Import…' : `Importer${parsed ? ` (${parsed.rows.length})` : ''}`}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
