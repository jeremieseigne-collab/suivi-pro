// App « Commandes Clients » — listes et couleurs

export const MAGASINS = ['Bailly Albi', 'Bailly Rouffiac-Tolosan', 'Les 2 Zèbres']

// Comparaison de noms de magasin sans tenir compte des majuscules, accents, espaces ni tirets
// (« Bailly Rouffiac Tolosan » = « Bailly Rouffiac-Tolosan ») : les deux écritures existent dans les commandes.
export const formeMagasin = nom => (nom || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '')
export const memeMagasin = (a, b) => !!a && !!b && formeMagasin(a) === formeMagasin(b)

// Nom « Commandes » d'un magasin de la base (ex. « Bailly Rouffiac Tolosan » ou « Bailly Rouffiac » → « Bailly Rouffiac-Tolosan »)
export function magasinCommandes(nom) {
  if (!nom) return ''
  const n = formeMagasin(nom)
  return MAGASINS.find(m => formeMagasin(m) === n)
    || MAGASINS.find(m => formeMagasin(m).startsWith(n) || n.startsWith(formeMagasin(m)))
    || nom
}

// La liste des salariés vit désormais dans la table `salaries` (gérée dans Paramètres).

export const PROVENANCES = ['Bailly Albi', 'Bailly Rouffiac', 'Les 2 Zèbres', 'BtoB']

export const STATUTS = ['À commander', 'Commandée', 'Reçue', 'Client prévenu', 'Retirée', 'Annulée']

// États considérés comme « terminés » (sortis du flux actif)
export const STATUTS_CLOS = ['Retirée', 'Annulée']

export const STATUT_COLOR = {
  'À commander':    { bg: '#fef3c7', text: '#d97706' },
  'Commandée':      { bg: '#dbeafe', text: '#2563eb' },
  'Reçue':          { bg: '#e0e7ff', text: '#4f46e5' },
  'Client prévenu': { bg: '#cffafe', text: '#0891b2' },
  'Retirée':        { bg: '#d1fae5', text: '#059669' },
  'Annulée':        { bg: '#fee2e2', text: '#dc2626' },
}

export const PROVENANCE_COLOR = {
  'Bailly Albi':     { bg: '#dbeafe', text: '#2563eb' },
  'Bailly Rouffiac': { bg: '#d1fae5', text: '#059669' },
  'Les 2 Zèbres':    { bg: '#fef3c7', text: '#d97706' },
  'BtoB':            { bg: '#ede9fe', text: '#7c3aed' },
}
