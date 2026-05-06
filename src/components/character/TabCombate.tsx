import { useState } from 'react'
import { Plus, Trash2, ChevronDown, Dice6, Dices, Zap } from 'lucide-react'
import type { Character, Attack } from '../../types'
import { fmtMod, ATTR_CONFIG, calcSkillTotal, ALL_SKILLS, DEFAULT_SKILL } from './characterHelpers'

interface TabCombateProps {
  char: Character
  addAttack: () => void
  removeAttack: (i: number) => void
  patchAttack: (i: number, field: string, value: string | number | string[]) => void
  defTotal: number
}

function DiceField({ value = '', onChange }: { value?: string; onChange: (v: string) => void }) {
  const safe = value ?? ''
  const match = safe.match(/^(\d+)?\s*(D\d+)?$/i)
  const qty = match?.[1] ?? '1'
  const die = safe === '' ? '—' : (match?.[2]?.toUpperCase() ?? 'D6')

  return (
    <div className="flex items-center gap-0.5">
      <input
        type="number" min={1} max={99} value={qty}
        onChange={e => die === '—' ? onChange('') : onChange(`${e.target.value}${die}`)}
        className="w-8 text-center text-xs bg-stone-50 border border-stone-200 rounded-l px-1 py-1 focus:outline-none focus:ring-1 focus:ring-tormenta-red"
      />
      <select
        value={die}
        onChange={e => e.target.value === '—' ? onChange('') : onChange(`${qty}${e.target.value}`)}
        className="text-xs bg-stone-50 border border-stone-200 border-l-0 rounded-r px-1 py-1 focus:outline-none focus:ring-1 focus:ring-tormenta-red"
      >
        <option value="—">—</option>
        {['D4', 'D6', 'D8', 'D10', 'D12', 'D20'].map(d => <option key={d}>{d}</option>)}
      </select>
    </div>
  )
}

