import { useState } from 'react'
import { db } from '../db'
import { resteParPointure, sortSizes, todayFr } from './constants'

// Réception (totale ou partielle) d'un réassort → crée l'entrée dans le Cahier des entrées
export default function ReceptionModal({ top, reassort, magasinNom, onClose }) {
  const reste = resteParPointure(reassort)
  const sizes = sortSizes(Object.keys(reste))
  const [qtes,  setQtes]  = useState(() => Object.fromEntries(sizes.map(s => [s, String(reste[s])])))
  const [majStock, setMajStock] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')
  const [done,   setDone]   = useState(null) // { total, partiel }

  const total = Object.values(qtes).reduce((s, v) => s + (parseInt(v) || 0), 0)

  async function handleValidate() {
    if (!total) { setError('Aucune quantité reçue'); return }
    setSaving(true); setError('')
    try {
      const recuNow = {}
      Object.entries(qtes).forEach(([s, v]) => { const q = parseInt(v) || 0; if (q > 0) recuNow[s] = q })

      // Prix unitaire HT du modèle (paramètres magasin × saison) → PHT de l'entrée
      const param = await db.parametres.where({ fournisseurId: reassort.fournisseurId, magasinId: reassort.magasinId })
        .filter(p => p.season === reassort.season).first()
      const q = param?.modeles?.[reassort.modele], px = param?.prixModeles?.[reassort.modele]
      const unit = q > 0 && px > 0 ? px / q : 0
      const pht = Math.round(unit * total * 100) / 100

      const entreeId = await db.entrees.add({
        statut: 'Réassort', magasinId: reassort.magasinId, fournisseurId: reassort.fournisseurId,
        date: todayFr(), modele: reassort.modele, numero: top?.numero || '', categorie: top?.categorie || '',
        typeKey: top?.typeKey || 'F', total, pht, sizes: recuNow, season: reassort.season,
      })

      const recu = { ...(reassort.recu || {}) }
      Object.entries(recuNow).forEach(([s, n]) => { recu[s] = (recu[s] || 0) + n })
      const complet = Object.entries(reassort.sizes || {}).every(([s, n]) => (recu[s] || 0) >= n)
      const now = new Date().toISOString()
      const etapes = { ...(reassort.etapes || {}) }
      if (!etapes['En route']) etapes['En route'] = now
      if (complet) etapes['Reçu'] = now

      await db.reassorts.update(reassort.id, {
        recu, etapes, statut: complet ? 'Reçu' : 'En route',
        receptions: [...(reassort.receptions || []), { date: now, sizes: recuNow, entreeId }],
      })

      if (majStock && top?.id) {
        const stock = { ...(top.stock || {}) }
        Object.entries(recuNow).forEach(([s, n]) => { stock[s] = (Number(stock[s]) || 0) + n })
        await db.topModeles.update(top.id, { stock, stockAt: now })
      }
      setDone({ total, partiel: !complet, sansPrix: !unit })
    } catch (e) {
      setError('Erreur : ' + (e.message || e)); setSaving(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 560 }}>
        <div className="modal-header">
          <h2>{done ? '✅ Réassort reçu' : `📦 Réception — ${reassort.modele}`}</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        {done ? (
          <div className="modal-body">
            <p style={{ fontSize: 15, color: 'var(--text)' }}>
              <strong>{done.total}</strong> paire{done.total > 1 ? 's' : ''} ajoutée{done.total > 1 ? 's' : ''} au <strong>Cahier des entrées</strong> de {magasinNom}.
            </p>
            {done.partiel && <p style={{ fontSize: 14, color: '#c2410c' }}>Réception partielle : le reste est toujours « En route ».</p>}
            {done.sansPrix && <p style={{ fontSize: 13, color: '#f59e0b' }}>⚠️ Pas de prix pour ce modèle dans les Paramètres : le PHT de l'entrée est à 0.</p>}
            <div className="modal-actions">
              <button className="btn-primary" onClick={onClose}>OK</button>
            </div>
          </div>
        ) : (
          <div className="modal-body">
            <p style={{ fontSize: 14, color: 'var(--text-2)', margin: 0 }}>
              Vérifie les quantités réellement reçues. S'il manque des paires, le reste restera « En route ».
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {sizes.map(s => (
                <div key={s} style={{ width: 64, borderRadius: 8, overflow: 'hidden', textAlign: 'center', border: '1px solid var(--border)' }}>
                  <div style={{ padding: '3px 0', fontSize: 12, fontWeight: 700, background: 'var(--surface-2)', color: 'var(--text-2)' }}>{s}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-4)', padding: '2px 0' }}>attendu {reste[s]}</div>
                  <input type="number" min="0" max={reste[s]} inputMode="numeric" value={qtes[s]}
                    onChange={e => setQtes(q => ({ ...q, [s]: e.target.value }))}
                    style={{ width: '100%', border: 'none', borderTop: '1px solid var(--border)', textAlign: 'center', fontSize: 15, fontWeight: 700, padding: '5px 0', background: 'var(--surface)', color: 'var(--text)', outline: 'none' }} />
                </div>
              ))}
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-3)' }}>Total reçu : <strong style={{ color: 'var(--text)' }}>{total}</strong></div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: 'var(--text-2)', cursor: 'pointer' }}>
              <input type="checkbox" checked={majStock} onChange={e => setMajStock(e.target.checked)} />
              Ajouter ces paires au stock du top modèle
            </label>
            {error && <div className="form-error">⚠️ {error}</div>}
            <div className="modal-actions">
              <button className="btn-secondary" onClick={onClose}>Annuler</button>
              <button className="btn-primary" onClick={handleValidate} disabled={saving}>
                {saving ? '⏳ Enregistrement…' : '📦 Valider la réception'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
