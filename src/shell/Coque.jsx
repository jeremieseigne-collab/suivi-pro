import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { db } from '../db'
import { useLiveQuery } from '../lib/useLiveQuery'
import { useCompte } from '../context/CompteContext'
import Icone from '../components/ui/Icone'
import Confirmation from '../components/ui/Confirmation'
import { aller, useApparence, APPARENCES } from './navigation'
import './coque.css'

// ─── Menu : mêmes destinations et mêmes intitulés qu'aujourd'hui, rangés selon le plan ───
// (les intitulés « Réassorts » et « SAV & défectueux » changeront avec la refonte de ces écrans)
const MENU = [
  { items: [
    { id: 'home',       icone: 'accueil',    label: 'Accueil' },
    { id: 'agenda',     icone: 'agenda',     label: 'Agenda' },
    { id: 'cahier',     icone: 'entrees',    label: 'Cahier des entrées' },
    { id: 'reassort',   icone: 'reassort',   label: 'Top modèles & réassorts' },
    { id: 'commandes',  icone: 'commande',   label: 'Commandes clients' },
    { id: 'sav',        icone: 'sav',        label: 'SAV & défectueux', vues: ['sav', 'defectueux'] },
    { id: 'repertoire', icone: 'repertoire', label: 'Répertoire' },
    { id: 'factures',   icone: 'facture',    label: 'Factures' },
  ] },
  { titre: 'Équipe', items: [
    { id: 'planning', icone: 'planning', label: 'Planning' },
    { id: 'paie',     icone: 'paie',     label: 'Éléments de paie' },
  ] },
  { titre: 'Direction', direction: true, items: [
    { id: 'achats',     icone: 'achats',    label: 'Achats' },
    { id: 'reglement',  icone: 'reglement', label: 'Plan de règlement' },
    { id: 'parametres', icone: 'reglages',  label: 'Réglages' },
  ] },
]
// Onglets du téléphone (en bas, à portée du pouce) ; le reste est dans « Plus »
const ONGLETS = [
  { id: 'home',     icone: 'accueil',  label: 'Accueil' },
  { id: 'cahier',   icone: 'entrees',  label: 'Entrées' },
  { id: 'clients',  icone: 'clients',  label: 'Clients', vues: ['clients', 'commandes', 'sav', 'defectueux'] },
  { id: 'reassort', icone: 'reassort', label: 'Réassorts' },
]

// Pastilles de comptage (mêmes couleurs que l'outil actuel) et rappel de la paie
function reperes(alerts) {
  const jour = new Date().getDate()
  return {
    badges: {
      reassort:   alerts?.retard ? { n: alerts.retard, couleur: '#f97316', titre: 'Réassorts en retard' }
                : { n: alerts?.aCommander, couleur: '#ef4444', titre: 'Réassorts à commander' },
      sav:        { n: alerts?.defATraiter, couleur: '#e11d48', titre: 'Défectueux à traiter' },
      commandes:  { n: alerts?.cmdAPrevenir, couleur: '#0891b2', titre: 'Clients à prévenir' },
    },
    notes: { paie: jour >= 15 && jour <= 25 ? 'À remplir avant le 25' : '' },
  }
}

function Pastille({ badge }) {
  if (!(badge?.n > 0)) return null
  return <span className="pastille-compte" title={badge.titre} style={{ background: badge.couleur }}>{badge.n}</span>
}

// Déconnexion : même appel qu'avant (supabase.auth.signOut(), réglage par défaut de Supabase) ; seule la fenêtre de confirmation change
function BoutonDeconnexion({ className, children }) {
  const [confirmer, setConfirmer] = useState(false)
  return (
    <>
      <button className={className} onClick={() => setConfirmer(true)}>{children}</button>
      {confirmer && (
        <Confirmation titre="Se déconnecter de cet appareil ?" texte="Il faudra ressaisir l’adresse et le mot de passe du magasin pour revenir."
          confirmer="Se déconnecter" danger onAnnuler={() => setConfirmer(false)} onConfirmer={() => { setConfirmer(false); supabase.auth.signOut() }} />
      )}
    </>
  )
}

