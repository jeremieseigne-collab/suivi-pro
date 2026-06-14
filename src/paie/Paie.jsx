import { useState, useMemo } from 'react'
import { db } from '../db'
import { useLiveQuery } from '../lib/useLiveQuery'
import { LoadingState } from '../components/shared'
import { currentPeriode, periodeLabel, shiftPeriode } from './constants'
import { sendPaieRecap, buildRecapText, emailjsConfigured } from './mail'
import PaieForm from './PaieForm'

const RECAP_EMAIL = 'jeremie.seigne@gmail.com'
const PIN_CODE = '2201'

// ─── Petite modale code PIN (récap réservé) ──────────────────────────────────
function PinGate({ onSuccess, onClose }) {
  const [code, setCode] = useState('')
  const [error, setError] = useState(false)
  function submit(e) {
    e.preventDefault()
    if (code === PIN_CODE) onSuccess()
    else { setError(true); setCode('') }
  }
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(15,23,42,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={onClose}>
      <form onSubmit={submit} onClick={e => e.stopPropagation()}
        style={{ background: 'var(--surface)', borderRadius: 16, padding: '28px 36px', boxShadow: '0 20px 60px var(--shadow-lg)', textAlign: 'center', minWidth: 260 }}>
        <div style={{ fontSize: 30, marginBottom: 6 }}>🔒</div>
        <h2 style={{ margin: '0 0 14px', fontSize: 17, fontWeight: 700, color: 'var(--text)' }}>Récap réservé</h2>
        <input autoFocus type="password" inputMode="numeric" maxLength={4} value={code}
          onChange={e => { setCode(e.target.value.replace(/\D/g, '')); setError(false) }}
          placeholder="Code à 4 chiffres"
          style={{ width: 180, padding: '10px 12px', textAlign: 'center', fontSize: 18, letterSpacing: 4,
            border: `2px solid ${error ? '#ef4444' : 'var(--border)'}`, borderRadius: 10, outline: 'none',
            background: 'var(--surface-2)', color: 'var(--text)' }} />
        {error && <p style={{ margin: '8px 0 0', fontSize: 13, color: '#ef4444', fontWeight: 600 }}>Code incorrect</p>}
        <div style={{ marginTop: 16, display: 'flex', gap: 10, justifyContent: 'center' }}>
          <button type="button" onClick={onClose} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-2)', cursor: 'pointer' }}>Annuler</button>
          <button type="submit" style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: 'var(--on-accent, #fff)', cursor: 'pointer', fontWeight: 700 }}>Valider</button>
        </div>
      </form>
    </div>
  )
}

