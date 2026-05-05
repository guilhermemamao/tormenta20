import type { CSSProperties } from 'react'
import type { Character } from '../../types'
import {
  ALL_SKILLS, ATTR_CONFIG, DEFAULT_SKILL,
  fmtMod, fmtBonus, calcSkillTotal,
} from './characterHelpers'

interface TabPericiasProps {
  char: Character
  level: number
  toggleSkill: (name: string) => void
  patchSkill: (name: string, field: 'training' | 'outros', value: number) => void
}

export default function TabPericias({ char, level, toggleSkill, patchSkill }: TabPericiasProps) {
  const abbr = Object.fromEntries(ATTR_CONFIG.map(a => [a.key, a.abbr]))
  const halfLevel = Math.floor(level / 2)

  const ICON_STYLE: CSSProperties = { filter: 'grayscale(1) opacity(0.45)', fontSize: '0.55rem' }

  const ROW_COLS = '12px 100px 22px 28px 28px 28px 34px 32px'
  const ROW_GRID: CSSProperties = {
    display: 'grid',
    gridTemplateColumns: ROW_COLS,
    alignItems: 'center',
    columnGap: '3px',
  }

  const HDR = 'text-[9px] font-semibold uppercase tracking-wider text-stone-400'
  const VAL = 'text-[11px] tabular-nums text-stone-400 text-center'
  const NUM_INPUT = 'w-full text-center text-[11px] border border-stone-200 rounded px-0 py-0.5 bg-stone-50 focus:outline-none focus:ring-1 focus:ring-tormenta-red'

  const sortedSkills = [...ALL_SKILLS].sort((a, b) => a.name.localeCompare(b.name, 'pt'))

  function HeaderRow() {
    return (
      <div style={ROW_GRID} className="border-b border-stone-200 pb-1.5">
        <div />
        <div className={`${HDR} text-left`}>Perícia</div>
        <div />
        <div className={`${HDR} text-center`}>½N</div>
        <div className={`${HDR} text-center`}>ATR</div>
        <div className={`${HDR} text-center`}>TRE</div>
        <div className={`${HDR} text-center`}>OUT</div>
        <div className={`${HDR} text-right`}>TOT</div>
      </div>
    )
  }

  return (
    <div className="card">
      <h3 className="font-display text-[11px] font-semibold uppercase tracking-widest text-stone-400 mb-3">
        Perícias
      </h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
        <HeaderRow />
        <div className="hidden sm:block"><HeaderRow /></div>

        {sortedSkills.map(skill => {
          const sk       = char.skills[skill.name] ?? DEFAULT_SKILL
          const aVal     = char.attributes[skill.attr]
          const armorPen = skill.armorPenalty ? char.defense.penalty : 0
          const total    = calcSkillTotal(aVal, sk, level, skill.trainedOnly, armorPen)
          const inactive = skill.trainedOnly && !sk.trained

          return (
            <div key={skill.name} style={ROW_GRID} className="border-b border-stone-50 py-px">
              <input
                type="checkbox" checked={sk.trained}
                onChange={() => toggleSkill(skill.name)}
                className="rounded border-stone-300 accent-tormenta-red"
              />

              <div
                style={{ width: '100px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                className={`text-[11px] ${sk.trained ? 'font-semibold text-stone-800' : 'text-stone-500'}`}
                title={skill.name}
              >
                {skill.name}
                {skill.trainedOnly  && <span className="ml-0.5" style={ICON_STYLE}>⭐</span>}
                {skill.armorPenalty && <span className="ml-0.5" style={ICON_STYLE}>🛡</span>}
              </div>

              <div className="text-[8px] text-stone-300 text-center">{abbr[skill.attr]}</div>

              <div className={`${VAL} ${inactive ? 'opacity-30' : ''}`}>{fmtBonus(halfLevel)}</div>

              <div className={`${VAL} ${inactive ? 'opacity-30' : ''}`}>{fmtMod(aVal)}</div>

              <div className={`${VAL} ${inactive ? 'opacity-30' : ''}`}>{sk.trained ? `+${level >= 15 ? 6 : level >= 7 ? 4 : 2}` : '0'}</div>

              <input
                type="number" value={sk.outros} disabled={inactive}
                onChange={e => patchSkill(skill.name, 'outros', parseInt(e.target.value) || 0)}
                className={`${NUM_INPUT} ${inactive ? 'opacity-30 cursor-not-allowed' : ''}`}
              />

              <div className={`text-right text-xs font-bold tabular-nums whitespace-nowrap shrink-0 ${
                inactive ? 'text-stone-300' : sk.trained ? 'text-tormenta-red' : 'text-stone-500'
              }`}>
                {fmtBonus(total)}
              </div>
            </div>
          )
        })}
      </div>

      <p className="text-[10px] text-stone-400 text-center mt-3 pt-2 border-t border-stone-100">
        <span style={ICON_STYLE}>⭐</span> somente treinado &nbsp;·&nbsp; <span style={ICON_STYLE}>🛡</span> penalidade de armadura
      </p>
    </div>
  )
}