function AttackCard({ atk, i, char, charEquipment, patchAttack, removeAttack }: {
  atk: Attack
  i: number
  char: Character
  charEquipment: Character['equipment']
  patchAttack: (i: number, field: string, value: string | number | string[]) => void
  removeAttack: (i: number) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [showHit, setShowHit] = useState(false)
  const [weaponSuggestions, setWeaponSuggestions] = useState<Character['equipment']>([])
  const [showWeaponSug, setShowWeaponSug] = useState(false)

  const safeAtk = {
    name:             atk.name,
    attackName:       atk.attackName       ?? '',
    weaponType:       atk.weaponType       ?? '',
    range:            atk.range,
    damageDie:        atk.damageDie        ?? '',
    damageDice:       atk.damageDice,
    companionDie:     atk.companionDie     ?? '',
    bonusDie:         atk.bonusDie         ?? '',
    attrBonus:        atk.attrBonus        ?? 'str',
    fixedBonus:       atk.fixedBonus       ?? 0,
    styleBonus:       atk.styleBonus       ?? 0,
    tempBonus:        atk.tempBonus        ?? 0,
    penalty:          atk.penalty          ?? 0,
    threatRange:      atk.threatRange      ?? 20,
    critMultiplier:   atk.critMultiplier   ?? '2x',
    hitDie:           atk.hitDie           ?? 'D20',
    hitBonus:         atk.hitBonus         ?? 0,
    hitBonusDie:      atk.hitBonusDie      ?? '',
    skillBonus:       atk.skillBonus       ?? 'Luta',
    hitTempBonus:     atk.hitTempBonus     ?? 0,
    hitPersonalBonus: atk.hitPersonalBonus ?? 0,
    hitFixedBonus:    atk.hitFixedBonus    ?? 0,
    hitPenalty:       atk.hitPenalty       ?? 0,
  }

  const attrKey = safeAtk.attrBonus as keyof Character['attributes']
  const attrModValue = Math.floor(((char.attributes[attrKey] ?? 10) - 10) / 2)
  const damageTotal = attrModValue + safeAtk.fixedBonus + safeAtk.styleBonus + safeAtk.tempBonus - Math.abs(safeAtk.penalty)

  const level = Math.max(1, (char.classes ?? []).reduce((s: number, c: { level: number }) => s + c.level, 0))

  const skillName = safeAtk.skillBonus ?? 'Luta'
  const skillDef = ALL_SKILLS.find(s => s.name === skillName) ?? ALL_SKILLS.find(s => s.name === 'Luta')!
  const skillKey = skillName.toLowerCase()
  const skillEntry = char.skills?.[skillKey] ?? DEFAULT_SKILL
  const skillAttrVal = char.attributes[skillDef.attr] ?? 10
  const hitSkillMod = calcSkillTotal(skillAttrVal, skillEntry, level, skillDef.trainedOnly, 0)

  const hitTotal = hitSkillMod + safeAtk.hitTempBonus + safeAtk.hitPersonalBonus + safeAtk.hitFixedBonus - Math.abs(safeAtk.hitPenalty)

  const dice = safeAtk.damageDice ?? (safeAtk.damageDie ? [safeAtk.damageDie] : [''])

  const inp = (field: keyof typeof safeAtk, type: 'text' | 'number' = 'text', className = '') => (
    <input
      type={type}
      value={safeAtk[field] as string | number}
      onChange={e => patchAttack(i, field, type === 'number' ? (parseInt(e.target.value) || 0) : e.target.value)}
      className={`bg-stone-50 border border-stone-200 rounded px-1 py-0.5 text-xs text-center focus:outline-none focus:ring-1 focus:ring-tormenta-red ${className}`}
    />
  )

  function handleWeaponChange(val: string) {
    patchAttack(i, 'name', val)
    if (val.length >= 2) {
      const q = val.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
      setWeaponSuggestions(
        charEquipment
          .filter(e => e.category === 'arma' &&
            e.name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').includes(q))
          .slice(0, 5)
      )
      setShowWeaponSug(true)
    } else {
      setWeaponSuggestions([])
      setShowWeaponSug(false)
    }
  }

  return (
    <div className="border border-stone-200 rounded-xl overflow-hidden mb-3">
      {/* Header clicável — sempre visível */}
      <div
        className="flex items-center justify-between px-3 py-2.5 bg-stone-50 border-b border-stone-100 cursor-pointer hover:bg-stone-100 transition-colors"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <ChevronDown size={13} className={`text-stone-400 shrink-0 transition-transform ${expanded ? '' : '-rotate-90'}`} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-stone-800 truncate">
                {safeAtk.attackName || safeAtk.name || 'Novo ataque'}
              </p>
              {safeAtk.name && safeAtk.attackName && (
                <p className="text-[10px] text-stone-400 truncate">{safeAtk.name}</p>
              )}
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {safeAtk.weaponType && <span className="text-[10px] text-stone-500 bg-stone-100 px-1.5 py-0.5 rounded">{safeAtk.weaponType}</span>}
              {safeAtk.range && <span className="text-[10px] text-stone-500 bg-stone-100 px-1.5 py-0.5 rounded">{safeAtk.range}</span>}
              <span className="text-sm font-bold text-tormenta-red ml-1">{damageTotal >= 0 ? '+' : ''}{damageTotal}</span>
            </div>
          </div>
        </div>
        <button
          onClick={e => { e.stopPropagation(); removeAttack(i) }}
          className="text-stone-300 hover:text-red-500 ml-2 shrink-0"
        >
          <Trash2 size={13} />
        </button>
      </div>

      {/* Conteúdo expansível */}
      <div className={`grid transition-all duration-200 ${expanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
        <div className="overflow-hidden">

          {/* Campos de nome e arma */}
          <div className="px-3 pt-3 pb-2 flex flex-col gap-1 border-b border-stone-100">
            <input
              value={safeAtk.attackName}
              onChange={e => patchAttack(i, 'attackName', e.target.value)}
              placeholder="Nome do ataque (ex: Golpe Poderoso)"
              className="text-sm font-bold bg-transparent border-b border-stone-200 focus:outline-none focus:border-tormenta-red placeholder:text-stone-300 w-full"
            />
            <div className="flex gap-2 items-center relative">
              <div className="flex-1 min-w-0 relative">
                <input
                  value={safeAtk.name}
                  onChange={e => handleWeaponChange(e.target.value)}
                  onBlur={() => setTimeout(() => setShowWeaponSug(false), 150)}
                  placeholder="Arma (ex: Espada Longa)"
                  className="text-xs text-stone-500 bg-transparent border-b border-blue-100 focus:outline-none focus:border-blue-300 placeholder:text-stone-300 w-full"
                />
                {showWeaponSug && weaponSuggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 bg-white border border-stone-200 rounded-lg shadow-md z-10 mt-0.5">
                    {weaponSuggestions.map((equip, si) => (
                      <button
                        key={si}
                        type="button"
                        onPointerDown={() => {
                          patchAttack(i, 'name', equip.name)
                          setShowWeaponSug(false)
                        }}
                        className="w-full text-left px-3 py-1.5 text-xs text-stone-700 hover:bg-stone-50"
                      >
                        {equip.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <select
                value={safeAtk.weaponType}
                onChange={e => patchAttack(i, 'weaponType', e.target.value)}
                className="text-[10px] border border-stone-200 bg-white rounded px-1 py-0.5 text-stone-600 focus:outline-none shrink-0"
              >
                <option value="">Tipo</option>
                {['Cortante', 'Perfurante', 'Contundente'].map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              <select
                value={safeAtk.range}
                onChange={e => patchAttack(i, 'range', e.target.value)}
                className="text-[10px] border border-stone-200 bg-white rounded px-1 py-0.5 text-stone-600 focus:outline-none shrink-0"
              >
                {['Melee', 'Curto', 'Médio', 'Longo'].map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
          </div>

          {/* DANO */}
          <div className="px-3 py-2">
            {/* Header DANO com total inline */}
            <div className="flex items-center justify-between bg-stone-100 px-3 py-1.5 -mx-3 mb-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-stone-600">⚔️ DANO</p>
              <div className="text-right">
                <p className="text-[8px] text-stone-400 uppercase tracking-wider">Total bônus</p>
                <p className={`text-sm font-bold ${damageTotal >= 0 ? 'text-tormenta-red' : 'text-red-800'}`}>
                  {damageTotal >= 0 ? '+' : ''}{damageTotal}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 items-end">
              {/* Rolagens */}
              <div className="space-y-1">
                <p className="text-[8px] uppercase tracking-wider text-stone-300 font-semibold">
                  <Dices size={10} className="inline mr-1" />Rolagens
                </p>
                <div className="flex gap-1.5 items-end flex-wrap">
                  <div className="text-center">
                    <p className="text-[8px] text-stone-400 mb-0.5">Arma</p>
                    <div className="flex items-center gap-0.5 flex-wrap">
                      {dice.map((d, di) => (
                        <div key={di} className="flex items-center gap-0.5">
                          {di > 0 && <span className="text-stone-300 text-xs">+</span>}
                          <DiceField value={d} onChange={v => {
                            const newDice = [...dice]; newDice[di] = v
                            patchAttack(i, 'damageDice', newDice)
                          }} />
                          {di > 0 && (
                            <button type="button" onClick={() =>
                              patchAttack(i, 'damageDice', dice.filter((_, j) => j !== di))
                            } className="text-stone-300 hover:text-red-400 text-xs">✕</button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                  <span className="text-stone-300 text-xs">+</span>
                  <div className="text-center">
                    <p className="text-[8px] text-stone-400 mb-0.5">Companheiro</p>
                    <DiceField value={safeAtk.companionDie} onChange={v => patchAttack(i, 'companionDie', v)} />
                  </div>
                  <span className="text-stone-300 text-xs">+</span>
                  <div className="text-center">
                    <p className="text-[8px] text-stone-400 mb-0.5">Habilidades/Magias</p>
                    <DiceField value={safeAtk.bonusDie} onChange={v => patchAttack(i, 'bonusDie', v)} />
                  </div>
                  <button
                    type="button"
                    onClick={() => patchAttack(i, 'damageDice', [...dice, ''])}
                    className="flex items-center gap-0.5 text-[10px] text-tormenta-red hover:text-red-800 font-medium self-end pb-1"
                    title="Adicionar dado extra"
                  >
                    <Plus size={10} /> dado
                  </button>
                </div>
              </div>

              <div className="h-8 w-px bg-stone-100 hidden sm:block" />

              {/* Aditivos */}
              <div className="space-y-1">
                <p className="text-[8px] uppercase tracking-wider text-stone-300 font-semibold">
                  <Plus size={10} className="inline mr-1" />Aditivos
                </p>
                <div className="flex gap-1.5 items-center flex-wrap">
                  <div className="text-center">
                    <p className="text-[8px] text-amber-500 mb-0.5">Atributo</p>
                    <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1.5">
                      <p className={`text-xl font-bold ${attrModValue >= 0 ? 'text-amber-600' : 'text-amber-800'}`}>
                        {attrModValue >= 0 ? '+' : ''}{attrModValue}
                      </p>
                      <select
                        value={safeAtk.attrBonus}
                        onChange={e => patchAttack(i, 'attrBonus', e.target.value)}
                        className="text-xs border-0 bg-transparent text-amber-700 focus:outline-none font-semibold"
                      >
                        {ATTR_CONFIG.map(a => <option key={a.key} value={a.key}>{a.abbr}</option>)}
                      </select>
                    </div>
                  </div>
                  <span className="text-stone-300 text-xs">+</span>
                  <div className="text-center">
                    <p className="text-[8px] text-stone-400 mb-0.5">Fixo</p>
                    {inp('fixedBonus', 'number', 'w-8')}
                  </div>
                  <span className="text-stone-300 text-xs">+</span>
                  <div className="text-center">
                    <p className="text-[8px] text-stone-400 mb-0.5">Estilo</p>
                    {inp('styleBonus', 'number', 'w-8')}
                  </div>
                  <span className="text-stone-300 text-xs">+</span>
                  <div className="text-center">
                    <p className="text-[8px] text-stone-400 mb-0.5">Temporário</p>
                    {inp('tempBonus', 'number', 'w-8')}
                  </div>
                  <span className="text-stone-300 text-xs">−</span>
                  <div className="text-center">
                    <p className="text-[8px] text-red-400 mb-0.5 font-semibold">Penalidade</p>
                    <input
                      type="number"
                      value={safeAtk.penalty}
                      onChange={e => patchAttack(i, 'penalty', parseInt(e.target.value) || 0)}
                      className="bg-stone-50 border border-red-200 rounded px-1 py-0.5 text-xs text-center focus:outline-none focus:ring-1 focus:ring-tormenta-red w-8 bg-red-50 text-red-700"
                    />
                  </div>
                </div>
              </div>

              <div className="h-8 w-px bg-stone-100 hidden sm:block" />

              {/* Crítico */}
              <div className="space-y-1">
                <p className="text-[8px] uppercase tracking-wider text-stone-300 font-semibold">
                  <Zap size={10} className="inline mr-1" />Crítico
                </p>
                <div className="flex gap-1.5 items-center">
                  <div className="text-center">
                    <p className="text-[8px] text-stone-400 mb-0.5">Ameaça (D20 = crítico)</p>
                    <input
                      type="number"
                      value={safeAtk.threatRange}
                      onChange={e => patchAttack(i, 'threatRange', parseInt(e.target.value) || 0)}
                      placeholder="ex: 19"
                      className="bg-stone-50 border border-stone-200 rounded px-1 py-0.5 text-xs text-center focus:outline-none focus:ring-1 focus:ring-tormenta-red w-8"
                    />
                  </div>
                  <span className="text-stone-300 text-xs">×</span>
                  <div className="text-center">
                    <p className="text-[8px] text-stone-400 mb-0.5">Multiplicador</p>
                    {inp('critMultiplier', 'text', 'w-8')}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Toggle rolagem de acerto — com bônus total inline */}
          <button
            type="button"
            onClick={() => setShowHit(h => !h)}
            className="w-full flex items-center justify-between px-3 py-2 text-xs font-bold uppercase tracking-wider text-stone-500 hover:text-tormenta-red bg-stone-100 border-t border-stone-200 transition-colors"
          >
            <div className="flex items-center gap-2">
              🎯 ROLAGEM DE ACERTO
              <ChevronDown size={12} className={`transition-transform duration-150 ${showHit ? 'rotate-180' : ''}`} />
            </div>
            <div className="text-right">
              <p className="text-[8px] text-stone-400 uppercase tracking-wider normal-case">Bônus total</p>
              <p className="text-sm font-bold text-tormenta-red">
                {hitTotal >= 0 ? '+' : ''}{hitTotal}
              </p>
            </div>
          </button>

          {/* ROLAGEM DE ACERTO — expansível */}
          <div className={`grid transition-all duration-200 ${showHit ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
            <div className="overflow-hidden">
              <div className="px-3 py-3 border-t border-stone-100 bg-stone-50/50 space-y-3">

                {/* D20 + Perícia + Dado Habilidades */}
                <div className="flex flex-wrap gap-3 items-end">
                  <div className="text-center">
                    <p className="text-[8px] text-stone-400 mb-0.5">Dado</p>
                    <div className="text-xs font-bold text-stone-600 bg-stone-100 rounded px-2 py-1">D20</div>
                  </div>
                  <span className="text-stone-300 text-xs">+</span>
                  <div className="text-center">
                    <p className="text-[8px] text-amber-500 mb-0.5">Perícia</p>
                    <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1.5">
                      <p className="text-xl font-bold text-amber-600">
                        {hitSkillMod >= 0 ? '+' : ''}{hitSkillMod}
                      </p>
                      <select
                        value={safeAtk.skillBonus}
                        onChange={e => patchAttack(i, 'skillBonus', e.target.value)}
                        className="text-xs border-0 bg-transparent text-amber-700 focus:outline-none font-semibold"
                      >
                        {['Luta', 'Pontaria', 'Artilharia'].map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <span className="text-stone-300 text-xs">+</span>
                  <div className="text-center">
                    <p className="text-[8px] text-stone-400 mb-0.5">Habilidades/Itens</p>
                    <DiceField value={safeAtk.hitBonusDie} onChange={v => patchAttack(i, 'hitBonusDie', v)} />
                  </div>
                </div>

                {/* Buffs fixos + temporários — amber box lado a lado */}
                <div className="border border-amber-200 rounded-lg p-2 bg-amber-50/30">
                  <div className="flex flex-wrap gap-3 items-end">
                    <div>
                      <p className="text-[7px] uppercase tracking-wider text-amber-500 font-semibold mb-1">Buffs Fixos</p>
                      <div className="flex gap-2 items-end">
                        <div className="text-center">
                          <p className="text-[8px] text-stone-400 mb-0.5">Externos</p>
                          {inp('hitTempBonus', 'number', 'w-8')}
                        </div>
                        <span className="text-stone-300 text-xs">+</span>
                        <div className="text-center">
                          <p className="text-[8px] text-stone-400 mb-0.5">Pessoais</p>
                          {inp('hitPersonalBonus', 'number', 'w-8')}
                        </div>
                      </div>
                    </div>
                    <div className="h-8 w-px bg-amber-200" />
                    <div>
                      <p className="text-[7px] uppercase tracking-wider text-amber-500 font-semibold mb-1">Buffs Temporários</p>
                      <div className="text-center">
                        <p className="text-[8px] text-stone-400 mb-0.5">Item/Habilidade</p>
                        {inp('hitFixedBonus', 'number', 'w-8')}
                      </div>
                    </div>
                    <div className="h-8 w-px bg-amber-200" />
                    <div className="text-center">
                      <p className="text-[8px] text-red-400 mb-0.5 font-semibold">Penalidade</p>
                      <input
                        type="number"
                        value={safeAtk.hitPenalty}
                        onChange={e => patchAttack(i, 'hitPenalty', parseInt(e.target.value) || 0)}
                        className="bg-stone-50 border border-red-200 rounded px-1 py-0.5 text-xs text-center focus:outline-none focus:ring-1 focus:ring-tormenta-red w-8 bg-red-50 text-red-700"
                      />
                    </div>
                  </div>
                </div>

                {/* Botão rolar */}
                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    disabled
                    title="Em breve: rolagem automática"
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-100 text-stone-400 rounded-lg text-xs font-medium cursor-not-allowed opacity-60"
                  >
                    <Dice6 size={14} />
                    Rolar D20
                  </button>
                </div>

              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}

export default function TabCombate({ char, addAttack, removeAttack, patchAttack, defTotal }: TabCombateProps) {
  return (
    <div className="space-y-5">
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-[11px] font-semibold uppercase tracking-widest text-stone-400">Ataques</h3>
          <button onClick={addAttack} className="flex items-center gap-1 text-xs text-tormenta-red hover:text-tormenta-red-dark font-medium">
            <Plus size={13} /> Adicionar ataque
          </button>
        </div>
        {char.attacks.length === 0
          ? <p className="text-sm text-stone-400 text-center py-6">Nenhum ataque cadastrado</p>
          : char.attacks.map((atk, i) => (
              <AttackCard
                key={i} atk={atk} i={i}
                char={char} charEquipment={char.equipment}
                patchAttack={patchAttack} removeAttack={removeAttack}
              />
            ))
        }
      </div>

      <div className="card">
        <h3 className="font-display text-[11px] font-semibold uppercase tracking-widest text-stone-400 mb-3">
          Defesa — Total: <span className="text-tormenta-red text-lg font-bold">{defTotal}</span>
        </h3>
        <p className="text-xs text-stone-400">
          10 + DES ({fmtMod(char.attributes.dex)}) + Armadura (+{char.defense.armor}) + Escudo (+{char.defense.shield}) + Outros (+{char.defense.other})
        </p>
        {char.defense.penalty !== 0 && (
          <p className="text-xs text-amber-600 mt-1">
            Penalidade de armadura: {char.defense.penalty} (★ aplicada nas perícias marcadas)
          </p>
        )}
      </div>
    </div>
  )
}
