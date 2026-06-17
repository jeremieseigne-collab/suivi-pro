import { useState } from 'react'
import { useLiveQuery } from '../lib/useLiveQuery'
import { db } from '../db'

// theme = { accent, border, shadow, gradient, icon }
const DEFAULT_THEME = {
  accent:   'var(--accent)',
  border:   '#93c5fd',
  shadow:   'rgba(59,130,246,0.18)',
  gradient: 'linear-gradient(135deg, var(--accent), #2563eb)',
  icon:     '🏪',
}

export default function StoreSelect({ onSelect, onHome, description = '', theme = {} }) {
  const [hover, setHover] = useState(null)
  const magasins = useLiveQuery(() => db.magasins.orderBy('nom').toArray(), [])
  const t = { ...DEFAULT_THEME, ...theme }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', padding: 24,
      background: 'var(--bg-grad)',
    }}>
      <button onClick={onHome}
        style={{ position: 'fixed', top: 20, left: 20, border: '1px solid var(--border)', background: 'var(--surface)', borderRadius: 9, width: 38, height: 38, cursor: 'pointer', fontSize: 17, color: 'var(--text-2)' }}
        title="Retour">←</button>

      <div style={{ textAlign: 'center', marginBottom: 36 }}>
        <div style={{ fontSize: 34 }}>{t.icon}</div>
        <h1 style={{ fontSize: 30, fontWeight: 800, color: 'var(--text)', letterSpacing: -0.5, marginTop: 6 }}>
          Dans quel magasin êtes-vous ?
        </h1>
        {description && (
          <p style={{ fontSize: 15, color: 'var(--text-3)', marginTop: 8 }}>{description}</p>
        )}
      </div>

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center' }}>
        {(magasins || []).map(m => (
          <button key={m.id}
            onClick={() => onSelect(m)}
            onMouseEnter={() => setHover(m.id)}
            onMouseLeave={() => setHover(null)}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
              background: 'var(--surface)', border: '2px solid',
              borderColor: hover === m.id ? t.accent : 'var(--border)',
              borderRadius: 18, padding: '28px 24px', cursor: 'pointer', width: 200,
              boxShadow: hover === m.id ? `0 14px 34px ${t.shadow}` : '0 4px 16px var(--shadow)',
              transform: hover === m.id ? 'translateY(-4px)' : 'none', transition: 'all 0.2s ease',
            }}>
            <div style={{
              width: 56, height: 56, borderRadius: 14, background: t.gradient,
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28,
            }}>{t.icon}</div>
            <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', textAlign: 'center' }}>{m.nom}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
