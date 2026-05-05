import type { ElementType } from 'react'
import {
  Shield, Eye, Sparkles, Heart, Zap, EyeOff, Skull, RefreshCw,
  User, Star, FileText, Sword, BookOpen, Package, PawPrint,
} from 'lucide-react'
import type { Character, Spell, SkillEntry } from '../../types'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SkillDef {
  name: string
  attr: keyof Character['attributes']
  armorPenalty: boolean
  trainedOnly: boolean
}

export interface DbSpellRow {
  id: string; name: string; type: Spell['type']; circle: number
  school: Spell['school']; execution: string; range: string
  duration: string; target: string; resistance: string | null
  publication: string | null; effect: string
  amplifiers: Spell['amplifiers']; is_public: boolean; created_by: string | null
}

export interface ClassDef {
  hitPoints: string
  hpPerLevel: number
  manaPoints: string
}

export interface RaceData {
  id: string
  name: string
  size: string
  displacement: number
  race_attributes: { attr: string; mod: number }[]
  race_abilities: { name: string; description: string; sort_order: number }[]
}

export type Tab = 'geral' | 'pericias' | 'poderes' | 'origem' | 'combate' | 'grimorio' | 'equipamento' | 'companheiros'
export type SaveState = 'idle' | 'saving' | 'saved' | 'error'

// ─── Constants ────────────────────────────────────────────────────────────────

export const SCHOOL_ICONS: Record<string, ElementType> = {
  Abjuração: Shield, Adivinhação: Eye, Convocação: Sparkles,
  Encantamento: Heart, Evocação: Zap, Ilusão: EyeOff,
  Necromancia: Skull, Transmutação: RefreshCw,
}

export const BLANK: Character = {
  name: '', player: '', race: '', origin: '',
  classes: [{ name: '', level: 1 }],
  deity: 'Nenhuma', size: 'Médio', movement: 9, xp: 0,
  attributes: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
  hp: { max: 1, current: 1 }, mp: { max: 0, current: 0 },
  attacks: [],
  defense: { base: 10, armor: 0, shield: 0, other: 0, penalty: 0 },
  skills: {}, spells: [], powers: [], equipment: [],
  money: 0, carryLimit: 0, notes: '', originNotes: '',
  companions: [], companionLimit: 1,
}

export const ATTR_CONFIG: { key: keyof Character['attributes']; abbr: string; label: string }[] = [
  { key: 'str', abbr: 'FOR', label: 'Força' },
  { key: 'dex', abbr: 'DES', label: 'Destreza' },
  { key: 'con', abbr: 'CON', label: 'Constituição' },
  { key: 'int', abbr: 'INT', label: 'Inteligência' },
  { key: 'wis', abbr: 'SAB', label: 'Sabedoria' },
  { key: 'cha', abbr: 'CAR', label: 'Carisma' },
]

export const DEITY_OPTIONS = [
  'Nenhuma', 'Aharadak', 'Allihanna', 'Arsenal', 'Azgher', 'Hyninn',
  'Kallyadranoch', 'Khalmyr', 'Lena', 'Lin-Wu', 'Marah', 'Megalokk',
  'Nimb', 'Oceano', 'Sszzaas', 'Tauron', 'Tanna-Toh', 'Tenebra', 'Thiatys',
  'Thwor', 'Valkaria', 'Wynna',
]

