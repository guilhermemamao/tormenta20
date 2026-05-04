import { useState, useEffect, useMemo } from 'react'
import {
  Search, ChevronDown,
  Home, Sword, AlertTriangle, Star, Package, Zap, Sparkles,
  Store, MapPin, BookOpen, Dices,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

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

type MechanicsNode = MechanicsItem | MechanicsFolder

// ─── Data ─────────────────────────────────────────────────────────────────────

const FILES = [
  { file: 'Bases',            label: 'Bases' },
  { file: 'Combate',          label: 'Combate' },
  { file: 'Condições',        label: 'Condições' },
  { file: 'Deuses',           label: 'Deuses' },
  { file: 'Equipamento',      label: 'Equipamento' },
  { file: 'Habilidades',      label: 'Habilidades' },
  { file: 'Itens-Magicos',    label: 'Itens Mágicos' },
  { file: 'Negócios',         label: 'Negócios' },
  { file: 'Origens',          label: 'Origens' },
  { file: 'Perícias',         label: 'Perícias' },
  { file: 'Testes',           label: 'Testes' },
]

const TOPIC_ICONS: Record<string, React.ElementType> = {
  'Bases':           Home,
  'Combate':         Sword,
  'Condições':       AlertTriangle,
  'Deuses':          Star,
  'Equipamento':     Package,
  'Habilidades':     Zap,
  'Itens Mágicos':   Sparkles,
  'Negócios':        Store,
  'Origens':         MapPin,
  'Perícias':        BookOpen,
  'Testes':          Dices,
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normalizeStr(s: string) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

function searchNodes(nodes: MechanicsNode[], q: string): { item: MechanicsItem; nameMatch: boolean }[] {
  const results: { item: MechanicsItem; nameMatch: boolean }[] = []
  if (!Array.isArray(nodes)) return results
  for (const node of nodes) {
    if (!node || typeof node !== 'object') continue
    try {
      if (node.type === 'item') {
        const nameMatch = normalizeStr(node.name ?? '').includes(q)
        const descMatch = normalizeStr(node.description ?? '').includes(q)
        if (nameMatch || descMatch) results.push({ item: node, nameMatch })
      } else if (node.type === 'folder' && Array.isArray(node.items)) {
        results.push(...searchNodes(node.items, q))
      }
    } catch { continue }
  }
  return results
}

function searchAllTopics(topics: MechanicsFolder[], q: string): { topicName: string; items: MechanicsItem[] }[] {
  return topics
    .map(topic => {
      const results = searchNodes(topic.items, q)
      const sorted = [
        ...results.filter(r => r.nameMatch).map(r => r.item),
        ...results.filter(r => !r.nameMatch).map(r => r.item),
      ]
      return { topicName: topic.name, items: sorted }
    })
    .filter(group => group.items.length > 0)
}

// ─── NodeRenderer ─────────────────────────────────────────────────────────────

function NodeRenderer({ node, depth = 0 }: { node: MechanicsNode; depth?: number }) {
  const [open, setOpen] = useState(depth === 0)

  return (
    <div className={`border rounded-xl overflow-hidden mb-2 ${depth > 0 ? 'border-stone-100' : 'border-stone-200'}`}>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-4 py-3 bg-stone-50 hover:bg-stone-100 transition-colors text-left"
      >
        <ChevronDown
          size={depth === 0 ? 14 : 12}
          className={`text-stone-400 shrink-0 transition-transform duration-150 ${open ? '' : '-rotate-90'}`}
        />
        <span className={`font-sans font-semibold text-stone-800 flex-1 ${depth === 0 ? 'text-sm' : 'text-[13px]'}`}>
          {node.name}
        </span>
        {node.type === 'folder' && (
          <span className="text-[10px] text-stone-400 shrink-0">
            {node.items.length} {node.items.length === 1 ? 'item' : 'itens'}
          </span>
        )}
      </button>
      <div className={`grid transition-all duration-200 ${open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
        <div className="overflow-hidden">
          {node.type === 'item' ? (
            <div className="px-4 pb-4 pt-2">
              <p className={`font-sans leading-relaxed whitespace-pre-line text-stone-600 ${depth === 0 ? 'text-sm' : 'text-xs'}`}>
                {node.description}
              </p>
            </div>
          ) : (
            <div className="px-3 pb-3 pt-2">
              {node.items.map((child, i) => (
                <NodeRenderer key={i} node={child} depth={depth + 1} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── MechanicsSection ─────────────────────────────────────────────────────────

export default function MechanicsSection() {
  const [topics, setTopics] = useState<MechanicsFolder[]>([])
  const [selected, setSelected] = useState<MechanicsFolder | null>(null)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all(
      FILES.map(f =>
        import(`../../lib/mechanics_data/${f.file}.json`)
          .then(m => ({ ...(m.default as MechanicsFolder), name: f.label }))
          .catch(() => ({
            type: 'folder' as const,
            name: f.label,
            items: [{
              type: 'item' as const,
              name: 'Erro ao carregar',
              description: `Não foi possível carregar o arquivo ${f.file}.json`,
            }],
          }))
      )
    ).then(data => {
      setTopics(data)
      setSelected(data[0] ?? null)
      setLoading(false)
    })
  }, [])

  const globalResults = useMemo(() => {
    const q = search.trim()
    if (!q || q.length < 2) return null
    return searchAllTopics(topics, normalizeStr(q))
  }, [topics, search])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-stone-400 text-sm">Carregando mecânicas…</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-start">
      {/* Left panel — search + topic list */}
      <div className="w-full md:w-56 shrink-0">
        <div className="card py-3 px-2">
          {/* Search */}
          <div className="relative mb-3 px-1">
            <Search size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar em tudo…"
              className="w-full pl-7 pr-3 py-1.5 text-sm border border-stone-200 rounded-lg bg-stone-50 focus:outline-none focus:ring-1 focus:ring-tormenta-red"
            />
          </div>

          {/* Topic list */}
          <nav className="space-y-0.5">
            {topics.map(topic => {
              const Icon = TOPIC_ICONS[topic.name] ?? BookOpen
              return (
                <button
                  key={topic.name}
                  onClick={() => { setSelected(topic); setSearch('') }}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left ${
                    !search && selected?.name === topic.name
                      ? 'bg-tormenta-red/10 text-tormenta-red'
                      : 'text-stone-500 hover:bg-stone-100 hover:text-stone-700'
                  }`}
                >
                  <Icon size={14} className="shrink-0" />
                  <span>{topic.name}</span>
                </button>
              )
            })}
          </nav>
        </div>
      </div>

      {/* Right panel — content */}
      <div className="flex-1 min-w-0">
        {globalResults ? (
          <div className="card">
            <p className="text-xs text-stone-400 mb-4">
              {globalResults.reduce((n, g) => n + g.items.length, 0)} resultado(s) em todos os tópicos
            </p>
            {globalResults.length === 0 ? (
              <p className="text-sm text-stone-400 text-center py-8">Nenhum resultado encontrado.</p>
            ) : (
              globalResults.map(group => (
                <div key={group.topicName} className="mb-6">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400 mb-2">
                    {group.topicName}
                  </p>
                  {group.items.map((item, i) => (
                    <div key={i} className="border border-stone-200 rounded-xl overflow-hidden mb-2">
                      <div className="px-4 py-3 bg-stone-50">
                        <span className="font-sans font-semibold text-sm text-stone-800">{item.name}</span>
                      </div>
                      <div className="px-4 pb-4 pt-2">
                        <p className="font-sans text-sm text-stone-600 leading-relaxed whitespace-pre-line">
                          {item.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ))
            )}
          </div>
        ) : selected ? (
          <NodeRenderer node={selected} depth={0} />
        ) : null}
      </div>
    </div>
  )
}
