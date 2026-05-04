import { useState, useEffect, useMemo } from 'react'
import { Search, BookOpen, Shield, Users, Star, ChevronDown, Zap, Settings } from 'lucide-react'
import { supabase } from '../lib/supabase'
import MechanicsSection from '../components/compendium/MechanicsSection'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ClassRow {
  id: string
  name: string
  publication: string
  hit_points: string
  hp_per_level?: number
  mana_points: string
  skills: string[]
  proficiencies: string[]
}

interface AbilityRow {
  id: string
  class_name: string
  name: string
  level: number
  description: string
  is_power: boolean
  prerequisites: { other?: string } | null
}

interface RaceAttribute {
  attr: string
  mod: number
}

interface RaceAbility {
  name: string
  description: string
  sort_order: number
}

interface Race {
  id: string
  name: string
  size: string
  displacement: number
  publication: string
  race_attributes: RaceAttribute[]
  race_abilities: RaceAbility[]
}

type Section = 'classes' | 'racas' | 'origens' | 'poderes' | 'mecanicas'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normalizeStr(s: string) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

function parseHP(hitPoints: string): number {
  const match = hitPoints.match(/^(\d+)/)
  return match ? parseInt(match[1]) : 0
}

const ATTR_LABELS: Record<string, string> = {
  for: 'FOR', des: 'DES', con: 'CON',
  int: 'INT', sab: 'SAB', car: 'CAR',
  any: 'À escolha',
}

function formatMod(mod: number): string {
  return mod >= 0 ? `+${mod}` : `${mod}`
}

// ─── Sub-components (Classes) ─────────────────────────────────────────────────

function SectionNav({ active, onChange }: { active: Section; onChange: (s: Section) => void }) {
  const items: { id: Section; label: string; icon: React.ElementType }[] = [
    { id: 'classes',   label: 'Classes',   icon: Shield   },
    { id: 'racas',     label: 'Raças',     icon: Users    },
    { id: 'origens',   label: 'Origens',   icon: BookOpen },
    { id: 'poderes',   label: 'Poderes',   icon: Star     },
    { id: 'mecanicas', label: 'Mecânicas', icon: Settings },
  ]
  return (
    <nav className="space-y-0.5">
      {items.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          onClick={() => onChange(id)}
          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
            active === id
              ? 'bg-tormenta-red/10 text-tormenta-red'
              : 'text-stone-500 hover:bg-stone-100 hover:text-stone-700'
          }`}
        >
          <Icon size={15} />
          {label}
        </button>
      ))}
    </nav>
  )
}

function AbilityCard({ ability }: { ability: AbilityRow }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border border-stone-100 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left hover:bg-stone-50 transition-colors"
      >
        <span className="text-[9px] font-bold uppercase tracking-wider text-stone-300 bg-stone-100 rounded px-1.5 py-0.5 shrink-0 whitespace-nowrap">
          Nv {ability.level}
        </span>
        <span className="flex-1 text-sm font-medium text-stone-800 min-w-0">{ability.name}</span>
        <ChevronDown
          size={13}
          className={`text-stone-300 shrink-0 transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <div className="px-3 pb-3 pt-1.5 border-t border-stone-50 bg-stone-50/50">
          <p className="text-xs text-stone-600 leading-relaxed whitespace-pre-line">{ability.description}</p>
        </div>
      )}
    </div>
  )
}

function PowerCard({ power }: { power: AbilityRow }) {
  const [open, setOpen] = useState(false)
  const prereq = power.prerequisites?.other ?? null
  return (
    <div className="border border-stone-100 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left hover:bg-amber-50/50 transition-colors"
      >
        <Zap size={11} className="text-amber-400 shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-stone-800">{power.name}</p>
          {prereq && (
            <p className="text-[10px] text-stone-400 truncate mt-0.5">Pré-req: {prereq}</p>
          )}
        </div>
        <ChevronDown
          size={13}
          className={`text-stone-300 shrink-0 transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <div className="px-3 pb-3 pt-1.5 border-t border-stone-50 bg-amber-50/20">
          {prereq && (
            <p className="text-[10px] font-semibold text-amber-700 mb-1.5">
              Pré-requisito: {prereq}
            </p>
          )}
          <p className="text-xs text-stone-600 leading-relaxed whitespace-pre-line">{power.description}</p>
        </div>
      )}
    </div>
  )
}

function ClassListItem({
  cls, isSelected, onClick,
}: {
  cls: ClassRow; isSelected: boolean; onClick: () => void
}) {
  const skillCount = Array.isArray(cls.skills) ? cls.skills.length : 0
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-3 py-2.5 rounded-lg border transition-all ${
        isSelected
          ? 'bg-tormenta-red/10 border-tormenta-red/30'
          : 'border-stone-100 hover:border-stone-200 hover:bg-stone-50'
      }`}
    >
      <p className={`font-display font-semibold text-sm ${isSelected ? 'text-tormenta-red' : 'text-stone-800'}`}>
        {cls.name}
      </p>
      <div className="flex items-center gap-2 mt-0.5 text-[10px] text-stone-400">
        <span className="text-tormenta-red">PV Inicial: {parseHP(cls.hit_points)} + CON</span>
        <span>·</span>
        <span style={{ color: '#1E3A5F' }}>{cls.mana_points} PM</span>
        {skillCount > 0 && (
          <>
            <span>·</span>
            <span>{skillCount} perícias</span>
          </>
        )}
      </div>
    </button>
  )
}

