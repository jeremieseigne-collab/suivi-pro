import { useState } from 'react'
import { db } from '../db'
import { useLiveQuery } from '../lib/useLiveQuery'

// Outils rangés par groupes dans la barre latérale
const GROUPS = [
  { title: null, items: [
    { id: 'home', icon: '🏠', label: 'Accueil' },
  ] },
  { title: 'Au quotidien', items: [
    { id: 'cahier',     icon: '📥', label: 'Cahier des entrées' },
    { id: 'reassort',   icon: '⭐', label: 'Top modèles & réassorts' },
    { id: 'sav',        icon: '🔧', label: 'SAV' },
    { id: 'defectueux', icon: '🛠️', label: 'Défectueux' },
    { id: 'commandes',  icon: '🛍️', label: 'Commandes clients' },
  ] },
  { title: 'Équipe', items: [
    { id: 'planning', icon: '📅', label: 'Planning' },
    { id: 'paie',     icon: '🧾', label: 'Éléments de paie' },
  ] },
  { title: 'Gestion', items: [
    { id: 'achats',     icon: '🛒', label: 'Achats' },
    { id: 'factures',   icon: '📄', label: 'Factures' },
    { id: 'repertoire', icon: '📒', label: 'Répertoire' },
    { id: 'reglement',  icon: '💳', label: 'Plan de règlement', lock: true },
    { id: 'parametres', icon: '⚙️', label: 'Paramètres',        lock: true },
  ] },
]

