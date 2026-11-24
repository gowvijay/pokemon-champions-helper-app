/**
 * Pokémon Champions Query & Calculation Engine
 * 
 * Provides competitive querying, dual-type defensive arithmetic,
 * type-altering ability integration (Levitate, Thick Fat, Flash Fire, Eelevate, etc.),
 * movepool searching, stat threshold filters, and fast inverted indexing.
 * 
 * Universal Module: compatible with Node.js, Browser scripts, and ES modules.
 */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.PokemonQueryEngine = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {

  // 18 Standard Pokémon Types
  const TYPES = [
    'Normal', 'Fire', 'Water', 'Electric', 'Grass', 'Ice',
    'Fighting', 'Poison', 'Ground', 'Flying', 'Psychic', 'Bug',
    'Rock', 'Ghost', 'Dragon', 'Dark', 'Steel', 'Fairy'
  ];

  // Modern UI Type Badge Colors (dark-mode tailored)
  const TYPE_COLORS = {
    Normal: { bg: '#9FA19F', text: '#FFFFFF', glow: 'rgba(159, 161, 159, 0.4)' },
    Fire: { bg: '#FF4422', text: '#FFFFFF', glow: 'rgba(255, 68, 34, 0.5)' },
    Water: { bg: '#2288FF', text: '#FFFFFF', glow: 'rgba(34, 136, 255, 0.5)' },
    Electric: { bg: '#FFCC00', text: '#1A1A1A', glow: 'rgba(255, 204, 0, 0.5)' },
    Grass: { bg: '#44BB44', text: '#FFFFFF', glow: 'rgba(68, 187, 68, 0.5)' },
    Ice: { bg: '#33CCFF', text: '#1A1A1A', glow: 'rgba(51, 204, 255, 0.5)' },
    Fighting: { bg: '#FF6600', text: '#FFFFFF', glow: 'rgba(255, 102, 0, 0.5)' },
    Poison: { bg: '#AA44CC', text: '#FFFFFF', glow: 'rgba(170, 68, 204, 0.5)' },
    Ground: { bg: '#CC8844', text: '#FFFFFF', glow: 'rgba(204, 136, 68, 0.5)' },
    Flying: { bg: '#7799FF', text: '#FFFFFF', glow: 'rgba(119, 153, 255, 0.5)' },
    Psychic: { bg: '#FF4488', text: '#FFFFFF', glow: 'rgba(255, 68, 136, 0.5)' },
    Bug: { bg: '#99BB22', text: '#FFFFFF', glow: 'rgba(153, 187, 34, 0.5)' },
    Rock: { bg: '#BBAA66', text: '#FFFFFF', glow: 'rgba(187, 170, 102, 0.5)' },
    Ghost: { bg: '#775599', text: '#FFFFFF', glow: 'rgba(119, 85, 153, 0.5)' },
    Dragon: { bg: '#6655EE', text: '#FFFFFF', glow: 'rgba(102, 85, 238, 0.5)' },
    Dark: { bg: '#554444', text: '#FFFFFF', glow: 'rgba(85, 68, 68, 0.5)' },
    Steel: { bg: '#66AABB', text: '#FFFFFF', glow: 'rgba(102, 170, 187, 0.5)' },
    Fairy: { bg: '#EE66EE', text: '#FFFFFF', glow: 'rgba(238, 102, 238, 0.5)' }
  };

  // Canonical Gen 9 Single-Type Defensive Chart: TYPE_CHART[defender][attacker] = damage multiplier
  const TYPE_CHART = {
    Normal: { Normal: 1, Fire: 1, Water: 1, Electric: 1, Grass: 1, Ice: 1, Fighting: 2, Poison: 1, Ground: 1, Flying: 1, Psychic: 1, Bug: 1, Rock: 1, Ghost: 0, Dragon: 1, Dark: 1, Steel: 1, Fairy: 1 },
    Fire: { Normal: 1, Fire: 0.5, Water: 2, Electric: 1, Grass: 0.5, Ice: 0.5, Fighting: 1, Poison: 1, Ground: 2, Flying: 1, Psychic: 1, Bug: 0.5, Rock: 2, Ghost: 1, Dragon: 1, Dark: 1, Steel: 0.5, Fairy: 0.5 },
    Water: { Normal: 1, Fire: 0.5, Water: 0.5, Electric: 2, Grass: 2, Ice: 0.5, Fighting: 1, Poison: 1, Ground: 1, Flying: 1, Psychic: 1, Bug: 1, Rock: 1, Ghost: 1, Dragon: 1, Dark: 1, Steel: 0.5, Fairy: 1 },
    Electric: { Normal: 1, Fire: 1, Water: 1, Electric: 0.5, Grass: 1, Ice: 1, Fighting: 1, Poison: 1, Ground: 2, Flying: 0.5, Psychic: 1, Bug: 1, Rock: 1, Ghost: 1, Dragon: 1, Dark: 1, Steel: 0.5, Fairy: 1 },
    Grass: { Normal: 1, Fire: 2, Water: 0.5, Electric: 0.5, Grass: 0.5, Ice: 2, Fighting: 1, Poison: 2, Ground: 0.5, Flying: 2, Psychic: 1, Bug: 2, Rock: 1, Ghost: 1, Dragon: 1, Dark: 1, Steel: 1, Fairy: 1 },
    Ice: { Normal: 1, Fire: 2, Water: 1, Electric: 1, Grass: 1, Ice: 0.5, Fighting: 2, Poison: 1, Ground: 1, Flying: 1, Psychic: 1, Bug: 1, Rock: 2, Ghost: 1, Dragon: 1, Dark: 1, Steel: 2, Fairy: 1 },
    Fighting: { Normal: 1, Fire: 1, Water: 1, Electric: 1, Grass: 1, Ice: 1, Fighting: 1, Poison: 1, Ground: 1, Flying: 2, Psychic: 2, Bug: 0.5, Rock: 0.5, Ghost: 1, Dragon: 1, Dark: 0.5, Steel: 1, Fairy: 2 },
    Poison: { Normal: 1, Fire: 1, Water: 1, Electric: 1, Grass: 0.5, Ice: 1, Fighting: 0.5, Poison: 0.5, Ground: 2, Flying: 1, Psychic: 2, Bug: 0.5, Rock: 1, Ghost: 1, Dragon: 1, Dark: 1, Steel: 1, Fairy: 0.5 },
    Ground: { Normal: 1, Fire: 1, Water: 2, Electric: 0, Grass: 2, Ice: 2, Fighting: 1, Poison: 0.5, Ground: 1, Flying: 1, Psychic: 1, Bug: 1, Rock: 0.5, Ghost: 1, Dragon: 1, Dark: 1, Steel: 1, Fairy: 1 },
    Flying: { Normal: 1, Fire: 1, Water: 1, Electric: 2, Grass: 0.5, Ice: 2, Fighting: 0.5, Poison: 1, Ground: 0, Flying: 1, Psychic: 1, Bug: 0.5, Rock: 2, Ghost: 1, Dragon: 1, Dark: 1, Steel: 1, Fairy: 1 },
    Psychic: { Normal: 1, Fire: 1, Water: 1, Electric: 1, Grass: 1, Ice: 1, Fighting: 0.5, Poison: 1, Ground: 1, Flying: 1, Psychic: 0.5, Bug: 2, Rock: 1, Ghost: 2, Dragon: 1, Dark: 2, Steel: 1, Fairy: 1 },
    Bug: { Normal: 1, Fire: 2, Water: 1, Electric: 1, Grass: 0.5, Ice: 1, Fighting: 0.5, Poison: 1, Ground: 0.5, Flying: 2, Psychic: 1, Bug: 1, Rock: 2, Ghost: 1, Dragon: 1, Dark: 1, Steel: 1, Fairy: 1 },
    Rock: { Normal: 0.5, Fire: 0.5, Water: 2, Electric: 1, Grass: 2, Ice: 1, Fighting: 2, Poison: 0.5, Ground: 2, Flying: 0.5, Psychic: 1, Bug: 1, Rock: 1, Ghost: 1, Dragon: 1, Dark: 1, Steel: 2, Fairy: 1 },
    Ghost: { Normal: 0, Fire: 1, Water: 1, Electric: 1, Grass: 1, Ice: 1, Fighting: 0, Poison: 0.5, Ground: 1, Flying: 1, Psychic: 1, Bug: 0.5, Rock: 1, Ghost: 2, Dragon: 1, Dark: 2, Steel: 1, Fairy: 1 },
    Dragon: { Normal: 1, Fire: 0.5, Water: 0.5, Electric: 0.5, Grass: 0.5, Ice: 2, Fighting: 1, Poison: 1, Ground: 1, Flying: 1, Psychic: 1, Bug: 1, Rock: 1, Ghost: 1, Dragon: 2, Dark: 1, Steel: 1, Fairy: 2 },
    Dark: { Normal: 1, Fire: 1, Water: 1, Electric: 1, Grass: 1, Ice: 1, Fighting: 2, Poison: 1, Ground: 1, Flying: 1, Psychic: 0, Bug: 2, Rock: 1, Ghost: 0.5, Dragon: 1, Dark: 0.5, Steel: 1, Fairy: 2 },
    Steel: { Normal: 0.5, Fire: 2, Water: 1, Electric: 1, Grass: 0.5, Ice: 0.5, Fighting: 2, Poison: 0, Ground: 2, Flying: 0.5, Psychic: 0.5, Bug: 0.5, Rock: 0.5, Ghost: 1, Dragon: 0.5, Dark: 1, Steel: 0.5, Fairy: 0.5 },
    Fairy: { Normal: 1, Fire: 1, Water: 1, Electric: 1, Grass: 1, Ice: 1, Fighting: 0.5, Poison: 2, Ground: 1, Flying: 1, Psychic: 1, Bug: 0.5, Rock: 1, Ghost: 1, Dragon: 0, Dark: 0.5, Steel: 2, Fairy: 1 }
  };

  /**
   * Defensive ability definitions and their damage modifiers
   */
  const DEFENSIVE_ABILITIES = {
    'Levitate': {
      desc: 'Immune to Ground attacks',
      modify: (matchups) => ({ ...matchups, Ground: 0 }),
      affectedTypes: ['Ground']
    },
    'Eelevate': {
      desc: 'Champions custom: Immune to Ground attacks',
      modify: (matchups) => ({ ...matchups, Ground: 0 }),
      affectedTypes: ['Ground']
    },
    'Earth Eater': {
      desc: 'Immune to Ground attacks and heals HP',
      modify: (matchups) => ({ ...matchups, Ground: 0 }),
      affectedTypes: ['Ground']
    },
    'Flash Fire': {
      desc: 'Immune to Fire attacks and boosts Fire power',
      modify: (matchups) => ({ ...matchups, Fire: 0 }),
      affectedTypes: ['Fire']
    },
    'Volt Absorb': {
      desc: 'Immune to Electric attacks and heals HP',
      modify: (matchups) => ({ ...matchups, Electric: 0 }),
      affectedTypes: ['Electric']
    },
    'Lightning Rod': {
      desc: 'Immune to Electric attacks and boosts Sp. Atk',
      modify: (matchups) => ({ ...matchups, Electric: 0 }),
      affectedTypes: ['Electric']
    },
    'Motor Drive': {
      desc: 'Immune to Electric attacks and boosts Speed',
      modify: (matchups) => ({ ...matchups, Electric: 0 }),
      affectedTypes: ['Electric']
    },
    'Water Absorb': {
      desc: 'Immune to Water attacks and heals HP',
      modify: (matchups) => ({ ...matchups, Water: 0 }),
      affectedTypes: ['Water']
    },
    'Dry Skin': {
      desc: 'Immune to Water attacks; takes 1.25x damage from Fire',
      modify: (matchups) => ({ ...matchups, Water: 0, Fire: (matchups.Fire || 1) * 1.25 }),
      affectedTypes: ['Water', 'Fire']
    },
    'Sap Sipper': {
      desc: 'Immune to Grass attacks and boosts Attack',
      modify: (matchups) => ({ ...matchups, Grass: 0 }),
      affectedTypes: ['Grass']
    },
    'Thick Fat': {
      desc: 'Halves damage from Fire and Ice attacks',
      modify: (matchups) => ({
        ...matchups,
        Fire: (matchups.Fire || 1) * 0.5,
        Ice: (matchups.Ice || 1) * 0.5
      }),
      affectedTypes: ['Fire', 'Ice']
    },
    'Heatproof': {
      desc: 'Halves damage from Fire attacks',
      modify: (matchups) => ({ ...matchups, Fire: (matchups.Fire || 1) * 0.5 }),
      affectedTypes: ['Fire']
    },
    'Water Bubble': {
      desc: 'Halves damage from Fire attacks and doubles Water power',
      modify: (matchups) => ({ ...matchups, Fire: (matchups.Fire || 1) * 0.5 }),
      affectedTypes: ['Fire']
    },
    'Purifying Salt': {
      desc: 'Halves damage from Ghost attacks',
      modify: (matchups) => ({ ...matchups, Ghost: (matchups.Ghost || 1) * 0.5 }),
      affectedTypes: ['Ghost']
    },
    'Filter': {
      desc: 'Reduces supereffective attack damage by 25%',
      modify: (matchups) => {
        const next = { ...matchups };
        for (const type of TYPES) {
          if (next[type] > 1) next[type] = next[type] * 0.75;
        }
        return next;
      },
      affectedTypes: TYPES
    },
    'Solid Rock': {
      desc: 'Reduces supereffective attack damage by 25%',
      modify: (matchups) => {
        const next = { ...matchups };
        for (const type of TYPES) {
          if (next[type] > 1) next[type] = next[type] * 0.75;
        }
        return next;
      },
      affectedTypes: TYPES
    },
    'Fluffy': {
      desc: 'Takes 2x damage from Fire attacks',
      modify: (matchups) => ({ ...matchups, Fire: (matchups.Fire || 1) * 2 }),
      affectedTypes: ['Fire']
    }
  };

  /**
   * Calculate dual-type damage taken multipliers for defending types
   */
  function calculateDualTypeMatchups(types) {
    const matchups = {};
    for (const atk of TYPES) {
      let mult = 1.0;
      for (const def of types) {
        if (TYPE_CHART[def] && TYPE_CHART[def][atk] !== undefined) {
          mult *= TYPE_CHART[def][atk];
        }
      }
      matchups[atk] = mult;
    }
    return matchups;
  }

  /**
   * Group damage matchups into categorized arrays
   */
  function summarizeMatchups(matchups) {
    const immunities = [];
    const resistancesQuarter = [];
    const resistancesHalf = [];
    const neutrals = [];
    const weaknessesDouble = [];
    const weaknessesQuad = [];

    for (const type of TYPES) {
      const mult = matchups[type];
      if (mult === 0) {
        immunities.push(type);
      } else if (mult <= 0.25) {
        resistancesQuarter.push(type);
      } else if (mult <= 0.5) {
        resistancesHalf.push(type);
      } else if (mult === 1) {
        neutrals.push(type);
      } else if (mult >= 3) {
        weaknessesQuad.push(type);
      } else if (mult > 1) {
        weaknessesDouble.push(type);
      } else {
        neutrals.push(type);
      }
    }

    const resistances = [...resistancesQuarter, ...resistancesHalf];
    const weaknesses = [...weaknessesDouble, ...weaknessesQuad];

    return {
      matchups,
      immunities,
      resistancesQuarter,
      resistancesHalf,
      resistances,
      neutrals,
      weaknessesDouble,
      weaknessesQuad,
      weaknesses
    };
  }

  /**
   * Apply defensive ability modifier to a matchups map
   */
  function applyAbilityToMatchups(baseMatchups, abilityName) {
    if (!abilityName || !DEFENSIVE_ABILITIES[abilityName]) {
      return baseMatchups;
    }
    return DEFENSIVE_ABILITIES[abilityName].modify(baseMatchups);
  }

  /**
   * Core Query Engine Class
   */
  class PokemonQueryEngine {
    constructor(database) {
      if (!database || !Array.isArray(database.pokemon)) {
        throw new Error('PokemonQueryEngine requires a valid database with a pokemon array.');
      }
      this.db = database;
      this.pokemon = database.pokemon;
      this.moves = database.moves || {};
      this.abilities = database.abilities || {};
      this.types = database.types || TYPES;
      this.metadata = database.metadata || {};

      this._buildIndexes();
    }

    /**
     * Build fast inverted indexes for instant client-side querying
     */
    _buildIndexes() {
      this.pokemonById = new Map();
      this.pokemonByNum = new Map();
      this.pokemonByName = new Map();

      this.invertedTypeIndex = new Map();
      this.invertedTierIndex = new Map();
      this.invertedMoveIndex = new Map();
      this.invertedAbilityIndex = new Map();
      this.megaIds = new Set();
      this.nonMegaIds = new Set();

      // Pre-calculated effective defenses per Pokémon
      this.effectiveDefensesById = new Map();

      // Stat bounds
      this.statRanges = {
        hp: { min: Infinity, max: -Infinity },
        atk: { min: Infinity, max: -Infinity },
        def: { min: Infinity, max: -Infinity },
        spa: { min: Infinity, max: -Infinity },
        spd: { min: Infinity, max: -Infinity },
        spe: { min: Infinity, max: -Infinity },
        bst: { min: Infinity, max: -Infinity }
      };

      for (const p of this.pokemon) {
        this.pokemonById.set(p.id, p);
        this.pokemonByName.set(p.name.toLowerCase(), p);

        // Group by dex number (base and alternate forms)
        if (!this.pokemonByNum.has(p.num)) {
          this.pokemonByNum.set(p.num, []);
        }
        this.pokemonByNum.get(p.num).push(p);

        // Megas
        if (p.isMega) {
          this.megaIds.add(p.id);
        } else {
          this.nonMegaIds.add(p.id);
        }

        // Tier index
        if (p.tier) {
          if (!this.invertedTierIndex.has(p.tier)) {
            this.invertedTierIndex.set(p.tier, new Set());
          }
          this.invertedTierIndex.get(p.tier).add(p.id);
        }

        // Species types index
        for (const t of p.types) {
          if (!this.invertedTypeIndex.has(t)) {
            this.invertedTypeIndex.set(t, new Set());
          }
          this.invertedTypeIndex.get(t).add(p.id);
        }

        // Movepool index
        if (Array.isArray(p.moveIds)) {
          for (const mId of p.moveIds) {
            if (!this.invertedMoveIndex.has(mId)) {
              this.invertedMoveIndex.set(mId, new Set());
            }
            this.invertedMoveIndex.get(mId).add(p.id);
          }
        }

        // Ability index
        if (Array.isArray(p.abilities)) {
          for (const a of p.abilities) {
            const aNameNorm = a.name.toLowerCase();
            if (!this.invertedAbilityIndex.has(aNameNorm)) {
              this.invertedAbilityIndex.set(aNameNorm, new Set());
            }
            this.invertedAbilityIndex.get(aNameNorm).add(p.id);
          }
        }

        // Stat extremes
        const s = p.baseStats;
        if (s) {
          for (const key of ['hp', 'atk', 'def', 'spa', 'spd', 'spe']) {
            if (s[key] < this.statRanges[key].min) this.statRanges[key].min = s[key];
            if (s[key] > this.statRanges[key].max) this.statRanges[key].max = s[key];
          }
        }
        if (p.bst < this.statRanges.bst.min) this.statRanges.bst.min = p.bst;
        if (p.bst > this.statRanges.bst.max) this.statRanges.bst.max = p.bst;

        // Compute effective defense profiles (base + each legal ability)
        const baseMatchups = calculateDualTypeMatchups(p.types);
        const baseSummary = summarizeMatchups(baseMatchups);

        const abilityProfiles = [];
        const bestCaseMatchups = { ...baseMatchups };

        for (const a of (p.abilities || [])) {
          if (DEFENSIVE_ABILITIES[a.name]) {
            const modified = DEFENSIVE_ABILITIES[a.name].modify(baseMatchups);
            const summary = summarizeMatchups(modified);
            abilityProfiles.push({
              abilityName: a.name,
              matchups: modified,
              summary,
              affectedTypes: DEFENSIVE_ABILITIES[a.name].affectedTypes
            });

            // Update best case multipliers across abilities
            for (const t of TYPES) {
              if (modified[t] < bestCaseMatchups[t]) {
                bestCaseMatchups[t] = modified[t];
              }
            }
          }
        }

        this.effectiveDefensesById.set(p.id, {
          base: baseSummary,
          abilities: abilityProfiles,
          bestCase: summarizeMatchups(bestCaseMatchups)
        });
      }
    }

    /**
     * Get pre-computed effective defenses for a Pokémon
     */
    getEffectiveDefense(pokemonId) {
      return this.effectiveDefensesById.get(pokemonId);
    }

    /**
     * Get Pokémon by ID
     */
    getPokemonById(id) {
      return this.pokemonById.get(id) || null;
    }

    /**
     * Get Pokémon by National Dex Number
     */
    getPokemonByNum(num) {
      return this.pokemonByNum.get(Number(num)) || [];
    }

    /**
     * Get related forms (e.g. base species and all Mega evolutions / regional forms)
     */
    getRelatedForms(pokemonId) {
      const p = this.getPokemonById(pokemonId);
      if (!p) return [];
      return this.getPokemonByNum(p.num);
    }

    /**
     * Search moves with autocomplete & filters
     */
    searchMoves(term = '', options = {}) {
      const { category, type, minPower, limit = 50 } = options;
      const termNorm = term.trim().toLowerCase();

      const results = [];
      for (const [id, move] of Object.entries(this.moves)) {
        if (termNorm && !move.name.toLowerCase().includes(termNorm) && !id.includes(termNorm)) {
          continue;
        }
        if (category && move.category.toLowerCase() !== category.toLowerCase()) {
          continue;
        }
        if (type && move.type.toLowerCase() !== type.toLowerCase()) {
          continue;
        }
        if (minPower && (typeof move.basePower !== 'number' || move.basePower < minPower)) {
          continue;
        }

        const userCount = this.invertedMoveIndex.get(id)?.size || 0;
        results.push({
          ...move,
          pokemonLearnersCount: userCount
        });
      }

      // Sort by name or relevance
      results.sort((a, b) => {
        if (termNorm) {
          const aStarts = a.name.toLowerCase().startsWith(termNorm);
          const bStarts = b.name.toLowerCase().startsWith(termNorm);
          if (aStarts && !bStarts) return -1;
          if (!aStarts && bStarts) return 1;
        }
        return a.name.localeCompare(b.name);
      });

      return limit > 0 ? results.slice(0, limit) : results;
    }

    /**
     * Get full move objects learned by a Pokémon
     */
    getPokemonMoves(pokemonId, options = {}) {
      const p = this.getPokemonById(pokemonId);
      if (!p || !Array.isArray(p.moveIds)) return [];

      const { category, type, sortBy = 'name', sortOrder = 'asc' } = options;
      let moveList = p.moveIds.map(id => this.moves[id] || { id, name: id, type: 'Normal', category: 'Status' });

      if (category) {
        moveList = moveList.filter(m => m.category?.toLowerCase() === category.toLowerCase());
      }
      if (type) {
        moveList = moveList.filter(m => m.type?.toLowerCase() === type.toLowerCase());
      }

      moveList.sort((a, b) => {
        let valA = a[sortBy] ?? '';
        let valB = b[sortBy] ?? '';
        if (typeof valA === 'number' && typeof valB === 'number') {
          return sortOrder === 'desc' ? valB - valA : valA - valB;
        }
        const strA = String(valA);
        const strB = String(valB);
        return sortOrder === 'desc' ? strB.localeCompare(strA) : strA.localeCompare(strB);
      });

      return moveList;
    }

    /**
     * Search abilities with autocomplete & filters
     */
    searchAbilities(term = '', options = {}) {
      const { isCustomOnly, limit = 50 } = options;
      const termNorm = term.trim().toLowerCase();

      const results = [];
      for (const [name, ability] of Object.entries(this.abilities)) {
        if (termNorm && !name.toLowerCase().includes(termNorm) && !ability.desc.toLowerCase().includes(termNorm)) {
          continue;
        }
        if (isCustomOnly && !ability.isCustomChampions) {
          continue;
        }

        const userCount = this.invertedAbilityIndex.get(name.toLowerCase())?.size || 0;
        results.push({
          ...ability,
          pokemonUsersCount: userCount
        });
      }

      results.sort((a, b) => {
        if (termNorm) {
          const aStarts = a.name.toLowerCase().startsWith(termNorm);
          const bStarts = b.name.toLowerCase().startsWith(termNorm);
          if (aStarts && !bStarts) return -1;
          if (!aStarts && bStarts) return 1;
        }
        return a.name.localeCompare(b.name);
      });

      return limit > 0 ? results.slice(0, limit) : results;
    }

    /**
     * Get complete 18-type damage chart for a Pokémon under a specific ability (or default)
     */
    getDamageChart(pokemonId, abilityName = null) {
      const p = this.getPokemonById(pokemonId);
      if (!p) return null;

      const baseMatchups = calculateDualTypeMatchups(p.types);
      const matchups = abilityName ? applyAbilityToMatchups(baseMatchups, abilityName) : baseMatchups;
      const summary = summarizeMatchups(matchups);

      const chart = [];
      for (const type of TYPES) {
        const mult = matchups[type];
        let label = '1x';
        let badgeClass = 'neutral';
        let category = 'Neutral';

        if (mult === 0) {
          label = '0x';
          badgeClass = 'immune';
          category = 'Immunity';
        } else if (mult === 0.25) {
          label = '¼x';
          badgeClass = 'double-resist';
          category = 'Double Resist';
        } else if (mult === 0.5) {
          label = '½x';
          badgeClass = 'resist';
          category = 'Resist';
        } else if (mult === 0.75) {
          label = '¾x';
          badgeClass = 'filtered-resist';
          category = 'Filter Resist';
        } else if (mult === 1.5) {
          label = '1.5x';
          badgeClass = 'filtered-weak';
          category = 'Filter Weak';
        } else if (mult === 2) {
          label = '2x';
          badgeClass = 'weak';
          category = 'Weakness';
        } else if (mult === 4) {
          label = '4x';
          badgeClass = 'double-weak';
          category = 'Double Weak';
        }

        chart.push({
          type,
          multiplier: mult,
          label,
          badgeClass,
          category,
          color: TYPE_COLORS[type]
        });
      }

      return {
        pokemonId: p.id,
        pokemonName: p.name,
        abilityName,
        types: p.types,
        chart,
        summary
      };
    }

    /**
     * Primary Query Execution Engine
     * 
     * Handles defensive resistance combinations, movepools, abilities,
     * stat thresholds, tiers, and full-text searches.
     */
    query(params = {}) {
      const startTime = typeof performance !== 'undefined' ? performance.now() : Date.now();

      const {
        search = '',
        types = [],
        typeMode = 'any', // 'any', 'all', 'exact', 'mono'
        resists = [], // Types Pokémon must resist (<= 0.5x)
        resistMode = 'all', // 'all' (AND) or 'any' (OR)
        doubleResists = [], // Types Pokémon must double-resist (<= 0.25x)
        immuneTo = [], // Types Pokémon must be immune to (== 0x)
        immuneMode = 'all',
        weakTo = [], // Types Pokémon must be weak to (> 1x)
        weakMode = 'all',
        doubleWeakTo = [], // Types Pokémon must take 4x from
        notWeakTo = [], // Types Pokémon must NOT take > 1x from
        defenseRules = [], // Array of { type: 'Water', relation: 'resist'|'immune'|'weak'|'not_weak'|'double_resist' }
        considerAbilities = true, // Account for Levitate, Thick Fat, Flash Fire, etc.
        specificAbility = null, // Evaluate defense specifically under this ability
        moves = [], // Moves Pokémon must learn
        moveMode = 'all', // 'all' (AND) or 'any' (OR)
        moveCategory = null, // Must learn at least one move of category
        moveType = null, // Must learn at least one move of type
        abilities = [], // Abilities Pokémon must have
        abilityMode = 'any',
        isCustomAbility = null, // Only custom Champions abilities
        stats = {}, // { hp: { min, max }, spe: { min }, ... }
        minBst = null,
        maxBst = null,
        minSpeed = null,
        maxSpeed = null,
        minAtk = null,
        maxAtk = null,
        minDef = null,
        maxDef = null,
        minSpAtk = null,
        maxSpAtk = null,
        minSpDef = null,
        maxSpDef = null,
        minHp = null,
        maxHp = null,
        statBias = null, // 'physical', 'special', 'fast', 'tank'
        tiers = [], // Tier filters e.g. ['OU', 'UU']
        isMega = null, // true = only Megas, false = exclude Megas, null = all
        sortBy = 'num', // 'num', 'bst', 'spe', 'atk', 'spa', 'def', 'spd', 'hp', 'name'
        sortOrder = 'asc', // 'asc' or 'desc'
        limit = 0,
        offset = 0
      } = params;

      // Normalize search term
      const searchNorm = search.trim().toLowerCase();
      const isNumSearch = /^#?\d+$/.test(searchNorm);
      const searchNum = isNumSearch ? parseInt(searchNorm.replace('#', ''), 10) : null;

      // Normalize moves & abilities
      const normalizedMoveIds = moves.map(m => m.toLowerCase().replace(/[^a-z0-9]/g, ''));
      const normalizedAbilityNames = abilities.map(a => a.toLowerCase());

      // Prepare Defensive Check Rules
      const allDefRules = [...defenseRules];
      if (resists.length > 0) {
        for (const r of resists) allDefRules.push({ type: r, relation: 'resist', mode: resistMode });
      }
      if (doubleResists.length > 0) {
        for (const dr of doubleResists) allDefRules.push({ type: dr, relation: 'double_resist', mode: 'all' });
      }
      if (immuneTo.length > 0) {
        for (const im of immuneTo) allDefRules.push({ type: im, relation: 'immune', mode: immuneMode });
      }
      if (weakTo.length > 0) {
        for (const w of weakTo) allDefRules.push({ type: w, relation: 'weak', mode: weakMode });
      }
      if (doubleWeakTo.length > 0) {
        for (const dw of doubleWeakTo) allDefRules.push({ type: dw, relation: 'double_weak', mode: 'all' });
      }
      if (notWeakTo.length > 0) {
        for (const nw of notWeakTo) allDefRules.push({ type: nw, relation: 'not_weak', mode: 'all' });
      }

      const hasDefensiveFilter = allDefRules.length > 0;

      // Filter Pokémon roster
      const filtered = [];

      for (const p of this.pokemon) {
        // 1. Megas filter
        if (isMega !== null && isMega !== undefined) {
          if (isMega && !p.isMega) continue;
          if (!isMega && p.isMega) continue;
        }

        // 2. Format / Tier filter
        if (tiers.length > 0 && !tiers.includes(p.tier)) {
          continue;
        }

        // 3. Species Types filter
        if (types.length > 0) {
          if (typeMode === 'mono') {
            if (p.types.length !== 1 || !types.includes(p.types[0])) continue;
          } else if (typeMode === 'exact') {
            if (p.types.length !== types.length || !types.every(t => p.types.includes(t))) continue;
          } else if (typeMode === 'all') {
            if (!types.every(t => p.types.includes(t))) continue;
          } else {
            // 'any'
            if (!types.some(t => p.types.includes(t))) continue;
          }
        }

        // 4. Text Search filter
        if (searchNorm) {
          if (isNumSearch) {
            if (p.num !== searchNum) continue;
          } else {
            const nameMatch = p.name.toLowerCase().includes(searchNorm);
            const baseSpeciesMatch = p.baseSpecies && p.baseSpecies.toLowerCase().includes(searchNorm);
            const typeMatch = p.types.some(t => t.toLowerCase() === searchNorm);
            const abilityMatch = p.abilities.some(a => a.name.toLowerCase().includes(searchNorm));

            if (!nameMatch && !baseSpeciesMatch && !typeMatch && !abilityMatch) {
              continue;
            }
          }
        }

        // 5. Abilities filter
        if (normalizedAbilityNames.length > 0) {
          const pAbilityNames = p.abilities.map(a => a.name.toLowerCase());
          if (abilityMode === 'all') {
            const hasAll = normalizedAbilityNames.every(req => pAbilityNames.includes(req));
            if (!hasAll) continue;
          } else {
            const hasAny = normalizedAbilityNames.some(req => pAbilityNames.includes(req));
            if (!hasAny) continue;
          }
        }

        if (isCustomAbility !== null) {
          const hasCustom = p.abilities.some(a => a.isCustomChampions);
          if (isCustomAbility && !hasCustom) continue;
          if (!isCustomAbility && hasCustom) continue;
        }

        // 6. Moves filter
        if (normalizedMoveIds.length > 0) {
          if (moveMode === 'all') {
            const learnsAll = normalizedMoveIds.every(mId => p.moveIds.includes(mId));
            if (!learnsAll) continue;
          } else {
            const learnsAny = normalizedMoveIds.some(mId => p.moveIds.includes(mId));
            if (!learnsAny) continue;
          }
        }

        if (moveCategory || moveType) {
          const learnsQualifyingMove = p.moveIds.some(mId => {
            const m = this.moves[mId];
            if (!m) return false;
            if (moveCategory && m.category?.toLowerCase() !== moveCategory.toLowerCase()) return false;
            if (moveType && m.type?.toLowerCase() !== moveType.toLowerCase()) return false;
            return true;
          });
          if (!learnsQualifyingMove) continue;
        }

        // 7. Base Stats & Threshold filters
        const s = p.baseStats;
        if (minBst !== null && p.bst < minBst) continue;
        if (maxBst !== null && p.bst > maxBst) continue;
        if (minSpeed !== null && s.spe < minSpeed) continue;
        if (maxSpeed !== null && s.spe > maxSpeed) continue;
        if (minAtk !== null && s.atk < minAtk) continue;
        if (maxAtk !== null && s.atk > maxAtk) continue;
        if (minDef !== null && s.def < minDef) continue;
        if (maxDef !== null && s.def > maxDef) continue;
        if (minSpAtk !== null && s.spa < minSpAtk) continue;
        if (maxSpAtk !== null && s.spa > maxSpAtk) continue;
        if (minSpDef !== null && s.spd < minSpDef) continue;
        if (maxSpDef !== null && s.spd > maxSpDef) continue;
        if (minHp !== null && s.hp < minHp) continue;
        if (maxHp !== null && s.hp > maxHp) continue;

        // Custom stats map
        if (stats.hp) {
          if (stats.hp.min !== undefined && s.hp < stats.hp.min) continue;
          if (stats.hp.max !== undefined && s.hp > stats.hp.max) continue;
        }
        if (stats.atk) {
          if (stats.atk.min !== undefined && s.atk < stats.atk.min) continue;
          if (stats.atk.max !== undefined && s.atk > stats.atk.max) continue;
        }
        if (stats.def) {
          if (stats.def.min !== undefined && s.def < stats.def.min) continue;
          if (stats.def.max !== undefined && s.def > stats.def.max) continue;
        }
        if (stats.spa) {
          if (stats.spa.min !== undefined && s.spa < stats.spa.min) continue;
          if (stats.spa.max !== undefined && s.spa > stats.spa.max) continue;
        }
        if (stats.spd) {
          if (stats.spd.min !== undefined && s.spd < stats.spd.min) continue;
          if (stats.spd.max !== undefined && s.spd > stats.spd.max) continue;
        }
        if (stats.spe) {
          if (stats.spe.min !== undefined && s.spe < stats.spe.min) continue;
          if (stats.spe.max !== undefined && s.spe > stats.spe.max) continue;
        }
        if (stats.bst) {
          if (stats.bst.min !== undefined && p.bst < stats.bst.min) continue;
          if (stats.bst.max !== undefined && p.bst > stats.bst.max) continue;
        }

        // Stat Bias
        if (statBias === 'physical' && s.atk < s.spa) continue;
        if (statBias === 'special' && s.spa < s.atk) continue;
        if (statBias === 'fast' && s.spe < 100) continue;
        if (statBias === 'tank' && (s.def + s.spd < 180)) continue;

        // 8. Defensive Resistance / Weakness / Immunity filters
        let qualifyingDefProfile = null;
        if (hasDefensiveFilter) {
          const defData = this.effectiveDefensesById.get(p.id);
          if (!defData) continue;

          // Helper to check if a specific matchup map satisfies all rules
          const satisfiesRules = (matchups) => {
            // Group rules by mode for OR logic support
            const orResistRules = allDefRules.filter(r => r.relation === 'resist' && r.mode === 'any');
            const orWeakRules = allDefRules.filter(r => r.relation === 'weak' && r.mode === 'any');
            const orImmuneRules = allDefRules.filter(r => r.relation === 'immune' && r.mode === 'any');
            const andRules = allDefRules.filter(r => r.mode !== 'any');

            // Check AND rules
            for (const rule of andRules) {
              const mult = matchups[rule.type];
              if (mult === undefined) return false;
              if (rule.relation === 'resist' && mult > 0.5) return false;
              if (rule.relation === 'double_resist' && (mult > 0.25 || mult === 0)) return false;
              if (rule.relation === 'immune' && mult !== 0) return false;
              if (rule.relation === 'weak' && mult <= 1) return false;
              if (rule.relation === 'double_weak' && mult < 3) return false;
              if (rule.relation === 'not_weak' && mult > 1) return false;
            }

            // Check OR groups if present
            if (orResistRules.length > 0) {
              const anyResist = orResistRules.some(r => matchups[r.type] !== undefined && matchups[r.type] <= 0.5);
              if (!anyResist) return false;
            }
            if (orWeakRules.length > 0) {
              const anyWeak = orWeakRules.some(r => matchups[r.type] !== undefined && matchups[r.type] > 1);
              if (!anyWeak) return false;
            }
            if (orImmuneRules.length > 0) {
              const anyImmune = orImmuneRules.some(r => matchups[r.type] !== undefined && matchups[r.type] === 0);
              if (!anyImmune) return false;
            }

            return true;
          };

          if (specificAbility) {
            // Evaluated under specific ability
            const modified = applyAbilityToMatchups(defData.base.matchups, specificAbility);
            if (!satisfiesRules(modified)) continue;
            qualifyingDefProfile = { ability: specificAbility, matchups: modified };
          } else if (considerAbilities) {
            // Competitive logic: check if base typing OR ANY legal ability satisfies ALL conditions
            let matched = false;

            if (satisfiesRules(defData.base.matchups)) {
              matched = true;
              qualifyingDefProfile = { ability: null, matchups: defData.base.matchups };
            } else {
              for (const abProfile of defData.abilities) {
                if (satisfiesRules(abProfile.matchups)) {
                  matched = true;
                  qualifyingDefProfile = { ability: abProfile.abilityName, matchups: abProfile.matchups };
                  break;
                }
              }
            }

            if (!matched) continue;
          } else {
            // Strict base typing only
            if (!satisfiesRules(defData.base.matchups)) continue;
            qualifyingDefProfile = { ability: null, matchups: defData.base.matchups };
          }
        }

        // Attach qualifying defense metadata for display
        filtered.push({
          ...p,
          qualifyingDefense: qualifyingDefProfile
        });
      }

      // Sort results
      filtered.sort((a, b) => {
        let valA, valB;
        if (sortBy === 'name') {
          valA = a.name;
          valB = b.name;
          return sortOrder === 'desc' ? valB.localeCompare(valA) : valA.localeCompare(valB);
        } else if (sortBy === 'num') {
          valA = a.num;
          valB = b.num;
          if (valA !== valB) return sortOrder === 'desc' ? valB - valA : valA - valB;
          return a.name.localeCompare(b.name);
        } else if (sortBy === 'bst') {
          valA = a.bst;
          valB = b.bst;
        } else if (['hp', 'atk', 'def', 'spa', 'spd', 'spe'].includes(sortBy)) {
          valA = a.baseStats[sortBy];
          valB = b.baseStats[sortBy];
        } else {
          valA = a.num;
          valB = b.num;
        }

        return sortOrder === 'desc' ? valB - valA : valA - valB;
      });

      const total = filtered.length;
      const paginatedResults = limit > 0 ? filtered.slice(offset, offset + limit) : filtered;

      // Compute dynamic facets for live UI filters
      const facets = this._calculateFacets(filtered);

      const endTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
      const executionTimeMs = parseFloat((endTime - startTime).toFixed(2));

      return {
        results: paginatedResults,
        total,
        offset,
        limit,
        facets,
        executionTimeMs
      };
    }

    /**
     * Compute dynamic aggregation facets for filtered results
     */
    _calculateFacets(pokemonList) {
      const typeCounts = {};
      const tierCounts = {};
      let megaCount = 0;
      let totalBst = 0;
      let totalSpe = 0;

      for (const t of TYPES) typeCounts[t] = 0;

      for (const p of pokemonList) {
        for (const t of p.types) {
          typeCounts[t] = (typeCounts[t] || 0) + 1;
        }
        if (p.tier) {
          tierCounts[p.tier] = (tierCounts[p.tier] || 0) + 1;
        }
        if (p.isMega) megaCount++;
        totalBst += p.bst;
        totalSpe += p.baseStats.spe;
      }

      const count = pokemonList.length || 1;
      return {
        total: pokemonList.length,
        types: typeCounts,
        tiers: tierCounts,
        megas: megaCount,
        nonMegas: pokemonList.length - megaCount,
        averageBst: Math.round(totalBst / count),
        averageSpeed: Math.round(totalSpe / count)
      };
    }

    /**
     * Get unique available tiers
     */
    getAvailableTiers() {
      return Array.from(this.invertedTierIndex.keys()).sort();
    }

    /**
     * Get list of all 18 Pokémon types
     */
    getAvailableTypes() {
      return [...TYPES];
    }

    /**
     * Get overall min/max stat ranges
     */
    getStatRanges() {
      return JSON.parse(JSON.stringify(this.statRanges));
    }
  }

  // Exported constants and classes
  return {
    TYPES,
    TYPE_COLORS,
    TYPE_CHART,
    DEFENSIVE_ABILITIES,
    calculateDualTypeMatchups,
    summarizeMatchups,
    applyAbilityToMatchups,
    PokemonQueryEngine
  };
}));
