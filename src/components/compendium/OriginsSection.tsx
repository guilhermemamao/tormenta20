import { useState, useMemo } from 'react'
import { Search, ChevronDown, BookOpen } from 'lucide-react'
import OrigensJson from '../../lib/mechanics_data/Origens.json'

interface MechanicsItem {
  type: 'item'
  name: string
  description: string
}

interface MechanicsFolder {
  type: 'folder'
  name: string
  items: (MechanicsItem | MechanicsFolder)[]
}

function normalizeStr(s: string) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

function extractOrigens(nodes: (MechanicsItem | MechanicsFolder)[]): MechanicsItem[] {
  const results: MechanicsItem[] = []
  for (const node of nodes) {
    if (node.type === 'item') results.push(node)
    else if (node.type === 'folder') results.push(...extractOrigens(node.items))
  }
  return results
}

const data = OrigensJson as MechanicsFolder
const REGRAS_GERAIS = data.items.slice(0, 3).filter(n => n.type === 'item') as MechanicsItem[]
const allOrigens = extractOrigens(data.items.slice(3)).sort((a, b) => a.name.localeCompare(b.name))

function RuleCard({ item }: { item: MechanicsItem }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border border-stone-100 rounded-lg overflow-hidden mb-2 last:mb-0">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left hover:bg-stone-50 transition-colors"
      >
        <span className="flex-1 text-sm font-medium text-stone-800">{item.name}</span>
        <ChevronDown
          size={13}
          className={`text-stone-300 shrink-0 transition-transform duration-150 ${open ? '' : '-rotate-90'}`}
        />
      </button>
      {open && (
        <div className="px-3 pb-3 pt-1.5 border-t border-stone-50 bg-stone-50/50">
          <p className="text-xs text-stone-600 leading-relaxed whitespace-pre-line">{item.description}</p>
        </div>
      )}
    </div>
  )
}

export default function OriginsSection() {
  const [selected, setSelected] = useState<MechanicsItem | null>(null)
  const [search, setSearch] = useState('')
  const [showRules, setShowRules] = useState(false)

  const filtered = useMemo(() => {
    const q = search.trim()
    if (!q) return allOrigens
    const norm = normalizeStr(q)
    return allOrigens.filter(
      o => normalizeStr(o.name).includes(norm) || normalizeStr(o.description).includes(norm)
    )
  }, [search])

  return (
    <div className="flex flex-col gap-5 md:flex-row md:items-start">
      {/* Left panel */}
      <div className="w-full md:w-64 shrink-0">
        <div className="mb-3">
          <button
            onClick={() => { setShowRules(s => !s); setSelected(null) }}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border transition-all mb-3 ${
              showRules
                ? 'bg-tormenta-red/10 border-tormenta-red/30 text-tormenta-red'
                : 'border-stone-200 text-stone-500 hover:bg-stone-50'
            }`}
          >
            <BookOpen size={14} />
            Como funcionam as Origens
          </button>
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              value={search}
              onChange={e => { setSearch(e.target.value); setSelected(null) }}
              placeholder="Buscar origem..."
              className="w-full pl-7 pr-3 py-1.5 text-sm border border-stone-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-tormenta-red"
            />
          </div>
          <p className="text-[10px] text-stone-400 mt-1.5 px-0.5">
            {filtered.length} {filtered.length === 1 ? 'origem' : 'origens'}
          </p>
        </div>
        <div className="space-y-1">
          {filtered.map(o => (
            <button
              key={o.name}
              onClick={() => { setSelected(o); setShowRules(false) }}
              className={`w-full text-left px-3 py-2.5 rounded-lg border transition-all ${
                selected?.name === o.name
                  ? 'bg-tormenta-red/10 border-tormenta-red/30'
                  : 'border-stone-100 hover:border-stone-200 hover:bg-stone-50'
              }`}
            >
              <p className={`font-display font-semibold text-sm ${selected?.name === o.name ? 'text-tormenta-red' : 'text-stone-800'}`}>
                {o.name}
              </p>
            </button>
          ))}
          {filtered.length === 0 && (
            <p className="text-sm text-stone-400 text-center py-6">Nenhuma origem encontrada</p>
          )}
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 min-w-0">
        {showRules ? (
          <div className="card">
            <h3 className="font-display text-xs font-semibold uppercase tracking-widest text-stone-400 mb-3">
              Como funcionam as Origens
            </h3>
            {REGRAS_GERAIS.map((r, i) => <RuleCard key={i} item={r} />)}
          </div>
        ) : selected ? (
          <div className="card">
            <h2 className="font-display text-2xl font-semibold text-tormenta-red mb-4">{selected.name}</h2>
            <p className="text-sm text-stone-600 leading-relaxed whitespace-pre-line">{selected.description}</p>
          </div>
        ) : (
          <p className="text-xs text-stone-400 text-center py-8">
            Selecione uma origem à esquerda para ver seus detalhes
          </p>
        )}
      </div>
    </div>
  )
}