function MagasinSwitcher({ magasin, setMagasin, collapsed }) {
  const [open, setOpen] = useState(false)
  const magasins = useLiveQuery(() => db.magasins.orderBy('nom').toArray(), [])
  return (
    <div style={{ position: 'relative' }}>
      <button onClick={() => setOpen(o => !o)} title={collapsed ? (magasin?.nom || 'Choisir un magasin') : undefined}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'flex-start', gap: 10,
          padding: collapsed ? '10px 0' : '10px 12px', borderRadius: 12,
          border: '1px solid var(--border)', background: 'var(--surface-2)', cursor: 'pointer', textAlign: 'left',
        }}>
        <span style={{ fontSize: 18 }}>🏪</span>
        {!collapsed && (
          <>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: 'block', fontSize: 11, color: 'var(--text-4)', fontWeight: 600 }}>Magasin</span>
              <span style={{ display: 'block', fontSize: 14, fontWeight: 700, color: magasin ? 'var(--text)' : 'var(--text-4)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {magasin?.nom || 'Choisir…'}
              </span>
            </span>
            <span style={{ color: 'var(--text-4)', fontSize: 12 }}>▾</span>
          </>
        )}
      </button>
      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 40 }} />
          <div style={{
            position: 'absolute', left: 0, top: 'calc(100% + 6px)', width: 220, zIndex: 50, padding: 6,
            background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, boxShadow: '0 10px 30px var(--shadow)',
          }}>
            {(magasins || []).map(m => (
              <button key={m.id} onClick={() => { setMagasin(m); setOpen(false) }}
                style={{
                  width: '100%', display: 'flex', justifyContent: 'space-between', padding: '9px 10px', borderRadius: 8, border: 'none',
                  background: magasin?.id === m.id ? 'var(--accent-bg)' : 'none', color: magasin?.id === m.id ? 'var(--accent)' : 'var(--text)',
                  fontSize: 14, fontWeight: magasin?.id === m.id ? 700 : 500, cursor: 'pointer', textAlign: 'left',
                }}>
                {m.nom}{magasin?.id === m.id && <span>✓</span>}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function NavItem({ item, active, badge, note, collapsed, onOpen }) {
  const [hover, setHover] = useState(false)
  const bg = active ? 'var(--accent-bg)' : hover ? 'var(--surface-2)' : 'none'
  return (
    <button onClick={() => onOpen(item.id)} title={collapsed ? item.label : undefined}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        position: 'relative', width: '100%', display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'flex-start', gap: 10,
        padding: collapsed ? '9px 0' : '8px 10px', borderRadius: 9, border: 'none', background: bg, cursor: 'pointer', textAlign: 'left',
        color: active ? 'var(--accent)' : hover ? 'var(--text)' : 'var(--text-2)', fontSize: 14, fontWeight: active ? 700 : 500,
      }}>
      <span style={{ width: 22, textAlign: 'center', fontSize: 16 }}>{item.icon}</span>
      {!collapsed && (
        <span style={{ flex: 1, minWidth: 0 }}>
          {item.label}
          {note && <span style={{ display: 'block', fontSize: 11, color: '#d97706', fontWeight: 600 }}>{note}</span>}
        </span>
      )}
      {!collapsed && item.lock && <span style={{ fontSize: 11, opacity: 0.5 }}>🔒</span>}
      {badge?.n > 0 && (
        <span title={badge.title} style={{
          minWidth: 20, height: 20, padding: '0 6px', borderRadius: 10, background: badge.color, color: '#fff', fontSize: 11, fontWeight: 800,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          ...(collapsed ? { position: 'absolute', top: 1, right: 6, minWidth: 16, height: 16, fontSize: 10, padding: '0 4px' } : {}),
        }}>
          {badge.n}
        </span>
      )}
    </button>
  )
}

export default function Sidebar({ view, magasin, setMagasin, alerts, onOpen, collapsed = false, onToggleCollapse }) {
  const jour = new Date().getDate()
  const badges = {
    reassort:   alerts?.retard ? { n: alerts.retard, color: '#f97316', title: 'Réassorts en retard' }
              : { n: alerts?.aCommander, color: '#ef4444', title: 'Réassorts à commander' },
    defectueux: { n: alerts?.defATraiter, color: '#e11d48', title: 'Défectueux à traiter' },
    commandes:  { n: alerts?.cmdAPrevenir, color: '#0891b2', title: 'Clients à prévenir' },
  }
  const notes = { paie: jour >= 15 && jour <= 25 ? 'À remplir avant le 25' : '' }
  return (
    <nav style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: collapsed ? '16px 8px' : '18px 14px', height: '100%', overflowY: 'auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'flex-start', gap: 10, padding: collapsed ? 0 : '0 4px' }}>
        <button onClick={() => onOpen('home')} title="Accueil"
          style={{ width: 36, height: 36, flexShrink: 0, borderRadius: 10, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, var(--accent), #2563eb)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>👟</button>
        {!collapsed && (
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)', letterSpacing: -0.3 }}>Suivi Pro</div>
            <div style={{ fontSize: 11, color: 'var(--text-4)' }}>B'Shoes · JR Shoes</div>
          </div>
        )}
      </div>
      <MagasinSwitcher magasin={magasin} setMagasin={setMagasin} collapsed={collapsed} />
      {GROUPS.map((g, i) => (
        <div key={i}>
          {g.title && !collapsed && (
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase', color: 'var(--text-4)', padding: '0 10px 6px' }}>{g.title}</div>
          )}
          {g.title && collapsed && <div style={{ height: 1, background: 'var(--border)', margin: '0 8px 8px' }} />}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {g.items.map(it => (
              <NavItem key={it.id} item={it} active={view === it.id} badge={badges[it.id]} note={notes[it.id]} collapsed={collapsed} onOpen={onOpen} />
            ))}
          </div>
        </div>
      ))}
      {onToggleCollapse && (
        <button onClick={onToggleCollapse} title={collapsed ? 'Déplier le menu' : 'Replier le menu'}
          style={{ marginTop: 'auto', alignSelf: collapsed ? 'center' : 'flex-start', padding: '6px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-3)', cursor: 'pointer', fontSize: 13 }}>
          {collapsed ? '»' : '« Replier'}
        </button>
      )}
    </nav>
  )
}
