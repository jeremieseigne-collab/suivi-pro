// Retour ET réparation partagent les mêmes statuts. La mise à la forme n'a plus de statut.
export const STATUTS_RETOUR     = ['Mail marque envoyé', 'Clôturé']
export const DECISIONS      = ['Remboursement', 'Échange', 'Avoir', 'Réparation']
export const ETAPES_REPARATION = [
  'Déposé chez le cordonnier',
  'Prête',
  'En attente du client',
  'Client appelé',
  'Récupéré par le client',
]

export const STATUT_COLORS = {
  'Reçu':                '#f59e0b',
  'Mail marque envoyé':  '#3b82f6',
  'Réponse reçue':       '#8b5cf6',
  'Clôturé':             '#10b981',
  'Déposé':              '#f59e0b',
  'En cours':            '#3b82f6',
  'Prêt à récupérer':    '#8b5cf6',
  'Récupéré':            '#10b981',
}
