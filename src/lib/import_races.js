// ============================================================
// import_races.js
// Importa JSONs de raças para o Supabase (PostgreSQL)
// 
// Uso:
//   node src/lib/import_races.js
//
// Coloque os JSONs das raças em: src/lib/races_data/
// Formato esperado: igual aos exemplos (Medusa.json, Centauro.json, etc.)
// ============================================================

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// --- Config Supabase ---
// Ajuste para sua URL e SERVICE ROLE key (não use a anon key aqui)
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://szxlivbpqwnrqltbkjay.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || 'SUA_SERVICE_ROLE_KEY_AQUI';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RACES_DIR = path.join(__dirname, 'races_data');

// ============================================================
// Funções auxiliares
// ============================================================

function normalizeAttr(attr) {
  // Garante lowercase e trata variações
  return attr?.toLowerCase().trim() || 'any';
}

async function importRace(raceData, filename) {
  console.log(`\n📖 Importando: ${raceData.name} (${filename})`);

  // 1. Verifica se já existe
  const { data: existing } = await supabase
    .from('races')
    .select('id')
    .eq('name', raceData.name)
    .single();

  let raceId;

  if (existing) {
    console.log(`   ↻ Já existe — atualizando...`);

    // Atualiza dados base
    const { error: updateError } = await supabase
      .from('races')
      .update({
        size: raceData.size || 'Médio',
        displacement: raceData.displacement || 9,
        publication: raceData.publication || 'Tormenta20',
      })
      .eq('id', existing.id);

    if (updateError) {
      console.error(`   ✗ Erro ao atualizar raça:`, updateError.message);
      return;
    }

    raceId = existing.id;

    // Remove atributos e habilidades antigas para reinserir
    await supabase.from('race_attributes').delete().eq('race_id', raceId);
    await supabase.from('race_abilities').delete().eq('race_id', raceId);

  } else {
    // Insere nova raça
    const { data: newRace, error: insertError } = await supabase
      .from('races')
      .insert({
        name: raceData.name,
        size: raceData.size || 'Médio',
        displacement: raceData.displacement || 9,
        publication: raceData.publication || 'Tormenta20',
      })
      .select('id')
      .single();

    if (insertError) {
      console.error(`   ✗ Erro ao inserir raça:`, insertError.message);
      return;
    }

    raceId = newRace.id;
    console.log(`   ✓ Raça criada com ID: ${raceId}`);
  }

  // 2. Insere atributos
  if (raceData.attributes && raceData.attributes.length > 0) {
    const attrs = raceData.attributes.map((a) => ({
      race_id: raceId,
      attr: normalizeAttr(a.attr),
      mod: a.mod || 0,
    }));

    const { error: attrError } = await supabase.from('race_attributes').insert(attrs);
    if (attrError) {
      console.error(`   ✗ Erro ao inserir atributos:`, attrError.message);
    } else {
      console.log(`   ✓ ${attrs.length} atributo(s) inserido(s)`);
    }
  }

  // 3. Insere habilidades
  if (raceData.abilities && raceData.abilities.length > 0) {
    const abilities = raceData.abilities.map((ab, idx) => ({
      race_id: raceId,
      name: ab.name,
      description: ab.description,
      sort_order: idx,
    }));

    const { error: abError } = await supabase.from('race_abilities').insert(abilities);
    if (abError) {
      console.error(`   ✗ Erro ao inserir habilidades:`, abError.message);
    } else {
      console.log(`   ✓ ${abilities.length} habilidade(s) inserida(s)`);
    }
  }

  console.log(`   ✅ ${raceData.name} importada com sucesso!`);
}

// ============================================================
// Main
// ============================================================

async function main() {
  console.log('🏛️  Importador de Raças — Tormenta20');
  console.log('=====================================');

  if (!fs.existsSync(RACES_DIR)) {
    console.error(`\n✗ Pasta não encontrada: ${RACES_DIR}`);
    console.log('  Crie a pasta src/lib/races_data/ e coloque os JSONs nela.');
    process.exit(1);
  }

  const files = fs.readdirSync(RACES_DIR).filter((f) => f.endsWith('.json'));

  if (files.length === 0) {
    console.log('\n⚠ Nenhum JSON encontrado em src/lib/races_data/');
    process.exit(0);
  }

  console.log(`\nEncontrado(s): ${files.length} arquivo(s)`);

  let success = 0;
  let errors = 0;

  for (const file of files) {
    try {
      const raw = fs.readFileSync(path.join(RACES_DIR, file), 'utf-8');
      const raceData = JSON.parse(raw);
      await importRace(raceData, file);
      success++;
    } catch (err) {
      console.error(`\n✗ Erro ao processar ${file}:`, err.message);
      errors++;
    }
  }

  console.log('\n=====================================');
  console.log(`✅ Importadas: ${success}`);
  if (errors > 0) console.log(`✗ Erros: ${errors}`);
  console.log('Importação concluída!');
}

main();
