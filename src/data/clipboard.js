// Presse-papier des grilles de pointures (saisie et correction des entrées du Cahier)
// { typeKey: string, quantities: string[] }
let clipboard = null

export function getClipboard() { return clipboard }
export function setClipboard(data) { clipboard = data }
