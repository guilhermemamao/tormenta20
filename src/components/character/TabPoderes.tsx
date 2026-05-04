import { useState } from 'react'
import { Plus, ChevronRight, Trash2, ArrowUpDown } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import type { Character, CharacterPower } from '../../types'

interface AbilitySuggestion {
  id: string
  name: string
  description: string
  is_power: boolean
  prerequisites: { other?: string } | null
  class_name: string
}

interface TabPoderesProps {
  char: Character
  level: number
  charClasses: { name: string; level: number }[]
  addPower: () => void
  removePower: (id: string) => void
  patchPower: (id: string, fields: Partial<CharacterPower>) => void
  expandedPowers: Set<string>
  togglePowerExpand: (id: string) => void
}

export default function TabPoderes({
  char, addPower, removePower, patchPower, expandedPowers, togglePowerExpand, charClasses,
}: TabPoderesProps) {
  const [suggestions, setSuggestions] = useState<Record<string, AbilitySuggestion[]>>({})
  const [activeSuggestion, setActiveSuggestion] = useState<string | null>(null)

  const [manualSort, setManualSort] = useState<boolean>(() => {
    try {
      return localStorage.getItem('powers-sort') === 'true'
    } catch {
      return false
    }
  })
  const sorted = manualSort
    ? [...char.powers].sort((a, b) => a.level - b.level)
    : [...char.powers]

  async function fetchSuggestions(powerId: string, query: string, tipo: 'classe' | 'universal') {
    if (!query || query.length < 2) {
      setSuggestions(s => ({ ...s, [powerId]: [] }))
      return
    }
    const classNames = charClasses.map(c => c.name).filter(Boolean)
    let q = supabase
      .from('class_abilities')
      .select('id, name, description, is_power, prerequisites, class_name')
      .ilike('name', `%${query}%`)
      .limit(8)
    if (tipo === 'classe' && classNames.length > 0) {
      q = q.in('class_name', classNames)
    }
    const { data } = await q
    setSuggestions(s => ({ ...s, [powerId]: (data as AbilitySuggestion[]) ?? [] }))
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display text-[11px] font-semibold uppercase tracking-widest text-stone-400">Poderes</h3>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setManualSort(s => {
              const next = !s
              try { localStorage.setItem('powers-sort', String(next)) } catch {}
              return next
            })}
            title="Ordenar por nível"
            className={`flex items-center gap-1 text-xs font-medium transition-colors ${
              manualSort
                ? 'text-tormenta-red'
                : 'text-stone-400 hover:text-stone-600'
            }`}
          >
            <ArrowUpDown size={13} />
            Ordenar
          </button>
          <button onClick={addPower}
            className="flex items-center gap-1 text-xs text-tormenta-red hover:text-tormenta-red-dark font-medium">
            <Plus size={13} /> Adicionar poder
          </button>
        </div>
      </div>

      {sorted.length === 0 ? (
        <p className="text-sm text-stone-400 text-center py-8">Nenhum poder cadastrado</p>
      ) : (
        <>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-1 px-3">
          <p className="text-[9px] font-semibold uppercase tracking-wider text-stone-400">Nv. adquirido · Tipo · Nome do poder</p>
          <p className="text-[9px] font-semibold uppercase tracking-wider text-stone-400 hidden sm:block">Nv. adquirido · Tipo · Nome do poder</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {sorted.map(p => {
            const source = p.source ?? 'classe'
            return (
              <div key={p.powerId} className="border border-stone-100 rounded-lg">
                <div className="flex items-center gap-1.5 px-3 py-1.5">
                  <input
                    type="number" min={1} max={20} value={p.level}
                    onChange={e => patchPower(p.powerId, { level: parseInt(e.target.value) || 1 })}
                    className="w-10 text-center text-xs text-stone-400 bg-stone-50 border border-stone-200 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-tormenta-red shrink-0"
                    title="Nível em que o poder foi adquirido"
                  />

                  <div className="flex gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => patchPower(p.powerId, { source: 'classe' })}
                      className={`text-[9px] px-1 py-0.5 rounded border font-medium transition-colors ${
                        source === 'classe'
                          ? 'bg-tormenta-red text-white border-tormenta-red'
                          : 'text-stone-400 border-stone-200 hover:border-stone-300'
                      }`}
                    >Classe</button>
                    <button
                      type="button"
                      onClick={() => patchPower(p.powerId, { source: 'universal' })}
                      className={`text-[9px] px-1 py-0.5 rounded border font-medium transition-colors ${
                        source === 'universal'
                          ? 'bg-tormenta-red text-white border-tormenta-red'
                          : 'text-stone-400 border-stone-200 hover:border-stone-300'
                      }`}
                    >Universal</button>
                  </div>

                  <div className="relative flex-1">
                    <input
                      value={p.powerName}
                      placeholder="Nome do poder"
                      onChange={e => {
                        patchPower(p.powerId, { powerName: e.target.value })
                        fetchSuggestions(p.powerId, e.target.value, source as 'classe' | 'universal')
                        setActiveSuggestion(p.powerId)
                      }}
                      onFocus={() => setActiveSuggestion(p.powerId)}
                      onBlur={() => setTimeout(() => setActiveSuggestion(null), 300)}
                      className="w-full max-w-[120px] sm:max-w-[160px] text-sm font-medium text-stone-800 bg-transparent focus:outline-none"
                    />
                    {activeSuggestion === p.powerId && (suggestions[p.powerId] ?? []).length > 0 && (
                      <div className="absolute z-20 top-full left-0 mt-1 w-72 bg-white border border-stone-200 rounded-lg shadow-lg overflow-hidden">
                        {suggestions[p.powerId].map(s => (
                          <button
                            key={s.id}
                            type="button"
                            onPointerDown={(e) => {
                              e.preventDefault()
                              patchPower(p.powerId, { powerName: s.name, description: s.description })
                              setSuggestions(prev => ({ ...prev, [p.powerId]: [] }))
                              setActiveSuggestion(null)
                            }}
                            className="w-full text-left px-3 py-2 text-sm hover:bg-stone-50 border-b border-stone-50 last:border-0"
                          >
                            <div className="font-medium text-stone-800">{s.name}</div>
                            <div className="text-[10px] text-stone-400">
                              {s.class_name}{s.prerequisites?.other ? ` · ${s.prerequisites.other}` : ''}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <button type="button" onClick={() => togglePowerExpand(p.powerId)}
                    className="ml-auto text-stone-400 hover:text-stone-600 shrink-0 transition-transform duration-200"
                    style={{ transform: expandedPowers.has(p.powerId) ? 'rotate(90deg)' : 'none' }}>
                    <ChevronRight size={18} strokeWidth={2.5} />
                  </button>
                  <button onClick={() => removePower(p.powerId)} className="text-stone-300 hover:text-red-500 shrink-0">
                    <Trash2 size={13} />
                  </button>
                </div>
                <div className={`grid transition-all duration-200 ${expandedPowers.has(p.powerId) ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                  <div className="overflow-hidden rounded-b-lg">
                    <div className="px-3 pb-3">
                      <textarea
                        rows={3}
                        value={p.description ?? ''}
                        onChange={e => patchPower(p.powerId, { description: e.target.value })}
                        placeholder="Descrição do poder…"
                        className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-xs text-stone-600 focus:outline-none focus:ring-1 focus:ring-tormenta-red resize-none"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
        </>
      )}
    </div>
  )
}