// ─── Vue récap (admin) ───────────────────────────────────────────────────────
function RecapView({ periode, rows, envoi, onBack }) {
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState(null)
  const recapText = buildRecapText(periode, rows)

  async function envoyer() {
    setBusy(true); setMsg(null)
    try {
      await sendPaieRecap({ periode, rows, toEmail: RECAP_EMAIL })
      const existing = await db.paieEnvois.where('periode').equals(periode).first()
      if (!existing) await db.paieEnvois.add({ periode })
      setMsg({ ok: true, text: `Récap envoyé à ${RECAP_EMAIL}.` })
    } catch (e) {
      setMsg({ ok: false, text: 'Envoi auto impossible (' + (e.message || e) + '). Utilise « Ouvrir dans Gmail ».' })
    } finally { setBusy(false) }
  }

  function gmail() {
    const su = `Éléments variables de paie — ${periodeLabel(periode)}`
    const url = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(RECAP_EMAIL)}&su=${encodeURIComponent(su)}&body=${encodeURIComponent(recapText)}`
    window.open(url, '_blank')
  }

  async function copier() {
    try { await navigator.clipboard.writeText(recapText); setMsg({ ok: true, text: 'Récap copié dans le presse-papier.' }) }
    catch { setMsg({ ok: false, text: 'Copie impossible.' }) }
  }

  return (
    <div style={{ maxWidth: 760, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <button onClick={onBack} style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', cursor: 'pointer', fontSize: 16, color: 'var(--text-2)' }}>←</button>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: 'var(--text)' }}>Récap — {periodeLabel(periode)}</h2>
      </div>

      {envoi && <p style={{ margin: '0 0 12px', fontSize: 14, color: '#059669', fontWeight: 600 }}>✅ Récap déjà envoyé pour ce mois.</p>}

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
        <button onClick={envoyer} disabled={busy || !rows.length}
          style={{ padding: '10px 18px', borderRadius: 10, border: 'none', background: 'var(--accent)', color: 'var(--on-accent, #fff)', cursor: 'pointer', fontWeight: 700, fontSize: 14 }}>
          {busy ? 'Envoi…' : (envoi ? '📧 Renvoyer (auto)' : '📧 Envoyer (auto)')}
        </button>
        <button onClick={gmail} disabled={!rows.length}
          style={{ padding: '10px 18px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>
          ✉️ Ouvrir dans Gmail
        </button>
        <button onClick={copier} disabled={!rows.length}
          style={{ padding: '10px 18px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-2)', cursor: 'pointer', fontSize: 14 }}>
          📋 Copier
        </button>
      </div>

      {!emailjsConfigured && (
        <p style={{ margin: '0 0 12px', fontSize: 12, color: 'var(--text-4)' }}>
          ⓘ Envoi 100 % automatique non configuré (clés EmailJS manquantes) — utilise « Ouvrir dans Gmail » en attendant.
        </p>
      )}
      {msg && <p style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 600, color: msg.ok ? '#059669' : '#dc2626' }}>{msg.text}</p>}

      <pre style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 12, padding: 16,
        fontSize: 13, color: 'var(--text)', whiteSpace: 'pre-wrap', fontFamily: 'ui-monospace, monospace', lineHeight: 1.5 }}>
        {rows.length ? recapText : 'Aucune saisie pour ce mois.'}
      </pre>
    </div>
  )
}

// ─── App principale ──────────────────────────────────────────────────────────
export default function Paie() {
  const [periode, setPeriode] = useState(currentPeriode())
  const [editing, setEditing] = useState(null)   // { salarie, existing }
  const [justSaved, setJustSaved] = useState(false)
  const [recapOpen, setRecapOpen] = useState(false)
  const [pinOpen, setPinOpen] = useState(false)

  const salaries = useLiveQuery(() => db.salaries.orderBy('nom').toArray(), [])
  const rows     = useLiveQuery(() => db.paieVariables.where('periode').equals(periode).toArray(), [periode])
  const envoi    = useLiveQuery(() => db.paieEnvois.where('periode').equals(periode).first(), [periode])

  const byName = useMemo(() => {
    const m = new Map()
    for (const r of (rows || [])) m.set(r.salarie, r)
    return m
  }, [rows])

  if (salaries === undefined || rows === undefined) return <LoadingState />

  const filledCount = salaries.filter(s => byName.has(s.nom)).length
  const allFilled = salaries.length > 0 && filledCount === salaries.length

  function openSalarie(nom) {
    const existing = byName.get(nom)
    if (existing && !window.confirm(`${nom} : document déjà rempli pour ${periodeLabel(periode)}. Modifier la saisie ?`)) return
    setEditing({ salarie: nom, existing: existing || null })
  }

  // Après enregistrement : confirmation + tentative d'envoi auto si tout le monde a rempli
  async function handleSaved() {
    setEditing(null)
    setJustSaved(true)
    try {
      const fresh = await db.paieVariables.where('periode').equals(periode).toArray()
      const names = new Set(fresh.map(r => r.salarie))
      const complete = salaries.length > 0 && salaries.every(s => names.has(s.nom))
      if (!complete || !emailjsConfigured) return
      const already = await db.paieEnvois.where('periode').equals(periode).first()
      if (already) return
      let envoiId
      try { envoiId = await db.paieEnvois.add({ periode }) } catch { return } // déjà pris par un autre poste
      try {
        await sendPaieRecap({ periode, rows: fresh, toEmail: RECAP_EMAIL })
      } catch (e) {
        console.error('Envoi auto du récap paie échoué :', e)
        if (envoiId) await db.paieEnvois.delete(envoiId)
      }
    } catch (e) {
      console.error(e)
    }
  }

  function changePeriode(delta) {
    setPeriode(p => shiftPeriode(p, delta))
    setJustSaved(false); setEditing(null); setRecapOpen(false)
  }

  // ── Formulaire de saisie ──
  if (editing) {
    return <PaieForm salarie={editing.salarie} periode={periode} existing={editing.existing}
      onSaved={handleSaved} onCancel={() => setEditing(null)} />
  }

  // ── Confirmation après enregistrement ──
  if (justSaved) {
    return (
      <div style={{ maxWidth: 520, margin: '40px auto 0', textAlign: 'center',
        background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: '40px 28px', boxShadow: '0 4px 16px var(--shadow)' }}>
        <div style={{ fontSize: 48, marginBottom: 10 }}>✅</div>
        <h2 style={{ margin: '0 0 10px', fontSize: 22, fontWeight: 800, color: 'var(--text)' }}>C’est bien pris en compte</h2>
        <p style={{ margin: '0 0 24px', fontSize: 15, color: 'var(--text-3)', lineHeight: 1.5 }}>
          Tes éléments seront transmis à la comptabilité une fois que <strong>tous les salariés</strong> auront rempli leur document.
        </p>
        <button onClick={() => setJustSaved(false)}
          style={{ padding: '12px 26px', borderRadius: 10, border: 'none', background: 'var(--accent)', color: 'var(--on-accent, #fff)', cursor: 'pointer', fontWeight: 700, fontSize: 15 }}>
          Retour à la liste
        </button>
      </div>
    )
  }

  // ── Récap admin ──
  if (recapOpen) {
    return <RecapView periode={periode} rows={rows} envoi={envoi} onBack={() => setRecapOpen(false)} />
  }

  // ── Liste des salariés ──
  return (
    <div style={{ maxWidth: 680, margin: '0 auto' }}>
      {/* Sélecteur de mois + récap admin */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 18, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={() => changePeriode(-1)} style={navBtn}>◀</button>
          <span style={{ minWidth: 150, textAlign: 'center', fontSize: 17, fontWeight: 700, color: 'var(--text)' }}>{periodeLabel(periode)}</span>
          <button onClick={() => changePeriode(1)} style={navBtn}>▶</button>
        </div>
        <button onClick={() => setPinOpen(true)}
          style={{ padding: '7px 14px', borderRadius: 9, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-3)', cursor: 'pointer', fontSize: 13 }}>
          🔒 Récap
        </button>
      </div>

      {/* Progression */}
      <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px', marginBottom: 8 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>
          {filledCount} / {salaries.length} salarié{salaries.length > 1 ? 's' : ''} ont rempli
        </div>
        <div style={{ fontSize: 13, color: allFilled ? '#059669' : 'var(--text-3)', marginTop: 4 }}>
          {salaries.length === 0
            ? 'Aucun salarié — ajoute-les dans Paramètres → Salariés.'
            : allFilled
              ? '✅ Tout le monde a rempli — le récap est transmis à la comptabilité.'
              : 'Les éléments seront transmis une fois que tous auront rempli leur document.'}
        </div>
      </div>

      {/* Liste */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {salaries.map(s => {
          const done = byName.has(s.nom)
          return (
            <button key={s.id} onClick={() => openSalarie(s.nom)}
              style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', borderRadius: 12,
                border: '1px solid var(--border)', background: 'var(--surface)', cursor: 'pointer', textAlign: 'left' }}>
              <span style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 15, background: done ? '#d1fae5' : 'var(--surface-3)', color: done ? '#059669' : 'var(--text-4)' }}>
                {done ? '✓' : '○'}
              </span>
              <span style={{ flex: 1, fontSize: 16, fontWeight: 600, color: 'var(--text)' }}>{s.nom}</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: done ? '#059669' : 'var(--accent)' }}>
                {done ? 'Rempli' : 'À remplir →'}
              </span>
            </button>
          )
        })}
      </div>

      {pinOpen && <PinGate onSuccess={() => { setPinOpen(false); setRecapOpen(true) }} onClose={() => setPinOpen(false)} />}
    </div>
  )
}

const navBtn = {
  width: 34, height: 34, borderRadius: 9, border: '1px solid var(--border)',
  background: 'var(--surface)', cursor: 'pointer', fontSize: 13, color: 'var(--text-2)',
}
