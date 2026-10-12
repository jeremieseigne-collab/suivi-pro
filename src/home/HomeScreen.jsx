import { useLiveQuery } from '../lib/useLiveQuery'
import { db } from '../db'
import { useMagasin } from '../context/MagasinContext'
import { useCompte } from '../context/CompteContext'
import { useSeason } from '../context/SeasonContext'
import Icone from '../components/ui/Icone'
import { aller, ouvrirAvec } from '../shell/navigation'
import { SAV_ATTENTE_JOURS } from './useAlerts'
import AVenir from './AVenir'
import './accueil.css'

const pluriel = (n, mot, pl = mot + 's') => `${n} ${n > 1 ? pl : mot}`

// Accueil « ma journée » (version sobre) : raccourcis, compteurs (trait de couleur, chiffre en noir, zéro masqué),
// tâches en retard, et bloc « À venir » de l'agenda. Le pointage n'apparaît que pour la Direction.
export default function HomeScreen({ alerts }) {
  const { magasin } = useMagasin()
  const { estDirection } = useCompte()
  const { season, seasons } = useSeason()
  const date = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
  const salut = new Date().getHours() < 18 ? 'Bonjour' : 'Bonsoir'

  // Entrées à pointer (Direction) : même calcul que le filtre « À pointer » du Cahier — saison affichée, magasin de l'appareil
  const aPointer = useLiveQuery(async () => {
    if (!estDirection) return 0
    const lignes = await db.entrees.where('season').equals(season).toArray()
    return lignes.filter(e => (!magasin || e.magasinId === magasin.id) && !e.pointe).length
  }, [estDirection, season, magasin?.id])

  // Compteurs : mêmes intitulés et couleurs que l'outil actuel ; la couleur ne sert qu'au trait à gauche
  const compteurs = [
    { n: alerts?.aCommander, label: 'Réassorts à commander', couleur: '#ef4444', vue: 'reassort' },
    { n: alerts?.enRoute, label: 'Réassorts en route', couleur: '#8b5cf6', vue: 'reassort', sous: alerts?.retardRoute ? { texte: `dont ${alerts.retardRoute} en retard`, urgent: true } : null },
    { n: alerts?.cmdAPrevenir, label: 'Clients à prévenir', couleur: '#0891b2', vue: 'commandes', action: 'recues', sous: alerts?.cmdACommander ? { texte: `${alerts.cmdACommander} à commander` } : null },
    { n: alerts?.defATraiter, label: 'Défectueux à traiter', couleur: '#e11d48', vue: 'defectueux' },
    { n: alerts?.savEnCours, label: 'Dossiers SAV en cours', couleur: '#0e7490', vue: 'sav' },
  ].filter(c => c.n > 0)

  // Tâches en retard
  const taches = []
  const r = alerts?.retards || []
  if (r.length) taches.push({ icone: 'reassort', vue: () => aller('reassort'), urgent: r.some(x => x.niveau === 'rouge'),
    titre: `${pluriel(r.length, 'réassort')} en retard`,
    sous: `${[r[0].marque, r[0].modele].filter(Boolean).join(' · ')} · ${r[0].statut === 'Demandé' ? `demandé il y a ${r[0].jours} jours — relancer la marque` : `en route depuis ${r[0].jours} jours`}${r.length > 1 ? ` · et ${pluriel(r.length - 1, 'autre')}` : ''}` })
  const s = alerts?.savAnciens || []
  if (s.length) taches.push({ icone: 'sav', vue: () => aller('sav'),
    titre: `${pluriel(s.length, 'dossier SAV ouvert', 'dossiers SAV ouverts')} depuis plus de ${SAV_ATTENTE_JOURS} jours`,
    sous: `${[s[0].client, s[0].marque].filter(Boolean).join(' · ')} · ${s[0].jours} jours · ${s[0].mailEnvoye ? 'mail envoyé à la marque' : 'mail à la marque pas encore envoyé'}${s.length > 1 ? ` · et ${pluriel(s.length - 1, 'autre')}` : ''}` })
  if (estDirection && aPointer > 0) taches.push({ icone: 'entrees', vue: () => ouvrirAvec('cahier', 'apointer'),
    titre: `${pluriel(aPointer, 'entrée')} à pointer`,
    sous: `${seasons.find(x => x.id === season)?.label || season}${magasin ? ' · ' + magasin.nom : ''}` })

  return (
    <div className="page-coque accueil">
      <header className="entete-accueil">
        <div className="date-accueil">{date.charAt(0).toUpperCase() + date.slice(1)}{magasin ? ` · ${magasin.nom}` : ''}</div>
        <h1 className="titre-page">{salut}</h1>
      </header>

      {!magasin && <div className="encart neutre" style={{ marginBottom: 14 }}>Choisis ton magasin dans le menu (« Plus » sur téléphone) : tous les outils l'utiliseront directement.</div>}

      <div className="raccourcis">
        <button className="btn btn-prim" onClick={() => ouvrirAvec('cahier', 'nouveau')}><Icone nom="ajout" taille={20} />Saisir une entrée</button>
        <button className="btn" onClick={() => ouvrirAvec('commandes', 'nouveau')}><Icone nom="commande" taille={20} />Commande client</button>
        <button className="btn" onClick={() => ouvrirAvec('sav', 'nouveau')}><Icone nom="sav" taille={20} />Dossier SAV</button>
      </div>

      {compteurs.length > 0 && (
        <div className="compteurs">
          {compteurs.map(c => (
            <button key={c.label} className="compteur" style={{ '--c': c.couleur }} onClick={() => c.action ? ouvrirAvec(c.vue, c.action) : aller(c.vue)}>
              <b>{c.n}</b><span>{c.label}</span>{c.sous && <em className={c.sous.urgent ? 'urgent' : ''}>{c.sous.texte}</em>}
            </button>
          ))}
        </div>
      )}

      <div className="grille-accueil">
        <section>
          <h2 className="groupe-titre">En retard</h2>
          <div className="liste">
            {taches.length ? taches.map(t => (
              <button key={t.titre} className="ligne" onClick={t.vue}>
                <span className="icone-tache"><Icone nom={t.icone} taille={20} /></span>
                <span className="txt"><span className="t1">{t.titre}</span><div className={`t2${t.urgent ? ' urgent' : ''}`}>{t.sous}</div></span>
                <Icone nom="chevron" taille={18} style={{ color: 'var(--discret)' }} />
              </button>
            )) : <div className="ligne"><span className="txt"><span className="t1" style={{ fontWeight: 500, color: 'var(--doux)' }}>Rien en retard</span></span></div>}
          </div>
        </section>
        <section>
          <h2 className="groupe-titre">À venir</h2>
          <AVenir />
          <div style={{ textAlign: 'right', marginTop: 6 }}><button className="lien" onClick={() => aller('agenda')}>Voir l'agenda</button></div>
        </section>
      </div>
    </div>
  )
}
