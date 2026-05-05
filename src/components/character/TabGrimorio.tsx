import { useState, useEffect, useMemo } from 'react'
import { Plus, Trash2, Search, X, Link } from 'lucide-react'
import type { Character, CharacterSpell, Spell } from '../../types'
import { CATEGORY_ICONS, type EquipCategory } from '../../lib/equipment_data'
import { supabase } from '../../lib/supabase'
import {
  SCHOOL_ICONS, ATTR_CONFIG,
  attrMod, fmtBonus, normalizeStr, rowToSpell,
  type DbSpellRow,
} from './characterHelpers'

// ─── SpellPicker ─────────────────────────────────────────────────────────────

export function SpellPicker({ onAdd, onClose, alreadyAdded }: {
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

// ─── ItemLinkField ────────────────────────────────────────────────────────────

const LINK_ALLOWED = ['esoterico', 'roupa', 'item']

type SuggestionItem = { name: string; category: EquipCategory; icon: string; effect?: string }

function ItemLinkField({ value, onChange, onSelectEffect, charEquipment }: {
  value: string
  onChange: (v: string) => void
  onSelectEffect?: (effect: string) => void
  charEquipment: Character['equipment']
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState(value)
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([])

  useEffect(() => {
    setSearch(value)
  }, [value])

  function getItemIcon(name: string): string {
    const found = charEquipment.find(e => e.name === name)
    if (!found?.category) return '📦'
    return CATEGORY_ICONS[found.category as EquipCategory] ?? '📦'
  }

  function handleChange(val: string) {
    setSearch(val)
    onChange(val)
    if (val.length >= 2) {
      const q = val.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
      setSuggestions(
        charEquipment
          .filter(e => LINK_ALLOWED.includes(e.category ?? '') &&
            e.name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').includes(q))
          .map(e => ({
            name: e.name,
            category: (e.category ?? 'item') as EquipCategory,
            icon: CATEGORY_ICONS[(e.category as EquipCategory) ?? 'item'] ?? '📦',
            effect: e.effect,
          }))
          .slice(0, 6)
      )
    } else {
      setSuggestions([])
    }
  }

  if (!open && !value) {
    return (
      <button type="button" onClick={() => setOpen(true)}
        className="text-[10px] text-stone-300 hover:text-tormenta-red transition-colors flex items-center gap-0.5 shrink-0">
        <Link size={10} /> item
      </button>
    )
  }

  return (
    <div className="relative flex items-center gap-1 shrink-0">
      {value ? (
        <span className="text-base shrink-0">{getItemIcon(value)}</span>
      ) : (
        <Link size={10} className="text-tormenta-red shrink-0" />
      )}
      <input
        type="text"
        value={search}
        onChange={e => handleChange(e.target.value)}
        onBlur={() => setTimeout(() => { setSuggestions([]); if (!value) setOpen(false) }, 200)}
        placeholder="Efeito de item..."
        autoFocus={open}
        className="w-24 sm:w-32 text-xs bg-stone-50 border border-stone-200 rounded px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-tormenta-red"
      />
      {value && (
        <button type="button" onClick={() => { onChange(''); setSearch(''); setOpen(false) }}
          className="text-stone-300 hover:text-red-400 text-xs">✕</button>
      )}
      {suggestions.length > 0 && (
        <div className="absolute z-20 top-full left-0 mt-1 w-56 bg-white border border-stone-200 rounded-lg shadow-lg overflow-hidden">
          {suggestions.map((s, i) => (
            <button key={i} type="button"
              onPointerDown={e => {
                e.preventDefault()
                onChange(s.name)
                setSearch(s.name)
                if (onSelectEffect) onSelectEffect(s.effect ?? '')
                setSuggestions([])
              }}
              className="w-full text-left px-3 py-1.5 text-xs hover:bg-stone-50 border-b border-stone-50 last:border-0">
              <span className="mr-1">{s.icon}</span>
              {s.name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── SpellRow ────────────────────────────────────────────────────────────────

function SpellRow({ cs, openSpellModal, removeSpell, patchSpell, charEquipment }: {
  cs: CharacterSpell
  openSpellModal: (cs: CharacterSpell) => void
  removeSpell: (spellId: string) => void
  patchSpell: (spellId: string, field: keyof CharacterSpell, value: string) => void
  charEquipment: Character['equipment']
}) {
  const Icon = SCHOOL_ICONS[cs.school]
  return (
    <div className="flex flex-wrap items-center gap-x-1 gap-y-0.5 py-1.5 group border-b border-stone-50 last:border-0">
      <button onClick={() => openSpellModal(cs)}
        className="flex items-center gap-2 text-left min-w-0 flex-1">
        {Icon && <Icon size={12} className="text-stone-300 group-hover:text-tormenta-red shrink-0 transition-colors" />}
        <span className="text-sm font-medium text-stone-800 group-hover:text-tormenta-red transition-colors truncate">{cs.spellName}</span>
        <span className="text-[10px] text-stone-400 shrink-0">{cs.circle}°</span>
        <span className={`text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full shrink-0 ${
          cs.type === 'Arcana'  ? 'bg-purple-100 text-purple-700' :
          cs.type === 'Divina' ? 'bg-amber-100 text-amber-700' :
          'bg-teal-100 text-teal-700'
        }`} title={cs.type}>
          {cs.type === 'Arcana' ? 'A' : cs.type === 'Divina' ? 'D' : 'U'}
        </span>
      </button>
      <div className="flex items-center gap-1 ml-auto shrink-0">
        <ItemLinkField
          value={cs.itemLink ?? ''}
          onChange={val => patchSpell(cs.spellId, 'itemLink', val)}
          onSelectEffect={effect => patchSpell(cs.spellId, 'itemEffect', effect)}
          charEquipment={charEquipment}
        />
        <button onClick={() => removeSpell(cs.spellId)}
          className="text-stone-300 hover:text-red-500 transition-colors shrink-0">
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  )
}

// ─── TabGrimorio ─────────────────────────────────────────────────────────────

interface TabGrimorioProps {
  char: Character
  patch: (p: Partial<Character>) => void
  grimSort: 'circle' | 'alpha' | 'school'
  setGrimSort: (v: 'circle' | 'alpha' | 'school') => void
  setShowPicker: (v: boolean) => void
  addedSpellIds: Set<string>
  removeSpell: (spellId: string) => void
  openSpellModal: (cs: CharacterSpell) => void
  patchSpell: (spellId: string, field: keyof CharacterSpell, value: string) => void
  charEquipment: Character['equipment']
  level: number
  id: string | undefined
}

export default function TabGrimorio({
  char, patch,
  grimSort, setGrimSort,
  setShowPicker,
  removeSpell, openSpellModal,
  patchSpell, charEquipment,
  level, id,
}: TabGrimorioProps) {
  const keyAttrKey = (char.spellKeyAttr || 'int') as keyof Character['attributes']
  const spellMod   = Math.floor(level / 2) + attrMod(char.attributes[keyAttrKey])
  const spellDC    = 10 + spellMod

  async function handleKeyAttrChange(newKey: string) {
    patch({ spellKeyAttr: newKey })
    if (id) await supabase.from('characters').update({ spell_key_attr: newKey }).eq('id', id)
  }

  const sorted = [...char.spells].sort((a, b) =>
    grimSort === 'alpha'  ? a.spellName.localeCompare(b.spellName, 'pt') :
    grimSort === 'school' ? a.school.localeCompare(b.school, 'pt') || a.spellName.localeCompare(b.spellName, 'pt') :
    a.circle - b.circle || a.spellName.localeCompare(b.spellName, 'pt')
  )

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
          {byCircle.get(circle)!.map(cs => <SpellRow key={cs.spellId} cs={cs} openSpellModal={openSpellModal} removeSpell={removeSpell} patchSpell={patchSpell} charEquipment={charEquipment} />)}
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
            {bySchool.get(school)!.map(cs => <SpellRow key={cs.spellId} cs={cs} openSpellModal={openSpellModal} removeSpell={removeSpell} patchSpell={patchSpell} charEquipment={charEquipment} />)}
          </div>
        )
      })
    }

    return sorted.map(cs => <SpellRow key={cs.spellId} cs={cs} openSpellModal={openSpellModal} removeSpell={removeSpell} patchSpell={patchSpell} charEquipment={charEquipment} />)
  }

  const SORT_OPTIONS: { value: 'circle' | 'alpha' | 'school'; label: string }[] = [
    { value: 'circle', label: 'Por Círculo' },
    { value: 'alpha',  label: 'Alfabética'  },
    { value: 'school', label: 'Por Escola'  },
  ]

  return (
    <div className="flex flex-col gap-4 sm:grid sm:grid-cols-[1fr_168px] sm:items-start">
      {/* Sidebar — topo em mobile, direita em desktop */}
      <div className="order-1 sm:order-2 flex flex-row gap-3 sm:flex-col sm:space-y-0">
        {/* Sort */}
        <div className="flex-1 sm:flex-none bg-white border border-stone-200 rounded-xl p-3 shadow-sm">
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
        <div className="flex-1 sm:flex-none bg-white border border-stone-200 rounded-xl p-3 shadow-sm">
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

      {/* Main spell list — abaixo em mobile, esquerda em desktop */}
      <div className="order-2 sm:order-1 card">
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
    </div>
  )
}
