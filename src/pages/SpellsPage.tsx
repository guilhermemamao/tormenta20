import { useState, useMemo, useEffect, useCallback } from 'react'
import {
  Shield, Eye, Sparkles, Heart, Zap, EyeOff, Skull, RefreshCw,
  Search, X, Plus, Pencil, HelpCircle,
} from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import type { Spell, SpellSchool, SpellType, Amplifier } from '../types'
import { supabase } from '../lib/supabase'
import SpellModal from '../components/SpellModal'
import { useAuth } from '../hooks/useAuth'

// ─── Constants ───────────────────────────────────────────────────────────────

const SCHOOL_ICONS: Record<SpellSchool, React.ElementType> = {
  Abjuração: Shield,
  Adivinhação: Eye,
  Convocação: Sparkles,
  Encantamento: Heart,
  Evocação: Zap,
  Ilusão: EyeOff,
  Necromancia: Skull,
  Transmutação: RefreshCw,
}

const TYPE_TAG: Record<SpellType, string> = {
  Arcana: 'tag-arcana',
  Divina: 'tag-divina',
  Universal: 'tag-universal',
}

const CIRCLES = [1, 2, 3, 4, 5] as const
const CIRCLE_LABEL = ['1º Círculo', '2º Círculo', '3º Círculo', '4º Círculo', '5º Círculo']
const SPELL_TYPES: SpellType[] = ['Arcana', 'Divina', 'Universal']
const SPELL_SCHOOLS: SpellSchool[] = [
  'Abjuração', 'Adivinhação', 'Convocação', 'Encantamento',
  'Evocação', 'Ilusão', 'Necromancia', 'Transmutação',
]

type SortBy = 'circle' | 'alpha' | 'type' | 'execution'
const SORT_LABELS: Record<SortBy, string> = {
  circle: 'Círculo',
  alpha: 'Alfabética',
  type: 'Tipo',
  execution: 'Execução',
}
const SORT_ORDER: SortBy[] = ['circle', 'alpha', 'type', 'execution']

// ─── Filter types ─────────────────────────────────────────────────────────────