function ClassDetail({
  cls, abilities, powers, loading,
}: {
  cls: ClassRow; abilities: AbilityRow[]; powers: AbilityRow[]; loading: boolean
}) {
  const [abilitySearch, setAbilitySearch] = useState('')

  useEffect(() => {
    setAbilitySearch('')
  }, [cls.id])

  const allAbilities = useMemo(
    () => [...abilities, ...powers].sort((a, b) => a.level - b.level),
    [abilities, powers]
  )

  const filtered = useMemo(() => {
    if (!abilitySearch) return allAbilities
    const q = normalizeStr(abilitySearch)
    return allAbilities.filter(
      a => normalizeStr(a.name).includes(q) || normalizeStr(a.description).includes(q)
    )
  }, [allAbilities, abilitySearch])

  if (loading) {
    return (
      <div className="card flex items-center justify-center py-20">
        <p className="text-stone-400 text-sm">Carregando…</p>
      </div>
    )
  }

  return (
    <div className="card">
      <div className="pb-4 mb-4 border-b border-stone-100">
        <h2 className="font-display text-2xl font-semibold text-tormenta-red">{cls.name}</h2>
        <p className="text-xs text-stone-400 mb-4">{cls.publication}</p>
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="bg-stone-50 rounded-xl p-2.5 text-center">
            <p className="text-[9px] font-semibold uppercase tracking-wider text-stone-400 mb-0.5">PV Inicial</p>
            <p className="text-base font-bold text-tormenta-red">{parseHP(cls.hit_points)} + CON</p>
            <p className="text-[9px] text-stone-400 mt-0.5">Nível 1</p>
          </div>
          <div className="bg-stone-50 rounded-xl p-2.5 text-center">
            <p className="text-[9px] font-semibold uppercase tracking-wider text-stone-400 mb-0.5">PV por Nível</p>
            <p className="text-base font-bold text-tormenta-red">{cls.hp_per_level ?? 0} + CON</p>
            <p className="text-[9px] text-stone-400 mt-0.5">Níveis 2+</p>
          </div>
          <div className="bg-stone-50 rounded-xl p-2.5 text-center">
            <p className="text-[9px] font-semibold uppercase tracking-wider text-stone-400 mb-0.5">Mana</p>
            <p className="text-base font-bold" style={{ color: '#1E3A5F' }}>{cls.mana_points}</p>
            <p className="text-[9px] text-stone-400 mt-0.5">por nível</p>
          </div>
        </div>

        {Array.isArray(cls.proficiencies) && cls.proficiencies.length > 0 && (
          <div className="mb-3">
            <p className="text-[9px] font-semibold uppercase tracking-wider text-stone-400 mb-1.5">Proficiências</p>
            <div className="flex flex-wrap gap-1">
              {cls.proficiencies.map(p => (
                <span key={p} className="text-[10px] bg-stone-100 text-stone-600 px-2 py-0.5 rounded-full">{p}</span>
              ))}
            </div>
          </div>
        )}

        {Array.isArray(cls.skills) && cls.skills.length > 0 && (
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-wider text-stone-400 mb-1.5">
              Perícias Obrigatórias
            </p>
            <div className="flex flex-wrap gap-1">
              {cls.skills.map(s => (
                <span key={s} className="text-[10px] bg-tormenta-red/5 text-tormenta-red border border-tormenta-red/20 px-2 py-0.5 rounded-full">{s}</span>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="relative mb-3">
        <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400" />
        <input
          value={abilitySearch}
          onChange={e => setAbilitySearch(e.target.value)}
          placeholder="Buscar habilidade ou poder..."
          className="w-full pl-7 pr-3 py-1.5 text-sm border border-stone-200 rounded-lg bg-stone-50 focus:outline-none focus:ring-1 focus:ring-tormenta-red"
        />
      </div>
      <div className="space-y-1.5">
        {filtered.length === 0
          ? <p className="text-sm text-stone-400 text-center py-8">Nenhum resultado encontrado</p>
          : filtered.map(a => a.is_power
              ? <PowerCard key={a.id} power={a} />
              : <AbilityCard key={a.id} ability={a} />
            )
        }
      </div>
    </div>
  )
}

function ClassesSection() {
  const [classes, setClasses] = useState<ClassRow[]>([])
  const [selected, setSelected] = useState<ClassRow | null>(null)
  const [abilities, setAbilities] = useState<AbilityRow[]>([])
  const [powers, setPowers] = useState<AbilityRow[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [abilitiesLoading, setAbilitiesLoading] = useState(false)
  const [classSearch, setClassSearch] = useState('')

  const filteredClasses = useMemo(() => {
    if (!classSearch) return classes
    const q = normalizeStr(classSearch)
    return classes.filter(c => normalizeStr(c.name).includes(q))
  }, [classes, classSearch])

  useEffect(() => {
    supabase.from('classes').select('*').order('name').then(({ data, error }) => {
      console.log('[CompendiumPage] classes fetch →', { count: data?.length, error })
      if (error) {
        setFetchError(error.message)
      } else {
        const rows = (data ?? []) as ClassRow[]
        rows.forEach(cls => console.log('hit_points valor:', cls.name, '->', cls.hit_points))
        setClasses(rows)
      }
      setLoading(false)
    })
  }, [])

  async function selectClass(cls: ClassRow) {
    setSelected(cls)
    setAbilitiesLoading(true)
    const { data, error } = await supabase
      .from('class_abilities')
      .select('*')
      .eq('class_name', cls.name)
      .order('level')
      .order('name')
    console.log('[CompendiumPage] class_abilities fetch →', { class: cls.name, count: data?.length, error })
    const rows = (data ?? []) as AbilityRow[]
    setAbilities(rows.filter(r => !r.is_power))
    setPowers(rows.filter(r => r.is_power))
    setAbilitiesLoading(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-stone-400 text-sm">Carregando classes…</p>
      </div>
    )
  }

  if (fetchError) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <BookOpen size={32} className="text-stone-200 mb-3" />
        <p className="text-stone-500 font-medium mb-1">Erro ao carregar classes</p>
        <p className="text-xs text-red-400 font-mono bg-red-50 rounded px-3 py-2 max-w-md mt-1">{fetchError}</p>
      </div>
    )
  }

  if (classes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <BookOpen size={32} className="text-stone-200 mb-3" />
        <p className="text-stone-500 font-medium mb-1">Nenhuma classe encontrada</p>
        <p className="text-xs text-stone-400 mb-3">
          A query retornou 0 registros — verifique no console do browser (F12).
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5 md:flex-row md:items-start">
      <div className="w-full md:w-64 shrink-0">
        <div className="mb-3">
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              value={classSearch}
              onChange={e => setClassSearch(e.target.value)}
              placeholder="Buscar classe..."
              className="w-full pl-7 pr-3 py-1.5 text-sm border border-stone-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-tormenta-red"
            />
          </div>
          <p className="text-[10px] text-stone-400 mt-1.5 px-0.5">
            {filteredClasses.length} {filteredClasses.length === 1 ? 'classe' : 'classes'}
          </p>
        </div>
        <div className="space-y-1">
          {filteredClasses.map(cls => (
            <ClassListItem
              key={cls.id}
              cls={cls}
              isSelected={selected?.id === cls.id}
              onClick={() => selectClass(cls)}
            />
          ))}
          {filteredClasses.length === 0 && (
            <p className="text-sm text-stone-400 text-center py-6">Nenhuma classe encontrada</p>
          )}
        </div>
      </div>

      <div className="flex-1 min-w-0">
        {selected ? (
          <ClassDetail
            cls={selected}
            abilities={abilities}
            powers={powers}
            loading={abilitiesLoading}
          />
        ) : (
          <div className="card flex flex-col items-center justify-center py-20 text-center">
            <Shield size={32} className="text-stone-200 mb-3" />
            <p className="text-stone-500 text-sm font-medium mb-1">Selecione uma classe</p>
            <p className="text-xs text-stone-400">Clique em uma classe à esquerda para ver seus detalhes</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Sub-components (Raças) ───────────────────────────────────────────────────

function AttrBadge({ attr, mod }: RaceAttribute) {
  const isAny = attr === 'any'
  const label = ATTR_LABELS[attr] ?? attr.toUpperCase()
  const positive = mod >= 0
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold border ${
        isAny
          ? 'border-amber-400 bg-amber-50 text-amber-700'
          : positive
          ? 'border-green-600 bg-green-50 text-green-700'
          : 'border-red-400 bg-red-50 text-red-700'
      }`}
    >
      <span className="opacity-70">{label}</span>
      <span>{formatMod(mod)}</span>
    </span>
  )
}

function SizeBadge({ size }: { size: string }) {
  const colors: Record<string, string> = {
    Pequeno: 'bg-sky-50 border-sky-400 text-sky-700',
    Médio:   'bg-stone-100 border-stone-400 text-stone-600',
    Grande:  'bg-orange-50 border-orange-400 text-orange-700',
  }
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${
        colors[size] ?? 'bg-stone-100 border-stone-300 text-stone-500'
      }`}
    >
      {size}
    </span>
  )
}

function RaceCard({ race, onClick }: { race: Race; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-white border border-stone-200 rounded-xl p-4 hover:border-tormenta-red hover:shadow-md transition-all duration-150 cursor-pointer group"
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <h3 className="font-display font-semibold text-stone-800 group-hover:text-tormenta-red transition-colors leading-tight">
          {race.name}
        </h3>
        <SizeBadge size={race.size} />
      </div>

      <div className="text-xs text-stone-500 mb-3">
        🏃 Deslocamento: <span className="font-medium text-stone-700">{race.displacement}m</span>
      </div>

      {race.race_attributes.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {race.race_attributes.map((a, i) => (
            <AttrBadge key={i} {...a} />
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-1.5">
        {race.race_abilities
          .slice()
          .sort((a, b) => a.sort_order - b.sort_order)
          .map(ab => (
            <span
              key={ab.name}
              className="text-xs bg-stone-100 text-stone-600 px-2 py-0.5 rounded-full border border-stone-200"
            >
              {ab.name}
            </span>
          ))}
      </div>
    </button>
  )
}

function RaceModal({ race, onClose }: { race: Race; onClose: () => void }) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const abilities = race.race_abilities
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.55)' }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full max-h-[85vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-stone-200 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <div>
            <h2 className="font-display text-2xl font-bold text-tormenta-red">{race.name}</h2>
            <div className="flex items-center gap-2 mt-1">
              <SizeBadge size={race.size} />
              <span className="text-xs text-stone-400">🏃 {race.displacement}m deslocamento</span>
              {race.publication && race.publication !== 'Tormenta20' && (
                <span className="text-xs text-stone-400 italic">{race.publication}</span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-stone-400 hover:bg-stone-100 hover:text-stone-700 transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {race.race_attributes.length > 0 && (
            <section>
              <h3 className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-2">
                Modificadores de Atributo
              </h3>
              <div className="flex flex-wrap gap-2">
                {race.race_attributes.map((a, i) => (
                  <AttrBadge key={i} {...a} />
                ))}
              </div>
            </section>
          )}

          {abilities.length > 0 && (
            <section>
              <h3 className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-3">
                Habilidades Raciais
              </h3>
              <div className="space-y-3">
                {abilities.map(ab => (
                  <div key={ab.name} className="bg-stone-50 border border-stone-200 rounded-lg p-3">
                    <div className="font-semibold text-stone-800 text-sm mb-1">{ab.name}</div>
                    <div className="text-stone-600 text-sm leading-relaxed">{ab.description}</div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  )
}

function RacesSection() {
  const [races, setRaces] = useState<Race[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [filterSize, setFilterSize] = useState('')
  const [filterAttr, setFilterAttr] = useState('')
  const [selectedRace, setSelectedRace] = useState<Race | null>(null)

  useEffect(() => {
    supabase
      .from('races')
      .select(`
        id, name, size, displacement, publication,
        race_attributes ( attr, mod ),
        race_abilities ( name, description, sort_order )
      `)
      .order('name')
      .then(({ data, error }) => {
        if (error) {
          setError('Erro ao carregar raças. Tente novamente.')
          console.error(error)
        } else {
          setRaces((data as Race[]) ?? [])
        }
        setLoading(false)
      })
  }, [])

  const attrOptions = useMemo(() => {
    const attrs = new Set<string>()
    races.forEach(r => r.race_attributes.forEach(a => {
      if (a.attr !== 'any') attrs.add(a.attr)
    }))
    return Array.from(attrs).sort()
  }, [races])

  const filtered = useMemo(() => {
    let result = races
    if (search.trim()) {
      const q = normalizeStr(search.trim())
      result = result.filter(r =>
        normalizeStr(r.name).includes(q) ||
        r.race_abilities.some(ab =>
          normalizeStr(ab.name).includes(q) || normalizeStr(ab.description).includes(q)
        )
      )
    }
    if (filterSize) result = result.filter(r => r.size === filterSize)
    if (filterAttr) result = result.filter(r =>
      r.race_attributes.some(a => a.attr === filterAttr && a.mod > 0)
    )
    return result
  }, [races, search, filterSize, filterAttr])

  const hasFilters = search || filterSize || filterAttr

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-stone-400 text-sm">Carregando raças…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Users size={32} className="text-stone-200 mb-3" />
        <p className="text-stone-500 font-medium mb-1">Erro ao carregar raças</p>
        <p className="text-xs text-red-400 font-mono bg-red-50 rounded px-3 py-2 max-w-md mt-1">{error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            placeholder="Buscar raça, habilidade..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-7 pr-3 py-1.5 text-sm border border-stone-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-tormenta-red"
          />
        </div>

        <select
          value={filterSize}
          onChange={e => setFilterSize(e.target.value)}
          className="border border-stone-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-tormenta-red bg-white cursor-pointer"
        >
          <option value="">Todos os tamanhos</option>
          <option value="Pequeno">Pequeno</option>
          <option value="Médio">Médio</option>
          <option value="Grande">Grande</option>
        </select>

        <select
          value={filterAttr}
          onChange={e => setFilterAttr(e.target.value)}
          className="border border-stone-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-tormenta-red bg-white cursor-pointer"
        >
          <option value="">Todos os atributos</option>
          {attrOptions.map(a => (
            <option key={a} value={a}>{ATTR_LABELS[a] ?? a.toUpperCase()}</option>
          ))}
        </select>

        {hasFilters && (
          <button
            onClick={() => { setSearch(''); setFilterSize(''); setFilterAttr('') }}
            className="px-3 py-1.5 text-sm text-stone-500 hover:text-tormenta-red border border-stone-200 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
          >
            ✕ Limpar
          </button>
        )}
      </div>

      {/* Contador */}
      <p className="text-[10px] text-stone-400">
        {filtered.length === races.length
          ? `${races.length} raças`
          : `${filtered.length} de ${races.length} raças`}
      </p>

      {/* Grid */}
      {filtered.length === 0 ? (
        <p className="text-center py-10 text-stone-400 text-sm">Nenhuma raça encontrada.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map(race => (
            <RaceCard key={race.id} race={race} onClick={() => setSelectedRace(race)} />
          ))}
        </div>
      )}

      {/* Modal */}
      {selectedRace && (
        <RaceModal race={selectedRace} onClose={() => setSelectedRace(null)} />
      )}
    </div>
  )
}

// ─── Placeholder ──────────────────────────────────────────────────────────────

function ComingSoon({ section }: { section: Section }) {
  const labels: Record<Section, string> = {
    classes:   'Classes',
    racas:     'Raças',
    origens:   'Origens',
    poderes:   'Poderes',
    mecanicas: 'Mecânicas',
  }
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-16 h-16 bg-stone-100 rounded-2xl flex items-center justify-center mb-4">
        <BookOpen size={24} className="text-stone-300" />
      </div>
      <h3 className="font-display text-xl font-semibold text-stone-800 mb-2">{labels[section]}</h3>
      <p className="text-stone-400 text-sm">Esta seção está em desenvolvimento.</p>
    </div>
  )
}

// ─── CompendiumPage ───────────────────────────────────────────────────────────

export default function CompendiumPage() {
  const [section, setSection] = useState<Section>('classes')

  return (
    <div className="max-w-6xl mx-auto px-6 py-6">
      <div className="mb-6">
        <h1 className="font-display text-3xl font-semibold text-tormenta-red">Compêndio</h1>
        <p className="text-stone-400 text-sm mt-0.5">Referência completa de Tormenta20</p>
      </div>

      <div className="flex flex-col gap-4 md:flex-row md:items-start">
        <aside className="w-full md:w-44 shrink-0">
          <div className="card py-3 px-2 sticky top-6">
            <p className="text-[9px] font-bold uppercase tracking-widest text-stone-300 px-2 mb-2">Seções</p>
            <SectionNav active={section} onChange={s => setSection(s)} />
          </div>
        </aside>

        <main className="flex-1 min-w-0">
          {section === 'classes'   && <ClassesSection />}
          {section === 'racas'     && <RacesSection />}
          {section === 'origens'   && <ComingSoon section={section} />}
          {section === 'poderes'   && <ComingSoon section={section} />}
          {section === 'mecanicas' && <MechanicsSection />}
        </main>
      </div>
    </div>
  )
}
