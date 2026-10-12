import { useState, useRef, lazy, Suspense } from 'react'
import { db } from './db'
import StoreSelect      from './components/StoreSelect'
import HomeScreen       from './home/HomeScreen'
import { LoadingState } from './components/shared'
import { confirmDanger } from './components/DangerConfirm'
import Connexion from './components/Connexion'
import { useCompte } from './context/CompteContext'
import { useAlerts }    from './home/useAlerts'
import { SeasonProvider, useSeason } from './context/SeasonContext'
import { MagasinProvider, useMagasin } from './context/MagasinContext'
import Coque, { VueClients } from './shell/Coque'
import { useVue, aller } from './shell/navigation'
import Icone from './components/ui/Icone'
import './App.css'
import './styles/charte.css'

// Chaque écran n'est chargé qu'au moment où on l'ouvre (ouverture de l'outil plus rapide, surtout sur téléphone)
const SuiviLivraisons = lazy(() => import('./tabs/SuiviLivraisons'))
const Entrees         = lazy(() => import('./tabs/Entrees'))
const Achats          = lazy(() => import('./tabs/Achats'))
const PlanReglement   = lazy(() => import('./tabs/PlanReglement'))
const Parametres      = lazy(() => import('./tabs/Parametres'))
const Repertoire      = lazy(() => import('./tabs/Repertoire'))
const Commandes       = lazy(() => import('./commandes/Commandes'))
const Defectueux      = lazy(() => import('./defectueux/Defectueux'))
const Paie            = lazy(() => import('./paie/Paie'))
const Planning        = lazy(() => import('./planning/Planning'))
const Sav             = lazy(() => import('./sav/Sav'))
const Factures        = lazy(() => import('./factures/Factures'))
const Reassort        = lazy(() => import('./reassort/Reassort'))

// Écrans réservés aux comptes Direction (la base refuse de toute façon les écritures sensibles aux comptes magasin)
const DIRECTION_VIEWS = new Set(['reglement', 'parametres', 'achats'])

