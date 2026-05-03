import { Plus, Trash2, ChevronRight, ChevronDown } from 'lucide-react'
import type { Character } from '../../types'
import { INP_CARD } from './characterHelpers'

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

export default function TabEquipamento({
  char, patch,
  addEquip, removeEquip, patchEquip,
  expandedEquip, toggleEquipExpand,
  bodyOpen, setBodyOpen, bagOpen, setBagOpen,
  slotsUsed, carryLimit,
}: TabEquipamentoProps) {
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
