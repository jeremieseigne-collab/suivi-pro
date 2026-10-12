import { useState, useMemo } from 'react'
import { useLiveQuery } from '../lib/useLiveQuery'
import { db } from '../db'
import { useSeason } from '../context/SeasonContext'
import { SIZE_TYPES } from '../data/sizes'
import { LoadingState } from '../components/shared'
import Icone from '../components/ui/Icone'
import { Numero } from './Reperes'
import { niveauJauge } from './commun'

const pc = (r, a) => a > 0 ? Math.round(r / a * 100) : 0

function Jauge({ p, hauteur = 6 }) {
  return <div className="barre" style={{ height: hauteur }}><i className={niveauJauge(p)} style={{ width: `${Math.min(100, p)}%` }} /></div>
}

// Détail par pointure d'un modèle : reçu / attendu ; vert = complet, bleu = partiel, gris = rien reçu (comme l'outil actuel)
function Pointures({ m }) {
  const grille = SIZE_TYPES[m.typeKey]?.sizes || []
  const toutes = new Set([...Object.keys(m.sizesAttendu || {}), ...Object.keys(m.sizesRecu || {})])
  const ordre = [...grille.filter(s => toutes.has(s)), ...[...toutes].filter(s => !grille.includes(s)).sort()]
  if (!ordre.length) return <div className="aide" style={{ padding: '4px 16px 14px 32px' }}>Aucun détail de pointure (à importer via le CSV).</div>
  return (
    <div style={{ padding: '4px 16px 14px 32px' }}>
      {m.typeKey && <div className="aide" style={{ marginBottom: 6 }}>Grille : {SIZE_TYPES[m.typeKey]?.label || m.typeKey}</div>}
      <div className="pointures" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(64px, 1fr))' }}>
        {ordre.map(s => {
          const a = Number(m.sizesAttendu?.[s]) || 0, r = Number(m.sizesRecu?.[s]) || 0
          return <div key={s} className={`pt-suivi ${a > 0 ? (r >= a ? 'ok' : r > 0 ? 'part' : 'zero') : ''}`}>{s}<small>{r} / {a || '—'}</small></div>
        })}
      </div>
      <div className="aide" style={{ marginTop: 8 }}>Reçu / attendu par pointure — vert : complet, bleu : partiel, gris : rien reçu</div>
    </div>
  )
}

