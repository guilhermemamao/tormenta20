export interface SkillEntry {
  trained: boolean
  training: number
  outros: number
  notes?: string
}

export interface Amplifier {
  cost: number
  effect: string
  isTrick?: boolean
  requiresCircle?: number
  requiresDevotee?: string
}

export interface Spell {
  id?: string
  name: string
  type: 'Arcana' | 'Divina' | 'Universal'
  circle: number
  school: 'Abjuração' | 'Adivinhação' | 'Convocação' | 'Encantamento' | 'Evocação' | 'Ilusão' | 'Necromancia' | 'Transmutação'
  execution: string
  range: string
  duration: string
  target: string
  resistance: string
  publication: string
  effect: string
  amplifiers: Amplifier[]
  isPublic?: boolean
  createdBy?: string
}

// Derived union types kept para compatibilidade com imports existentes
export type SpellType = Spell['type']
export type SpellSchool = Spell['school']

export interface Power {
  id?: string
  name: string
  description: string
  prerequisites: {
    level?: number
    powers?: string[]
    other?: string
  }
  source: string
}

export interface Race {
  id?: string
  name: string
  publication: string
  attributeBonus: string
  abilities: {
    name: string
    description: string
  }[]
}

export interface OriginBenefit {
  name: string
  type: 'skill' | 'power' | 'special'
  description?: string
}

export interface Origin {
  id?: string
  name: string
  publication: string
  startingItems: string
  benefits: OriginBenefit[]
  choiceCount: number
  specialAbilities: {
    name: string
    description: string
  }[]
}

export interface CharacterClass {
  id?: string
  name: string
  publication: string
  hitPoints: string
  manaPoints: string
  skills: string[]
  proficiencies: string[]
  progressionTable: {
    level: number
    features: string[]
  }[]
}

export interface Attack {
  name: string
  bonus: number
  damage: string
  critical: string
  type: string
  range: string
}

export interface CharacterSpell {
  spellId: string
  spellName: string
  circle: number
  school: string
  type: string
}

export interface CharacterPower {
  powerId: string
  powerName: string
  level: number
  description?: string
}

export interface Character {
  id?: string
  name: string
  player: string
  race: string
  origin: string
  classes: {
    name: string
    level: number
  }[]
  deity: string
  size: string
  movement: number
  xp: number
  attributes: {
    str: number
    dex: number
    con: number
    int: number
    wis: number
    cha: number
  }
  hp: { max: number; current: number }
  mp: { max: number; current: number }
  attacks: Attack[]
  defense: {
    base: number
    armor: number
    shield: number
    other: number
    penalty: number
  }
  skills: Record<string, SkillEntry>
  spells: CharacterSpell[]
  powers: CharacterPower[]
  equipment: {
    name: string
    quantity: number
    slots: number
    location?: 'body' | 'bag'
    description?: string
  }[]
  money: number
  carryLimit: number
  notes: string
  spellKeyAttr?: string
  userId?: string
}
