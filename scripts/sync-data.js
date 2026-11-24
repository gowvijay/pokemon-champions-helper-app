const fs = require('fs');
const path = require('path');
const https = require('https');
const vm = require('vm');
const { Dex } = require('@pkmn/dex');

const CACHE_DIR = path.join(__dirname, '.cache');
const OUTPUT_FILE = path.join(__dirname, '../src/data/champions_db.json');

const URLS = {
  formatsData: 'https://raw.githubusercontent.com/smogon/pokemon-showdown/master/data/mods/champions/formats-data.ts',
  learnsets: 'https://raw.githubusercontent.com/smogon/pokemon-showdown/master/data/mods/champions/learnsets.ts',
  championsAbilities: 'https://raw.githubusercontent.com/smogon/pokemon-showdown/master/data/mods/champions/abilities.ts',
};

const ATK_TYPES = [
  'Normal', 'Fire', 'Water', 'Electric', 'Grass', 'Ice',
  'Fighting', 'Poison', 'Ground', 'Flying', 'Psychic', 'Bug',
  'Rock', 'Ghost', 'Dragon', 'Dark', 'Steel', 'Fairy'
];

function fetchText(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchText(res.headers.location).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`Failed to fetch ${url}: HTTP ${res.statusCode}`));
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

async function getCachedOrFetch(key, url, force = false) {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }
  const cachePath = path.join(CACHE_DIR, `${key}.ts`);
  if (!force && fs.existsSync(cachePath)) {
    console.log(`[Cache] Loading ${key} from cache...`);
    return fs.readFileSync(cachePath, 'utf8');
  }
  console.log(`[Fetch] Fetching ${key} from GitHub...`);
  const content = await fetchText(url);
  fs.writeFileSync(cachePath, content, 'utf8');
  return content;
}

function parseShowdownTs(content, varName) {
  const cleaned = content.replace(new RegExp(`export\\s+const\\s+${varName}[^=]*=`), `const ${varName} =`);
  const sandbox = {};
  vm.createContext(sandbox);
  vm.runInContext(cleaned + `;\nsandboxResult = ${varName};`, sandbox);
  return sandbox.sandboxResult;
}

function calculateDefensiveMatchups(types) {
  const matchups = {};
  const immunities = [];
  const resistancesQuarter = [];
  const resistancesHalf = [];
  const weaknessesDouble = [];
  const weaknessesQuad = [];

  for (const atk of ATK_TYPES) {
    let mult = 1.0;
    for (const def of types) {
      const val = Dex.forGen(9).types.get(def).damageTaken[atk];
      // 0 = 1x, 1 = 2x (weak), 2 = 0.5x (resist), 3 = 0x (immune)
      if (val === 1) mult *= 2;
      else if (val === 2) mult *= 0.5;
      else if (val === 3) mult *= 0;
    }
    matchups[atk] = mult;
    if (mult === 0) immunities.push(atk);
    else if (mult === 0.25) resistancesQuarter.push(atk);
    else if (mult === 0.5) resistancesHalf.push(atk);
    else if (mult === 2) weaknessesDouble.push(atk);
    else if (mult === 4) weaknessesQuad.push(atk);
  }

  return {
    matchups,
    immunities,
    resistancesQuarter,
    resistancesHalf,
    resistances: [...resistancesQuarter, ...resistancesHalf],
    weaknessesDouble,
    weaknessesQuad,
    weaknesses: [...weaknessesDouble, ...weaknessesQuad]
  };
}

