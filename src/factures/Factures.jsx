import { useState, useMemo } from 'react'

// Boutiques → société (B'Shoes : Les Deux Zèbres + By Albi ; JR Shoes : By Rouffiac)
const BOUTIQUES = [
  { id: 'zebres',   label: 'Les Deux Zèbres', societe: "B'Shoes" },
  { id: 'albi',     label: 'By Albi',         societe: "B'Shoes" },
  { id: 'rouffiac', label: 'By Rouffiac',     societe: 'JR Shoes' },
]
const SENDER_BY_SOCIETE = {
  "B'Shoes":  'contact.baillyalbi@gmail.com',
  'JR Shoes': 'contact.baillyrouffiac@gmail.com',
}
const TVA_RATE = 0.20

const lsGet = (k, def) => { try { const v = localStorage.getItem(k); return v == null ? def : JSON.parse(v) } catch { return def } }
const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)) } catch { /* ignore */ } }

const eur = n => (Number(n) || 0).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 })
const todayISO = () => { const d = new Date(); const p = x => String(x).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}` }
const fmtDateFr = iso => { if (!iso) return ''; const [y, m, d] = iso.split('-'); return `${d}/${m}/${y}` }
const nextNumero = societe => `${new Date().getFullYear()}-${String(lsGet(`factures_seq::${societe}`, 0) + 1).padStart(4, '0')}`

const SOC_FIELDS = [
  { k: 'raisonSociale', label: 'Raison sociale', ph: "B'Shoes SARL" },
  { k: 'adresse',       label: 'Adresse',        ph: '12 rue …, 81000 Albi', area: true },
  { k: 'siret',         label: 'SIRET',          ph: '123 456 789 00012' },
  { k: 'tvaIntra',      label: 'N° TVA intracom', ph: 'FR 12 345678900' },
  { k: 'tel',           label: 'Téléphone',      ph: '05 63 …' },
  { k: 'email',         label: 'Email',          ph: 'contact@…' },
  { k: 'mentions',      label: 'Mentions de bas de page (RIB, conditions…)', ph: 'Paiement à réception. RIB : …', area: true },
]

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

  const [soc, setSoc]     = useState(() => lsGet(`factures_soc::${societe}`, { raisonSociale: societe }))
  const [logo, setLogo]   = useState(() => lsGet(`factures_logo::${boutiqueId}`, ''))
  const [editSoc, setEditSoc] = useState(false)
  const [numero, setNumero] = useState(() => nextNumero(societe))
  const [date, setDate]   = useState(todayISO)
  const [client, setClient] = useState({ nom: '', adresse: '', email: '' })
  const [designation, setDesignation] = useState('')
  const [ttcInput, setTtcInput] = useState('')

  function saveSoc(next) { setSoc(next); lsSet(`factures_soc::${societe}`, next) }
  function setSocField(k, v) { saveSoc({ ...soc, [k]: v }) }
  function setClientField(k, v) { setClient(c => ({ ...c, [k]: v })) }

  function onLogoFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => { setLogo(String(reader.result)); lsSet(`factures_logo::${boutiqueId}`, String(reader.result)) }
    reader.readAsDataURL(file)
  }
  function removeLogo() { setLogo(''); lsSet(`factures_logo::${boutiqueId}`, '') }

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
  function envoyerMail() {
    commitSeq()
    const subject = `Facture ${numero} — ${soc.raisonSociale || societe}`
    const body =
`Bonjour,

Veuillez trouver votre facture ${numero} d'un montant de ${eur(ttc)} (TTC).
${designation ? `\nObjet : ${designation.split('\n')[0]}\n` : ''}
La facture est jointe à ce message.

