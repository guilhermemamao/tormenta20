export type { SpellType, SpellSchool, Amplifier, Spell } from '../types'
import type { Spell } from '../types'


export const CONDITION_DEFS: Record<string, { title: string; definition: string }> = {
  'camuflagem': {
    title: 'Camuflagem',
    definition:
      'Uma criatura com camuflagem tem 20% de chance de não ser afetada por ataques. Antes de atacar, o atacante rola 1d% — em um resultado de 1 a 20 o ataque erra automaticamente, mesmo que o teste de ataque indique acerto. A camuflagem não protege contra magias que não requerem teste de ataque.',
  },
  'camuflagem total': {
    title: 'Camuflagem Total',
    definition:
      'Uma criatura com camuflagem total tem 50% de chance de não ser afetada por ataques (resultado 1–50 no 1d%). Além disso, o atacante precisa adivinhar em qual espaço a criatura está antes de atacar; escolher o espaço errado faz o ataque falhar automaticamente.',
  },
  'flanqueado': {
    title: 'Flanqueado',
    definition:
      'Uma criatura está flanqueada quando pelo menos dois inimigos a ameaçam de lados opostos (ou em diagonal oposta). Ataques de corpo a corpo contra uma criatura flanqueada recebem +2 no teste de ataque.',
  },
  'desprevenido': {
    title: 'Desprevenido',
    definition:
      'Uma criatura desprevenida não está ciente dos atacantes ao seu redor. Ela perde o bônus de Destreza na Defesa e não pode realizar ataques de oportunidade. Uma criatura está desprevenida no início do combate até realizar sua primeira ação.',
  },
}

export const SPELLS: Spell[] = [
  {
    name: 'Bênção',
    type: 'Divina',
    school: 'Encantamento',
    circle: 1,
    execution: 'Padrão',
    range: 'Curto',
    duration: 'Cena',
    target: 'Você e aliados em alcance',
    resistance: '—',
    publication: 'Tormenta20, p. 183',
    effect:
      'Você e todos os aliados em alcance ficam sob efeito de bênção. Criaturas abençoadas recebem +1 em rolagens de ataque e salvaguardas.',
    amplifiers: [
      { cost: 2, effect: 'O bônus de bênção aumenta para +2.' },
      { cost: 2, effect: 'O alcance aumenta para médio.' },
      { cost: 5, effect: 'Você pode lançar esta magia como ação livre.' },
    ],
  },
  {
    name: 'Curar Ferimentos',
    type: 'Divina',
    school: 'Transmutação',
    circle: 1,
    execution: 'Padrão',
    range: 'Toque',
    duration: 'Instantânea',
    target: '1 criatura',
    resistance: '—',
    publication: 'Tormenta20, p. 186',
    effect:
      'O alvo recupera 1d8 + modificador de Sabedoria em pontos de vida. Em mortos-vivos, em vez de curar, a magia causa o mesmo valor de dano (sem resistência).',
    amplifiers: [
      { cost: 2, effect: 'A cura aumenta em +1d8.' },
      { cost: 5, effect: 'Você pode lançar esta magia com alcance curto.' },
    ],
  },
  {
    name: 'Névoa',
    type: 'Arcana',
    school: 'Ilusão',
    circle: 1,
    execution: 'Padrão',
    range: 'Médio',
    duration: 'Sustentada',
    target: 'Esfera com 3m de raio',
    resistance: '—',
    publication: 'Tormenta20, p. 196',
    effect:
      'Uma névoa espessa surge em um ponto que você determina dentro do alcance. A névoa concede camuflagem total a todas as criaturas dentro da área. Ventos fortes (naturais ou mágicos) dissipam a névoa instantaneamente.',
    amplifiers: [
      { cost: 2, effect: 'Aumenta a área para uma esfera com 6m de raio.' },
      { cost: 2, effect: 'Aumenta o alcance para longo.' },
      { cost: 5, effect: 'Você pode mover a névoa até 6m por rodada como ação livre.' },
    ],
  },
  {
    name: 'Comando',
    type: 'Universal',
    school: 'Encantamento',
    circle: 1,
    execution: 'Padrão',
    range: 'Curto',
    duration: 'Rodada',
    target: '1 criatura',
    resistance: 'Vontade anula',
    publication: 'Tormenta20, p. 185',
    effect:
      'Você ordena um alvo com uma única palavra (exemplos: fuja, caia, para). O alvo fica desprevenido por um instante e deve seguir a ordem na sua próxima ação. Criaturas imunes a encantamentos ou que não entendam o idioma são automaticamente imunes.',
    amplifiers: [
      { cost: 2, effect: 'Você pode lançar em um alvo adicional.' },
      { cost: 3, effect: 'A duração aumenta para cena.' },
    ],
  },
  {
    name: 'Despedaçar',
    type: 'Arcana',
    school: 'Transmutação',
    circle: 2,
    execution: 'Padrão',
    range: 'Curto',
    duration: 'Instantânea',
    target: '1 objeto ou criatura',
    resistance: 'Fortitude parcial',
    publication: 'Tormenta20, p. 187',
    effect:
      'Você destrói completamente um objeto não mágico de até 5 kg, ou causa 4d6 de dano de impacto em uma criatura. Fortitude reduz o dano à metade.',
    amplifiers: [
      { cost: 2, effect: 'Aumenta o dano em +2d6.' },
      { cost: 2, effect: 'Pode afetar objetos mágicos (CD +5 para a salvaguarda).' },
    ],
  },
  {
    name: 'Futuro Melhor',
    type: 'Divina',
    school: 'Adivinhação',
    circle: 2,
    execution: 'Padrão',
    range: 'Pessoal',
    duration: 'Cena',
    target: 'Você',
    resistance: '—',
    publication: 'Tormenta20, p. 191',
    effect:
      'Você vislumbra os possíveis futuros imediatos. Uma vez antes do fim da cena, você pode rolar dois dados para qualquer teste e usar o melhor resultado.',
    amplifiers: [
      { cost: 3, effect: 'Você pode usar o benefício duas vezes.' },
      { cost: 5, effect: 'O alcance aumenta para toque; você pode afetar um aliado.' },
    ],
  },
]
