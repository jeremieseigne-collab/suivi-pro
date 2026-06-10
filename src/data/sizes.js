// Size type definitions — labels match the sheet header rows 2-5
// colOffset = décalage par rapport à col_9 (première colonne de taille)
//   TU / F / H / E / B → col_9+ (offset 0, structure historique)
//   ACC → col_10+       (offset 1, car col_9 = TU et les acc commencent à XS = col_10)
export const SIZE_TYPES = {
  F:   { label: 'Femme',        code: 'F :',  colOffset: 0, sizes: ['34','35','35.5','36','36.5','37','37.5','38','38.5','39','39.5','40','40.5','41','41.5'] },
  H:   { label: 'Homme',        code: 'H :',  colOffset: 0, sizes: ['39','40','40.5','41','41.5','42','42.5','43','43.5','44','44.5','45','46'] },
  E:   { label: 'Enfant',       code: 'E :',  colOffset: 0, sizes: ['17','18','19','20','21','22','23','24','25','26','27','28','29','30','31','32','33','34','35','36','37','38','39','40'] },
  B:   { label: 'Bébé',         code: 'B :',  colOffset: 0, sizes: ['17-18','19-20','21-22','23-24','25-26','27'] },
  TU:  { label: 'Taille Unique', code: '',     colOffset: 0, sizes: ['TU'] },
  ACC: { label: 'Accessoire',    code: '',     colOffset: 1, sizes: ['XS','S','M','L','XL','XXL'] },
}

// Column keys in the Apps Script JSON — in order after the type code column
export const SIZE_COL_KEYS = [
  'TU','XS','S','M','L','XL','XXL',
  'col_16','col_17','col_18','col_19','col_20','col_21','col_22','col_23',
  'col_24','col_25','col_26','col_27','col_28','col_29','col_30','col_31',
]

// Build a 35-element row array for appending to the Entrees sheet
export function buildEntreeRow({ statut, magasin, date, marque, modele, numero, categorie, pht, typeKey, quantities }) {
  const type = SIZE_TYPES[typeKey]
  const total = quantities.reduce((s, v) => s + (parseInt(v) || 0), 0)

  // 35 columns: col_0..col_34
  const row = Array(35).fill('')

  row[0] = statut
  row[1] = magasin
  row[2] = date
  row[3] = marque
  row[4] = modele
  row[5] = numero
  row[6] = categorie
  row[7] = total
  row[8] = type?.code ?? ''       // type code column

  // Fill size quantities into the right column positions (avec colOffset)
  const sizeCount  = type?.sizes?.length ?? 0
  const colOffset  = type?.colOffset ?? 0
  for (let i = 0; i < sizeCount; i++) {
    row[9 + colOffset + i] = parseInt(quantities[i]) || ''
  }

  row[33] = pht ? Number(pht) : ''

  return row
}
