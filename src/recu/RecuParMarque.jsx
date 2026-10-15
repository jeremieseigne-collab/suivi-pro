import { useState, useMemo, useEffect } from 'react'
import { useLiveQuery } from '../lib/useLiveQuery'
import { db } from '../db'
import { LoadingState, fmtEur } from '../components/shared'
import Icone from '../components/ui/Icone'
import { useMagasin } from '../context/MagasinContext'
import { useCompte } from '../context/CompteContext'
import { useSeason } from '../context/SeasonContext'
import { PageShell } from '../shell/EnTete'
import { Toast } from '../cahier/Reperes'
import { commandesDeSaison, lignesDe } from '../fournisseurs/donnees'
import { suivieParCommandes, libelleSaison } from '../fournisseurs/csvPolaris'
import { nomModele } from '../fournisseurs/reception'
import { fmtJour } from '../fournisseurs/outils'
import PanneauEssai from '../shell/PanneauEssai'
import { useVariantes } from '../shell/essai'
import { POINTS_5 } from './points5'
import { mouvements, parMarque, csvRecu } from './calcul'
import '../cahier/cahier.css'
import '../savdef/savdef.css'
import '../fournisseurs/fournisseurs.css'
import './recu.css'

// Reçu par marque (plan C, étape 5) : lecture seule. Ce qui a été reçu, par marque et par magasin, pour la saison choisie.
// Comptes magasin : leur magasin, quantités seulement (décision 13). Direction : tous les magasins, montants, export CSV.
export default function RecuParMarque() {
  const { magasin: magasinAppareil } = useMagasin()
  const { estDirection } = useCompte()
  const { season: saisonCourante, seasons } = useSeason()
  const v = useVariantes(POINTS_5)
  const [saison, setSaison] = useState(saisonCourante)
  const [magasinId, setMagasinId] = useState(() => (estDirection ? '' : magasinAppareil?.id ?? ''))
  const [famille, setFamille] = useState('')
  const [rech, setRech] = useState('')
  const [ouvertes, setOuvertes] = useState(() => new Set())
  const [modeleOuvert, setModeleOuvert] = useState('')
  const [toast, setToast] = useState(null)
  const suivie = suivieParCommandes(saison)
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 5000); return () => clearTimeout(t) }, [toast])

  const donnees = useLiveQuery(async () => {
    const [entrees, commandes] = await Promise.all([db.entrees.where('season').equals(saison).toArray(), suivieParCommandes(saison) ? commandesDeSaison(saison) : []])
    // Famille d'un modèle-coloris de commande (colonne Famille du fichier), et type de la commande (saison / réassort)
    const familles = {}, typeCommande = {}
    for (const c of commandes) typeCommande[c.id] = c.type
    if (commandes.length) for (const l of await lignesDe(commandes.map(c => c.id))) familles[l.commande_id + '|' + nomModele(l.code_modele, l.couleur)] ||= l.famille || ''
    return { entrees, familles, typeCommande }
  }, [saison])
  const fournisseurs = useLiveQuery(() => db.fournisseurs.toArray(), [])
  const magasins = useLiveQuery(() => db.magasins.orderBy('nom').toArray(), [])

  const nomMarque = id => (fournisseurs || []).find(f => f.id === id)?.nom || '—'
  const nomMagasin = id => (magasins || []).find(m => m.id === id)?.nom || '—'

  const tous = useMemo(() => {
    if (!donnees) return []
    const familleDe = e => e.commandeId ? donnees.familles[e.commandeId + '|' + e.modele] || '' : (!suivie && v['r5-famille-passee']) || suivie ? (e.categorie || '') : ''
    const entrees = donnees.entrees.filter(e => v['r5-reassorts'] || !(e.statut === 'Réassort' || donnees.typeCommande[e.commandeId] === 'reassort'))
    return mouvements(entrees, { suivie, avecSansCommande: v['r5-sans-commande'], avecReassorts: v['r5-reassorts'], familleDe })
  }, [donnees, suivie, v])
  const duMagasin = useMemo(() => tous.filter(m => !magasinId || m.magasinId === Number(magasinId)), [tous, magasinId])
  const familles = useMemo(() => (suivie || v['r5-famille-passee']) ? [...new Set(duMagasin.map(m => m.famille).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'fr', { numeric: true })) : [], [duMagasin, suivie, v])
  const familleEff = familles.includes(famille) ? famille : ''
  const vus = useMemo(() => duMagasin.filter(m => !familleEff || m.famille === familleEff), [duMagasin, familleEff])
  const marques = useMemo(() => {
    const q = rech.trim().toLowerCase()
    return parMarque(vus).filter(x => !q || nomMarque(x.fournisseurId).toLowerCase().includes(q) || x.modeles.some(md => md.modele.toLowerCase().includes(q)))
      .sort((a, b) => nomMarque(a.fournisseurId).localeCompare(nomMarque(b.fournisseurId), 'fr'))
  }, [vus, rech, fournisseurs])  // eslint-disable-line react-hooks/exhaustive-deps

  if (donnees === undefined || fournisseurs === undefined || magasins === undefined) return <PageShell title="Reçu par marque" withSeason={false}><LoadingState /></PageShell>

  const tot = marques.reduce((a, x) => ({ paires: a.paires + x.paires, montant: a.montant + x.montant, receptions: a.receptions + x.receptions }), { paires: 0, montant: 0, receptions: 0 })
  const basculer = id => setOuvertes(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })
  const saisons = [...(seasons || [])].sort((a, b) => b.id.localeCompare(a.id) || 0)
    .sort((a, b) => { const k = s => { const m = /^(ETE|HIVER)_(\d{4})$/.exec(s.id); return m ? Number(m[2]) * 2 + (m[1] === 'HIVER' ? 1 : 0) : 0 }; return k(b) - k(a) })

  function exporter() {
    const ids = new Set(marques.map(x => x.fournisseurId))
    const csv = csvRecu(vus.filter(m => ids.has(m.fournisseurId)), { saison: libelleSaison(saison), nomMagasin, nomMarque })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    a.download = `recu-par-marque-${saison}${magasinId ? '-' + nomMagasin(Number(magasinId)).replace(/\s+/g, '-') : ''}${familleEff ? '-' + familleEff.replace(/\s+/g, '-') : ''}.csv`
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000)
    setToast({ texte: `Export CSV téléchargé (${marques.length} marque${marques.length > 1 ? 's' : ''})` })
  }

  return (
    <PageShell title="Reçu par marque" withSeason={false}
      rightExtra={estDirection && marques.length > 0 && <button className="btn seulement-grand" onClick={exporter}>Exporter CSV</button>}>
      {suivie && <PanneauEssai points={POINTS_5} />}
      <div className="chips recu-saisons" role="group" aria-label="Saison">
        {saisons.map(s => <button key={s.id} className="chip" aria-pressed={saison === s.id} onClick={() => { setSaison(s.id); setOuvertes(new Set()); setFamille('') }}>{libelleSaison(s.id)}</button>)}
      </div>
      {estDirection ? (
        <div className="chips recu-magasins" role="group" aria-label="Magasin">
          <button className="chip" aria-pressed={!magasinId} onClick={() => setMagasinId('')}>Tous les magasins</button>
          {magasins.map(m => <button key={m.id} className="chip" aria-pressed={Number(magasinId) === m.id} onClick={() => setMagasinId(m.id)}>{m.nom}</button>)}
        </div>
      ) : !magasinId && <div className="encart att" style={{ marginTop: 10 }}>Choisis d’abord le magasin de cet appareil (menu, en haut).</div>}
      <div className="recu-filtres">
        <div className="recherche" style={{ margin: 0 }}><Icone nom="cherche" taille={20} style={{ color: 'var(--discret)' }} />
          <input className="champ" placeholder="Marque ou modèle…" value={rech} onChange={e => setRech(e.target.value)} aria-label="Rechercher" /></div>
        {familles.length > 1 && (
          <select className="champ" value={familleEff} onChange={e => setFamille(e.target.value)} aria-label="Famille">
            <option value="">Toutes les familles</option>
            {familles.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
        )}
      </div>
      <div className="sous-info">
        {libelleSaison(saison)} · {magasinId ? nomMagasin(Number(magasinId)) : 'tous les magasins'}{familleEff ? ` · ${familleEff}` : ''} — <b>{tot.paires.toLocaleString('fr-FR')}</b> paire{tot.paires > 1 ? 's' : ''} reçue{tot.paires > 1 ? 's' : ''}, {tot.receptions} réception{tot.receptions > 1 ? 's' : ''}{estDirection ? <> · <b>{fmtEur(tot.montant)}</b> HT</> : null}
      </div>
      <div className="aide recu-repere">{suivie ? 'Saison suivie par commandes : réceptions du Cahier, avec la famille de la commande.' : 'Saison d’avant Été 2027 : reçu recalculé à partir des entrées du Cahier (rien n’est modifié).'} Les retours ne sont pas déduits.</div>

      {!marques.length ? <div className="vide">{tous.length ? 'Aucune marque ne correspond.' : 'Rien de reçu pour cette saison.'}</div> : (
        <div className="liste recu-liste">
          {marques.map(x => {
            const ouverte = ouvertes.has(x.fournisseurId)
            return (
              <div key={x.fournisseurId}>
                <button className="ligne recu-marque" aria-expanded={ouverte} onClick={() => basculer(x.fournisseurId)}>
                  <span className="txt">
                    <span className="t1">{nomMarque(x.fournisseurId)}</span>
                    <span className="t2">{x.receptions} réception{x.receptions > 1 ? 's' : ''} · dernière le {fmtJour(x.derniere)}{!magasinId && x.magasins.length > 1 ? ' · ' + x.magasins.map(m => `${nomMagasin(m.magasinId)} ${m.paires}`).join(' · ') : !magasinId ? ' · ' + nomMagasin(x.magasins[0]?.magasinId) : ''}</span>
                  </span>
                  <span className="recu-chiffre"><b>{x.paires}</b> paire{x.paires > 1 ? 's' : ''}{estDirection && <small>{fmtEur(x.montant)}</small>}</span>
                  <Icone nom={ouverte ? 'bas' : 'chevron'} taille={18} style={{ color: 'var(--discret)' }} />
                </button>
                {ouverte && (
                  <div className="recu-modeles">
                    {x.modeles.map(md => {
                      const cle = x.fournisseurId + '|' + md.modele, mo = modeleOuvert === cle
                      return (
                        <div key={cle}>
                          <button className="ligne recu-modele" aria-expanded={mo} onClick={() => setModeleOuvert(mo ? '' : cle)}>
                            <span className="txt"><span className="t1">{md.modele || 'Sans modèle'}{md.horsCommande && <span className="etat-mot att" style={{ marginLeft: 6 }}>sans commande</span>}</span>
                              {md.famille && <span className="t2">{md.famille}</span>}</span>
                            <span className="recu-chiffre"><b>{md.paires}</b>{estDirection && <small>{fmtEur(md.montant)}</small>}</span>
                          </button>
                          {mo && (
                            <div className="pointures recu-tailles">
                              {md.tailles.map(t => <div key={t.taille} className="pt-suivi ok">{t.taille || '—'}<small>{t.q}</small></div>)}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
      {estDirection && marques.length > 0 && <button className="btn seulement-petit" style={{ marginTop: 14, width: '100%' }} onClick={exporter}>Exporter CSV</button>}
      <Toast toast={toast} onFermer={() => setToast(null)} />
    </PageShell>
  )
}
