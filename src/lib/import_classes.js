import fs from 'fs'
import path from 'path'

// ─── Estrutura real dos JSONs ─────────────────────────────────────────────────
// {
//   name        : string
//   hp          : number   — PV base (nível 1)
//   addHP       : number   — PV adicionados por nível
//   pm          : number   — PM por nível
//   skills      : string[] — perícias treinadas automaticamente
//   extraSkillsQty : number
//   extraSkills : string[] — pool de perícias à escolha
//   proficiencies : string[]
//   abilities   : [{ name, description }]
//                 * sem is_power explícito
//                 * poderes têm "Pré-requisito" no final da descrição
//                 * habilidades fixas não têm
// }
// ─────────────────────────────────────────────────────────────────────────────

const dataDir = './src/lib/classes_data'
const files   = fs.readdirSync(dataDir).filter(f => f.endsWith('.json')).sort()

// Regex para detectar e extrair o trecho "Pré-requisito(s): ..." da descrição
const PREREQ_RE = /\s*Pré-requisitos?:\s*([^.]+\.?)\s*$/i

// Escapa aspas simples para SQL
const esc = str => String(str ?? '').replace(/'/g, "''")

// ─── Diagnóstico do primeiro arquivo ─────────────────────────────────────────
const sampleRaw = fs.readFileSync(path.join(dataDir, files[0]), 'utf-8')
const sample    = JSON.parse(sampleRaw)

console.log('\n══ Estrutura do primeiro JSON:', files[0], '══')
console.log('  Campos raiz    :', Object.keys(sample).join(', '))
console.log('  abilities total:', sample.abilities?.length ?? 0)
console.log('  powers campo   :', sample.powers !== undefined ? `sim (${sample.powers.length})` : 'ausente')

const samplePowers = (sample.abilities ?? []).filter(a => PREREQ_RE.test(a.description))
const sampleFixed  = (sample.abilities ?? []).filter(a => !PREREQ_RE.test(a.description))
console.log('  → habilidades fixas  (sem Pré-requisito):', sampleFixed.length)
console.log('  → poderes detectados (com Pré-requisito):', samplePowers.length)
if (samplePowers.length > 0) {
  console.log('  → ex. poder:', samplePowers[0].name,
    '|', samplePowers[0].description.match(PREREQ_RE)?.[1] ?? '')
}
console.log()

// ─── Geração do SQL ───────────────────────────────────────────────────────────
let sql = 'BEGIN;\n\n'
sql += '-- Limpa dados anteriores\n'
sql += 'DELETE FROM class_abilities;\n'
sql += 'DELETE FROM classes;\n\n'

let totalClasses   = 0
let totalAbilities = 0
let totalPowers    = 0

for (const file of files) {
  const cls = JSON.parse(fs.readFileSync(path.join(dataDir, file), 'utf-8'))

  // Derivar campos de texto a partir dos campos numéricos dos JSONs
  const hit_points  = cls.hit_points  ?? `${cls.hp}+CON`
  const mana_points = cls.mana_points ?? `${cls.pm} por nível`

  // Lista de perícias: obrigatórias primeiro, depois o pool (sem duplicatas)
  const mandatory = cls.skills      ?? []
  const pool      = cls.extraSkills ?? []
  const allSkills = [...new Set([...mandatory, ...pool])]

  const skillsJson = esc(JSON.stringify(allSkills))
  const profsJson  = esc(JSON.stringify(cls.proficiencies ?? []))

  // ── INSERT classes ──────────────────────────────────────────────────────
  sql += `-- Classe: ${cls.name}\n`
  sql += `INSERT INTO classes (name, publication, hit_points, mana_points, skills, proficiencies) VALUES (`
  sql += `'${esc(cls.name)}', `
  sql += `'${esc(cls.publication ?? 'Tormenta20')}', `
  sql += `'${esc(hit_points)}', `
  sql += `'${esc(mana_points)}', `
  sql += `'${skillsJson}'::jsonb, `
  sql += `'${profsJson}'::jsonb`
  sql += `);\n`
  totalClasses++

  // ── INSERT class_abilities ──────────────────────────────────────────────
  for (const ab of cls.abilities ?? []) {
    const prereqMatch = ab.description.match(PREREQ_RE)
    const isPower     = prereqMatch !== null

    // Descrição limpa: remove o trecho "Pré-requisito(s): ..." do final
    const cleanDesc = ab.description.replace(PREREQ_RE, '').trimEnd()

    if (isPower) {
      const prereqText = prereqMatch[1].replace(/\.$/, '').trim()
      const prereqJson = esc(JSON.stringify({ other: prereqText }))

      sql += `INSERT INTO class_abilities (class_name, name, level, description, is_power, prerequisites) VALUES (`
      sql += `'${esc(cls.name)}', `
      sql += `'${esc(ab.name)}', `
      sql += `${ab.level ?? 1}, `
      sql += `'${esc(cleanDesc)}', `
      sql += `true, `
      sql += `'${prereqJson}'::jsonb`
      sql += `);\n`
      totalPowers++
    } else {
      sql += `INSERT INTO class_abilities (class_name, name, level, description, is_power, prerequisites) VALUES (`
      sql += `'${esc(cls.name)}', `
      sql += `'${esc(ab.name)}', `
      sql += `${ab.level ?? 1}, `
      sql += `'${esc(cleanDesc)}', `
      sql += `false, `
      sql += `NULL`
      sql += `);\n`
      totalAbilities++
    }
  }

  sql += '\n'
}

sql += 'COMMIT;\n'

fs.writeFileSync('./classes_import.sql', sql)
console.log(`✓ ${totalClasses} classes`)
console.log(`✓ ${totalAbilities} habilidades fixas  (is_power=false)`)
console.log(`✓ ${totalPowers} poderes detectados (is_power=true)`)
console.log('→ Arquivo gerado: classes_import.sql')
