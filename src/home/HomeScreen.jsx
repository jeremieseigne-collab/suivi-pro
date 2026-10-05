import { useState, useEffect } from 'react'
import { db } from '../db'
import { useLiveQuery } from '../lib/useLiveQuery'
import { useMagasin } from '../context/MagasinContext'
import { isActif, retard } from '../reassort/constants'
import { magasinCommandes } from '../commandes/constants'
import AgendaBoard from '../agenda/AgendaBoard'

// Outils rangés par groupes dans la barre latérale
const GROUPS = [
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

function useIsMobile() {
  const q = '(max-width: 900px)'
  const [mobile, setMobile] = useState(() => window.matchMedia(q).matches)
  useEffect(() => {
    const mq = window.matchMedia(q)
    const fn = e => setMobile(e.matches)
    mq.addEventListener('change', fn)
    return () => mq.removeEventListener('change', fn)
  }, [])
  return mobile
}

// Compteurs du tableau de bord (filtrés sur le magasin courant s'il y en a un)
function useAlerts(magasin) {
  return useLiveQuery(async () => {
    const [reassorts, defs, savs, cmds] = await Promise.all([
      db.reassorts.toArray(), db.defectueux.toArray(), db.sav.toArray(), db.commandes.toArray(),
    ])
    const mine = r => !magasin || r.magasinId === magasin.id
    const nomCmd = magasinCommandes(magasin?.nom)
    const cmdMine = c => !magasin || c.magasin === nomCmd
    const actifs = reassorts.filter(r => isActif(r) && mine(r))
    return {
      aCommander: actifs.filter(r => r.statut === 'À réassortir' || r.statut === 'Demandé').length,
      enRoute:    actifs.filter(r => r.statut === 'En route').length,
      retard:     actifs.filter(r => retard(r)).length,
      defATraiter: defs.filter(d => mine(d) && d.statut === 'À traiter').length,
      savEnCours: savs.filter(s => mine(s) && s.statut !== 'Clôturé' && s.statut !== 'Récupéré').length,
      cmdAPrevenir: cmds.filter(c => cmdMine(c) && c.statut === 'Reçue').length,
      cmdACommander: cmds.filter(c => cmdMine(c) && c.statut === 'À commander').length,
    }
  }, [magasin?.id])
}

function MagasinSwitcher({ magasin, setMagasin }) {
  const [open, setOpen] = useState(false)
  const magasins = useLiveQuery(() => db.magasins.orderBy('nom').toArray(), [])
  return (
    <div style={{ position: 'relative' }}>
      <button onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 12,
          border: '1px solid var(--border)', background: 'var(--surface-2)', cursor: 'pointer', textAlign: 'left',
        }}>
        <span style={{ fontSize: 18 }}>🏪</span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: 'block', fontSize: 11, color: 'var(--text-4)', fontWeight: 600 }}>Magasin</span>
          <span style={{ display: 'block', fontSize: 14, fontWeight: 700, color: magasin ? 'var(--text)' : 'var(--text-4)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {magasin?.nom || 'Choisir…'}
          </span>
        </span>
        <span style={{ color: 'var(--text-4)', fontSize: 12 }}>▾</span>
      </button>
      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 40 }} />
          <div style={{
            position: 'absolute', left: 0, right: 0, top: 'calc(100% + 6px)', zIndex: 50, padding: 6,
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

function NavItem({ item, badge, note, onOpen }) {
  return (
    <button onClick={() => onOpen(item.id)}
      style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 9,
        border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left', color: 'var(--text-2)', fontSize: 14, fontWeight: 500,
      }}
      onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface-2)'; e.currentTarget.style.color = 'var(--text)' }}
      onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--text-2)' }}>
      <span style={{ width: 22, textAlign: 'center', fontSize: 16 }}>{item.icon}</span>
      <span style={{ flex: 1, minWidth: 0 }}>
        {item.label}
        {note && <span style={{ display: 'block', fontSize: 11, color: '#d97706', fontWeight: 600 }}>{note}</span>}
      </span>
      {item.lock && <span style={{ fontSize: 11, opacity: 0.5 }}>🔒</span>}
      {badge?.n > 0 && (
        <span title={badge.title} style={{ minWidth: 20, height: 20, padding: '0 6px', borderRadius: 10, background: badge.color, color: '#fff', fontSize: 11, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {badge.n}
        </span>
      )}
    </button>
  )
}

