// App « Commandes Clients » — listes et couleurs

export const MAGASINS = ['Bailly Albi', 'Bailly Rouffiac-Tolosan', 'Les 2 Zèbres']

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
