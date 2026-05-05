import { useState } from 'react'
import { ChevronDown, X, Plus } from 'lucide-react'
import type { RefObject } from 'react'
import type { Character } from '../../types'
import {
  ATTR_CONFIG, DEITY_OPTIONS, DEFAULT_SKILL,
  INP, attrMod, fmtMod, fmtBonus, parseHP, parseMP, calcSkillTotal,
  type ClassDef, type RaceData,
} from './characterHelpers'

// ─── StatInput ────────────────────────────────────────────────────────────────

function StatInput({ abbr, value, onChange }: {
  abbr: string; value: number; onChange: (v: number) => void
}) {
  const m = attrMod(value)
  return (
    <div className="flex flex-col items-center bg-stone-50 border border-stone-200 rounded-xl pt-2.5 pb-2.5 px-1">
      <span className="text-[9px] font-bold uppercase tracking-widest text-stone-400 mb-1">{abbr}</span>
      <span className={`text-2xl font-bold leading-none mb-1.5 ${m >= 0 ? 'text-tormenta-red' : 'text-stone-600'}`}>
        {m >= 0 ? `+${m}` : `${m}`}
      </span>
      <input
        type="number" min={1} max={30} value={value}
        onChange={e => { const v = parseInt(e.target.value); if (!isNaN(v)) onChange(Math.min(30, Math.max(1, v))) }}
        className="w-10 text-center text-xs text-stone-500 bg-white border border-stone-200 rounded-md focus:outline-none focus:ring-1 focus:ring-tormenta-red"
      />
    </div>
  )
}

// ─── ResBar ───────────────────────────────────────────────────────────────────

function ResBar({ label, current, max, barColor, textColor, onCurChange, onMaxChange, onAuto }: {
  label: string; current: number; max: number
  barColor: string; textColor: string
  onCurChange: (v: number) => void; onMaxChange: (v: number) => void
  onAuto?: () => void
}) {
  const pct = Math.min(100, Math.max(0, max > 0 ? (current / max) * 100 : 0))
  return (
    <div>
      <div className="flex justify-between items-center mb-1.5">
        <div className="flex items-center gap-1.5">
          <span className={`text-xs font-bold uppercase tracking-wider ${textColor}`}>{label}</span>
          {onAuto && (
            <button onClick={onAuto}
              className="text-[9px] font-medium text-stone-400 hover:text-stone-600 border border-stone-200 hover:border-stone-300 rounded px-1 py-0.5 leading-none transition-colors">
              Auto
            </button>
          )}
        </div>
        <div className="flex items-center gap-0.5 text-sm">
          <input type="number" min={0} max={max} value={current}
            onChange={e => { const v = parseInt(e.target.value); if (!isNaN(v)) onCurChange(Math.min(max, Math.max(0, v))) }}
            className="w-10 text-right font-bold text-stone-800 bg-transparent border-none focus:outline-none p-0"
          />
          <span className="text-stone-400 select-none">/</span>
          <input type="number" min={0} value={max}
            onChange={e => { const v = parseInt(e.target.value); if (!isNaN(v)) onMaxChange(Math.max(0, v)) }}
            className="w-10 text-left text-stone-500 bg-transparent border-none focus:outline-none p-0"
          />
        </div>
      </div>
      <div className="h-4 bg-stone-100 rounded-full overflow-hidden border border-stone-200">
        <div className={`h-full rounded-full transition-all duration-300 ${barColor}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

// ─── RaceAbilityCard ─────────────────────────────────────────────────────────

function RaceAbilityCard({ name, description }: { name: string; description: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border border-stone-100 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-stone-50 transition-colors"
      >
        <span className="flex-1 text-sm font-medium text-stone-800">{name}</span>
        <ChevronDown
          size={13}
          className={`text-stone-300 shrink-0 transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <div className="px-3 pb-3 pt-1.5 border-t border-stone-50 bg-stone-50/50">
          <p className="text-xs text-stone-600 leading-relaxed">{description}</p>
        </div>
      )}
    </div>
  )
}

// ─── TabGeral ─────────────────────────────────────────────────────────────────

interface TabGeralProps {
  char: Character
  patch: (p: Partial<Character>) => void
  setChar: React.Dispatch<React.SetStateAction<Character>>
  classDefsMap: Record<string, ClassDef>
  raceData: RaceData | null
  raceSearch: string
  raceSuggestions: RaceData[]
  showRaceDropdown: boolean
  raceInputRef: RefObject<HTMLInputElement | null>
  setRaceSearch: (v: string) => void
  setRaceData: (v: RaceData | null) => void
  setShowRaceDropdown: (v: boolean) => void
  setRaceSuggestions: (v: RaceData[]) => void
  originSearch: string
  originSuggestions: { name: string; description: string }[]
  showOriginDropdown: boolean
  setOriginSearch: (v: string) => void
  setShowOriginDropdown: (v: boolean) => void
  onOriginSelect: (name: string, description: string) => void
  patchAttr: (k: keyof Character['attributes'], v: number) => void
  patchHP: (k: 'current' | 'max', v: number) => void
  patchMP: (k: 'current' | 'max', v: number) => void
  patchDef: (k: keyof Character['defense'], v: number) => void
  calcAutoHP: () => void
  calcAutoMP: () => void
  level: number
  defTotal: number
}

