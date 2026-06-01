import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Trash2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

interface CharSummary {
  id: string
  name: string
  race: string
  classes: { name: string; level: number }[]
  hp: { current: number; max: number }
  mp: { current: number; max: number }
}

function totalLevel(classes: { name: string; level: number }[]) {
  return classes?.reduce((s, c) => s + (c.level ?? 0), 0) ?? 0
}

export default function CharactersListPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [characters, setCharacters] = useState<CharSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    if (!user) return
    supabase
      .from('characters')
      .select('id, name, race, classes, hp, mp')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (data) setCharacters(data as CharSummary[])
        setLoading(false)
      })
  }, [user])

  async function createCharacter() {
    if (!user) return
    setCreating(true)
    const { data, error } = await supabase
      .from('characters')
      .insert({
        name: 'Novo Personagem',
        player: '',
        race: '',
        origin: '',
        classes: [{ name: '', level: 1 }],
        deity: 'Nenhuma',
        size: 'Médio',
        movement: 9,
        xp: 0,
        attributes: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
        hp: { max: 1, current: 1 },
        mp: { max: 0, current: 0 },
        attacks: [],
        defense: { base: 10, armor: 0, shield: 0, other: 0, penalty: 0 },
        skills: {},
        spells: [],
        powers: [],
        equipment: [],
        money: 0,
        carry_limit: 0,
        notes: '',
        user_id: user.id,
      })
      .select('id')
      .single()
    setCreating(false)
    if (!error && data?.id) navigate(`/ficha/${data.id}`)
  }

  async function deleteCharacter(id: string, name: string) {
    if (!confirm(`Deletar "${name || 'este personagem'}"? Esta ação não pode ser desfeita.`)) return
    const { error } = await supabase.from('characters').delete().eq('id', id)
    if (!error) setCharacters(cs => cs.filter(c => c.id !== id))
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-3">
            <img src="/icone-fichas.png" alt="" className="w-10 h-10 object-contain" />
            <h1 className="font-display text-3xl font-semibold text-tormenta-red">Minhas Fichas</h1>
          </div>
          <p className="text-stone-500 text-sm mt-1">Gerencie seus personagens</p>
        </div>
        <button
          onClick={createCharacter}
          disabled={creating}
          className="btn-primary flex items-center gap-2 disabled:opacity-60"
        >
          <Plus size={15} />
          {creating ? 'Criando…' : 'Nova ficha'}
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <p className="text-stone-400 text-center py-16">Carregando fichas…</p>
      ) : characters.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-stone-400 mb-6">Nenhum personagem criado ainda.</p>
          <button onClick={createCharacter} disabled={creating} className="btn-primary disabled:opacity-60">
            Criar primeiro personagem
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {characters.map(ch => {
            const lvl    = totalLevel(ch.classes)
            const hpPct  = ch.hp?.max > 0 ? Math.min(100, (ch.hp.current / ch.hp.max) * 100) : 0
            const mpPct  = ch.mp?.max > 0 ? Math.min(100, (ch.mp.current / ch.mp.max) * 100) : 0
            const klasses = ch.classes?.map(c => [c.name, c.level].filter(Boolean).join(' ')).filter(Boolean).join(' / ') || '—'

            return (
              <div
                key={ch.id}
                onClick={() => navigate(`/ficha/${ch.id}`)}
                className="card cursor-pointer hover:shadow-md transition-shadow border-l-4 border-tormenta-red group relative"
              >
                {/* Delete button */}
                <button
                  onClick={e => { e.stopPropagation(); deleteCharacter(ch.id, ch.name) }}
                  className="absolute top-3 right-3 text-stone-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                  aria-label="Deletar ficha"
                >
                  <Trash2 size={14} />
                </button>

                {/* Name + info */}
                <div className="pr-6 mb-3">
                  <h2 className="font-display text-lg font-semibold text-tormenta-red leading-tight">
                    {ch.name || 'Sem nome'}
                  </h2>
                  <p className="text-xs text-stone-500 mt-0.5">
                    {[ch.race, klasses].filter(Boolean).join(' · ')}
                    {lvl > 0 && <span className="ml-1 text-stone-400">· Nível {lvl}</span>}
                  </p>
                </div>

                {/* PV bar */}
                <div className="mb-2">
                  <div className="flex justify-between text-[10px] mb-0.5">
                    <span className="font-bold text-tormenta-red">PV</span>
                    <span className="text-stone-400">{ch.hp?.current ?? 0}/{ch.hp?.max ?? 0}</span>
                  </div>
                  <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden">
                    <div className="h-full bg-tormenta-red rounded-full transition-all" style={{ width: `${hpPct}%` }} />
                  </div>
                </div>

                {/* PM bar */}
                <div>
                  <div className="flex justify-between text-[10px] mb-0.5">
                    <span className="font-bold" style={{ color: '#1E3A5F' }}>PM</span>
                    <span className="text-stone-400">{ch.mp?.current ?? 0}/{ch.mp?.max ?? 0}</span>
                  </div>
                  <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${mpPct}%`, backgroundColor: '#1E3A5F' }} />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
