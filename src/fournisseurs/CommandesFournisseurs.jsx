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
import { ouvrirAvec } from '../shell/navigation'
import { Toast } from '../cahier/Reperes'
import { commandesDeSaison, lignesDe, dernieresReceptions } from './donnees'
import { suivieParCommandes, libelleSaison, forme } from './csvPolaris'
import { Jauge, StatutCommande } from './commun'
import { fmtJour, enRetard, traine, repereCommande, joursDepuis } from './outils'
import PanneauEssai from '../shell/PanneauEssai'
import { useVariantes } from '../shell/essai'
import { POINTS_4 } from './points4'
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
  const [magasinId, setMagasinId] = useState(() => (estDirection ? '' : magasinAppareil?.id ?? ''))
  const [filtre, setFiltre] = useState('tous')        // tous | recevoir | partielles | soldees | retard | traine | hors
  const [jours, setJours] = useState(30)             // commandes qui traînent : sans nouvelle depuis plus de N jours
  const v = useVariantes(POINTS_4)
  const [rech, setRech] = useState('')
  const [ficheId, setFicheId] = useState(null)
  const [importer, setImporter] = useState(false)
  const [reimport, setReimport] = useState(null)
  const [toast, setToast] = useState(null)
  const [frId, setFrId] = useState('')               // filtre fournisseur
  const [famille, setFamille] = useState('')         // filtre famille (colonne Famille du fichier, par modèle)
  const [aVerifier, setAVerifier] = useState(null)   // marque créée à l'import : fournisseur à vérifier
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 6000); return () => clearTimeout(t) }, [toast])

  const donnees = useLiveQuery(async () => {
    const commandes = await commandesDeSaison(season)
    if (!commandes.length) return { commandes, lignes: [], derniers: {} }
    const [lignes, derniers] = await Promise.all([lignesDe(commandes.map(c => c.id)), dernieresReceptions(season)])
    return { commandes, lignes, derniers }
  }, [season])
  const fournisseurs = useLiveQuery(() => db.fournisseurs.orderBy('nom').toArray(), [])
  const magasins = useLiveQuery(() => db.magasins.orderBy('nom').toArray(), [])
  const frs = useLiveQuery(() => db.fournisseursReels.toArray(), [])

  const nomMarque = id => (fournisseurs || []).find(f => f.id === id)?.nom || '—'
  // Fournisseur d'une marque (plan C, étape 2 bis) : la liste est groupée par fournisseur, puis par marque
  const frDeMarque = id => { const m = (fournisseurs || []).find(f => f.id === id); return (frs || []).find(x => x.id === m?.fournisseurReelId) }
  const nomFr = id => frDeMarque(id)?.nom || nomMarque(id)
  const nomMagasin = id => (magasins || []).find(m => m.id === id)?.nom || '—'
  const lignesPar = useMemo(() => {
    const g = {}; for (const l of donnees?.lignes || []) (g[l.commande_id] ||= []).push(l); return g
  }, [donnees])

  const duMagasin = useMemo(() => (donnees?.commandes || []).filter(c => (!magasinId || c.magasin_id === Number(magasinId))
    && (!frId || (fournisseurs || []).find(f => f.id === c.fournisseur_id)?.fournisseurReelId === Number(frId))), [donnees, magasinId, frId, fournisseurs])
  const retards = duMagasin.filter(enRetard)
  const voitTraine = estDirection || v['r4-traine-magasin']
  const trainent = voitTraine ? duMagasin.filter(c => traine(c, donnees?.derniers?.[c.id], jours)) : []
  const visibles = useMemo(() => {
    const q = forme(rech)
    return duMagasin.filter(c => {
      if (filtre === 'recevoir' && !(c.qte_recue === 0 && c.reste > 0)) return false
      if (filtre === 'partielles' && !(c.qte_recue > 0 && c.reste > 0)) return false
      if (filtre === 'soldees' && c.reste > 0) return false
      if (filtre === 'retard' && !enRetard(c)) return false
      if (filtre === 'traine' && !traine(c, donnees?.derniers?.[c.id], jours)) return false
      if (filtre === 'hors' && !(c.lignes_hors_commande > 0)) return false
      if (famille && !(lignesPar[c.id] || []).some(l => l.famille === famille)) return false
      if (q) {
        const marque = (fournisseurs || []).find(f => f.id === c.fournisseur_id)
        const fr = (frs || []).find(x => x.id === marque?.fournisseurReelId)
        const hay = [marque?.nom, fr?.nom, c.fichier, ...(c.numeros_bc || []), ...(lignesPar[c.id] || []).flatMap(l => [l.code_modele, l.libelle, l.couleur, l.gencode])].map(forme).join(' ')
        if (!hay.includes(q)) return false
      }
      return true
    }).sort((a, b) => b.id - a.id)
  }, [duMagasin, filtre, rech, lignesPar, fournisseurs, frs, famille, donnees, jours])

  if (donnees === undefined || fournisseurs === undefined || magasins === undefined || frs === undefined) return <PageShell title="Commandes fournisseurs"><LoadingState /></PageShell>

  const fiche = ficheId && (donnees.commandes || []).find(c => c.id === ficheId)
  const chip = (k, l, n) => <button key={k} className="chip" aria-pressed={filtre === k} onClick={() => setFiltre(k)}>{l}{n != null && <span style={{ opacity: .6 }}> {n}</span>}</button>
  const tot = duMagasin.reduce((a, c) => ({ cmd: a.cmd + c.qte_commandee, recu: a.recu + c.qte_recue, reste: a.reste + c.reste }), { cmd: 0, recu: 0, reste: 0 })

  function importee(ids, saison, creee) {
    setImporter(false)
    setAVerifier(creee)
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
          <span className="t1">{nomMagasin(c.magasin_id)}
            {c.type === 'reassort' && <span className="etat-mot info" style={{ marginLeft: 6 }}>réassort</span>}</span>
          <span className="t2">{(c.numeros_bc || []).length ? 'BC ' + c.numeros_bc.join(', ') : 'Sans n° de BC'}{c.date_commande ? ' · ' + fmtJour(c.date_commande) : ''}
            {estDirection ? ' · ' + fmtEur(c.montant_net) : ''}</span>
          <span className="ligne-jauge"><Jauge p={p} /><span className="t2" style={{ margin: 0 }}>{c.qte_recue} / {c.qte_commandee} paires{c.reste ? ` · reste ${c.reste}` : ''}</span></span>
          {c.livraison_prevue && c.reste > 0 && <span className={`t2${retard ? ' etat-mot att' : ''}`}>Livraison prévue {fmtJour(c.livraison_prevue)}{retard ? ' · dépassée' : ''}</span>}
          {voitTraine && traine(c, donnees.derniers?.[c.id], jours) && <span className="t2 etat-mot att">Reste {c.reste} paire{c.reste > 1 ? 's' : ''} · {donnees.derniers?.[c.id] ? `dernière réception le ${fmtJour(donnees.derniers[c.id])}` : 'aucune réception'} · rien depuis {joursDepuis(repereCommande(c, donnees.derniers?.[c.id]))} jours</span>}
          {estDirection && c.lignes_hors_commande > 0 && <span className="t2 etat-mot att">{c.lignes_hors_commande} article{c.lignes_hors_commande > 1 ? 's' : ''} hors commande</span>}
        </span>
        <StatutCommande c={c} />
      </button>
    )
  }

  let liste
  if (!visibles.length && filtre === 'hors') liste = <div className="vide">Aucune commande avec des articles « hors commande ».<br />Ce filtre montre les commandes où une réception a apporté un article absent de la commande, ou plus de paires que le reste à livrer — à régulariser (prix, réimport).</div>
  else if (!visibles.length) liste = <div className="vide">{duMagasin.length ? 'Aucune commande ne correspond.' : estDirection ? 'Aucune commande pour cette saison — touche « Importer une commande ».' : 'Aucune commande pour cette saison.'}</div>
  else {
    // Par fournisseur, puis par marque (sous-titre de marque : quand le fournisseur a plusieurs marques ou un autre nom)
    const groupes = {}
    visibles.forEach(c => { const fr = nomFr(c.fournisseur_id); ((groupes[fr] ||= {})[nomMarque(c.fournisseur_id)] ||= []).push(c) })
    liste = Object.keys(groupes).sort((a, b) => a.localeCompare(b, 'fr')).map(fr => {
      const marques = Object.keys(groupes[fr]).sort((a, b) => a.localeCompare(b, 'fr'))
      const sousTitres = marques.length > 1 || marques[0] !== fr
      return (
        <section key={fr}><h2 className="groupe-titre">{fr}</h2>
          {marques.map(m => <div key={m}>{sousTitres && <div className="cf-sous-titre">{m}</div>}<div className="liste">{groupes[fr][m].map(carte)}</div></div>)}
        </section>
      )
    })
  }

  const ficheEl = fiche && (
    <FicheCommande key={fiche.id} commande={fiche} lignes={lignesPar[fiche.id] || []} marque={nomMarque(fiche.fournisseur_id)} magasinNom={nomMagasin(fiche.magasin_id)}
      estDirection={estDirection} cote={grand} famille={famille} onFermer={() => setFicheId(null)} onReimporter={c => setReimport(c)}
      onSupprimee={c => { setFicheId(null); setToast({ texte: `Commande ${nomMarque(c.fournisseur_id)} · ${nomMagasin(c.magasin_id)} supprimée (notée au journal)` }) }} />
  )

  return (
    <PageShell title="Commandes fournisseurs"
      rightExtra={estDirection && <button className="btn btn-prim seulement-grand" onClick={() => setImporter(true)}><Icone nom="ajout" taille={20} />Importer une commande</button>}>
      {suivieParCommandes(season) && <PanneauEssai points={POINTS_4} />}
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
      {(() => {
        const avecCommandes = [...new Set((donnees.commandes || []).map(c => frDeMarque(c.fournisseur_id)?.id).filter(Boolean))]
        const familles = [...new Set(duMagasin.flatMap(c => (lignesPar[c.id] || []).map(l => l.famille)).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'fr', { numeric: true }))
        return <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>{avecCommandes.length > 1 && (
          <select className="champ" style={{ width: 'auto', minWidth: 220, marginTop: 10 }} value={frId} onChange={e => setFrId(e.target.value)} aria-label="Fournisseur">
            <option value="">Tous les fournisseurs</option>
            {avecCommandes.map(id => frs.find(x => x.id === id)).sort((a, b) => a.nom.localeCompare(b.nom, 'fr')).map(f => <option key={f.id} value={f.id}>{f.nom}</option>)}
          </select>
        )}{familles.length > 1 && (
          <select className="champ" style={{ width: 'auto', minWidth: 200, marginTop: 10 }} value={famille} onChange={e => setFamille(e.target.value)} aria-label="Famille">
            <option value="">Toutes les familles</option>
            {familles.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
        )}</div>
      })()}
      <div className="chips" style={{ margin: '10px 0 0', flexWrap: 'wrap' }}>
        {chip('tous', 'Toutes', duMagasin.length)}
        {chip('recevoir', 'À recevoir', duMagasin.filter(c => c.qte_recue === 0 && c.reste > 0).length)}
        {chip('partielles', 'Partielles', duMagasin.filter(c => c.qte_recue > 0 && c.reste > 0).length)}
        {chip('soldees', 'Reçues en totalité', duMagasin.filter(c => c.reste === 0).length)}
        {retards.length > 0 && chip('retard', 'Livraison dépassée', retards.length)}
        {(trainent.length > 0 || filtre === 'traine') && chip('traine', `Rien depuis ${jours} j`, trainent.length)}
        {estDirection && chip('hors', 'Hors commande', duMagasin.filter(c => c.lignes_hors_commande > 0).length)}
      </div>
      <div className="sous-info">{libelleSaison(season)} · {duMagasin.length} commande{duMagasin.length > 1 ? 's' : ''} · {tot.recu.toLocaleString('fr-FR')} / {tot.cmd.toLocaleString('fr-FR')} paires reçues · reste {tot.reste.toLocaleString('fr-FR')}</div>
      {aVerifier && (
        <div className="encart att" style={{ marginTop: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ flex: 1 }}>Marque « {aVerifier.marque} » créée{aVerifier.rattache ? ` (rattachée au fournisseur ${aVerifier.rattache})` : ', fournisseur à vérifier'}.</span>
          <button className="btn petit" onClick={() => ouvrirAvec('parametres', 'fournisseurs-marques')}>Ouvrir dans Réglages</button>
          <button className="icone-btn" onClick={() => setAVerifier(null)} aria-label="Fermer"><Icone nom="fermer" taille={18} /></button>
        </div>
      )}
      {retards.length > 0 && filtre !== 'retard' && (
        <button className="encart att cf-encart" onClick={() => setFiltre('retard')}>
          <Icone nom="horloge" taille={18} />{retards.length} commande{retards.length > 1 ? 's ont' : ' a'} dépassé la livraison prévue — voir
        </button>
      )}

      {trainent.length > 0 && filtre !== 'traine' && (
        <button className="encart att cf-encart" onClick={() => setFiltre('traine')}>
          <Icone nom="horloge" taille={18} />{trainent.length} commande{trainent.length > 1 ? 's' : ''} de saison avec un reste à livrer ({trainent.reduce((s, c) => s + c.reste, 0)} paires), sans réception depuis plus de {jours} jours — voir
        </button>
      )}
      {filtre === 'traine' && (
        <div className="cf-traine-jours">
          <span className="aide">Reste à livrer, rien reçu (ni livraison prévue) depuis plus de</span>
          {[15, 30, 60, 90].map(n => <button key={n} className="chip" aria-pressed={jours === n} onClick={() => setJours(n)}>{n} jours</button>)}
          {estDirection && <span className="aide">Rien n'est annulé tout seul : ouvre la commande pour « Annuler le reliquat ».</span>}
        </div>
      )}

      <div className={grand && fiche ? 'cf-grille' : undefined}>
        <div>{liste}</div>
        {grand && ficheEl}
      </div>
      {!grand && ficheEl}

      <div style={{ height: 72 }} className="seulement-petit" aria-hidden="true" />
      {estDirection && <button className="btn btn-prim action-flottante" onClick={() => setImporter(true)}><Icone nom="ajout" taille={20} />Importer</button>}
      {importer && <FenetreImport fournisseurs={fournisseurs} fournisseursReels={frs} magasins={magasins} onFermer={() => setImporter(false)} onImportee={importee}
        onReimporter={c => { setImporter(false); setReimport(c) }} />}
      {reimport && <FenetreReimport commande={reimport} marque={nomMarque(reimport.fournisseur_id)} magasinNom={nomMagasin(reimport.magasin_id)}
        onFermer={() => setReimport(null)} onFait={() => { setReimport(null); setToast({ texte: 'Commande réimportée' }) }} />}
      <Toast toast={toast} onFermer={() => setToast(null)} />
    </PageShell>
  )
}