function ChoixMagasin({ magasin, setMagasin, replie }) {
  const [ouvert, setOuvert] = useState(false)
  const magasins = useLiveQuery(() => db.magasins.orderBy('nom').toArray(), [])
  return (
    <div className="choix-magasin">
      <button className="magasin-btn" onClick={() => setOuvert(o => !o)} title={replie ? (magasin?.nom || 'Choisir un magasin') : undefined} aria-expanded={ouvert}>
        <Icone nom="magasin" taille={18} style={{ color: 'var(--doux)' }} />
        {!replie && <span className="flex">{magasin?.nom || 'Choisir un magasin'}</span>}
        {!replie && <Icone nom="bas" taille={16} style={{ color: 'var(--doux)' }} />}
      </button>
      {ouvert && (
        <>
          <div className="voile" onClick={() => setOuvert(false)} />
          <div className="menu-deroulant">
            {(magasins || []).map(m => (
              <button key={m.id} className="ligne" style={{ minHeight: 44 }} onClick={() => { setMagasin(m); setOuvert(false) }}>
                <span className="txt"><span className="t1" style={{ fontWeight: magasin?.id === m.id ? 700 : 500 }}>{m.nom}</span></span>
                {magasin?.id === m.id && <Icone nom="check" taille={18} style={{ color: 'var(--action-texte)' }} />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function ChoixApparence() {
  const [choix, setChoix] = useApparence()
  return (
    <div className="segment" role="group" aria-label="Apparence" style={{ width: '100%' }}>
      {APPARENCES.map(([v, l]) => <button key={v} aria-pressed={choix === v} onClick={() => setChoix(v)} style={{ flex: 1, padding: 0 }}>{l}</button>)}
    </div>
  )
}

// ─── Barre latérale (ordinateur et tablette) ───
function BarreLaterale({ vue, alerts, magasin, setMagasin }) {
  const { estDirection, email } = useCompte()
  const [replie, setReplie] = useState(() => { try { return localStorage.getItem('sidebar_collapsed') === '1' } catch { return false } })
  const basculer = () => setReplie(r => { try { localStorage.setItem('sidebar_collapsed', r ? '0' : '1') } catch { /* ignore */ } return !r })
  const { badges, notes } = reperes(alerts)
  return (
    <nav className={`barre-laterale${replie ? ' replie' : ''}`} aria-label="Menu">
      <button className="marque-app" onClick={() => aller('home')} title="Accueil"><b>S</b>{!replie && 'Suivi Pro'}</button>
      <ChoixMagasin magasin={magasin} setMagasin={setMagasin} replie={replie} />
      {MENU.filter(g => !g.direction || estDirection).map((g, i) => (
        <div key={i}>
          {g.titre && (replie ? <div className="separateur" /> : <div className="nav-titre">{g.titre}</div>)}
          {g.items.map(it => (
            <button key={it.id} className="nav" aria-current={(it.vues || [it.id]).includes(vue) ? 'page' : undefined} onClick={() => aller(it.id)} title={replie ? it.label : undefined}>
              <Icone nom={it.icone} taille={20} />
              {!replie && <span className="nav-txt">{it.label}{notes[it.id] && <small>{notes[it.id]}</small>}</span>}
              <Pastille badge={badges[it.id]} />
            </button>
          ))}
        </div>
      ))}
      <div className="bas-menu">
        {!replie && <ChoixApparence />}
        {!replie && <div className="compte" title={email}>{email}</div>}
        <BoutonDeconnexion className="nav"><Icone nom="sortie" taille={20} />{!replie && <span className="nav-txt">Se déconnecter</span>}</BoutonDeconnexion>
        <button className="nav" onClick={basculer} title={replie ? 'Déplier le menu' : 'Replier le menu'}><Icone nom={replie ? 'deplier' : 'replier'} taille={20} />{!replie && <span className="nav-txt">Replier le menu</span>}</button>
      </div>
    </nav>
  )
}

// ─── Barre d'onglets + feuille « Plus » (téléphone) ───
function BarreOnglets({ vue, alerts, magasin, setMagasin }) {
  const { estDirection, email } = useCompte()
  const [plus, setPlus] = useState(false)
  const { badges, notes } = reperes(alerts)
  const dansOnglets = new Set(ONGLETS.flatMap(o => o.vues || [o.id]))
  const autres = MENU.filter(g => !g.direction || estDirection).flatMap(g => g.items).filter(it => !dansOnglets.has(it.id))
  const ongletActif = o => (o.vues || [o.id]).includes(vue)
  const nbClients = (badges.commandes.n || 0) + (badges.sav.n || 0)
  return (
    <>
      <nav className="barre-onglets" aria-label="Onglets">
        {ONGLETS.map(o => (
          <button key={o.id} aria-current={!plus && ongletActif(o) ? 'page' : undefined} onClick={() => { setPlus(false); aller(o.id) }}>
            <span className="onglet-icone"><Icone nom={o.icone} taille={24} />
              {o.id === 'clients' ? <Pastille badge={{ n: nbClients, couleur: '#0891b2', titre: 'Clients à prévenir et défectueux à traiter' }} /> : <Pastille badge={badges[o.id]} />}
            </span>
            <span>{o.label}</span>
          </button>
        ))}
        <button aria-current={plus || autres.some(it => it.id === vue) ? 'page' : undefined} onClick={() => setPlus(p => !p)}>
          <span className="onglet-icone"><Icone nom="plus" taille={24} /></span><span>Plus</span>
        </button>
      </nav>
      {plus && (
        <>
          <div className="feuille-fond" onClick={() => setPlus(false)} />
          <div className="feuille bas" role="dialog" aria-label="Plus">
            <div className="feuille-entete"><h2>Plus</h2><button className="icone-btn" onClick={() => setPlus(false)} aria-label="Fermer"><Icone nom="fermer" /></button></div>
            <div className="feuille-corps">
              <div className="liste" style={{ background: 'var(--carte-2)' }}>
                {autres.map(it => (
                  <button key={it.id} className="ligne" onClick={() => { setPlus(false); aller(it.id) }}>
                    <Icone nom={it.icone} style={{ color: 'var(--doux)' }} />
                    <span className="txt"><span className="t1">{it.label}</span>{notes[it.id] && <div className="t2" style={{ color: '#d97706', fontWeight: 600 }}>{notes[it.id]}</div>}</span>
                    <Pastille badge={badges[it.id]} />
                    <Icone nom="chevron" taille={18} style={{ color: 'var(--discret)' }} />
                  </button>
                ))}
              </div>
              <div className="groupe-titre">Magasin</div>
              <ChoixMagasin magasin={magasin} setMagasin={setMagasin} />
              <div className="groupe-titre">Apparence</div>
              <ChoixApparence />
              <div className="groupe-titre">Compte</div>
              <div className="liste" style={{ background: 'var(--carte-2)' }}>
                <BoutonDeconnexion className="ligne"><Icone nom="sortie" style={{ color: 'var(--doux)' }} />
                  <span className="txt"><span className="t1">Se déconnecter</span><div className="t2">{email}</div></span></BoutonDeconnexion>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  )
}

// ─── Page « Clients » du téléphone : Commandes clients, SAV & défectueux ───
export function VueClients({ alerts }) {
  const { badges } = reperes(alerts)
  const items = [['commandes', 'commande', 'Commandes clients'], ['sav', 'sav', 'SAV & défectueux']]
  return (
    <div className="page-coque">
      <h1 className="titre-page">Clients</h1>
      <div className="liste">
        {items.map(([id, ic, l]) => (
          <button key={id} className="ligne" onClick={() => aller(id)}>
            <Icone nom={ic} style={{ color: 'var(--doux)' }} />
            <span className="txt"><span className="t1">{l}</span></span>
            <Pastille badge={badges[id]} />
            <Icone nom="chevron" taille={18} style={{ color: 'var(--discret)' }} />
          </button>
        ))}
      </div>
    </div>
  )
}

export default function Coque({ vue, alerts, magasin, setMagasin, children }) {
  return (
    <div className="coque">
      <BarreLaterale vue={vue} alerts={alerts} magasin={magasin} setMagasin={setMagasin} />
      <div className="coque-contenu">{children}</div>
      <BarreOnglets vue={vue} alerts={alerts} magasin={magasin} setMagasin={setMagasin} />
    </div>
  )
}
