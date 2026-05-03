import { ArrowLeft } from 'lucide-react'
import type { Character } from '../../types'
import type { Tab } from './characterHelpers'

interface TabOrigemProps {
  char: Character
  patch: (p: Partial<Character>) => void
  setTab: (tab: Tab) => void
}

export default function TabOrigem({ char, patch, setTab }: TabOrigemProps) {
  return (
    <div className="space-y-5">
      <div className="card">
        <h3 className="font-display text-[11px] font-semibold uppercase tracking-widest text-stone-400 mb-4">Origem</h3>
        <div className="flex items-center gap-3 mb-4 p-3 bg-stone-50 rounded-lg border border-stone-100">
          <div className="flex-1">
            <p className="text-[10px] text-stone-400 mb-0.5">Origem do personagem</p>
            <p className="text-sm font-semibold text-stone-700">{char.origin || <span className="text-stone-300 font-normal">não definida</span>}</p>
          </div>
          <button onClick={() => setTab('geral')}
            className="text-xs text-tormenta-red hover:text-tormenta-red-dark flex items-center gap-1 shrink-0">
            <ArrowLeft size={11} /> Editar na aba Geral
          </button>
        </div>
        <label className="block text-[10px] font-medium text-stone-400 mb-1.5">
          Descrição da origem e bônus escolhidos
        </label>
        <textarea
          rows={6}
          value={char.originNotes ?? ''}
          onChange={e => patch({ originNotes: e.target.value })}
          placeholder="Descreva sua origem, os bônus escolhidos, perícias e poderes concedidos…"
          className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-sm text-stone-700 focus:outline-none focus:ring-1 focus:ring-tormenta-red resize-y"
        />
      </div>

      <div className="card">
        <h3 className="font-display text-[11px] font-semibold uppercase tracking-widest text-stone-400 mb-3">Anotações</h3>
        <textarea
          rows={10}
          value={char.notes}
          onChange={e => patch({ notes: e.target.value })}
          placeholder="Histórico, aliados, inimigos, tesouros, segredos, anotações gerais…"
          className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-sm text-stone-700 focus:outline-none focus:ring-1 focus:ring-tormenta-red resize-y"
        />
      </div>
    </div>
  )
}
