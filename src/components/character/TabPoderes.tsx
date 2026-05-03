import { Plus, ChevronRight, Trash2 } from 'lucide-react'
import type { Character, CharacterPower } from '../../types'

interface TabPoderesProps {
  char: Character
  level: number
  addPower: () => void
  removePower: (id: string) => void
  patchPower: (id: string, field: keyof CharacterPower, value: string | number) => void
  expandedPowers: Set<string>
  togglePowerExpand: (id: string) => void
}

export default function TabPoderes({
  char, addPower, removePower, patchPower, expandedPowers, togglePowerExpand,
}: TabPoderesProps) {
  const sorted = [...char.powers].sort((a, b) => a.level - b.level)

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display text-[11px] font-semibold uppercase tracking-widest text-stone-400">Poderes</h3>
        <button onClick={addPower}
          className="flex items-center gap-1 text-xs text-tormenta-red hover:text-tormenta-red-dark font-medium">
          <Plus size={13} /> Adicionar poder
        </button>
      </div>

      {sorted.length === 0 ? (
        <p className="text-sm text-stone-400 text-center py-8">Nenhum poder cadastrado</p>
      ) : (
        <div className="space-y-1">
          {sorted.map(p => (
            <div key={p.powerId} className="border border-stone-100 rounded-lg overflow-hidden">
              <div className="flex items-center gap-2 px-3 py-2">
                <input
                  type="number" min={1} max={20} value={p.level}
                  onChange={e => patchPower(p.powerId, 'level', parseInt(e.target.value) || 1)}
                  className="w-10 text-center text-xs text-stone-400 bg-stone-50 border border-stone-200 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-tormenta-red shrink-0"
                  title="Nível em que o poder foi adquirido"
                />
                <input
                  value={p.powerName} placeholder="Nome do poder"
                  onChange={e => patchPower(p.powerId, 'powerName', e.target.value)}
                  className="flex-1 text-sm font-medium text-stone-800 bg-transparent focus:outline-none"
                />
                <button type="button" onClick={() => togglePowerExpand(p.powerId)}
                  className="text-stone-300 hover:text-stone-500 shrink-0 transition-transform duration-200"
                  style={{ transform: expandedPowers.has(p.powerId) ? 'rotate(90deg)' : 'none' }}>
                  <ChevronRight size={14} />
                </button>
                <button onClick={() => removePower(p.powerId)} className="text-stone-300 hover:text-red-500 shrink-0">
                  <Trash2 size={13} />
                </button>
              </div>
              <div className={`grid transition-all duration-200 ${expandedPowers.has(p.powerId) ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                <div className="overflow-hidden">
                  <div className="px-3 pb-3">
                    <textarea
                      rows={3}
                      value={p.description ?? ''}
                      onChange={e => patchPower(p.powerId, 'description', e.target.value)}
                      placeholder="Descrição do poder…"
                      className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-xs text-stone-600 focus:outline-none focus:ring-1 focus:ring-tormenta-red resize-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
