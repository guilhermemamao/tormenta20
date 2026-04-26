import { useState, useEffect } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { Plus, Trash2, ArrowLeft } from 'lucide-react'
import type { SpellType, SpellSchool } from '../types'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

// ─── Options ──────────────────────────────────────────────────────────────────

const SPELL_TYPES: SpellType[] = ['Arcana', 'Divina', 'Universal']
const SPELL_SCHOOLS: SpellSchool[] = [
  'Abjuração', 'Adivinhação', 'Convocação', 'Encantamento',
  'Evocação', 'Ilusão', 'Necromancia', 'Transmutação',
]
const CIRCLES = [1, 2, 3, 4, 5] as const
const EXECUTION_OPTIONS = ['Padrão', 'Movimento', 'Livre', 'Reação', 'Completa']
const RANGE_OPTIONS     = ['Pessoal', 'Toque', 'Curto', 'Médio', 'Longo']

// ─── Types ────────────────────────────────────────────────────────────────────

interface FormState {
  name: string
  type: SpellType
  circle: number
  school: SpellSchool
  execution: string
  range: string
  duration: string
  target: string
  resistance: string
  publication: string
  effect: string
  isPublic: boolean
}

interface AmpEntry {
  cost: string
  effect: string
  isTrick: boolean
}

