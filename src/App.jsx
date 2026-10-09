import { useState, useRef, useEffect } from 'react'
import { db } from './db'
import SuiviLivraisons from './tabs/SuiviLivraisons'
import Entrees         from './tabs/Entrees'
import Achats          from './tabs/Achats'
import PlanReglement   from './tabs/PlanReglement'
import Parametres      from './tabs/Parametres'
import Repertoire       from './tabs/Repertoire'
import Commandes        from './commandes/Commandes'
import Defectueux       from './defectueux/Defectueux'
import Paie             from './paie/Paie'
import Planning         from './planning/Planning'
import Sav             from './sav/Sav'
import Factures         from './factures/Factures'
import Reassort         from './reassort/Reassort'
import StoreSelect      from './components/StoreSelect'
import HomeScreen       from './home/HomeScreen'
import Sidebar          from './home/Sidebar'
import { useAlerts }    from './home/useAlerts'
import { useMediaQuery, TABLET } from './lib/useMediaQuery'
import { SeasonProvider, useSeason } from './context/SeasonContext'
import { MagasinProvider, useMagasin } from './context/MagasinContext'
import './App.css'

const PIN_CODE       = '2201'
const PROTECTED_TABS = new Set(['reglement', 'parametres'])

function useDarkMode() {
  const [dark, setDark] = useState(() => localStorage.getItem('theme') === 'dark')
  useEffect(() => {
    document.documentElement.dataset.theme = dark ? 'dark' : 'light'
    localStorage.setItem('theme', dark ? 'dark' : 'light')
  }, [dark])
  return [dark, () => setDark(d => !d)]
}

function ThemeToggle() {
  const [dark, toggle] = useDarkMode()
  return (
    <button onClick={toggle} title={dark ? 'Passer en mode clair' : 'Passer en mode sombre'}
      style={{
        position: 'fixed', bottom: 20, right: 20, zIndex: 90,
        width: 46, height: 46, borderRadius: '50%', cursor: 'pointer',
        border: '1px solid var(--border)', background: 'var(--surface)',
        fontSize: 20, boxShadow: '0 4px 14px var(--shadow-lg)',
      }}>
      {dark ? '☀️' : '🌙'}
    </button>
  )
}

function PinModal({ onSuccess, onClose }) {
  const [digits, setDigits] = useState(['', '', '', ''])
  const [error,  setError]  = useState(false)
  const refs = [useRef(), useRef(), useRef(), useRef()]

  useEffect(() => { refs[0].current?.focus() }, [])

  function handleDigit(i, val) {
    if (!/^\d?$/.test(val)) return
    const next = [...digits]
    next[i] = val
    setDigits(next)
    setError(false)
    if (val && i < 3) refs[i + 1].current?.focus()
    if (next.every(d => d !== '') && i === 3) {
      const code = next.join('')
      if (code === PIN_CODE) { onSuccess() }
      else { setError(true); setDigits(['', '', '', '']); setTimeout(() => refs[0].current?.focus(), 50) }
    }
  }

  function handleKeyDown(i, e) {
    if (e.key === 'Backspace' && !digits[i] && i > 0) {
      refs[i - 1].current?.focus()
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(15,23,42,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={onClose}>
      <div style={{ background: 'var(--surface)', borderRadius: 16, padding: '32px 40px', boxShadow: '0 20px 60px var(--shadow-lg)', textAlign: 'center', minWidth: 280 }}
        onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: 32, marginBottom: 8 }}>🔒</div>
        <h2 style={{ margin: '0 0 6px', fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>Accès restreint</h2>
        <p style={{ margin: '0 0 24px', fontSize: 13, color: 'var(--text-3)' }}>Entrez le code à 4 chiffres</p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginBottom: 16 }}>
          {digits.map((d, i) => (
            <input key={i} ref={refs[i]}
              type="password" inputMode="numeric" maxLength={1} value={d}
              onChange={e => handleDigit(i, e.target.value)}
              onKeyDown={e => handleKeyDown(i, e)}
              style={{
                width: 52, height: 56, textAlign: 'center', fontSize: 24, fontWeight: 700,
                border: `2px solid ${error ? '#ef4444' : d ? 'var(--accent)' : 'var(--border)'}`,
                borderRadius: 10, outline: 'none', background: error ? '#fef2f2' : 'var(--surface-2)',
                color: error ? '#ef4444' : 'var(--text)', transition: 'border-color .15s',
              }}
            />
          ))}
        </div>
        {error && <p style={{ margin: '0 0 8px', fontSize: 13, color: '#ef4444', fontWeight: 600 }}>Code incorrect</p>}
        <button onClick={onClose}
          style={{ marginTop: 4, fontSize: 13, color: 'var(--text-4)', background: 'none', border: 'none', cursor: 'pointer' }}>
          Annuler
        </button>
      </div>
    </div>
  )
}

