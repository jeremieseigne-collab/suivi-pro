import { useState, useMemo, useEffect } from 'react'
import { useLiveQuery } from '../lib/useLiveQuery'
import { db } from '../db'
import { LoadingState, fmtTel } from '../components/shared'
import StoreSelect from '../components/StoreSelect'
import Icone from '../components/ui/Icone'
import Confirmation from '../components/ui/Confirmation'
import { useMagasin } from '../context/MagasinContext'
import { PageShell, BoutonMagasin } from '../shell/EnTete'
import { aller, actionDemandee, effacerAction } from '../shell/navigation'
import { Toast } from '../cahier/Reperes'
import SaisieCommande from './SaisieCommande'
import { magasinCommandes, memeMagasin, PROVENANCES, STATUTS, STATUTS_CLOS, SUIVANT, CLASSE_STATUT, CLASSE_PROVENANCE } from './constants'
import '../cahier/cahier.css'
import '../savdef/savdef.css'
import './commandes.css'

// Date enregistrée en AAAA-MM-JJ (sinon date de création) → JJ/MM/AA, comme l'outil actuel
function fmtDate(r) {
  const m = /^(\d{4})-(\d\d)-(\d\d)$/.exec(r.date || '')
  if (m) return `${m[3]}/${m[2]}/${m[1].slice(2)}`
  const d = new Date(r.createdAt); return isNaN(d) ? '—' : d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' })
}
const nomClient = r => [r.clientPrenom, r.clientNom].filter(Boolean).join(' ')
const article = r => [r.marque, r.modele, r.reference && `réf. ${r.reference}`, r.pointure].filter(Boolean).join(' · ')
const Statut = ({ s }) => <span className={`etat-mot ${CLASSE_STATUT[s] || ''}`}>{s || '—'}</span>
const telLien = t => (t || '').replace(/[^\d+]/g, '')

// Fiche d'une commande : statut en un toucher (avec « Annuler »), appeler / SMS le client (U6), modifier, supprimer
function FicheCommande({ r, magasinNom, onStatut, onModifier, onSupprimer, onFermer }) {
  const [proposer, setProposer] = useState(false)
  // SMS pré-rempli, au vouvoiement (décision du 13/10)
  const sms = `Bonjour${r.clientPrenom ? ' ' + r.clientPrenom : ''}, votre commande${[r.marque, r.modele, r.pointure].some(Boolean) ? ' ' + [r.marque, r.modele, r.pointure].filter(Boolean).join(' ') : ''} est arrivée au magasin ${magasinNom}. À bientôt !`
  // Après Appeler ou SMS sur une commande « Reçue » : proposer « Client prévenu »
  const apresContact = () => { if (r.statut === 'Reçue') setTimeout(() => setProposer(true), 600) }
  return (
    <>
      <div className="feuille-fond" onClick={onFermer} />
      <div className="feuille" role="dialog" aria-label={`Commande ${nomClient(r)}`}>
        <div className="feuille-entete"><h2>{nomClient(r) || 'Commande'}</h2><button className="icone-btn" onClick={onFermer} aria-label="Fermer"><Icone nom="fermer" /></button></div>
        <div className="feuille-corps">
          <div style={{ fontWeight: 600, fontSize: 16 }}>{article(r) || 'Article non renseigné'}</div>
          <div className="resume-saisie" style={{ marginTop: 6 }}>
            <span>Le <b>{fmtDate(r)}</b></span><span>Salarié <b>{r.salarie || '—'}</b></span>
            <span>Provenance <b className={CLASSE_PROVENANCE[r.provenance] || ''}>{r.provenance || '—'}</b></span>
            {r.telephone && <span>Téléphone <b>{fmtTel(r.telephone)}</b></span>}
          </div>
          {r.telephone && (
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 14 }}>
              <a className="btn btn-prim" href={`tel:${telLien(r.telephone)}`} onClick={apresContact}><Icone nom="telephone" taille={20} />Appeler</a>
              <a className="btn" href={`sms:${telLien(r.telephone)}${sms ? `?&body=${encodeURIComponent(sms)}` : ''}`} onClick={apresContact}><Icone nom="message" taille={20} />SMS</a>
            </div>
          )}
          {r.note && <><span className="etiquette" style={{ marginTop: 16 }}>Note</span><div className="carte" style={{ background: 'var(--carte-2)', whiteSpace: 'pre-wrap' }}>{r.note}</div></>}
          <span className="etiquette" style={{ marginTop: 16 }}>État</span>
          <div className="chips" style={{ flexWrap: 'wrap' }}>
            {STATUTS.map(s => <button key={s} className="chip" aria-pressed={r.statut === s} onClick={() => onStatut(r, s)}>{s}</button>)}
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 20 }}>
            <button className="btn" onClick={() => onModifier(r)}>Modifier</button>
            <button className="btn btn-danger" onClick={() => onSupprimer(r)}>Supprimer</button>
          </div>
        </div>
      </div>
      {proposer && <Confirmation titre="Client prévenu ?" texte={`Passer la commande de ${nomClient(r) || 'ce client'} à « Client prévenu » ?`} confirmer="Oui, client prévenu" annuler="Pas encore"
        onAnnuler={() => setProposer(false)} onConfirmer={() => { setProposer(false); onStatut(r, 'Client prévenu') }} />}
    </>
  )
}

