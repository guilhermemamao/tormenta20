import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { X, Pencil, Shield, Eye, Sparkles, Heart, Zap, EyeOff, Skull, RefreshCw, Check } from 'lucide-react'
import type { Spell, SpellSchool, SpellType, CharacterSpell } from '../types'
import { CONDITION_DEFS } from '../data/spells'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

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

const CIRCLE_LABEL = ['1º Círculo', '2º Círculo', '3º Círculo', '4º Círculo', '5º Círculo']

const RANGE_TOOLTIPS: Record<string, string> = {
  Pessoal: 'Afeta apenas você',
  Toque: 'Requer contato físico com o alvo',
  Curto: '9 metros (6 quadrados)',
  Médio: '30 metros (20 quadrados)',
  Longo: '90 metros (60 quadrados)',
}

const DURATION_TOOLTIPS: Record<string, string> = {
  Instantânea: 'O efeito ocorre e termina imediatamente',
  Cena: 'Dura até o fim do encontro ou cena atual',
  Rodada: 'Dura até o início do seu próximo turno',
  Sustentada: 'Requer ação livre por rodada para manter o efeito',
}

// ─── Tooltip (portal-based to escape overflow clipping) ─────────────────────

function Tooltip({ text, children }: { text: string; children: React.ReactNode }) {
  const ref = useRef<HTMLSpanElement>(null)
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null)

  function handleEnter() {
    if (!ref.current) return
    const r = ref.current.getBoundingClientRect()
    // Anchor to the right edge of the trigger, vertically centered
    setPos({ x: r.right + 10, y: r.top + r.height / 2 })
  }

  return (
    <>
      <span
        ref={ref}
        onMouseEnter={handleEnter}
        onMouseLeave={() => setPos(null)}
        className="cursor-help underline decoration-dotted decoration-red-300/60 underline-offset-2 inline-block"
      >
        {children}
      </span>

      {pos && createPortal(
        <div
          role="tooltip"
          style={{ position: 'fixed', left: pos.x, top: pos.y, transform: 'translateY(-50%)', zIndex: 9999 }}
          className="bg-stone-900 text-white text-xs rounded-lg px-3 py-2 shadow-xl whitespace-nowrap pointer-events-none max-w-[240px]"
        >
          {/* Arrow pointing left toward the trigger */}
          <span
            style={{
              position: 'absolute', right: '100%', top: '50%', transform: 'translateY(-50%)',
              border: '5px solid transparent', borderRightColor: '#1c1917',
            }}
          />
          {text}
        </div>,
        document.body,
      )}
    </>
  )
}

// ─── Description renderer ────────────────────────────────────────────────────

function renderDescription(text: string, onTerm: (key: string) => void): React.ReactNode {
  const keys = Object.keys(CONDITION_DEFS).sort((a, b) => b.length - a.length)
  const escaped = keys.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  const pattern = new RegExp(`(${escaped.join('|')})`, 'gi')
  return text.split(pattern).map((part, i) => {
    const key = keys.find(k => k.toLowerCase() === part.toLowerCase())
    if (key) {
      return (
        <button
          key={i}
          onClick={e => { e.stopPropagation(); onTerm(key) }}
          className="text-tormenta-red font-medium underline decoration-dotted hover:decoration-solid transition-all"
        >
          {part}
        </button>
      )
    }
    return <span key={i}>{part}</span>
  })
}

// ─── Condition modal ─────────────────────────────────────────────────────────