function BackButton({ onHome }) {
  return (
    <button
      onClick={onHome}
      title="Retour à l'accueil"
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: 34, height: 34, borderRadius: 9, border: '1px solid var(--border)',
        background: 'var(--surface)', cursor: 'pointer', fontSize: 17, color: 'var(--text-2)', lineHeight: 1,
      }}
      onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface-2)'; e.currentTarget.style.color = 'var(--accent)' }}
      onMouseLeave={e => { e.currentTarget.style.background = 'var(--surface)'; e.currentTarget.style.color = 'var(--text-2)' }}
    >←</button>
  )
}

function SeasonBadge() {
  const { season, setSeason, seasons, addSeason, removeSeason } = useSeason()
  const current       = seasons.find(s => s.id === season) || seasons[0]
  const [open,        setOpen]        = useState(false)
  const [adding,      setAdding]      = useState(false)
  const [newName,     setNewName]     = useState('')
  const [confirmDel,  setConfirmDel]  = useState(null) // id de la saison à confirmer
  const [deleting,    setDeleting]    = useState(false)
  const inputRef = useRef(null)

  function openAdd(e) {
    e.stopPropagation()
    setAdding(true)
    setConfirmDel(null)
    setNewName('')
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  function confirmAdd(e) {
    e?.preventDefault()
    const id = addSeason(newName)
    if (id) { setSeason(id); setOpen(false); setAdding(false) }
  }

  async function handleDelete(id) {
    setDeleting(true)
    try {
      await Promise.all([
        db.parametres.where('season').equals(id).delete(),
        db.entrees.where('season').equals(id).delete(),
      ])
      removeSeason(id)
    } finally {
      setDeleting(false)
      setConfirmDel(null)
    }
  }

  function close() { setOpen(false); setAdding(false); setConfirmDel(null) }

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => { setOpen(o => !o); setAdding(false); setConfirmDel(null) }}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '5px 12px', borderRadius: 20, border: '2px solid',
          borderColor: current?.color ?? 'var(--text-4)',
          background: (current?.color ?? 'var(--text-4)') + '22',
          color: current?.color ?? 'var(--text-4)',
          fontWeight: 700, fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap',
        }}
      >
        🗓 {current?.label ?? '—'} ▾
      </button>

      {open && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 199 }} onClick={close} />
          <div style={{
            position: 'absolute', top: 'calc(100% + 6px)', right: 0, zIndex: 200,
            background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10,
            boxShadow: '0 8px 24px rgba(0,0,0,0.12)', minWidth: 210, overflow: 'hidden',
          }}>
            {seasons.map(s => (
              <div key={s.id}>
                {confirmDel === s.id ? (
                  <div style={{ padding: '8px 12px', background: '#fef2f2', borderBottom: '1px solid #fecaca' }}>
                    <p style={{ margin: '0 0 6px', fontSize: 12, color: '#dc2626', fontWeight: 600 }}>
                      Supprimer « {s.label} » et toutes ses données ?
                    </p>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => handleDelete(s.id)} disabled={deleting}
                        style={{ padding: '4px 10px', borderRadius: 6, border: 'none', background: '#dc2626', color: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                        {deleting ? '⏳' : 'Supprimer'}
                      </button>
                      <button onClick={() => setConfirmDel(null)}
                        style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-2)', cursor: 'pointer', fontSize: 12 }}>
                        Annuler
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <button onClick={() => { setSeason(s.id); close() }}
                      style={{
                        flex: 1, display: 'flex', alignItems: 'center', gap: 8,
                        padding: '10px 12px 10px 16px', border: 'none',
                        background: s.id === season ? s.color + '22' : 'var(--surface)',
                        cursor: 'pointer', fontSize: 14,
                        fontWeight: s.id === season ? 700 : 400,
                        color: s.id === season ? s.color : 'var(--text)', textAlign: 'left',
                      }}
                    >
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
                      {s.label}
                      {s.id === season && <span style={{ marginLeft: 'auto', fontSize: 12, paddingRight: 4 }}>✓</span>}
                    </button>
                    {seasons.length > 1 && (
                      <button
                        onClick={e => { e.stopPropagation(); setConfirmDel(s.id); setAdding(false) }}
                        title="Supprimer cette saison"
                        style={{ padding: '10px 12px', border: 'none', background: 'transparent', cursor: 'pointer', color: '#cbd5e1', fontSize: 14, lineHeight: 1 }}
                        onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                        onMouseLeave={e => e.currentTarget.style.color = '#cbd5e1'}
                      >🗑</button>
                    )}
                  </div>
                )}
              </div>
            ))}

            <div style={{ borderTop: '1px solid var(--surface-3)' }}>
              {!adding ? (
                <button onClick={openAdd}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                    padding: '10px 16px', border: 'none', background: 'var(--surface)',
                    cursor: 'pointer', fontSize: 13, color: 'var(--text-3)', textAlign: 'left',
                  }}
                >
                  <span style={{ fontSize: 16, lineHeight: 1 }}>＋</span> Nouvelle saison
                </button>
              ) : (
                <form onSubmit={confirmAdd} style={{ padding: '8px 12px', display: 'flex', gap: 6 }}>
                  <input
                    ref={inputRef}
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    placeholder="ex: Hiver 2027"
                    style={{ flex: 1, padding: '5px 8px', border: '1px solid var(--border)', borderRadius: 6, fontSize: 13, outline: 'none' }}
                    onKeyDown={e => e.key === 'Escape' && setAdding(false)}
                  />
                  <button type="submit" disabled={!newName.trim()}
                    style={{
                      padding: '5px 10px', borderRadius: 6, border: 'none',
                      background: newName.trim() ? '#2563eb' : 'var(--border)',
                      color: newName.trim() ? '#fff' : 'var(--text-4)',
                      cursor: newName.trim() ? 'pointer' : 'default', fontSize: 13, fontWeight: 600,
                    }}
                  >OK</button>
                </form>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// En-tête commun aux pages (bouton retour + titre + sélecteur de saison + onglets éventuels)
function PageShell({ title, onHome, withSeason = true, tabs = null, rightExtra = null, children }) {
  return (
    <div className="app">
      <header className="app-header">
        <div className="header-top" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <BackButton onHome={onHome} />
            <h1>{title}</h1>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {rightExtra}
            {withSeason && <SeasonBadge />}
          </div>
        </div>
        {tabs ? <nav className="tab-nav">{tabs}</nav> : <div style={{ height: 16 }} />}
      </header>
      <main className="app-main">{children}</main>
    </div>
  )
}

// Cahier des entrées = Suivi livraisons + Entrées réunis (sous-onglets)
const CAHIER_TABS = [
  { id: 'suivi',   label: '📦 Suivi livraisons' },
  { id: 'entrees', label: '📥 Entrées' },
]

function CahierEntrees({ onHome }) {
  const [tab, setTab] = useState('suivi')
  const { magasin: magasinCourant, setMagasin } = useMagasin()
  const magasin = magasinCourant?.nom || ''

  function selectMagasin(m) { setMagasin(m) }
  function changeMagasin() { setMagasin(null) }

  if (!magasin) return <StoreSelect onSelect={selectMagasin} onHome={onHome}
    theme={{ accent: '#1d4ed8', border: '#93c5fd', shadow: 'rgba(29,78,216,0.18)', gradient: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', icon: '📥' }} />

  return (
    <PageShell
      title="📥 Cahier des entrées"
      onHome={onHome}
      rightExtra={
        <button onClick={changeMagasin}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 20, border: '2px solid #93c5fd', background: '#eff6ff', color: '#1d4ed8', fontWeight: 700, fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap' }}>
          🏪 {magasin} &#9662;
        </button>
      }
      tabs={CAHIER_TABS.map(t => (
        <button key={t.id} className={`tab-btn${tab === t.id ? ' active' : ''}`} onClick={() => setTab(t.id)}>{t.label}</button>
      ))}
    >
      {tab === 'suivi'   && <SuiviLivraisons />}
      {tab === 'entrees' && <Entrees defaultMagasin={magasin} />}
    </PageShell>
  )
}

// Top modèles & réassorts (par magasin, liés à la saison)
function ReassortApp({ onHome }) {
  const { magasin, setMagasin } = useMagasin()
  function selectMagasin(m) { setMagasin(m) }
  function changeMagasin() { setMagasin(null) }

  if (!magasin) return <StoreSelect onSelect={selectMagasin} onHome={onHome}
    theme={{ accent: '#059669', border: '#6ee7b7', shadow: 'rgba(5,150,105,0.18)', gradient: 'linear-gradient(135deg, #10b981, #047857)', icon: '⭐' }} />

  return (
    <PageShell
      title="⭐ Top modèles & réassorts"
      onHome={onHome}
      rightExtra={
        <button onClick={changeMagasin}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 20, border: '2px solid #6ee7b7', background: '#ecfdf5', color: '#047857', fontWeight: 700, fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap' }}>
          🏪 {magasin.nom} &#9662;
        </button>
      }
    >
      <Reassort magasin={magasin} />
    </PageShell>
  )
}

function Root() {
  const [view,      setView]      = useState('home')
  const [unlocked,  setUnlocked]  = useState(new Set())
  const [pinTarget, setPinTarget] = useState(null) // vue en attente de déverrouillage

  function open(v) {
    if (PROTECTED_TABS.has(v) && !unlocked.has(v)) setPinTarget(v)
    else setView(v)
  }
  function handlePinSuccess() {
    setUnlocked(prev => new Set([...prev, pinTarget]))
    setView(pinTarget)
    setPinTarget(null)
  }
  const home = () => setView('home')
  const { magasin, setMagasin } = useMagasin()
  const alerts  = useAlerts(magasin)
  const tablet  = useMediaQuery(TABLET)
  const [drawer,    setDrawer]    = useState(false)
  const [collapsed, setCollapsed] = useState(() => { try { return localStorage.getItem('sidebar_collapsed') === '1' } catch { return false } })
  function toggleCollapse() {
    setCollapsed(c => { try { localStorage.setItem('sidebar_collapsed', c ? '0' : '1') } catch { /* ignore */ } return !c })
  }
  function navigate(v) { setDrawer(false); open(v) }

  let content
  if (view === 'cahier')          content = <CahierEntrees onHome={home} />
  else if (view === 'commandes')  content = <Commandes onHome={home} />
  else if (view === 'defectueux') content = <Defectueux onHome={home} />
  else if (view === 'paie')       content = <PageShell title="🧾 Éléments variables de paie" onHome={home} withSeason={false}><Paie /></PageShell>
  else if (view === 'achats')     content = <PageShell title="🛒 Achats" onHome={home}><Achats /></PageShell>
  else if (view === 'repertoire') content = <PageShell title="📒 Répertoire fournisseurs" onHome={home} withSeason={false}><Repertoire /></PageShell>
  else if (view === 'reglement')  content = <PageShell title="💳 Plan de règlement" onHome={home}><PlanReglement /></PageShell>
  else if (view === 'parametres') content = <PageShell title="⚙️ Paramètres" onHome={home}><Parametres /></PageShell>
  else if (view === 'factures')   content = <PageShell title="📄 Factures" onHome={home} withSeason={false}><Factures /></PageShell>
  else if (view === 'planning')   content = <Planning onHome={home} />
  else if (view === 'sav')        content = <Sav onHome={home} />
  else if (view === 'reassort')   content = <ReassortApp onHome={home} />
  else                            content = <HomeScreen onOpen={open} alerts={alerts} onMenu={() => setDrawer(true)} />

  const sidebarProps = { view, magasin, setMagasin, alerts, onOpen: navigate }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Barre latérale toujours visible sur ordinateur */}
      {!tablet && (
        <aside style={{ width: collapsed ? 68 : 248, flexShrink: 0, position: 'sticky', top: 0, height: '100vh', background: 'var(--surface)', borderRight: '1px solid var(--border)', zIndex: 20, transition: 'width .2s' }}>
          <Sidebar {...sidebarProps} collapsed={collapsed} onToggleCollapse={toggleCollapse} />
        </aside>
      )}
      {/* Tablette / téléphone : tiroir ouvert par le bouton ☰ */}
      {tablet && drawer && (
        <>
          <div onClick={() => setDrawer(false)} style={{ position: 'fixed', inset: 0, zIndex: 900, background: 'rgba(15,23,42,0.45)' }} />
          <aside style={{ position: 'fixed', left: 0, top: 0, bottom: 0, width: 280, maxWidth: '85vw', zIndex: 901, background: 'var(--surface)', boxShadow: '8px 0 30px rgba(0,0,0,0.25)' }}>
            <Sidebar {...sidebarProps} />
          </aside>
        </>
      )}
      {tablet && view !== 'home' && !drawer && (
        <button onClick={() => setDrawer(true)} aria-label="Menu" title="Menu"
          style={{
            position: 'fixed', bottom: 20, left: 16, zIndex: 90, width: 46, height: 46, borderRadius: '50%', cursor: 'pointer',
            border: '1px solid var(--border)', background: 'var(--surface)', fontSize: 20, color: 'var(--text-2)', boxShadow: '0 4px 14px var(--shadow-lg)',
          }}>☰</button>
      )}

      <div style={{ flex: 1, minWidth: 0 }}>
        {content}
      </div>
      {pinTarget && <PinModal onSuccess={handlePinSuccess} onClose={() => setPinTarget(null)} />}
    </div>
  )
}

export default function App() {
  return (
    <SeasonProvider>
      <MagasinProvider>
        <ThemeToggle />
        <Root />
      </MagasinProvider>
    </SeasonProvider>
  )
}