const INITIAL_FORM: FormState = {
  name: '',
  type: 'Arcana',
  circle: 1,
  school: 'Evocação',
  execution: 'Padrão',
  range: 'Curto',
  duration: '',
  target: '',
  resistance: '',
  publication: '',
  effect: '',
  isPublic: true,
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const INPUT = [
  'w-full px-3 py-2 text-sm border border-stone-200 rounded-lg',
  'bg-stone-50 focus:outline-none focus:ring-1',
  'focus:ring-tormenta-red focus:border-tormenta-red',
].join(' ')

function Label({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-xs font-medium text-stone-600 mb-1">
      {children}{required && <span className="text-tormenta-red ml-0.5">*</span>}
    </label>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="font-display text-xs font-semibold uppercase tracking-wider text-stone-400 mb-4">
      {children}
    </h2>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CreateSpellPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id?: string }>()
  const isEdit = Boolean(id)
  const { user } = useAuth()
  const [form, setForm] = useState<FormState>(INITIAL_FORM)
  const [amplifiers, setAmplifiers] = useState<AmpEntry[]>([])
  const [saving, setSaving] = useState(false)
  const [pageLoading, setPageLoading] = useState(isEdit)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    supabase.from('spells').select('*').eq('id', id).single()
      .then(({ data, error: err }) => {
        if (data && !err) {
          setForm({
            name: data.name,
            type: data.type,
            circle: data.circle,
            school: data.school,
            execution: data.execution,
            range: data.range,
            duration: data.duration,
            target: data.target,
            resistance: data.resistance ?? '',
            publication: data.publication ?? '',
            effect: data.effect,
            isPublic: data.is_public,
          })
          setAmplifiers(
            (data.amplifiers ?? []).map((a: { cost: unknown; effect: string; isTrick?: boolean }) => {
              if (a.isTrick || a.cost === 'Truque') {
                return { cost: '0', effect: a.effect, isTrick: true }
              }
              const match = String(a.cost ?? 0).match(/\d+/)
              return { cost: match ? match[0] : '0', effect: a.effect, isTrick: a.isTrick ?? false }
            })
          )
        } else {
          setError('Magia não encontrada.')
        }
        setPageLoading(false)
      })
  }, [id])

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm(f => ({ ...f, [key]: value }))
  }

  function addAmplifier() {
    setAmplifiers(a => [...a, { cost: '', effect: '', isTrick: false }])
  }

  function removeAmplifier(index: number) {
    setAmplifiers(a => a.filter((_, i) => i !== index))
  }

  function updateAmplifier(index: number, field: keyof AmpEntry, value: string | boolean) {
    setAmplifiers(a => a.map((entry, i) => i === index ? { ...entry, [field]: value } : entry))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return
    setError(null)
    setSaving(true)

    const payload = {
      name: form.name,
      type: form.type,
      circle: form.circle,
      school: form.school,
      execution: form.execution,
      range: form.range,
      duration: form.duration,
      target: form.target,
      resistance: form.resistance.trim() || '—',
      publication: form.publication.trim() || null,
      effect: form.effect,
      amplifiers: amplifiers
        .filter(a => a.effect.trim())
        .map(a => ({
          cost: a.isTrick ? 0 : (Number(a.cost) || 0),
          effect: a.effect.trim(),
          isTrick: a.isTrick,
        })),
      is_public: form.isPublic,
    }

    let err: { message: string } | null = null

    if (isEdit) {
      const { data, error } = await supabase
        .from('spells')
        .update(payload)
        .eq('id', id!)
        .select()
      console.log('update result:', data, error)
      err = error
    } else {
      const { error } = await supabase
        .from('spells')
        .insert({ ...payload, created_by: user.id })
      err = error
    }

    setSaving(false)

    if (err) {
      console.error('[CreateSpellPage] save error:', err)
      setError(err.message)
    } else {
      navigate('/magias')
    }
  }

  if (pageLoading) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-16 text-center">
        <p className="text-stone-400">Carregando magia…</p>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      {/* ── Header ── */}
      <div className="flex items-center gap-3 mb-8">
        <Link to="/magias" className="text-stone-400 hover:text-stone-600 transition-colors">
          <ArrowLeft size={18} />
        </Link>
        <h1 className="font-display text-2xl font-semibold text-tormenta-red">
          {isEdit ? 'Editar Magia' : 'Nova Magia'}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* ── Identificação ── */}
        <section className="card">
          <SectionTitle>Identificação</SectionTitle>

          <div className="mb-4">
            <Label required>Nome</Label>
            <input
              type="text"
              required
              value={form.name}
              onChange={e => setField('name', e.target.value)}
              placeholder="Ex: Bola de Fogo"
              className={INPUT}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label required>Tipo</Label>
              <select
                value={form.type}
                onChange={e => setField('type', e.target.value as SpellType)}
                className={INPUT}
              >
                {SPELL_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <Label required>Escola</Label>
              <select
                value={form.school}
                onChange={e => setField('school', e.target.value as SpellSchool)}
                className={INPUT}
              >
                {SPELL_SCHOOLS.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <Label required>Círculo</Label>
              <select
                value={form.circle}
                onChange={e => setField('circle', Number(e.target.value))}
                className={INPUT}
              >
                {CIRCLES.map(c => (
                  <option key={c} value={c}>{c}º Círculo</option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {/* ── Parâmetros ── */}
        <section className="card">
          <SectionTitle>Parâmetros</SectionTitle>

          <div className="grid grid-cols-3 gap-4 mb-4">
            <div>
              <Label required>Execução</Label>
              <input
                list="execution-list"
                required
                value={form.execution}
                onChange={e => setField('execution', e.target.value)}
                placeholder="Ex: Padrão"
                className={INPUT}
              />
              <datalist id="execution-list">
                {EXECUTION_OPTIONS.map(o => <option key={o} value={o} />)}
              </datalist>
            </div>
            <div>
              <Label required>Alcance</Label>
              <select
                value={form.range}
                onChange={e => setField('range', e.target.value)}
                className={INPUT}
              >
                {RANGE_OPTIONS.map(o => <option key={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <Label required>Duração</Label>
              <input
                type="text"
                required
                value={form.duration}
                onChange={e => setField('duration', e.target.value)}
                placeholder="Ex: instantânea, cena, sustentada, 3 rodadas, 1 hora"
                className={INPUT}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <Label required>Alvo / Área / Efeito</Label>
              <input
                type="text"
                required
                value={form.target}
                onChange={e => setField('target', e.target.value)}
                placeholder="Ex: 1 criatura, esfera 6m, cone 9m…"
                className={INPUT}
              />
            </div>
            <div>
              <Label>Resistência</Label>
              <input
                type="text"
                value={form.resistance}
                onChange={e => setField('resistance', e.target.value)}
                placeholder="Ex: Vontade anula, Fortitude parcial, nenhuma"
                className={INPUT}
              />
            </div>
          </div>

          <div>
            <Label>Publicação</Label>
            <input
              type="text"
              value={form.publication}
              onChange={e => setField('publication', e.target.value)}
              placeholder="Ex: Tormenta20, p. 183"
              className={INPUT}
            />
          </div>
        </section>

        {/* ── Efeito ── */}
        <section className="card">
          <SectionTitle>Efeito</SectionTitle>
          <textarea
            required
            rows={5}
            value={form.effect}
            onChange={e => setField('effect', e.target.value)}
            placeholder="Descreva o efeito da magia…"
            className={`${INPUT} resize-y`}
          />
        </section>

        {/* ── Amplificadores ── */}
        <section className="card">
          <div className="flex items-center justify-between mb-4">
            <SectionTitle>Amplificadores</SectionTitle>
            <button
              type="button"
              onClick={addAmplifier}
              className="flex items-center gap-1.5 text-xs font-medium text-tormenta-red hover:text-tormenta-red-dark transition-colors -mt-4"
            >
              <Plus size={13} />
              Adicionar amplificador
            </button>
          </div>

          {amplifiers.length === 0 ? (
            <p className="text-sm text-stone-400 text-center py-3">
              Nenhum amplificador adicionado.
            </p>
          ) : (
            <div className="space-y-3">
              {amplifiers.map((amp, i) => (
                <div
                  key={i}
                  className="flex gap-3 items-start border border-stone-100 rounded-lg p-3 bg-stone-50/60"
                >
                  {/* Cost + Truque toggle */}
                  <div className="w-[88px] shrink-0">
                    <Label>Custo (PM)</Label>
                    {amp.isTrick ? (
                      <div className="w-full px-2 py-1.5 text-sm text-stone-400 bg-stone-100 border border-stone-200 rounded-lg text-center select-none">
                        0 PM
                      </div>
                    ) : (
                      <input
                        type="number"
                        min={1}
                        max={99}
                        value={amp.cost}
                        onChange={e => updateAmplifier(i, 'cost', e.target.value)}
                        placeholder="2"
                        className="w-full px-2 py-1.5 text-sm border border-stone-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-tormenta-red focus:border-tormenta-red"
                      />
                    )}
                    <label className="flex items-center gap-1 mt-1.5">
                      <input
                        type="checkbox"
                        checked={amp.isTrick}
                        onChange={e => {
                          const checked = e.target.checked
                          updateAmplifier(i, 'isTrick', checked)
                          if (checked) updateAmplifier(i, 'cost', '0')
                        }}
                        className="rounded border-stone-300 accent-tormenta-red"
                      />
                      <span className="text-xs text-stone-500">Truque</span>
                    </label>
                  </div>

                  {/* Effect */}
                  <div className="flex-1">
                    <Label>Efeito</Label>
                    <textarea
                      rows={2}
                      value={amp.effect}
                      onChange={e => updateAmplifier(i, 'effect', e.target.value)}
                      placeholder="Descreva o amplificador…"
                      className="w-full px-2 py-1.5 text-sm border border-stone-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-tormenta-red focus:border-tormenta-red resize-none"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => removeAmplifier(i)}
                    className="mt-5 text-stone-300 hover:text-red-500 transition-colors"
                    aria-label="Remover amplificador"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ── Visibilidade ── */}
        <label className="flex items-center gap-2 select-none">
          <input
            type="checkbox"
            checked={form.isPublic}
            onChange={e => setField('isPublic', e.target.checked)}
            className="rounded border-stone-300 accent-tormenta-red"
          />
          <span className="text-sm text-stone-600">Magia pública (visível para todos)</span>
        </label>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-4 py-3">
            {error}
          </p>
        )}

        {/* ── Actions ── */}
        <div className="flex gap-3 justify-end pb-4">
          <Link to="/magias" className="btn-secondary">
            Cancelar
          </Link>
          <button type="submit" disabled={saving} className="btn-primary disabled:opacity-60">
            {saving
              ? (isEdit ? 'Salvando…' : 'Criando…')
              : (isEdit ? 'Atualizar magia' : 'Criar magia')}
          </button>
        </div>
      </form>
    </div>
  )
}