function ConditionModal({ termKey, onClose, onNavigate }: { termKey: string; onClose: () => void; onNavigate: (key: string) => void }) {
  const cond = CONDITION_DEFS[termKey]

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  function renderInlineLinks(text: string): React.ReactNode {
    const keys = Object.keys(CONDITION_DEFS).sort((a, b) => b.length - a.length)
    const escaped = keys.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    const pattern = new RegExp(`(${escaped.join('|')})`, 'gi')
    return text.split(pattern).map((part, i) => {
      const key = keys.find(k => k.toLowerCase() === part.toLowerCase())
      if (key && key !== termKey.toLowerCase()) {
        return (
          <button
            key={i}
            onClick={e => { e.stopPropagation(); onNavigate(key) }}
            className="text-tormenta-red font-medium underline decoration-dotted hover:decoration-solid transition-all"
          >
            {part}
          </button>
        )
      }
      return <span key={i}>{part}</span>
    })
  }

  if (!cond) return null
  return (
    <>
      <div className="fixed inset-0 z-[60] bg-black/25" onClick={onClose} />
      <div className="fixed inset-0 z-[70] flex items-center justify-center p-6 pointer-events-none">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm pointer-events-auto border-t-4 border-tormenta-red">
          <div className="flex items-center justify-between px-5 pt-5 pb-3">
            <h3 className="font-display text-sm font-semibold text-tormenta-red uppercase tracking-widest">
              {cond.title}
            </h3>
            <button
              onClick={onClose}
              className="text-stone-400 hover:text-stone-600 transition-colors -mr-1"
              aria-label="Fechar"
            >
              <X size={16} />
            </button>
          </div>
          <p className="text-sm text-stone-600 leading-relaxed px-5 pb-5">
            {renderInlineLinks(cond.definition)}
          </p>
        </div>
      </div>
    </>
  )
}

// ─── Add to sheet ────────────────────────────────────────────────────────────

type CharRow = { id: string; name: string; spells: CharacterSpell[] }

function AddToSheet({ spell }: { spell: Spell }) {
  const { user } = useAuth()
  const [chars, setChars] = useState<CharRow[]>([])
  const [selected, setSelected] = useState('')
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    if (!user) return
    supabase
      .from('characters')
      .select('id, name, spells')
      .eq('user_id', user.id)
      .then(({ data }) => { if (data) setChars(data as CharRow[]) })
  }, [user])

  if (!user || chars.length === 0) return null

  const char = chars.find(c => c.id === selected)
  const alreadyIn = !!char?.spells?.some(s => s.spellId === spell.id)

  async function add() {
    if (!char || !spell.id || alreadyIn) return
    setAdding(true)
    const entry: CharacterSpell = {
      spellId: spell.id,
      spellName: spell.name,
      circle: spell.circle,
      school: spell.school,
      type: spell.type,
    }
    const updated = [...(char.spells ?? []), entry]
    await supabase.from('characters').update({ spells: updated }).eq('id', char.id)
    setChars(cs => cs.map(c => c.id === char.id ? { ...c, spells: updated } : c))
    setAdding(false)
  }

  return (
    <div className="mt-2 flex items-center gap-1.5">
      {selected && alreadyIn ? (
        <span className="text-xs text-emerald-600 font-medium">Já na ficha</span>
      ) : (
        <>
          <select
            value={selected}
            onChange={e => setSelected(e.target.value)}
            className="text-xs border border-stone-200 rounded-md px-1.5 py-1 bg-stone-50 text-stone-600 focus:outline-none focus:ring-1 focus:ring-tormenta-red max-w-[150px] truncate"
          >
            <option value="">Adicionar à ficha…</option>
            {chars.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          {selected && (
            <button
              onClick={add}
              disabled={adding}
              className="p-1 rounded-md bg-emerald-500 hover:bg-emerald-600 text-white disabled:opacity-50 transition-colors"
              aria-label="Confirmar"
            >
              <Check size={13} />
            </button>
          )}
        </>
      )}
    </div>
  )
}

// ─── Spell modal ─────────────────────────────────────────────────────────────

interface Props {
  spell: Spell
  onClose: () => void
  onEdit?: () => void
}

