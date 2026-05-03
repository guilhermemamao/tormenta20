import { useState, useEffect, useMemo, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import type { Character, CharacterSpell, CharacterPower, Spell } from '../types'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import SpellModal from '../components/SpellModal'
import {
  BLANK, TABS, DEFAULT_SKILL,
  attrMod, parseHP, parseMP, totalLevel,
  rowToCharacter, rowToSpell,
  type Tab, type SaveState, type ClassDef, type RaceData, type DbSpellRow,
} from '../components/character/characterHelpers'
import TabGeral from '../components/character/TabGeral'
import TabPericias from '../components/character/TabPericias'
import TabPoderes from '../components/character/TabPoderes'
import TabCombate from '../components/character/TabCombate'
import TabGrimorio, { SpellPicker } from '../components/character/TabGrimorio'
import TabOrigem from '../components/character/TabOrigem'
import TabEquipamento from '../components/character/TabEquipamento'

export default function CharacterPage() {
  const { id } = useParams<{ id: string }>()
  const { user, profile } = useAuth()
  const [char, setChar] = useState<Character>(BLANK)
  const [charLoading, setCharLoading] = useState(true)
  const [charError, setCharError] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('geral')
  const [modalSpell, setModalSpell] = useState<Spell | null>(null)
  const [showPicker, setShowPicker] = useState(false)
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [expandedEquip, setExpandedEquip] = useState<Set<number>>(new Set())
  const [expandedPowers, setExpandedPowers] = useState<Set<string>>(new Set())
  const [bodyOpen, setBodyOpen] = useState(true)
  const [bagOpen, setBagOpen] = useState(true)
  const [classDefsMap, setClassDefsMap] = useState<Record<string, ClassDef>>({})
  const [grimSort, setGrimSort] = useState<'circle' | 'alpha' | 'school'>('circle')
  const fetchedClassNames = useRef<Set<string>>(new Set())
  const [raceData, setRaceData] = useState<RaceData | null>(null)
  const [raceSuggestions, setRaceSuggestions] = useState<RaceData[]>([])
  const [raceSearch, setRaceSearch] = useState('')
  const [showRaceDropdown, setShowRaceDropdown] = useState(false)
  const raceInputRef = useRef<HTMLInputElement>(null)

  // ── Load character from Supabase ──
  useEffect(() => {
    if (!id) { setCharError('ID inválido'); setCharLoading(false); return }
    supabase.from('characters').select('*').eq('id', id).single()
      .then(({ data, error }) => {
        if (error || !data) setCharError('Personagem não encontrado.')
        else setChar(rowToCharacter(data))
        setCharLoading(false)
      })
  }, [id])

  // ── Fetch class definitions (hit_points) from DB ──
  useEffect(() => {
    const names = char.classes.map(c => c.name).filter(n => n && !fetchedClassNames.current.has(n))
    if (names.length === 0) return
    names.forEach(n => fetchedClassNames.current.add(n))
    supabase.from('classes').select('name, hit_points, hp_per_level, mana_points').in('name', names)
      .then(({ data }) => {
        if (!data) return
        const updates: Record<string, ClassDef> = {}
        for (const row of data as { name: string; hit_points: string; hp_per_level: number | null; mana_points: string }[]) {
          console.log('[CharacterPage] classe:', row.name, '→ HP:', row.hit_points, '| MP:', row.mana_points)
          updates[row.name] = {
            hitPoints: row.hit_points ?? '',
            hpPerLevel: row.hp_per_level ?? 0,
            manaPoints: row.mana_points ?? '',
          }
        }
        setClassDefsMap(prev => ({ ...prev, ...updates }))
      })
  }, [char.classes])

  // ── Race autocomplete ──
  useEffect(() => {
    setRaceSearch(char.race ?? '')
  }, [char.race])

  useEffect(() => {
    const q = raceSearch.trim()
    if (!q || q.length < 1) { setRaceSuggestions([]); return }
    const timer = setTimeout(async () => {
      const { data } = await supabase
        .from('races')
        .select('id, name, size, displacement, race_attributes(attr, mod), race_abilities(name, description, sort_order)')
        .ilike('name', `%${q}%`)
        .order('name')
        .limit(8)
      setRaceSuggestions((data as RaceData[]) ?? [])
    }, 200)
    return () => clearTimeout(timer)
  }, [raceSearch])

  // Carrega dados da raça salva no personagem ao abrir a ficha
  useEffect(() => {
    if (!char.race) return
    supabase
      .from('races')
      .select('id, name, size, displacement, race_attributes(attr, mod), race_abilities(name, description, sort_order)')
      .ilike('name', char.race)
      .limit(1)
      .single()
      .then(({ data }) => { if (data) setRaceData(data as RaceData) })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // só na montagem

  // ── Patch helpers ──
  const patch = (p: Partial<Character>) => setChar(c => ({ ...c, ...p }))
  const patchAttr = (k: keyof Character['attributes'], v: number) =>
    setChar(c => ({ ...c, attributes: { ...c.attributes, [k]: v } }))
  const patchHP = (k: 'current' | 'max', v: number) =>
    setChar(c => ({ ...c, hp: { ...c.hp, [k]: v } }))
  const patchMP = (k: 'current' | 'max', v: number) =>
    setChar(c => ({ ...c, mp: { ...c.mp, [k]: v } }))
  const patchDef = (k: keyof Character['defense'], v: number) =>
    setChar(c => ({ ...c, defense: { ...c.defense, [k]: v } }))

  // ── Auto-calc HP / MP ──
  function calcAutoHP() {
    const conMod = attrMod(char.attributes.con)
    let total = 0
    for (const cl of char.classes) {
      const def = classDefsMap[cl.name]
      if (!def) continue
      total += parseHP(def.hitPoints) + (def.hpPerLevel * (cl.level - 1)) + (conMod * cl.level)
    }
    patchHP('max', Math.max(1, total))
  }
  function calcAutoMP() {
    const keyAttr = (char.spellKeyAttr || 'int') as keyof Character['attributes']
    const keyMod = attrMod(char.attributes[keyAttr])
    let total = 0
    for (const cl of char.classes) {
      const def = classDefsMap[cl.name]
      if (!def) continue
      total += parseMP(def.manaPoints) * cl.level
    }
    patchMP('max', Math.max(0, total + keyMod))
  }

  // ── Derived values ──
  const level = totalLevel(char)
  const dexMod = attrMod(char.attributes.dex)
  const strMod = attrMod(char.attributes.str)
  const defTotal = 10 + dexMod + char.defense.armor + char.defense.shield + char.defense.other
  const carryLimit = 10 + 2 * strMod
  const slotsUsed = char.equipment.reduce((s, e) => s + e.slots * e.quantity, 0)
  const addedSpellIds = useMemo(() => new Set(char.spells.map(s => s.spellId)), [char.spells])

  // ── Save ──
  async function handleSave() {
    console.log('[handleSave] user:', user?.id, '| char id from useParams:', id)
    if (!user || !id) return
    setSaveState('saving')
    const characterData = {
      name: char.name, player: char.player, race: char.race, origin: char.origin,
      classes: char.classes, deity: char.deity, size: char.size,
      movement: char.movement, xp: char.xp,
      attributes: char.attributes, hp: char.hp, mp: char.mp,
      attacks: char.attacks, defense: char.defense, skills: char.skills,
      spells: char.spells, powers: char.powers, equipment: char.equipment,
      money: char.money, carry_limit: char.carryLimit, notes: char.notes,
      origin_notes: char.originNotes ?? '',
      spell_key_attr: char.spellKeyAttr ?? '',
    }
    console.log('Dados sendo salvos:', JSON.stringify(characterData, null, 2))
    const { data, error } = await supabase
      .from('characters')
      .update(characterData)
      .eq('id', id)
    console.log('Erro detalhado:', error)
    console.log('Message:', error?.message)
    console.log('Details:', error?.details)
    if (!error) console.log('[handleSave] saved successfully, data:', data)
    setSaveState(error ? 'error' : 'saved')
    setTimeout(() => setSaveState('idle'), 2000)
  }

  // ── Skill helpers ──
  function toggleSkill(name: string) {
    setChar(c => {
      const cur = c.skills[name] ?? DEFAULT_SKILL
      return { ...c, skills: { ...c.skills, [name]: { ...cur, trained: !cur.trained } } }
    })
  }
  function patchSkill(name: string, field: 'training' | 'outros', value: number) {
    setChar(c => {
      const cur = c.skills[name] ?? DEFAULT_SKILL
      return { ...c, skills: { ...c.skills, [name]: { ...cur, [field]: value } } }
    })
  }

  // ── Attack helpers ──
  function addAttack() {
    patch({ attacks: [...char.attacks, { name: '', bonus: 0, damage: '1d6', critical: '×2', type: '', range: '' }] })
  }
  function removeAttack(i: number) {
    patch({ attacks: char.attacks.filter((_, idx) => idx !== i) })
  }
  function patchAttack(i: number, field: string, value: string | number) {
    patch({ attacks: char.attacks.map((a, idx) => idx === i ? { ...a, [field]: value } : a) })
  }

  // ── Equipment helpers ──
  function addEquip(location: 'body' | 'bag') {
    patch({ equipment: [...char.equipment, { name: '', quantity: 1, slots: 1, location, description: '' }] })
  }
  function removeEquip(i: number) {
    setExpandedEquip(s => { const n = new Set(s); n.delete(i); return n })
    patch({ equipment: char.equipment.filter((_, idx) => idx !== i) })
  }
  function patchEquip(i: number, field: string, value: string | number) {
    patch({ equipment: char.equipment.map((e, idx) => idx === i ? { ...e, [field]: value } : e) })
  }
  function toggleEquipExpand(i: number) {
    setExpandedEquip(s => { const n = new Set(s); n.has(i) ? n.delete(i) : n.add(i); return n })
  }

  // ── Power helpers ──
  function addPower() {
    patch({ powers: [...char.powers, { powerId: Date.now().toString(), powerName: '', level, description: '' }] })
  }
  function removePower(powerId: string) {
    patch({ powers: char.powers.filter(p => p.powerId !== powerId) })
  }
  function patchPower(powerId: string, field: keyof CharacterPower, value: string | number) {
    patch({ powers: char.powers.map(p => p.powerId === powerId ? { ...p, [field]: value } : p) })
  }
  function togglePowerExpand(powerId: string) {
    setExpandedPowers(s => { const n = new Set(s); n.has(powerId) ? n.delete(powerId) : n.add(powerId); return n })
  }

  // ── Grimório helpers ──
  function addSpell(spell: Spell) {
    if (!spell.id) return
    const entry: CharacterSpell = {
      spellId: spell.id, spellName: spell.name,
      circle: spell.circle, school: spell.school, type: spell.type,
    }
    patch({ spells: [...char.spells, entry] })
  }
  function removeSpell(spellId: string) {
    patch({ spells: char.spells.filter(s => s.spellId !== spellId) })
  }
  async function openSpellModal(cs: CharacterSpell) {
    const { data } = await supabase.from('spells').select('*').eq('id', cs.spellId).single()
    if (data) setModalSpell(rowToSpell(data as DbSpellRow))
  }

  // ── Render ──

  if (charLoading) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-16 text-center">
        <p className="text-stone-400">Carregando ficha…</p>
      </div>
    )
  }

  if (charError) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-16 text-center">
        <p className="text-red-500 mb-4">{charError}</p>
        <Link to="/fichas" className="btn-secondary">← Minhas Fichas</Link>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-6 pb-24">
      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <Link to="/fichas"
            className="inline-flex items-center gap-1 text-xs text-stone-400 hover:text-stone-600 transition-colors mb-2">
            <ArrowLeft size={12} /> Minhas Fichas
          </Link>
          {profile.username && (
            <p className="text-[10px] text-stone-400 mb-0.5">Ficha de {profile.username}</p>
          )}
          <h1 className="font-display text-3xl font-semibold text-tormenta-red leading-tight">
            {char.name || 'Personagem'}
          </h1>
          <p className="text-stone-400 text-sm mt-0.5">
            {[char.race, char.origin].filter(Boolean).join(' · ')}
            {char.classes.some(c => c.name) && ` · ${char.classes.map(c => `${c.name} ${c.level}`).join(' / ')}`}
            {` · Nível ${level}`}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 border-b border-stone-200 overflow-x-auto pb-px">
        {TABS.map(({ id: tabId, label, icon: Icon }) => (
          <button key={tabId} onClick={() => setTab(tabId)}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px whitespace-nowrap ${
              tab === tabId
                ? 'border-tormenta-red text-tormenta-red'
                : 'border-transparent text-stone-400 hover:text-stone-600'
            }`}>
            <Icon size={14} />{label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'geral' && (
        <TabGeral
          char={char} patch={patch} setChar={setChar}
          classDefsMap={classDefsMap} raceData={raceData}
          raceSearch={raceSearch} raceSuggestions={raceSuggestions}
          showRaceDropdown={showRaceDropdown} raceInputRef={raceInputRef}
          setRaceSearch={setRaceSearch} setRaceData={setRaceData}
          setShowRaceDropdown={setShowRaceDropdown} setRaceSuggestions={setRaceSuggestions}
          patchAttr={patchAttr} patchHP={patchHP} patchMP={patchMP} patchDef={patchDef}
          calcAutoHP={calcAutoHP} calcAutoMP={calcAutoMP}
          level={level} defTotal={defTotal}
        />
      )}
      {tab === 'pericias' && (
        <TabPericias
          char={char} level={level}
          toggleSkill={toggleSkill} patchSkill={patchSkill}
        />
      )}
      {tab === 'poderes' && (
        <TabPoderes
          char={char} level={level}
          addPower={addPower} removePower={removePower} patchPower={patchPower}
          expandedPowers={expandedPowers} togglePowerExpand={togglePowerExpand}
        />
      )}
      {tab === 'origem' && (
        <TabOrigem char={char} patch={patch} setTab={setTab} />
      )}
      {tab === 'combate' && (
        <TabCombate
          char={char}
          addAttack={addAttack} removeAttack={removeAttack} patchAttack={patchAttack}
          defTotal={defTotal}
        />
      )}
      {tab === 'grimorio' && (
        <TabGrimorio
          char={char} patch={patch}
          grimSort={grimSort} setGrimSort={setGrimSort}
          setShowPicker={setShowPicker}
          addedSpellIds={addedSpellIds}
          removeSpell={removeSpell} openSpellModal={openSpellModal}
          level={level} id={id}
        />
      )}
      {tab === 'equipamento' && (
        <TabEquipamento
          char={char} patch={patch}
          addEquip={addEquip} removeEquip={removeEquip} patchEquip={patchEquip}
          expandedEquip={expandedEquip} toggleEquipExpand={toggleEquipExpand}
          bodyOpen={bodyOpen} setBodyOpen={setBodyOpen}
          bagOpen={bagOpen} setBagOpen={setBagOpen}
          slotsUsed={slotsUsed} carryLimit={carryLimit}
        />
      )}

      {/* Modals */}
      {showPicker && (
        <SpellPicker onAdd={addSpell} onClose={() => setShowPicker(false)} alreadyAdded={addedSpellIds} />
      )}
      {modalSpell && <SpellModal spell={modalSpell} onClose={() => setModalSpell(null)} />}

      {/* Sticky save button */}
      <div className="fixed bottom-6 right-6 z-40">
        <button
          onClick={handleSave}
          disabled={saveState === 'saving'}
          className={`flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold text-white shadow-lg transition-all disabled:opacity-70 ${
            saveState === 'saved'  ? 'bg-emerald-600' :
            saveState === 'error'  ? 'bg-red-600' :
            'bg-tormenta-red hover:bg-tormenta-red-dark'
          }`}
        >
          {saveState === 'saving' ? 'Salvando…' :
           saveState === 'saved'  ? 'Salvo!' :
           saveState === 'error'  ? 'Erro ao salvar' :
           'Salvar ficha'}
        </button>
      </div>
    </div>
  )
}
