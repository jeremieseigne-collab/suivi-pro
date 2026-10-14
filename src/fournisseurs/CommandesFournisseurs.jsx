import { useState, useMemo, useEffect } from 'react'
import { useLiveQuery } from '../lib/useLiveQuery'
import { db } from '../db'
import { LoadingState, fmtEur } from '../components/shared'
import Icone from '../components/ui/Icone'
import { useMagasin } from '../context/MagasinContext'
import { useCompte } from '../context/CompteContext'
import { useSeason } from '../context/SeasonContext'
import { useMediaQuery, TABLET } from '../lib/useMediaQuery'
import { PageShell } from '../shell/EnTete'
import PanneauEssai from '../shell/PanneauEssai'
import { useVariantes } from '../shell/essai'
import { Toast } from '../cahier/Reperes'
import { POINTS_FOURNISSEURS } from './points'
import { commandesDeSaison, lignesDe } from './donnees'
import { suivieParCommandes, libelleSaison, forme } from './csvPolaris'
import { Jauge, StatutCommande } from './commun'
import { fmtJour, enRetard } from './outils'
import FicheCommande from './FicheCommande'
import { FenetreImport, FenetreReimport } from './ImportCommande'
import '../cahier/cahier.css'
import '../savdef/savdef.css'
import './fournisseurs.css'