export const ALL_SKILLS: SkillDef[] = [
  { name: 'Acrobacia',     attr: 'dex', armorPenalty: true,  trainedOnly: false },
  { name: 'Adestramento',  attr: 'cha', armorPenalty: false, trainedOnly: true  },
  { name: 'Atletismo',     attr: 'str', armorPenalty: false, trainedOnly: false },
  { name: 'Atuação',       attr: 'cha', armorPenalty: false, trainedOnly: false },
  { name: 'Cavalgar',      attr: 'dex', armorPenalty: false, trainedOnly: false },
  { name: 'Conhecimento',  attr: 'int', armorPenalty: false, trainedOnly: true  },
  { name: 'Cura',          attr: 'wis', armorPenalty: false, trainedOnly: false },
  { name: 'Diplomacia',    attr: 'cha', armorPenalty: false, trainedOnly: false },
  { name: 'Enganação',     attr: 'cha', armorPenalty: false, trainedOnly: false },
  { name: 'Fortitude',     attr: 'con', armorPenalty: false, trainedOnly: false },
  { name: 'Furtividade',   attr: 'dex', armorPenalty: true,  trainedOnly: false },
  { name: 'Guerra',        attr: 'int', armorPenalty: false, trainedOnly: true  },
  { name: 'Iniciativa',    attr: 'dex', armorPenalty: false, trainedOnly: false },
  { name: 'Intimidação',   attr: 'cha', armorPenalty: false, trainedOnly: false },
  { name: 'Intuição',      attr: 'wis', armorPenalty: false, trainedOnly: false },
  { name: 'Investigação',  attr: 'int', armorPenalty: false, trainedOnly: false },
  { name: 'Jogatina',      attr: 'cha', armorPenalty: false, trainedOnly: true  },
  { name: 'Ladinagem',     attr: 'dex', armorPenalty: true,  trainedOnly: true  },
  { name: 'Luta',          attr: 'str', armorPenalty: false, trainedOnly: false },
  { name: 'Misticismo',    attr: 'int', armorPenalty: false, trainedOnly: true  },
  { name: 'Nobreza',       attr: 'int', armorPenalty: false, trainedOnly: true  },
  { name: 'Ofício',        attr: 'int', armorPenalty: false, trainedOnly: true  },
  { name: 'Percepção',     attr: 'wis', armorPenalty: false, trainedOnly: false },
  { name: 'Pilotagem',     attr: 'dex', armorPenalty: false, trainedOnly: true  },
  { name: 'Pontaria',      attr: 'dex', armorPenalty: false, trainedOnly: false },
  { name: 'Reflexos',      attr: 'dex', armorPenalty: false, trainedOnly: false },
  { name: 'Religião',      attr: 'wis', armorPenalty: false, trainedOnly: true  },
  { name: 'Sobrevivência', attr: 'wis', armorPenalty: false, trainedOnly: false },
  { name: 'Vontade',       attr: 'wis', armorPenalty: false, trainedOnly: false },
]

export const TABS: { id: Tab; label: string; icon: ElementType }[] = [
  { id: 'geral',       label: 'Geral',              icon: User      },
  { id: 'pericias',    label: 'Perícias',            icon: Shield    },
  { id: 'poderes',     label: 'Poderes',             icon: Star      },
  { id: 'origem',      label: 'Origem & Anotações',  icon: FileText  },
  { id: 'combate',     label: 'Combate',             icon: Sword     },
  { id: 'grimorio',    label: 'Grimório',            icon: BookOpen  },
  { id: 'equipamento',   label: 'Equipamento',         icon: Package   },
  { id: 'companheiros',  label: 'Companheiros',        icon: PawPrint  },
]