export default function SpellModal({ spell, onClose, onEdit }: Props) {
  const [conditionKey, setConditionKey] = useState<string | null>(null)
  const Icon = SCHOOL_ICONS[spell.school]

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (conditionKey) setConditionKey(null)
        else onClose()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose, conditionKey])

  const stats: Array<{ label: string; value: string; tooltip?: string }> = [
    { label: 'Execução',     value: spell.execution },
    { label: 'Alcance',      value: spell.range,    tooltip: RANGE_TOOLTIPS[spell.range] },
    { label: 'Duração',      value: spell.duration, tooltip: DURATION_TOOLTIPS[spell.duration] },
    { label: 'Alvo / Área',  value: spell.target },
    { label: 'Resistência',  value: spell.resistance },
  ]

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[2px]"
        onClick={onClose}
      />

      {/* Modal container */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8">
        <div
          className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[88vh] flex overflow-hidden"
          onClick={e => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="spell-modal-title"
        >
          {/* ── Left sidebar (red) ── */}
          <div className="w-48 shrink-0 bg-tormenta-red overflow-y-auto flex flex-col">
            <div className="p-5 flex-1 flex flex-col">

              {/* School */}
              <div className="mb-4">
                <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-red-200/50 mb-1">
                  Escola
                </p>
                <div className="flex items-center gap-1.5 text-white">
                  <Icon size={13} className="shrink-0 text-red-300" />
                  <span className="text-sm font-medium">{spell.school}</span>
                </div>
              </div>

              {/* Type */}
              <div className="mb-4">
                <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-red-200/50 mb-1">
                  Tipo
                </p>
                <span className="text-sm font-medium text-white">{spell.type}</span>
              </div>

              {/* Circle */}
              <div className="mb-5 pb-5 border-b border-red-700/60">
                <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-red-200/50 mb-1">
                  Círculo
                </p>
                <span className="text-sm font-medium text-white">
                  {CIRCLE_LABEL[spell.circle - 1]}
                </span>
              </div>

              {/* Stats */}
              {stats.map(({ label, value, tooltip }) => (
                <div key={label} className="mb-3.5">
                  <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-red-200/50 mb-0.5">
                    {label}
                  </p>
                  {tooltip ? (
                    <Tooltip text={tooltip}>
                      <span className="text-xs text-white/90">{value}</span>
                    </Tooltip>
                  ) : (
                    <span className="text-xs text-white/90">{value}</span>
                  )}
                </div>
              ))}

              {/* Publication */}
              <div className="mt-auto pt-5 border-t border-red-700/60">
                <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-red-200/50 mb-0.5">
                  Publicação
                </p>
                <span className="text-xs text-white/60">{spell.publication}</span>
              </div>
            </div>
          </div>

          {/* ── Right content (white) ── */}
          <div className="flex-1 flex flex-col overflow-hidden min-w-0">
            {/* Header */}
            <div className="px-7 pt-6 pb-4 shrink-0 border-b border-stone-100">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className={TYPE_TAG[spell.type]}>{spell.type}</span>
                    <span className="text-xs text-stone-400">{CIRCLE_LABEL[spell.circle - 1]}</span>
                  </div>
                  <h2
                    id="spell-modal-title"
                    className="font-display text-2xl font-semibold text-tormenta-red leading-tight"
                  >
                    {spell.name}
                  </h2>
                  <AddToSheet spell={spell} />
                </div>
                <div className="flex items-center gap-1 shrink-0 mt-1">
                  {onEdit && (
                    <button
                      onClick={onEdit}
                      className="p-1.5 rounded-lg text-stone-400 hover:text-tormenta-red hover:bg-stone-100 transition-colors cursor-pointer"
                      aria-label="Editar magia"
                    >
                      <Pencil size={18} />
                    </button>
                  )}
                  <button
                    onClick={onClose}
                    className="p-1 text-stone-400 hover:text-stone-700 transition-colors cursor-pointer"
                    aria-label="Fechar modal"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>
            </div>

            {/* Scrollable body */}
            <div className="overflow-y-auto flex-1 px-7 py-5">
              {/* Description */}
              <p className="text-stone-700 leading-relaxed text-sm mb-8">
                {renderDescription(spell.effect, setConditionKey)}
              </p>

              {/* Amplifiers */}
              {spell.amplifiers.length > 0 && (
                <div>
                  <h3 className="font-display text-xs font-semibold uppercase tracking-widest text-stone-400 mb-4 pb-2 border-b border-stone-100">
                    Amplificadores
                  </h3>
                  <div className="space-y-3">
                    {spell.amplifiers.map((amp, i) => (
                      <div key={i} className="flex gap-3 items-start">
                        {amp.isTrick ? (
                          <span className="shrink-0 text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 leading-none whitespace-nowrap">
                            0 PM — Truque
                          </span>
                        ) : (
                          <span className="shrink-0 text-xs font-bold px-2.5 py-1 rounded-full bg-tormenta-red text-white leading-none">
                            +{amp.cost} PM
                          </span>
                        )}
                        <p className="text-sm text-stone-600 leading-relaxed pt-0.5">
                          {renderDescription(amp.effect, setConditionKey)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Condition modal (stacked on top) */}
      {conditionKey && (
        <ConditionModal
          termKey={conditionKey}
          onClose={() => setConditionKey(null)}
          onNavigate={(key) => setConditionKey(key)}
        />
      )}
    </>
  )
}
