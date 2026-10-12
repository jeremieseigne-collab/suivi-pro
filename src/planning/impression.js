import { parseLocal, fmtShort } from '../agenda/dates'
import { JOURS } from './constants'
import { isGerant } from '../paie/constants'
import { addDays, fmtH, weekLabel } from './temps'

// Impression du planning : même page que l'outil actuel (titre « Planning [magasin] », une table par semaine, couleurs des salariés)
const esc = s => (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

export function buildWeekSection(isoMonday, shiftsForWeek, { employees, salaryNames, colorMap }) {
  const getS = (nom, i) => shiftsForWeek.find(s => s.salarie === nom && s.jour === i)
  const hasShift  = nom => shiftsForWeek.some(s => s.salarie === nom)
  const tempNames = [...new Set(shiftsForWeek.filter(s => !salaryNames.has(s.salarie) && !isGerant(s.salarie)).map(s => s.salarie))]
  const rows = [...employees.filter(e => hasShift(e.nom)), ...tempNames.map(nom => ({ nom }))]
  const label = weekLabel(isoMonday)

  if (rows.length === 0) {
    return `<div class="wk-label">${esc(label)}</div><p style="color:#aaa;font-style:italic;font-size:9pt;margin:4px 0 0">Aucun horaire saisi</p>`
  }

  const thead = `<tr>
      <th class="name-col">Salarié</th>
      ${JOURS.map((j, i) => {
        const d = parseLocal(addDays(isoMonday, i))
        return `<th>${esc(j)}<br><span class="sub">${esc(fmtShort(d))}</span></th>`
      }).join('')}
    </tr>`

  const tbody = rows.map(row => {
    const nom   = row.nom
    const color = colorMap[nom] || '#3b82f6'
    const cells = JOURS.map((_, i) => {
      const s = getS(nom, i)
      if (!s) return '<td></td>'
      const note = s.note ? `<br><span class="note">${esc(s.note)}</span>` : ''
      return `<td><span class="shift" style="border-left-color:${color};background:${color}18">${esc(fmtH(s.heureDebut))} – ${esc(fmtH(s.heureFin))}${note}</span></td>`
    }).join('')
    return `<tr>
        <td class="name-cell"><span class="dot" style="background:${color}"></span>${esc(nom)}</td>
        ${cells}
      </tr>`
  }).join('')

  return `<div class="wk-label">${esc(label)}</div>
<table><thead>${thead}</thead><tbody>${tbody}</tbody></table>`
}

export function buildPrintPage(mag, content) {
  return `<!DOCTYPE html>
<html lang="fr"><head>
  <meta charset="utf-8">
  <title>Planning ${esc(mag)}</title>
  <style>
    @page { size: A4; margin: 0; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, system-ui, sans-serif; font-size: 10pt; color: #111; padding: 13mm 14mm; }
    h1 { font-size: 15pt; font-weight: 800; letter-spacing: -.3px; margin-bottom: 8px; padding-bottom: 6px; border-bottom: 2px solid #222; }
    .wk-label { font-size: 8pt; color: #666; font-weight: 700; text-transform: uppercase; letter-spacing: .5px; margin: 0 0 5px; }
    .sep { height: 2px; background: #bbb; margin: 30px 0 22px; }
    table { width: 100%; border-collapse: collapse; border: 1px solid #bbb; }
    th { background: #f0f0f0; color: #333; font-size: 8.5pt; font-weight: 700; padding: 5px 6px; text-align: center; border: 1px solid #ccc; }
    th.name-col { text-align: left; width: 130px; }
    .sub { font-weight: 400; font-size: 7.5pt; opacity: .7; }
    td { border: 1px solid #ddd; padding: 4px 5px; text-align: center; vertical-align: middle; height: 28px; }
    td.name-cell { text-align: left; background: #f7f7f7; font-weight: 600; font-size: 9pt; padding-left: 8px; }
    .dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 6px; vertical-align: middle; }
    .shift { display: inline-block; border-left: 3px solid; border-radius: 3px; padding: 2px 7px; font-size: 8.5pt; font-weight: 700; }
    .note { font-size: 7pt; font-weight: 400; opacity: .65; }
  </style>
</head><body>
  <h1>Planning ${esc(mag)}</h1>
  ${content}
</body></html>`
}

export function openPrintWindow(html) {
  const w = window.open('', '_blank')
  if (!w) return false
  w.document.write(html)
  w.document.close()
  w.focus()
  w.onafterprint = () => w.close()
  setTimeout(() => w.print(), 250)
  return true
}
