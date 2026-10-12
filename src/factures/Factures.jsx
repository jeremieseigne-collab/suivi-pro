import { useState, useMemo } from 'react'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import Icone from '../components/ui/Icone'
import { useMediaQuery, PHONE } from '../lib/useMediaQuery'
import './factures.css'
import { useVariantes } from '../shell/essai'
import PanneauEssai from '../shell/PanneauEssai'
import { POINTS_FACTURES } from './points'

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
const LARGEUR_APERCU = 760   // largeur de l'aperçu pleine taille sur téléphone (impression et PDF)

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
  const telephone = useMediaQuery(PHONE)
  const v = useVariantes(POINTS_FACTURES)
  const onglets = telephone && v.factures_onglets
  const [onglet, setOnglet] = useState('saisie')
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

  const props = { logo, societe, magasin: boutique.entete, legal: LEGAL_BY_BOUTIQUE[boutique.id], numero, date, client, designation, ht, tva, ttc }
  const ongletAperçu = onglets && onglet === 'apercu'
  return (
    <div className="factures">
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body * { visibility: hidden !important; }
          #facture-print, #facture-print * { visibility: visible !important; }
          #facture-print { position: absolute; left: 0; top: 0; width: 100% !important; box-sizing: border-box !important; margin: 0 !important; box-shadow: none !important; border: none !important; border-radius: 0 !important; min-height: 0 !important; padding: 16mm 14mm !important; }
          @page { margin: 0; }
        }
      `}</style>

      {onglets && (
        <div className="segment no-print" role="group" aria-label="Affichage" style={{ marginBottom: 12, width: '100%' }}>
          <button aria-pressed={!ongletAperçu} onClick={() => setOnglet('saisie')} style={{ flex: 1 }}>Saisie</button>
          <button aria-pressed={ongletAperçu} onClick={() => setOnglet('apercu')} style={{ flex: 1 }}>Aperçu</button>
        </div>
      )}

      <div className="factures-grille">
        {/* ── Saisie ── */}
        <section className="carte no-print factures-saisie" hidden={ongletAperçu}>
          <span className="etiquette">Boutique</span>
          <div className="liste factures-boutiques">
            {BOUTIQUES.map(b => (
              <button key={b.id} className="ligne" aria-pressed={b.id === boutiqueId} onClick={() => onSelectBoutique(b.id)}>
                <Icone nom="magasin" taille={20} style={{ color: b.id === boutiqueId ? 'var(--action-texte)' : 'var(--doux)' }} />
                <span className="txt"><span className="t1">{b.label}</span><span className="t2" style={{ display: 'block' }}>{b.societe}</span></span>
                {b.id === boutiqueId && <Icone nom="check" taille={18} style={{ color: 'var(--action-texte)' }} />}
              </button>
            ))}
          </div>

          <div className="deux-champs-factures">
            <label className="etiquette">N° facture<input className="champ" value={numero} onChange={e => setNumero(e.target.value)} /></label>
            <label className="etiquette">Date<input className="champ" type="date" value={date} onChange={e => setDate(e.target.value)} /></label>
          </div>
          {v.factures_aide_numero && <div className="aide">Numéro suivant d’après cet appareil ({societe}).</div>}

          <label className="etiquette f-champ">Client<input className="champ" value={client.nom} onChange={e => setClientField('nom', e.target.value)} placeholder="Nom du client" /></label>
          <label className="etiquette f-champ">Adresse client (optionnel)<textarea className="champ" value={client.adresse} onChange={e => setClientField('adresse', e.target.value)} placeholder="Adresse" rows={2} style={{ resize: 'vertical' }} /></label>
          <label className="etiquette f-champ">Email client (pour l’envoi)<input className="champ" type="email" value={client.email} onChange={e => setClientField('email', e.target.value)} placeholder="client@email.com" /></label>
          <label className="etiquette f-champ">Désignation<textarea className="champ" value={designation} onChange={e => setDesignation(e.target.value)} placeholder="Ex : 1 paire de chaussures … (texte libre)" rows={4} style={{ resize: 'vertical' }} /></label>
          <label className="etiquette f-champ">Montant total TTC (€)<input className="champ" type="number" inputMode="decimal" value={ttcInput} onChange={e => setTtcInput(e.target.value)} placeholder="0,00" min="0" step="0.01" /></label>

          <div className="encart neutre factures-totaux">
            <span>HT : <strong>{eur(ht)}</strong></span><span>TVA 20 % : <strong>{eur(tva)}</strong></span><span>TTC : <strong>{eur(ttc)}</strong></span>
          </div>

          <div className="factures-actions">
            <button className="btn btn-prim" onClick={imprimer}>Imprimer</button>
            <button className="btn" onClick={telechargerPdf}>Télécharger le PDF</button>
            <button className="btn" onClick={envoyerMail} disabled={sending}>{sending ? 'PDF…' : 'Envoyer par mail'}</button>
            <button className="btn" onClick={nouvelleFacture}>Nouvelle facture</button>
          </div>
        </section>

        {/* ── Aperçu (= ce qui s'imprime et ce qui part en PDF) ── */}
        {telephone ? (
          <>
            {/* Sur téléphone, l'aperçu est réduit à la largeur de l'écran ; la facture imprimée / le PDF partent de la version pleine taille */}
            {(ongletAperçu || !onglets) && <ApercuReduit {...props} />}
            <div className="factures-pleine-taille" aria-hidden="true"><FacturePreview {...props} /></div>
          </>
        ) : <FacturePreview {...props} />}
      </div>
      <div className="no-print"><PanneauEssai points={POINTS_FACTURES} /></div>
    </div>
  )
}

// Aperçu réduit pour le téléphone : même contenu, à l'échelle de l'écran (sans l'identifiant d'impression)
function ApercuReduit(props) {
  const [echelle, setEchelle] = useState(0.45)
  const [hauteur, setHauteur] = useState(0)
  const mesurer = el => {
    if (!el) return
    const largeur = el.parentElement.clientWidth
    const e = Math.min(1, largeur / LARGEUR_APERCU)
    if (Math.abs(e - echelle) > 0.001) setEchelle(e)
    const h = el.firstChild?.offsetHeight || 0
    if (h && Math.abs(h * e - hauteur) > 1) setHauteur(h * e)
  }
  return (
    <div className="factures-apercu-reduit" style={{ height: hauteur || undefined }}>
      <div ref={mesurer} style={{ width: LARGEUR_APERCU, transform: `scale(${echelle})`, transformOrigin: 'top left' }}>
        <FacturePreview {...props} sansId />
      </div>
    </div>
  )
}

function FacturePreview({ logo, societe, magasin, legal, numero, date, client, designation, ht, tva, ttc, sansId = false }) {
  const txt = '#1f2937', muted = '#6b7280', line = '#e5e7eb', accent = '#111827'
  return (
    <div id={sansId ? undefined : 'facture-print'} style={{
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