function SeasonBadge() {
  const { estDirection } = useCompte()
  const { season, setSeason, seasons, addSeason, removeSeason } = useSeason()
  const current       = seasons.find(s => s.id === season) || seasons[0]
  const [open,        setOpen]        = useState(false)
  const [adding,      setAdding]      = useState(false)
  const [newName,     setNewName]     = useState('')
  const [deleting,    setDeleting]    = useState(false)
  const inputRef = useRef(null)

  function openAdd(e) {
    e.stopPropagation()
    setAdding(true)
    setNewName('')
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  function confirmAdd(e) {
    e?.preventDefault()
    const id = addSeason(newName)
    if (id) { setSeason(id); setOpen(false); setAdding(false) }
  }

  // Suppression d'une saison : efface toutes ses entrées et lignes d'achats → réservée à la Direction, nom à retaper
  async function handleDelete(id) {
    const s = seasons.find(x => x.id === id)
    setDeleting(true)
    try {
      const [nbEntrees, nbAchats] = await Promise.all([
        db.entrees.where('season').equals(id).toArray().then(r => r.length),
        db.parametres.where('season').equals(id).toArray().then(r => r.length),
      ])
      setOpen(false)
      const ok = await confirmDanger({
        title: `Supprimer la saison « ${s.label} » ?`,
        message: `Seront effacées pour tous les magasins et tous les appareils :\n• ${nbEntrees} entrée(s) du Cahier\n• ${nbAchats} ligne(s) d'achats et de modèles`,
        word: s.label,
      })
      if (!ok) return
      await db.entrees.where('season').equals(id).delete()
      await db.parametres.where('season').equals(id).delete()
      removeSeason(id)
    } catch (err) {
      alert('La suppression a échoué : ' + (err.message || err) + '\nRien n\'a été retiré de la liste des saisons.')
    } finally {
      setDeleting(false)
    }
  }

  function close() { setOpen(false); setAdding(false) }
  const couleur = current?.color ?? 'var(--discret)'

  return (
    <div style={{ position: 'relative' }}>
      <button className="saison-btn" onClick={() => { setOpen(o => !o); setAdding(false) }} aria-expanded={open}
        style={{ color: couleur, background: `color-mix(in srgb, ${couleur} 14%, transparent)` }}>
        {current?.label ?? '—'} <Icone nom="bas" taille={14} />
      </button>

      {open && (
        <>
          <div className="voile" style={{ zIndex: 199 }} onClick={close} />
          <div className="saison-menu">
            {seasons.map(s => (
              <div key={s.id} style={{ display: 'flex', alignItems: 'center' }}>
                <button className="ligne" style={{ minHeight: 44, flex: 1 }} onClick={() => { setSeason(s.id); close() }}>
                  <span className="txt"><span className="t1" style={{ color: s.id === season ? s.color : 'var(--texte)', fontWeight: s.id === season ? 700 : 500 }}>{s.label}</span></span>
                  {s.id === season && <Icone nom="check" taille={18} style={{ color: s.color }} />}
                </button>
                {seasons.length > 1 && estDirection && (
                  <button className="icone-btn" onClick={e => { e.stopPropagation(); setAdding(false); handleDelete(s.id) }} disabled={deleting}
                    title="Supprimer cette saison" aria-label={`Supprimer la saison ${s.label}`}>
                    <Icone nom="fermer" taille={18} />
                  </button>
                )}
              </div>
            ))}
            <div style={{ borderTop: '1px solid var(--trait)' }}>
              {!adding ? (
                <button className="ligne" style={{ minHeight: 44, color: 'var(--action-texte)' }} onClick={openAdd}>
                  <Icone nom="ajout" taille={18} /> <span className="txt" style={{ fontWeight: 600 }}>Nouvelle saison</span>
                </button>
              ) : (
                <form onSubmit={confirmAdd} style={{ padding: 10, display: 'flex', gap: 8 }}>
                  <input ref={inputRef} className="champ" value={newName} onChange={e => setNewName(e.target.value)} placeholder="ex : Hiver 2027"
                    onKeyDown={e => e.key === 'Escape' && setAdding(false)} />
                  <button type="submit" className="btn btn-prim" disabled={!newName.trim()}>OK</button>
                </form>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// En-tête commun des pages : titre, actions, sélecteur de saison, onglets éventuels (plus de bouton retour : le menu reste visible)
function PageShell({ title, withSeason = true, tabs = null, rightExtra = null, children }) {
  return (
    <div className="page-coque">
      <header className="entete-page">
        <h1 className="titre-page">{title}</h1>
        <div className="entete-actions">
          {rightExtra}
          {withSeason && <SeasonBadge />}
        </div>
      </header>
      {tabs && <div className="onglets-page"><div className="segment" role="group">{tabs}</div></div>}
      <main className="app-main">{children}</main>
    </div>
  )
}

// Bouton « magasin » de l'en-tête (revient au choix du magasin, comme aujourd'hui)
function BoutonMagasin({ nom, onClick }) {
  return (
    <button className="chip" onClick={onClick} title="Changer de magasin">
      <Icone nom="magasin" taille={16} /> {nom} <Icone nom="bas" taille={14} />
    </button>
  )
}

// Cahier des entrées = Suivi livraisons + Entrées réunis (sous-onglets)
const CAHIER_TABS = [
  { id: 'suivi',   label: 'Suivi livraisons' },
  { id: 'entrees', label: 'Entrées' },
]

function CahierEntrees() {
  const [tab, setTab] = useState('suivi')
  const { magasin: magasinCourant, setMagasin } = useMagasin()
  const magasin = magasinCourant?.nom || ''

  if (!magasin) return <StoreSelect onSelect={m => setMagasin(m)} onHome={() => aller('home')}
    theme={{ accent: '#1d4ed8', border: '#93c5fd', shadow: 'rgba(29,78,216,0.18)', gradient: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', icon: '📥' }} />

  return (
    <PageShell
      title="Cahier des entrées"
      rightExtra={<BoutonMagasin nom={magasin} onClick={() => setMagasin(null)} />}
      tabs={CAHIER_TABS.map(t => (
        <button key={t.id} aria-pressed={tab === t.id} onClick={() => setTab(t.id)}>{t.label}</button>
      ))}
    >
      {tab === 'suivi'   && <SuiviLivraisons />}
      {tab === 'entrees' && <Entrees defaultMagasin={magasin} />}
    </PageShell>
  )
}

// Top modèles & réassorts (par magasin, liés à la saison)
function ReassortApp() {
  const { magasin, setMagasin } = useMagasin()
  if (!magasin) return <StoreSelect onSelect={m => setMagasin(m)} onHome={() => aller('home')}
    theme={{ accent: '#059669', border: '#6ee7b7', shadow: 'rgba(5,150,105,0.18)', gradient: 'linear-gradient(135deg, #10b981, #047857)', icon: '⭐' }} />
  return (
    <PageShell title="Top modèles & réassorts" rightExtra={<BoutonMagasin nom={magasin.nom} onClick={() => setMagasin(null)} />}>
      <Reassort magasin={magasin} />
    </PageShell>
  )
}

function Root() {
  const vueDemandee = useVue()
  const { estDirection } = useCompte()
  const vue = DIRECTION_VIEWS.has(vueDemandee) && !estDirection ? 'home' : vueDemandee
  const home = () => aller('home')
  const { magasin, setMagasin } = useMagasin()
  const alerts  = useAlerts(magasin)

  let content
  if (vue === 'cahier')          content = <CahierEntrees />
  else if (vue === 'commandes')  content = <Commandes onHome={home} />
  else if (vue === 'defectueux') content = <Defectueux onHome={home} />
  else if (vue === 'paie')       content = <PageShell title="Éléments variables de paie" withSeason={false}><Paie /></PageShell>
  else if (vue === 'achats')     content = <PageShell title="Achats"><Achats /></PageShell>
  else if (vue === 'repertoire') content = <PageShell title="Répertoire fournisseurs" withSeason={false}><Repertoire /></PageShell>
  else if (vue === 'reglement')  content = <PageShell title="Plan de règlement"><PlanReglement /></PageShell>
  else if (vue === 'parametres') content = <PageShell title="Paramètres"><Parametres /></PageShell>
  else if (vue === 'factures')   content = <PageShell title="Factures" withSeason={false}><Factures /></PageShell>
  else if (vue === 'planning')   content = <Planning onHome={home} />
  else if (vue === 'sav')        content = <Sav onHome={home} />
  else if (vue === 'reassort')   content = <ReassortApp />
  else if (vue === 'clients')    content = <VueClients alerts={alerts} />
  else                           content = <HomeScreen onOpen={aller} alerts={alerts} />

  return (
    <Coque vue={vue} alerts={alerts} magasin={magasin} setMagasin={setMagasin}>
      <Suspense fallback={<LoadingState />}>{content}</Suspense>
    </Coque>
  )
}

export default function App() {
  return (
    <Connexion>
      <SeasonProvider>
        <MagasinProvider>
          <Root />
        </MagasinProvider>
      </SeasonProvider>
    </Connexion>
  )
}
