import { useState } from 'react'
import { db } from '../db'
import { supabase } from '../lib/supabase'
import { useCompte } from '../context/CompteContext'
import { getSociete, SOCIETE_MAP } from '../data/societes'
import Icone from '../components/ui/Icone'
import { useVariantes } from '../shell/essai'
import { POINTS_PAIE } from './points'
import { SOCIETES, SOCIETE_MAGASINS, HOUR_SECTIONS, RANGE_SECTIONS, periodeLabel } from './constants'

const num = v => parseFloat(String(v).replace(',', '.')) || 0
const fmt = d => { if (!d) return '?'; const [y, m, j] = d.split('-'); return `${j}/${m}/${y}` }

// Société d'après le magasin de la salariée (P1) ; « Bailly Rouffiac », « Bailly Rouffiac-Tolosan »… reconnus. Rien si le magasin est inconnu.
const normMag = s => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
function deduireSociete(magasin) {
  if (!magasin) return ''
  const s = getSociete(magasin)
  if (SOCIETES.includes(s)) return s
  const m = normMag(magasin)
  const cle = Object.keys(SOCIETE_MAP).find(k => { const n = normMag(k); return n.startsWith(m) || m.startsWith(n) })
  return cle ? SOCIETE_MAP[cle] : ''
}

