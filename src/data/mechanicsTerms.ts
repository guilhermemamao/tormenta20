import CondicoesJson from '../lib/mechanics_data/Condições.json'
import CombateJson from '../lib/mechanics_data/Combate.json'

interface MechanicsNode {
  type: 'item' | 'folder'
  name: string
  description?: string
  items?: MechanicsNode[]
}

function extractItems(nodes: MechanicsNode[]): { title: string; definition: string }[] {
  const results: { title: string; definition: string }[] = []
  for (const node of nodes) {
    if (node.type === 'item' && node.name && node.description) {
      results.push({ title: node.name, definition: node.description })
    } else if (node.type === 'folder' && node.items) {
      results.push(...extractItems(node.items))
    }
  }
  return results
}

const condicoesItems = extractItems((CondicoesJson as unknown as MechanicsNode).items ?? [])
const combateItems = extractItems((CombateJson as unknown as MechanicsNode).items ?? [])

export const MECHANICS_DEFS: Record<string, { title: string; definition: string }> = {}

for (const item of [...condicoesItems, ...combateItems]) {
  const key = item.title.toLowerCase()
  MECHANICS_DEFS[key] = { title: item.title, definition: item.definition }
}
