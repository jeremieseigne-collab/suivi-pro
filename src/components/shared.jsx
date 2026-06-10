export function GaugeBar({ percent }) {
  const capped = Math.min(percent, 100)
  const color =
    percent === 0 ? '#e2e8f0' :
    percent >= 100 ? '#10b981' :
    percent >= 50 ? '#3b82f6' : '#f59e0b'
  return (
    <div style={{ width: '100%', height: 8, background: '#e2e8f0', borderRadius: 999, overflow: 'hidden' }}>
      <div style={{ width: `${capped}%`, height: '100%', background: color, borderRadius: 999, transition: 'width 0.4s' }} />
    </div>
  )
}

export function Badge({ children, color }) {
  const map = {
    green:  { bg: '#d1fae5', text: '#059669' },
    blue:   { bg: '#dbeafe', text: '#2563eb' },
    yellow: { bg: '#fef3c7', text: '#d97706' },
    gray:   { bg: '#f1f5f9', text: '#94a3b8' },
    red:    { bg: '#fee2e2', text: '#dc2626' },
  }
  const s = map[color] || map.gray
  return (
    <span style={{
      display: 'inline-block', padding: '2px 8px', borderRadius: 999,
      fontSize: 12, fontWeight: 600, background: s.bg, color: s.text, whiteSpace: 'nowrap'
    }}>
      {children}
    </span>
  )
}

export function LoadingState() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: '80px 0', color: '#64748b' }}>
      <div style={{
        width: 36, height: 36, border: '3px solid #e2e8f0', borderTopColor: '#3b82f6',
        borderRadius: '50%', animation: 'spin 0.7s linear infinite'
      }} />
      <p>Chargement…</p>
    </div>
  )
}

export function ErrorState({ message, onRetry }) {
  return (
    <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, padding: 24, textAlign: 'center', color: '#dc2626' }}>
      <p>❌ {message}</p>
      {onRetry && <button onClick={onRetry} style={{ marginTop: 12, background: '#dc2626', color: 'white', border: 'none', borderRadius: 8, padding: '8px 20px', cursor: 'pointer' }}>Réessayer</button>}
    </div>
  )
}

export function SearchInput({ value, onChange, placeholder }) {
  return (
    <input
      type="text"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder || '🔍 Rechercher…'}
      style={{
        flex: 1, minWidth: 200, padding: '9px 14px', border: '1px solid #e2e8f0',
        borderRadius: 8, fontSize: 14, outline: 'none'
      }}
    />
  )
}

export function Select({ value, onChange, options, label }) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      style={{ padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 14, background: 'white', cursor: 'pointer' }}
    >
      <option value="">{label || 'Tous'}</option>
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  )
}

export function fmt(n) {
  if (n == null || n === '') return '—'
  if (typeof n === 'number') return n.toLocaleString('fr-FR', { maximumFractionDigits: 2 })
  return n
}

export function fmtEur(n) {
  if (!n) return '—'
  return Number(n).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })
}
