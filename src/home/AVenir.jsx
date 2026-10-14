import { useState, useEffect, useMemo } from 'react'
import { useLiveQuery } from '../lib/useLiveQuery'
import { db } from '../db'
import { isoDate } from '../agenda/dates'
import { fetchGoogleEvents, messageCalendriers } from '../agenda/googleCalendars'
import { aller } from '../shell/navigation'
import { useCompte } from '../context/CompteContext'

const MAX = 4
const JOURS = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi']
const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']
const hhmm = d => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`

function libelleJour(iso, auj) {
  const d = new Date(iso + 'T12:00'), a = new Date(auj + 'T12:00')
  const ecart = Math.round((d - a) / 86400000)
  if (ecart === 0) return "Aujourd'hui"
  if (ecart === 1) return 'Demain'
  return `${JOURS[d.getDay()]} ${d.getDate()}${ecart > 6 ? ' ' + MOIS[d.getMonth()] : ''}`
}

// Bloc « À venir » de l'accueil, façon widget Calendrier de l'iPhone : ce qui reste aujourd'hui, puis les jours suivants
// pour compléter les lignes libres (4 au plus). Barre de couleur du magasin pour les calendriers des magasins ;
// les événements saisis dans l'outil (communs aux 3 magasins) ont la barre violette « commun » de la maquette.
const COULEUR_COMMUN = '#8b5cf6'
export default function AVenir() {
  const [google, setGoogle] = useState([])
  const { estDirection } = useCompte()
  const [maintenant, setMaintenant] = useState(() => new Date())
  const app = useLiveQuery(() => db.evenements.toArray(), [])

  useEffect(() => {
    const debut = new Date(); debut.setHours(0, 0, 0, 0)
    const fin = new Date(debut); fin.setDate(fin.getDate() + 60)
    let actif = true
    fetchGoogleEvents(debut, fin).then(evs => { if (actif) setGoogle(evs) })
    const t = setInterval(() => setMaintenant(new Date()), 5 * 60000)   // un rendez-vous passé disparaît de lui-même
    return () => { actif = false; clearInterval(t) }
  }, [])

  const auj = isoDate(maintenant)
  const evs = useMemo(() => {
    // Un rendez-vous du jour reste affiché jusqu'à une heure après son début (l'heure de fin n'est pas connue) ; « toute la journée » reste jusqu'au soir
    const limite = hhmm(new Date(maintenant.getTime() - 60 * 60000))
    const tous = [...(app || []).map(e => ({ ...e, source: 'app' })), ...google]
      .filter(e => e.date > auj || (e.date === auj && (!e.heure || e.heure >= limite)))
    tous.sort((a, b) => (a.date + (a.heure || '00:00')).localeCompare(b.date + (b.heure || '00:00')))
    return tous.slice(0, MAX)
  }, [app, google, auj, maintenant])

  if (app === undefined) return <div className="liste"><div className="ligne"><span className="txt"><span className="t2">Chargement…</span></span></div></div>
  const manque = messageCalendriers(google, estDirection)
  const avis = manque && <div key="avis" className="aide att" style={{ padding: '6px 14px' }}>{manque}</div>
  if (!evs.length) return <div className="liste"><div className="ligne"><span className="txt"><span className="t1" style={{ fontWeight: 500, color: 'var(--doux)' }}>Aucun événement à venir</span></span></div>{avis}</div>
  let jourPrec = ''
  return (
    <div className="liste">
      {evs.map(e => {
        const lib = libelleJour(e.date, auj), entete = lib !== jourPrec ? lib : ''
        jourPrec = lib
        return [
          entete && <div key={'j' + e.date} className="jour-agenda">{entete}</div>,
          <button key={e.id} className="ligne ligne-agenda" onClick={() => aller('agenda')}>
            <span className="barre-agenda" style={{ background: e.source === 'google' ? e.color : COULEUR_COMMUN }} />
            <span className="txt"><span className="t1">{e.titre}</span>
              <div className="t2">{e.heure || 'Toute la journée'}{e.source === 'google' ? ' · ' + e.calLabel : ''}</div></span>
          </button>,
        ]
      })}
      {avis}
    </div>
  )
}
