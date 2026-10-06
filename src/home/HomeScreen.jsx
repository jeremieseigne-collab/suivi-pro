import { useMagasin } from '../context/MagasinContext'
import { useMediaQuery, PHONE, TABLET } from '../lib/useMediaQuery'
import AgendaBoard from '../agenda/AgendaBoard'

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

export default function HomeScreen({ onOpen, alerts, onMenu }) {
  const { magasin } = useMagasin()
  const phone = useMediaQuery(PHONE)
  const tablet = useMediaQuery(TABLET)
  const today = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
  const salut = new Date().getHours() < 18 ? 'Bonjour' : 'Bonsoir'

  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg)', padding: phone ? '14px 12px 72px' : tablet ? '24px 24px 72px' : '32px 40px 64px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <header style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: phone ? 16 : 24 }}>
          {tablet && (
            <button onClick={onMenu} aria-label="Menu"
              style={{ width: 40, height: 40, flexShrink: 0, borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface)', cursor: 'pointer', fontSize: 18, color: 'var(--text-2)' }}>☰</button>
          )}
          <div style={{ minWidth: 0 }}>
            <h1 style={{ fontSize: phone ? 22 : 30, fontWeight: 800, color: 'var(--text)', letterSpacing: -0.8, margin: 0 }}>{salut} 👋</h1>
            <div style={{ fontSize: 14, color: 'var(--text-3)', marginTop: 2 }}>
              <span style={{ textTransform: 'capitalize' }}>{today}</span>
              {magasin && <> · <strong style={{ color: 'var(--text-2)' }}>{magasin.nom}</strong></>}
            </div>
          </div>
        </header>

        {!magasin && (
          <div style={{ marginBottom: 20, padding: '12px 16px', borderRadius: 12, background: 'var(--accent-bg)', color: 'var(--accent)', fontSize: 14, fontWeight: 600 }}>
            🏪 Choisis ton magasin dans le menu{tablet ? ' ☰' : ' à gauche'} : tous les outils l'utiliseront directement.
          </div>
        )}

        <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase', color: 'var(--text-4)', marginBottom: 10 }}>
          Aujourd'hui {magasin ? `· ${magasin.nom}` : '· tous magasins'}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fill, minmax(${phone ? 140 : 190}px, 1fr))`, gap: phone ? 8 : 12, marginBottom: phone ? 24 : 32 }}>
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
  )
}
