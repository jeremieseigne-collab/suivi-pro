import { useState, useMemo, useEffect } from 'react'
import { useLiveQuery } from '../lib/useLiveQuery'
import { db } from '../db'
import { useSeason } from '../context/SeasonContext'
import { useMagasin } from '../context/MagasinContext'
import { getSociete } from '../data/societes'
import { LoadingState } from '../components/shared'
import StoreSelect from '../components/StoreSelect'
import Icone from '../components/ui/Icone'
import Confirmation from '../components/ui/Confirmation'
import { PageShell, BoutonMagasin } from '../shell/EnTete'
import { aller } from '../shell/navigation'
import SaisieReceptionCommande from '../fournisseurs/SaisieReception'
import { suivieParCommandes } from '../fournisseurs/csvPolaris'
import { Numero } from '../cahier/Reperes'
import { Toast } from '../cahier/Reperes'
import { buildReassortMailUrl, coordMarque } from './mail'
import { SaisieTop, SaisieStock, SaisieReassort, SaisieReception, GrillePointures } from './Saisies'
import {
  ETAPES_VUES, ETAPES_CHOIX, CLASSE_ETAPE, etapeVue, etapeSuivante, mailPossible, joursEtape,
  fmtDate, joursDepuis, sortSizes, resteParPointure, isActif, retard, etatPointure, proposition, supprimerTop,
} from './constants'
import '../cahier/cahier.css'
import '../savdef/savdef.css'
import './reassort.css'

const fmtTailles = o => sortSizes(Object.keys(o || {})).map(s => `${s}×${o[s]}`).join('  ')
const Etape = ({ r }) => {
  const n = retard(r), j = ['En route', 'Demandé'].includes(r.statut) ? joursEtape(r) : null
  return <span className={`etat-mot ${n ? 'retard-' + n : CLASSE_ETAPE[etapeVue(r.statut)]}`}>{etapeVue(r.statut)}{j != null ? ` · ${j} j` : ''}</span>
}
// État d'un top modèle (liste et fiche)
function EtatTop({ t }) {
  if (t.actif) return <Etape r={t.actif} />
  if (t.archive) return <span className="etat-mot">Archivé</span>
  if (t.termine) return <span className="etat-mot e-vert">Réassort reçu</span>
  if (t.alerte) return <span className="etat-mot e-rouge">{t.ruptures} en rupture</span>
  if (t.dernierRecu) return <span className="etat-mot e-vert">OK</span>
  return <span className="etat-mot">Aucun réassort</span>
}
// Trait de couleur à gauche de la ligne (repère, comme aujourd'hui)
function trait(t) {
  const n = t.actif ? retard(t.actif) : null
  if (n) return n === 'rouge' ? '#dc2626' : '#f97316'
  if (t.actif) return ({ 'À réassortir': '#ef4444', 'Demandé': '#f59e0b', 'Commandé': '#3b82f6', 'En route': '#8b5cf6' })[etapeVue(t.actif.statut)]
  if (t.alerte) return '#dc2626'
  if (t.termine) return '#16a34a'
  return 'transparent'
}
function detailLigne(t) {
  if (t.actif) return 'Reste ' + (fmtTailles(resteParPointure(t.actif)) || '—')
  if (t.alerte) return 'Rupture : ' + t.pointures.filter(s => etatPointure(t, s, t.enCommande) === 'rupture').join(', ')
  if (t.dernierRecu) return 'Reçu ' + fmtTailles(t.dernierRecu.sizes)
  return ''
}

// Frise des 4 étapes du réassort en cours
function Frise({ r }) {
  const i = ETAPES_VUES.indexOf(etapeVue(r.statut))
  return <div className="frise">{ETAPES_VUES.map((e, k) => <span key={e} className={k < i ? 'faite' : k === i ? `active ${CLASSE_ETAPE[e]}` : ''}>{k < i ? '✓ ' : ''}{e}</span>)}</div>
}

