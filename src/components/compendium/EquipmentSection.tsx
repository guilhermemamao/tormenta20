import { useState, useMemo } from 'react'
import { Search } from 'lucide-react'
import { ALL_EQUIPMENT, CATEGORY_LABELS, CATEGORY_ICONS, type EquipCategory } from '../../lib/equipment_data'

function normalizeStr(s: string) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

const CATEGORIES: EquipCategory[] = ['arma', 'armadura', 'escudo', 'acessorio', 'esoterico', 'item', 'alimento', 'pocao', 'roupa']

export default function EquipmentSection() {
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState<EquipCategory | null>(null)

  const filtered = useMemo(() => {
    let result = ALL_EQUIPMENT
    if (activeCategory) result = result.filter(e => e.category === activeCategory)
    if (search.trim().length >= 2) {
      const q = normalizeStr(search.trim())
      result = result.filter(e => normalizeStr(e.name).includes(q) || normalizeStr(e.description).includes(q))
    }
    return result
  }, [search, activeCategory])

  return (
    <div className="space-y-4">
      {/* Filtros de categoria */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setActiveCategory(null)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
            !activeCategory ? 'bg-tormenta-red text-white border-tormenta-red' : 'text-stone-500 border-stone-200 hover:bg-stone-50'
          }`}
        >
          Todos
        </button>
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              activeCategory === cat ? 'bg-tormenta-red text-white border-tormenta-red' : 'text-stone-500 border-stone-200 hover:bg-stone-50'
            }`}
          >
            <span>{CATEGORY_ICONS[cat]}</span>
            {CATEGORY_LABELS[cat]}
          </button>
        ))}
      </div>

      {/* Busca */}
      <div className="relative">
        <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar equipamento..."
          className="w-full pl-7 pr-3 py-1.5 text-sm border border-stone-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-tormenta-red"
        />
      </div>

      {/* Contador */}
      <p className="text-[10px] text-stone-400">{filtered.length} item(ns)</p>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {filtered.map((item, i) => (
          <div key={i} className="bg-white border border-stone-200 rounded-xl p-3 hover:border-stone-300 transition-colors">
            <div className="flex items-start justify-between gap-2 mb-1">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-base shrink-0">{CATEGORY_ICONS[item.category]}</span>
                <p className="font-semibold text-stone-800 text-sm leading-tight truncate">{item.name}</p>
              </div>
              <span className="text-[10px] text-stone-400 shrink-0 mt-0.5">{item.price}</span>
            </div>
            <p className="text-[11px] text-stone-500 leading-relaxed">{item.description}</p>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="text-center py-10 text-stone-400 text-sm">Nenhum equipamento encontrado.</p>
      )}
    </div>
  )
}