export default function SuiviLivraisons({ magasinAppareil }) {
  const { season } = useSeason()
  const [magasin, setMagasin] = useState(null)        // null = magasin de l'appareil ; '' = tous les magasins
  const [recherche, setRecherche] = useState('')
  const [filtre, setFiltre] = useState('all')         // all | pending | done | zero
  const [ouverte, setOuverte] = useState(null)        // marque dépliée (clé suiviId)
  const [modeleOuvert, setModeleOuvert] = useState(null)

  // ── Même calcul que l'outil actuel ──
  const rows = useLiveQuery(async () => {
    const [params, entrees, magasins, fournisseurs] = await Promise.all([
      db.parametres.where('season').equals(season).toArray(),
      db.entrees.where('season').equals(season).toArray(),
      db.magasins.toArray(),
      db.fournisseurs.toArray(),
    ])
    const magasinMap = Object.fromEntries(magasins.map(m => [m.id, m.nom]))
    const fournisseurMap = Object.fromEntries(fournisseurs.map(f => [f.id, f.nom]))
    const recuByKey = {}, recuModelByKey = {}, numeroModelByKey = {}, recuSizesByKey = {}
    entrees.forEach(e => {
      if (e.statut === 'Retour') return // les retours ne sont pas comptabilisés dans le reçu
      const k = e.fournisseurId + '_' + e.magasinId
      recuByKey[k] = (recuByKey[k] || 0) + (e.total || 0)
      const mod = (e.modele || '').trim() || '(sans modèle)'
      ;(recuModelByKey[k] ||= {})[mod] = (recuModelByKey[k][mod] || 0) + (e.total || 0)
      ;((numeroModelByKey[k] ||= {})[mod] ||= new Set())
      if (e.numero) numeroModelByKey[k][mod].add(e.numero)
      const rs = ((recuSizesByKey[k] ||= {})[mod] ||= {})
      for (const [t, q] of Object.entries(e.sizes || {})) { const n = Number(q) || 0; if (n) rs[t] = (rs[t] || 0) + n }
    })
    return params.filter(p => p.fournisseurId && p.magasinId).map(p => {
      const key = p.fournisseurId + '_' + p.magasinId
      const recuModels = recuModelByKey[key] || {}, attenduModels = p.modeles || {}, numeroModels = numeroModelByKey[key] || {}
      const names = [...new Set([...Object.keys(attenduModels), ...Object.keys(recuModels)])]
      const modeles = names.map(nom => ({
        nom, recu: recuModels[nom] || 0, attendu: attenduModels[nom] || 0,
        numero: [...(numeroModels[nom] || [])].sort((a, b) => a - b).join(', '),
        sizesAttendu: (p.modelesSizes || {})[nom] || {}, sizesRecu: (recuSizesByKey[key] || {})[nom] || {}, typeKey: (p.modelesTypes || {})[nom] || null,
      })).sort((a, b) => (b.attendu - a.attendu) || (b.recu - a.recu) || a.nom.localeCompare(b.nom))
      return { suiviId: p.id, magasin: magasinMap[p.magasinId] || '?', marque: fournisseurMap[p.fournisseurId] || '?', recu: recuByKey[key] || 0, attendu: p.quantite || 0, modeles }
    })
  }, [season])

  const tous = useMemo(() => rows ?? [], [rows])
  const magChoisi = magasin === null ? magasinAppareil : magasin
  const magasins = useMemo(() => [...new Set(tous.map(r => r.magasin))].sort(), [tous])
  const duMagasin = tous.filter(r => !magChoisi || r.magasin === magChoisi)
  const tot = duMagasin.reduce((t, r) => ({ r: t.r + r.recu, a: t.a + r.attendu }), { r: 0, a: 0 })
  const pcG = pc(tot.r, tot.a)
  const visibles = duMagasin.filter(r => {
    const p = r.attendu > 0 ? (r.recu / r.attendu) * 100 : 0
    if (recherche && !r.marque.toLowerCase().includes(recherche.toLowerCase())) return false
    if (filtre === 'done' && p < 100) return false
    if (filtre === 'zero' && p !== 0) return false
    if (filtre === 'pending' && (p === 0 || p >= 100)) return false
    return true
  })
  const groupes = {}
  visibles.forEach(r => (groupes[r.magasin] ||= []).push(r))

  if (rows === undefined) return <LoadingState />

  const chip = (k, l) => <button className="chip" aria-pressed={filtre === k} onClick={() => setFiltre(k)}>{l}</button>
  return (
    <div>
      <div className="barre-filtres" style={{ flexWrap: 'wrap', marginBottom: 10 }}>
        <select className="champ" style={{ width: 'auto', minWidth: 200, flex: '0 1 280px' }} aria-label="Magasin"
          value={magasin === null ? '__appareil' : magasin} onChange={e => { setMagasin(e.target.value === '__appareil' ? null : e.target.value); setOuverte(null) }}>
          <option value="__appareil">{magasinAppareil} (cet appareil)</option>
          {magasins.filter(m => m !== magasinAppareil).map(m => <option key={m} value={m}>{m}</option>)}
          <option value="">Tous les magasins</option>
        </select>
        <div className="recherche" style={{ flex: '1 1 220px', margin: 0 }}>
          <Icone nom="cherche" taille={20} style={{ color: 'var(--discret)' }} />
          <input className="champ" placeholder="Rechercher une marque" value={recherche} onChange={e => setRecherche(e.target.value)} aria-label="Rechercher une marque" />
        </div>
      </div>

      <div className="carte resume-global">
        <span className={`grand pc ${niveauJauge(pcG)}`}>{pcG} %</span>
        <span style={{ flex: 1 }}><Jauge p={pcG} hauteur={8} />
          <div className="aide" style={{ marginTop: 6 }}><b>{tot.r.toLocaleString('fr-FR')}</b> paires reçues sur <b>{tot.a.toLocaleString('fr-FR')}</b> attendues{magChoisi ? '' : ' · tous les magasins'}</div></span>
      </div>
      <div className="chips" style={{ margin: '12px 0 0' }}>{chip('all', 'Toutes')}{chip('pending', 'En cours')}{chip('done', 'Complètes')}{chip('zero', 'Non reçues')}</div>

      {!tous.length && <div className="vide">Aucune donnée — renseigne la <strong>quantité commandée</strong> dans l'onglet <strong>Achats</strong> pour chaque fournisseur.</div>}
      {tous.length > 0 && !visibles.length && <div className="vide">Aucun résultat pour ce filtre.</div>}

      {Object.keys(groupes).sort().map(mag => (
        <section key={mag}>
          <h2 className="groupe-titre">{mag}</h2>
          <div className="liste">
            {groupes[mag].map(b => {
              const p = pc(b.recu, b.attendu), ouv = ouverte === b.suiviId
              return (
                <div key={b.suiviId} className="bloc-marque">
                  <button className={`ligne${b.recu === 0 ? ' faible' : ''}`} aria-expanded={ouv} onClick={() => { setOuverte(ouv ? null : b.suiviId); setModeleOuvert(null) }}>
                    <span className="txt"><span className="t1">{b.marque}</span>
                      <span className="ligne-jauge"><Jauge p={p} /><span className="t2" style={{ margin: 0 }}>{b.recu} / {b.attendu} paires · <span className={`pc ${niveauJauge(p)}`}>{p} %</span></span></span></span>
                    <Icone nom={ouv ? 'bas' : 'chevron'} taille={18} style={{ color: 'var(--discret)' }} />
                  </button>
                  {ouv && (b.modeles.length ? b.modeles.map(m => {
                    const pm = pc(m.recu, m.attendu), cle = b.suiviId + '|' + m.nom, mo = modeleOuvert === cle
                    const detail = Object.keys(m.sizesAttendu).length > 0 || Object.keys(m.sizesRecu).length > 0
                    return (
                      <div key={m.nom}>
                        <button className={`ligne${m.recu === 0 ? ' faible' : ''}`} style={{ paddingLeft: 32, minHeight: 56 }} aria-expanded={detail ? mo : undefined}
                          onClick={detail ? () => setModeleOuvert(mo ? null : cle) : undefined} disabled={!detail}>
                          <span className="txt"><span className="t1" style={{ fontWeight: 500 }}>{m.nom}<Numero n={m.numero} /></span>
                            <span className="ligne-jauge"><Jauge p={pm} hauteur={5} /><span className="t2" style={{ margin: 0 }}>{m.recu} / {m.attendu} reçues{m.recu < m.attendu ? ` · reste ${m.attendu - m.recu}` : ' · complet'}</span></span></span>
                          {detail && <Icone nom={mo ? 'bas' : 'chevron'} taille={18} style={{ color: 'var(--discret)' }} />}
                        </button>
                        {mo && <Pointures m={m} />}
                      </div>
                    )
                  }) : <div className="aide" style={{ padding: '6px 16px 14px 32px' }}>Aucun modèle renseigné pour cette marque.</div>)}
                </div>
              )
            })}
          </div>
        </section>
      ))}
    </div>
  )
}
