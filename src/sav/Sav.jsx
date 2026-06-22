import { useState, useMemo, useEffect } from 'react'
import { useLiveQuery } from '../lib/useLiveQuery'
import { db } from '../db'
import { buildSavRetourMailUrl } from './mail'
import { getSociete } from '../data/societes'
import SavModal from './SavModal'
import StoreSelect from '../components/StoreSelect'
import { fmtTel } from '../components/shared'

function fmtDate(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  return isNaN(d) ? '—' : d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

function FormeTimer({ enCoursAt }) {
  const MAX = 48 * 3600
  const [secs, setSecs] = useState(() =>
    enCoursAt ? Math.floor((Date.now() - new Date(enCoursAt).getTime()) / 1000) : 0
  )

  useEffect(() => {
    if (!enCoursAt) return
    const start = new Date(enCoursAt).getTime()
    function tick() { setSecs(Math.floor((Date.now() - start) / 1000)) }
    tick()
    const id = setInterval(tick, 30000)
    return () => clearInterval(id)
  }, [enCoursAt])

  // À 48h, la paire reste sur la machine (occupe une place) jusqu'à clôture du dossier.
  if (secs >= MAX) return (
    <div style={{ margin: '8px 0 2px', textAlign: 'center' }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: '#10b981' }}>✓ Prête à récupérer</div>
      <div style={{ fontSize: 10, color: 'var(--text-4)' }}>48h écoulées · encore sur la machine</div>
    </div>
  )

  const h = Math.floor(secs / 3600)
  const m = String(Math.floor((secs % 3600) / 60)).padStart(2, '0')
  const pct = Math.min(secs / MAX * 100, 100)
  const color = pct >= 90 ? '#ef4444' : pct >= 60 ? '#f59e0b' : '#3b82f6'

  return (
    <div style={{ margin: '8px 0 2px', textAlign: 'center' }}>
      <div style={{ fontSize: 14, fontWeight: 700, color, letterSpacing: -0.5 }}>
        {'⏱'} {h}h{m}
      </div>
      <div style={{ margin: '4px 0 2px', height: 3, borderRadius: 2, background: 'var(--border)', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 2, transition: 'width 30s linear' }} />
      </div>
      <div style={{ fontSize: 10, color: 'var(--text-4)' }}>{Math.round(pct)}% des 48h</div>
    </div>
  )
}