function Sidebar({ magasin, setMagasin, alerts, onOpen }) {
  const jour = new Date().getDate()
  const badges = {
    reassort:   alerts?.retard ? { n: alerts.retard, color: '#f97316', title: 'Réassorts en retard' }
              : { n: alerts?.aCommander, color: '#ef4444', title: 'Réassorts à commander' },
    defectueux: { n: alerts?.defATraiter, color: '#e11d48', title: 'Défectueux à traiter' },
    commandes:  { n: alerts?.cmdAPrevenir, color: '#0891b2', title: 'Clients à prévenir' },
  }
  const notes = { paie: jour >= 15 && jour <= 25 ? 'À remplir avant le 25' : '' }
  return (
    <nav style={{ display: 'flex', flexDirection: 'column', gap: 18, padding: '20px 14px', height: '100%', overflowY: 'auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 4px' }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, var(--accent), #2563eb)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>👟</div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)', letterSpacing: -0.3 }}>Suivi Pro</div>
          <div style={{ fontSize: 11, color: 'var(--text-4)' }}>B'Shoes · JR Shoes</div>
        </div>
      </div>
      <MagasinSwitcher magasin={magasin} setMagasin={setMagasin} />
      {GROUPS.map(g => (
        <div key={g.title}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase', color: 'var(--text-4)', padding: '0 10px 6px' }}>{g.title}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {g.items.map(it => <NavItem key={it.id} item={it} badge={badges[it.id]} note={notes[it.id]} onOpen={onOpen} />)}
          </div>
        </div>
      ))}
    </nav>
  )
}

function Widget({ icon, value, label, sub, color, onClick }) {
  const zero = !value
  return (
    <button onClick={onClick}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 4, padding: '16px 18px', borderRadius: 16,
        border: '1px solid var(--border)', background: 'var(--surface)', cursor: 'pointer', textAlign: 'left',
        boxShadow: '0 1px 4px var(--shadow)', transition: 'transform .15s, box-shadow .15s', position: 'relative', overflow: 'hidden',
      }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 10px 24px var(--shadow)' }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 1px 4px var(--shadow)' }}>
      <span style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, background: zero ? 'var(--surface-3)' : color }} />
      <span style={{ fontSize: 20 }}>{icon}</span>
      <span style={{ fontSize: 30, fontWeight: 800, lineHeight: 1, color: zero ? 'var(--text-5)' : color, letterSpacing: -1 }}>{value ?? '…'}</span>
      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-2)' }}>{label}</span>
      {sub && <span style={{ fontSize: 12, fontWeight: 600, color: sub.color || 'var(--text-4)' }}>{sub.text}</span>}
    </button>
  )
}

export default function HomeScreen({ onOpen }) {
  const { magasin, setMagasin } = useMagasin()
  const alerts = useAlerts(magasin)
  const mobile = useIsMobile()
  const [drawer, setDrawer] = useState(false)
  const today = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
  const h = new Date().getHours()
  const salut = h < 18 ? 'Bonjour' : 'Bonsoir'

  const sidebar = <Sidebar magasin={magasin} setMagasin={setMagasin} alerts={alerts} onOpen={id => { setDrawer(false); onOpen(id) }} />

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: 'var(--bg)' }}>
      {!mobile && (
        <aside style={{ width: 264, flexShrink: 0, position: 'sticky', top: 0, height: '100vh', background: 'var(--surface)', borderRight: '1px solid var(--border)' }}>
          {sidebar}
        </aside>
      )}
      {mobile && drawer && (
        <>
          <div onClick={() => setDrawer(false)} style={{ position: 'fixed', inset: 0, zIndex: 90, background: 'rgba(15,23,42,0.45)' }} />
          <aside style={{ position: 'fixed', left: 0, top: 0, bottom: 0, width: 280, zIndex: 100, background: 'var(--surface)', boxShadow: '8px 0 30px rgba(0,0,0,0.25)' }}>
            {sidebar}
          </aside>
        </>
      )}

      <main style={{ flex: 1, minWidth: 0, padding: mobile ? '16px 16px 64px' : '32px 40px 64px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <header style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
            {mobile && (
              <button onClick={() => setDrawer(true)} aria-label="Menu"
                style={{ width: 40, height: 40, borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface)', cursor: 'pointer', fontSize: 18, color: 'var(--text-2)' }}>☰</button>
            )}
            <div>
              <h1 style={{ fontSize: mobile ? 24 : 30, fontWeight: 800, color: 'var(--text)', letterSpacing: -0.8, margin: 0 }}>{salut} 👋</h1>
              <div style={{ fontSize: 14, color: 'var(--text-3)', marginTop: 2 }}>
                <span style={{ textTransform: 'capitalize' }}>{today}</span>
                {magasin && <> · <strong style={{ color: 'var(--text-2)' }}>{magasin.nom}</strong></>}
              </div>
            </div>
          </header>

          {!magasin && (
            <div style={{ marginBottom: 20, padding: '12px 16px', borderRadius: 12, background: 'var(--accent-bg)', color: 'var(--accent)', fontSize: 14, fontWeight: 600 }}>
              🏪 Choisis ton magasin dans le menu{mobile ? ' ☰' : ' à gauche'} : tous les outils l'utiliseront directement.
            </div>
          )}

          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase', color: 'var(--text-4)', marginBottom: 10 }}>
            Aujourd'hui {magasin ? `· ${magasin.nom}` : '· tous magasins'}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fill, minmax(${mobile ? 150 : 190}px, 1fr))`, gap: 12, marginBottom: 32 }}>
            <Widget icon="⚠️" value={alerts?.aCommander} label="Réassorts à commander" color="#ef4444" onClick={() => onOpen('reassort')} />
            <Widget icon="🚚" value={alerts?.enRoute} label="Réassorts en route" color="#8b5cf6" onClick={() => onOpen('reassort')}
              sub={alerts?.retard ? { text: `⏰ dont ${alerts.retard} en retard`, color: '#f97316' } : null} />
            <Widget icon="🛍️" value={alerts?.cmdAPrevenir} label="Clients à prévenir" color="#0891b2" onClick={() => onOpen('commandes')}
              sub={alerts?.cmdACommander ? { text: `${alerts.cmdACommander} à commander` } : null} />
            <Widget icon="🛠️" value={alerts?.defATraiter} label="Défectueux à traiter" color="#e11d48" onClick={() => onOpen('defectueux')} />
            <Widget icon="🔧" value={alerts?.savEnCours} label="Dossiers SAV en cours" color="#0e7490" onClick={() => onOpen('sav')} />
          </div>

          <AgendaBoard />
        </div>
      </main>
    </div>
  )
}
