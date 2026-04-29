import { useState, useEffect, useMemo, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  BookOpen, Package, Shield, Sword, User, X, Plus, Trash2,
  Search, Star, ChevronDown, ChevronRight, ArrowLeft,
  Eye, Sparkles, Heart, Zap, EyeOff, Skull, RefreshCw, FileText,
} from 'lucide-react'
import type { Character, CharacterSpell, CharacterPower, Spell, SkillEntry } from '../types'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import SpellModal from '../components/SpellModal'

// ─── Types ────────────────────────────────────────────────────────────────────

interface SkillDef {
  name: string
  attr: keyof Character['attributes']
  armorPenalty: boolean
  trainedOnly: boolean
}

interface DbSpellRow {
  id: string; name: string; type: Spell['type']; circle: number
  school: Spell['school']; execution: string; range: string
  duration: string; target: string; resistance: string | null
  publication: string | null; effect: string
  amplifiers: Spell['amplifiers']; is_public: boolean; created_by: string | null
}

interface ClassDef {
  hitPoints: string
  hpPerLevel: number
  manaPoints: string
}

const SCHOOL_ICONS: Record<string, React.ElementType> = {
  Abjuração: Shield, Adivinhação: Eye, Convocação: Sparkles,
  Encantamento: Heart, Evocação: Zap, Ilusão: EyeOff,
  Necromancia: Skull, Transmutação: RefreshCw,
}

type Tab = 'geral' | 'pericias' | 'poderes' | 'origem' | 'combate' | 'grimorio' | 'equipamento'
type SaveState = 'idle' | 'saving' | 'saved' | 'error'

// ─── Blank character (initial / fallback state) ───────────────────────────────

const BLANK: Character = {
  name: '', player: '', race: '', origin: '',
  classes: [{ name: '', level: 1 }],
  deity: 'Nenhuma', size: 'Médio', movement: 9, xp: 0,
  attributes: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
  hp: { max: 1, current: 1 }, mp: { max: 0, current: 0 },
  attacks: [],
  defense: { base: 10, armor: 0, shield: 0, other: 0, penalty: 0 },
  skills: {}, spells: [], powers: [], equipment: [],
  money: 0, carryLimit: 0, notes: '', originNotes: '',
}

// ─── DB row → Character ───────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToCharacter(row: any): Character {
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
  }
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ATTR_CONFIG: { key: keyof Character['attributes']; abbr: string; label: string }[] = [
  { key: 'str', abbr: 'FOR', label: 'Força' },
  { key: 'dex', abbr: 'DES', label: 'Destreza' },
  { key: 'con', abbr: 'CON', label: 'Constituição' },
  { key: 'int', abbr: 'INT', label: 'Inteligência' },
  { key: 'wis', abbr: 'SAB', label: 'Sabedoria' },
  { key: 'cha', abbr: 'CAR', label: 'Carisma' },
]

const DEITY_OPTIONS = [
  'Nenhuma', 'Aharadak', 'Allihanna', 'Arsenal', 'Azgher', 'Hyninn',
  'Kallyadranoch', 'Khalmyr', 'Lena', 'Lin-Wu', 'Marah', 'Megalokk',
  'Nimb', 'Oceano', 'Sszzaas','Tauron', 'Tanna-Toh', 'Tenebra', 'Thiatys',
  'Thwor', 'Valkaria', 'Wynna',
]