// Fiche d'un top modèle : réassort en cours, stock, actions, historique
function FicheTop({ t, act, onFermer, lienCommande }) {
  const r = t.actif
  const n = r ? retard(r) : null
  const cnt = {}; t.histo.forEach(h => Object.entries(h.sizes || {}).forEach(([s, q]) => { cnt[s] = (cnt[s] || 0) + (Number(q) || 0) }))
  const topP = Object.entries(cnt).sort((a, b) => b[1] - a[1]).slice(0, 5)
  const suivant = r && etapeSuivante(r.statut)
  const nbProp = Object.values(t.prop).reduce((a, b) => a + b, 0)
  return (
    <>
      <div className="feuille-fond" onClick={onFermer} />
      <div className="feuille" role="dialog" aria-label={`${t.marque} ${t.modele}`}>
        <div className="feuille-entete"><h2>{t.marque}</h2><button className="icone-btn" onClick={onFermer} aria-label="Fermer"><Icone nom="fermer" /></button></div>
        <div className="feuille-corps">
          <div style={{ fontWeight: 600, fontSize: 16 }}>{t.modele}<Numero n={t.numero} /> <EtatTop t={t} /></div>
          <div className="resume-saisie" style={{ marginTop: 6 }}>
            {t.categorie && <span>Catégorie <b>{t.categorie}</b></span>}<span>Stock mini <b>{t.cible || 1}</b></span>
            <span>Reçu cette saison <b>{t.recuSaison}</b>{t.derniere ? ` (dernière entrée ${t.derniere})` : ''}</span>
          </div>

          {r ? (
            <div className={`bloc-reassort${n ? ' retard-' + n : ''}`}>
              <span className="etiquette" style={{ marginTop: 0 }}>Réassort en cours</span>
              <Frise r={r} />
              <div className="aide" style={{ marginTop: 6 }}>
                {sortSizes(Object.keys(r.sizes || {})).map(s => { const reste = (r.sizes[s] || 0) - (r.recu?.[s] || 0); return <span key={s} className={reste <= 0 ? 'barre-texte' : ''} style={{ marginRight: 10 }}>{s}×{r.sizes[s]}</span> })}
                {r.par && <> · demandé par {r.par}</>} · depuis le {fmtDate(r.createdAt)}
                {r.statut === 'Demandé' && r.etapes?.['Demandé'] && <> · demandé le {fmtDate(r.etapes['Demandé'])}</>}
                {r.etapes?.Relance && <> · <b>relancé le {fmtDate(r.etapes.Relance)}</b></>}
              </div>
              {r.note && <div className="aide">{r.note}</div>}
              {lienCommande && r.commandeId && <div className="aide">Commande de réassort n° {r.commandeId}{r.recuAvantCommande && Object.keys(r.recuAvantCommande).length ? ' (reprise : déjà reçu ' + fmtTailles(r.recuAvantCommande) + ')' : ''} · <button className="lien" style={{ minHeight: 0, padding: 0 }} onClick={() => aller('fournisseurs')}>Voir dans Commandes fournisseurs</button></div>}
              {n && <div className={`retard-texte retard-${n}`}>{r.statut === 'Demandé' ? `Demandé depuis ${joursEtape(r)} jours, sans confirmation — relancer la marque ?` : `En route depuis ${joursEtape(r)} jours — relancer la marque ?`}</div>}
              {/* Étape modifiable à la main (décision du 13/10) ; revenir en arrière demande confirmation */}
              {<div className="chips" style={{ flexWrap: 'wrap', marginTop: 10 }}>
                {ETAPES_CHOIX.map(e => <button key={e} className="chip" aria-pressed={etapeVue(r.statut) === e} onClick={() => act.choisirEtape(r, e)}>{e}</button>)}
              </div>}
              <div className="actions-bloc">
                {suivant && suivant !== 'Reçu' && <button className="btn" onClick={() => act.avancer(r)}>→ {suivant}</button>}
                {mailPossible(r.statut) && <button className="btn" onClick={() => act.mail(t, r)}><Icone nom="mail" taille={18} />{r.statut === 'Demandé' ? 'Renvoyer le mail' : 'Commander par mail'}</button>}
                {['Commandé', 'En route'].includes(r.statut) && <button className="btn btn-prim" onClick={() => act.reception(t, r)}>Réassort reçu</button>}
                <button className="btn" onClick={() => act.modifierReassort(t, r)}>Modifier le réassort</button>
              </div>
            </div>
          ) : t.dernierRecu ? (
            <div className="encart neutre" style={{ marginTop: 14 }}>Dernier réassort reçu le {fmtDate(t.dernierRecu.etapes?.['Reçu'])} · {fmtTailles(t.dernierRecu.sizes)}</div>
          ) : <div className="encart neutre" style={{ marginTop: 14 }}>Aucun réassort lancé pour ce modèle</div>}

          <span className="etiquette" style={{ marginTop: 16 }}>Stock par pointure <span className="aide legende"><i className="l-rupture" />Rupture <i className="l-commande" />En commande <i className="l-ok" />OK</span></span>
          <GrillePointures tailles={t.pointures} suivies={t.pointures} stock={t.stock || {}} cible={t.cible || 1} enCommande={t.enCommande} />
          <div className="aide" style={{ marginTop: 6 }}>Stock {t.stockAt ? `mis à jour le ${fmtDate(t.stockAt)}` : 'jamais saisi'}</div>

          <div className="actions-bloc">
            {!t.archive && <button className="btn" onClick={() => act.stock(t)}>Mettre à jour le stock</button>}
            {!r && !t.archive && !t.termine && <button className={`btn ${t.alerte ? 'btn-prim' : ''}`} onClick={() => act.nouveauReassort(t)}>Lancer un réassort{nbProp ? ` (${nbProp} p.)` : ''}</button>}
            {t.termine && <><button className="btn" onClick={() => act.archiver(t)}>Archiver</button><button className="btn" onClick={() => act.relancer(t)}>Relancer le suivi</button></>}
            {t.archive && <button className="btn" onClick={() => act.desarchiver(t)}>Désarchiver</button>}
          </div>

          {t.histo.length > 0 && <>
            <span className="etiquette" style={{ marginTop: 16 }}>Historique des réassorts</span>
            {topP.length > 0 && t.histo.length > 1 && <div className="aide">Pointures les plus réassorties : {topP.map(([s, q]) => <b key={s} style={{ marginRight: 8 }}>{s} ({q})</b>)}</div>}
            <div className="liste" style={{ background: 'var(--carte-2)', marginTop: 6 }}>
              {t.histo.map(h => (
                <div key={h.id} className="ligne ligne-histo" style={{ minHeight: 44 }}>
                  <span className="txt"><span className="t1" style={{ fontWeight: 500 }}>{fmtDate(h.createdAt)} · <Etape r={h} /></span><span className="t2">{fmtTailles(h.sizes)}{h.statut === 'Reçu' && h.etapes?.['Reçu'] ? ` · reçu le ${fmtDate(h.etapes['Reçu'])}` : ''}</span></span>
                </div>
              ))}
            </div>
          </>}
          {t.note && <><span className="etiquette" style={{ marginTop: 16 }}>Note</span><div className="carte" style={{ background: 'var(--carte-2)', whiteSpace: 'pre-wrap' }}>{t.note}</div></>}
          <div className="actions-bloc" style={{ marginTop: 20 }}>
            <button className="btn" onClick={() => act.modifierTop(t)}>Modifier la fiche</button>
            <button className="btn btn-danger" onClick={() => act.supprimerTop(t)}>Supprimer</button>
          </div>
        </div>
      </div>
    </>
  )
}

