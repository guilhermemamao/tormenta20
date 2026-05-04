import { useState } from 'react'
import { Plus, Trash2, ChevronDown, AlertTriangle } from 'lucide-react'
import type { Character, Companion } from '../../types'

interface TabCompanheirosProps {
  char: Character
  patch: (p: Partial<Character>) => void
}

export default function TabCompanheiros({ char, patch }: TabCompanheirosProps) {
  const companions = char.companions ?? []
  const limit = char.companionLimit ?? 1
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  function toggleExpand(id: string) {
    setExpandedIds(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  function addCompanion(type: 'animal' | 'npc') {
    const newC: Companion = {
      id: Date.now().toString(),
      type,
      name: '',
      description: '',
      permanent: true,
      hasCondition: false,
      condition: '',
    }
    patch({ companions: [...companions, newC] })
    setExpandedIds(s => new Set(s).add(newC.id))
  }

  function removeCompanion(id: string) {
    patch({ companions: companions.filter(c => c.id !== id) })
  }

  function patchCompanion(id: string, fields: Partial<Companion>) {
    patch({ companions: companions.map(c => c.id === id ? { ...c, ...fields } : c) })
  }

  const animals = companions.filter(c => c.type === 'animal')
  const npcs = companions.filter(c => c.type === 'npc')

  return (
    <div className="space-y-3">
      <div className="card">
        <div className="flex items-center justify-between py-0">
          <div>
            <h3 className="font-display text-[11px] font-semibold uppercase tracking-widest text-stone-400">
              Companheiros
            </h3>
            <p className="text-xs text-stone-400 mt-0.5">
              {companions.length} de{' '}
              <span className={companions.length >= limit ? 'text-red-500 font-semibold' : 'text-stone-600 font-semibold'}>
                {limit}
              </span>{' '}
              companheiro{limit !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-stone-400">Limite:</span>
            <input
              type="number" min={0} max={20} value={limit}
              onChange={e => patch({ companionLimit: parseInt(e.target.value) || 1 })}
              className="w-12 text-center text-sm border border-stone-200 rounded-lg px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-tormenta-red"
            />
          </div>
        </div>

      </div>

      <CompanionSection
        title="Animais"
        emoji="🐾"
        companions={animals}
        expandedIds={expandedIds}
        toggleExpand={toggleExpand}
        patchCompanion={patchCompanion}
        removeCompanion={removeCompanion}
        onAdd={() => addCompanion('animal')}
      />

      <CompanionSection
        title="NPCs"
        emoji="👤"
        companions={npcs}
        expandedIds={expandedIds}
        toggleExpand={toggleExpand}
        patchCompanion={patchCompanion}
        removeCompanion={removeCompanion}
        onAdd={() => addCompanion('npc')}
      />
    </div>
  )
}

function CompanionSection({
  title, emoji, companions, expandedIds, toggleExpand, patchCompanion, removeCompanion, onAdd
}: {
  title: string
  emoji: string
  companions: Companion[]
  expandedIds: Set<string>
  toggleExpand: (id: string) => void
  patchCompanion: (id: string, fields: Partial<Companion>) => void
  removeCompanion: (id: string) => void
  onAdd: () => void
}) {
  return (
    <div className="card py-3">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-display text-[11px] font-semibold uppercase tracking-widest text-stone-400">
          {emoji} {title}
          <span className="ml-2 text-stone-300 font-normal normal-case text-xs">{companions.length}</span>
        </h3>
        <button
          onClick={onAdd}
          className="flex items-center gap-1 text-xs text-tormenta-red hover:text-tormenta-red-dark font-medium"
        >
          <Plus size={13} /> Adicionar
        </button>
      </div>

      {companions.length === 0 ? (
        <p className="text-xs text-stone-400 text-center py-2">
          Nenhum {title.toLowerCase().slice(0, -1)} adicionado
        </p>
      ) : (
        <div className="space-y-2">
          {companions.map(c => (
            <CompanionCard
              key={c.id}
              companion={c}
              expanded={expandedIds.has(c.id)}
              onToggle={() => toggleExpand(c.id)}
              onPatch={fields => patchCompanion(c.id, fields)}
              onRemove={() => removeCompanion(c.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function CompanionCard({ companion, expanded, onToggle, onPatch, onRemove }: {
  companion: Companion
  expanded: boolean
  onToggle: () => void
  onPatch: (fields: Partial<Companion>) => void
  onRemove: () => void
}) {
  return (
    <div className="border border-stone-200 rounded-xl overflow-hidden">
      {companion.hasCondition && companion.condition && (
        <div className="flex items-start gap-2 px-3 py-2 bg-red-50 border-b border-red-100">
          <AlertTriangle size={12} className="text-red-500 shrink-0 mt-0.5" />
          <p className="text-xs text-red-600 leading-relaxed">{companion.condition}</p>
        </div>
      )}

      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-3 py-2 bg-stone-50 hover:bg-stone-100 transition-colors text-left"
      >
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-stone-800 text-sm truncate">
            {companion.name || <span className="text-stone-400 font-normal">Sem nome</span>}
          </p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
              companion.permanent
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-amber-100 text-amber-700'
            }`}>
              {companion.permanent ? 'Permanente' : 'Temporário'}
            </span>
            {companion.hasCondition && (
              <span className="text-[10px] text-red-500 font-medium">⚠ Condição</span>
            )}
          </div>
        </div>
        <ChevronDown
          size={14}
          className={`text-stone-400 shrink-0 transition-transform duration-150 ${expanded ? '' : '-rotate-90'}`}
        />
        <button
          type="button"
          onClick={e => { e.stopPropagation(); onRemove() }}
          className="text-stone-300 hover:text-red-500 shrink-0 transition-colors"
        >
          <Trash2 size={13} />
        </button>
      </button>

      <div className={`grid transition-all duration-200 ${expanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
        <div className="overflow-hidden">
          <div className="px-3 pb-3 pt-2 space-y-2">
            <div>
              <label className="block text-[10px] font-medium text-stone-400 mb-1">Nome</label>
              <input
                type="text"
                value={companion.name}
                onChange={e => onPatch({ name: e.target.value })}
                placeholder="Nome do companheiro"
                className="w-full text-sm border border-stone-200 rounded-lg px-3 py-1.5 bg-stone-50 focus:outline-none focus:ring-1 focus:ring-tormenta-red"
              />
            </div>

            <div>
              <label className="block text-[10px] font-medium text-stone-400 mb-1">Duração</label>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => onPatch({ permanent: true })}
                  className={`px-2.5 py-0.5 text-[10px] font-medium rounded-full border transition-colors ${
                    companion.permanent
                      ? 'bg-emerald-100 text-emerald-700 border-emerald-300'
                      : 'text-stone-400 border-stone-200 hover:bg-stone-50'
                  }`}
                >
                  Permanente
                </button>
                <button
                  type="button"
                  onClick={() => onPatch({ permanent: false })}
                  className={`px-2.5 py-0.5 text-[10px] font-medium rounded-full border transition-colors ${
                    !companion.permanent
                      ? 'bg-amber-100 text-amber-700 border-amber-300'
                      : 'text-stone-400 border-stone-200 hover:bg-stone-50'
                  }`}
                >
                  Temporário
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-medium text-stone-400 mb-1">Bônus e descrição</label>
              <textarea
                rows={2}
                value={companion.description}
                onChange={e => onPatch({ description: e.target.value })}
                placeholder="Descreva os bônus fornecidos pelo companheiro…"
                className="w-full text-sm border border-stone-200 rounded-lg px-3 py-2 bg-stone-50 focus:outline-none focus:ring-1 focus:ring-tormenta-red resize-none"
              />
            </div>

            <div>
              <label className="block text-[10px] font-medium text-stone-400 mb-1">Condição para mantê-lo</label>
              <div className="flex items-center gap-2 mb-2">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={companion.hasCondition}
                    onChange={e => onPatch({ hasCondition: e.target.checked })}
                    className="w-3.5 h-3.5 accent-tormenta-red cursor-pointer"
                  />
                  <span className="text-xs text-stone-500">
                    {companion.hasCondition ? 'Tem condição' : 'Sem condição'}
                  </span>
                </label>
              </div>
              {companion.hasCondition && (
                <textarea
                  rows={2}
                  value={companion.condition}
                  onChange={e => onPatch({ condition: e.target.value })}
                  placeholder="Ex: Precisa comer 10 rações por dia, caso contrário vai embora…"
                  className="w-full text-sm border border-red-200 rounded-lg px-3 py-2 bg-red-50 text-red-700 placeholder:text-red-300 focus:outline-none focus:ring-1 focus:ring-red-400 resize-none"
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
