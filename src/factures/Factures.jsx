import { useState, useMemo } from 'react'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'

// Boutiques → société (B'Shoes : Les Deux Zèbres + By Albi ; JR Shoes : By Rouffiac)
const BOUTIQUES = [
  { id: 'zebres',   label: 'Les 2 Zèbres',     entete: 'Les 2 Zèbres', societe: "B'Shoes",  logo: '/logos/zebres.png' },
  { id: 'albi',     label: 'Bailly Albi',      entete: 'Bailly',       societe: "B'Shoes",  logo: '/logos/albi.png' },
  { id: 'rouffiac', label: 'Bailly Rouffiac',  entete: 'Bailly',       societe: 'JR Shoes', logo: '/logos/rouffiac.png' },
]
const SENDER_BY_SOCIETE = {
  "B'Shoes":  'contact.baillyalbi@gmail.com',
  'JR Shoes': 'contact.baillyrouffiac@gmail.com',
}
const TVA_RATE = 0.20

// Mention légale en pied de facture (fixe par boutique)
const LEGAL_BY_BOUTIQUE = {
  zebres:   "SARL B'SHOES, ZAC DE FONLABOUR EST C.COMMERCIAL LES PORTES D'ALBI, 81000 ALBI | 05.63.76.77.59 | N° SIREN 880012927 | N° de TVA FR75880012927 | IBAN FR76 1313 5000 8008 0063 4423 021",
  albi:     "SARL B'SHOES, ZAC DE FONLABOUR EST C.COMMERCIAL LES PORTES D'ALBI, 81000 ALBI | 05.63.80.52.77 | N° SIREN 880012927 | N° de TVA FR75880012927 | IBAN FR76 1313 5000 8008 0063 4423 021",
  rouffiac: "JR SHOES, 48 RUE ACHILLE DORDOGNE, 81000 ALBI | 05.62.79.30.18 | N° SIREN 980658512 | N° de TVA FR80980658512 | IBAN FR76 1313 5000 8008 0092 7938 716",
}
// Chaque info (séparée par « | ») reste insécable : le retour à la ligne ne se fait qu'avant un « | »,
// jamais au milieu d'un numéro (espaces internes → insécables).
function legalLine(legal) {
  const parts = legal.split(' | ')
  const nbsp = s => s.replace(/ /g, '\u00A0')
  return parts.map((p, i) => (i === 0 ? p : nbsp('| ' + p))).join(' ')
}

const lsGet = (k, def) => { try { const v = localStorage.getItem(k); return v == null ? def : JSON.parse(v) } catch { return def } }
const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)) } catch { /* ignore */ } }

const eur = n => (Number(n) || 0).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 })
const todayISO = () => { const d = new Date(); const p = x => String(x).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}` }
const fmtDateFr = iso => { if (!iso) return ''; const [y, m, d] = iso.split('-'); return `${d}/${m}/${y}` }
const nextNumero = societe => `${new Date().getFullYear()}-${String(lsGet(`factures_seq::${societe}`, 0) + 1).padStart(4, '0')}`

export default function Factures() {
  const [boutiqueId, setBoutiqueId] = useState(() => lsGet('factures_boutique', 'zebres'))
  const boutique = BOUTIQUES.find(b => b.id === boutiqueId) || BOUTIQUES[0]
  function selectBoutique(id) { setBoutiqueId(id); lsSet('factures_boutique', id) }
  // key={boutiqueId} : l'éditeur se remonte au changement de boutique → recharge soc/logo/n° depuis localStorage
  return <FactureEditor key={boutiqueId} boutique={boutique} onSelectBoutique={selectBoutique} />
}

function FactureEditor({ boutique, onSelectBoutique }) {
  const societe = boutique.societe
  const boutiqueId = boutique.id

  const logo = boutique.logo   // logo permanent (fichier dans /public/logos)

  const [numero, setNumero] = useState(() => nextNumero(societe))
  const [date, setDate]   = useState(todayISO)
  const [client, setClient] = useState({ nom: '', adresse: '', email: '' })
  const [designation, setDesignation] = useState('')
  const [ttcInput, setTtcInput] = useState('')

  function setClientField(k, v) { setClient(c => ({ ...c, [k]: v })) }

  const ttc = useMemo(() => parseFloat(String(ttcInput).replace(',', '.')) || 0, [ttcInput])
  const ht  = useMemo(() => Math.round((ttc / (1 + TVA_RATE)) * 100) / 100, [ttc])
  const tva = useMemo(() => Math.round((ttc - ht) * 100) / 100, [ttc, ht])

  // À l'impression / envoi : on "consomme" le numéro → le compteur suit le n° utilisé
  function commitSeq() {
    const m = /(\d+)\s*$/.exec(numero || '')
    if (m) lsSet(`factures_seq::${societe}`, parseInt(m[1]))
  }
  function nouvelleFacture() {
    commitSeq()
    setNumero(nextNumero(societe)); setDate(todayISO())
    setClient({ nom: '', adresse: '', email: '' }); setDesignation(''); setTtcInput('')
  }
  function imprimer() { commitSeq(); window.print() }

  // Génère le PDF de la facture (capture de l'aperçu) et le télécharge
  async function telechargerPdf() {
    const el = document.getElementById('facture-print')
    if (!el) return
    const canvas = await html2canvas(el, { scale: 2, backgroundColor: '#ffffff', useCORS: true })
    const pdf = new jsPDF('p', 'mm', 'a4')
    const pageW = pdf.internal.pageSize.getWidth()
    const pageH = pdf.internal.pageSize.getHeight()
    const imgH = Math.min(canvas.height * pageW / canvas.width, pageH)
    pdf.addImage(canvas.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, pageW, imgH)
    const safe = `Facture_${(numero || '').replace(/[^\w-]/g, '')}_${societe.replace(/[^\w]/g, '')}.pdf`
    pdf.save(safe)
  }

  const [sending, setSending] = useState(false)
  async function envoyerMail() {
    commitSeq()
    setSending(true)
    try { await telechargerPdf() } catch { /* si la génération échoue, on ouvre quand même le mail */ }
    setSending(false)
    const subject = `Facture ${numero} — ${societe}`
    const body =
`Bonjour,

