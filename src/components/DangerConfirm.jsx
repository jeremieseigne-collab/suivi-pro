import { useState } from 'react'
import { createRoot } from 'react-dom/client'

// Confirmation renforcée pour les actions irréversibles (suppression de saison, marque, magasin, fusion).
// Usage : if (!(await confirmDanger({ title, message, word, pin }))) return
//   - word : texte à retaper à l'identique pour confirmer (ex. le nom de la marque)
//   - pin  : code à saisir en plus (optionnel)
export function confirmDanger(opts) {
  return new Promise(resolve => {
    const host = document.createElement('div')
    document.body.appendChild(host)
    const root = createRoot(host)
    const done = ok => { root.unmount(); host.remove(); resolve(ok) }
    root.render(<DangerConfirm {...opts} onDone={done} />)
  })
}

const norm = s => (s || '').trim().toLowerCase()

// eslint-disable-next-line react-refresh/only-export-components -- composant interne, monté via confirmDanger()
function DangerConfirm({ title, message, word, pin, confirmLabel = 'Supprimer définitivement', onDone }) {
  const [typed, setTyped]   = useState('')
  const [pinVal, setPinVal] = useState('')
  const ok = norm(typed) === norm(word) && (!pin || pinVal === pin)

  const field = { width: '100%', boxSizing: 'border-box', padding: '10px 12px', fontSize: 15, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', marginTop: 6 }

  return (
    <div className="modal-overlay" style={{ zIndex: 3000 }} onClick={() => onDone(false)}>
      <form className="modal" style={{ maxWidth: 440, padding: 24 }} onClick={e => e.stopPropagation()}
        onSubmit={e => { e.preventDefault(); if (ok) onDone(true) }}>
        <h2 style={{ margin: '0 0 10px', fontSize: 18, color: '#dc2626' }}>⚠️ {title}</h2>
        <div style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.5, whiteSpace: 'pre-line' }}>{message}</div>
        <p style={{ fontSize: 14, fontWeight: 700, color: '#dc2626', margin: '14px 0 0' }}>Cette action est irréversible.</p>

        <label style={{ display: 'block', marginTop: 16, fontSize: 13, color: 'var(--text-3)' }}>
          Pour confirmer, tapez <strong style={{ color: 'var(--text)' }}>{word}</strong>
          <input autoFocus value={typed} onChange={e => setTyped(e.target.value)} style={field} autoComplete="off" />
        </label>
        {pin && (
          <label style={{ display: 'block', marginTop: 12, fontSize: 13, color: 'var(--text-3)' }}>
            Code PIN
            <input type="password" inputMode="numeric" value={pinVal} onChange={e => setPinVal(e.target.value)} style={field} autoComplete="off" />
          </label>
        )}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
          <button type="button" className="btn-secondary" onClick={() => onDone(false)}>Annuler</button>
          <button type="submit" disabled={!ok}
            style={{ padding: '10px 18px', borderRadius: 8, border: 'none', fontWeight: 700, fontSize: 14, color: '#fff', background: '#dc2626', opacity: ok ? 1 : 0.4, cursor: ok ? 'pointer' : 'not-allowed' }}>
            {confirmLabel}
          </button>
        </div>
      </form>
    </div>
  )
}
