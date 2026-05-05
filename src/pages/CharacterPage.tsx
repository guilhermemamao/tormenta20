import { useState, useEffect, useMemo, useRef } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react'
import type { Character, CharacterSpell, CharacterPower, Spell } from '../types'
import OrigensJson from '../lib/mechanics_data/Origens.json'
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
import TabCompanheiros from '../components/character/TabCompanheiros'
import { useDirty } from '../contexts/DirtyContext'

interface MechanicsNode { type: string; name: string; description?: string; items?: MechanicsNode[] }

function extractOrigens(nodes: MechanicsNode[]): { name: string; description: string }[] {
  const results: { name: string; description: string }[] = []
  for (const node of nodes) {
    if (node.type === 'item' && node.description) results.push({ name: node.name, description: node.description })
    else if (node.type === 'folder' && node.items) results.push(...extractOrigens(node.items))
  }
  return results
}

const ALL_ORIGENS = extractOrigens((OrigensJson as unknown as MechanicsNode).items?.slice(3) ?? [])

function TabsBar({ tab, setTab }: { tab: Tab; setTab: (t: Tab) => void }) {
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!scrollRef.current) return
    const activeBtn = scrollRef.current.querySelector('[data-active="true"]') as HTMLElement
    if (activeBtn) activeBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
  }, [tab])

  function scroll(dir: 'left' | 'right') {
    if (!scrollRef.current) return
    scrollRef.current.scrollBy({ left: dir === 'left' ? -120 : 120, behavior: 'smooth' })
  }

  return (
    <div className="relative mb-5">
      <button
        onClick={() => scroll('left')}
        className="absolute left-0 top-0 bottom-0 z-10 flex items-center px-1 bg-gradient-to-r from-stone-50 to-transparent text-stone-400 hover:text-stone-600 md:hidden"
        aria-label="Rolar abas para esquerda"
      >
        <ChevronLeft size={16} />
      </button>

      <div
        ref={scrollRef}
        className="flex gap-0.5 border-b border-stone-200 overflow-x-auto pb-px mx-6 md:mx-0"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' } as React.CSSProperties}
      >
        {TABS.map(({ id: tabId, label, icon: Icon }) => (
          <button
            key={tabId}
            data-active={tab === tabId}
            onClick={() => setTab(tabId)}
            className={`flex items-center gap-1.5 px-3.5 py-2 text-xs md:text-[13px] md:px-4 md:py-2.5 font-semibold transition-colors border-b-2 -mb-px whitespace-nowrap shrink-0 ${
              tab === tabId
                ? 'border-tormenta-red text-tormenta-red'
                : 'border-transparent text-stone-400 hover:text-stone-600'
            }`}
          >
            <Icon size={13} className="md:w-4 md:h-4" />
            {label}
          </button>
        ))}
      </div>

      <button
        onClick={() => scroll('right')}
        className="absolute right-0 top-0 bottom-0 z-10 flex items-center px-1 bg-gradient-to-l from-stone-50 to-transparent text-stone-400 hover:text-stone-600 md:hidden"
        aria-label="Rolar abas para direita"
      >
        <ChevronRight size={16} />
      </button>
    </div>
  )
}

