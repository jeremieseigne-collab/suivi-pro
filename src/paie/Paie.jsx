import { useState, useMemo } from 'react'
import { db } from '../db'
import { useLiveQuery } from '../lib/useLiveQuery'
import { LoadingState } from '../components/shared'
import Icone from '../components/ui/Icone'
import PanneauEssai from '../shell/PanneauEssai'
import { POINTS_PAIE } from './points'
import { currentPeriode, periodeLabel, shiftPeriode, isGerant } from './constants'
import { sendPaieRecap, buildRecapText, sendModificationRequest, modificationGmailUrl, sendPaieCompleteNotification } from './mail'
import { supabase } from '../lib/supabase'
import { useCompte } from '../context/CompteContext'
import PaieForm from './PaieForm'
import './paie.css'

// ⚠️ Ces adresses doivent aussi figurer dans la liste autorisée du serveur (api/_send.js → ALLOWED)
const RECAP_EMAIL = 'marion.fouquereau@lecussan.fr'   // récap mensuel → comptable
const ADMIN_EMAIL = 'jeremie.seigne@gmail.com'        // demandes de modification → direction

const Retour = ({ onClick, label = 'Retour à la liste' }) => (
  <button className="icone-btn" onClick={onClick} aria-label={label}><Icone nom="chevron" style={{ transform: 'rotate(180deg)' }} /></button>
)

// ─── Document déjà validé : verrouillé + demande de modification ──────────────
function LockedView({ salarie, periode, onBack }) {
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)
  const [erreur, setErreur] = useState('')

  async function envoyer() {
    if (!message.trim()) { setErreur('Merci de décrire la modification souhaitée.'); return }
    setBusy(true)
    try {
      await sendModificationRequest({ salarie, periode, message, toEmail: ADMIN_EMAIL })
    } catch {
      // Envoi auto indisponible → ouverture de Gmail pré-rempli
      window.open(modificationGmailUrl({ salarie, periode, message, toEmail: ADMIN_EMAIL }), '_blank')
    } finally {
      setBusy(false); setSent(true)
    }
  }

  if (sent) {
    return (
      <div className="carte paie-message">
        <div className="grand-signe" aria-hidden="true">📨</div>
        <h2>Demande envoyée</h2>
        <p>Ta demande de modification a bien été transmise à la direction. Tu seras recontacté(e) si besoin.</p>
        <button className="btn btn-prim" onClick={onBack}>Retour à la liste</button>
      </div>
    )
  }

  return (
    <div className="paie-page etroite">
      <div className="paie-titre"><Retour onClick={onBack} /><h2>{salarie}</h2></div>
      <div className="encart att" style={{ display: 'block', marginBottom: 16 }}>
        <div style={{ fontWeight: 700, marginBottom: 6 }}>🔒 Document déjà validé</div>
        Ce document a été enregistré et <strong>ne peut plus être modifié</strong>, pour garantir la confidentialité des informations transmises à la comptabilité.
        Si une information est erronée ou doit être complétée, décris ta demande ci-dessous : elle sera <strong>transmise directement à la direction</strong> qui effectuera la correction.
      </div>
      <label className="etiquette" htmlFor="paie-demande">Demande de modification</label>
      <textarea id="paie-demande" className="champ" value={message} onChange={e => { setMessage(e.target.value); setErreur('') }} rows={5}
        placeholder="Décris précisément ce qui doit être corrigé (ex. : ajouter 2 h supplémentaires le 12/06)…" style={{ resize: 'vertical' }} />
      {erreur && <div className="encart err" style={{ marginTop: 12 }}>{erreur}</div>}
      <div className="paie-boutons">
        <button className="btn" onClick={onBack} disabled={busy}>Annuler</button>
        <button className="btn btn-prim" onClick={envoyer} disabled={busy}>{busy ? 'Envoi…' : 'Envoyer la demande'}</button>
      </div>
    </div>
  )
}