// Commandes fournisseurs (plan C, étape 2) : lecture des commandes importées, import et réimport par la Direction.
// Comptes magasin : même écran, quantités seulement (prix et montants masqués à l'écran, décision 9).
export default function CommandesFournisseurs() {
  const { magasin: magasinAppareil } = useMagasin()
  const { estDirection } = useCompte()
  const { season, seasons, setSeason, addSeason } = useSeason()
  const grand = !useMediaQuery(TABLET)
  const v = useVariantes(POINTS_FOURNISSEURS)
  const [magasinId, setMagasinId] = useState(() => (estDirection ? '' : magasinAppareil?.id ?? ''))
  const [filtre, setFiltre] = useState('tous')        // tous | recevoir | partielles | soldees | retard | hors
  const [rech, setRech] = useState('')
  const [ficheId, setFicheId] = useState(null)
  const [importer, setImporter] = useState(false)
  const [reimport, setReimport] = useState(null)
  const [toast, setToast] = useState(null)
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 6000); return () => clearTimeout(t) }, [toast])

  const donnees = useLiveQuery(async () => {
    const commandes = await commandesDeSaison(season)
    return { commandes, lignes: commandes.length ? await lignesDe(commandes.map(c => c.id)) : [] }
  }, [season])
  const fournisseurs = useLiveQuery(() => db.fournisseurs.orderBy('nom').toArray(), [])
  const magasins = useLiveQuery(() => db.magasins.orderBy('nom').toArray(), [])

  const nomMarque = id => (fournisseurs || []).find(f => f.id === id)?.nom || '—'
  const nomMagasin = id => (magasins || []).find(m => m.id === id)?.nom || '—'
  const lignesPar = useMemo(() => {
    const g = {}; for (const l of donnees?.lignes || []) (g[l.commande_id] ||= []).push(l); return g
  }, [donnees])

  const duMagasin = useMemo(() => (donnees?.commandes || []).filter(c => !magasinId || c.magasin_id === Number(magasinId)), [donnees, magasinId])
  const retards = duMagasin.filter(enRetard)
  const visibles = useMemo(() => {
    const q = forme(rech)
    return duMagasin.filter(c => {
      if (filtre === 'recevoir' && !(c.qte_recue === 0 && c.reste > 0)) return false
      if (filtre === 'partielles' && !(c.qte_recue > 0 && c.reste > 0)) return false
      if (filtre === 'soldees' && c.reste > 0) return false
      if (filtre === 'retard' && !enRetard(c)) return false
      if (filtre === 'hors' && !(c.lignes_hors_commande > 0)) return false
      if (q) {
        const marque = (fournisseurs || []).find(f => f.id === c.fournisseur_id)?.nom
        const hay = [marque, c.fichier, ...(c.numeros_bc || []), ...(lignesPar[c.id] || []).flatMap(l => [l.code_modele, l.libelle, l.couleur, l.gencode])].map(forme).join(' ')
        if (!hay.includes(q)) return false
      }
      return true
    }).sort((a, b) => b.id - a.id)
  }, [duMagasin, filtre, rech, lignesPar, fournisseurs])

  if (donnees === undefined || fournisseurs === undefined || magasins === undefined) return <PageShell title="Commandes fournisseurs"><LoadingState /></PageShell>

  const fiche = ficheId && (donnees.commandes || []).find(c => c.id === ficheId)
  const chip = (k, l, n) => <button key={k} className="chip" aria-pressed={filtre === k} onClick={() => setFiltre(k)}>{l}{n != null && <span style={{ opacity: .6 }}> {n}</span>}</button>
  const tot = duMagasin.reduce((a, c) => ({ cmd: a.cmd + c.qte_commandee, recu: a.recu + c.qte_recue, reste: a.reste + c.reste }), { cmd: 0, recu: 0, reste: 0 })

  function importee(ids, saison) {
    setImporter(false)
    if (saison !== season) { if (!seasons.some(s => s.id === saison)) addSeason(libelleSaison(saison)); setSeason(saison) }
    setFiltre('tous'); setRech('')
    setToast({ texte: ids.length > 1 ? `${ids.length} commandes importées (une par magasin)` : 'Commande importée' })
    if (ids.length === 1) setFicheId(ids[0])
  }

  const carte = c => {
    const p = c.qte_commandee > 0 ? Math.round(c.qte_recue / c.qte_commandee * 100) : 0
    const retard = enRetard(c)
    return (
      <button key={c.id} className={`ligne cf-carte${c.reste === 0 ? ' faible' : ''}`} aria-current={ficheId === c.id ? 'true' : undefined} onClick={() => setFicheId(c.id)}>
        <span className="txt">
          <span className="t1">{v['cf-groupe-marque'] ? nomMagasin(c.magasin_id) : `${nomMarque(c.fournisseur_id)} · ${nomMagasin(c.magasin_id)}`}
            {c.type === 'reassort' && <span className="etat-mot info" style={{ marginLeft: 6 }}>réassort</span>}</span>
          <span className="t2">{(c.numeros_bc || []).length ? 'BC ' + c.numeros_bc.join(', ') : 'Sans n° de BC'}{c.date_commande ? ' · ' + fmtJour(c.date_commande) : ''}
            {estDirection && v['cf-montant-carte'] ? ' · ' + fmtEur(c.montant_net) : ''}</span>
          {v['cf-barre']
            ? <span className="ligne-jauge"><Jauge p={p} /><span className="t2" style={{ margin: 0 }}>{c.qte_recue} / {c.qte_commandee} paires{c.reste ? ` · reste ${c.reste}` : ''}</span></span>
            : <span className="t2">{c.qte_recue} / {c.qte_commandee} paires reçues{c.reste ? ` · reste ${c.reste}` : ''}</span>}
          {c.livraison_prevue && c.reste > 0 && <span className={`t2${retard ? ' etat-mot att' : ''}`}>Livraison prévue {fmtJour(c.livraison_prevue)}{retard ? ' · dépassée' : ''}</span>}
          {estDirection && c.lignes_hors_commande > 0 && <span className="t2 etat-mot att">{c.lignes_hors_commande} article{c.lignes_hors_commande > 1 ? 's' : ''} hors commande</span>}
        </span>
        <StatutCommande c={c} />
      </button>
    )
  }

  let liste
  if (!visibles.length) liste = <div className="vide">{duMagasin.length ? 'Aucune commande ne correspond.' : estDirection ? 'Aucune commande pour cette saison — touche « Importer une commande ».' : 'Aucune commande pour cette saison.'}</div>
  else if (v['cf-groupe-marque']) {
    const groupes = {}; visibles.forEach(c => (groupes[nomMarque(c.fournisseur_id)] ||= []).push(c))
    liste = Object.keys(groupes).sort((a, b) => a.localeCompare(b, 'fr')).map(m => (
      <section key={m}><h2 className="groupe-titre">{m}</h2><div className="liste">{groupes[m].map(carte)}</div></section>
    ))
  } else liste = <div className="liste" style={{ marginTop: 10 }}>{visibles.map(carte)}</div>

  const ficheEl = fiche && (
    <FicheCommande key={fiche.id} commande={fiche} lignes={lignesPar[fiche.id] || []} marque={nomMarque(fiche.fournisseur_id)} magasinNom={nomMagasin(fiche.magasin_id)}
      estDirection={estDirection} cote={grand} onFermer={() => setFicheId(null)} onReimporter={c => setReimport(c)} />
  )

  return (
    <PageShell title="Commandes fournisseurs"
      rightExtra={estDirection && <button className="btn btn-prim seulement-grand" onClick={() => setImporter(true)}><Icone nom="ajout" taille={20} />Importer une commande</button>}>
      <PanneauEssai points={POINTS_FOURNISSEURS} />
      {!suivieParCommandes(season) && (
        <div className="encart neutre" style={{ marginBottom: 12 }}>Les commandes fournisseurs sont suivies à partir d’Été 2027. {libelleSaison(season)} reste dans Achats et le Cahier, comme aujourd’hui.</div>
      )}
      <div className="recherche"><Icone nom="cherche" taille={20} style={{ color: 'var(--discret)' }} />
        <input className="champ" placeholder="N° de BC, marque, modèle, couleur, gencode…" value={rech} onChange={e => setRech(e.target.value)} aria-label="Rechercher" /></div>
      <div className="barre-filtres">
        <div className="chips" style={{ flex: 1, flexWrap: 'wrap' }}>
          <button className="chip" aria-pressed={!magasinId} onClick={() => setMagasinId('')}>Tous les magasins</button>
          {magasins.map(m => <button key={m.id} className="chip" aria-pressed={Number(magasinId) === m.id} onClick={() => setMagasinId(m.id)}>{m.nom}</button>)}
        </div>
      </div>
      <div className="chips" style={{ margin: '10px 0 0', flexWrap: 'wrap' }}>
        {chip('tous', 'Toutes', duMagasin.length)}
        {chip('recevoir', 'À recevoir', duMagasin.filter(c => c.qte_recue === 0 && c.reste > 0).length)}
        {chip('partielles', 'Partielles', duMagasin.filter(c => c.qte_recue > 0 && c.reste > 0).length)}
        {chip('soldees', 'Soldées', duMagasin.filter(c => c.reste === 0).length)}
        {retards.length > 0 && chip('retard', 'Livraison dépassée', retards.length)}
        {estDirection && chip('hors', 'Hors commande', duMagasin.filter(c => c.lignes_hors_commande > 0).length)}
      </div>
      <div className="sous-info">{libelleSaison(season)} · {duMagasin.length} commande{duMagasin.length > 1 ? 's' : ''} · {tot.recu.toLocaleString('fr-FR')} / {tot.cmd.toLocaleString('fr-FR')} paires reçues · reste {tot.reste.toLocaleString('fr-FR')}</div>
      {v['cf-encart-retard'] && retards.length > 0 && filtre !== 'retard' && (
        <button className="encart att cf-encart" onClick={() => setFiltre('retard')}>
          <Icone nom="horloge" taille={18} />{retards.length} commande{retards.length > 1 ? 's ont' : ' a'} dépassé la livraison prévue — voir
        </button>
      )}

      <div className={grand && fiche ? 'cf-grille' : undefined}>
        <div>{liste}</div>
        {grand && ficheEl}
      </div>
      {!grand && ficheEl}

      <div style={{ height: 72 }} className="seulement-petit" aria-hidden="true" />
      {estDirection && <button className="btn btn-prim action-flottante" onClick={() => setImporter(true)}><Icone nom="ajout" taille={20} />Importer</button>}
      {importer && <FenetreImport fournisseurs={fournisseurs} magasins={magasins} onFermer={() => setImporter(false)} onImportee={importee}
        onReimporter={c => { setImporter(false); setReimport(c) }} />}
      {reimport && <FenetreReimport commande={reimport} marque={nomMarque(reimport.fournisseur_id)} magasinNom={nomMagasin(reimport.magasin_id)}
        onFermer={() => setReimport(null)} onFait={() => { setReimport(null); setToast({ texte: 'Commande réimportée' }) }} />}
      <Toast toast={toast} onFermer={() => setToast(null)} />
    </PageShell>
  )
}