function normalizeStr(str: string) {
  return str.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

interface Filters {
  search: string
  types: Set<SpellType>
  schools: Set<SpellSchool>
  circles: Set<number>
  onlyFavorites: boolean
}

const EMPTY_FILTERS: Filters = {
  search: '',
  types: new Set(),
  schools: new Set(),
  circles: new Set(),
  onlyFavorites: false,
}

function toggleSet<T>(set: Set<T>, value: T): Set<T> {
  const next = new Set(set)
  next.has(value) ? next.delete(value) : next.add(value)
  return next
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function CheckboxItem({ label, checked, onChange }: {
  label: string; checked: boolean; onChange: () => void
}) {
  return (
    <label className="flex items-center gap-2 py-0.5 cursor-pointer group">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="rounded border-stone-300 accent-tormenta-red"
      />
      <span className="text-sm text-stone-600 group-hover:text-stone-900 transition-colors">
        {label}
      </span>
    </label>
  )
}

function FilterSection({ title, tooltip, children }: {
  title: string; tooltip?: string; children: React.ReactNode
}) {
  return (
    <div className="mb-5">
      <div className="flex items-center gap-1.5 mb-2">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-stone-400">{title}</h4>
        {tooltip && (
          <div className="relative group/tip">
            <HelpCircle size={11} className="text-stone-300 cursor-help" />
            <div className="absolute left-0 top-5 z-20 hidden group-hover/tip:block w-52 bg-stone-800 text-white text-xs rounded-lg p-2.5 shadow-lg leading-relaxed pointer-events-none">
              {tooltip}
            </div>
          </div>
        )}
      </div>
      {children}
    </div>
  )
}

function SectionHeader({ title }: { title: string }) {
  return (
    <h2 className="font-display text-xs font-semibold uppercase tracking-widest text-stone-400 mb-3 pb-2 border-b border-stone-100">
      {title}
    </h2>
  )
}

function SpellCard({ spell, onClick, isOwner, onEdit, isFavorited, onFavorite, isLoggedIn }: {
  spell: Spell
  onClick: () => void
  isOwner?: boolean
  onEdit?: () => void
  isFavorited?: boolean
  onFavorite?: () => void
  isLoggedIn?: boolean
}) {
  const Icon = SCHOOL_ICONS[spell.school]
  const hasTrick = spell.amplifiers?.some(a => a.isTrick) ?? false
  return (
    <div
      className="card relative group hover:border-tormenta-red/50 hover:shadow-md transition-all cursor-pointer"
      onClick={onClick}
    >
      {isOwner && onEdit && (
        <button
          onClick={e => { e.stopPropagation(); onEdit() }}
          className="absolute top-2 right-2 p-1.5 rounded-lg text-stone-300 hover:text-tormenta-red hover:bg-stone-100 opacity-0 group-hover:opacity-100 transition-all z-10"
          aria-label="Editar magia"
        >
          <Pencil size={18} />
        </button>
      )}
      <div className="flex items-start justify-between gap-2 mb-2 pr-8">
        <h3 className="font-display text-sm font-semibold text-stone-800 group-hover:text-tormenta-red transition-colors leading-tight">
          {spell.name}
        </h3>
        <div className="flex items-center gap-1 shrink-0">
          {hasTrick && <span className="tag-trick">Truque</span>}
          <span className={TYPE_TAG[spell.type]}>{spell.type}</span>
        </div>
      </div>
      <div className="flex items-center gap-1.5 text-xs text-stone-500 mb-3">
        <Icon size={12} className="text-stone-400 shrink-0" />
        <span>{spell.school}</span>
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 text-xs text-stone-400">
          <span title="Execução">⚡ {spell.execution}</span>
          <span title="Alcance">◎ {spell.range}</span>
        </div>
        {isLoggedIn && (
          <button
            onClick={e => { e.stopPropagation(); onFavorite?.() }}
            aria-label={isFavorited ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
            className="p-1 -mr-1 rounded transition-colors hover:bg-stone-100"
          >
            <Heart
              size={15}
              fill={isFavorited ? 'currentColor' : 'none'}
              className={isFavorited ? 'text-tormenta-red' : 'text-stone-300'}
            />
          </button>
        )}
      </div>
    </div>
  )
}

function SpellGrid({ spells, onCardClick, userId, onEdit, favorites, onFavorite }: {
  spells: Spell[]
  onCardClick: (spell: Spell) => void
  userId?: string
  onEdit: (id: string) => void
  favorites: Set<string>
  onFavorite: (id: string) => void
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {spells.map(spell => (
        <SpellCard
          key={spell.id ?? spell.name}
          spell={spell}
          onClick={() => onCardClick(spell)}
          isOwner={!!userId && (spell.createdBy === userId || spell.createdBy == null)}
          onEdit={spell.id ? () => onEdit(spell.id!) : undefined}
          isLoggedIn={!!userId}
          isFavorited={!!spell.id && favorites.has(spell.id)}
          onFavorite={spell.id ? () => onFavorite(spell.id!) : undefined}
        />
      ))}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type RawAmplifier = {
  cost: unknown
  effect: string
  isTrick?: boolean
  requiresCircle?: number
  requiresDevotee?: string
}

interface SpellRow {
  id: string
  name: string
  type: Spell['type']
  circle: number
  school: Spell['school']
  execution: string
  range: string
  duration: string
  target: string
  resistance: string | null
  publication: string | null
  effect: string
  amplifiers: RawAmplifier[] | null
  is_public: boolean
  created_by: string | null
}

function normalizeAmplifier(raw: RawAmplifier): Amplifier {
  if (raw.isTrick || raw.cost === 'Truque') {
    return { cost: 0, effect: raw.effect, isTrick: true, requiresCircle: raw.requiresCircle, requiresDevotee: raw.requiresDevotee }
  }
  const match = String(raw.cost ?? 0).match(/\d+/)
  return { cost: match ? parseInt(match[0], 10) : 0, effect: raw.effect, isTrick: raw.isTrick, requiresCircle: raw.requiresCircle, requiresDevotee: raw.requiresDevotee }
}

function rowToSpell(row: SpellRow): Spell {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    circle: row.circle,
    school: row.school,
    execution: row.execution,
    range: row.range,
    duration: row.duration,
    target: row.target,
    resistance: row.resistance ?? '—',
    publication: row.publication ?? '',
    effect: row.effect,
    amplifiers: (row.amplifiers ?? []).map(normalizeAmplifier),
    isPublic: row.is_public,
    createdBy: row.created_by ?? undefined,
  }
}

function byName(a: Spell, b: Spell) {
  return a.name.localeCompare(b.name, 'pt')
}

export default function SpellsPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [spells, setSpells] = useState<Spell[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS)
  const [sort, setSort] = useState<SortBy>('circle')
  const [modalSpell, setModalSpell] = useState<Spell | null>(null)
  const [favorites, setFavorites] = useState<Set<string>>(new Set())
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    supabase
      .from('spells')
      .select('*')
      .then(({ data, error }) => {
        if (error) {
          setError(error.message)
        } else {
          setSpells((data as SpellRow[]).map(rowToSpell))
        }
        setLoading(false)
      })
  }, [])

  useEffect(() => {
    if (!user) { setFavorites(new Set()); return }
    supabase
      .from('spell_favorites')
      .select('spell_id')
      .eq('user_id', user.id)
      .then(({ data }) => {
        if (data) setFavorites(new Set(data.map((r: { spell_id: string }) => r.spell_id)))
      })
  }, [user])

  const toggleFavorite = useCallback(async (spellId: string) => {
    if (!user) return
    if (favorites.has(spellId)) {
      setFavorites(f => { const n = new Set(f); n.delete(spellId); return n })
      await supabase.from('spell_favorites').delete()
        .eq('user_id', user.id).eq('spell_id', spellId)
    } else {
      setFavorites(f => new Set(f).add(spellId))
      await supabase.from('spell_favorites').insert({ user_id: user.id, spell_id: spellId })
    }
  }, [user, favorites])

  const filtered = useMemo(() => spells.filter(spell => {
    if (filters.search && !normalizeStr(spell.name).includes(normalizeStr(filters.search)))
      return false
    if (filters.onlyFavorites && !(spell.id && favorites.has(spell.id)))
      return false
    if (filters.types.size > 0) {
      const showUniversal = filters.types.has('Arcana') || filters.types.has('Divina')
      if (spell.type === 'Universal') {
        if (!showUniversal && !filters.types.has('Universal')) return false
      } else {
        if (!filters.types.has(spell.type)) return false
      }
    }
    if (filters.schools.size > 0 && !filters.schools.has(spell.school)) return false
    if (filters.circles.size > 0 && !filters.circles.has(spell.circle)) return false
    return true
  }), [spells, filters, favorites])

  const byCircle = useMemo(() => {
    const map = new Map<number, Spell[]>()
    for (const spell of filtered) {
      const arr = map.get(spell.circle) ?? []
      arr.push(spell)
      map.set(spell.circle, arr)
    }
    return map
  }, [filtered])

  const activeCount =
    filters.types.size + filters.schools.size + filters.circles.size +
    (filters.search ? 1 : 0) + (filters.onlyFavorites ? 1 : 0)

  const gridProps = {
    onCardClick: (spell: Spell) => setModalSpell(spell),
    userId: user?.id,
    onEdit: (id: string) => navigate(`/magias/editar/${id}`),
    favorites,
    onFavorite: toggleFavorite,
  }

  function renderContent() {
    if (filtered.length === 0) {
      return (
        <div className="text-center py-20 text-stone-400">
          <p className="text-base mb-1">Nenhuma magia encontrada</p>
          <p className="text-sm">Ajuste os filtros para ver resultados</p>
        </div>
      )
    }

    if (sort === 'alpha') {
      return <SpellGrid spells={[...filtered].sort(byName)} {...gridProps} />
    }

    if (sort === 'type') {
      return (
        <>
          {SPELL_TYPES.map(type => {
            const group = filtered.filter(s => s.type === type).sort(byName)
            if (!group.length) return null
            return (
              <section key={type} className="mb-8">
                <SectionHeader title={type} />
                <SpellGrid spells={group} {...gridProps} />
              </section>
            )
          })}
        </>
      )
    }

    if (sort === 'execution') {
      const execs = [...new Set(filtered.map(s => s.execution))].sort()
      return (
        <>
          {execs.map(exec => {
            const group = filtered.filter(s => s.execution === exec).sort(byName)
            return (
              <section key={exec} className="mb-8">
                <SectionHeader title={exec} />
                <SpellGrid spells={group} {...gridProps} />
              </section>
            )
          })}
        </>
      )
    }

    // circle (default)
    return (
      <>
        {CIRCLES.map(circle => {
          const group = byCircle.get(circle)
          if (!group?.length) return null
          return (
            <section key={circle} className="mb-8">
              <SectionHeader title={CIRCLE_LABEL[circle - 1]} />
              <SpellGrid spells={[...group].sort(byName)} {...gridProps} />
            </section>
          )
        })}
      </>
    )
  }

  return (
    <div className="flex min-h-[calc(100vh-48px)]">
      {/* ── Sidebar ── */}
      <>
        {/* Botão flutuante para abrir filtros no mobile */}
        <button
          className="md:hidden fixed bottom-4 right-4 z-40 flex items-center gap-2 px-4 py-2.5 rounded-full text-white text-sm font-medium shadow-lg"
          style={{ background: 'linear-gradient(135deg, #8B1A1A 0%, #6B1414 100%)', border: '1px solid rgba(201,168,76,0.3)' }}
          onClick={() => setSidebarOpen(true)}
        >
          <Search size={15} />
          Filtros {activeCount > 0 && `(${activeCount})`}
        </button>

        {/* Overlay mobile */}
        {sidebarOpen && (
          <div
            className="md:hidden fixed inset-0 z-40 bg-black/50"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar — drawer no mobile, fixo no desktop */}
        <aside className={`
          fixed md:static inset-y-0 left-0 z-50 md:z-auto
          w-72 md:w-56 shrink-0
          border-r border-stone-200 bg-white p-4 overflow-y-auto
          transition-transform duration-300 md:transform-none
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}>
          {/* Botão fechar no mobile */}
          <div className="flex items-center justify-between mb-4 md:hidden">
            <span className="font-display text-sm font-semibold text-tormenta-red">Filtros</span>
            <button onClick={() => setSidebarOpen(false)} className="text-stone-400 hover:text-stone-600">
              <X size={18} />
            </button>
          </div>

          <div className="relative mb-4">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              placeholder="Buscar magia..."
              value={filters.search}
              onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
              className="w-full pl-8 pr-3 py-1.5 text-sm border border-stone-200 rounded-lg bg-stone-50 focus:outline-none focus:ring-1 focus:ring-tormenta-red focus:border-tormenta-red"
            />
          </div>

          {activeCount > 0 && (
            <button
              onClick={() => setFilters(EMPTY_FILTERS)}
              className="flex items-center gap-1 text-xs text-tormenta-red hover:text-tormenta-red-dark mb-4 transition-colors"
            >
              <X size={11} />
              Limpar filtros ({activeCount})
            </button>
          )}

          <FilterSection
            title="Tipo"
            tooltip="Magias Universais podem ser usadas tanto por conjuradores divinos quanto arcanos e aparecem nos dois filtros"
          >
            {SPELL_TYPES.map(t => (
              <CheckboxItem
                key={t} label={t} checked={filters.types.has(t)}
                onChange={() => setFilters(f => ({ ...f, types: toggleSet(f.types, t) }))}
              />
            ))}
          </FilterSection>

          <FilterSection title="Escola">
            {SPELL_SCHOOLS.map(s => (
              <CheckboxItem
                key={s} label={s} checked={filters.schools.has(s)}
                onChange={() => setFilters(f => ({ ...f, schools: toggleSet(f.schools, s) }))}
              />
            ))}
          </FilterSection>

          <FilterSection title="Círculo">
            {CIRCLES.map(c => (
              <CheckboxItem
                key={c} label={CIRCLE_LABEL[c - 1]} checked={filters.circles.has(c)}
                onChange={() => setFilters(f => ({ ...f, circles: toggleSet(f.circles, c) }))}
              />
            ))}
          </FilterSection>

          {user && (
            <FilterSection title="Favoritos">
              <CheckboxItem
                label="Mostrar apenas favoritas"
                checked={filters.onlyFavorites}
                onChange={() => setFilters(f => ({ ...f, onlyFavorites: !f.onlyFavorites }))}
              />
            </FilterSection>
          )}
        </aside>
      </>

      {/* ── Main area ── */}
      <main className="flex-1 p-6 overflow-y-auto min-w-0 pb-20 md:pb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <img src="/icone-magias.png" alt="" className="w-12 h-12 object-contain" />
            <h1 className="font-display text-2xl font-semibold text-tormenta-red">Magias</h1>
          </div>
          <div className="flex items-center gap-4">
            {!loading && !error && (
              <span className="text-sm text-stone-400">
                {filtered.length} magia{filtered.length !== 1 ? 's' : ''}
              </span>
            )}
            <Link to="/magias/criar" className="btn-primary flex items-center gap-1.5">
              <Plus size={14} />
              Nova magia
            </Link>
          </div>
        </div>

        {/* ── Sort bar ── */}
        {!loading && !error && (
          <div className="flex items-center gap-1.5 mb-5">
            <span className="text-xs text-stone-400 mr-0.5">Ordenar:</span>
            {SORT_ORDER.map(s => (
              <button
                key={s}
                onClick={() => setSort(s)}
                className={`px-3 py-1 text-xs rounded-full transition-colors ${
                  sort === s
                    ? 'bg-tormenta-red text-white'
                    : 'bg-stone-100 text-stone-500 hover:bg-stone-200'
                }`}
              >
                {SORT_LABELS[s]}
              </button>
            ))}
          </div>
        )}

        {loading ? (
          <div className="text-center py-20 text-stone-400">
            <p className="text-base">Carregando magias…</p>
          </div>
        ) : error ? (
          <div className="text-center py-20 text-red-500">
            <p className="text-base mb-1">Erro ao carregar magias</p>
            <p className="text-sm text-stone-400">{error}</p>
          </div>
        ) : (
          renderContent()
        )}
      </main>

      {/* ── Spell modal ── */}
      {modalSpell && (
        <SpellModal
          spell={modalSpell}
          onClose={() => setModalSpell(null)}
          onEdit={
            user && modalSpell.id && (modalSpell.createdBy === user.id || !modalSpell.createdBy)
              ? () => { setModalSpell(null); navigate(`/magias/editar/${modalSpell.id}`) }
              : undefined
          }
        />
      )}
    </div>
  )
}