const ALL_SKILLS: SkillDef[] = [
  { name: 'Acrobacia',     attr: 'dex', armorPenalty: true,  trainedOnly: false },
  { name: 'Adestramento',  attr: 'cha', armorPenalty: false, trainedOnly: true  },
  { name: 'Atletismo',     attr: 'str', armorPenalty: false,  trainedOnly: false },
  { name: 'Atuação',       attr: 'cha', armorPenalty: false, trainedOnly: false },
  { name: 'Cavalgar',      attr: 'dex', armorPenalty: false, trainedOnly: false },
  { name: 'Conhecimento',  attr: 'int', armorPenalty: false, trainedOnly: true  },
  { name: 'Cura',          attr: 'wis', armorPenalty: false, trainedOnly: false },
  { name: 'Diplomacia',    attr: 'cha', armorPenalty: false, trainedOnly: false },
  { name: 'Enganação',     attr: 'cha', armorPenalty: false, trainedOnly: false },
  { name: 'Fortitude',     attr: 'con', armorPenalty: false, trainedOnly: false  },
  { name: 'Furtividade',   attr: 'dex', armorPenalty: true,  trainedOnly: false },
  { name: 'Guerra',        attr: 'int', armorPenalty: false, trainedOnly: true  },
  { name: 'Iniciativa',    attr: 'dex', armorPenalty: false, trainedOnly: false  },
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

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'geral',       label: 'Geral',              icon: User      },
  { id: 'pericias',    label: 'Perícias',            icon: Shield    },
  { id: 'poderes',     label: 'Poderes',             icon: Star      },
  { id: 'origem',      label: 'Origem & Anotações',  icon: FileText  },
  { id: 'combate',     label: 'Combate',             icon: Sword     },
  { id: 'grimorio',    label: 'Grimório',            icon: BookOpen  },
  { id: 'equipamento', label: 'Equipamento',         icon: Package   },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normalizeStr(str: string) {
  return str.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

function attrMod(v: number) { return Math.floor((v - 10) / 2) }
function fmtMod(v: number)  { const m = attrMod(v); return m >= 0 ? `+${m}` : `${m}` }
function fmtBonus(n: number) { return n >= 0 ? `+${n}` : `${n}` }
function totalLevel(c: Character) { return c.classes.reduce((s, cl) => s + cl.level, 0) }

function parseHP(hitPoints: string): number {
  const match = hitPoints.match(/^(\d+)/)
  return match ? parseInt(match[1]) : 0
}
function parseMP(manaPoints: string): number {
  const match = manaPoints.match(/^(\d+)/)
  return match ? parseInt(match[1]) : 0
}

const DEFAULT_SKILL: SkillEntry = { trained: false, training: 0, outros: 0 }

function calcSkillTotal(
  attrVal: number, sk: SkillEntry, lvl: number,
  trainedOnly: boolean, armorPen: number,
): number {
  if (trainedOnly && !sk.trained) return 0
  return Math.floor(lvl / 2) + attrMod(attrVal) + (sk.trained ? 2 : 0) + sk.training + sk.outros - armorPen
}

function normalizeSkills(raw: Record<string, unknown>): Record<string, SkillEntry> {
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
function rowToSpell(row: DbSpellRow): Spell {
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

// ─── Shared input classes ─────────────────────────────────────────────────────

const INP = 'bg-transparent border-b border-stone-200 focus:border-tormenta-red focus:outline-none text-sm py-0.5 w-full'
const INP_CARD = 'bg-stone-50 border border-stone-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-tormenta-red focus:border-tormenta-red w-full'

// ─── StatInput ────────────────────────────────────────────────────────────────

function StatInput({ abbr, value, onChange }: {
  abbr: string; value: number; onChange: (v: number) => void
}) {
  const m = attrMod(value)
  return (
    <div className="flex flex-col items-center bg-stone-50 border border-stone-200 rounded-xl pt-2.5 pb-2.5 px-1">
      <span className="text-[9px] font-bold uppercase tracking-widest text-stone-400 mb-1">{abbr}</span>
      <span className={`text-2xl font-bold leading-none mb-1.5 ${m >= 0 ? 'text-tormenta-red' : 'text-stone-600'}`}>
        {m >= 0 ? `+${m}` : `${m}`}
      </span>
      <input
        type="number" min={1} max={30} value={value}
        onChange={e => { const v = parseInt(e.target.value); if (!isNaN(v)) onChange(Math.min(30, Math.max(1, v))) }}
        className="w-10 text-center text-xs text-stone-500 bg-white border border-stone-200 rounded-md focus:outline-none focus:ring-1 focus:ring-tormenta-red"
      />
    </div>
  )
}

// ─── ResBar ───────────────────────────────────────────────────────────────────

function ResBar({ label, current, max, barColor, textColor, onCurChange, onMaxChange, onAuto }: {
  label: string; current: number; max: number
  barColor: string; textColor: string
  onCurChange: (v: number) => void; onMaxChange: (v: number) => void
  onAuto?: () => void
}) {
  const pct = Math.min(100, Math.max(0, max > 0 ? (current / max) * 100 : 0))
  return (
    <div>
      <div className="flex justify-between items-center mb-1.5">
        <div className="flex items-center gap-1.5">
          <span className={`text-xs font-bold uppercase tracking-wider ${textColor}`}>{label}</span>
          {onAuto && (
            <button onClick={onAuto}
              className="text-[9px] font-medium text-stone-400 hover:text-stone-600 border border-stone-200 hover:border-stone-300 rounded px-1 py-0.5 leading-none transition-colors">
              Auto
            </button>
          )}
        </div>
        <div className="flex items-center gap-0.5 text-sm">
          <input type="number" min={0} max={max} value={current}
            onChange={e => { const v = parseInt(e.target.value); if (!isNaN(v)) onCurChange(Math.min(max, Math.max(0, v))) }}
            className="w-10 text-right font-bold text-stone-800 bg-transparent border-none focus:outline-none p-0"
          />
          <span className="text-stone-400 select-none">/</span>
          <input type="number" min={0} value={max}
            onChange={e => { const v = parseInt(e.target.value); if (!isNaN(v)) onMaxChange(Math.max(0, v)) }}
            className="w-10 text-left text-stone-500 bg-transparent border-none focus:outline-none p-0"
          />
        </div>
      </div>
      <div className="h-4 bg-stone-100 rounded-full overflow-hidden border border-stone-200">
        <div className={`h-full rounded-full transition-all duration-300 ${barColor}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

// ─── SpellPicker ─────────────────────────────────────────────────────────────

function SpellPicker({ onAdd, onClose, alreadyAdded }: {
  onAdd: (spell: Spell) => void
  onClose: () => void
  alreadyAdded: Set<string>
}) {
  const [spells, setSpells] = useState<Spell[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('spells').select('*').order('circle').order('name')
      .then(({ data }) => {
        if (data) setSpells((data as DbSpellRow[]).map(rowToSpell))
        setLoading(false)
      })
  }, [])

  const filtered = useMemo(() => {
    if (!search) return spells
    const q = normalizeStr(search)
    return spells.filter(s => normalizeStr(s.name).includes(q))
  }, [spells, search])

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[72vh] flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-stone-200">
          <h3 className="font-display text-base font-semibold text-tormenta-red">Biblioteca de Magias</h3>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600"><X size={18} /></button>
        </div>
        <div className="px-3 py-2 border-b border-stone-100">
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar magia..."
              className="w-full pl-7 pr-3 py-1.5 text-sm border border-stone-200 rounded-lg bg-stone-50 focus:outline-none focus:ring-1 focus:ring-tormenta-red"
            />
          </div>
        </div>
        <div className="overflow-y-auto flex-1">
          {loading
            ? <p className="text-sm text-stone-400 text-center py-8">Carregando…</p>
            : filtered.length === 0
              ? <p className="text-sm text-stone-400 text-center py-8">Nenhuma magia encontrada</p>
              : filtered.map(spell => {
                  const added = spell.id ? alreadyAdded.has(spell.id) : false
                  return (
                    <button key={spell.id ?? spell.name} disabled={added}
                      onClick={() => { onAdd(spell); onClose() }}
                      className="w-full text-left px-4 py-2.5 hover:bg-stone-50 border-b border-stone-50 last:border-0 disabled:opacity-40"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-stone-800">{spell.name}</span>
                        <div className="flex items-center gap-2 text-xs text-stone-400">
                          <span>{spell.circle}° círculo</span>
                          <span>{spell.school}</span>
                          {added && <span className="text-tormenta-red">✓</span>}
                        </div>
                      </div>
                    </button>
                  )
                })
          }
        </div>
      </div>
    </div>
  )
}

// ─── CharacterPage ────────────────────────────────────────────────────────────

export default function CharacterPage() {
  const { id } = useParams<{ id: string }>()
  const { user, profile } = useAuth()
  const [char, setChar] = useState<Character>(BLANK)
  const [charLoading, setCharLoading] = useState(true)
  const [charError, setCharError] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('geral')
  const [modalSpell, setModalSpell] = useState<Spell | null>(null)
  const [showPicker, setShowPicker] = useState(false)
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [expandedEquip, setExpandedEquip] = useState<Set<number>>(new Set())
  const [expandedPowers, setExpandedPowers] = useState<Set<string>>(new Set())
  const [bodyOpen, setBodyOpen] = useState(true)
  const [bagOpen, setBagOpen] = useState(true)
  const [classDefsMap, setClassDefsMap] = useState<Record<string, ClassDef>>({})
  const [grimSort, setGrimSort] = useState<'circle' | 'alpha' | 'school'>('circle')
  const fetchedClassNames = useRef<Set<string>>(new Set())

  // ── Load character from Supabase ──
  useEffect(() => {
    if (!id) { setCharError('ID inválido'); setCharLoading(false); return }
    supabase.from('characters').select('*').eq('id', id).single()
      .then(({ data, error }) => {
        if (error || !data) setCharError('Personagem não encontrado.')
        else setChar(rowToCharacter(data))
        setCharLoading(false)
      })
  }, [id])

  // ── Fetch class definitions (hit_points) from DB ──
  useEffect(() => {
    const names = char.classes.map(c => c.name).filter(n => n && !fetchedClassNames.current.has(n))
    if (names.length === 0) return
    names.forEach(n => fetchedClassNames.current.add(n))
    supabase.from('classes').select('name, hit_points, hp_per_level, mana_points').in('name', names)
      .then(({ data }) => {
        if (!data) return
        const updates: Record<string, ClassDef> = {}
        for (const row of data as { name: string; hit_points: string; hp_per_level: number | null; mana_points: string }[]) {
          console.log('[CharacterPage] classe:', row.name, '→ HP:', row.hit_points, '| MP:', row.mana_points)
          updates[row.name] = {
            hitPoints: row.hit_points ?? '',
            hpPerLevel: row.hp_per_level ?? 0,
            manaPoints: row.mana_points ?? '',
          }
        }
        setClassDefsMap(prev => ({ ...prev, ...updates }))
      })
  }, [char.classes])

  // ── Patch helpers ──
  const patch = (p: Partial<Character>) => setChar(c => ({ ...c, ...p }))
  const patchAttr = (k: keyof Character['attributes'], v: number) =>
    setChar(c => ({ ...c, attributes: { ...c.attributes, [k]: v } }))
  const patchHP = (k: 'current' | 'max', v: number) =>
    setChar(c => ({ ...c, hp: { ...c.hp, [k]: v } }))
  const patchMP = (k: 'current' | 'max', v: number) =>
    setChar(c => ({ ...c, mp: { ...c.mp, [k]: v } }))
  const patchDef = (k: keyof Character['defense'], v: number) =>
    setChar(c => ({ ...c, defense: { ...c.defense, [k]: v } }))

  // ── Auto-calc HP / MP ──
  function calcAutoHP() {
    const conMod = attrMod(char.attributes.con)
    let total = 0
    for (const cl of char.classes) {
      const def = classDefsMap[cl.name]
      if (!def) continue
      total += parseHP(def.hitPoints) + (def.hpPerLevel * (cl.level - 1)) + (conMod * cl.level)
    }
    patchHP('max', Math.max(1, total))
  }
  function calcAutoMP() {
    const keyAttr = (char.spellKeyAttr || 'int') as keyof Character['attributes']
    const keyMod = attrMod(char.attributes[keyAttr])
    let total = 0
    for (const cl of char.classes) {
      const def = classDefsMap[cl.name]
      if (!def) continue
      total += parseMP(def.manaPoints) * cl.level
    }
    patchMP('max', Math.max(0, total + keyMod))
  }

  // ── Derived values ──
  const level = totalLevel(char)
  const dexMod = attrMod(char.attributes.dex)
  const strMod = attrMod(char.attributes.str)
  const defTotal = 10 + dexMod + char.defense.armor + char.defense.shield + char.defense.other
  const carryLimit = 10 + 2 * strMod
  const slotsUsed = char.equipment.reduce((s, e) => s + e.slots * e.quantity, 0)
  const addedSpellIds = useMemo(() => new Set(char.spells.map(s => s.spellId)), [char.spells])

  // ── Save ──
  async function handleSave() {
    console.log('[handleSave] user:', user?.id, '| char id from useParams:', id)
    if (!user || !id) return
    setSaveState('saving')
    const characterData = {
      name: char.name, player: char.player, race: char.race, origin: char.origin,
      classes: char.classes, deity: char.deity, size: char.size,
      movement: char.movement, xp: char.xp,
      attributes: char.attributes, hp: char.hp, mp: char.mp,
      attacks: char.attacks, defense: char.defense, skills: char.skills,
      spells: char.spells, powers: char.powers, equipment: char.equipment,
      money: char.money, carry_limit: char.carryLimit, notes: char.notes,
      origin_notes: char.originNotes ?? '',
      spell_key_attr: char.spellKeyAttr ?? '',
    }
    console.log('Dados sendo salvos:', JSON.stringify(characterData, null, 2))
    const { data, error } = await supabase
      .from('characters')
      .update(characterData)
      .eq('id', id)
    console.log('Erro detalhado:', error)
    console.log('Message:', error?.message)
    console.log('Details:', error?.details)
    if (!error) console.log('[handleSave] saved successfully, data:', data)
    setSaveState(error ? 'error' : 'saved')
    setTimeout(() => setSaveState('idle'), 2000)
  }

  // ── Skill helpers ──
  function toggleSkill(name: string) {
    setChar(c => {
      const cur = c.skills[name] ?? DEFAULT_SKILL
      return { ...c, skills: { ...c.skills, [name]: { ...cur, trained: !cur.trained } } }
    })
  }
  function patchSkill(name: string, field: 'training' | 'outros', value: number) {
    setChar(c => {
      const cur = c.skills[name] ?? DEFAULT_SKILL
      return { ...c, skills: { ...c.skills, [name]: { ...cur, [field]: value } } }
    })
  }

  // ── Attack helpers ──
  function addAttack() {
    patch({ attacks: [...char.attacks, { name: '', bonus: 0, damage: '1d6', critical: '×2', type: '', range: '' }] })
  }
  function removeAttack(i: number) {
    patch({ attacks: char.attacks.filter((_, idx) => idx !== i) })
  }
  function patchAttack(i: number, field: string, value: string | number) {
    patch({ attacks: char.attacks.map((a, idx) => idx === i ? { ...a, [field]: value } : a) })
  }

  // ── Equipment helpers ──
  function addEquip(location: 'body' | 'bag') {
    patch({ equipment: [...char.equipment, { name: '', quantity: 1, slots: 1, location, description: '' }] })
  }
  function removeEquip(i: number) {
    setExpandedEquip(s => { const n = new Set(s); n.delete(i); return n })
    patch({ equipment: char.equipment.filter((_, idx) => idx !== i) })
  }
  function patchEquip(i: number, field: string, value: string | number) {
    patch({ equipment: char.equipment.map((e, idx) => idx === i ? { ...e, [field]: value } : e) })
  }
  function toggleEquipExpand(i: number) {
    setExpandedEquip(s => { const n = new Set(s); n.has(i) ? n.delete(i) : n.add(i); return n })
  }

  // ── Power helpers ──
  function addPower() {
    patch({ powers: [...char.powers, { powerId: Date.now().toString(), powerName: '', level, description: '' }] })
  }
  function removePower(id: string) {
    patch({ powers: char.powers.filter(p => p.powerId !== id) })
  }
  function patchPower(id: string, field: keyof CharacterPower, value: string | number) {
    patch({ powers: char.powers.map(p => p.powerId === id ? { ...p, [field]: value } : p) })
  }
  function togglePowerExpand(id: string) {
    setExpandedPowers(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  // ── Grimório helpers ──
  function addSpell(spell: Spell) {
    if (!spell.id) return
    const entry: CharacterSpell = {
      spellId: spell.id, spellName: spell.name,
      circle: spell.circle, school: spell.school, type: spell.type,
    }
    patch({ spells: [...char.spells, entry] })
  }
  function removeSpell(spellId: string) {
    patch({ spells: char.spells.filter(s => s.spellId !== spellId) })
  }
  async function openSpellModal(cs: CharacterSpell) {
    const { data } = await supabase.from('spells').select('*').eq('id', cs.spellId).single()
    if (data) setModalSpell(rowToSpell(data as DbSpellRow))
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // TAB: GERAL
  // ─────────────────────────────────────────────────────────────────────────────
  function renderGeral() {
    const squares = Math.round(char.movement / 1.5)
    const saves = [
      { label: 'Fortitude', attr: 'con' as const },
      { label: 'Reflexos',  attr: 'dex' as const },
      { label: 'Vontade',   attr: 'wis' as const },
    ]

    return (
      <div className="space-y-5">
        <div className="card">
          <h3 className="font-display text-[11px] font-semibold uppercase tracking-widest text-stone-400 mb-4">
            Informações Básicas
          </h3>

          {/* Linha 1: Nome | Jogador */}
          <div className="grid grid-cols-[1fr_160px] gap-x-6 mb-3">
            <div>
              <label className="block text-[10px] font-medium text-stone-400 mb-0.5">Nome</label>
              <input type="text" value={char.name} onChange={e => patch({ name: e.target.value })}
                placeholder="Nome do personagem"
                className={`${INP} text-base font-semibold text-stone-800`}
              />
            </div>
            <div>
              <label className="block text-[10px] font-medium text-stone-400 mb-0.5">Jogador</label>
              <input type="text" value={char.player} onChange={e => patch({ player: e.target.value })} className={INP} />
            </div>
          </div>

          {/* Linha 2: Raça | Origem | Divindade */}
          <div className="grid grid-cols-3 gap-x-6 mb-3">
            <div>
              <label className="block text-[10px] font-medium text-stone-400 mb-0.5">Raça</label>
              <input type="text" value={char.race} onChange={e => patch({ race: e.target.value })} className={INP} />
            </div>
            <div>
              <label className="block text-[10px] font-medium text-stone-400 mb-0.5">Origem</label>
              <input type="text" value={char.origin} onChange={e => patch({ origin: e.target.value })} className={INP} />
            </div>
            <div>
              <label className="block text-[10px] font-medium text-stone-400 mb-0.5">Divindade</label>
              <select value={char.deity} onChange={e => patch({ deity: e.target.value })}
                className="bg-transparent border-b border-stone-200 focus:border-tormenta-red focus:outline-none text-sm py-0.5 w-full">
                {DEITY_OPTIONS.map(d => <option key={d}>{d}</option>)}
              </select>
            </div>
          </div>

          {/* Linha 3: Classes */}
          <div className="mb-3">
            <label className="block text-[10px] font-medium text-stone-400 mb-1.5">Classe(s)</label>
            <div className="flex flex-wrap items-center gap-2">
              {char.classes.map((cl, i) => {
                const def = classDefsMap[cl.name] ?? null
                return (
                  <div key={i} className="flex items-center gap-1.5 bg-stone-100 rounded-lg px-2.5 py-1">
                    <input value={cl.name} placeholder="Classe"
                      onChange={e => setChar(c => ({ ...c, classes: c.classes.map((x, j) => j === i ? { ...x, name: e.target.value } : x) }))}
                      className="bg-transparent text-sm font-medium text-stone-700 focus:outline-none w-24"
                    />
                    <input type="number" min={1} max={20} value={cl.level}
                      onChange={e => setChar(c => ({ ...c, classes: c.classes.map((x, j) => j === i ? { ...x, level: parseInt(e.target.value) || 1 } : x) }))}
                      className="bg-transparent text-sm font-bold text-tormenta-red focus:outline-none w-7 text-center"
                    />
                    {def && (
                      <>
                        <span className="text-stone-300 text-[10px] mx-0.5">|</span>
                        <div className="flex flex-col items-start">
                          <span className="text-[9px] text-stone-400 whitespace-nowrap">
                            PV Inicial: <span className="font-medium text-tormenta-red">{parseHP(def.hitPoints)} + CON</span>
                          </span>
                          <span className="text-[8px] text-stone-300 leading-none">Nível 1</span>
                        </div>
                        <span className="text-stone-300 text-[10px]">·</span>
                        <div className="flex flex-col items-start">
                          <span className="text-[9px] text-stone-400 whitespace-nowrap">
                            PV por Nível: <span className="font-medium text-tormenta-red">{def.hpPerLevel} + CON</span>
                          </span>
                          <span className="text-[8px] text-stone-300 leading-none">Níveis 2 ao 20</span>
                        </div>
                        <span className="text-stone-300 text-[10px]">·</span>
                        <div className="flex flex-col items-start">
                          <span className="text-[9px] text-stone-400 whitespace-nowrap">
                            PM: <span className="font-medium" style={{ color: '#1E3A5F' }}>{parseMP(def.manaPoints)}</span>
                          </span>
                          <span className="text-[8px] text-stone-300 leading-none">por nível</span>
                        </div>
                      </>
                    )}
                    {!def && cl.name && (
                      <span className="text-[9px] text-stone-300 ml-1">…</span>
                    )}
                    {char.classes.length > 1 && (
                      <button onClick={() => setChar(c => ({ ...c, classes: c.classes.filter((_, j) => j !== i) }))}
                        className="text-stone-300 hover:text-red-500 ml-0.5"><X size={12} /></button>
                    )}
                  </div>
                )
              })}
              <button onClick={() => setChar(c => ({ ...c, classes: [...c.classes, { name: '', level: 1 }] }))}
                className="flex items-center gap-0.5 text-xs text-tormenta-red hover:text-tormenta-red-dark">
                <Plus size={13} /> Classe
              </button>
            </div>
          </div>

          {/* Linha 4: Tamanho | Deslocamento | XP | (vazio) */}
          <div className="grid grid-cols-[2fr_3fr_2fr_11fr] gap-x-6">
            <div>
              <label className="block text-[10px] font-medium text-stone-400 mb-0.5">Tamanho</label>
              <input type="text" value={char.size} onChange={e => patch({ size: e.target.value })} className={INP} />
            </div>
            <div>
              <label className="block text-[10px] font-medium text-stone-400 mb-0.5">Deslocamento</label>
              <div className="flex items-baseline gap-1">
                <input type="number" min={0} step={1.5} value={char.movement}
                  onChange={e => patch({ movement: parseFloat(e.target.value) || 0 })}
                  className={`${INP} !w-14 shrink-0`}
                />
                <span className="text-xs text-stone-400 whitespace-nowrap">m · {squares} quad.</span>
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-medium text-stone-400 mb-0.5">XP</label>
              <input type="number" min={0} value={char.xp}
                onChange={e => patch({ xp: parseInt(e.target.value) || 0 })} className={INP} />
            </div>
            <div />{/* espaço vazio */}
          </div>
        </div>

        {/* Atributos + Recursos */}
        <div className="grid grid-cols-3 gap-5">
          <div className="card col-span-2">
            <h3 className="font-display text-[11px] font-semibold uppercase tracking-widest text-stone-400 mb-4">Atributos</h3>
            <div className="grid grid-cols-6 gap-2 mb-4">
              {ATTR_CONFIG.map(({ key, abbr }) => (
                <StatInput key={key} abbr={abbr} value={char.attributes[key]} onChange={v => patchAttr(key, v)} />
              ))}
            </div>
            <div className="flex items-center gap-3 pt-3 border-t border-stone-100">
              {saves.map(({ label, attr }) => {
                const total = calcSkillTotal(char.attributes[attr], char.skills[label] ?? DEFAULT_SKILL, level, false, 0)
                return (
                  <div key={label} className="flex items-center gap-2 bg-stone-50 border border-stone-200 rounded-lg px-3 py-1.5">
                    <span className="text-xs font-medium text-stone-500">{label}</span>
                    <span className={`text-base font-bold ${total >= 0 ? 'text-tormenta-red' : 'text-stone-600'}`}>
                      {fmtBonus(total)}
                    </span>
                  </div>
                )
              })}
              <span className="text-[10px] text-stone-400 ml-auto">Resistências (calculadas)</span>
            </div>
          </div>

          <div className="card space-y-5">
            <div>
              <h3 className="font-display text-[11px] font-semibold uppercase tracking-widest text-stone-400 mb-3">Recursos</h3>
              <div className="space-y-4">
                <ResBar label="PV" current={char.hp.current} max={char.hp.max}
                  barColor="bg-tormenta-red" textColor="text-tormenta-red"
                  onCurChange={v => patchHP('current', v)} onMaxChange={v => patchHP('max', v)}
                  onAuto={calcAutoHP}
                />
                <ResBar label="PM" current={char.mp.current} max={char.mp.max}
                  barColor="bg-[#1E3A5F]" textColor="text-[#1E3A5F]"
                  onCurChange={v => patchMP('current', v)} onMaxChange={v => patchMP('max', v)}
                  onAuto={calcAutoMP}
                />
              </div>
            </div>
            <div>
              <h3 className="font-display text-[11px] font-semibold uppercase tracking-widest text-stone-400 mb-2">
                Defesa <span className="text-tormenta-red font-bold text-base ml-2">{defTotal}</span>
              </h3>
              <div className="space-y-2 text-xs">
                {([
                  ['Armadura',  'armor'],
                  ['Escudo',    'shield'],
                  ['Outros',    'other'],
                  ['Penalidade','penalty'],
                ] as [string, keyof Character['defense']][]).map(([lbl, k]) => (
                  <div key={k} className="flex items-center justify-between gap-2">
                    <span className="text-stone-400">{lbl}</span>
                    <input type="number" value={char.defense[k]}
                      onChange={e => patchDef(k, parseInt(e.target.value) || 0)}
                      className="w-12 text-right bg-stone-50 border border-stone-200 rounded px-1 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-tormenta-red"
                    />
                  </div>
                ))}
                <div className="flex justify-between pt-1 border-t border-stone-100 text-stone-500">
                  <span>DES</span>
                  <span className="font-medium">{fmtMod(char.attributes.dex)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // TAB: PERÍCIAS
  // ─────────────────────────────────────────────────────────────────────────────
  function renderPericias() {
    const abbr = Object.fromEntries(ATTR_CONFIG.map(a => [a.key, a.abbr]))
    const halfLevel = Math.floor(level / 2)

    const ICON_STYLE: React.CSSProperties = { filter: 'grayscale(1) opacity(0.45)', fontSize: '0.55rem' }

    // Fixed grid columns: [checkbox][name][attr abbr][½N][ATR][TRE][OUT][TOT]
    const ROW_COLS = '16px 120px 30px 35px 35px 35px 45px 40px'
    const ROW_GRID: React.CSSProperties = {
      display: 'grid',
      gridTemplateColumns: ROW_COLS,
      alignItems: 'center',
    }

    const HDR = 'text-[9px] font-semibold uppercase tracking-wider text-stone-400'
    const VAL = 'text-[11px] tabular-nums text-stone-400 text-center'
    const NUM_INPUT = 'w-full text-center text-[11px] border border-stone-200 rounded px-0 py-0.5 bg-stone-50 focus:outline-none focus:ring-1 focus:ring-tormenta-red'

    const sortedSkills = [...ALL_SKILLS].sort((a, b) => a.name.localeCompare(b.name, 'pt'))
    const numRows = Math.ceil(sortedSkills.length / 2)

    // Header row — rendered once per column via explicit grid placement
    function HeaderRow({ col }: { col: number }) {
      return (
        <div style={{ ...ROW_GRID, gridColumn: col, gridRow: 1 }}
          className="border-b border-stone-200 pb-1.5">
          <div />
          <div className={`${HDR} text-left`}>Perícia</div>
          <div />
          <div className={`${HDR} text-center`}>½N</div>
          <div className={`${HDR} text-center`}>ATR</div>
          <div className={`${HDR} text-center`}>TRE</div>
          <div className={`${HDR} text-center`}>OUT</div>
          <div className={`${HDR} text-right`}>TOT</div>
        </div>
      )
    }

    return (
      <div className="card">
        <h3 className="font-display text-[11px] font-semibold uppercase tracking-widest text-stone-400 mb-3">
          Perícias
        </h3>

        {/*
          Outer grid: 2 columns, items flow column-first.
          Headers are explicitly placed at (col, row=1).
          Skill rows are auto-placed starting at row 2 in each column.
        */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gridAutoFlow: 'column',
          gridTemplateRows: `auto repeat(${numRows}, auto)`,
          columnGap: '24px',
        }}>
          <HeaderRow col={1} />
          <HeaderRow col={2} />

          {sortedSkills.map(skill => {
            const sk       = char.skills[skill.name] ?? DEFAULT_SKILL
            const aVal     = char.attributes[skill.attr]
            const armorPen = skill.armorPenalty ? char.defense.penalty : 0
            const total    = calcSkillTotal(aVal, sk, level, skill.trainedOnly, armorPen)
            const inactive = skill.trainedOnly && !sk.trained

            return (
              <div key={skill.name} style={ROW_GRID} className="border-b border-stone-50 py-px">
                {/* Checkbox */}
                <input
                  type="checkbox" checked={sk.trained}
                  onChange={() => toggleSkill(skill.name)}
                  className="rounded border-stone-300 accent-tormenta-red"
                />

                {/* Name — fixed width, truncated */}
                <div
                  style={{ width: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                  className={`text-[11px] ${sk.trained ? 'font-semibold text-stone-800' : 'text-stone-500'}`}
                  title={skill.name}
                >
                  {skill.name}
                  {skill.trainedOnly  && <span className="ml-0.5" style={ICON_STYLE}>⭐</span>}
                  {skill.armorPenalty && <span className="ml-0.5" style={ICON_STYLE}>🛡</span>}
                </div>

                {/* Attr abbreviation */}
                <div className="text-[8px] text-stone-300 text-center">{abbr[skill.attr]}</div>

                {/* ½N */}
                <div className={`${VAL} ${inactive ? 'opacity-30' : ''}`}>{fmtBonus(halfLevel)}</div>

                {/* ATR mod */}
                <div className={`${VAL} ${inactive ? 'opacity-30' : ''}`}>{fmtMod(aVal)}</div>

                {/* TRE */}
                <div className={`${VAL} ${inactive ? 'opacity-30' : ''}`}>{sk.trained ? '+2' : '0'}</div>

                {/* OUT input */}
                <input
                  type="number" value={sk.outros} disabled={inactive}
                  onChange={e => patchSkill(skill.name, 'outros', parseInt(e.target.value) || 0)}
                  className={`${NUM_INPUT} ${inactive ? 'opacity-30 cursor-not-allowed' : ''}`}
                />

                {/* TOT */}
                <div className={`text-right text-xs font-bold tabular-nums ${
                  inactive ? 'text-stone-300' : sk.trained ? 'text-tormenta-red' : 'text-stone-500'
                }`}>
                  {fmtBonus(total)}
                </div>
              </div>
            )
          })}
        </div>

        <p className="text-[10px] text-stone-400 text-center mt-3 pt-2 border-t border-stone-100">
          <span style={ICON_STYLE}>⭐</span> somente treinado &nbsp;·&nbsp; <span style={ICON_STYLE}>🛡</span> penalidade de armadura
        </p>
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // TAB: PODERES
  // ─────────────────────────────────────────────────────────────────────────────
  function renderPoderes() {
    const sorted = [...char.powers].sort((a, b) => a.level - b.level)

    return (
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-[11px] font-semibold uppercase tracking-widest text-stone-400">Poderes</h3>
          <button onClick={addPower}
            className="flex items-center gap-1 text-xs text-tormenta-red hover:text-tormenta-red-dark font-medium">
            <Plus size={13} /> Adicionar poder
          </button>
        </div>

        {sorted.length === 0 ? (
          <p className="text-sm text-stone-400 text-center py-8">Nenhum poder cadastrado</p>
        ) : (
          <div className="space-y-1">
            {sorted.map(p => (
              <div key={p.powerId} className="border border-stone-100 rounded-lg overflow-hidden">
                <div className="flex items-center gap-2 px-3 py-2">
                  <input
                    type="number" min={1} max={20} value={p.level}
                    onChange={e => patchPower(p.powerId, 'level', parseInt(e.target.value) || 1)}
                    className="w-10 text-center text-xs text-stone-400 bg-stone-50 border border-stone-200 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-tormenta-red shrink-0"
                    title="Nível em que o poder foi adquirido"
                  />
                  <input
                    value={p.powerName} placeholder="Nome do poder"
                    onChange={e => patchPower(p.powerId, 'powerName', e.target.value)}
                    className="flex-1 text-sm font-medium text-stone-800 bg-transparent focus:outline-none"
                  />
                  <button type="button" onClick={() => togglePowerExpand(p.powerId)}
                    className="text-stone-300 hover:text-stone-500 shrink-0 transition-transform duration-200"
                    style={{ transform: expandedPowers.has(p.powerId) ? 'rotate(90deg)' : 'none' }}>
                    <ChevronRight size={14} />
                  </button>
                  <button onClick={() => removePower(p.powerId)} className="text-stone-300 hover:text-red-500 shrink-0">
                    <Trash2 size={13} />
                  </button>
                </div>
                <div className={`grid transition-all duration-200 ${expandedPowers.has(p.powerId) ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                  <div className="overflow-hidden">
                    <div className="px-3 pb-3">
                      <textarea
                        rows={3}
                        value={p.description ?? ''}
                        onChange={e => patchPower(p.powerId, 'description', e.target.value)}
                        placeholder="Descrição do poder…"
                        className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-xs text-stone-600 focus:outline-none focus:ring-1 focus:ring-tormenta-red resize-none"
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // TAB: COMBATE
  // ─────────────────────────────────────────────────────────────────────────────
  function renderCombate() {
    return (
      <div className="space-y-5">
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display text-[11px] font-semibold uppercase tracking-widest text-stone-400">Ataques</h3>
            <button onClick={addAttack} className="flex items-center gap-1 text-xs text-tormenta-red hover:text-tormenta-red-dark font-medium">
              <Plus size={13} /> Adicionar ataque
            </button>
          </div>
          {char.attacks.length === 0
            ? <p className="text-sm text-stone-400 text-center py-6">Nenhum ataque cadastrado</p>
            : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-stone-100">
                    {['Ataque', 'Bônus', 'Dano', 'Crítico', 'Tipo', 'Alcance', ''].map(h => (
                      <th key={h} className="pb-2 text-[10px] font-semibold text-stone-400 text-left last:w-6">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {char.attacks.map((atk, i) => (
                    <tr key={i} className="border-b border-stone-50 last:border-0">
                      {(['name','bonus','damage','critical','type','range'] as const).map(field => (
                        <td key={field} className="py-1.5 pr-2">
                          <input
                            type={field === 'bonus' ? 'number' : 'text'}
                            value={atk[field]}
                            onChange={e => patchAttack(i, field, field === 'bonus' ? parseInt(e.target.value) || 0 : e.target.value)}
                            className={`${INP_CARD} ${field === 'bonus' ? 'w-14 text-center' : field === 'name' ? 'min-w-[120px]' : 'min-w-[70px]'}`}
                          />
                        </td>
                      ))}
                      <td className="py-1.5">
                        <button onClick={() => removeAttack(i)} className="text-stone-300 hover:text-red-500">
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          }
        </div>

        <div className="card">
          <h3 className="font-display text-[11px] font-semibold uppercase tracking-widest text-stone-400 mb-3">
            Defesa — Total: <span className="text-tormenta-red text-lg font-bold">{defTotal}</span>
          </h3>
          <p className="text-xs text-stone-400">
            10 + DES ({fmtMod(char.attributes.dex)}) + Armadura (+{char.defense.armor}) + Escudo (+{char.defense.shield}) + Outros (+{char.defense.other})
          </p>
          {char.defense.penalty !== 0 && (
            <p className="text-xs text-amber-600 mt-1">
              Penalidade de armadura: {char.defense.penalty} (★ aplicada nas perícias marcadas)
            </p>
          )}
        </div>
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // TAB: GRIMÓRIO
  // ─────────────────────────────────────────────────────────────────────────────
  function renderGrimorio() {
    const keyAttrKey = (char.spellKeyAttr || 'int') as keyof Character['attributes']
    const spellMod   = Math.floor(level / 2) + attrMod(char.attributes[keyAttrKey])
    const spellDC    = 10 + spellMod

    async function handleKeyAttrChange(newKey: string) {
      patch({ spellKeyAttr: newKey })
      if (id) await supabase.from('characters').update({ spell_key_attr: newKey }).eq('id', id)
    }

    // Sort spells
    const sorted = [...char.spells].sort((a, b) =>
      grimSort === 'alpha'  ? a.spellName.localeCompare(b.spellName, 'pt') :
      grimSort === 'school' ? a.school.localeCompare(b.school, 'pt') || a.spellName.localeCompare(b.spellName, 'pt') :
      a.circle - b.circle || a.spellName.localeCompare(b.spellName, 'pt')
    )

    function SpellRow({ cs }: { cs: CharacterSpell }) {
      const Icon = SCHOOL_ICONS[cs.school]
      return (
        <div className="flex items-center justify-between py-1.5 group border-b border-stone-50 last:border-0">
          <button onClick={() => openSpellModal(cs)}
            className="flex items-center gap-2 text-left min-w-0">
            {Icon && <Icon size={12} className="text-stone-300 group-hover:text-tormenta-red shrink-0 transition-colors" />}
            <span className="text-sm font-medium text-stone-800 group-hover:text-tormenta-red transition-colors truncate">{cs.spellName}</span>
            <span className="text-[10px] text-stone-400 shrink-0">{cs.circle}°</span>
            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full shrink-0 ${
              cs.type === 'Arcana'  ? 'bg-purple-100 text-purple-700' :
              cs.type === 'Divina' ? 'bg-amber-100 text-amber-700' :
              'bg-teal-100 text-teal-700'
            }`}>{cs.type}</span>
          </button>
          <button onClick={() => removeSpell(cs.spellId)}
            className="text-stone-200 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all ml-2 shrink-0">
            <Trash2 size={13} />
          </button>
        </div>
      )
    }

    function renderSpellList() {
      if (char.spells.length === 0)
        return <p className="text-sm text-stone-400 text-center py-8">Nenhuma magia no grimório</p>

      if (grimSort === 'circle') {
        const byCircle = new Map<number, CharacterSpell[]>()
        sorted.forEach(s => { const a = byCircle.get(s.circle) ?? []; a.push(s); byCircle.set(s.circle, a) })
        return [...byCircle.keys()].sort().map(circle => (
          <div key={circle} className="mb-4">
            <h4 className="text-[10px] font-semibold uppercase tracking-widest text-stone-400 mb-1 pb-1 border-b border-stone-200">
              {circle}° Círculo
            </h4>
            {byCircle.get(circle)!.map(cs => <SpellRow key={cs.spellId} cs={cs} />)}
          </div>
        ))
      }

      if (grimSort === 'school') {
        const bySchool = new Map<string, CharacterSpell[]>()
        sorted.forEach(s => { const a = bySchool.get(s.school) ?? []; a.push(s); bySchool.set(s.school, a) })
        return [...bySchool.keys()].sort().map(school => {
          const Icon = SCHOOL_ICONS[school]
          return (
            <div key={school} className="mb-4">
              <h4 className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-stone-400 mb-1 pb-1 border-b border-stone-200">
                {Icon && <Icon size={10} />}{school}
              </h4>
              {bySchool.get(school)!.map(cs => <SpellRow key={cs.spellId} cs={cs} />)}
            </div>
          )
        })
      }

      // alpha — flat list
      return sorted.map(cs => <SpellRow key={cs.spellId} cs={cs} />)
    }

    const SORT_OPTIONS: { value: 'circle' | 'alpha' | 'school'; label: string }[] = [
      { value: 'circle', label: 'Por Círculo' },
      { value: 'alpha',  label: 'Alfabética'  },
      { value: 'school', label: 'Por Escola'  },
    ]

    return (
      <div className="grid grid-cols-[1fr_168px] gap-4 items-start">
        {/* Main spell list */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display text-[11px] font-semibold uppercase tracking-widest text-stone-400">
              Grimório <span className="text-stone-300 font-normal ml-1">({char.spells.length})</span>
            </h3>
            <button onClick={() => setShowPicker(true)}
              className="flex items-center gap-1 text-xs text-tormenta-red hover:text-tormenta-red-dark font-medium">
              <Plus size={13} /> Adicionar
            </button>
          </div>
          {renderSpellList()}
        </div>

        {/* Sidebar */}
        <div className="space-y-3">
          {/* Sort */}
          <div className="bg-white border border-stone-200 rounded-xl p-3 shadow-sm">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-stone-400 mb-2">Organizar</p>
            <div className="space-y-0.5">
              {SORT_OPTIONS.map(({ value, label }) => (
                <button key={value} onClick={() => setGrimSort(value)}
                  className={`w-full text-left text-xs px-2 py-1.5 rounded-lg transition-colors ${
                    grimSort === value
                      ? 'bg-tormenta-red text-white font-medium'
                      : 'text-stone-600 hover:bg-stone-50'
                  }`}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Spell stats */}
          <div className="bg-white border border-stone-200 rounded-xl p-3 shadow-sm">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-stone-400 mb-2">Magia</p>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-stone-400">Attr. Chave</span>
                <select value={char.spellKeyAttr || 'int'} onChange={e => handleKeyAttrChange(e.target.value)}
                  className="text-xs border border-stone-200 rounded px-1 py-0.5 bg-stone-50 focus:outline-none focus:ring-1 focus:ring-tormenta-red text-stone-700">
                  {ATTR_CONFIG.map(a => <option key={a.key} value={a.key}>{a.abbr}</option>)}
                </select>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-stone-400">Mod. Magia</span>
                <span className="text-sm font-bold text-tormenta-red">{fmtBonus(spellMod)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-stone-400">Teste Res.</span>
                <span className="text-sm font-bold text-tormenta-red">{spellDC}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // TAB: ORIGEM & ANOTAÇÕES
  // ─────────────────────────────────────────────────────────────────────────────
  function renderOrigem() {
    return (
      <div className="space-y-5">
        <div className="card">
          <h3 className="font-display text-[11px] font-semibold uppercase tracking-widest text-stone-400 mb-4">Origem</h3>
          <div className="flex items-center gap-3 mb-4 p-3 bg-stone-50 rounded-lg border border-stone-100">
            <div className="flex-1">
              <p className="text-[10px] text-stone-400 mb-0.5">Origem do personagem</p>
              <p className="text-sm font-semibold text-stone-700">{char.origin || <span className="text-stone-300 font-normal">não definida</span>}</p>
            </div>
            <button onClick={() => setTab('geral')}
              className="text-xs text-tormenta-red hover:text-tormenta-red-dark flex items-center gap-1 shrink-0">
              <ArrowLeft size={11} /> Editar na aba Geral
            </button>
          </div>
          <label className="block text-[10px] font-medium text-stone-400 mb-1.5">
            Descrição da origem e bônus escolhidos
          </label>
          <textarea
            rows={6}
            value={char.originNotes ?? ''}
            onChange={e => patch({ originNotes: e.target.value })}
            placeholder="Descreva sua origem, os bônus escolhidos, perícias e poderes concedidos…"
            className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-sm text-stone-700 focus:outline-none focus:ring-1 focus:ring-tormenta-red resize-y"
          />
        </div>

        <div className="card">
          <h3 className="font-display text-[11px] font-semibold uppercase tracking-widest text-stone-400 mb-3">Anotações</h3>
          <textarea
            rows={10}
            value={char.notes}
            onChange={e => patch({ notes: e.target.value })}
            placeholder="Histórico, aliados, inimigos, tesouros, segredos, anotações gerais…"
            className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-sm text-stone-700 focus:outline-none focus:ring-1 focus:ring-tormenta-red resize-y"
          />
        </div>
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // TAB: EQUIPAMENTO
  // ─────────────────────────────────────────────────────────────────────────────
  function renderEquipamento() {
    const bodyItems = char.equipment.map((e, i) => ({ ...e, idx: i })).filter(e => e.location === 'body')
    const bagItems  = char.equipment.map((e, i) => ({ ...e, idx: i })).filter(e => e.location !== 'body')

    function ItemRows({ items }: { items: typeof bodyItems }) {
      return (
        <div className="divide-y divide-stone-50">
          {items.map(item => (
            <div key={item.idx}>
              <div className="flex items-center gap-2 py-1.5">
                <button type="button" onClick={() => toggleEquipExpand(item.idx)}
                  className="text-stone-300 hover:text-stone-500 shrink-0 transition-transform duration-150"
                  style={{ transform: expandedEquip.has(item.idx) ? 'rotate(90deg)' : 'none' }}>
                  <ChevronRight size={13} />
                </button>
                <input value={item.name} placeholder="Nome do item"
                  onChange={e => patchEquip(item.idx, 'name', e.target.value)}
                  className={`${INP_CARD} flex-1 min-w-0`}
                />
                <input type="number" min={1} value={item.quantity}
                  onChange={e => patchEquip(item.idx, 'quantity', parseInt(e.target.value) || 1)}
                  className="w-14 text-center bg-stone-50 border border-stone-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-tormenta-red shrink-0"
                />
                <div className="flex items-center gap-1 shrink-0">
                  <input type="number" min={0} value={item.slots}
                    onChange={e => patchEquip(item.idx, 'slots', parseInt(e.target.value) || 0)}
                    className="w-10 text-center bg-stone-50 border border-stone-200 rounded-lg px-1 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-tormenta-red"
                  />
                  <span className="text-[10px] text-stone-400">esp.</span>
                </div>
                <button onClick={() => removeEquip(item.idx)} className="text-stone-300 hover:text-red-500 shrink-0">
                  <Trash2 size={13} />
                </button>
              </div>
              <div className={`grid transition-all duration-200 ${expandedEquip.has(item.idx) ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                <div className="overflow-hidden">
                  <div className="pl-7 pr-2 pb-2">
                    <textarea rows={2}
                      value={item.description ?? ''}
                      onChange={e => patchEquip(item.idx, 'description', e.target.value)}
                      placeholder="Descrição do item…"
                      className="w-full bg-stone-50 border border-stone-200 rounded-lg px-2 py-1.5 text-xs text-stone-600 focus:outline-none focus:ring-1 focus:ring-tormenta-red resize-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )
    }

    function Section({ title, items, open, onToggle, location }: {
      title: string
      items: typeof bodyItems
      open: boolean
      onToggle: () => void
      location: 'body' | 'bag'
    }) {
      return (
        <div className="border border-stone-200 rounded-xl overflow-hidden">
          <button type="button" onClick={onToggle}
            className="w-full flex items-center justify-between px-4 py-2.5 bg-stone-50/80 hover:bg-stone-100 transition-colors">
            <div className="flex items-center gap-2">
              {open ? <ChevronDown size={13} className="text-stone-400" /> : <ChevronRight size={13} className="text-stone-400" />}
              <span className="text-xs font-semibold text-stone-600">{title}</span>
              <span className="text-[10px] text-stone-400 bg-stone-200 rounded-full px-1.5 py-0.5 leading-none">{items.length}</span>
            </div>
            <button type="button" onClick={e => { e.stopPropagation(); addEquip(location) }}
              className="flex items-center gap-0.5 text-[11px] text-tormenta-red hover:text-tormenta-red-dark font-medium">
              <Plus size={11} /> Adicionar
            </button>
          </button>
          <div className={`grid transition-all duration-300 ${open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
            <div className="overflow-hidden">
              <div className="px-4 py-2">
                {items.length === 0
                  ? <p className="text-xs text-stone-400 text-center py-3">Nenhum item nesta seção</p>
                  : <ItemRows items={items} />
                }
              </div>
            </div>
          </div>
        </div>
      )
    }

    return (
      <div className="space-y-5">
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display text-[11px] font-semibold uppercase tracking-widest text-stone-400">Equipamentos</h3>
            <div className="flex items-center gap-3 text-xs text-stone-500">
              <span>Carga:
                <span className={`font-semibold ml-1 ${slotsUsed > carryLimit ? 'text-red-600' : 'text-stone-700'}`}>
                  {slotsUsed}
                </span>
                <span className="text-stone-400"> / {carryLimit}</span>
              </span>
              <span className="text-stone-300 text-[10px]">(10 + 2×FOR)</span>
              <span className="text-stone-400">T$</span>
              <input type="number" min={0} value={char.money}
                onChange={e => patch({ money: parseInt(e.target.value) || 0 })}
                className="w-16 text-right bg-stone-50 border border-stone-200 rounded px-2 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-tormenta-red"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Section title="Equipado no corpo" items={bodyItems} open={bodyOpen}
              onToggle={() => setBodyOpen(o => !o)} location="body" />
            <Section title="Na mochila" items={bagItems} open={bagOpen}
              onToggle={() => setBagOpen(o => !o)} location="bag" />
          </div>
        </div>

        <div className="card">
          <h3 className="font-display text-[11px] font-semibold uppercase tracking-widest text-stone-400 mb-3">Anotações</h3>
          <textarea rows={4} value={char.notes}
            onChange={e => patch({ notes: e.target.value })}
            placeholder="Notas do personagem…"
            className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-tormenta-red resize-y"
          />
        </div>
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────────

  if (charLoading) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-16 text-center">
        <p className="text-stone-400">Carregando ficha…</p>
      </div>
    )
  }

  if (charError) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-16 text-center">
        <p className="text-red-500 mb-4">{charError}</p>
        <Link to="/fichas" className="btn-secondary">← Minhas Fichas</Link>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-6 pb-24">
      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <Link to="/fichas"
            className="inline-flex items-center gap-1 text-xs text-stone-400 hover:text-stone-600 transition-colors mb-2">
            <ArrowLeft size={12} /> Minhas Fichas
          </Link>
          {profile.username && (
            <p className="text-[10px] text-stone-400 mb-0.5">Ficha de {profile.username}</p>
          )}
          <h1 className="font-display text-3xl font-semibold text-tormenta-red leading-tight">
            {char.name || 'Personagem'}
          </h1>
          <p className="text-stone-400 text-sm mt-0.5">
            {[char.race, char.origin].filter(Boolean).join(' · ')}
            {char.classes.some(c => c.name) && ` · ${char.classes.map(c => `${c.name} ${c.level}`).join(' / ')}`}
            {` · Nível ${level}`}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 border-b border-stone-200">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setTab(id)}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px whitespace-nowrap ${
              tab === id
                ? 'border-tormenta-red text-tormenta-red'
                : 'border-transparent text-stone-400 hover:text-stone-600'
            }`}>
            <Icon size={14} />{label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'geral'       && renderGeral()}
      {tab === 'pericias'    && renderPericias()}
      {tab === 'poderes'     && renderPoderes()}
      {tab === 'origem'      && renderOrigem()}
      {tab === 'combate'     && renderCombate()}
      {tab === 'grimorio'    && renderGrimorio()}
      {tab === 'equipamento' && renderEquipamento()}

      {/* Modals */}
      {showPicker && (
        <SpellPicker onAdd={addSpell} onClose={() => setShowPicker(false)} alreadyAdded={addedSpellIds} />
      )}
      {modalSpell && <SpellModal spell={modalSpell} onClose={() => setModalSpell(null)} />}

      {/* Sticky save button */}
      <div className="fixed bottom-6 right-6 z-40">
        <button
          onClick={handleSave}
          disabled={saveState === 'saving'}
          className={`flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold text-white shadow-lg transition-all disabled:opacity-70 ${
            saveState === 'saved'  ? 'bg-emerald-600' :
            saveState === 'error'  ? 'bg-red-600' :
            'bg-tormenta-red hover:bg-tormenta-red-dark'
          }`}
        >
          {saveState === 'saving' ? 'Salvando…' :
           saveState === 'saved'  ? 'Salvo!' :
           saveState === 'error'  ? 'Erro ao salvar' :
           'Salvar ficha'}
        </button>
      </div>
    </div>
  )
}
