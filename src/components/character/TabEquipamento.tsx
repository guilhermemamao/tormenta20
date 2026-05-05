import { useState } from 'react'
import { Plus, Trash2, ChevronRight, ChevronDown, ArrowUpDown } from 'lucide-react'
import type { Character } from '../../types'
import { INP_CARD } from './characterHelpers'
import { ALL_EQUIPMENT, CATEGORY_ICONS, CATEGORY_LABELS, type EquipCategory } from '../../lib/equipment_data'

interface TabEquipamentoProps {
  char: Character
  patch: (p: Partial<Character>) => void
  addEquip: (location: 'body' | 'bag') => void
  removeEquip: (i: number) => void
  patchEquip: (i: number, field: string, value: string | number) => void
  expandedEquip: Set<number>
  toggleEquipExpand: (i: number) => void
  bodyOpen: boolean
  setBodyOpen: (v: boolean | ((prev: boolean) => boolean)) => void
  bagOpen: boolean
  setBagOpen: (v: boolean | ((prev: boolean) => boolean)) => void
  slotsUsed: number
  carryLimit: number
}

type EquipItem = Character['equipment'][number] & { idx: number }

interface ItemRowsProps {
  items: EquipItem[]
  patchEquip: (i: number, field: string, value: string | number) => void
  removeEquip: (i: number) => void
  toggleEquipExpand: (i: number) => void
  expandedEquip: Set<number>
  onSelect: (idx: number, entry: typeof ALL_EQUIPMENT[0]) => void
}

const CATEGORY_ORDER: Record<string, number> = {
  arma: 0, armadura: 1, escudo: 2, acessorio: 3, esoterico: 4, item: 5,
  alimento: 6, pocao: 7, roupa: 8, '': 9,
}

const CYCLE_CATS: EquipCategory[] = [
  'arma', 'armadura', 'escudo', 'acessorio', 'esoterico', 'item', 'alimento', 'pocao', 'roupa',
]

function EquipRow({ item, patchEquip, removeEquip, toggleEquipExpand, expandedEquip, onSelect }: {
  item: EquipItem
  patchEquip: (i: number, field: string, value: string | number) => void
  removeEquip: (i: number) => void
  toggleEquipExpand: (i: number) => void
  expandedEquip: Set<number>
  onSelect: (idx: number, entry: typeof ALL_EQUIPMENT[0]) => void
}) {
  const [suggestions, setSuggestions] = useState<typeof ALL_EQUIPMENT>([])
  const [showSug, setShowSug] = useState(false)

  function handleNameChange(val: string) {
    patchEquip(item.idx, 'name', val)
    if (val.length >= 2) {
      const q = val.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
      setSuggestions(
        ALL_EQUIPMENT.filter(e =>
          e.name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').includes(q)
        ).slice(0, 6)
      )
      setShowSug(true)
    } else {
      setSuggestions([])
    }
  }

  function selectSuggestion(entry: typeof ALL_EQUIPMENT[0]) {
    onSelect(item.idx, entry)
    setSuggestions([])
    setShowSug(false)
  }

  const cat = item.category as EquipCategory | undefined
  const icon = cat && CATEGORY_ICONS[cat] ? CATEGORY_ICONS[cat] : '📦'

  return (
    <div>
      <div className="flex items-center gap-2 py-1.5">
        <button type="button" onClick={() => toggleEquipExpand(item.idx)}
          className="text-stone-300 hover:text-stone-500 shrink-0 transition-transform duration-150"
          style={{ transform: expandedEquip.has(item.idx) ? 'rotate(90deg)' : 'none' }}>
          <ChevronRight size={13} />
        </button>

        <button
          type="button"
          title={cat ? CATEGORY_LABELS[cat] : 'Sem categoria'}
          onClick={() => {
            const current = (item.category as EquipCategory) ?? CYCLE_CATS[0]
            const idx = CYCLE_CATS.indexOf(current)
            const next = CYCLE_CATS[(idx + 1) % CYCLE_CATS.length]
            patchEquip(item.idx, 'category', next)
          }}
          className="text-base shrink-0 hover:scale-110 transition-transform"
        >
          {icon}
        </button>

        <div className="relative flex-1 min-w-0">
          <input
            value={item.name}
            placeholder="Nome do item"
            onChange={e => handleNameChange(e.target.value)}
            onFocus={() => item.name.length >= 2 && setShowSug(true)}
            onBlur={() => setTimeout(() => setShowSug(false), 200)}
            className={`${INP_CARD} w-full`}
          />
          {showSug && suggestions.length > 0 && (
            <div className="absolute z-20 top-full left-0 mt-1 w-64 bg-white border border-stone-200 rounded-lg shadow-lg overflow-hidden">
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  type="button"
                  onPointerDown={e => { e.preventDefault(); selectSuggestion(s) }}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-stone-50 border-b border-stone-50 last:border-0"
                >
                  <span className="mr-1.5">{CATEGORY_ICONS[s.category]}</span>
                  <span className="font-medium text-stone-800">{s.name}</span>
                  <span className="text-[10px] text-stone-400 ml-1">{s.price}</span>
                </button>
              ))}
            </div>
          )}
        </div>

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
  )
}

