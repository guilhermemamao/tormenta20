import ArmasJson from './Armas.json'
import ArmaduraJson from './Armaduras & Escudos.json'
import AcessoriosJson from './Acessórios.json'
import ItensJson from './Itens Gerais.json'

export type EquipCategory =
  | 'arma'
  | 'armadura'
  | 'escudo'
  | 'acessorio'
  | 'esoterico'
  | 'item'
  | 'alimento'
  | 'pocao'
  | 'roupa'

export interface EquipmentEntry {
  name: string
  category: EquipCategory
  price?: string
  spaces?: string
  // Armas
  damage?: string
  critical?: string
  range?: string
  damageType?: string
  proficiency?: string
  purpose?: string
  grip?: string
  // Armaduras / Escudos
  defenseBonus?: string
  armorPenalty?: string
  // Descrição montada
  description: string
}

type ArmaItem = typeof ArmasJson.items[0]
type ArmaduraItem = typeof ArmaduraJson.items[0]
type SimpleItem = { name: string; price: string; spaces: string; category: string }

function buildArmaDesc(item: ArmaItem): string {
  return [
    item.damage && `Dano: ${item.damage}`,
    item.critical && `Crítico: ${item.critical}`,
    item.damageType && `Tipo: ${item.damageType}`,
    item.range && item.range !== '—' && `Alcance: ${item.range}`,
    item.grip && `Empunhadura: ${item.grip}`,
    item.proficiency && `Proficiência: ${item.proficiency}`,
    item.price && `Preço: ${item.price}`,
    item.spaces && `Espaços: ${item.spaces}`,
  ].filter(Boolean).join(' · ')
}

function buildArmaduraDesc(item: ArmaduraItem): string {
  return [
    item.defenseBonus && `Defesa: ${item.defenseBonus}`,
    item.armorPenalty && item.armorPenalty !== '0' && `Penalidade: ${item.armorPenalty}`,
    item.proficiency && `Proficiência: ${item.proficiency}`,
    item.price && `Preço: ${item.price}`,
    item.spaces && `Espaços: ${item.spaces}`,
  ].filter(Boolean).join(' · ')
}

function buildSimpleDesc(item: SimpleItem): string {
  return [
    item.category && `Categoria: ${item.category}`,
    item.price && `Preço: ${item.price}`,
    item.spaces && `Espaços: ${item.spaces}`,
  ].filter(Boolean).join(' · ')
}

const armas: EquipmentEntry[] = ArmasJson.items.map(i => ({
  name: i.name,
  category: 'arma',
  price: i.price,
  spaces: i.spaces,
  damage: i.damage,
  critical: i.critical,
  range: i.range,
  damageType: i.damageType,
  proficiency: i.proficiency,
  purpose: i.purpose,
  grip: i.grip,
  description: buildArmaDesc(i),
}))

const armaduras: EquipmentEntry[] = ArmaduraJson.items
  .filter(i => i.proficiency !== 'Escudos')
  .map(i => ({
    name: i.name,
    category: 'armadura' as EquipCategory,
    price: i.price,
    spaces: i.spaces,
    defenseBonus: i.defenseBonus,
    armorPenalty: i.armorPenalty,
    proficiency: i.proficiency,
    description: buildArmaduraDesc(i),
  }))

const escudos: EquipmentEntry[] = ArmaduraJson.items
  .filter(i => i.proficiency === 'Escudos')
  .map(i => ({
    name: i.name,
    category: 'escudo' as EquipCategory,
    price: i.price,
    spaces: i.spaces,
    defenseBonus: i.defenseBonus,
    armorPenalty: i.armorPenalty,
    proficiency: i.proficiency,
    description: buildArmaduraDesc(i),
  }))

const acessorios: EquipmentEntry[] = (AcessoriosJson.items as SimpleItem[]).map(i => ({
  name: i.name,
  category: 'acessorio',
  price: i.price,
  spaces: i.spaces,
  description: buildSimpleDesc(i),
}))

function mapItemCategory(category: string): EquipCategory {
  const c = category.toLowerCase()
  if (c.includes('alimenta')) return 'alimento'
  if (c.includes('alquím') || c.includes('alquim')) return 'pocao'
  if (c.includes('vestuário') || c.includes('vestuario')) return 'roupa'
  if (c.includes('esotéric') || c.includes('esoteri')) return 'esoterico'
  return 'item'
}

const itens: EquipmentEntry[] = (ItensJson.items as SimpleItem[]).map(i => ({
  name: i.name,
  category: mapItemCategory(i.category),
  price: i.price,
  spaces: i.spaces,
  description: [i.category && `Categoria: ${i.category}`, i.price && `Preço: ${i.price}`, i.spaces && `Espaços: ${i.spaces}`].filter(Boolean).join(' · '),
}))

export const ALL_EQUIPMENT: EquipmentEntry[] = [
  ...armas, ...armaduras, ...escudos, ...acessorios, ...itens,
].sort((a, b) => a.name.localeCompare(b.name, 'pt'))

export const CATEGORY_LABELS: Record<EquipCategory, string> = {
  arma: 'Arma',
  armadura: 'Armadura',
  escudo: 'Escudo',
  acessorio: 'Acessório',
  esoterico: 'Esotérico',
  item: 'Item Geral',
  alimento: 'Alimento',
  pocao: 'Poção',
  roupa: 'Roupa',
}

export const CATEGORY_ICONS: Record<EquipCategory, string> = {
  arma: '⚔️',
  armadura: '🥋',
  escudo: '🔰',
  acessorio: '💍',
  esoterico: '✨',
  item: '🎒',
  alimento: '🍖',
  pocao: '🧪',
  roupa: '👘',
}
