import { useState, useEffect, useRef } from 'react'

export default function ComboBox({ value, onChange, options = [], placeholder }) {
  const [open,  setOpen]  = useState(false)
  const [query, setQuery] = useState(value ?? '')
  const containerRef = useRef(null)

  useEffect(() => { setQuery(value ?? '') }, [value])

  const filtered = query
    ? options.filter(o => o.toLowerCase().includes(query.toLowerCase()))
    : options

  function select(opt) {
    onChange(opt)
    setQuery(opt)
    setOpen(false)
  }

  function handleInput(e) {
    const v = e.target.value
    setQuery(v)
    onChange(v)
    setOpen(true)
  }

  useEffect(() => {
    function onDown(e) {
      if (!containerRef.current?.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [])

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <input
        value={query}
        onChange={handleInput}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        autoComplete="off"
        style={{ width: '100%' }}
      />
      {open && filtered.length > 0 && (
        <div style={{
          position: 'absolute', zIndex: 300, top: 'calc(100% + 2px)', left: 0, right: 0,
          background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8,
          maxHeight: 260, overflowY: 'auto',
          boxShadow: '0 6px 24px rgba(0,0,0,0.13)',
        }}>
          {filtered.map(opt => (
            <div
              key={opt}
              onMouseDown={() => select(opt)}
              style={{ padding: '8px 14px', fontSize: 14, cursor: 'pointer', borderBottom: '1px solid #f8fafc' }}
              onMouseEnter={e => { e.currentTarget.style.background = '#eff6ff'; e.currentTarget.style.color = '#2563eb' }}
              onMouseLeave={e => { e.currentTarget.style.background = ''; e.currentTarget.style.color = '' }}
            >
              {opt}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