Veuillez trouver votre facture ${numero} d'un montant de ${eur(ttc)} (TTC).
${designation ? `\nObjet : ${designation.split('\n')[0]}\n` : ''}
La facture (PDF) est à joindre à ce message — elle vient d'être téléchargée sur votre ordinateur, glissez-la dans le mail.

Bien cordialement,
${societe}`
    const sender = SENDER_BY_SOCIETE[societe]
    const base = sender ? `https://mail.google.com/mail/u/${encodeURIComponent(sender)}/` : 'https://mail.google.com/mail/'
    window.open(`${base}?view=cm&fs=1&to=${encodeURIComponent(client.email || '')}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, '_blank')
  }

  const lab = { fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.4px', margin: '0 0 4px' }
  const inp = { width: '100%', padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 14, background: 'var(--surface)', color: 'var(--text)', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }
  const field = (label, node) => <div style={{ marginBottom: 10 }}><div style={lab}>{label}</div>{node}</div>

  return (
    <div>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body * { visibility: hidden !important; }
          #facture-print, #facture-print * { visibility: visible !important; }
          #facture-print { position: absolute; left: 0; top: 0; width: 100% !important; box-sizing: border-box !important; margin: 0 !important; box-shadow: none !important; border: none !important; border-radius: 0 !important; min-height: 0 !important; padding: 16mm 14mm !important; }
          @page { margin: 0; }
        }
      `}</style>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 360px) 1fr', gap: 24, alignItems: 'start' }}>
        {/* ── Formulaire ── */}
        <div className="store-card no-print" style={{ padding: 18 }}>
          {field('Boutique', (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {BOUTIQUES.map(b => (
                <button key={b.id} onClick={() => onSelectBoutique(b.id)}
                  style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', borderRadius: 8, cursor: 'pointer',
                    border: `2px solid ${b.id === boutiqueId ? 'var(--accent)' : 'var(--border)'}`,
                    background: b.id === boutiqueId ? 'var(--accent-bg)' : 'var(--surface)',
                    color: b.id === boutiqueId ? 'var(--accent)' : 'var(--text-2)', fontWeight: b.id === boutiqueId ? 700 : 500, fontSize: 14,
                  }}>
                  <span>🏪 {b.label}</span>
                  <span style={{ fontSize: 11, opacity: 0.8 }}>{b.societe}</span>
                </button>
              ))}
            </div>
          ))}

          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{ flex: 1 }}>{field('N° facture', <input value={numero} onChange={e => setNumero(e.target.value)} style={inp} />)}</div>
            <div style={{ flex: 1 }}>{field('Date', <input type="date" value={date} onChange={e => setDate(e.target.value)} style={inp} />)}</div>
          </div>

          {field('Client', <input value={client.nom} onChange={e => setClientField('nom', e.target.value)} placeholder="Nom du client" style={inp} />)}
          {field('Adresse client (optionnel)', <textarea value={client.adresse} onChange={e => setClientField('adresse', e.target.value)} placeholder="Adresse" rows={2} style={{ ...inp, resize: 'vertical' }} />)}
          {field('Email client (pour l’envoi)', <input type="email" value={client.email} onChange={e => setClientField('email', e.target.value)} placeholder="client@email.com" style={inp} />)}

          {field('Désignation', <textarea value={designation} onChange={e => setDesignation(e.target.value)} placeholder="Ex : 1 paire de chaussures … (texte libre)" rows={4} style={{ ...inp, resize: 'vertical' }} />)}
          {field('Montant total TTC (€)', <input type="number" inputMode="decimal" value={ttcInput} onChange={e => setTtcInput(e.target.value)} placeholder="0,00" min="0" step="0.01" style={inp} />)}

          <div style={{ fontSize: 13, color: 'var(--text-2)', background: 'var(--surface-2)', borderRadius: 8, padding: '8px 12px', marginBottom: 12 }}>
            HT : <strong>{eur(ht)}</strong> · TVA 20 % : <strong>{eur(tva)}</strong> · TTC : <strong>{eur(ttc)}</strong>
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
            <button className="btn-primary" onClick={imprimer}>🖨 Imprimer</button>
            <button className="btn-secondary" onClick={telechargerPdf}>📄 Télécharger le PDF</button>
            <button className="btn-secondary" onClick={envoyerMail} disabled={sending}>{sending ? '⏳ PDF…' : '✉️ Envoyer par mail'}</button>
            <button className="btn-secondary" onClick={nouvelleFacture}>🆕 Nouvelle facture</button>
          </div>
        </div>

        {/* ── Aperçu (= ce qui s'imprime) ── */}
        <FacturePreview {...{ logo, societe, magasin: boutique.entete, legal: LEGAL_BY_BOUTIQUE[boutique.id], numero, date, client, designation, ht, tva, ttc }} />
      </div>
    </div>
  )
}