Bien cordialement,
${soc.raisonSociale || societe}`
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
          body * { visibility: hidden !important; }
          #facture-print, #facture-print * { visibility: visible !important; }
          #facture-print { position: absolute; left: 0; top: 0; width: 100%; margin: 0 !important; box-shadow: none !important; border: none !important; }
          @page { margin: 14mm; }
        }
      `}</style>

      <div className="no-print" style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 360px) 1fr', gap: 24, alignItems: 'start' }}>
        {/* ── Formulaire ── */}
        <div className="store-card" style={{ padding: 18 }}>
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

          {field('Logo de la boutique', (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {logo
                ? <img src={logo} alt="logo" style={{ height: 44, maxWidth: 120, objectFit: 'contain', border: '1px solid var(--border)', borderRadius: 6, background: '#fff' }} />
                : <span style={{ fontSize: 12, color: 'var(--text-4)' }}>Aucun logo</span>}
              <label style={{ ...inp, width: 'auto', cursor: 'pointer', padding: '6px 10px', fontSize: 12 }}>
                Choisir…
                <input type="file" accept="image/*" onChange={onLogoFile} style={{ display: 'none' }} />
              </label>
              {logo && <button onClick={removeLogo} style={{ ...inp, width: 'auto', padding: '6px 10px', fontSize: 12, cursor: 'pointer', color: '#dc2626' }}>Retirer</button>}
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

          <button onClick={() => setEditSoc(o => !o)} style={{ ...inp, cursor: 'pointer', textAlign: 'left', fontSize: 12, fontWeight: 700, color: 'var(--text-3)', background: 'var(--surface-2)' }}>
            {editSoc ? '▾' : '▸'} Coordonnées de {societe} (mémorisées)
          </button>
          {editSoc && (
            <div style={{ marginTop: 10 }}>
              {SOC_FIELDS.map(f => (
                <div key={f.k} style={{ marginBottom: 8 }}>
                  <div style={lab}>{f.label}</div>
                  {f.area
                    ? <textarea value={soc[f.k] || ''} onChange={e => setSocField(f.k, e.target.value)} placeholder={f.ph} rows={2} style={{ ...inp, resize: 'vertical' }} />
                    : <input value={soc[f.k] || ''} onChange={e => setSocField(f.k, e.target.value)} placeholder={f.ph} style={inp} />}
                </div>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
            <button className="btn-primary" onClick={imprimer}>🖨 Imprimer</button>
            <button className="btn-secondary" onClick={envoyerMail}>✉️ Envoyer par mail</button>
            <button className="btn-secondary" onClick={nouvelleFacture}>🆕 Nouvelle facture</button>
          </div>
        </div>

        {/* ── Aperçu (= ce qui s'imprime) ── */}
        <FacturePreview {...{ logo, soc, societe, numero, date, client, designation, ht, tva, ttc }} />
      </div>
    </div>
  )
}

function FacturePreview({ logo, soc, societe, numero, date, client, designation, ht, tva, ttc }) {
  const txt = '#1f2937', muted = '#6b7280', line = '#e5e7eb', accent = '#111827'
  return (
    <div id="facture-print" style={{
      background: '#fff', color: txt, borderRadius: 10, padding: '34px 38px',
      boxShadow: '0 1px 6px rgba(0,0,0,0.12)', fontSize: 13, lineHeight: 1.5,
      fontFamily: '"Helvetica Neue", Arial, sans-serif', minHeight: 560,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 20 }}>
        <div>
          {logo && <img src={logo} alt="" style={{ height: 64, maxWidth: 200, objectFit: 'contain', marginBottom: 10 }} />}
          <div style={{ fontWeight: 700, fontSize: 16, color: accent }}>{soc.raisonSociale || societe}</div>
          {soc.adresse && <div style={{ color: muted, whiteSpace: 'pre-wrap' }}>{soc.adresse}</div>}
          {soc.tel && <div style={{ color: muted }}>Tél : {soc.tel}</div>}
          {soc.email && <div style={{ color: muted }}>{soc.email}</div>}
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

      <div style={{ marginTop: 28, paddingTop: 14, borderTop: `1px solid ${line}`, color: muted, fontSize: 11, whiteSpace: 'pre-wrap' }}>
        {soc.mentions || ''}
        {(soc.siret || soc.tvaIntra) && (
          <div style={{ marginTop: 8 }}>
            {soc.siret && <span>SIRET : {soc.siret}</span>}
            {soc.siret && soc.tvaIntra && <span> · </span>}
            {soc.tvaIntra && <span>TVA : {soc.tvaIntra}</span>}
          </div>
        )}
      </div>
    </div>
  )
}
