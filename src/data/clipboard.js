// Clipboard partagé entre EntreeForm et EntreeEditModal
// { typeKey: string, quantities: string[] }
let clipboard = null

export function getClipboard() { return clipboard }
export function setClipboard(data) { clipboard = data }