function noteStamp() {
  const d = new Date()
  const p = n => String(n).padStart(2, '0')
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${String(d.getFullYear()).slice(-2)} ${p(d.getHours())}h${p(d.getMinutes())}`
}

// Bloc note façon journal : une nouvelle entrée (ligne du bas) est horodatée à la validation.
// Chaque ligne existante est modifiable au clic. Entrée valide (sans passer à la ligne) ;
// pour ajouter une ligne, on clique sur la ligne vide du dessous.
function InlineNote({ row }) {
  const field = row.type === 'forme' ? 'note' : 'probleme'
  const current = row[field] || ''
  const closed = row.statut === 'Clôturé'
  const lines = current ? current.split('\n') : []
  const [editIdx, setEditIdx] = useState(null)
  const [editDraft, setEditDraft] = useState('')
  const [draft, setDraft] = useState('')

  async function addEntry() {
    const text = draft.trim()
    if (!text) return
    const line = `${noteStamp()} - ${text}`
    const next = current ? `${current}\n${line}` : line
    setDraft('')
    try { await db.sav.update(row.id, { [field]: next }) } catch { /* ignore */ }
  }

  async function saveLine(i) {
    const text = editDraft.trim()
    const next = [...lines]
    if (text) next[i] = text
    else next.splice(i, 1)
    setEditIdx(null); setEditDraft('')
    try { await db.sav.update(row.id, { [field]: next.join('\n') }) } catch { /* ignore */ }
  }

  const lineStyle = { fontSize: 12.5, color: 'var(--text)', padding: '5px 4px', borderBottom: '1px solid var(--border)', whiteSpace: 'pre-wrap', textAlign: 'left', lineHeight: 1.35 }
  const inputStyle = { width: '100%', boxSizing: 'border-box', border: 'none', background: 'transparent', fontSize: 12.5, fontFamily: 'inherit', padding: '5px 4px', outline: 'none', color: 'var(--text)' }

  // Dossier clôturé : journal en lecture seule (modification via l'icône ✏️ uniquement).
  if (closed) {
    return (
      <div style={{ width: '100%' }}>
        {lines.length
          ? lines.map((l, i) => <div key={i} style={lineStyle}>{l}</div>)
          : <div style={{ ...lineStyle, color: 'var(--text-4)' }}>📝 Aucune note</div>}
      </div>
    )
  }

  return (
    <div onClick={e => e.stopPropagation()} style={{ width: '100%' }}>
      {lines.map((l, i) => (
        editIdx === i ? (
          <input key={i} autoFocus value={editDraft}
            onChange={e => setEditDraft(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') { e.preventDefault(); saveLine(i) }
              else if (e.key === 'Escape') { setEditIdx(null); setEditDraft('') }
            }}
            onBlur={() => saveLine(i)}
            style={{ ...inputStyle, borderBottom: '1px solid var(--accent)' }} />
        ) : (
          <div key={i} onClick={() => { setEditIdx(i); setEditDraft(l) }} title="Cliquer pour modifier cette ligne"
            style={{ ...lineStyle, cursor: 'text' }}>{l}</div>
        )
      ))}
      <input
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter') { e.preventDefault(); addEntry() }
          else if (e.key === 'Escape') setDraft('')
        }}
        onBlur={() => { if (draft.trim()) addEntry() }}
        placeholder="Ajouter une note (Entrée pour valider)…"
        style={{ ...inputStyle, borderBottom: '1px dashed var(--border)' }}
      />
    </div>
  )
}

function SavCard({ row, onCloturer, onTerminer }) {
  const [hover, setHover] = useState(false)
  const isRetour = row.type === 'retour'
  const closed = row.statut === 'Clôturé'
  const forme = row.type === 'forme'
  const formeSurMachine = forme && !!row.enCoursAt && !closed
  const formeTermine    = forme && !row.enCoursAt && row.statut === 'Terminé' && !closed
  const formeEnAttente  = forme && !row.enCoursAt && (row.statut || '') === '' && !closed
  const dim = closed ? { filter: 'grayscale(1)', opacity: 0.5 } : null
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: closed ? 'var(--surface-3)' : 'var(--surface)',
        border: `1px solid ${hover ? 'var(--accent)' : 'var(--border)'}`,
        borderRadius: 12, padding: '14px 18px', cursor: 'default',
        boxShadow: hover ? '0 4px 16px rgba(59,130,246,0.12)' : '0 1px 4px var(--shadow)',
        transition: 'all 0.15s ease',
      }}>
      {/* Colonne d'infos (gauche) · note centrée verticalement contre tout le bloc · espace symétrique (droite) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {/* Colonne gauche : toutes les infos empilées */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Ligne 1 : badge type (+ facturation) puis statut en texte simple */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
            <span style={{
              fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
              background: closed ? 'var(--surface-2)' : isRetour ? '#fef3c7' : row.type === 'reparation' ? '#ecfdf5' : '#dbeafe',
              color: closed ? 'var(--text-4)' : isRetour ? '#92400e' : row.type === 'reparation' ? '#065f46' : '#1e40af',
              ...dim,
            }}>
              {isRetour ? '🔄 Retour' : row.type === 'reparation' ? '🧵 Réparation' : '👟 Forme'}
            </span>
            {row.type === 'reparation' && row.facturation && (
              <span style={{
                fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
                background: closed ? 'var(--surface-2)' : row.facturation === 'offert' ? '#ecfdf5' : '#fffbeb',
                color: closed ? 'var(--text-4)' : row.facturation === 'offert' ? '#065f46' : '#92400e',
                ...dim,
              }}>
                {row.facturation === 'offert' ? '🎁 Offert' : (row.prixReparation ? `💰 ${Number(row.prixReparation).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}` : '💰 Payant')}
              </span>
            )}
            {row.type !== 'forme' && <span style={{ fontSize: 13, fontWeight: closed ? 700 : 600, color: closed ? '#10b981' : 'var(--text-3)' }}>{row.statut}</span>}
          </div>

          {/* Client */}
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap', marginBottom: 2, ...dim }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: closed ? 'var(--text-3)' : 'var(--text)' }}>{row.clientNom || '—'}</span>
            {row.clientTel && <span style={{ fontSize: 12, color: 'var(--text-4)' }}>{fmtTel(row.clientTel)}</span>}
          </div>

          {/* Article */}
          <div style={{ fontSize: 13, color: closed ? 'var(--text-4)' : 'var(--text-2)', marginBottom: 20, ...dim }}>
            {row.type === 'forme'
              ? [row.marque, row.modele, row.pointure].filter(Boolean).join(' — ')
              : [row.marqueNom, row.modele, row.pointure].filter(Boolean).join(' — ')}
          </div>

          {/* Méta */}
          <div style={{ fontSize: 12, color: 'var(--text-4)', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', ...dim }}>
            {row.magasinNom && <span>📍 {row.magasinNom}</span>}
            {row.salarie    && <span>👤 {row.salarie}</span>}
            <span>🗓 {fmtDate(row.createdAt)}</span>
          </div>
        </div>

        {/* Note, centrée par rapport à toute la colonne gauche */}
        <div style={{ flex: '0 1 420px', minWidth: 0, ...dim }}>
          <InlineNote row={row} />
        </div>
        {/* Bouton Clôturer (à droite de la note) */}
        <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-start' }}>
          {!closed && (
            <button onClick={e => { e.stopPropagation(); onCloturer?.(row) }}
              title="Clôturer le dossier"
              style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid #10b981', background: '#ecfdf5', color: '#065f46', fontWeight: 600, fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap' }}>
              ✓ Clôturer le dossier
            </button>
          )}
        </div>
      </div>

      {formeSurMachine && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, margin: '8px 0 2px' }}>
          <FormeTimer enCoursAt={row.enCoursAt} />
          <button onClick={e => { e.stopPropagation(); onTerminer?.(row) }}
            title="Retirer la paire de la machine (fin du minuteur)"
            style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #3b82f6', background: '#eff6ff', color: '#1e40af', fontWeight: 600, fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap' }}>
            ✓ Terminer
          </button>
        </div>
      )}
      {formeTermine && (
        <div style={{ margin: '8px 0 2px', textAlign: 'center', fontSize: 12, fontWeight: 600, color: 'var(--text-3)' }}>
          ✓ Mise à la forme terminée (hors machine)
        </div>
      )}
      {formeEnAttente && (
        <div style={{ margin: '8px 0 2px', textAlign: 'center', fontSize: 12, fontWeight: 600, color: '#f59e0b' }}>
          ⏳ En attente — machine occupée
        </div>
      )}
    </div>
  )
}

export default function Sav({ onHome }) {
  const [showModal, setShowModal]   = useState(false)
  const [editSav,   setEditSav]     = useState(null)
  const [filterType, setFilterType] = useState('') // '' | 'retour' | 'forme'
  const [search, setSearch] = useState('')
  const [confirmDel, setConfirmDel] = useState(null)
  const [magasin, setMagasin] = useState(() => {
    try { return JSON.parse(localStorage.getItem('sav_magasin') || 'null') } catch { return null }
  })

  function selectMagasin(m) { localStorage.setItem('sav_magasin', JSON.stringify(m)); setMagasin(m) }
  function changeMagasin() { localStorage.removeItem('sav_magasin'); setMagasin(null) }

  const data = useLiveQuery(async () => {
    const [savs, magasins, fournisseurs] = await Promise.all([
      db.sav.toArray(), db.magasins.toArray(), db.fournisseurs.toArray(),
    ])
    const magMap  = Object.fromEntries(magasins.map(m => [m.id, m.nom]))
    const fourMap = Object.fromEntries(fournisseurs.map(f => [f.id, f.nom]))
    savs.sort((a, b) => b.id - a.id)
    const fourObjMap = Object.fromEntries(fournisseurs.map(f => [f.id, f]))
    return { savs: savs.map(s => ({
      ...s,
      magasinNom: magMap[s.magasinId] || '—',
      marqueNom: fourMap[s.fournisseurId] || '',
      fournisseurEmail: fourObjMap[s.fournisseurId]?.email || '',
      fournisseurNumeroClient: fourObjMap[s.fournisseurId]?.numeroClient || '',
    })), magasins }
  }, [])

  const rows    = data?.savs    ?? []

  const magRows = useMemo(() => magasin ? rows.filter(r => r.magasinId === magasin.id) : rows, [rows, magasin])

  const filtered = useMemo(() => magRows.filter(r => {
    if (filterType && r.type !== filterType) return false
    if (search) {
      const q = search.toLowerCase()
      const hay = [r.clientNom, r.clientTel, r.marqueNom, r.marque, r.modele, r.pointure, r.salarie, r.probleme, r.note].map(v => (v || '').toLowerCase()).join(' ')
      if (!hay.includes(q)) return false
    }
    return true
  }), [magRows, filterType, search])

  const enCours = magRows.filter(r => r.statut !== 'Clôturé' && r.statut !== 'Récupéré').length

  async function handleDelete(id) {
    try { await db.sav.delete(id) } catch (e) { alert('Erreur : ' + e.message) } finally { setConfirmDel(null) }
  }

  function refresh() { setShowModal(false); setEditSav(null) }

  function openEdit(row) {
    if (row.statut === 'Clôturé' && !window.confirm('Ce dossier est clôturé. Souhaitez-vous vraiment le modifier ?')) return
    setEditSav(row)
  }

  // Mise à la forme : si la machine est libre, démarre le minuteur du plus ancien dossier EN ATTENTE.
  // (En attente = jamais lancé : statut vide et pas de minuteur. « Terminé » et « Clôturé » sont exclus.)
  async function promoteWaiting(magasinId, excludeId) {
    const all = await db.sav.toArray()
    const surMachine = all.filter(s => s.type === 'forme' && s.magasinId === magasinId && s.id !== excludeId && s.enCoursAt && s.statut !== 'Clôturé')
    if (surMachine.length >= 1) return
    const enAttente = all
      .filter(s => s.type === 'forme' && s.magasinId === magasinId && s.id !== excludeId && !s.enCoursAt && (s.statut || '') === '')
      .sort((a, b) => a.id - b.id)
    if (enAttente[0]) await db.sav.update(enAttente[0].id, { enCoursAt: new Date().toISOString() })
  }

  // Termine le minuteur d'une mise à la forme (paire retirée de la machine) sans clôturer le dossier.
  async function terminerForme(row) {
    try {
      await db.sav.update(row.id, { statut: 'Terminé', enCoursAt: null })
      await promoteWaiting(row.magasinId, row.id)
    } catch (e) { alert('Erreur : ' + e.message) }
  }

  // Clôture un dossier. Pour une mise à la forme, met fin au minuteur et libère la machine.
  async function cloturer(row) {
    try {
      await db.sav.update(row.id, { statut: 'Clôturé', enCoursAt: null })
      if (row.type === 'forme') await promoteWaiting(row.magasinId, row.id)
    } catch (e) { alert('Erreur : ' + e.message) }
  }

  if (!magasin) return <StoreSelect onSelect={selectMagasin} onHome={onHome}
    theme={{ accent: '#0891b2', border: '#67e8f9', shadow: 'rgba(8,145,178,0.18)', gradient: 'linear-gradient(135deg, #0891b2, #0e7490)', icon: '🔧' }} />

  return (
    <div className="app">
      {showModal && <SavModal onClose={() => setShowModal(false)} onSaved={refresh} defaultMagasinId={magasin?.id} currentMagasin={magasin?.nom} />}
      {editSav   && <SavModal sav={editSav} onClose={() => setEditSav(null)} onSaved={refresh} defaultMagasinId={magasin?.id} currentMagasin={magasin?.nom} />}

      <header className="app-header">
        <div className="header-top" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button onClick={onHome} title="Retour"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 34, height: 34, borderRadius: 9, border: '1px solid var(--border)', background: 'var(--surface)', cursor: 'pointer', fontSize: 17, color: 'var(--text-2)', lineHeight: 1 }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface-2)'; e.currentTarget.style.color = 'var(--accent)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'var(--surface)'; e.currentTarget.style.color = 'var(--text-2)' }}>←</button>
            <h1>🔧 SAV</h1>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button onClick={changeMagasin}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 20, border: '2px solid #67e8f9', background: '#ecfeff', color: '#0891b2', fontWeight: 700, fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap' }}>
              🏪 {magasin.nom} &#9662;
            </button>
            <button className="btn-primary" onClick={() => setShowModal(true)}>+ Nouveau dossier</button>
          </div>
        </div>
        <div style={{ height: 12 }} />
      </header>

      <main className="app-main">
        {/* Stats */}
        <div className="tab-stats" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: 16 }}>
          <div className="stat-card"><span className="stat-value">{magRows.length}</span><span className="stat-label">Dossiers</span></div>
          <div className="stat-card"><span className="stat-value">{enCours}</span><span className="stat-label">En cours</span></div>
          <div className="stat-card">
            <span className="stat-value">{magRows.filter(r => r.type === 'retour').length}</span>
            <span className="stat-label">Retours</span>
          </div>
        </div>

        {/* Filtres */}
        <div className="controls" style={{ flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
          <input type="text" placeholder="🔍 Client, marque, modèle, salarié…" value={search} onChange={e => setSearch(e.target.value)} className="search-input" />
          <div style={{ display: 'flex', gap: 6 }}>
            {[{ v: '', label: 'Tous' }, { v: 'retour', label: 'Retours' }, { v: 'forme', label: 'Forme' }, { v: 'reparation', label: 'Réparation' }].map(({ v, label }) => (
              <button key={v} onClick={() => setFilterType(v)}
                style={{
                  padding: '6px 14px', borderRadius: 20, border: `1px solid ${filterType === v ? 'var(--accent)' : 'var(--border)'}`,
                  background: filterType === v ? 'var(--accent-bg)' : 'var(--surface)',
                  color: filterType === v ? 'var(--accent)' : 'var(--text-3)',
                  cursor: 'pointer', fontSize: 13, fontWeight: filterType === v ? 700 : 400,
                }}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Liste */}
        {data === undefined ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-4)' }}>Chargement…</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 48, color: 'var(--text-4)' }}>
            {magRows.length === 0 ? 'Aucun dossier SAV — cliquez sur « + Nouveau dossier ».' : 'Aucun résultat pour ces filtres.'}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filtered.map(row => (
              <div key={row.id} style={{ position: 'relative' }}>
                <SavCard row={row} onCloturer={cloturer} onTerminer={terminerForme} />
                {confirmDel === row.id ? (
                  <div style={{ position: 'absolute', top: 10, right: 10, display: 'flex', gap: 4, background: 'var(--surface)', padding: 6, borderRadius: 8, border: '1px solid var(--border)', boxShadow: '0 4px 12px var(--shadow)' }}>
                    <button onClick={e => { e.stopPropagation(); handleDelete(row.id) }}
                      style={{ padding: '3px 10px', borderRadius: 6, border: 'none', background: '#dc2626', color: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                      Supprimer
                    </button>
                    <button onClick={e => { e.stopPropagation(); setConfirmDel(null) }}
                      style={{ padding: '3px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-3)', cursor: 'pointer', fontSize: 12 }}>
                      Annuler
                    </button>
                  </div>
                ) : (
                  <div style={{ position: 'absolute', top: 10, right: 10, display: 'flex', gap: 4 }}>
                    {(row.type === 'retour' || row.type === 'reparation') && (
                      <button onClick={async e => {
                        e.stopPropagation()
                        const url = buildSavRetourMailUrl({
                          modele: row.modele, pointure: row.pointure, probleme: row.probleme,
                          salarie: row.salarie, societe: getSociete(row.magasinNom),
                          email: row.fournisseurEmail, numeroClient: row.fournisseurNumeroClient,
                        })
                        window.open(url, '_blank')
                        if (!['Mail marque envoyé', 'Réponse reçue', 'Clôturé'].includes(row.statut)) {
                          await db.sav.update(row.id, { statut: 'Mail marque envoyé' })
                          if (row.defectueuxId) {
                            const def = await db.defectueux.get(row.defectueuxId)
                            if (def && def.statut !== 'Mail envoyé' && !['Avoir reçu', 'Clôturé', 'Refusé'].includes(def.statut))
                              await db.defectueux.update(row.defectueuxId, { statut: 'Mail envoyé' })
                          }
                        }
                      }}
                        style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-4)', cursor: 'pointer', fontSize: 13, opacity: 0.7 }}
                        title="Envoyer mail marque">✉️</button>
                    )}
                    <button onClick={e => { e.stopPropagation(); openEdit(row) }}
                      style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-4)', cursor: 'pointer', fontSize: 13, opacity: 0.7 }}
                      title="Modifier">✏️</button>
                    <button onClick={e => { e.stopPropagation(); setConfirmDel(row.id) }}
                      style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-4)', cursor: 'pointer', fontSize: 13, opacity: 0.7 }}
                      title="Supprimer">🗑</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