export default function CharacterPage() {
  const { id } = useParams<{ id: string }>()
  const { user, profile } = useAuth()
  const [char, setChar] = useState<Character>(BLANK)
  const charRef = useRef<Character>(BLANK)
  const [charLoading, setCharLoading] = useState(true)
  const [charError, setCharError] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('geral')
  const [modalSpell, setModalSpell] = useState<Spell | null>(null)
  const [modalSpellEntry, setModalSpellEntry] = useState<CharacterSpell | null>(null)
  const [showPicker, setShowPicker] = useState(false)
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [expandedEquip, setExpandedEquip] = useState<Set<number>>(new Set())
  const [expandedPowers, setExpandedPowers] = useState<Set<string>>(new Set())
  const [bodyOpen, setBodyOpen] = useState(true)
  const [bagOpen, setBagOpen] = useState(true)
  const [carrierOpen, setCarrierOpen] = useState(true)
  const [carrierLimit, setCarrierLimit] = useState(20)
  const [classDefsMap, setClassDefsMap] = useState<Record<string, ClassDef>>({})
  const [grimSort, setGrimSort] = useState<'circle' | 'alpha' | 'school'>('circle')
  const fetchedClassNames = useRef<Set<string>>(new Set())
  const [raceData, setRaceData] = useState<RaceData | null>(null)
  const [raceSuggestions, setRaceSuggestions] = useState<RaceData[]>([])
  const [raceSearch, setRaceSearch] = useState('')
  const [showRaceDropdown, setShowRaceDropdown] = useState(false)
  const [originSearch, setOriginSearch] = useState('')
  const [originSuggestions, setOriginSuggestions] = useState<{ name: string; description: string }[]>([])
  const [showOriginDropdown, setShowOriginDropdown] = useState(false)
  const raceInputRef = useRef<HTMLInputElement | null>(null)
  const { isDirtyRef } = useDirty()
  const [showUnsavedModal, setShowUnsavedModal] = useState(false)
  const [pendingNav, setPendingNav] = useState<string | null>(null)
  const navigate = useNavigate()

  function markDirty() { isDirtyRef.current = true }
  function markClean() { isDirtyRef.current = false }

  function setTabWithSave(newTab: Tab) {
    setTab(newTab)
  }

  function safeNavigate(to: string) {
    if (isDirtyRef.current) {
      setPendingNav(to)
      setShowUnsavedModal(true)
    } else {
      navigate(to)
    }
  }

  useEffect(() => { charRef.current = char }, [char])

  // ── Load character from Supabase ──
  useEffect(() => {
    if (!id) { setCharError('ID inválido'); setCharLoading(false); return }
    supabase.from('characters').select('*').eq('id', id).single()
      .then(({ data, error }) => {
        markClean()
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

  // Carrega dados da raça quando o personagem termina de carregar
  useEffect(() => {
    if (!char.race || raceData) return
    supabase
      .from('races')
      .select('id, name, size, displacement, race_attributes(attr, mod), race_abilities(name, description, sort_order)')
      .ilike('name', char.race)
      .limit(1)
      .single()
      .then(({ data }) => { if (data) setRaceData(data as RaceData) })
  }, [char.race]) // roda sempre que char.race mudar, mas só busca se raceData ainda não está carregado

  // ── Origin autocomplete ──
  useEffect(() => {
    setOriginSearch(char.origin ?? '')
  }, [char.origin])

  useEffect(() => {
    const q = originSearch.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    if (!q || q.length < 2) { setOriginSuggestions([]); return }
    setOriginSuggestions(
      ALL_ORIGENS.filter(o =>
        o.name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').includes(q)
      ).slice(0, 8)
    )
  }, [originSearch])

  function onOriginSelect(name: string, description: string) {
    setOriginSearch(name)
    patch({ origin: name, originNotes: char.originNotes ? char.originNotes : description })
    setOriginSuggestions([])
  }

  // ── Dirty tracking ──
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (!isDirtyRef.current) return
      e.preventDefault()
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [])

  // ── Patch helpers ──
  const patch = (p: Partial<Character>) => { markDirty(); setChar(c => ({ ...c, ...p })) }
  const patchAttr = (k: keyof Character['attributes'], v: number) => {
    markDirty()
    setChar(c => ({ ...c, attributes: { ...c.attributes, [k]: v } }))
  }
  const patchHP = (k: 'current' | 'max', v: number) => {
    markDirty()
    setChar(c => ({ ...c, hp: { ...c.hp, [k]: v } }))
  }
  const patchMP = (k: 'current' | 'max', v: number) => {
    markDirty()
    setChar(c => ({ ...c, mp: { ...c.mp, [k]: v } }))
  }
  const patchDef = (k: keyof Character['defense'], v: number) => {
    markDirty()
    setChar(c => ({ ...c, defense: { ...c.defense, [k]: v } }))
  }

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
  const slotsUsed = char.equipment
    .filter(e => e.location !== 'carrier')
    .reduce((s, e) => s + Math.ceil(e.slots * e.quantity), 0)
  const carrierSlotsUsed = char.equipment
    .filter(e => e.location === 'carrier')
    .reduce((s, e) => s + Math.ceil(e.slots * e.quantity), 0)
  const addedSpellIds = useMemo(() => new Set(char.spells.map(s => s.spellId)), [char.spells])

  // ── Save ──
  async function handleSave() {
    console.log('[handleSave] user:', user?.id, '| char id from useParams:', id)
    if (!user || !id) return
    setSaveState('saving')
    const c = charRef.current
    const characterData = {
      name: c.name, player: c.player, race: c.race, origin: c.origin,
      classes: c.classes, deity: c.deity, size: c.size,
      movement: c.movement, xp: c.xp,
      attributes: c.attributes, hp: c.hp, mp: c.mp,
      attacks: c.attacks, defense: c.defense, skills: c.skills,
      spells: c.spells, powers: c.powers, equipment: c.equipment,
      money: c.money, carry_limit: c.carryLimit, notes: c.notes,
      origin_notes: c.originNotes ?? '',
      spell_key_attr: c.spellKeyAttr ?? '',
      // IMPORTANTE: Execute no Supabase SQL Editor antes de usar:
      // ALTER TABLE characters ADD COLUMN IF NOT EXISTS companions JSONB DEFAULT '[]';
      // ALTER TABLE characters ADD COLUMN IF NOT EXISTS companion_limit INTEGER DEFAULT 1;
      companions: c.companions ?? [],
      companion_limit: c.companionLimit ?? 1,
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
    if (!error) markClean()
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
    markDirty()
    setChar(c => {
      const cur = c.skills[name] ?? DEFAULT_SKILL
      return { ...c, skills: { ...c.skills, [name]: { ...cur, [field]: value } } }
    })
  }

  // ── Attack helpers ──
  function addAttack() {
    markDirty()
    patch({ attacks: [...char.attacks, { name: '', bonus: 0, damage: '1d6', critical: '×2', type: '', range: '' }] })
  }
  function removeAttack(i: number) {
    markDirty()
    patch({ attacks: char.attacks.filter((_, idx) => idx !== i) })
  }
  function patchAttack(i: number, field: string, value: string | number) {
    markDirty()
    patch({ attacks: char.attacks.map((a, idx) => idx === i ? { ...a, [field]: value } : a) })
  }

  // ── Equipment helpers ──
  function addEquip(location: 'body' | 'bag' | 'carrier') {
    markDirty()
    patch({ equipment: [...char.equipment, { name: '', quantity: 1, slots: 1, location, description: '' }] })
  }
  function removeEquip(i: number) {
    markDirty()
    setExpandedEquip(s => { const n = new Set(s); n.delete(i); return n })
    patch({ equipment: char.equipment.filter((_, idx) => idx !== i) })
  }
  function patchEquip(i: number, field: string, value: string | number) {
    markDirty()
    patch({ equipment: char.equipment.map((e, idx) => idx === i ? { ...e, [field]: value } : e) })
  }
  function toggleEquipExpand(i: number) {
    setExpandedEquip(s => { const n = new Set(s); n.has(i) ? n.delete(i) : n.add(i); return n })
  }
  function patchSpell(spellId: string, field: keyof CharacterSpell, value: string) {
    markDirty()
    setChar(c => ({
      ...c,
      spells: c.spells.map(s => s.spellId === spellId ? { ...s, [field]: value } : s)
    }))
  }

  // ── Power helpers ──
  function addPower() {
    markDirty()
    patch({ powers: [...char.powers, { powerId: Date.now().toString(), powerName: '', level, description: '' }] })
  }
  function removePower(powerId: string) {
    markDirty()
    patch({ powers: char.powers.filter(p => p.powerId !== powerId) })
  }
  function patchPower(powerId: string, fields: Partial<CharacterPower>) {
    markDirty()
    setChar(c => ({
      ...c,
      powers: c.powers.map(p => p.powerId === powerId ? { ...p, ...fields } : p)
    }))
  }
  function togglePowerExpand(powerId: string) {
    setExpandedPowers(s => { const n = new Set(s); n.has(powerId) ? n.delete(powerId) : n.add(powerId); return n })
  }

  // ── Grimório helpers ──
  function addSpell(spell: Spell) {
    if (!spell.id) return
    markDirty()
    const entry: CharacterSpell = {
      spellId: spell.id, spellName: spell.name,
      circle: spell.circle, school: spell.school, type: spell.type,
    }
    patch({ spells: [...char.spells, entry] })
  }
  function removeSpell(spellId: string) {
    markDirty()
    patch({ spells: char.spells.filter(s => s.spellId !== spellId) })
  }
  async function openSpellModal(cs: CharacterSpell) {
    setModalSpellEntry(cs)
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
          <button onClick={() => safeNavigate('/fichas')} className="inline-flex items-center gap-1 text-xs text-stone-400 hover:text-stone-600 transition-colors mb-2">
            <ArrowLeft size={12} /> Minhas Fichas
          </button>
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
      <TabsBar tab={tab} setTab={setTabWithSave} />

      {/* Tab content */}
      {tab === 'geral' && (
        <TabGeral
          char={char} patch={patch} setChar={setChar}
          classDefsMap={classDefsMap} raceData={raceData}
          raceSearch={raceSearch} raceSuggestions={raceSuggestions}
          showRaceDropdown={showRaceDropdown} raceInputRef={raceInputRef}
          setRaceSearch={setRaceSearch} setRaceData={setRaceData}
          setShowRaceDropdown={setShowRaceDropdown} setRaceSuggestions={setRaceSuggestions}
          originSearch={originSearch} originSuggestions={originSuggestions}
          showOriginDropdown={showOriginDropdown}
          setOriginSearch={setOriginSearch} setShowOriginDropdown={setShowOriginDropdown}
          onOriginSelect={onOriginSelect}
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
          charClasses={char.classes}
          addPower={addPower} removePower={removePower} patchPower={patchPower}
          expandedPowers={expandedPowers} togglePowerExpand={togglePowerExpand}
        />
      )}
      {tab === 'origem' && (
        <TabOrigem char={char} patch={patch} setTab={setTabWithSave} />
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
          patchSpell={patchSpell} charEquipment={char.equipment}
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
          carrierOpen={carrierOpen} setCarrierOpen={setCarrierOpen}
          slotsUsed={slotsUsed} carryLimit={carryLimit}
          carrierSlotsUsed={carrierSlotsUsed} carrierLimit={carrierLimit} setCarrierLimit={setCarrierLimit}
        />
      )}
      {tab === 'companheiros' && (
        <TabCompanheiros char={char} patch={patch} />
      )}

      {/* Modals */}
      {showUnsavedModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6 space-y-4">
            <h2 className="font-display text-lg font-semibold text-tormenta-red">Alterações não salvas</h2>
            <p className="text-sm text-stone-600">Você tem alterações que não foram salvas. O que deseja fazer?</p>
            <div className="flex flex-col gap-2">
              <button
                onClick={async () => {
                  await handleSave()
                  setShowUnsavedModal(false)
                  if (pendingNav) navigate(pendingNav)
                }}
                className="w-full px-4 py-2 text-sm bg-tormenta-red text-white rounded-lg hover:bg-tormenta-red-dark transition-colors font-medium"
              >
                Salvar e sair
              </button>
              <button
                onClick={() => {
                  setShowUnsavedModal(false)
                  if (pendingNav) navigate(pendingNav)
                }}
                className="w-full px-4 py-2 text-sm border border-stone-200 rounded-lg hover:bg-stone-50 transition-colors text-stone-600"
              >
                Sair sem salvar
              </button>
              <button
                onClick={() => { setShowUnsavedModal(false); setPendingNav(null) }}
                className="w-full px-4 py-2 text-sm text-stone-400 hover:text-stone-600 transition-colors"
              >
                Continuar editando
              </button>
            </div>
          </div>
        </div>
      )}
      {showPicker && (
        <SpellPicker onAdd={addSpell} onClose={() => setShowPicker(false)} alreadyAdded={addedSpellIds} />
      )}
      {modalSpell && (
        <SpellModal
          spell={modalSpell}
          itemLink={modalSpellEntry?.itemLink}
          itemEffect={modalSpellEntry?.itemEffect}
          onClose={() => { setModalSpell(null); setModalSpellEntry(null) }}
        />
      )}

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