function FacturePreview({ logo, societe, magasin, legal, numero, date, client, designation, ht, tva, ttc }) {
  const txt = '#1f2937', muted = '#6b7280', line = '#e5e7eb', accent = '#111827'
  return (
    <div id="facture-print" style={{
      background: '#fff', color: txt, borderRadius: 10, padding: '34px 38px',
      boxShadow: '0 1px 6px rgba(0,0,0,0.12)', fontSize: 13, lineHeight: 1.5,
      fontFamily: '"Helvetica Neue", Arial, sans-serif', minHeight: 560,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 20 }}>
        <div>
          {logo
            ? <img src={logo} alt={magasin || societe} style={{ height: 120, maxWidth: 360, objectFit: 'contain', marginBottom: 8 }} />
            : <div style={{ fontFamily: "'Jost', sans-serif", fontWeight: 600, fontSize: 26, letterSpacing: 1, textTransform: 'uppercase', color: accent, marginBottom: 6 }}>{magasin || societe}</div>}
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: 1, color: accent }}>FACTURE</div>
          <div style={{ marginTop: 8, color: muted }}>N° <strong style={{ color: txt }}>{numero}</strong></div>
          <div style={{ color: muted }}>Date : <strong style={{ color: txt }}>{fmtDateFr(date)}</strong></div>
        </div>
      </div>

      <div style={{ height: 1, background: line, margin: '22px 0' }} />

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <div style={{ minWidth: 240 }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: muted, marginBottom: 4 }}>Facturé à</div>
          <div style={{ fontWeight: 700 }}>{client.nom || '—'}</div>
          {client.adresse && <div style={{ color: muted, whiteSpace: 'pre-wrap' }}>{client.adresse}</div>}
        </div>
      </div>

      <div style={{ marginTop: 24, border: `1px solid ${line}`, borderRadius: 8, overflow: 'hidden' }}>
        <div style={{ background: '#f9fafb', padding: '8px 14px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: muted, borderBottom: `1px solid ${line}` }}>
          Désignation
        </div>
        <div style={{ padding: '14px', whiteSpace: 'pre-wrap', minHeight: 90 }}>{designation || '—'}</div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 18 }}>
        <table style={{ borderCollapse: 'collapse', minWidth: 260 }}>
          <tbody>
            <tr><td style={{ padding: '4px 10px', color: muted }}>Total HT</td><td style={{ padding: '4px 10px', textAlign: 'right' }}>{eur(ht)}</td></tr>
            <tr><td style={{ padding: '4px 10px', color: muted }}>TVA 20 %</td><td style={{ padding: '4px 10px', textAlign: 'right' }}>{eur(tva)}</td></tr>
            <tr style={{ borderTop: `2px solid ${accent}` }}>
              <td style={{ padding: '8px 10px', fontWeight: 800, color: accent }}>Total TTC</td>
              <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 800, fontSize: 16, color: accent }}>{eur(ttc)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: 28, paddingTop: 14, borderTop: `1px solid ${line}`, color: muted, fontSize: 11 }}>
        {legal && (
          <div style={{ textAlign: 'left', fontSize: 10, lineHeight: 1.5 }}>{legalLine(legal)}</div>
        )}
      </div>
    </div>
  )
}
