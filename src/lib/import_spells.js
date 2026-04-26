import fs from 'fs'
import path from 'path'

const files = fs.readdirSync('./src/lib/spells_data')
const allSpells = []

for (const file of files) {
  const raw = fs.readFileSync(`./src/lib/spells_data/${file}`, 'utf-8')
  const data = JSON.parse(raw)
  const spells = data.spells || []
  const parseType = (type) => {
  if (!type) return 'Universal'
  const t = type.toLowerCase()
  if (t.includes('divina')) return 'Divina'
  if (t.includes('arcana')) return 'Arcana'
  return 'Universal'
}

const parseSchool = (type) => {
  const schools = ['Abjuração','Adivinhação','Convocação','Encantamento','Evocação','Ilusão','Necromancia','Transmutação']
  for (const school of schools) {
    if ((type || '').includes(school)) return school
  }
  return ''
}
  for (const spell of spells) {
    allSpells.push({
      name: spell.name,
      type: parseType(spell.type),
      circle: parseInt(spell.circle),
      school: parseSchool(spell.type) || spell.school || '',
      execution: spell.execution || '',
      range: spell.range || '',
      duration: spell.duration || '',
      target: spell.area || '',
      resistance: spell.resistance || '',
      publication: spell.publication || '',
      effect: spell.description || '',
      amplifiers: JSON.stringify(
        (spell.implements || []).map(i => ({
          cost: i.cost,
          effect: i.description,
          isTrick: i.cost === 'Truque'
        }))
      ),
      is_public: true
    })
  }
}

let sql = 'BEGIN;\n\n'
for (const s of allSpells) {
  const esc = str => (str || '').replace(/'/g, "''")
  sql += `INSERT INTO spells (name, type, circle, school, execution, range, duration, target, resistance, publication, effect, amplifiers, is_public) VALUES ('${esc(s.name)}', '${esc(s.type)}', ${s.circle}, '${esc(s.school)}', '${esc(s.execution)}', '${esc(s.range)}', '${esc(s.duration)}', '${esc(s.target)}', '${esc(s.resistance)}', '${esc(s.publication)}', '${esc(s.effect)}', '${esc(s.amplifiers)}'::jsonb, true);\n`
}
sql += '\nCOMMIT;'

fs.writeFileSync('./spells_import.sql', sql)
console.log(`Geradas ${allSpells.length} magias!`)