// Saisie des éléments variables d'une salariée pour le mois, puis écran « Vérifie ta saisie » avant l'enregistrement définitif.
// Règles d'accès de l'étape 2 : un compte magasin dépose la fiche sans pouvoir la relire ; seule la Direction corrige.
export default function PaieForm({ salarie, magasinSalarie, periode, existing, onSaved, onCancel }) {
  const v = useVariantes(POINTS_PAIE)
  const init = existing?.data || {}
  const societeDeduite = deduireSociete(magasinSalarie)
  const [societe, setSociete] = useState(existing?.societe || (v.paie_societe_auto ? societeDeduite : ''))
  const [data, setData] = useState({
    heuresSupp: init.heuresSupp || [],
    dimanche:   init.dimanche   || [],
    feries:     init.feries     || [],
    conges:     init.conges     || [],
    maladie:    init.maladie    || [],
    commentaire: init.commentaire || '',
  })
  const [saving, setSaving] = useState(false)
  const [verif, setVerif]   = useState(false)   // écran « Vérifie ta saisie » avant l'enregistrement définitif
  const [erreur, setErreur] = useState('')
  const { estDirection } = useCompte()

  const addRow = (key, blank) => setData(d => ({ ...d, [key]: [...d[key], blank] }))
  const setRow = (key, i, field, val) => setData(d => ({ ...d, [key]: d[key].map((r, j) => j === i ? { ...r, [field]: val } : r) }))
  const delRow = (key, i) => setData(d => ({ ...d, [key]: d[key].filter((_, j) => j !== i) }))

  const clean = {
    heuresSupp: data.heuresSupp.filter(r => r.date || r.heures),
    dimanche:   data.dimanche.filter(r => r.date || r.heures),
    feries:     data.feries.filter(r => r.date || r.heures),
    conges:     data.conges.filter(r => r.du || r.au),
    maladie:    data.maladie.filter(r => r.du || r.au),
    commentaire: (data.commentaire || '').trim(),
  }

  function verifier() {
    if (!societe) { setErreur('Merci de choisir ta société.'); return }
    setErreur('')
    setVerif(true)
    window.scrollTo(0, 0)
  }

  async function save() {
    setSaving(true)
    try {
      if (existing?.id) {
        await db.paieVariables.update(existing.id, { societe, data: clean })   // correction : Direction seulement
      } else if (estDirection) {
        await db.paieVariables.add({ periode, salarie, societe, data: clean })
      } else {
        // Compte magasin : dépôt sans relecture (la base n'autorise pas un magasin à relire une fiche)
        const { error } = await supabase.from('paie_variables').insert({ periode, salarie, societe, data: clean })
        if (error) throw new Error(error.code === '23505' ? `La fiche de ${salarie} pour ce mois est déjà enregistrée.` : (error.message || 'erreur inconnue'))
      }
      onSaved()
    } catch (e) {
      alert('Erreur lors de l’enregistrement : ' + (e.message || e))
      setSaving(false)
    }
  }

  if (verif) return <Verification salarie={salarie} societe={societe} data={clean} periode={periode} v={v} saving={saving} onBack={() => setVerif(false)} onConfirm={save} />

  return (
    <div className="paie-page">
      <div className="paie-titre">
        <button className="icone-btn" onClick={onCancel} aria-label="Retour à la liste"><Icone nom="chevron" style={{ transform: 'rotate(180deg)' }} /></button>
        <div><h2>{salarie}</h2><div className="aide">{periodeLabel(periode)}</div></div>
      </div>
      <p className="aide" style={{ margin: '0 0 16px' }}>Document confidentiel — il disparaît de l’écran dès que tu valides.</p>

      <section className="carte paie-section">
        <label className="etiquette" htmlFor="paie-societe">Société *</label>
        <select id="paie-societe" className="champ" value={societe} onChange={e => { setSociete(e.target.value); setErreur('') }}>
          <option value="">— Choisir —</option>
          {SOCIETES.map(s => (
            <option key={s} value={s}>{s}{SOCIETE_MAGASINS[s] ? ` (${SOCIETE_MAGASINS[s]})` : ''}</option>
          ))}
        </select>
        {v.paie_societe_auto && !existing && societeDeduite && societe === societeDeduite && <div className="aide" style={{ marginTop: 6 }}>D’après ton magasin ({magasinSalarie}) — change-la si besoin.</div>}
      </section>

      {/* Rubriques heures (date + heures) */}
      {HOUR_SECTIONS.map(s => (
        <section key={s.key} className="carte paie-section">
          <h3>{s.icon} {s.label}</h3>
          {data[s.key].length === 0 && <p className="aide" style={{ margin: '0 0 6px' }}>Aucune ligne.</p>}
          {data[s.key].map((row, i) => (
            <div key={i} className="paie-rang">
              <input className="champ" type="date" value={row.date || ''} onChange={e => setRow(s.key, i, 'date', e.target.value)} aria-label="Date" style={{ flex: 1 }} />
              <input className="champ heures" type="number" min="0" step="0.5" inputMode="decimal" placeholder="heures" value={row.heures || ''} onChange={e => setRow(s.key, i, 'heures', e.target.value)} aria-label="Heures" />
              <span className="aide">h</span>
              <button type="button" className="icone-btn" onClick={() => delRow(s.key, i)} aria-label="Supprimer cette ligne" title="Supprimer cette ligne"><Icone nom="corbeille" taille={20} /></button>
            </div>
          ))}
          <button type="button" className="lien" onClick={() => addRow(s.key, { date: '', heures: '' })}><Icone nom="ajout" taille={16} style={{ verticalAlign: '-3px' }} /> Ajouter</button>
        </section>
      ))}

      {/* Rubriques période (du / au) */}
      {RANGE_SECTIONS.map(s => (
        <section key={s.key} className="carte paie-section">
          <h3>{s.icon} {s.label}</h3>
          {data[s.key].length === 0 && <p className="aide" style={{ margin: '0 0 6px' }}>Aucune ligne.</p>}
          {data[s.key].map((row, i) => (
            <div key={i} className="paie-rang">
              <span className="aide">du</span>
              <input className="champ" type="date" value={row.du || ''} onChange={e => setRow(s.key, i, 'du', e.target.value)} aria-label="Du" style={{ flex: 1, minWidth: 130 }} />
              <span className="aide">au</span>
              <input className="champ" type="date" value={row.au || ''} onChange={e => setRow(s.key, i, 'au', e.target.value)} aria-label="Au" style={{ flex: 1, minWidth: 130 }} />
              <button type="button" className="icone-btn" onClick={() => delRow(s.key, i)} aria-label="Supprimer cette ligne" title="Supprimer cette ligne"><Icone nom="corbeille" taille={20} /></button>
            </div>
          ))}
          <button type="button" className="lien" onClick={() => addRow(s.key, { du: '', au: '' })}><Icone nom="ajout" taille={16} style={{ verticalAlign: '-3px' }} /> Ajouter</button>
        </section>
      ))}

      <section className="carte paie-section">
        <h3>📝 Commentaire libre</h3>
        <textarea className="champ" value={data.commentaire} onChange={e => setData(d => ({ ...d, commentaire: e.target.value }))}
          rows={3} placeholder="Toute information utile pour la paie…" style={{ resize: 'vertical' }} />
      </section>

      {erreur && <div className="encart err" style={{ marginBottom: 12 }}>{erreur}</div>}
      <div className="paie-boutons">
        <button className="btn" onClick={onCancel} disabled={saving}>Annuler</button>
        <button className="btn btn-prim" onClick={verifier} disabled={saving}>Vérifier ma saisie →</button>
      </div>
    </div>
  )
}

