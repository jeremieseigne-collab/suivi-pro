import { useState } from 'react'
import { db } from '../db'

const norm = s => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim()

// Nombre FR : « 4 101,50 € » → 4101.5 ; « 24.56 » → 24.56 ; « 167 » → 167
function parseNum(s) {
  if (s == null) return 0
  let t = String(s).replace(/[^\d.,-]/g, '')
  if (t.includes(',')) t = t.replace(/\./g, '').replace(',', '.')
  return parseFloat(t) || 0
}

function parseCsvLine(line, sep) { return line.split(sep) }

function findCol(header, ...keys) {
  return header.findIndex(h => keys.some(k => h === k || h.includes(k)))
}

function eur(n) { return (Number(n) || 0).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }) }

export default function AchatImportModal({ season, onClose, onDone }) {
  const [rows, setRows] = useState(null)      // lignes agrégées { magNom, fournisseur, recuN1, objectifN, reelN, quantite, pm, strategie, statut, magasinId|null }
  const [fileName, setFileName] = useState('')
  const [error, setError] = useState('')
  const [importing, setImporting] = useState(false)
  const [done, setDone] = useState(null)

  async function onFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name); setError(''); setDone(null)
    try {
      const text = await file.text()
      const lines = text.split(/\r?\n/).filter(l => l.trim())
      if (lines.length < 2) { setError('Fichier vide ou sans données.'); setRows(null); return }
      const sep = (lines[0].match(/;/g) || []).length >= (lines[0].match(/,/g) || []).length ? ';' : ','
      const header = parseCsvLine(lines[0], sep).map(norm)
      const col = {
        statut:    findCol(header, 'statut'),
        magasin:   findCol(header, 'magasin', 'boutique'),
        fourn:     findCol(header, 'fournisseur', 'marque'),
        recuN1:    findCol(header, 'recu'),
        objectifN: findCol(header, 'objectif'),
        reelN:     findCol(header, 'reel'),
        quantite:  findCol(header, 'quantite', 'qte'),
        strategie: findCol(header, 'strateg'),
      }
      if (col.magasin < 0 || col.fourn < 0) { setError('Colonnes « Magasin » et « Fournisseur » obligatoires.'); setRows(null); return }

      const magasins = await db.magasins.toArray()
      const matchMag = raw => { const n = norm(raw); return magasins.find(m => { const mn = norm(m.nom); return mn === n || mn.includes(n) || n.includes(mn) }) }
      const get = (cells, i) => (i >= 0 ? (cells[i] || '').trim() : '')

      const agg = {}   // `${magasinId|?}|${fournNorm}` -> ligne agrégée
      for (let r = 1; r < lines.length; r++) {
        const cells = parseCsvLine(lines[r], sep)
        const fournisseur = get(cells, col.fourn)
        const magRaw = get(cells, col.magasin)
        if (!fournisseur || !magRaw) continue
        const mag = matchMag(magRaw)
        const key = `${mag ? mag.id : 'x:' + norm(magRaw)}|${norm(fournisseur)}`
        if (!agg[key]) agg[key] = { magNom: mag ? mag.nom : magRaw, magasinId: mag ? mag.id : null, fournisseur, recuN1: 0, objectifN: 0, reelN: 0, quantite: 0, strategie: '', statut: '' }
        const a = agg[key]
        a.recuN1    += parseNum(get(cells, col.recuN1))
        a.objectifN += parseNum(get(cells, col.objectifN))
        a.reelN     += parseNum(get(cells, col.reelN))
        a.quantite  += parseInt(String(get(cells, col.quantite)).replace(/[^\d-]/g, '')) || 0
        const strat = get(cells, col.strategie); if (strat) a.strategie = strat
        const stat  = get(cells, col.statut);    if (stat)  a.statut = stat
      }
      const list = Object.values(agg).map(a => ({ ...a, pm: a.quantite > 0 ? Math.round((a.reelN / a.quantite) * 100) / 100 : 0 }))
      list.sort((x, y) => x.fournisseur.localeCompare(y.fournisseur, 'fr') || x.magNom.localeCompare(y.magNom, 'fr'))
      setRows(list)
    } catch (err) { setError('Lecture impossible : ' + (err.message || err)); setRows(null) }
  }

  async function doImport() {
    if (!rows) return
    setImporting(true); setError('')
    try {
      const fournisseurs = await db.fournisseurs.toArray()
      const fByNorm = {}; fournisseurs.forEach(f => { fByNorm[norm(f.nom)] = f })
      let nb = 0, ignored = 0
      for (const a of rows) {
        if (!a.magasinId) { ignored++; continue }   // magasin non reconnu
        let f = fByNorm[norm(a.fournisseur)]
        if (!f) { const id = await db.fournisseurs.add({ nom: a.fournisseur, modelesBySeason: {} }); f = { id, nom: a.fournisseur }; fByNorm[norm(a.fournisseur)] = f }
        const fields = { statut: a.statut, recuN1: a.recuN1, objectifN: a.objectifN, reelN: a.reelN, quantite: a.quantite, pm: a.pm, strategie: a.strategie }
        const existing = await db.parametres.where({ fournisseurId: f.id, magasinId: a.magasinId }).filter(p => p.season === season).first()
        if (existing) await db.parametres.update(existing.id, fields)
        else          await db.parametres.add({ fournisseurId: f.id, magasinId: a.magasinId, season, ...fields })
        nb++
      }
      setDone({ nb, ignored })
    } catch (err) { setError('Erreur : ' + (err.message || err)) }
    setImporting(false)
  }

  const cell = { padding: '4px 8px', fontSize: 12, borderBottom: '1px solid var(--surface-3)', whiteSpace: 'nowrap' }
  const unmatched = rows ? rows.filter(r => !r.magasinId) : []

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 820 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>📂 Importer les achats (CSV)</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          {done ? (
            <>
              <p style={{ fontSize: 15, color: 'var(--text)' }}>
                ✅ Import terminé : <strong>{done.nb}</strong> ligne(s) marque × magasin enregistrée(s) dans la saison active.
              </p>
              {done.ignored > 0 && <p style={{ fontSize: 13, color: '#f59e0b' }}>⚠️ {done.ignored} ligne(s) ignorée(s) (magasin non reconnu).</p>}
              <div className="modal-actions"><button className="btn-primary" onClick={() => { onDone?.(); onClose?.() }}>Fermer</button></div>
            </>
          ) : (
            <>
              <p style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 0 }}>
                Colonnes lues (par nom, séparateur <code>;</code> ou <code>,</code>) : <strong>Magasin, Fournisseur, Reçu N-1, Objectif N, Réel achat N, Quantité, Stratégie</strong> (+ Statut). Les lignes d'une même <strong>marque × magasin</strong> sont <strong>additionnées</strong>, le PM est recalculé. Import dans la <strong>saison active</strong>.
              </p>
              <input type="file" accept=".csv,text/csv,text/plain" onChange={onFile} style={{ fontSize: 13 }} />
              {fileName && <div style={{ fontSize: 12, color: 'var(--text-4)', marginTop: 4 }}>Fichier : {fileName}</div>}
              {error && <div className="form-error" style={{ marginTop: 10 }}>⚠️ {error}</div>}

              {rows && (
                <div style={{ marginTop: 14 }}>
                  <div style={{ fontSize: 13, marginBottom: 8 }}>
                    <strong>{rows.length}</strong> ligne(s) marque × magasin après regroupement.
                    {unmatched.length > 0 && <span style={{ color: '#f59e0b' }}> ⚠️ {unmatched.length} avec magasin non reconnu (seront ignorées) : {[...new Set(unmatched.map(u => u.magNom))].join(', ')}.</span>}
                  </div>
                  <div style={{ maxHeight: 320, overflow: 'auto', border: '1px solid var(--border)', borderRadius: 8 }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead><tr style={{ background: 'var(--surface-2)' }}>
                        <th style={{ ...cell, fontWeight: 700, textAlign: 'left' }}>Fournisseur</th>
                        <th style={{ ...cell, fontWeight: 700, textAlign: 'left' }}>Magasin</th>
                        <th style={{ ...cell, fontWeight: 700, textAlign: 'right' }}>Reçu N-1</th>
                        <th style={{ ...cell, fontWeight: 700, textAlign: 'right' }}>Objectif</th>
                        <th style={{ ...cell, fontWeight: 700, textAlign: 'right' }}>Réel</th>
                        <th style={{ ...cell, fontWeight: 700, textAlign: 'right' }}>Qté</th>
                        <th style={{ ...cell, fontWeight: 700, textAlign: 'right' }}>PM</th>
                        <th style={{ ...cell, fontWeight: 700, textAlign: 'left' }}>Stratégie</th>
                      </tr></thead>
                      <tbody>
                        {rows.map((r, i) => (
                          <tr key={i} style={{ opacity: r.magasinId ? 1 : 0.5 }}>
                            <td style={{ ...cell, textAlign: 'left' }}><strong>{r.fournisseur}</strong></td>
                            <td style={{ ...cell, textAlign: 'left', color: r.magasinId ? 'var(--text-2)' : '#dc2626' }}>{r.magNom}{r.magasinId ? '' : ' ❌'}</td>
                            <td style={{ ...cell, textAlign: 'right' }}>{eur(r.recuN1)}</td>
                            <td style={{ ...cell, textAlign: 'right' }}>{eur(r.objectifN)}</td>
                            <td style={{ ...cell, textAlign: 'right' }}>{eur(r.reelN)}</td>
                            <td style={{ ...cell, textAlign: 'right' }}>{r.quantite}</td>
                            <td style={{ ...cell, textAlign: 'right' }}>{r.pm ? r.pm.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 }) : '—'}</td>
                            <td style={{ ...cell, textAlign: 'left' }}>{r.strategie || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="modal-actions">
                <button className="btn-secondary" onClick={onClose}>Annuler</button>
                <button className="btn-primary" onClick={doImport} disabled={!rows || importing}>
                  {importing ? '⏳ Import…' : `Importer${rows ? ` (${rows.filter(r => r.magasinId).length})` : ''}`}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
