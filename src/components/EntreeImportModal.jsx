import { useState, useRef } from 'react'
import { db } from '../db'
import { SIZE_TYPES } from '../data/sizes'
import { useSeason } from '../context/SeasonContext'

const ALL_SIZES = new Set(Object.values(SIZE_TYPES).flatMap(t => t.sizes))

const CAT_TO_KEY = {
  'femme': 'F', 'homme': 'H', 'enfant': 'E',
  'bébé': 'B', 'bebe': 'B',
  'accessoire': 'ACC', 'acc': 'ACC',
  'taille unique': 'TU', 'tu': 'TU',
}

const HEADER_MAP = {
  'statut': 'statut', 'magasin': 'magasin', 'date': 'date',
  'marque': 'fournisseur', 'fournisseur': 'fournisseur',
  'modele': 'modele', 'modèle': 'modele',
  'n°': 'numero', 'numero': 'numero', 'numéro': 'numero',
  'catégorie': 'categorie', 'categorie': 'categorie',
  'pht': 'pht', 'prix ht': 'pht', 'prixht': 'pht', 'prix_ht': 'pht',
}

// Normalise : minuscules + supprime les accents
function norm(str) {
  return (str || '').trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
}

function normSize(s) { return String(s).trim().replace(',', '.') }

function detectTypeKey(categorie) {
  return CAT_TO_KEY[norm(categorie)] ?? 'F'
}

function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter(l => l.trim())
  const sep = lines[0]?.includes(';') ? ';' : ','
  return lines.map(l => l.split(sep).map(c => c.trim().replace(/^"|"$/g, '')))
}

function findMagasin(magasins, csv) {
  if (!csv) return null
  const n = norm(csv)
  return (
    magasins.find(m => norm(m.nom) === n) ||
    magasins.find(m => norm(m.nom).includes(n)) ||
    magasins.find(m => n.includes(norm(m.nom))) ||
    null
  )
}

