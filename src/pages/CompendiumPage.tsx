import { useState, useEffect, useMemo } from 'react'
import { Search, BookOpen, Shield, Users, Star, ChevronDown, Zap } from 'lucide-react'
import { supabase } from '../lib/supabase'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ClassRow {
  id: string
  name: string
  publication: string
  hit_points: string
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

type Section = 'classes' | 'racas' | 'origens' | 'poderes'
type DetailTab = 'habilidades' | 'poderes'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normalizeStr(s: string) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionNav({ active, onChange }: { active: Section; onChange: (s: Section) => void }) {
  const items: { id: Section; label: string; icon: React.ElementType }[] = [
    { id: 'classes',  label: 'Classes',  icon: Shield   },
    { id: 'racas',    label: 'Raças',    icon: Users    },
    { id: 'origens',  label: 'Origens',  icon: BookOpen },
    { id: 'poderes',  label: 'Poderes',  icon: Star     },
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
  cls,
  isSelected,
  onClick,
}: {
  cls: ClassRow
  isSelected: boolean
  onClick: () => void
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
        <span>{cls.hit_points} PV</span>
        <span>·</span>
        <span className="text-blue-500">{cls.mana_points} PM</span>
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
  cls,
  abilities,
  powers,
  loading,
}: {
  cls: ClassRow
  abilities: AbilityRow[]
  powers: AbilityRow[]
  loading: boolean
}) {
  const [activeTab, setActiveTab] = useState<DetailTab>('habilidades')
  const [powerSearch, setPowerSearch] = useState('')

  useEffect(() => {
    setActiveTab('habilidades')
    setPowerSearch('')
  }, [cls.id])

  const filteredPowers = useMemo(() => {
    if (!powerSearch) return powers
    const q = normalizeStr(powerSearch)
    return powers.filter(
      p => normalizeStr(p.name).includes(q) || normalizeStr(p.description).includes(q)
    )
  }, [powers, powerSearch])

  if (loading) {
    return (
      <div className="card flex items-center justify-center py-20">
        <p className="text-stone-400 text-sm">Carregando…</p>
      </div>
    )
  }

  return (
    <div className="card">
      {/* Header */}
      <div className="pb-4 mb-4 border-b border-stone-100">
        <h2 className="font-display text-2xl font-semibold text-tormenta-red">{cls.name}</h2>
        <p className="text-xs text-stone-400 mb-4">{cls.publication}</p>

        <div className="grid grid-cols-2 gap-2 mb-4">
          <div className="bg-stone-50 rounded-xl p-2.5 text-center">
            <p className="text-[9px] font-semibold uppercase tracking-wider text-stone-400 mb-0.5">PV por nível</p>
            <p className="text-xl font-bold text-stone-800">{cls.hit_points}</p>
          </div>
          <div className="bg-stone-50 rounded-xl p-2.5 text-center">
            <p className="text-[9px] font-semibold uppercase tracking-wider text-stone-400 mb-0.5">PM por nível</p>
            <p className="text-xl font-bold text-blue-600">{cls.mana_points}</p>
          </div>
        </div>

        <div className="space-y-1.5 text-xs">
          {Array.isArray(cls.proficiencies) && cls.proficiencies.length > 0 && (
            <div>
              <span className="text-[9px] font-semibold uppercase tracking-wider text-stone-400">Proficiências · </span>
              <span className="text-stone-600">{cls.proficiencies.join(', ')}</span>
            </div>
          )}
          {Array.isArray(cls.skills) && cls.skills.length > 0 && (
            <div>
              <span className="text-[9px] font-semibold uppercase tracking-wider text-stone-400">Perícias de classe · </span>
              <span className="text-stone-600">{cls.skills.join(', ')}</span>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-0 mb-4 border-b border-stone-100">
        {(['habilidades', 'poderes'] as DetailTab[]).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === tab
                ? 'border-tormenta-red text-tormenta-red'
                : 'border-transparent text-stone-400 hover:text-stone-600'
            }`}
          >
            {tab === 'habilidades' ? 'Habilidades de Classe' : 'Poderes'}
            <span className="ml-1.5 text-[10px] text-stone-400">
              ({tab === 'habilidades' ? abilities.length : powers.length})
            </span>
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'habilidades' ? (
        <div className="space-y-1.5">
          {abilities.length === 0 ? (
            <p className="text-sm text-stone-400 text-center py-8">Nenhuma habilidade cadastrada</p>
          ) : (
            abilities.map(a => <AbilityCard key={a.id} ability={a} />)
          )}
        </div>
      ) : (
        <div>
          {powers.length > 0 && (
            <div className="relative mb-3">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                value={powerSearch}
                onChange={e => setPowerSearch(e.target.value)}
                placeholder="Buscar poder..."
                className="w-full pl-7 pr-3 py-1.5 text-sm border border-stone-200 rounded-lg bg-stone-50 focus:outline-none focus:ring-1 focus:ring-tormenta-red"
              />
            </div>
          )}
          <div className="space-y-1.5">
            {filteredPowers.length === 0 ? (
              <p className="text-sm text-stone-400 text-center py-8">
                {powerSearch ? 'Nenhum poder encontrado' : 'Nenhum poder cadastrado'}
              </p>
            ) : (
              filteredPowers.map(p => <PowerCard key={p.id} power={p} />)
            )}
          </div>
        </div>
      )}
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
        setClasses((data ?? []) as ClassRow[])
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
        <p className="text-xs text-stone-400 mt-3">
          Verifique se a tabela <code className="bg-stone-100 px-1 rounded">classes</code> existe e tem RLS com policy de leitura pública.
        </p>
      </div>
    )
  }

  if (classes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <BookOpen size={32} className="text-stone-200 mb-3" />
        <p className="text-stone-500 font-medium mb-1">Nenhuma classe encontrada</p>
        <p className="text-xs text-stone-400 mb-3">
          A query retornou 0 registros — verifique no console do browser (F12) o log <code className="bg-stone-100 px-1 rounded">[CompendiumPage]</code>.
        </p>
        <div className="text-left bg-stone-50 border border-stone-200 rounded-lg p-3 max-w-md text-xs text-stone-500 space-y-1">
          <p className="font-semibold text-stone-700 mb-1">Causas comuns:</p>
          <p>1. RLS sem policy pública — execute no Supabase:</p>
          <code className="block bg-white border border-stone-200 rounded px-2 py-1 font-mono text-[10px] text-stone-600">
            CREATE POLICY public_read ON classes FOR SELECT USING (true);
          </code>
          <p className="pt-1">2. Dados não importados — execute <code className="bg-stone-100 px-1 rounded">node src/lib/import_classes.js</code> e aplique o <code className="bg-stone-100 px-1 rounded">classes_import.sql</code>.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex gap-5 items-start">
      {/* Left: class list */}
      <div className="w-64 shrink-0">
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

      {/* Right: detail panel */}
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

function ComingSoon({ section }: { section: Section }) {
  const labels: Record<Section, string> = {
    classes: 'Classes',
    racas: 'Raças',
    origens: 'Origens',
    poderes: 'Poderes',
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

      <div className="flex gap-6 items-start">
        <aside className="w-44 shrink-0">
          <div className="card py-3 px-2 sticky top-6">
            <p className="text-[9px] font-bold uppercase tracking-widest text-stone-300 px-2 mb-2">Seções</p>
            <SectionNav active={section} onChange={s => setSection(s)} />
          </div>
        </aside>

        <main className="flex-1 min-w-0">
          {section === 'classes' ? (
            <ClassesSection />
          ) : (
            <ComingSoon section={section} />
          )}
        </main>
      </div>
    </div>
  )
}