async function main() {
  console.log("=== Starting Pokémon Champions Data Ingestion ===");

  const formatsText = await getCachedOrFetch('formats-data', URLS.formatsData);
  const learnsetsText = await getCachedOrFetch('learnsets', URLS.learnsets);
  const abilitiesModText = await getCachedOrFetch('abilities', URLS.championsAbilities);

  const formatsData = parseShowdownTs(formatsText, 'FormatsData');
  const championsLearnsets = parseShowdownTs(learnsetsText, 'Learnsets');
  const championsAbilities = parseShowdownTs(abilitiesModText, 'Abilities');

  const gen9Dex = Dex.forGen(9);

  // Filter legal species in Champions
  const legalKeys = Object.keys(formatsData).filter(key => {
    const entry = formatsData[key];
    return entry.tier && entry.tier !== 'Illegal' && entry.isNonstandard !== 'Past';
  });

  console.log(`Processing ${legalKeys.length} legal Pokémon species...`);

  const pokemonList = [];
  const allMovesMap = {};
  const allAbilitiesMap = {};

  for (const key of legalKeys) {
    const formatEntry = formatsData[key];
    const species = gen9Dex.species.get(key);

    if (!species || !species.exists) continue;

    // Determine BST
    const bst = Object.values(species.baseStats).reduce((acc, val) => acc + val, 0);

    // Resolve learnset
    let rawLearnset = championsLearnsets[key]?.learnset;
    if (!rawLearnset && species.baseSpecies) {
      const baseKey = species.baseSpecies.toLowerCase().replace(/[^a-z0-9]/g, '');
      rawLearnset = championsLearnsets[baseKey]?.learnset;
    }
    if (!rawLearnset && species.prevo) {
      const prevoKey = species.prevo.toLowerCase().replace(/[^a-z0-9]/g, '');
      rawLearnset = championsLearnsets[prevoKey]?.learnset;
    }

    const moveIds = [];
    if (rawLearnset) {
      for (const moveId of Object.keys(rawLearnset)) {
        const move = gen9Dex.moves.get(moveId);
        if (move && move.exists) {
          moveIds.push(move.id);
          if (!allMovesMap[move.id]) {
            allMovesMap[move.id] = {
              id: move.id,
              name: move.name,
              type: move.type,
              category: move.category, // Physical, Special, Status
              basePower: move.basePower,
              accuracy: move.accuracy === true ? '-' : move.accuracy,
              pp: move.pp,
              priority: move.priority,
              shortDesc: move.shortDesc || move.desc || ''
            };
          }
        }
      }
    }

    moveIds.sort();

    // Resolve abilities
    const abilitySlots = [];
    for (const [slot, abilityName] of Object.entries(species.abilities)) {
      const abilityId = abilityName.toLowerCase().replace(/[^a-z0-9]/g, '');
      const ability = gen9Dex.abilities.get(abilityName);
      const modDesc = championsAbilities[abilityId]?.shortDesc || championsAbilities[abilityId]?.desc;
      const desc = modDesc || (ability ? (ability.shortDesc || ability.desc) : '');
      const isCustomChampions = !!championsAbilities[abilityId];

      const slotType = slot === 'H' ? 'Hidden' : slot === 'S' ? 'Special' : (slot === '0' ? 'Primary' : 'Secondary');
      abilitySlots.push({
        slot: slotType,
        name: abilityName,
        desc: desc || '',
        isCustomChampions
      });

      if (!allAbilitiesMap[abilityName]) {
        allAbilitiesMap[abilityName] = {
          name: abilityName,
          desc: desc || '',
          isCustomChampions
        };
      }
    }

    // Defensive matchups
    const defense = calculateDefensiveMatchups(species.types);

    const isMega = species.isMega || species.forme?.toLowerCase().includes('mega');
    const spriteShowdown = `https://play.pokemonshowdown.com/sprites/gen5/${species.id}.png`;
    const officialArtwork = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${species.num}.png`;

    pokemonList.push({
      id: species.id,
      num: species.num,
      name: species.name,
      baseSpecies: species.baseSpecies || species.name,
      forme: species.forme || null,
      isMega: !!isMega,
      types: species.types,
      baseStats: species.baseStats,
      bst,
      abilities: abilitySlots,
      tier: formatEntry.tier,
      heightm: species.heightm,
      weightkg: species.weightkg,
      sprite: spriteShowdown,
      artwork: officialArtwork,
      moveIds,
      defense
    });
  }

  // Sort by National Dex Number, then Form
  pokemonList.sort((a, b) => {
    if (a.num !== b.num) return a.num - b.num;
    return a.name.localeCompare(b.name);
  });

  const output = {
    metadata: {
      generatedAt: new Date().toISOString(),
      game: 'Pokémon Champions',
      totalPokemon: pokemonList.length,
      types: ATK_TYPES
    },
    types: ATK_TYPES,
    pokemon: pokemonList,
    moves: allMovesMap,
    abilities: allAbilitiesMap
  };

  fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output), 'utf8');

  const stats = fs.statSync(OUTPUT_FILE);
  console.log(`\nSuccessfully generated ${OUTPUT_FILE} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
  console.log(`- Total legal Pokémon: ${pokemonList.length}`);
  console.log(`- Unique moves recorded: ${Object.keys(allMovesMap).length}`);
  console.log(`- Unique abilities recorded: ${Object.keys(allAbilitiesMap).length}`);
  console.log("=== Phase 1 Ingestion Complete ===");
}

main().catch(err => {
  console.error("Fatal ingestion error:", err);
  process.exit(1);
});
