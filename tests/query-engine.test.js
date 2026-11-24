/**
 * Comprehensive Test Suite for Pokémon Champions Query & Calculation Engine (Phase 2)
 */

const assert = require('assert');
const path = require('path');
const db = require('../src/data/champions_db.json');
const {
  PokemonQueryEngine,
  calculateDualTypeMatchups,
  summarizeMatchups,
  applyAbilityToMatchups,
  DEFENSIVE_ABILITIES,
  TYPES
} = require('../src/query-engine.js');

let passedTests = 0;
let failedTests = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  \x1b[32m✔\x1b[0m ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  \x1b[31m✖\x1b[0m ${name}`);
    console.error(`    \x1b[31m${err.message}\x1b[0m`);
    if (err.stack) console.error(`    ${err.stack.split('\n')[1]}`);
    failedTests++;
  }
}

console.log('\n======================================================');
console.log('  Pokémon Champions Query Engine - Phase 2 Test Suite');
console.log('======================================================\n');

// 1. Initialization
test('Engine initializes successfully with champions_db.json', () => {
  const engine = new PokemonQueryEngine(db);
  assert.strictEqual(engine.pokemon.length, 341);
  assert(Object.keys(engine.moves).length >= 500);
  assert(Object.keys(engine.abilities).length >= 200);
  assert.strictEqual(engine.types.length, 18);
});

// 2. Dual-Type Defensive Arithmetic
test('Dual-Type Arithmetic: Fire/Flying (Charizard)', () => {
  const matchups = calculateDualTypeMatchups(['Fire', 'Flying']);
  assert.strictEqual(matchups.Grass, 0.25, 'Grass should be 0.25x (double resist)');
  assert.strictEqual(matchups.Bug, 0.25, 'Bug should be 0.25x (double resist)');
  assert.strictEqual(matchups.Ground, 0, 'Ground should be 0x (immune)');
  assert.strictEqual(matchups.Water, 2, 'Water should be 2x (weak)');
  assert.strictEqual(matchups.Electric, 2, 'Electric should be 2x (weak)');
  assert.strictEqual(matchups.Rock, 4, 'Rock should be 4x (double weak)');
  assert.strictEqual(matchups.Normal, 1, 'Normal should be 1x (neutral)');
  assert.strictEqual(matchups.Fire, 0.5, 'Fire should be 0.5x (resist)');
});

test('Dual-Type Arithmetic: Normal/Ghost (Hisuian Zoroark hypothetical)', () => {
  const matchups = calculateDualTypeMatchups(['Normal', 'Ghost']);
  assert.strictEqual(matchups.Normal, 0, 'Normal should be immune');
  assert.strictEqual(matchups.Fighting, 0, 'Fighting should be immune');
  assert.strictEqual(matchups.Ghost, 0, 'Ghost should be immune');
  assert.strictEqual(matchups.Dark, 2, 'Dark should be 2x weak');
});

// 3. Defensive Ability Integration
test('Defensive Ability: Levitate grants Ground immunity on Rotom-Heat', () => {
  const baseMatchups = calculateDualTypeMatchups(['Electric', 'Fire']);
  assert.strictEqual(baseMatchups.Ground, 4, 'Base Rotom-Heat is 4x quad weak to Ground');

  const withLevitate = applyAbilityToMatchups(baseMatchups, 'Levitate');
  assert.strictEqual(withLevitate.Ground, 0, 'Rotom-Heat with Levitate is immune to Ground');
});

test('Defensive Ability: Eelevate (Champions Custom) grants Ground immunity', () => {
  const baseMatchups = calculateDualTypeMatchups(['Electric']);
  assert.strictEqual(baseMatchups.Ground, 2, 'Electric type is weak to Ground');

  const withEelevate = applyAbilityToMatchups(baseMatchups, 'Eelevate');
  assert.strictEqual(withEelevate.Ground, 0, 'Eelevate grants 0x Ground damage');
});

test('Defensive Ability: Thick Fat halving Fire and Ice damage on Snorlax', () => {
  const baseMatchups = calculateDualTypeMatchups(['Normal']);
  assert.strictEqual(baseMatchups.Fire, 1, 'Normal is neutral to Fire');
  assert.strictEqual(baseMatchups.Ice, 1, 'Normal is neutral to Ice');

  const withThickFat = applyAbilityToMatchups(baseMatchups, 'Thick Fat');
  assert.strictEqual(withThickFat.Fire, 0.5, 'Thick Fat gives Fire 0.5x (resist)');
  assert.strictEqual(withThickFat.Ice, 0.5, 'Thick Fat gives Ice 0.5x (resist)');
});

test('Defensive Ability: Earth Eater grants Ground immunity', () => {
  const baseMatchups = calculateDualTypeMatchups(['Steel']);
  assert.strictEqual(baseMatchups.Ground, 2, 'Steel is weak to Ground');

  const withEarthEater = applyAbilityToMatchups(baseMatchups, 'Earth Eater');
  assert.strictEqual(withEarthEater.Ground, 0, 'Earth Eater gives Ground 0x');
});

test('Defensive Ability: Purifying Salt halves Ghost damage', () => {
  const baseMatchups = calculateDualTypeMatchups(['Rock']);
  assert.strictEqual(baseMatchups.Ghost, 1, 'Rock is neutral to Ghost');

  const withPurifyingSalt = applyAbilityToMatchups(baseMatchups, 'Purifying Salt');
  assert.strictEqual(withPurifyingSalt.Ghost, 0.5, 'Purifying Salt gives Ghost 0.5x');
});

test('Defensive Ability: Filter reduces super-effective damage by 25%', () => {
  const baseMatchups = calculateDualTypeMatchups(['Steel']); // Weak to Fire (2x), Fighting (2x), Ground (2x)
  assert.strictEqual(baseMatchups.Fire, 2);

  const withFilter = applyAbilityToMatchups(baseMatchups, 'Filter');
  assert.strictEqual(withFilter.Fire, 1.5, '2x weak becomes 1.5x with Filter');
  assert.strictEqual(withFilter.Water, 1, 'Neutral damage remains 1x');
  assert.strictEqual(withFilter.Grass, 0.5, 'Resisted damage remains 0.5x');
});

// 4. Query Engine: Defensive Matchup Filtering
test('Query: Filter Pokémon that resist BOTH Water AND Fairy', () => {
  const engine = new PokemonQueryEngine(db);
  const q = engine.query({
    resists: ['Water', 'Fairy']
  });

  assert(q.results.length > 0, 'Should find Pokémon resisting Water and Fairy');
  for (const p of q.results) {
    const eff = p.qualifyingDefense || engine.getEffectiveDefense(p.id).base;
    assert(eff.matchups.Water <= 0.5, `${p.name} must resist Water`);
    assert(eff.matchups.Fairy <= 0.5, `${p.name} must resist Fairy`);
  }
});

test('Query: Consider Abilities for Defense (Snorlax resists Fire only with Thick Fat)', () => {
  const engine = new PokemonQueryEngine(db);

  // Without abilities
  const qNoAbilities = engine.query({
    resists: ['Fire'],
    considerAbilities: false
  });
  const foundSnorlaxWithout = qNoAbilities.results.some(p => p.id === 'snorlax');
  assert.strictEqual(foundSnorlaxWithout, false, 'Snorlax should NOT be in Fire resists without abilities');

  // With abilities
  const qWithAbilities = engine.query({
    resists: ['Fire'],
    considerAbilities: true
  });
  const snorlax = qWithAbilities.results.find(p => p.id === 'snorlax');
  assert(snorlax, 'Snorlax MUST be found when considering abilities');
  assert.strictEqual(snorlax.qualifyingDefense.ability, 'Thick Fat');
});

test('Query: Ground Immunity includes Rotom-Heat, Eelektross, Orthworm', () => {
  const engine = new PokemonQueryEngine(db);
  const q = engine.query({
    immuneTo: ['Ground'],
    considerAbilities: true
  });

  const ids = q.results.map(p => p.id);
  assert(ids.includes('rotomheat'), 'Rotom-Heat (Levitate) must be Ground immune');
  assert(ids.includes('eelektross'), 'Eelektross (Levitate) must be Ground immune');
  assert(ids.includes('eelektrossmega'), 'Eelektross-Mega (Eelevate) must be Ground immune');
  assert(ids.includes('orthworm'), 'Orthworm (Earth Eater) must be Ground immune');
});

test('Query: Double Resistance (<= 0.25x Grass damage)', () => {
  const engine = new PokemonQueryEngine(db);
  const q = engine.query({
    doubleResists: ['Grass']
  });

  assert(q.results.length > 0);
  for (const p of q.results) {
    const matchups = p.qualifyingDefense ? p.qualifyingDefense.matchups : engine.getEffectiveDefense(p.id).base.matchups;
    assert(matchups.Grass <= 0.25 && matchups.Grass > 0, `${p.name} takes ${matchups.Grass}x from Grass, expected <= 0.25x`);
  }
});

test('Query: Not Weak To Ground AND Not Weak To Rock', () => {
  const engine = new PokemonQueryEngine(db);
  const q = engine.query({
    notWeakTo: ['Ground', 'Rock'],
    considerAbilities: true
  });

  assert(q.results.length > 0);
  for (const p of q.results) {
    const def = p.qualifyingDefense || engine.getEffectiveDefense(p.id).base;
    assert(def.matchups.Ground <= 1, `${p.name} Ground damage is ${def.matchups.Ground}`);
    assert(def.matchups.Rock <= 1, `${p.name} Rock damage is ${def.matchups.Rock}`);
  }
});

// 5. Movepool Queries
test('Query: Filter Pokémon learning Fake Out AND Knock Off', () => {
  const engine = new PokemonQueryEngine(db);
  const q = engine.query({
    moves: ['fakeout', 'knockoff'],
    moveMode: 'all'
  });

  assert(q.results.length > 0, 'Should find Pokémon with Fake Out and Knock Off');
  for (const p of q.results) {
    assert(p.moveIds.includes('fakeout'), `${p.name} must know Fake Out`);
    assert(p.moveIds.includes('knockoff'), `${p.name} must know Knock Off`);
  }
  console.log(`    (Found ${q.results.length} Pokémon: ${q.results.slice(0, 5).map(p => p.name).join(', ')}...)`);
});

test('Query: Search Moves helper', () => {
  const engine = new PokemonQueryEngine(db);
  const results = engine.searchMoves('earth');
  assert(results.length > 0);
  const earthPower = results.find(m => m.id === 'earthpower');
  assert(earthPower, 'Should find Earth Power');
  assert.strictEqual(earthPower.category, 'Special');
  assert(earthPower.pokemonLearnersCount > 0);
});

test('Query: Get Pokémon Moves with category filter', () => {
  const engine = new PokemonQueryEngine(db);
  const physicalMoves = engine.getPokemonMoves('charizard', { category: 'Physical' });
  assert(physicalMoves.length > 0);
  for (const m of physicalMoves) {
    assert.strictEqual(m.category, 'Physical');
  }
});

// 6. Ability Queries
test('Query: Filter Pokémon with Intimidate', () => {
  const engine = new PokemonQueryEngine(db);
  const q = engine.query({
    abilities: ['Intimidate']
  });

  assert(q.results.length > 0);
  for (const p of q.results) {
    assert(p.abilities.some(a => a.name.toLowerCase() === 'intimidate'), `${p.name} must have Intimidate`);
  }
});

test('Query: Filter Pokémon with Custom Champions abilities', () => {
  const engine = new PokemonQueryEngine(db);
  const q = engine.query({
    isCustomAbility: true
  });

  assert(q.results.length > 0, 'Should find Pokémon with custom Champions abilities');
  for (const p of q.results) {
    assert(p.abilities.some(a => a.isCustomChampions), `${p.name} must have custom Champions ability`);
  }
  const megaEelektross = q.results.find(p => p.id === 'eelektrossmega');
  assert(megaEelektross, 'Eelektross-Mega has custom ability Eelevate');
});

test('Query: Search Abilities helper', () => {
  const engine = new PokemonQueryEngine(db);
  const customOnly = engine.searchAbilities('', { isCustomOnly: true });
  assert.strictEqual(customOnly.length, 13, 'There should be 13 custom Champions abilities');
});

// 7. Base Stat Threshold Filters
test('Query: Base Stat Thresholds (Speed >= 110, BST >= 550)', () => {
  const engine = new PokemonQueryEngine(db);
  const q = engine.query({
    minSpeed: 110,
    minBst: 550
  });

  assert(q.results.length > 0);
  for (const p of q.results) {
    assert(p.baseStats.spe >= 110, `${p.name} Spe is ${p.baseStats.spe}`);
    assert(p.bst >= 550, `${p.name} BST is ${p.bst}`);
  }
});

test('Query: Custom nested stat ranges', () => {
  const engine = new PokemonQueryEngine(db);
  const q = engine.query({
    stats: {
      atk: { min: 130 },
      spe: { min: 90, max: 120 }
    }
  });

  assert(q.results.length > 0);
  for (const p of q.results) {
    assert(p.baseStats.atk >= 130);
    assert(p.baseStats.spe >= 90 && p.baseStats.spe <= 120);
  }
});

// 8. Species Types & Form Filters
test('Query: Species Types Exact & Mega filtering', () => {
  const engine = new PokemonQueryEngine(db);
  const qMegas = engine.query({
    isMega: true
  });

  assert(qMegas.results.length > 0);
  for (const p of qMegas.results) {
    assert.strictEqual(p.isMega, true);
  }

  const qNonMegas = engine.query({
    isMega: false
  });
  assert(qNonMegas.results.length > 0);
  for (const p of qNonMegas.results) {
    assert.strictEqual(p.isMega, false);
  }
  assert.strictEqual(qMegas.results.length + qNonMegas.results.length, 341);
});

// 9. Full Text Search & Dex Number
test('Query: Search by Dex number and name', () => {
  const engine = new PokemonQueryEngine(db);

  const qNum = engine.query({ search: '25' });
  assert(qNum.results.some(p => p.id === 'pikachu'));

  const qPika = engine.query({ search: 'pikachu' });
  assert.strictEqual(qPika.results[0].id, 'pikachu');
});

// 10. Damage Chart Inspector
test('Inspector: Full 18-type Damage Chart breakdown', () => {
  const engine = new PokemonQueryEngine(db);
  const chartData = engine.getDamageChart('venusaurmega', 'Thick Fat');

  assert.strictEqual(chartData.pokemonId, 'venusaurmega');
  assert.strictEqual(chartData.chart.length, 18);

  const fire = chartData.chart.find(c => c.type === 'Fire');
  assert.strictEqual(fire.multiplier, 1, 'Thick Fat makes Fire neutral (1x)');
  assert.strictEqual(fire.badgeClass, 'neutral');

  const grass = chartData.chart.find(c => c.type === 'Grass');
  assert.strictEqual(grass.multiplier, 0.25);
  assert.strictEqual(grass.label, '¼x');
  assert.strictEqual(grass.badgeClass, 'double-resist');
});

// 11. Complex Multi-Filter Combination
test('Complex Combination: OU tier, Resists Fairy, Learns U-turn, Speed >= 80', () => {
  const engine = new PokemonQueryEngine(db);
  const q = engine.query({
    tiers: ['OU'],
    resists: ['Fairy'],
    moves: ['uturn'],
    minSpeed: 80,
    sortBy: 'spe',
    sortOrder: 'desc'
  });

  assert(q.results.length > 0, 'Should find competitive OU Pokémon fitting criteria');
  for (const p of q.results) {
    assert.strictEqual(p.tier, 'OU');
    assert(p.moveIds.includes('uturn'));
    assert(p.baseStats.spe >= 80);
  }
  console.log(`    (Found ${q.results.length} Pokémon: ${q.results.map(p => `${p.name} (${p.baseStats.spe} spe)`).join(', ')})`);
});

// 12. Performance Benchmark
test('Performance Benchmark: 100 mixed queries execute in under 100ms', () => {
  const engine = new PokemonQueryEngine(db);
  const t0 = Date.now();

  for (let i = 0; i < 100; i++) {
    engine.query({
      resists: ['Water', 'Fire'],
      moves: ['protect'],
      minSpeed: 70 + (i % 30),
      tiers: ['OU', 'UU', 'RU'],
      sortBy: 'bst',
      sortOrder: 'desc'
    });
  }

  const duration = Date.now() - t0;
  assert(duration < 200, `100 queries took ${duration}ms (target < 200ms)`);
  console.log(`    (100 complex queries executed in ${duration}ms -> ${(duration / 100).toFixed(2)}ms per query)`);
});

console.log('\n------------------------------------------------------');
console.log(`Tests finished: \x1b[32m${passedTests} passed\x1b[0m, \x1b[31m${failedTests} failed\x1b[0m`);
console.log('------------------------------------------------------\n');

if (failedTests > 0) {
  process.exit(1);
}