function ItemRows({ items, patchEquip, removeEquip, toggleEquipExpand, expandedEquip, onSelect }: ItemRowsProps) {
  return (
    <div className="divide-y divide-stone-50">
      {items.map(item => (
        <EquipRow
          key={item.idx}
          item={item}
          patchEquip={patchEquip}
          removeEquip={removeEquip}
          toggleEquipExpand={toggleEquipExpand}
          expandedEquip={expandedEquip}
          onSelect={onSelect}
        />
      ))}
    </div>
  )
}

interface SectionProps extends ItemRowsProps {
  title: string
  open: boolean
  onToggle: () => void
  location: 'body' | 'bag'
  addEquip: (location: 'body' | 'bag') => void
}

function Section({ title, items, open, onToggle, location, addEquip, patchEquip, removeEquip, toggleEquipExpand, expandedEquip, onSelect }: SectionProps) {
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
              : <ItemRows items={items} patchEquip={patchEquip} removeEquip={removeEquip}
                  toggleEquipExpand={toggleEquipExpand} expandedEquip={expandedEquip} onSelect={onSelect} />
            }
          </div>
        </div>
      </div>
    </div>
  )
}

export default function TabEquipamento({
  char, patch,
  addEquip, removeEquip, patchEquip,
  expandedEquip, toggleEquipExpand,
  bodyOpen, setBodyOpen, bagOpen, setBagOpen,
  slotsUsed, carryLimit,
}: TabEquipamentoProps) {
  const [sortedEquipIds, setSortedEquipIds] = useState<number[] | null>(null)

  function applySortByCategory() {
    if (sortedEquipIds) {
      setSortedEquipIds(null)
    } else {
      const allItems = char.equipment.map((e, i) => ({ ...e, idx: i }))
      setSortedEquipIds(
        [...allItems]
          .sort((a, b) => (CATEGORY_ORDER[a.category ?? ''] ?? 9) - (CATEGORY_ORDER[b.category ?? ''] ?? 9))
          .map(e => e.idx)
      )
    }
  }

  function sortItems(items: EquipItem[]): EquipItem[] {
    if (!sortedEquipIds) return items
    return [...items].sort((a, b) => {
      const ai = sortedEquipIds.indexOf(a.idx)
      const bi = sortedEquipIds.indexOf(b.idx)
      return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi)
    })
  }

  function applyEquipSuggestion(idx: number, entry: typeof ALL_EQUIPMENT[0]) {
    const newEquip = char.equipment.map((e, i) => i === idx ? {
      ...e,
      name: entry.name,
      description: entry.description,
      category: entry.category,
      slots: parseFloat((entry.spaces ?? '0').replace(',', '.')) || e.slots,
    } : e)
    patch({ equipment: newEquip })
  }

  const bodyItems = sortItems(char.equipment.map((e, i) => ({ ...e, idx: i })).filter(e => e.location === 'body'))
  const bagItems  = sortItems(char.equipment.map((e, i) => ({ ...e, idx: i })).filter(e => e.location !== 'body'))

  return (
    <div className="space-y-5">
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <h3 className="font-display text-[11px] font-semibold uppercase tracking-widest text-stone-400">Equipamentos</h3>
            <button
              onClick={applySortByCategory}
              className={`flex items-center gap-1 text-xs font-medium transition-colors ${!sortedEquipIds ? 'text-tormenta-red' : 'text-stone-400'}`}
            >
              <ArrowUpDown size={12} /> Ordenar
            </button>
          </div>
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
            onToggle={() => setBodyOpen(o => !o)} location="body" addEquip={addEquip}
            patchEquip={patchEquip} removeEquip={removeEquip}
            toggleEquipExpand={toggleEquipExpand} expandedEquip={expandedEquip}
            onSelect={applyEquipSuggestion} />
          <Section title="Na mochila" items={bagItems} open={bagOpen}
            onToggle={() => setBagOpen(o => !o)} location="bag" addEquip={addEquip}
            patchEquip={patchEquip} removeEquip={removeEquip}
            toggleEquipExpand={toggleEquipExpand} expandedEquip={expandedEquip}
            onSelect={applyEquipSuggestion} />
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
