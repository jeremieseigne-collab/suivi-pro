import { useState } from 'react'
import { db } from '../db'
import { useSeason } from '../context/SeasonContext'

const CAT_TO_KEY = {
  'femme': 'F', 'homme': 'H', 'enfant': 'E', 'bebe': 'B',
  'accessoire': 'ACC', 'acc': 'ACC', 'taille unique': 'TU', 'tu': 'TU',
  'double pointure': 'DP', 'dp': 'DP',
}

const norm = s => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim()
const normSize = s => String(s || '').trim().replace(',', '.')
const detectTypeKey = cat => CAT_TO_KEY[norm(cat)] ?? 'F'

function parseNum(s) {
  if (s == null) return 0
  let t = String(s).replace(/[^\d.,-]/g, '')
  if (t.includes(',')) t = t.replace(/\./g, '').replace(',', '.')
  return parseFloat(t) || 0
}
function parseQte(s) { return parseInt(String(s || '').replace(/[^\d-]/g, '')) || 0 }
function parseCsvLine(line, sep) { return line.split(sep).map(c => c.trim().replace(/^"|"$/g, '')) }

export default function EntreeImportModal({ onClose, onSaved }) {
  const { season } = useSeason()
  const [preview, setPreview] = useState(null)   // { entries:[...], warnings:[], filename }
  const [importing, setImporting] = useState(false)
  const [progress, setProgress] = useState(null)
  const [done, setDone] = useState(null)
  const [error, setError] = useState('')

  async function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    setPreview(null); setDone(null); setError('')
    try {
      const text = await file.text()
      const lines = text.split(/\r?\n/).filter(l => l.trim())
      if (lines.length < 2) { setError('Fichier vide ou sans données.'); return }
      const sep = (lines[0].match(/;/g) || []).length >= (lines[0].match(/,/g) || []).length ? ';' : ','
      const header = parseCsvLine(lines[0], sep).map(norm)
      const findCol = (...keys) => header.findIndex(h => keys.some(k => h === k || h.includes(k)))
      const col = {
        magasin:  findCol('magasin', 'boutique'),
        fourn:    findCol('fournisseur', 'marque'),
        code:     header.findIndex(h => h.includes('code modele')) >= 0 ? header.findIndex(h => h.includes('code modele')) : findCol('modele'),
        couleur:  findCol('couleur'),
        taille:   findCol('taille', 'pointure'),
        qte:      findCol('quantite', 'qte'),
        date:     findCol('date'),
        numero:   header.findIndex(h => h === 'n' || h.includes('numero')),
        cat:      findCol('categorie', 'famille'),
        prix:     findCol("prix d achat", 'pa ht', 'prix achat'),
        statut:   findCol('statut'),
      }
      if (col.magasin < 0 || col.fourn < 0 || col.code < 0 || col.taille < 0) {
        setError('Colonnes obligatoires manquantes : Magasin, Marque, Modèle (ou Code Modèle), Taille.'); return
      }

      const magasins = await db.magasins.toArray()
      const matchMag = raw => { const n = norm(raw); return magasins.find(m => { const mn = norm(m.nom); return mn === n || mn.includes(n) || n.includes(mn) }) }
      const get = (cells, i) => (i >= 0 ? (cells[i] || '').trim() : '')

      const agg = {}   // clé entrée -> { magasinId, magNom, fournisseur, modele, date, numero, statut, categorie, typeKey, sizes, total, prixTotal }
      const warnSet = new Set()
      for (let r = 1; r < lines.length; r++) {
        const cells = parseCsvLine(lines[r], sep)
        const fournisseur = get(cells, col.fourn)
        const magRaw = get(cells, col.magasin)
        const code = get(cells, col.code)
        if (!fournisseur || !magRaw || !code) continue
        const mag = matchMag(magRaw)
        if (!mag) { warnSet.add(`Magasin introuvable : "${magRaw}"`); continue }
        const couleur = get(cells, col.couleur)
        const modele = couleur ? `${code}, ${couleur}` : code
        const taille = normSize(get(cells, col.taille))
        const qte = parseQte(get(cells, col.qte))
        const date = get(cells, col.date)
        const numero = get(cells, col.numero)
        const statut = get(cells, col.statut)
        const categorie = get(cells, col.cat)
        const prix = parseNum(get(cells, col.prix))
        const key = [mag.id, norm(fournisseur), norm(modele), date, numero, norm(statut)].join('|')
        if (!agg[key]) agg[key] = { magasinId: mag.id, magNom: mag.nom, fournisseur, modele, date, numero, statut, categorie, typeKey: detectTypeKey(categorie), sizes: {}, total: 0, prixTotal: 0 }
        const a = agg[key]
        if (taille && qte) a.sizes[taille] = (a.sizes[taille] || 0) + qte
        a.total += qte
        a.prixTotal += prix * qte
      }
      const entries = Object.values(agg).filter(e => e.total !== 0)
      entries.sort((x, y) => x.fournisseur.localeCompare(y.fournisseur, 'fr') || String(x.modele).localeCompare(String(y.modele), 'fr'))
      setPreview({ entries, warnings: [...warnSet], filename: file.name })
    } catch (err) { setError('Lecture impossible : ' + (err.message || err)) }
  }

  async function handleImport() {
    if (!preview) return
    setImporting(true); setError('')
    setProgress({ done: 0, total: preview.entries.length })
    try {
      const [fournisseurs, allParams] = await Promise.all([
        db.fournisseurs.toArray(),
        db.parametres.where('season').equals(season).toArray(),
      ])
      const fByNorm = {}; fournisseurs.forEach(f => { fByNorm[norm(f.nom)] = f })
      const paramByIds = {}; allParams.forEach(p => { paramByIds[`${p.fournisseurId}_${p.magasinId}`] = p })

      let nb = 0
      for (const e of preview.entries) {
        let f = fByNorm[norm(e.fournisseur)]
        if (!f) { const id = await db.fournisseurs.add({ nom: e.fournisseur, modelesBySeason: {} }); f = { id, nom: e.fournisseur }; fByNorm[norm(e.fournisseur)] = f }

        // PHT : prix saisis (Σ prix×qté) sinon prix unitaire du modèle (params) sinon PM, × total
        let pht = e.prixTotal
        if (!pht) {
          const p = paramByIds[`${f.id}_${e.magasinId}`]
          let unit = 0
          if (p) {
            const q = p.modeles?.[e.modele], px = p.prixModeles?.[e.modele]
            if (q > 0 && px > 0) unit = px / q
            else if (p.pm) unit = p.pm
          }
          pht = unit > 0 ? Math.round(unit * e.total * 100) / 100 : 0
        } else {
          pht = Math.round(pht * 100) / 100
        }

        await db.entrees.add({
          statut: e.statut || '', magasinId: e.magasinId, fournisseurId: f.id,
          date: e.date || '', modele: e.modele, numero: e.numero || '',
          categorie: e.categorie || '', typeKey: e.typeKey || 'F',
          total: e.total, pht, sizes: e.sizes, season,
        })
        nb++
        if (nb % 10 === 0) setProgress({ done: nb, total: preview.entries.length })
      }
      setDone({ nb })
      setPreview(null)
      onSaved?.()
    } catch (err) { setError('Erreur : ' + (err.message || err)) }
    setImporting(false); setProgress(null)
  }

  const cell = { padding: '4px 8px', fontSize: 12, borderBottom: '1px solid var(--surface-3)', whiteSpace: 'nowrap' }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 820 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>📂 Importer les entrées (CSV)</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          {done ? (
            <>
              <p style={{ fontSize: 15, color: 'var(--text)' }}>✅ Import terminé : <strong>{done.nb}</strong> entrée(s) créée(s) dans la saison active.</p>
              <div className="modal-actions"><button className="btn-primary" onClick={() => { onSaved?.(); onClose?.() }}>Fermer</button></div>
            </>
          ) : (
            <>
              <p style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 0 }}>
                Une <strong>ligne par pointure</strong> (comme l'import Marques) + une colonne <strong>Date</strong>. Colonnes lues : <strong>Magasin, Marque, Code Modèle, Couleur, Taille, Quantité, Date, N°, Catégorie/Famille, Prix d'achat</strong> (optionnel), <strong>Statut</strong> (optionnel). Les lignes d'une même <strong>entrée</strong> (magasin + marque + modèle + date + N°) sont regroupées, quantités additionnées par pointure. Import dans la <strong>saison active</strong>.
              </p>
              <input type="file" accept=".csv,text/csv,text/plain" onChange={handleFile} style={{ fontSize: 13 }} />
              {error && <div className="form-error" style={{ marginTop: 10 }}>⚠️ {error}</div>}

              {preview && (
                <div style={{ marginTop: 14 }}>
                  <div style={{ fontSize: 13, marginBottom: 8 }}>
                    <strong>{preview.entries.length}</strong> entrée(s) après regroupement.
                    {preview.warnings.length > 0 && <span style={{ color: '#f59e0b' }}> ⚠️ {preview.warnings.join(' · ')}</span>}
                  </div>
                  <div style={{ maxHeight: 320, overflow: 'auto', border: '1px solid var(--border)', borderRadius: 8 }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead><tr style={{ background: 'var(--surface-2)' }}>
                        {['Marque', 'Modèle', 'Magasin', 'Date', 'N°', 'Qté', 'Pointures'].map(h => <th key={h} style={{ ...cell, fontWeight: 700, textAlign: 'left' }}>{h}</th>)}
                      </tr></thead>
                      <tbody>
                        {preview.entries.slice(0, 80).map((e, i) => (
                          <tr key={i}>
                            <td style={{ ...cell }}><strong>{e.fournisseur}</strong></td>
                            <td style={{ ...cell }}>{e.modele}</td>
                            <td style={{ ...cell }}>{e.magNom}</td>
                            <td style={{ ...cell }}>{e.date || '—'}</td>
                            <td style={{ ...cell }}>{e.numero || '—'}</td>
                            <td style={{ ...cell, textAlign: 'right' }}>{e.total}</td>
                            <td style={{ ...cell, color: 'var(--text-4)' }}>{Object.entries(e.sizes).map(([s, q]) => `${s}:${q}`).join('  ')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {preview.entries.length > 80 && <div style={{ fontSize: 11, color: 'var(--text-4)', marginTop: 4 }}>(aperçu des 80 premières)</div>}
                </div>
              )}

              <div className="modal-actions">
                <button className="btn-secondary" onClick={onClose}>Annuler</button>
                <button className="btn-primary" onClick={handleImport} disabled={!preview || importing}>
                  {importing ? `⏳ Import… ${progress ? `${progress.done}/${progress.total}` : ''}` : `Importer${preview ? ` (${preview.entries.length})` : ''}`}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