// ─── Vue récap (Direction) ───────────────────────────────────────────────────
function RecapView({ periode, rows, envoi, onBack, onEdit }) {
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
    <div className="paie-page large">
      <div className="paie-titre"><Retour onClick={onBack} /><h2>Récap — {periodeLabel(periode)}</h2></div>

      {envoi && <p className="mot-ok" style={{ margin: '0 0 12px' }}>✅ Récap déjà envoyé pour ce mois.</p>}

      <div className="paie-actions-recap">
        <button className="btn btn-prim" onClick={envoyer} disabled={busy || !rows.length}>
          <Icone nom="mail" taille={18} />{busy ? 'Envoi…' : (envoi ? 'Renvoyer (auto)' : 'Envoyer (auto)')}
        </button>
        <button className="btn" onClick={gmail} disabled={!rows.length}>Ouvrir dans Gmail</button>
        <button className="btn" onClick={copier} disabled={!rows.length}>Copier</button>
      </div>
      <div className="aide" style={{ margin: '-4px 0 12px' }}>Destinataire : {RECAP_EMAIL}</div>

      {msg && <div className={`encart ${msg.ok ? 'ok' : 'err'}`} style={{ marginBottom: 12 }}>{msg.text}</div>}

      {onEdit && rows.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <div className="etiquette">Corriger une saisie (réservé direction) :</div>
          <div className="chips" style={{ flexWrap: 'wrap' }}>
            {rows.slice().sort((a, b) => a.salarie.localeCompare(b.salarie)).map(r => (
              <button key={r.id} className="chip" onClick={() => onEdit(r)}><Icone nom="crayon" taille={16} />{r.salarie}</button>
            ))}
          </div>
        </div>
      )}

      <pre className="carte paie-recap-texte">{rows.length ? recapText : 'Aucune saisie pour ce mois.'}</pre>
    </div>
  )
}