export default function Reassort() {
  const { season } = useSeason()
  const { magasin, setMagasin } = useMagasin()
  const suivie = suivieParCommandes(season)   // étape 6 : réassorts en commandes pour les saisons suivies par commandes
  const [vue, setVue] = useState('magasin')
  const [rech, setRech] = useState('')
  const [filtre, setFiltre] = useState('')   // '' | rupture | encours | retard | recu | aucun | archive
  const [ficheId, setFicheId] = useState(null)
  const [saisie, setSaisie] = useState(null)  // { type: top|stock|reassort|reception, top, reassort }
  const [confirm, setConfirm] = useState(null)
  const [toast, setToast] = useState(null)
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), toast.duree || 5000); return () => clearTimeout(t) }, [toast])

  const data = useLiveQuery(async () => {
    const [tops, reassorts, magasins, fournisseurs, entrees] = await Promise.all([
      db.topModeles.where('season').equals(season).toArray(), db.reassorts.where('season').equals(season).toArray(),
      db.magasins.toArray(), db.fournisseurs.toArray(), db.entrees.where('season').equals(season).toArray(),
    ])
    return { tops, reassorts, magasins, fournisseurs, entrees }
  }, [season])

  // Même calcul que l'outil actuel (reçu hors retours, en commande, ruptures, terminé, alerte, dernière action)
  const enrichis = useMemo(() => {
    if (!data) return []
    const fById = Object.fromEntries(data.fournisseurs.map(f => [f.id, f])), magById = Object.fromEntries(data.magasins.map(m => [m.id, m.nom]))
    const recu = {}
    data.entrees.forEach(e => {
      if (e.statut === 'Retour') return
      const k = `${e.magasinId}|${e.fournisseurId}|${e.modele}`, c = recu[k] || (recu[k] = { total: 0, last: null, lastDate: '' })
      c.total += Number(e.total) || 0
      if (!c.last || e.id > c.last) { c.last = e.id; c.lastDate = e.date }
    })
    return data.tops.map(t => {
      const pointures = t.pointures || []
      const histo = data.reassorts.filter(r => r.topId === t.id).sort((a, b) => b.id - a.id)
      const actif = histo.find(isActif) || null, dernierRecu = histo.find(r => r.statut === 'Reçu') || null
      const enCommande = {}
      histo.filter(isActif).forEach(r => Object.entries(resteParPointure(r)).forEach(([s, q]) => { enCommande[s] = (enCommande[s] || 0) + q }))
      const etats = pointures.map(s => etatPointure(t, s, enCommande)), rc = recu[`${t.magasinId}|${t.fournisseurId}|${t.modele}`]
      const archive = !!t.archivedAt, recuLe = dernierRecu?.etapes?.['Reçu'] || ''
      const termine = !archive && !actif && !!dernierRecu && (!t.relanceAt || recuLe > t.relanceAt)
      return { ...t, pointures, histo, actif, dernierRecu, enCommande, marque: fById[t.fournisseurId]?.nom || '—', fournisseurObj: fById[t.fournisseurId], magasinNom: magById[t.magasinId] || '—',
        ruptures: etats.filter(e => e === 'rupture').length, archive, termine, alerte: !archive && !termine && !actif && etats.includes('rupture'),
        prop: proposition({ ...t, pointures }, enCommande), recuSaison: rc?.total || 0, derniere: rc?.lastDate || '',
        dateActivite: [t.createdAt, t.archivedAt, t.relanceAt, ...histo.flatMap(h => [h.createdAt, ...Object.values(h.etapes || {})])].filter(Boolean).sort().pop() || '' }
    })
  }, [data])

  if (!magasin) return <StoreSelect onSelect={m => setMagasin(m)} onHome={() => aller('home')}
    theme={{ accent: '#059669', border: '#6ee7b7', shadow: 'rgba(5,150,105,0.18)', gradient: 'linear-gradient(135deg, #10b981, #047857)', icon: '⭐' }} />

  const miens = enrichis.filter(t => t.magasinId === magasin.id)
  const stats = { rupture: miens.filter(t => t.alerte).length, encours: miens.filter(t => t.actif).length, retard: miens.filter(t => t.actif && retard(t.actif)).length,
    recu: miens.filter(t => t.termine).length, aucun: miens.filter(t => !t.archive && !t.histo.length).length, archive: miens.filter(t => t.archive).length, tops: miens.filter(t => !t.archive).length }
  const liste = miens.filter(t => {
    if (filtre === 'archive' ? !t.archive : t.archive) return false
    if (filtre === 'rupture' && !t.alerte) return false
    if (filtre === 'encours' && !t.actif) return false
    if (filtre === 'retard' && !(t.actif && retard(t.actif))) return false
    if (filtre === 'recu' && !t.termine) return false
    if (filtre === 'aucun' && t.histo.length) return false
    if (rech && ![t.marque, t.modele, t.numero, t.note].join(' ').toLowerCase().includes(rech.toLowerCase())) return false
    return true
  }).sort((a, b) => b.dateActivite.localeCompare(a.dateActivite) || b.id - a.id)
  const topById = Object.fromEntries(enrichis.map(t => [t.id, t]))
  const fiche = ficheId && topById[ficheId]

  // ── Actions (mêmes effets que l'outil actuel), avec « Annuler » dans le message ──
  const remettre = (r) => db.reassorts.update(r.id, { statut: r.statut, etapes: r.etapes || {} })
  async function changerEtape(r, etape, texte) {
    try { await db.reassorts.update(r.id, { statut: etape, etapes: { ...(r.etapes || {}), ...(r.etapes?.[etape] ? {} : { [etape]: new Date().toISOString() }) } }); setToast({ texte, annuler: () => remettre(r) }) }
    catch (e) { setToast({ texte: 'Changement impossible : ' + (e.message || 'vérifie la connexion.') }) }
  }
  const act = {
    avancer: r => { const s = etapeSuivante(r.statut); if (s && s !== 'Reçu') changerEtape(r, s, `${r.modele} : « ${s} »`) },
    choisirEtape: (r, e) => {
      if (e === etapeVue(r.statut)) return
      if (ETAPES_VUES.indexOf(e) < ETAPES_VUES.indexOf(etapeVue(r.statut))) setConfirm({ titre: `Revenir à « ${e} » ?`, texte: `Le réassort ${r.modele} est à « ${etapeVue(r.statut)} ». Revenir à une étape précédente ?`, confirmer: 'Revenir en arrière', action: () => changerEtape(r, e, `${r.modele} : retour à « ${e} »`) })
      else changerEtape(r, e, `${r.modele} : « ${e} »`)
    },
    mail: (t, r) => {
      const f = t.fournisseurObj, reste = resteParPointure(r)
      window.open(buildReassortMailUrl({ modele: t.modele, numero: t.numero, sizes: Object.keys(reste).length ? reste : r.sizes, magasin: t.magasinNom, salarie: r.par, societe: getSociete(t.magasinNom),
        // Adresse : mail commandes du magasin, sinon mail SAV du magasin, sinon adresse commune de la marque (13/10)
        email: coordMarque(f, t.magasinId, 'emailCommandes') || coordMarque(f, t.magasinId, 'email'), numeroClient: coordMarque(f, t.magasinId, 'numeroClient') }), '_blank')
      // Règle du 13/10 (accord écrit) : le mail fait passer « À réassortir » à « Demandé » ; « Commandé » quand la marque confirme (étape suivante).
      // Renvoyer le mail d'un réassort « Demandé » ne change ni l'étape ni sa date (le retard continue de courir jusqu'à la confirmation).
      if (r.statut === 'À réassortir') changerEtape(r, 'Demandé', `${r.modele} : « Demandé » — en attente de la confirmation de la marque`)
      else relancer(r)
    },
    // Saison suivie par commandes : la réception passe par la saisie commune, sur la commande du réassort (même chemin que le Cahier)
    reception: (t, r) => setSaisie({ type: suivie && r.commandeId ? 'reception-commande' : 'reception', top: t, reassort: r }),
    modifierReassort: (t, r) => setSaisie({ type: 'reassort', top: t, reassort: r }),
    nouveauReassort: t => setSaisie({ type: 'reassort', top: t }),
    stock: t => setSaisie({ type: 'stock', top: t }),
    modifierTop: t => setSaisie({ type: 'top', top: t }),
    archiver: t => majTop(t, { archivedAt: new Date().toISOString() }, 'Archivé', { archivedAt: t.archivedAt || null }),
    desarchiver: t => majTop(t, { archivedAt: null, relanceAt: new Date().toISOString() }, 'Désarchivé', { archivedAt: t.archivedAt, relanceAt: t.relanceAt || null }),
    relancer: t => majTop(t, { relanceAt: new Date().toISOString() }, 'Suivi relancé', { relanceAt: t.relanceAt || null }),
    supprimerTop: t => setConfirm({ danger: true, titre: 'Supprimer ce top modèle ?', confirmer: 'Supprimer',
      texte: `${t.marque} · ${t.modele}.${t.histo.length ? ` Ses ${t.histo.length} réassort${t.histo.length > 1 ? 's seront aussi supprimés' : ' sera aussi supprimé'}.` : ''} Les entrées déjà créées dans le Cahier restent. Cette suppression est définitive.`,
      action: async () => { try { await supprimerTop(t.id); setFicheId(null); setToast({ texte: 'Top modèle supprimé' }) } catch (e) { setToast({ texte: 'Suppression impossible : ' + e.message }) } } }),
  }
  // Relance d'un réassort « Demandé » : on note la date de la dernière relance dans l'historique des dates (etapes.Relance),
  // sans changer l'étape ni la date de la demande (le retard se compte depuis la première demande). Pas de nouvelle colonne.
  async function relancer(r) {
    try { await db.reassorts.update(r.id, { etapes: { ...(r.etapes || {}), Relance: new Date().toISOString() } }); setToast({ texte: `${r.modele} : relance notée`, annuler: () => db.reassorts.update(r.id, { etapes: r.etapes || {} }) }) }
    catch (e) { setToast({ texte: 'Relance non notée : ' + (e.message || 'vérifie la connexion.') }) }
  }
  async function majTop(t, changes, texte, avant) {
    try { await db.topModeles.update(t.id, changes); setToast({ texte: `${t.modele} : ${texte}`, annuler: () => db.topModeles.update(t.id, avant) }) } catch (e) { setToast({ texte: 'Impossible : ' + e.message }) }
  }
  // Action rapide d'une ligne (point C) : Reçu, étape suivante, ou lancer un réassort
  function actionLigne(t) {
    const r = t.actif
    if (r && ['Commandé', 'En route'].includes(r.statut)) return { libelle: 'Reçu', faire: () => act.reception(t, r) }
    if (r) { const s = etapeSuivante(r.statut); return s && s !== 'Reçu' ? { libelle: `→ ${s}`, faire: () => act.avancer(r) } : null }
    if (t.alerte) return { libelle: 'Réassort', faire: () => act.nouveauReassort(t) }
    return null
  }

  const chip = (id, libelle, nb) => <button key={id} className="chip" aria-pressed={filtre === id} onClick={() => setFiltre(filtre === id ? '' : id)}>{libelle}{nb > 0 && <span style={{ opacity: .6 }}> {nb}</span>}</button>
  // Vue « Tous magasins » : réassorts en cours des 3 boutiques, regroupés par marque ; reçus des 30 derniers jours
  const actifsTous = data ? data.reassorts.filter(isActif).map(r => ({ r, t: topById[r.topId] })).filter(x => x.t) : []
  const parMarque = {}; actifsTous.forEach(x => { (parMarque[x.t.marque] ||= []).push(x) })
  const recusTous = data ? data.reassorts.filter(r => r.statut === 'Reçu' && joursDepuis(r.etapes?.['Reçu']) <= 30 && topById[r.topId]).sort((a, b) => (b.etapes?.['Reçu'] || '').localeCompare(a.etapes?.['Reçu'] || '')) : []

  return (
    <PageShell title="Top modèles & réassorts"
      rightExtra={<>
        <BoutonMagasin nom={magasin.nom} onClick={() => setMagasin(null)} />
        {vue === 'magasin' && <button className="btn btn-prim seulement-grand" onClick={() => setSaisie({ type: 'top' })}><Icone nom="ajout" taille={20} />Nouveau top modèle</button>}
      </>}
      tabs={[['magasin', magasin.nom], ['tous', 'Tous magasins']].map(([id, l]) => <button key={id} aria-pressed={vue === id} onClick={() => setVue(id)}>{l}</button>)}>
      {data === undefined ? <LoadingState /> : vue === 'magasin' ? <>
        <div className="recherche"><Icone nom="cherche" taille={20} style={{ color: 'var(--discret)' }} />
          <input className="champ" placeholder="Marque, modèle, N°, note…" value={rech} onChange={e => setRech(e.target.value)} aria-label="Rechercher" /></div>
        <div className="chips" style={{ marginTop: 10 }}>
          {chip('rupture', 'À réassortir', stats.rupture)}{chip('encours', 'En cours', stats.encours)}{chip('retard', 'En retard', stats.retard)}
          {chip('recu', 'Réassortis', stats.recu)}{chip('aucun', 'Sans réassort', stats.aucun)}{chip('archive', 'Archivés', stats.archive)}
        </div>
        {suivie && <div className="aide" style={{ marginTop: 8 }}>Saison suivie par commandes : un réassort devient une commande de réassort dès qu’il est demandé ; sa réception passe par la saisie commune (comme une commande de saison).</div>}
        <div className="sous-info">{magasin.nom} · {stats.tops} top modèle{stats.tops > 1 ? 's' : ''} · {stats.encours} réassort{stats.encours > 1 ? 's' : ''} en cours{stats.archive && filtre !== 'archive' ? ' · archivés masqués' : ''}</div>
        {!liste.length ? <div className="vide">{miens.length ? 'Aucun modèle ne correspond.' : 'Aucun top modèle pour ce magasin — touche « Nouveau top modèle ».'}</div> : (
          <div className="liste" style={{ marginTop: 10 }}>
            {liste.map(t => {
              const a = actionLigne(t)   // bouton discret par ligne (décision du 13/10)
              return (
                <div key={t.id} className={`ligne ligne-entree ligne-cmd ligne-top${t.archive || t.termine ? ' faible termine' : ''}`} style={{ boxShadow: `inset 4px 0 0 ${trait(t)}` }}>
                  <button className="zone-ouvrir" onClick={() => setFicheId(t.id)}>
                    <span className="txt">
                      <span className="t1">{t.marque} <span>· {t.modele}</span><Numero n={t.numero} /></span>
                      <span className="t2">{fmtDate(t.dateActivite)}{detailLigne(t) ? ' · ' + detailLigne(t) : ''}</span>
                    </span>
                    <EtatTop t={t} />
                  </button>
                  {a && <button className="btn petit etape-suivante" onClick={a.faire}>{a.libelle}</button>}
                </div>
              )
            })}
          </div>
        )}
        <div style={{ height: 72 }} className="seulement-petit" aria-hidden="true" />
        <button className="btn btn-prim action-flottante" onClick={() => setSaisie({ type: 'top' })}><Icone nom="ajout" taille={20} />Top modèle</button>
      </> : <>
        <h2 className="groupe-titre">Réassorts en cours · 3 magasins</h2>
        {!actifsTous.length ? <div className="vide">Aucun réassort en cours.</div> : Object.keys(parMarque).sort().map(m => (
          <section key={m}>
            <h2 className="groupe-titre">{m}</h2>
            <div className="liste">
              {parMarque[m].sort((a, b) => ETAPES_VUES.indexOf(etapeVue(b.r.statut)) - ETAPES_VUES.indexOf(etapeVue(a.r.statut))).map(({ r, t }) => {
                const depuis = joursDepuis(r.etapes?.[r.statut] || r.createdAt), s = etapeSuivante(r.statut)
                return (
                  <div key={r.id} className="ligne ligne-entree ligne-cmd">
                    <button className="zone-ouvrir" onClick={() => { setVue('magasin'); if (t.magasinId === magasin.id) setFicheId(t.id) }}>
                      <span className="txt"><span className="t1">{t.modele}<Numero n={t.numero} /> <span>· {t.magasinNom}</span></span>
                        <span className="t2">Reste {fmtTailles(resteParPointure(r)) || '—'}{depuis != null ? ` · depuis ${depuis} j (${fmtDate(r.etapes?.[r.statut] || r.createdAt)})` : ''}</span></span>
                      <Etape r={r} />
                    </button>
                    {s && s !== 'Reçu' && <button className="btn petit etape-suivante" onClick={() => act.avancer(r)}>→ {s}</button>}
                    {['Commandé', 'En route'].includes(r.statut) && <button className="btn petit etape-suivante" onClick={() => act.reception(t, r)}>Reçu</button>}
                  </div>
                )
              })}
            </div>
          </section>
        ))}
        <h2 className="groupe-titre">Reçus ces 30 derniers jours · {recusTous.length}</h2>
        {!recusTous.length ? <div className="vide" style={{ padding: 16 }}>Aucun réassort reçu ces 30 derniers jours.</div> : (
          <div className="liste">{recusTous.map(r => { const t = topById[r.topId]; return (
            <div key={r.id} className="ligne"><span className="txt"><span className="t1">{t.marque} <span>· {t.modele}</span><Numero n={t.numero} /> <span>· {t.magasinNom}</span></span><span className="t2">Reçu le {fmtDate(r.etapes?.['Reçu'])} · {fmtTailles(r.sizes)}</span></span></div>
          ) })}</div>
        )}
      </>}

      {fiche && !saisie && <FicheTop t={fiche} act={act} onFermer={() => setFicheId(null)} lienCommande={suivie} />}
      {saisie?.type === 'top' && <SaisieTop top={saisie.top} magasinId={magasin.id} onFermer={() => setSaisie(null)} onToast={setToast} />}
      {saisie?.type === 'stock' && <SaisieStock top={saisie.top} onFermer={() => setSaisie(null)} onToast={setToast} />}
      {saisie?.type === 'reassort' && <SaisieReassort top={saisie.top} reassort={saisie.reassort} proposition={saisie.top.prop} enCommande={saisie.top.enCommande} magasinNom={magasin.nom} suivie={suivie} onFermer={() => setSaisie(null)} onToast={setToast} />}
      {saisie?.type === 'reception-commande' && <SaisieReceptionCommande magasinAppareil={saisie.top.magasinNom} entrees={[]} commandeInitiale={saisie.reassort.commandeId}
        onFermer={() => setSaisie(null)} onToast={setToast}
        onEnregistree={async articles => {
          // Comme aujourd'hui (case « Ajouter ces paires au stock du top modèle » cochée par défaut) : le stock du top modèle suit la réception
          if (!saisie.top?.id) return
          const top = await db.topModeles.get(saisie.top.id), stock = { ...(top?.stock || {}) }
          articles.forEach(a => Object.entries(a.tailles || {}).forEach(([s, n]) => { stock[s] = (Number(stock[s]) || 0) + (Number(n) || 0) }))
          await db.topModeles.update(saisie.top.id, { stock, stockAt: new Date().toISOString() })
        }} />}
      {saisie?.type === 'reception' && <SaisieReception top={saisie.top} reassort={saisie.reassort} magasinNom={saisie.top.magasinNom} onFermer={() => setSaisie(null)} onToast={setToast} />}
      {confirm && <Confirmation danger={confirm.danger} titre={confirm.titre} texte={confirm.texte} confirmer={confirm.confirmer} onAnnuler={() => setConfirm(null)} onConfirmer={() => { const a = confirm.action; setConfirm(null); a() }} />}
      <Toast toast={toast} onFermer={() => setToast(null)} />
    </PageShell>
  )
}