export default function EntreeImportModal({ onClose, onSaved }) {
  const { season } = useSeason()
  const fileRef    = useRef(null)

  const [preview,   setPreview]   = useState(null)
  const [importing, setImporting] = useState(false)
  const [progress,  setProgress]  = useState(null)
  const [done,      setDone]      = useState(null)
  const [error,     setError]     = useState('')

  async function handleFile(e) {
    const file = e.target.files[0]
    if (!file) return
    e.target.value = ''
    setPreview(null); setDone(null); setError('')

    const text    = await file.text()
    const allRows = parseCSV(text)
    if (allRows.length < 2) { setError('Fichier vide ou invalide'); return }

    const headers  = allRows[0].map(h => h.trim())
    const dataRows = allRows.slice(1).filter(r => r.some(c => c.trim()))

    // Colonnes tailles
    const sizeCols = headers
      .map((h, i) => ({ i, size: ALL_SIZES.has(normSize(h)) ? normSize(h) : null }))
      .filter(c => c.size)

    // Mapping champs → index de colonne
    const fieldIdx = {}
    headers.forEach((h, i) => {
      const key = HEADER_MAP[h.toLowerCase()]
      if (key) fieldIdx[key] = i
    })

    const [magasins, fournisseurs] = await Promise.all([
      db.magasins.toArray(),
      db.fournisseurs.toArray(),
    ])

    const fournisseurSet = new Set(fournisseurs.map(f => norm(f.nom)))
    const warnings = []
    const valid    = []

    for (const row of dataRows) {
      const magasinCsv     = fieldIdx.magasin    != null ? row[fieldIdx.magasin]?.trim()    : ''
      const fournisseurCsv = fieldIdx.fournisseur != null ? row[fieldIdx.fournisseur]?.trim() : ''

      const magasin = findMagasin(magasins, magasinCsv)
      if (!magasin) {
        warnings.push(`Magasin introuvable : "${magasinCsv}"`)
        continue
      }
      if (!fournisseurCsv) {
        warnings.push('Marque manquante sur une ligne — ignorée')
        continue
      }

      const isNewFournisseur = !fournisseurSet.has(norm(fournisseurCsv))
      valid.push({ row, magasin, fournisseurCsv, isNew: isNewFournisseur })
    }

    const uniqueWarnings = [...new Set(warnings)]
    setPreview({ fieldIdx, sizeCols, valid, uniqueWarnings, filename: file.name })
  }

  async function handleImport() {
    if (!preview) return
    setImporting(true)
    setProgress({ done: 0, total: preview.valid.length })
    setError('')

    const { fieldIdx, sizeCols, valid } = preview
    const fournisseurCache = {}

    try {
      // Pré-charger tout en une seule fois
      const [existing, allMagasins, allParams] = await Promise.all([
        db.fournisseurs.toArray(),
        db.magasins.toArray(),
        db.parametres.where('season').equals(season).toArray(),
      ])
      existing.forEach(f => { fournisseurCache[norm(f.nom)] = f })

      // PM table indexée par IDs "fournisseurId_magasinId" — sans ambiguïté de nom
      const pmByIds = {}
      allParams.forEach(p => {
        const pm = p.pm || (p.reelN > 0 && p.quantite > 0
          ? Math.round((p.reelN / p.quantite) * 100) / 100
          : 0)
        if (pm > 0) pmByIds[`${p.fournisseurId}_${p.magasinId}`] = pm
      })

      let count = 0
      const sansPHT = []

      for (const { row, magasin, fournisseurCsv } of valid) {
        // Chercher le fournisseur dans le cache (norm) + fallback partial match
        const fKey = norm(fournisseurCsv)
        let fournisseur = fournisseurCache[fKey]
        if (!fournisseur) {
          // Fallback : cherche dans le cache une clé qui contient ou est contenue dans fKey
          const match = Object.keys(fournisseurCache).find(k => k.includes(fKey) || fKey.includes(k))
          if (match) fournisseur = fournisseurCache[match]
        }
        if (!fournisseur) {
          const id = await db.fournisseurs.add({ nom: fournisseurCsv, modelesBySeason: {} })
          fournisseur = { id, nom: fournisseurCsv }
          fournisseurCache[fKey] = fournisseur
        }

        const categorie = fieldIdx.categorie != null ? row[fieldIdx.categorie]?.trim() || '' : ''
        const typeKey   = detectTypeKey(categorie)

        const sizes = {}
        sizeCols.forEach(({ i, size }) => {
          const val = parseInt(row[i]) || 0
          if (val > 0) sizes[size] = val
        })
        const total = Object.values(sizes).reduce((s, v) => s + v, 0)

        // PHT : PM × total — lookup par IDs (sans ambiguïté)
        let pht = fieldIdx.pht != null ? Number(row[fieldIdx.pht]) || 0 : 0
        if (!pht && total > 0) {
          const pm = pmByIds[`${fournisseur.id}_${magasin.id}`] || 0
          if (pm > 0) {
            pht = Math.round(pm * total * 100) / 100
          } else {
            sansPHT.push(fournisseurCsv)
          }
        }

        await db.entrees.add({
          statut:        fieldIdx.statut != null ? row[fieldIdx.statut]?.trim()  || '' : '',
          magasinId:     magasin.id,
          fournisseurId: fournisseur.id,
          date:          fieldIdx.date   != null ? row[fieldIdx.date]?.trim()    || '' : '',
          modele:        fieldIdx.modele != null ? row[fieldIdx.modele]?.trim()  || '' : '',
          numero:        fieldIdx.numero != null ? row[fieldIdx.numero]?.trim()  || '' : '',
          categorie,
          typeKey,
          total,
          pht,
          sizes,
          season,
        })

        count++
        setProgress({ done: count, total: preview.valid.length })
      }

      setDone({ count, sansPHT: [...new Set(sansPHT)] })
      onSaved?.()
    } catch (err) {
      setError('Erreur : ' + err.message)
    } finally {
      setImporting(false)
    }
  }

  function resetForNextFile() {
    setPreview(null); setDone(null); setProgress(null); setError('')
    setTimeout(() => fileRef.current?.click(), 50)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 620 }}>
        <div className="modal-header">
          <h2>📂 Importer des entrées (CSV)</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          {/* Instructions */}
          {!preview && !done && (
            <div style={{ marginBottom: 16, padding: 12, background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, color: '#475569', lineHeight: 1.7 }}>
              <strong>Format attendu (séparateur <code style={{ background: '#e2e8f0', padding: '1px 4px', borderRadius: 3 }}>;</code>) :</strong><br />
              <code style={{ background: '#e2e8f0', padding: '2px 6px', borderRadius: 4, fontSize: 12 }}>
                Statut;Magasin;Date;Marque;Modele;N°;Catégorie;35;35,5;36;36,5…
              </code>
              <br />
              PHT est calculé automatiquement depuis le <strong>Prix Moyen</strong> dans l'onglet Achats (Réel ÷ Quantité).<br />
              Date : <strong>JJ/MM/AAAA</strong> · Catégorie : Femme / Homme / Enfant / Bébé / Accessoire
            </div>
          )}

          <input ref={fileRef} type="file" accept=".csv,.txt" style={{ display: 'none' }} onChange={handleFile} />

          {/* Bouton choisir fichier */}
          {!preview && !done && (
            <button className="btn-primary" onClick={() => fileRef.current?.click()}>
              📂 Choisir un fichier CSV
            </button>
          )}

          {error && (
            <div style={{ marginTop: 12, padding: 12, background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, fontSize: 13, color: '#dc2626' }}>
              ⚠️ {error}
            </div>
          )}

          {/* Preview */}
          {preview && !done && (
            <div>
              <div style={{ marginBottom: 12, padding: 12, background: '#eff6ff', borderRadius: 8, border: '1px solid #bfdbfe', fontSize: 13 }}>
                <strong>📄 {preview.filename}</strong>
                <span style={{ marginLeft: 12, color: '#2563eb' }}>
                  {preview.valid.length} ligne{preview.valid.length !== 1 ? 's' : ''} à importer
                </span>
                {preview.valid.filter(r => r.isNew).length > 0 && (
                  <span style={{ marginLeft: 12, color: '#059669' }}>
                    · {preview.valid.filter(r => r.isNew).length} nouvelle{preview.valid.filter(r => r.isNew).length !== 1 ? 's' : ''} marque{preview.valid.filter(r => r.isNew).length !== 1 ? 's' : ''} créée{preview.valid.filter(r => r.isNew).length !== 1 ? 's' : ''}
                  </span>
                )}
              </div>

              {preview.uniqueWarnings.length > 0 && (
                <div style={{ marginBottom: 12, padding: 12, background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: 8, fontSize: 13, color: '#92400e' }}>
                  {preview.uniqueWarnings.map((w, i) => <div key={i}>⚠️ {w}</div>)}
                </div>
              )}

              {/* Aperçu des 3 premières lignes */}
              <div style={{ marginBottom: 16, overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: 8 }}>
                <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
                  <thead style={{ background: '#f8fafc' }}>
                    <tr>
                      {['Magasin', 'Date', 'Marque', 'Modèle', 'Catégorie', 'Total tailles'].map(h => (
                        <th key={h} style={{ padding: '6px 10px', textAlign: 'left', borderBottom: '1px solid #e2e8f0', fontWeight: 600, color: '#475569', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.valid.slice(0, 5).map(({ row, magasin }, i) => {
                      const { fieldIdx, sizeCols } = preview
                      const total = sizeCols.reduce((s, { i: ci }) => s + (parseInt(row[ci]) || 0), 0)
                      return (
                        <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '5px 10px' }}>{magasin.nom}</td>
                          <td style={{ padding: '5px 10px', whiteSpace: 'nowrap' }}>{fieldIdx.date != null ? row[fieldIdx.date] : ''}</td>
                          <td style={{ padding: '5px 10px', fontWeight: 600 }}>{fieldIdx.fournisseur != null ? row[fieldIdx.fournisseur] : ''}</td>
                          <td style={{ padding: '5px 10px', color: '#64748b' }}>{fieldIdx.modele != null ? row[fieldIdx.modele] : ''}</td>
                          <td style={{ padding: '5px 10px' }}>{fieldIdx.categorie != null ? row[fieldIdx.categorie] : ''}</td>
                          <td style={{ padding: '5px 10px', textAlign: 'center', fontWeight: 700, color: total > 0 ? '#2563eb' : '#94a3b8' }}>{total}</td>
                        </tr>
                      )
                    })}
                    {preview.valid.length > 5 && (
                      <tr><td colSpan={6} style={{ padding: '6px 10px', color: '#94a3b8', fontSize: 11, textAlign: 'center' }}>… et {preview.valid.length - 5} autre{preview.valid.length - 5 > 1 ? 's' : ''} ligne{preview.valid.length - 5 > 1 ? 's' : ''}</td></tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Progress */}
              {importing && progress && (
                <div style={{ marginBottom: 12, padding: 10, background: '#f0fdf4', borderRadius: 8, fontSize: 13, color: '#059669' }}>
                  ⏳ Import en cours… {progress.done} / {progress.total}
                  <div style={{ marginTop: 6, height: 6, background: '#d1fae5', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ height: '100%', background: '#10b981', borderRadius: 3, width: `${(progress.done / progress.total) * 100}%`, transition: 'width .1s' }} />
                  </div>
                </div>
              )}

              <div className="modal-actions">
                <button className="btn-secondary" onClick={() => { setPreview(null); fileRef.current?.click() }} disabled={importing}>
                  Changer de fichier
                </button>
                <button className="btn-primary" onClick={handleImport} disabled={importing || preview.valid.length === 0}>
                  {importing ? '⏳ Import en cours…' : `✅ Importer ${preview.valid.length} ligne${preview.valid.length !== 1 ? 's' : ''}`}
                </button>
              </div>
            </div>
          )}

          {/* Succès */}
          {done != null && (
            <div style={{ padding: '20px 0' }}>
              <div style={{ textAlign: 'center', marginBottom: 16 }}>
                <div style={{ fontSize: 40, marginBottom: 8 }}>✅</div>
                <p style={{ fontWeight: 700, fontSize: 16, margin: '0 0 4px' }}>{done.count} entrée{done.count !== 1 ? 's' : ''} importée{done.count !== 1 ? 's' : ''} !</p>
                <p style={{ color: '#64748b', fontSize: 13, margin: 0 }}>
                  {done.count - done.sansPHT.length} avec PHT calculé
                  {done.sansPHT.length > 0 && ` · ${done.sansPHT.length} sans PHT`}
                </p>
              </div>

              {done.sansPHT.length > 0 && (
                <div style={{ margin: '12px 0', padding: 12, background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: 8, fontSize: 13, color: '#92400e' }}>
                  <strong>⚠️ PHT à 0 pour ces marques</strong> — PM introuvable dans Achats pour cette saison × magasin :<br />
                  <span style={{ fontWeight: 600 }}>{done.sansPHT.join(', ')}</span>
                  <br /><span style={{ fontSize: 12, marginTop: 4, display: 'block' }}>Vérifie que Réel achat N et Quantité sont renseignés dans l'onglet Achats pour chaque combinaison marque × magasin.</span>
                </div>
              )}

              <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 8 }}>
                <button className="btn-secondary" onClick={onClose}>Fermer</button>
                <button className="btn-primary" onClick={resetForNextFile}>📂 Importer un autre fichier</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