// ─── App principale ──────────────────────────────────────────────────────────
export default function Paie() {
  const [periode, setPeriode] = useState(currentPeriode())
  const [editing, setEditing] = useState(null)   // { salarie, magasin, existing }
  const [locked, setLocked] = useState(null)     // nom du salarié dont le doc est verrouillé
  const [justSaved, setJustSaved] = useState(false)
  const [recapOpen, setRecapOpen] = useState(false)
  const { estDirection } = useCompte()
  // Relecture après chaque enregistrement : un compte magasin n'est pas prévenu des changements de fiches (confidentialité),
  // la liste « Rempli / À remplir » ne se mettait donc pas à jour seule (défaut de l'étape 2, corrigé ici)
  const [maj, setMaj] = useState(0)

  const salaries = useLiveQuery(async () => (await db.salaries.orderBy('nom').toArray()).filter(s => !isGerant(s.nom)), [])
  // Direction : saisies complètes. Magasin : seulement les prénoms déjà remplis (la base ne donne pas le contenu).
  const rows     = useLiveQuery(async () => (estDirection
    ? await db.paieVariables.where('periode').equals(periode).toArray()
    : await prenomsRemplis(periode)
  ).filter(r => !isGerant(r.salarie)), [periode, estDirection, maj])
  const envoi    = useLiveQuery(() => estDirection ? db.paieEnvois.where('periode').equals(periode).first() : null, [periode, estDirection, maj])

  const byName = useMemo(() => {
    const m = new Map()
    for (const r of (rows || [])) m.set(r.salarie, r)
    return m
  }, [rows])

  if (salaries === undefined || rows === undefined) return <LoadingState />

  const filledCount = salaries.filter(s => byName.has(s.nom)).length
  const allFilled = salaries.length > 0 && filledCount === salaries.length
  const magasinDe = nom => (salaries.find(s => s.nom === nom) || {}).magasin || ''

  function openSalarie(nom) {
    const existing = byName.get(nom)
    if (existing) { setLocked(nom); return }   // déjà validé → verrouillé (demande de modif)
    setEditing({ salarie: nom, existing: null })
  }

  // Après enregistrement : confirmation ; si c'était la dernière fiche du mois, la direction est prévenue par mail
  // (le récap est ensuite envoyé à la comptable d'un clic, depuis un compte Direction).
  async function handleSaved() {
    const fromRecap = recapOpen
    setEditing(null)
    setMaj(x => x + 1)
    if (!fromRecap) setJustSaved(true)   // confirmation salarié uniquement ; depuis le récap on y retourne
    if (estDirection) return
    try {
      const names = new Set((await prenomsRemplis(periode)).map(r => r.salarie))
      const complete = salaries.length > 0 && salaries.every(s => names.has(s.nom))
      if (complete) await sendPaieCompleteNotification({ periode, toEmail: ADMIN_EMAIL })
    } catch (e) {
      console.error('Prévenance « saisies complètes » non envoyée :', e)
    }
  }

  function changePeriode(delta) {
    setPeriode(p => shiftPeriode(p, delta))
    setJustSaved(false); setEditing(null); setRecapOpen(false); setLocked(null)
  }

  // ── Formulaire de saisie ──
  if (editing) {
    return <PaieForm salarie={editing.salarie} magasinSalarie={magasinDe(editing.salarie)} periode={periode} existing={editing.existing}
      onSaved={handleSaved} onCancel={() => setEditing(null)} />
  }

  // ── Document verrouillé (demande de modification) ──
  if (locked) {
    return <LockedView salarie={locked} periode={periode} onBack={() => setLocked(null)} />
  }

  // ── Confirmation après enregistrement ──
  if (justSaved) {
    return (
      <div className="carte paie-message">
        <div className="grand-signe ok" aria-hidden="true"><Icone nom="check" taille={30} /></div>
        <h2>C’est bien pris en compte</h2>
        <p>Tes éléments seront transmis à la comptabilité une fois que <strong>tous les salariés</strong> auront rempli leur document.</p>
        <button className="btn btn-prim" onClick={() => setJustSaved(false)}>Retour à la liste</button>
      </div>
    )
  }

  // ── Récap (Direction seulement) ──
  if (recapOpen && estDirection) {
    return <RecapView periode={periode} rows={rows} envoi={envoi} onBack={() => setRecapOpen(false)}
      onEdit={row => setEditing({ salarie: row.salarie, existing: row })} />
  }

  // ── Liste des salariés ──
  const pc = salaries.length ? Math.round(100 * filledCount / salaries.length) : 0
  return (
    <div className="paie-page">
      <div className="paie-mois">
        <button className="icone-btn" onClick={() => changePeriode(-1)} aria-label="Mois précédent"><Icone nom="chevron" style={{ transform: 'rotate(180deg)' }} /></button>
        <span className="libelle-mois">{periodeLabel(periode)}</span>
        <button className="icone-btn" onClick={() => changePeriode(1)} aria-label="Mois suivant"><Icone nom="chevron" /></button>
        <span style={{ flex: 1 }} />
        {estDirection && (
          <button className={`btn ${allFilled && !envoi ? 'btn-prim' : ''}`} onClick={() => setRecapOpen(true)}>
            {allFilled && !envoi ? 'Récap à envoyer →' : 'Récap'}
          </button>
        )}
      </div>

      {/* Progression */}
      <div className="carte paie-progression">
        <div style={{ fontWeight: 700 }}>{filledCount} / {salaries.length} salarié{salaries.length > 1 ? 's' : ''} ont rempli</div>
        {salaries.length > 0 && <div className="barre" style={{ margin: '8px 0' }}><i className={pc === 100 ? 'ok' : pc === 0 ? 'zero' : pc < 50 ? 'orange' : ''} style={{ width: `${pc}%` }} /></div>}
        <div className={allFilled ? 'mot-ok' : 'aide'} style={{ fontSize: 14 }}>
          {salaries.length === 0
            ? 'Aucun salarié — ajoute-les dans Paramètres → Salariés.'
            : allFilled
              ? (envoi ? '✅ Tout le monde a rempli — récap envoyé à la comptabilité.' : '✅ Tout le monde a rempli — la direction transmet le récap à la comptabilité.')
              : 'Les éléments seront transmis une fois que tous auront rempli leur document.'}
        </div>
      </div>

      {/* Liste */}
      <div className="liste">
        {salaries.map(s => {
          const done = byName.has(s.nom)
          return (
            <button key={s.id} className="ligne" onClick={() => openSalarie(s.nom)}>
              <span className="txt">
                <span className="t1">{s.nom}</span>
                {s.magasin && <span className="t2" style={{ display: 'block' }}>{s.magasin}</span>}
              </span>
              <span className={done ? 'mot-ok' : 'mot-action'}>{done ? 'Rempli' : 'À remplir'}</span>
              <Icone nom={done ? 'check' : 'chevron'} taille={18} style={{ color: done ? 'var(--ok)' : 'var(--discret)' }} />
            </button>
          )
        })}
      </div>

      <PanneauEssai points={POINTS_PAIE} />
    </div>
  )
}

// Prénoms ayant déjà rempli leur fiche pour la période (sans le contenu des fiches)
async function prenomsRemplis(periode) {
  const { data, error } = await supabase.rpc('paie_remplies', { p_periode: periode })
  if (error) throw error
  return data || []
}
