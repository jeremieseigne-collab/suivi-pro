// Icônes au trait (remplacent les emojis des menus). Couleur = couleur du texte.
const TRACES = {
  accueil:    'M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
  entrees:    'M21 8v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8 M1.5 8h21L19 3H5z M10 12h4',
  clients:    'M9 4a4 4 0 1 1 0 8 4 4 0 0 1 0-8z M2 21c0-4 3-6 7-6s7 2 7 6 M16 4a4 4 0 0 1 0 8 M19 15c2 .8 3 2.6 3 6',
  reassort:   'M21 12a9 9 0 1 1-3-6.7 M21 3v6h-6',
  plus:       'M5 11a1 1 0 1 1 0 2 1 1 0 0 1 0-2z M12 11a1 1 0 1 1 0 2 1 1 0 0 1 0-2z M19 11a1 1 0 1 1 0 2 1 1 0 0 1 0-2z',
  sav:        'M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.6 2.6-2.4-.6-.6-2.4z',
  defectueux: 'M4 7h16v13H4z M4 7l2-4h12l2 4 M11 11l2 2-2 2 2 2',
  commande:   'M6 2h12l2 5H4z M4 7h16v14H4z M9 11a3 3 0 0 0 6 0',
  repertoire: 'M5 3h13a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H5z M12 7a3 3 0 1 1 0 6 3 3 0 0 1 0-6z M7.5 17c.8-2 2.4-3 4.5-3s3.7 1 4.5 3 M3 7h3 M3 12h3 M3 17h3',
  planning:   'M3 4h18v17H3z M3 9h18 M8 2v4 M16 2v4',
  agenda:     'M3 4h18v17H3z M3 9h18 M8 2v4 M16 2v4 M7 13h10 M7 17h6',
  paie:       'M6 2h9l5 5v15H6z M14 2v6h6 M9 13h8 M9 17h5',
  achats:     'M3 3h2l2.5 12h11L21 7H6.2 M9 18.6a1.4 1.4 0 1 1 0 2.8 1.4 1.4 0 0 1 0-2.8z M18 18.6a1.4 1.4 0 1 1 0 2.8 1.4 1.4 0 0 1 0-2.8z',
  reglement:  'M2 5h20v14H2z M2 10h20 M6 15h4',
  facture:    'M5 2h14v20l-3-2-2 2-2-2-2 2-2-2-3 2z M9 7h6 M9 11h6 M9 15h3',
  reglages:   'M12 8.5a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7z M12 2v3 M12 19v3 M2 12h3 M19 12h3 M4.9 4.9l2.1 2.1 M17 17l2.1 2.1 M4.9 19.1 7 17 M17 7l2.1-2.1',
  magasin:    'M3 9 5 3h14l2 6 M3 9h18v1a3 3 0 0 1-6 0 3 3 0 0 1-6 0 3 3 0 0 1-6 0z M5 13v8h14v-8',
  chevron:    'm9 6 6 6-6 6',
  bas:        'm6 9 6 6 6-6',
  fermer:     'M6 6l12 12 M18 6 6 18',
  ajout:      'M12 5v14 M5 12h14',
  check:      'm5 12 5 5L20 7',
  cherche:    'M11 4a7 7 0 1 1 0 14 7 7 0 0 1 0-14z m9 16-3.5-3.5',
  filtre:     'M3 5h18 M6 12h12 M10 19h4',
  sortie:     'M15 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4 M10 17l5-5-5-5 M15 12H4',
  replier:    'm15 6-6 6 6 6 M20 4v16',
  deplier:    'm9 6 6 6-6 6 M4 4v16',
  mail:       'M3 5h18v14H3z m0 0 9 7 9-7',
  crayon:     'M4 20h4L19 9l-4-4L4 16z M13.5 6.5l4 4',
  corbeille:  'M4 7h16 M9 7V4h6v3 M6 7l1 13h10l1-13 M10 11v6 M14 11v6',
  horloge:    'M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18z M12 7v5l3 2',
  telephone:  'M5 3h4l2 5-2.5 1.5a11 11 0 0 0 6 6L16 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 5a2 2 0 0 1 2-2z',
  message:    'M4 4h16v12H8l-4 4z',
  apparence:  'M12 3a9 9 0 1 0 9 9 7 7 0 0 1-9-9z',
  livraison:  'M2 6h12v11H2z M14 10h4l4 4v3h-8z M6 17a2 2 0 1 1 0 4 2 2 0 0 1 0-4z M18 17a2 2 0 1 1 0 4 2 2 0 0 1 0-4z',
}

export default function Icone({ nom, taille, style, titre }) {
  const d = TRACES[nom]
  if (!d) return null
  return (
    <svg className="icone" viewBox="0 0 24 24" aria-hidden={titre ? undefined : true} role={titre ? 'img' : undefined}
      style={{ ...(taille ? { width: taille, height: taille } : {}), ...style }}>
      {titre && <title>{titre}</title>}
      <path d={d} />
    </svg>
  )
}
