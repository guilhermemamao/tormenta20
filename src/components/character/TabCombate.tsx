import { Plus, Trash2 } from 'lucide-react'
import type { Character } from '../../types'
import { INP_CARD, fmtMod } from './characterHelpers'

interface TabCombateProps {
  char: Character
  addAttack: () => void
  removeAttack: (i: number) => void
  patchAttack: (i: number, field: string, value: string | number) => void
  defTotal: number
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
          : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-100">
                  {['Ataque', 'Bônus', 'Dano', 'Crítico', 'Tipo', 'Alcance', ''].map(h => (
                    <th key={h} className="pb-2 text-[10px] font-semibold text-stone-400 text-left last:w-6">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {char.attacks.map((atk, i) => (
                  <tr key={i} className="border-b border-stone-50 last:border-0">
                    {(['name','bonus','damage','critical','type','range'] as const).map(field => (
                      <td key={field} className="py-1.5 pr-2">
                        <input
                          type={field === 'bonus' ? 'number' : 'text'}
                          value={atk[field]}
                          onChange={e => patchAttack(i, field, field === 'bonus' ? parseInt(e.target.value) || 0 : e.target.value)}
                          className={`${INP_CARD} ${field === 'bonus' ? 'w-14 text-center' : field === 'name' ? 'min-w-[120px]' : 'min-w-[70px]'}`}
                        />
                      </td>
                    ))}
                    <td className="py-1.5">
                      <button onClick={() => removeAttack(i)} className="text-stone-300 hover:text-red-500">
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
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