// ─── Écran « Vérifie ta saisie » : dernier contrôle avant l'enregistrement définitif ───
function Verification({ salarie, societe, data, periode, v, saving, onBack, onConfirm }) {
  const horsMois = d => !!d && d.slice(0, 7) !== periode
  const touche = (du, au) => du.slice(0, 7) <= periode && au.slice(0, 7) >= periode
  const mois = periodeLabel(periode).split(' ')[0].toLowerCase()
  const lignes = [
    ...HOUR_SECTIONS.map(s => [s, data[s.key].map(r => ({ t: `${fmt(r.date)} : ${r.heures || '?'} h`, hors: horsMois(r.date) })),
      data[s.key].reduce((t, r) => t + num(r.heures), 0)]),
    // une période qui touche le mois (ex. congés du 28/09 au 03/10 pour octobre) n'est pas signalée
    ...RANGE_SECTIONS.map(s => [s, data[s.key].map(r => ({ t: `du ${fmt(r.du)} au ${fmt(r.au)}`, hors: !touche(r.du || r.au, r.au || r.du) })), null]),
  ].filter(([, l]) => l.length)
  const nbHors = v.paie_dates_mois ? lignes.reduce((n, [, l]) => n + l.filter(x => x.hors).length, 0) : 0
  return (
    <div className="paie-page etroite">
      <h2 style={{ margin: '0 0 6px', fontSize: 20 }}>Vérifie ta saisie — {salarie}</h2>
      <p className="aide" style={{ margin: '0 0 16px', fontSize: 14 }}>
        Une fois confirmée, ta fiche ne pourra plus être modifiée ni relue (seulement via une demande à la direction).
      </p>
      {nbHors > 0 && (
        <div className="encart att" style={{ marginBottom: 12 }}>
          {nbHors === 1 ? 'Une ligne n’est pas' : `${nbHors} lignes ne sont pas`} en {mois} ({nbHors === 1 ? 'signalée' : 'signalées'} ci-dessous). Si c’est voulu, tu peux confirmer ; sinon, touche « Corriger ».
        </div>
      )}
      <div className="carte paie-verif">
        <div><strong>Société :</strong> {societe}</div>
        {lignes.length === 0 && <div className="aide" style={{ marginTop: 8, fontSize: 15 }}>Rien à signaler ce mois-ci.</div>}
        {lignes.map(([s, l, total]) => (
          <div key={s.key} style={{ marginTop: 10 }}>
            <strong>{s.icon} {s.label}{v.paie_total_verif && total != null ? ` (${total} h)` : ''} :</strong>
            {l.map((x, i) => <div key={i} style={{ paddingLeft: 12 }}>• {x.t}{v.paie_dates_mois && x.hors && <span className="hors-mois"> — pas en {mois}</span>}</div>)}
          </div>
        ))}
        {data.commentaire && <div style={{ marginTop: 10 }}><strong>📝 Commentaire :</strong> {data.commentaire}</div>}
      </div>
      <div className="paie-boutons entre">
        <button className="btn" onClick={onBack} disabled={saving}>← Corriger</button>
        <button className="btn btn-prim" onClick={onConfirm} disabled={saving}>{saving ? 'Enregistrement…' : '✓ Confirmer et enregistrer'}</button>
      </div>
    </div>
  )
}
