import { useState } from 'react'
import { db } from '../db'
import { isoDate } from './dates'
import Icone from '../components/ui/Icone'
import Confirmation from '../components/ui/Confirmation'

// Ajout / modification / suppression d'un événement saisi dans l'outil (table evenements : titre, date, heure, note).
// Mêmes champs et mêmes données qu'avant. Date proposée : aujourd'hui en heure française (avant : heure anglaise, la veille entre minuit et 2 h).
export default function AgendaModal({ event, defaultDate, onClose, onSaved }) {
  const editing = !!event?.id
  const [form, setForm] = useState({
    titre: event?.titre || '',
    date:  event?.date  || defaultDate || isoDate(new Date()),
    heure: event?.heure || '',
    note:  event?.note  || '',
  })
  const [saving,     setSaving]     = useState(false)
  const [error,      setError]      = useState('')
  const [confirmDel, setConfirmDel] = useState(false)

  function set(field, value) { setForm(f => ({ ...f, [field]: value })) }

  async function handleDelete() {
    setConfirmDel(false)
    setSaving(true)
    try { await db.evenements.delete(event.id); onSaved() }
    catch (e) { setError(e.message || 'Erreur à la suppression.'); setSaving(false) }
  }

  async function handleSave() {
    if (!form.titre.trim()) { setError('Donne un titre à l’événement.'); return }
    if (!form.date)         { setError('Choisis une date.'); return }
    setSaving(true); setError('')
    try {
      if (editing) await db.evenements.update(event.id, form)
      else         await db.evenements.add(form)
      onSaved()
    } catch (e) {
      setError(e.message || "Erreur à l'enregistrement.")
      setSaving(false)
    }
  }

  const titre = editing ? "Modifier l'événement" : 'Nouvel événement'
  return (
    <>
      <div className="feuille-fond" onClick={onClose} />
      <div className="feuille" role="dialog" aria-label={titre}>
        <div className="feuille-entete"><h2>{titre}</h2><button className="icone-btn" onClick={onClose} aria-label="Fermer"><Icone nom="fermer" /></button></div>
        <div className="feuille-corps">
          <label className="etiquette" htmlFor="ag-titre">Titre *</label>
          <input id="ag-titre" className="champ" value={form.titre} onChange={e => set('titre', e.target.value)} autoFocus placeholder="ex : RDV client Dupont" />
          <div className="deux-champs-agenda">
            <label className="etiquette">Date *<input className="champ" type="date" value={form.date} onChange={e => set('date', e.target.value)} /></label>
            <label className="etiquette">Heure<input className="champ" type="time" value={form.heure} onChange={e => set('heure', e.target.value)} /></label>
          </div>
          <label className="etiquette" htmlFor="ag-note" style={{ marginTop: 12 }}>Note</label>
          <textarea id="ag-note" className="champ" value={form.note} onChange={e => set('note', e.target.value)} rows={3} style={{ resize: 'vertical' }} />
          <div className="aide" style={{ marginTop: 8 }}>Visible par les 3 magasins.</div>
          {error && <div className="encart err" style={{ marginTop: 12 }}>{error}</div>}
        </div>
        <div className="feuille-pied">
          {editing && <button className="btn btn-danger" onClick={() => setConfirmDel(true)} disabled={saving}>Supprimer</button>}
          <span style={{ flex: 1 }} />
          <button className="btn" onClick={onClose}>Annuler</button>
          <button className="btn btn-prim" onClick={handleSave} disabled={saving}>{saving ? 'Enregistrement…' : (editing ? 'Enregistrer' : "Créer l'événement")}</button>
        </div>
      </div>
      {confirmDel && (
        <Confirmation danger titre="Supprimer cet événement ?" texte={`« ${event.titre} » sera retiré de l'agenda des 3 magasins.`}
          confirmer="Supprimer" onAnnuler={() => setConfirmDel(false)} onConfirmer={handleDelete} />
      )}
    </>
  )
}