export default function TabGeral({
  char, patch, setChar,
  classDefsMap, raceData,
  raceSearch, raceSuggestions, showRaceDropdown, raceInputRef,
  setRaceSearch, setRaceData, setShowRaceDropdown, setRaceSuggestions,
  originSearch, originSuggestions, showOriginDropdown,
  setOriginSearch, setShowOriginDropdown, onOriginSelect,
  patchAttr, patchHP, patchMP, patchDef,
  calcAutoHP, calcAutoMP,
  level, defTotal,
}: TabGeralProps) {
  const squares = Math.round(char.movement / 1.5)
  const saves = [
    { label: 'Fortitude', attr: 'con' as const },
    { label: 'Reflexos',  attr: 'dex' as const },
    { label: 'Vontade',   attr: 'wis' as const },
  ]

  return (
    <div className="space-y-5">
      <div className="card">
        <h3 className="font-display text-[11px] font-semibold uppercase tracking-widest text-stone-400 mb-4">
          Informações Básicas
        </h3>

        {/* Linha 1: Nome | Jogador */}
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_160px] gap-x-6 mb-3">
          <div>
            <label className="block text-[10px] font-medium text-stone-400 mb-0.5">Nome</label>
            <input type="text" value={char.name} onChange={e => patch({ name: e.target.value })}
              placeholder="Nome do personagem"
              className={`${INP} text-base font-semibold text-stone-800`}
            />
          </div>
          <div>
            <label className="block text-[10px] font-medium text-stone-400 mb-0.5">Jogador</label>
            <input type="text" value={char.player} onChange={e => patch({ player: e.target.value })} className={INP} />
          </div>
        </div>

        {/* Linha 2: Raça | Origem | Divindade */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-6 mb-3">
          <div className="relative">
            <label className="block text-[10px] font-medium text-stone-400 mb-0.5">Raça</label>
            <input
              ref={raceInputRef}
              type="text"
              value={raceSearch}
              onChange={e => {
                setRaceSearch(e.target.value)
                patch({ race: e.target.value })
                setShowRaceDropdown(true)
                if (!e.target.value) setRaceData(null)
              }}
              onFocus={() => setShowRaceDropdown(true)}
              onBlur={() => setTimeout(() => setShowRaceDropdown(false), 150)}
              placeholder="Buscar raça..."
              className={INP}
              autoComplete="off"
            />
            {showRaceDropdown && raceSuggestions.length > 0 && (
              <div className="absolute z-30 top-full left-0 mt-1 w-56 bg-white border border-stone-200 rounded-lg shadow-lg overflow-hidden">
                {raceSuggestions.map(r => (
                  <button
                    key={r.id}
                    type="button"
                    onMouseDown={() => {
                      patch({ race: r.name, size: r.size, movement: r.displacement })
                      setRaceSearch(r.name)
                      setRaceData(r)
                      setShowRaceDropdown(false)
                      setRaceSuggestions([])
                    }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-stone-50 border-b border-stone-50 last:border-0 cursor-pointer"
                  >
                    <span className="font-medium text-stone-800">{r.name}</span>
                    <span className="text-xs text-stone-400 ml-2">{r.size}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="relative">
            <label className="block text-[10px] font-medium text-stone-400 mb-0.5">Origem</label>
            <input
              type="text"
              value={originSearch}
              onChange={e => {
                setOriginSearch(e.target.value)
                patch({ origin: e.target.value })
                setShowOriginDropdown(true)
              }}
              onFocus={() => setShowOriginDropdown(true)}
              onBlur={() => setTimeout(() => setShowOriginDropdown(false), 150)}
              placeholder="Buscar origem..."
              className={INP}
              autoComplete="off"
            />
            {showOriginDropdown && originSuggestions.length > 0 && (
              <div className="absolute z-30 top-full left-0 mt-1 w-64 bg-white border border-stone-200 rounded-lg shadow-lg overflow-hidden">
                {originSuggestions.map(o => (
                  <button
                    key={o.name}
                    type="button"
                    onMouseDown={() => {
                      onOriginSelect(o.name, o.description)
                      setShowOriginDropdown(false)
                    }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-stone-50 border-b border-stone-50 last:border-0 cursor-pointer"
                  >
                    <span className="font-medium text-stone-800">{o.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div>
            <label className="block text-[10px] font-medium text-stone-400 mb-0.5">Divindade</label>
            <select value={char.deity} onChange={e => patch({ deity: e.target.value })}
              className="bg-transparent border-b border-stone-200 focus:border-tormenta-red focus:outline-none text-sm py-0.5 w-full">
              {DEITY_OPTIONS.map(d => <option key={d}>{d}</option>)}
            </select>
          </div>
        </div>

        {/* Linha 3: Classes */}
        <div className="mb-3">
          <label className="block text-[10px] font-medium text-stone-400 mb-1.5">Classe(s)</label>
          <div className="flex flex-wrap items-center gap-2">
            {char.classes.map((cl, i) => {
              const def = classDefsMap[cl.name] ?? null
              return (
                <div key={i} className="flex items-center gap-1.5 bg-stone-100 rounded-lg px-2.5 py-1">
                  <input value={cl.name} placeholder="Classe"
                    onChange={e => setChar(c => ({ ...c, classes: c.classes.map((x, j) => j === i ? { ...x, name: e.target.value } : x) }))}
                    className="bg-transparent text-sm font-medium text-stone-700 focus:outline-none w-24"
                  />
                  <input type="number" min={1} max={20} value={cl.level}
                    onChange={e => setChar(c => ({ ...c, classes: c.classes.map((x, j) => j === i ? { ...x, level: parseInt(e.target.value) || 1 } : x) }))}
                    className="bg-transparent text-sm font-bold text-tormenta-red focus:outline-none w-7 text-center"
                  />
                  {def && (
                    <div className="hidden sm:flex items-center gap-1.5">
                      <span className="text-stone-300 text-[10px] mx-0.5">|</span>
                      <div className="flex flex-col items-start">
                        <span className="text-[9px] text-stone-400 whitespace-nowrap">
                          PV Inicial: <span className="font-medium text-tormenta-red">{parseHP(def.hitPoints)} + CON</span>
                        </span>
                        <span className="text-[8px] text-stone-300 leading-none">Nível 1</span>
                      </div>
                      <span className="text-stone-300 text-[10px]">·</span>
                      <div className="flex flex-col items-start">
                        <span className="text-[9px] text-stone-400 whitespace-nowrap">
                          PV por Nível: <span className="font-medium text-tormenta-red">{def.hpPerLevel} + CON</span>
                        </span>
                        <span className="text-[8px] text-stone-300 leading-none">Níveis 2 ao 20</span>
                      </div>
                      <span className="text-stone-300 text-[10px]">·</span>
                      <div className="flex flex-col items-start">
                        <span className="text-[9px] text-stone-400 whitespace-nowrap">
                          PM: <span className="font-medium" style={{ color: '#1E3A5F' }}>{parseMP(def.manaPoints)}</span>
                        </span>
                        <span className="text-[8px] text-stone-300 leading-none">por nível</span>
                      </div>
                    </div>
                  )}
                  {!def && cl.name && (
                    <span className="text-[9px] text-stone-300 ml-1">…</span>
                  )}
                  {char.classes.length > 1 && (
                    <button onClick={() => setChar(c => ({ ...c, classes: c.classes.filter((_, j) => j !== i) }))}
                      className="text-stone-300 hover:text-red-500 ml-0.5"><X size={12} /></button>
                  )}
                </div>
              )
            })}
            <button onClick={() => setChar(c => ({ ...c, classes: [...c.classes, { name: '', level: 1 }] }))}
              className="flex items-center gap-0.5 text-xs text-tormenta-red hover:text-tormenta-red-dark">
              <Plus size={13} /> Classe
            </button>
          </div>
        </div>

        {/* Linha 4: Tamanho | Deslocamento | XP | (vazio) */}
        <div className="grid grid-cols-2 sm:grid-cols-[2fr_3fr_2fr_11fr] gap-x-6">
          <div>
            <label className="block text-[10px] font-medium text-stone-400 mb-0.5">Tamanho</label>
            <input type="text" value={char.size} onChange={e => patch({ size: e.target.value })} className={INP} />
          </div>
          <div>
            <label className="block text-[10px] font-medium text-stone-400 mb-0.5">Deslocamento</label>
            <div className="flex items-baseline gap-1">
              <input type="number" min={0} step={1.5} value={char.movement}
                onChange={e => patch({ movement: parseFloat(e.target.value) || 0 })}
                className={`${INP} !w-14 shrink-0`}
              />
              <span className="text-xs text-stone-400 whitespace-nowrap">m · {squares} quad.</span>
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-medium text-stone-400 mb-0.5">XP</label>
            <input type="number" min={0} value={char.xp}
              onChange={e => patch({ xp: parseInt(e.target.value) || 0 })} className={INP} />
          </div>
          <div className="hidden sm:block" />{/* espaço vazio */}
        </div>
      </div>

      {/* Atributos + Recursos */}
      <div className="flex flex-col gap-5 sm:grid sm:grid-cols-3">
        <div className="card sm:col-span-2">
          <h3 className="font-display text-[11px] font-semibold uppercase tracking-widest text-stone-400 mb-4">Atributos</h3>
          <div className="grid grid-cols-6 gap-2 mb-4">
            {ATTR_CONFIG.map(({ key, abbr }) => (
              <StatInput key={key} abbr={abbr} value={char.attributes[key]} onChange={v => patchAttr(key, v)} />
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-stone-100">
            {saves.map(({ label, attr }) => {
              const total = calcSkillTotal(char.attributes[attr], char.skills[label] ?? DEFAULT_SKILL, level, false, 0)
              return (
                <div key={label} className="flex items-center gap-2 bg-stone-50 border border-stone-200 rounded-lg px-3 py-1.5">
                  <span className="text-xs font-medium text-stone-500">{label}</span>
                  <span className={`text-base font-bold ${total >= 0 ? 'text-tormenta-red' : 'text-stone-600'}`}>
                    {fmtBonus(total)}
                  </span>
                </div>
              )
            })}
            <span className="text-[10px] text-stone-400 ml-auto">Resistências (calculadas)</span>
          </div>
          {(char.companions ?? []).length > 0 && (
            <div className="mt-3 pt-3 border-t border-stone-100">
              <p className="text-[9px] font-bold uppercase tracking-widest text-stone-400 mb-2">Companheiros</p>
              <div className="flex flex-wrap gap-2">
                {(char.companions ?? []).map(c => (
                  <div
                    key={c.id}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
                      c.hasCondition && c.condition
                        ? 'bg-red-50 border-red-200 text-red-700'
                        : c.permanent
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                        : 'bg-amber-50 border-amber-200 text-amber-700'
                    }`}
                  >
                    <span>{c.type === 'animal' ? '🐾' : '👤'}</span>
                    <span>{c.name || 'Sem nome'}</span>
                    {c.hasCondition && c.condition && (
                      <span title={c.condition}>⚠</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="card space-y-5">
          <div>
            <h3 className="font-display text-[11px] font-semibold uppercase tracking-widest text-stone-400 mb-3">Recursos</h3>
            <div className="space-y-4">
              <ResBar label="PV" current={char.hp.current} max={char.hp.max}
                barColor="bg-tormenta-red" textColor="text-tormenta-red"
                onCurChange={v => patchHP('current', v)} onMaxChange={v => patchHP('max', v)}
                onAuto={calcAutoHP}
              />
              <ResBar label="PM" current={char.mp.current} max={char.mp.max}
                barColor="bg-[#1E3A5F]" textColor="text-[#1E3A5F]"
                onCurChange={v => patchMP('current', v)} onMaxChange={v => patchMP('max', v)}
                onAuto={calcAutoMP}
              />
            </div>
          </div>
          <div>
            <h3 className="font-display text-[11px] font-semibold uppercase tracking-widest text-stone-400 mb-2">
              Defesa <span className="text-tormenta-red font-bold text-base ml-2">{defTotal}</span>
            </h3>
            <div className="space-y-2 text-xs">
              {([
                ['Armadura',  'armor'],
                ['Escudo',    'shield'],
                ['Outros',    'other'],
                ['Penalidade','penalty'],
              ] as [string, keyof Character['defense']][]).map(([lbl, k]) => (
                <div key={k} className="flex items-center justify-between gap-2">
                  <span className="text-stone-400">{lbl}</span>
                  <input type="number" value={char.defense[k]}
                    onChange={e => patchDef(k, parseInt(e.target.value) || 0)}
                    className="w-12 text-right bg-stone-50 border border-stone-200 rounded px-1 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-tormenta-red"
                  />
                </div>
              ))}
              <div className="flex justify-between pt-1 border-t border-stone-100 text-stone-500">
                <span>DES</span>
                <span className="font-medium">{fmtMod(char.attributes.dex)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Habilidades Raciais */}
      {raceData && raceData.race_abilities.length > 0 && (
        <div className="card">
          <h3 className="font-display text-[11px] font-semibold uppercase tracking-widest text-stone-400 mb-3">
            Habilidades Raciais
            <span className="ml-2 text-tormenta-red font-normal normal-case text-xs">{raceData.name}</span>
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {raceData.race_abilities
              .slice()
              .sort((a, b) => a.sort_order - b.sort_order)
              .map(ab => (
                <RaceAbilityCard key={ab.name} name={ab.name} description={ab.description} />
              ))}
          </div>
        </div>
      )}
    </div>
  )
}
