import { useState, useRef, useEffect } from 'react'
import { db } from './db'
import SuiviLivraisons from './tabs/SuiviLivraisons'
import Entrees         from './tabs/Entrees'
import Achats          from './tabs/Achats'
import PlanReglement   from './tabs/PlanReglement'
import Parametres      from './tabs/Parametres'
import { SeasonProvider, useSeason } from './context/SeasonContext'
import './App.css'

const PIN_CODE       = '2201'
const PROTECTED_TABS = new Set(['reglement', 'parametres'])

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
      <div style={{ background: '#fff', borderRadius: 16, padding: '32px 40px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)', textAlign: 'center', minWidth: 280 }}
        onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: 32, marginBottom: 8 }}>🔒</div>
        <h2 style={{ margin: '0 0 6px', fontSize: 18, fontWeight: 700, color: '#0f172a' }}>Accès restreint</h2>
        <p style={{ margin: '0 0 24px', fontSize: 13, color: '#64748b' }}>Entrez le code à 4 chiffres</p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginBottom: 16 }}>
          {digits.map((d, i) => (
            <input key={i} ref={refs[i]}
              type="password" inputMode="numeric" maxLength={1} value={d}
              onChange={e => handleDigit(i, e.target.value)}
              onKeyDown={e => handleKeyDown(i, e)}
              style={{
                width: 52, height: 56, textAlign: 'center', fontSize: 24, fontWeight: 700,
                border: `2px solid ${error ? '#ef4444' : d ? '#3b82f6' : '#e2e8f0'}`,
                borderRadius: 10, outline: 'none', background: error ? '#fef2f2' : '#f8fafc',
                color: error ? '#ef4444' : '#0f172a', transition: 'border-color .15s',
              }}
            />
          ))}
        </div>
        {error && <p style={{ margin: '0 0 8px', fontSize: 13, color: '#ef4444', fontWeight: 600 }}>Code incorrect</p>}
        <button onClick={onClose}
          style={{ marginTop: 4, fontSize: 13, color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer' }}>
          Annuler
        </button>
      </div>
    </div>
  )
}

const TABS = [
  { id: 'suivi',      label: '📦 Suivi livraisons' },
  { id: 'entrees',    label: '📥 Entrées' },
  { id: 'achats',     label: '🛒 Achats' },
  { id: 'reglement',  label: '💳 Plan de règlement' },
  { id: 'parametres', label: '⚙️ Paramètres' },
]

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
          borderColor: current?.color ?? '#94a3b8',
          background: (current?.color ?? '#94a3b8') + '22',
          color: current?.color ?? '#94a3b8',
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
            background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10,
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
                        style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', fontSize: 12 }}>
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
                        background: s.id === season ? s.color + '22' : '#fff',
                        cursor: 'pointer', fontSize: 14,
                        fontWeight: s.id === season ? 700 : 400,
                        color: s.id === season ? s.color : '#1e293b', textAlign: 'left',
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

            <div style={{ borderTop: '1px solid #f1f5f9' }}>
              {!adding ? (
                <button onClick={openAdd}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                    padding: '10px 16px', border: 'none', background: '#fff',
                    cursor: 'pointer', fontSize: 13, color: '#64748b', textAlign: 'left',
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
                    style={{ flex: 1, padding: '5px 8px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 13, outline: 'none' }}
                    onKeyDown={e => e.key === 'Escape' && setAdding(false)}
                  />
                  <button type="submit" disabled={!newName.trim()}
                    style={{
                      padding: '5px 10px', borderRadius: 6, border: 'none',
                      background: newName.trim() ? '#2563eb' : '#e2e8f0',
                      color: newName.trim() ? '#fff' : '#94a3b8',
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

function AppInner() {
  const [activeTab, setActiveTab] = useState('suivi')
  const [unlocked,  setUnlocked]  = useState(new Set())
  const [pinTarget, setPinTarget] = useState(null) // tab en attente de déverrouillage

  function handleTabClick(id) {
    if (PROTECTED_TABS.has(id) && !unlocked.has(id)) {
      setPinTarget(id)
    } else {
      setActiveTab(id)
    }
  }

  function handlePinSuccess() {
    setUnlocked(prev => new Set([...prev, pinTarget]))
    setActiveTab(pinTarget)
    setPinTarget(null)
  }

  return (
    <div className="app">
      {pinTarget && (
        <PinModal
          onSuccess={handlePinSuccess}
          onClose={() => setPinTarget(null)}
        />
      )}

      <header className="app-header">
        <div className="header-top" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h1>Suivi Pro</h1>
          <SeasonBadge />
        </div>
        <nav className="tab-nav">
          {TABS.map(t => (
            <button
              key={t.id}
              className={`tab-btn${activeTab === t.id ? ' active' : ''}`}
              onClick={() => handleTabClick(t.id)}
            >
              {t.label}{PROTECTED_TABS.has(t.id) && !unlocked.has(t.id) ? ' 🔒' : ''}
            </button>
          ))}
        </nav>
      </header>

      <main className="app-main">
        {activeTab === 'suivi'      && <SuiviLivraisons />}
        {activeTab === 'entrees'    && <Entrees />}
        {activeTab === 'achats'     && <Achats />}
        {activeTab === 'reglement'  && <PlanReglement />}
        {activeTab === 'parametres' && <Parametres />}
      </main>
    </div>
  )
}

export default function App() {
  return (
    <SeasonProvider>
      <AppInner />
    </SeasonProvider>
  )
}