export default function Commandes() {
  const { magasin: magasinCourant, setMagasin } = useMagasin()
  const magasinCmd = magasinCommandes(magasinCourant?.nom)
  const [rech, setRech] = useState('')
  const [vue, setVue] = useState(() => actionDemandee('recues') ? 'Reçue' : 'encours')   // 'encours' | un statut actif | 'closes'
  const [filtres, setFiltres] = useState({ provenance: '', salarie: '' })
  const [feuilleFiltres, setFeuilleFiltres] = useState(false)
  const [saisie, setSaisie] = useState(() => actionDemandee('nouveau') ? {} : null)
  const [ficheId, setFicheId] = useState(null)
  const [aSupprimer, setASupprimer] = useState(null)
  const [toast, setToast] = useState(null)
  useEffect(() => { effacerAction() }, [])
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), toast.duree || 5000); return () => clearTimeout(t) }, [toast])

  const data = useLiveQuery(async () => (await db.commandes.toArray()).sort((a, b) => b.id - a.id), [])
  const salaries = useLiveQuery(() => db.salaries.orderBy('nom').toArray(), [])
  const nomMag = magasinCourant?.nom
  const nomsSalaries = useMemo(() => (salaries || []).filter(s => !s.magasin || memeMagasin(s.magasin, nomMag)).map(s => s.nom), [salaries, nomMag])
  // Commandes du magasin : les deux écritures du nom (« Bailly Rouffiac Tolosan » / « Bailly Rouffiac-Tolosan ») sont reconnues
  const rows = useMemo(() => (data ?? []).filter(r => memeMagasin(r.magasin, magasinCmd)), [data, magasinCmd])
  const filtrees = useMemo(() => rows.filter(r => {
    if (vue === 'encours' && STATUTS_CLOS.includes(r.statut)) return false
    if (vue === 'closes' && !STATUTS_CLOS.includes(r.statut)) return false
    if (vue !== 'encours' && vue !== 'closes' && r.statut !== vue) return false
    if (filtres.provenance && r.provenance !== filtres.provenance) return false
    if (filtres.salarie && r.salarie !== filtres.salarie) return false
    if (rech) {
      const hay = [r.clientNom, r.clientPrenom, r.telephone, r.marque, r.modele, r.reference, r.pointure].map(x => (x || '').toLowerCase()).join(' ')
      if (!hay.includes(rech.toLowerCase())) return false
    }
    return true
  }), [rows, vue, filtres, rech])

  if (!magasinCourant) return <StoreSelect onSelect={m => setMagasin(m)} onHome={() => aller('home')}
    theme={{ accent: '#6d28d9', border: '#c4b5fd', shadow: 'rgba(109,40,217,0.18)', gradient: 'linear-gradient(135deg, #8b5cf6, #6d28d9)', icon: '🛍️' }} />

  const enCours = rows.filter(r => !STATUTS_CLOS.includes(r.statut)).length
  const retirees = rows.filter(r => r.statut === 'Retirée').length
  const closes = rows.length - enCours
  const nbFiltres = [filtres.provenance, filtres.salarie].filter(Boolean).length
  const fiche = ficheId && rows.find(r => r.id === ficheId)

  async function changerStatut(r, statut) {
    if (statut === r.statut) return
    const avant = r.statut
    try { await db.commandes.update(r.id, { statut }); setToast({ texte: `${nomClient(r) || 'Commande'} : « ${statut} »`, annuler: () => db.commandes.update(r.id, { statut: avant }) }) }
    catch (e) { setToast({ texte: 'Changement impossible : ' + (e.message || 'vérifie la connexion.') }) }
  }
  async function supprimer() {
    const r = aSupprimer; setASupprimer(null); setFicheId(null)
    try { await db.commandes.delete(r.id); setToast({ texte: 'Commande supprimée' }) } catch (e) { setToast({ texte: 'Suppression impossible : ' + e.message }) }
  }
  const nouveau = () => setSaisie({})

  return (
    <PageShell title="Commandes clients" withSeason={false}
      rightExtra={<>
        <BoutonMagasin nom={magasinCourant.nom} onClick={() => setMagasin(null)} />
        <button className="btn btn-prim seulement-grand" onClick={nouveau}><Icone nom="ajout" taille={20} />Nouvelle commande</button>
      </>}>
      <div className="recherche"><Icone nom="cherche" taille={20} style={{ color: 'var(--discret)' }} />
        <input className="champ" placeholder="Client, téléphone, marque, modèle, réf…" value={rech} onChange={e => setRech(e.target.value)} aria-label="Rechercher" /></div>
      <div className="barre-filtres">
        <div className="chips" style={{ flex: 1 }}>
          <button className="chip" aria-pressed={vue === 'encours'} onClick={() => setVue('encours')}>En cours <span style={{ opacity: .6 }}>{enCours}</span></button>
          {STATUTS.filter(s => !STATUTS_CLOS.includes(s)).map(s => <button key={s} className="chip" aria-pressed={vue === s} onClick={() => setVue(s)}>{s}</button>)}
          <button className="chip" aria-pressed={vue === 'closes'} onClick={() => setVue('closes')}>Retirées / annulées <span style={{ opacity: .6 }}>{closes}</span></button>
        </div>
        <button className="chip" aria-pressed={nbFiltres > 0} onClick={() => setFeuilleFiltres(true)}><Icone nom="filtre" taille={18} />Filtres{nbFiltres ? ` · ${nbFiltres}` : ''}</button>
      </div>
      <div className="sous-info">{magasinCourant.nom} · {rows.length} commande{rows.length > 1 ? 's' : ''} · {enCours} en cours · {retirees} retirée{retirees > 1 ? 's' : ''}{vue === 'encours' && closes ? ' · retirées et annulées masquées' : ''}</div>

      {data === undefined ? <LoadingState /> : !filtrees.length ? (
        <div className="vide">{rows.length ? 'Aucune commande ne correspond.' : 'Aucune commande pour ce magasin — touche « Nouvelle commande ».'}</div>
      ) : (
        <div className="liste" style={{ marginTop: 10 }}>
          {filtrees.map(r => {
            const clos = STATUTS_CLOS.includes(r.statut), suivant = SUIVANT[r.statut]
            return (
              <div key={r.id} className={`ligne ligne-entree ligne-cmd${clos ? ' faible termine' : ''}`}>
                <button className="zone-ouvrir" onClick={() => setFicheId(r.id)}>
                  <span className="txt">
                    <span className="t1">{nomClient(r) || '—'}{r.telephone && <span> · {fmtTel(r.telephone)}</span>}</span>
                    <span className="t2 article-cmd">{article(r) || '—'}</span>
                    <span className="t2">{fmtDate(r)}{r.salarie ? ' · ' + r.salarie : ''}{r.provenance && <> · <span className={CLASSE_PROVENANCE[r.provenance] || ''}>{r.provenance}</span></>}</span>
                    {r.note && <span className="t2 note-def">{r.note}</span>}
                  </span>
                  <Statut s={r.statut} />
                </button>
                {suivant && <button className="btn petit etape-suivante" onClick={() => changerStatut(r, suivant)} title={`Passer à « ${suivant} »`}>→ {suivant}</button>}
              </div>
            )
          })}
        </div>
      )}
      <div style={{ height: 72 }} className="seulement-petit" aria-hidden="true" />
      <button className="btn btn-prim action-flottante" onClick={nouveau}><Icone nom="ajout" taille={20} />Commande</button>

      {feuilleFiltres && (
        <>
          <div className="feuille-fond" onClick={() => setFeuilleFiltres(false)} />
          <div className="feuille bas lot" role="dialog" aria-label="Filtres">
            <div className="feuille-entete"><h2>Filtres</h2><button className="icone-btn" onClick={() => setFeuilleFiltres(false)} aria-label="Fermer"><Icone nom="fermer" /></button></div>
            <div className="feuille-corps champs-filtres">
              <label className="etiquette">Provenance
                <select className="champ" value={filtres.provenance} onChange={e => setFiltres(x => ({ ...x, provenance: e.target.value }))}>
                  <option value="">Toutes provenances</option>{PROVENANCES.map(p => <option key={p}>{p}</option>)}
                </select></label>
              <label className="etiquette">Salarié
                <select className="champ" value={filtres.salarie} onChange={e => setFiltres(x => ({ ...x, salarie: e.target.value }))}>
                  <option value="">Tous les salariés</option>{nomsSalaries.map(s => <option key={s}>{s}</option>)}
                </select></label>
              <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
                <button className="btn" onClick={() => setFiltres({ provenance: '', salarie: '' })}>Tout effacer</button>
                <button className="btn btn-prim" onClick={() => setFeuilleFiltres(false)}>Voir {filtrees.length} commande{filtrees.length > 1 ? 's' : ''}</button>
              </div>
            </div>
          </div>
        </>
      )}
      {fiche && <FicheCommande r={fiche} magasinNom={magasinCourant.nom} onStatut={changerStatut} onModifier={r => { setFicheId(null); setSaisie({ commande: r }) }} onSupprimer={setASupprimer} onFermer={() => setFicheId(null)} />}
      {saisie && <SaisieCommande key={saisie.commande?.id || 'n'} commande={saisie.commande} magasinCmd={magasinCmd} magasinNom={magasinCourant.nom} onFermer={() => setSaisie(null)} onToast={setToast} />}
      {aSupprimer && <Confirmation danger titre="Supprimer cette commande ?" confirmer="Supprimer" onAnnuler={() => setASupprimer(null)} onConfirmer={supprimer}
        texte={`${nomClient(aSupprimer) || 'Client'} · ${article(aSupprimer) || 'article'}. Cette suppression est définitive.`} />}
      <Toast toast={toast} onFermer={() => setToast(null)} />
    </PageShell>
  )
}