export const INP = 'bg-transparent border-b border-stone-200 focus:border-tormenta-red focus:outline-none text-sm py-0.5 w-full'
export const INP_CARD = 'bg-stone-50 border border-stone-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-tormenta-red focus:border-tormenta-red w-full'
export const DEFAULT_SKILL: SkillEntry = { trained: false, training: 0, outros: 0 }

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function normalizeStr(str: string) {
  return str.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

export function attrMod(v: number) { return Math.floor((v - 10) / 2) }
export function fmtMod(v: number)  { const m = attrMod(v); return m >= 0 ? `+${m}` : `${m}` }
export function fmtBonus(n: number) { return n >= 0 ? `+${n}` : `${n}` }
export function totalLevel(c: Character) { return c.classes.reduce((s, cl) => s + cl.level, 0) }

export function parseHP(hitPoints: string): number {
  const match = hitPoints.match(/^(\d+)/)
  return match ? parseInt(match[1]) : 0
}

export function parseMP(manaPoints: string): number {
  const match = manaPoints.match(/^(\d+)/)
  return match ? parseInt(match[1]) : 0
}

function trainBonus(trained: boolean, totalLevel: number): number {
  if (!trained) return 0
  if (totalLevel >= 15) return 6
  if (totalLevel >= 7) return 4
  return 2
}

export function calcSkillTotal(
  attrVal: number, sk: SkillEntry, lvl: number,
  trainedOnly: boolean, armorPen: number,
): number {
  if (trainedOnly && !sk.trained) return 0
  return Math.floor(lvl / 2) + attrMod(attrVal) + trainBonus(sk.trained, lvl) + sk.training + sk.outros - armorPen
}

export function normalizeSkills(raw: Record<string, unknown>): Record<string, SkillEntry> {
  const out: Record<string, SkillEntry> = {}
  for (const [k, v] of Object.entries(raw)) {
    if (typeof v === 'number') {
      out[k] = { trained: v >= 5, training: 0, outros: 0 }
    } else if (v && typeof v === 'object') {
      const s = v as Partial<SkillEntry>
      out[k] = { trained: s.trained ?? false, training: s.training ?? 0, outros: s.outros ?? 0, notes: s.notes ?? '' }
    }
  }
  return out
}

export function rowToSpell(row: DbSpellRow): Spell {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const amplifiers = (row.amplifiers ?? []).map((amp: any) => {
    if (amp.isTrick || amp.cost === 'Truque') {
      return { cost: 0, effect: amp.effect, isTrick: true, requiresCircle: amp.requiresCircle, requiresDevotee: amp.requiresDevotee }
    }
    const match = String(amp.cost ?? 0).match(/\d+/)
    return { cost: match ? parseInt(match[0], 10) : 0, effect: amp.effect, isTrick: amp.isTrick, requiresCircle: amp.requiresCircle, requiresDevotee: amp.requiresDevotee }
  })
  return {
    id: row.id, name: row.name, type: row.type, circle: row.circle,
    school: row.school, execution: row.execution, range: row.range,
    duration: row.duration, target: row.target,
    resistance: row.resistance ?? '—', publication: row.publication ?? '',
    effect: row.effect, amplifiers,
    isPublic: row.is_public, createdBy: row.created_by ?? undefined,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function rowToCharacter(row: any): Character {
  return {
    id:         row.id,
    name:       row.name       ?? '',
    player:     row.player     ?? '',
    race:       row.race       ?? '',
    origin:     row.origin     ?? '',
    classes:    row.classes    ?? [{ name: '', level: 1 }],
    deity:      row.deity      ?? 'Nenhuma',
    size:       row.size       ?? 'Médio',
    movement:   row.movement   ?? 9,
    xp:         row.xp         ?? 0,
    attributes: row.attributes ?? { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    hp:         row.hp         ?? { max: 1, current: 1 },
    mp:         row.mp         ?? { max: 0, current: 0 },
    attacks:    row.attacks    ?? [],
    defense:    row.defense    ?? { base: 10, armor: 0, shield: 0, other: 0, penalty: 0 },
    skills:     normalizeSkills(row.skills ?? {}),
    spells:     row.spells     ?? [],
    powers:     row.powers     ?? [],
    equipment:  row.equipment  ?? [],
    money:      row.money      ?? 0,
    carryLimit: row.carry_limit ?? 0,
    notes:         row.notes           ?? '',
    originNotes:   row.origin_notes    ?? '',
    spellKeyAttr:  row.spell_key_attr  ?? '',
    userId:        row.user_id,
    companions:      row.companions       ?? [],
    companionLimit:  row.companion_limit  ?? 1,
  }
}
