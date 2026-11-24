/**
 * Pokémon Champions - Frontend Application Controller
 * Handles UI events, live query filtering, autocomplete, and interactive inspection modal.
 */

(function () {
  'use strict';

  // Application State
  const state = {
    search: '',
    relation: 'resist', // 'resist' | 'double_resist' | 'immune' | 'weak' | 'not_weak'
    defenseMode: 'all', // 'all' (AND) | 'any' (OR)
    considerAbilities: true,
    defensiveTypes: new Set(),
    speciesTypes: new Set(),
    speciesTypeMode: 'any',
    tiers: new Set(),
    megaFilter: 'all', // 'all' | 'true' | 'false'
    moves: [], // Array of { id, name }
    moveMode: 'all', // 'all' | 'any'
    abilities: [], // Array of { name }
    isCustomAbilityOnly: false,
    minSpeed: 0,
    minBst: 180,
    statBias: 'all', // 'all' | 'fast' | 'physical' | 'special' | 'tank'
    sortBy: 'num',
    sortOrder: 'asc',
    viewLayout: 'grid',
    selectedPokemonId: null
  };

  let engine = null;
  let allTypes = [];
  let typeColors = {};
  let debounceTimer = null;

  // DOM Elements
  const els = {
    globalSearch: document.getElementById('global-search-input'),
    clearSearchBtn: document.getElementById('clear-search-btn'),
    resetAllBtn: document.getElementById('reset-all-filters-btn'),
    randomPokemonBtn: document.getElementById('random-pokemon-btn'),
    headerTotalCount: document.getElementById('header-total-count'),
    
    // Defensive Matrix
    includeAbilitiesToggle: document.getElementById('include-abilities-toggle'),
    defenseMatchModeToggle: document.getElementById('defense-match-mode-toggle'),
    relationTabs: document.querySelectorAll('.relation-tab'),
    typeChipsGrid: document.getElementById('type-chips-grid'),
    defenseSummary: document.getElementById('defense-selection-summary'),
    clearDefensiveTypesBtn: document.getElementById('clear-defensive-types-btn'),

    // Species & Tiers
    speciesTypeChips: document.getElementById('species-type-chips'),
    speciesTypeMode: document.getElementById('species-type-mode'),
    tierPills: document.querySelectorAll('#tier-pill-group .pill-btn'),
    formPills: document.querySelectorAll('#form-pill-group .pill-btn'),

    // Moves & Abilities
    moveInput: document.getElementById('move-filter-input'),
    moveDropdown: document.getElementById('move-autocomplete-dropdown'),
    selectedMovesContainer: document.getElementById('selected-moves-container'),
    moveMatchModeToggle: document.getElementById('move-match-mode-toggle'),

    abilityInput: document.getElementById('ability-filter-input'),
    abilityDropdown: document.getElementById('ability-autocomplete-dropdown'),
    selectedAbilitiesContainer: document.getElementById('selected-abilities-container'),
    customAbilityToggle: document.getElementById('custom-champions-ability-toggle'),

    // Stat Sliders
    statBiasBtns: document.querySelectorAll('#stat-bias-group .stat-preset-btn'),
    speedSlider: document.getElementById('speed-slider'),
    speedValue: document.getElementById('speed-slider-value'),
    bstSlider: document.getElementById('bst-slider'),
    bstValue: document.getElementById('bst-slider-value'),

    // Active Filters & Results
    activeChipsList: document.getElementById('active-chips-list'),
    clearAllChipsBtn: document.getElementById('clear-all-chips-btn'),
    resultsCount: document.getElementById('results-count'),
    resultsTotal: document.getElementById('results-total'),
    speedBadge: document.getElementById('execution-speed-badge'),
    sortBySelect: document.getElementById('sort-by-select'),
    sortDirectionBtn: document.getElementById('sort-direction-btn'),
    sortDirectionIcon: document.getElementById('sort-direction-icon'),
    viewGridBtn: document.getElementById('view-grid-btn'),
    viewCompactBtn: document.getElementById('view-compact-btn'),

    // Roster Grid & Empty State
    rosterGrid: document.getElementById('pokemon-roster-grid'),
    emptyState: document.getElementById('empty-state'),
    emptyStateResetBtn: document.getElementById('empty-state-reset-btn'),

    // Modal
    modal: document.getElementById('pokemon-modal'),
    modalContent: document.getElementById('modal-dialog-content')
  };

  /**
   * Initialize Application
   */
  async function init() {
    try {
      // Load Database Bundle
      const response = await fetch('src/data/champions_db.json');
      if (!response.ok) {
        throw new Error(`Failed to load champions database: HTTP ${response.status}`);
      }
      const database = await response.json();

      // Initialize Query Engine
      const EngineClass = window.PokemonQueryEngine?.PokemonQueryEngine || window.PokemonQueryEngine;
      engine = new EngineClass(database);

      allTypes = engine.getAvailableTypes();
      typeColors = window.PokemonQueryEngine?.TYPE_COLORS || {};

      if (els.headerTotalCount) {
        els.headerTotalCount.textContent = database.pokemon.length;
      }
      if (els.resultsTotal) {
        els.resultsTotal.textContent = database.pokemon.length;
      }

      // Render Filter Controls
      buildTypeChips();
      buildSpeciesTypeChips();
      attachEventListeners();

      // Initial Query & Render
      runQuery();

    } catch (err) {
      console.error('Initialization error:', err);
      if (els.rosterGrid) {
        els.rosterGrid.innerHTML = `
          <div class="empty-state">
            <div class="empty-icon">⚠️</div>
            <h3 class="empty-title">Error Loading Database</h3>
            <p class="empty-desc">${err.message}</p>
          </div>
        `;
      }
    }
  }

  /**
   * Build 18 Interactive Defensive Type Chips
   */
  function buildTypeChips() {
    if (!els.typeChipsGrid) return;
    els.typeChipsGrid.innerHTML = '';

    for (const type of allTypes) {
      const color = typeColors[type] || { bg: '#6366f1', text: '#ffffff', glow: 'rgba(99, 102, 241, 0.4)' };
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'type-chip';
      chip.dataset.type = type;
      chip.style.setProperty('--type-color', color.bg);
      chip.style.setProperty('--type-text', color.text);
      chip.style.setProperty('--type-glow', color.glow);

      chip.innerHTML = `
        <div class="type-chip-left">
          <span class="type-bullet" aria-hidden="true"></span>
          <span>${type}</span>
        </div>
        <span class="type-count-badge" id="type-badge-${type.toLowerCase()}">-</span>
      `;

      chip.addEventListener('click', () => {
        if (state.defensiveTypes.has(type)) {
          state.defensiveTypes.delete(type);
          chip.classList.remove('selected');
        } else {
          state.defensiveTypes.add(type);
          chip.classList.add('selected');
        }
        updateDefenseSummary();
        runQuery();
      });

      els.typeChipsGrid.appendChild(chip);
    }
  }

  /**
   * Build 18 Species Mini Type Chips
   */
  function buildSpeciesTypeChips() {
    if (!els.speciesTypeChips) return;
    els.speciesTypeChips.innerHTML = '';

    for (const type of allTypes) {
      const color = typeColors[type] || { bg: '#6366f1', text: '#ffffff', glow: 'rgba(99, 102, 241, 0.4)' };
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'species-chip';
      chip.dataset.type = type;
      chip.textContent = type;
      chip.style.setProperty('--type-color', color.bg);
      chip.style.setProperty('--type-text', color.text);
      chip.style.setProperty('--type-glow', color.glow);

      chip.addEventListener('click', () => {
        if (state.speciesTypes.has(type)) {
          state.speciesTypes.delete(type);
          chip.classList.remove('active');
        } else {
          state.speciesTypes.add(type);
          chip.classList.add('active');
        }
        runQuery();
      });

      els.speciesTypeChips.appendChild(chip);
    }
  }

  /**
   * Update Defensive Matrix Selection Text
   */
  function updateDefenseSummary() {
    const count = state.defensiveTypes.size;
    const typesStr = Array.from(state.defensiveTypes).join(', ');
    const relationLabels = {
      resist: 'Resist (≤ 0.5×)',
      double_resist: 'Double Resist (≤ 0.25×)',
      immune: 'Immunity (0×)',
      weak: 'Weakness (≥ 2×)',
      not_weak: 'Not Weak (≤ 1×)'
    };
    const relationText = relationLabels[state.relation] || state.relation;

    if (count === 0) {
      els.defenseSummary.textContent = 'Select one or more types above to filter by defensive effectiveness.';
      els.clearDefensiveTypesBtn.classList.add('hidden');
    } else {
      els.defenseSummary.textContent = `Filtering for Pokémon that ${relationText} ${typesStr} (${state.defenseMode.toUpperCase()} mode)`;
      els.clearDefensiveTypesBtn.classList.remove('hidden');
    }
  }

  /**
   * Attach All DOM Event Listeners
   */
  function attachEventListeners() {
    // Global Search with Instant Debounce
    els.globalSearch.addEventListener('input', (e) => {
      const val = e.target.value.trim();
      state.search = val;
      if (val) {
        els.clearSearchBtn.classList.remove('hidden');
      } else {
        els.clearSearchBtn.classList.add('hidden');
      }
      debounceQuery();
    });

    els.clearSearchBtn.addEventListener('click', () => {
      els.globalSearch.value = '';
      state.search = '';
      els.clearSearchBtn.classList.add('hidden');
      runQuery();
      els.globalSearch.focus();
    });

    // Reset All Buttons
    els.resetAllBtn.addEventListener('click', resetAllFilters);
    els.emptyStateResetBtn.addEventListener('click', resetAllFilters);
    els.clearAllChipsBtn.addEventListener('click', resetAllFilters);

    // Random Pokémon Inspector
    els.randomPokemonBtn.addEventListener('click', () => {
      const all = engine.pokemon;
      if (all.length > 0) {
        const rand = all[Math.floor(Math.random() * all.length)];
        openPokemonModal(rand.id);
      }
    });

    // Relation Mode Tabs
    els.relationTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        els.relationTabs.forEach(t => {
          t.classList.remove('active');
          t.setAttribute('aria-selected', 'false');
        });
        tab.classList.add('active');
        tab.setAttribute('aria-selected', 'true');
        state.relation = tab.dataset.relation;
        updateDefenseSummary();
        runQuery();
      });
    });

    // Ability Toggle in Defense
    els.includeAbilitiesToggle.addEventListener('change', (e) => {
      state.considerAbilities = e.target.checked;
      runQuery();
    });

    // Defense Mode (AND / OR)
    els.defenseMatchModeToggle.querySelectorAll('.toggle-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        els.defenseMatchModeToggle.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.defenseMode = btn.dataset.mode;
        updateDefenseSummary();
        runQuery();
      });
    });

    // Clear Defensive Types Button
    els.clearDefensiveTypesBtn.addEventListener('click', () => {
      state.defensiveTypes.clear();
      els.typeChipsGrid.querySelectorAll('.type-chip').forEach(c => c.classList.remove('selected'));
      updateDefenseSummary();
      runQuery();
    });

    // Species Type Mode Selector
    els.speciesTypeMode.addEventListener('change', (e) => {
      state.speciesTypeMode = e.target.value;
      runQuery();
    });

    // Tier Pills
    els.tierPills.forEach(pill => {
      pill.addEventListener('click', () => {
        const tier = pill.dataset.tier;
        if (state.tiers.has(tier)) {
          state.tiers.delete(tier);
          pill.classList.remove('active');
        } else {
          state.tiers.add(tier);
          pill.classList.add('active');
        }
        runQuery();
      });
    });

    // Form / Mega Pills
    els.formPills.forEach(pill => {
      pill.addEventListener('click', () => {
        els.formPills.forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        state.megaFilter = pill.dataset.mega;
        runQuery();
      });
    });

    // Move Search & Autocomplete
    els.moveInput.addEventListener('input', (e) => {
      const term = e.target.value.trim();
      if (!term) {
        els.moveDropdown.classList.add('hidden');
        return;
      }
      const matches = engine.searchMoves(term, { limit: 8 });
      renderMoveDropdown(matches);
    });

    els.moveMatchModeToggle.querySelectorAll('.toggle-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        els.moveMatchModeToggle.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.moveMode = btn.dataset.mode;
        runQuery();
      });
    });

    // Ability Search & Autocomplete
    els.abilityInput.addEventListener('input', (e) => {
      const term = e.target.value.trim();
      if (!term) {
        els.abilityDropdown.classList.add('hidden');
        return;
      }
      const matches = engine.searchAbilities(term, { limit: 8 });
      renderAbilityDropdown(matches);
    });

    // Custom Champions Ability Toggle
    els.customAbilityToggle.addEventListener('change', (e) => {
      state.isCustomAbilityOnly = e.target.checked;
      runQuery();
    });

    // Close autocomplete on outside click
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.input-autocomplete-container')) {
        els.moveDropdown.classList.add('hidden');
        els.abilityDropdown.classList.add('hidden');
      }
    });

    // Stat Bias Presets
    els.statBiasBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        els.statBiasBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.statBias = btn.dataset.bias;
        runQuery();
      });
    });

    // Speed Slider
    els.speedSlider.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10);
      state.minSpeed = val;
      els.speedValue.textContent = val > 0 ? `≥ ${val}` : 'Any';
      debounceQuery();
    });

    // BST Slider
    els.bstSlider.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10);
      state.minBst = val;
      els.bstValue.textContent = val > 180 ? `≥ ${val}` : 'Any';
      debounceQuery();
    });

    // Sort By Selector
    els.sortBySelect.addEventListener('change', (e) => {
      state.sortBy = e.target.value;
      runQuery();
    });

    // Sort Direction Button
    els.sortDirectionBtn.addEventListener('click', () => {
      state.sortOrder = state.sortOrder === 'asc' ? 'desc' : 'asc';
      els.sortDirectionIcon.textContent = state.sortOrder === 'asc' ? '↑' : '↓';
      runQuery();
    });

    // Layout View Mode (Grid vs Compact)
    els.viewGridBtn.addEventListener('click', () => {
      els.viewGridBtn.classList.add('active');
      els.viewCompactBtn.classList.remove('active');
      state.viewLayout = 'grid';
      els.rosterGrid.classList.remove('compact-view');
    });

    els.viewCompactBtn.addEventListener('click', () => {
      els.viewCompactBtn.classList.add('active');
      els.viewGridBtn.classList.remove('active');
      state.viewLayout = 'compact';
      els.rosterGrid.classList.add('compact-view');
    });

    // Keyboard Shortcuts
    document.addEventListener('keydown', (e) => {
      if ((e.key === '/' || (e.key === 'k' && (e.metaKey || e.ctrlKey))) && document.activeElement !== els.globalSearch) {
        e.preventDefault();
        els.globalSearch.focus();
      } else if (e.key === 'Escape' && els.modal.open) {
        els.modal.close();
      }
    });

    // Modal Close
    els.modal.addEventListener('click', (e) => {
      const rect = els.modalContent.getBoundingClientRect();
      const isInDialog = (rect.top <= e.clientY && e.clientY <= rect.top + rect.height
        && rect.left <= e.clientX && e.clientX <= rect.left + rect.width);
      if (!isInDialog) {
        els.modal.close();
      }
    });
  }

  /**
   * Move Autocomplete Dropdown
   */
  function renderMoveDropdown(moves) {
    if (!moves.length) {
      els.moveDropdown.innerHTML = `<div class="autocomplete-item"><span class="autocomplete-item-name" style="color:#64748b">No moves found</span></div>`;
      els.moveDropdown.classList.remove('hidden');
      return;
    }

    els.moveDropdown.innerHTML = moves.map(m => `
      <div class="autocomplete-item" data-id="${m.id}" data-name="${m.name}">
        <span class="autocomplete-item-name">${m.name}</span>
        <div class="autocomplete-item-meta">
          <span class="category-badge cat-${m.category.toLowerCase()}">${m.category}</span>
          <span>${m.type}</span>
          <span>👥 ${m.pokemonLearnersCount}</span>
        </div>
      </div>
    `).join('');

    els.moveDropdown.querySelectorAll('.autocomplete-item').forEach(item => {
      item.addEventListener('click', () => {
        const moveId = item.dataset.id;
        const moveName = item.dataset.name;
        if (!state.moves.some(m => m.id === moveId)) {
          state.moves.push({ id: moveId, name: moveName });
          renderSelectedMoves();
          runQuery();
        }
        els.moveInput.value = '';
        els.moveDropdown.classList.add('hidden');
      });
    });

    els.moveDropdown.classList.remove('hidden');
  }

  function renderSelectedMoves() {
    els.selectedMovesContainer.innerHTML = state.moves.map(m => `
      <span class="item-chip">
        <span>⚔️ ${m.name}</span>
        <button type="button" class="chip-remove-btn" data-id="${m.id}" aria-label="Remove ${m.name}">×</button>
      </span>
    `).join('');

    els.selectedMovesContainer.querySelectorAll('.chip-remove-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        state.moves = state.moves.filter(m => m.id !== btn.dataset.id);
        renderSelectedMoves();
        runQuery();
      });
    });
  }

  /**
   * Ability Autocomplete Dropdown
   */
  function renderAbilityDropdown(abilities) {
    if (!abilities.length) {
      els.abilityDropdown.innerHTML = `<div class="autocomplete-item"><span class="autocomplete-item-name" style="color:#64748b">No abilities found</span></div>`;
      els.abilityDropdown.classList.remove('hidden');
      return;
    }

    els.abilityDropdown.innerHTML = abilities.map(a => `
      <div class="autocomplete-item" data-name="${a.name}">
        <span class="autocomplete-item-name">${a.name} ${a.isCustomChampions ? '⭐' : ''}</span>
        <div class="autocomplete-item-meta">
          <span>👥 ${a.pokemonUsersCount}</span>
        </div>
      </div>
    `).join('');

    els.abilityDropdown.querySelectorAll('.autocomplete-item').forEach(item => {
      item.addEventListener('click', () => {
        const abName = item.dataset.name;
        if (!state.abilities.some(a => a.name === abName)) {
          state.abilities.push({ name: abName });
          renderSelectedAbilities();
          runQuery();
        }
        els.abilityInput.value = '';
        els.abilityDropdown.classList.add('hidden');
      });
    });

    els.abilityDropdown.classList.remove('hidden');
  }

  function renderSelectedAbilities() {
    els.selectedAbilitiesContainer.innerHTML = state.abilities.map(a => `
      <span class="item-chip">
        <span>✨ ${a.name}</span>
        <button type="button" class="chip-remove-btn" data-name="${a.name}" aria-label="Remove ${a.name}">×</button>
      </span>
    `).join('');

    els.selectedAbilitiesContainer.querySelectorAll('.chip-remove-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        state.abilities = state.abilities.filter(a => a.name !== btn.dataset.name);
        renderSelectedAbilities();
        runQuery();
      });
    });
  }

  /**
   * Debounced Query Execution
   */
  function debounceQuery() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      runQuery();
    }, 150);
  }

  /**
   * Build Query Parameters Object
   */
  function buildQueryParams() {
    const params = {
      search: state.search,
      sortBy: state.sortBy,
      sortOrder: state.sortOrder,
      considerAbilities: state.considerAbilities
    };

    // Species Types
    if (state.speciesTypes.size > 0) {
      params.types = Array.from(state.speciesTypes);
      params.typeMode = state.speciesTypeMode;
    }

    // Tiers
    if (state.tiers.size > 0) {
      params.tiers = Array.from(state.tiers);
    }

    // Mega Filter
    if (state.megaFilter === 'true') {
      params.isMega = true;
    } else if (state.megaFilter === 'false') {
      params.isMega = false;
    }

    // Moves
    if (state.moves.length > 0) {
      params.moves = state.moves.map(m => m.id);
      params.moveMode = state.moveMode;
    }

    // Abilities
    if (state.abilities.length > 0) {
      params.abilities = state.abilities.map(a => a.name);
    }
    if (state.isCustomAbilityOnly) {
      params.isCustomAbility = true;
    }

    // Stat Thresholds
    if (state.minSpeed > 0) params.minSpeed = state.minSpeed;
    if (state.minBst > 180) params.minBst = state.minBst;
    if (state.statBias !== 'all') params.statBias = state.statBias;

    // Defensive Matchup Rules
    if (state.defensiveTypes.size > 0) {
      const typesArr = Array.from(state.defensiveTypes);
      if (state.relation === 'resist') {
        params.resists = typesArr;
        params.resistMode = state.defenseMode;
      } else if (state.relation === 'double_resist') {
        params.doubleResists = typesArr;
      } else if (state.relation === 'immune') {
        params.immuneTo = typesArr;
        params.immuneMode = state.defenseMode;
      } else if (state.relation === 'weak') {
        params.weakTo = typesArr;
        params.weakMode = state.defenseMode;
      } else if (state.relation === 'not_weak') {
        params.notWeakTo = typesArr;
      }
    }

    return params;
  }

  /**
   * Execute Primary Query and Render
   */
  function runQuery() {
    if (!engine) return;

    const params = buildQueryParams();
    const result = engine.query(params);

    // Update Counts & Timing
    if (els.resultsCount) els.resultsCount.textContent = result.total;
    if (els.speedBadge) els.speedBadge.textContent = `⚡ ${result.executionTimeMs} ms`;

    // Update Live Facets Count on Type Chips
    updateTypeChipCounts(result.facets.types);

    // Render Active Filter Chips
    renderActiveFilterChips();

    // Render Pokémon Cards
    if (result.results.length === 0) {
      els.rosterGrid.innerHTML = '';
      els.emptyState.classList.remove('hidden');
    } else {
      els.emptyState.classList.add('hidden');
      renderPokemonCards(result.results);
    }
  }

  /**
   * Update Match Count on 18 Type Chips
   */
  function updateTypeChipCounts(typeCounts = {}) {
    for (const type of allTypes) {
      const badge = document.getElementById(`type-badge-${type.toLowerCase()}`);
      if (badge) {
        badge.textContent = typeCounts[type] || 0;
      }
    }
  }

  /**
   * Render Active Filter Chips Row
   */
  function renderActiveFilterChips() {
    const chips = [];

    if (state.search) {
      chips.push({ label: `Search: "${state.search}"`, onRemove: () => {
        state.search = '';
        els.globalSearch.value = '';
        els.clearSearchBtn.classList.add('hidden');
        runQuery();
      }});
    }

    if (state.defensiveTypes.size > 0) {
      const typesStr = Array.from(state.defensiveTypes).join('+');
      chips.push({ label: `Defend: ${state.relation.toUpperCase()} [${typesStr}]`, onRemove: () => {
        state.defensiveTypes.clear();
        els.typeChipsGrid.querySelectorAll('.type-chip').forEach(c => c.classList.remove('selected'));
        updateDefenseSummary();
        runQuery();
      }});
    }

    if (state.speciesTypes.size > 0) {
      const typesStr = Array.from(state.speciesTypes).join('/');
      chips.push({ label: `Type: ${typesStr}`, onRemove: () => {
        state.speciesTypes.clear();
        els.speciesTypeChips.querySelectorAll('.species-chip').forEach(c => c.classList.remove('active'));
        runQuery();
      }});
    }

    if (state.tiers.size > 0) {
      chips.push({ label: `Tiers: ${Array.from(state.tiers).join(', ')}`, onRemove: () => {
        state.tiers.clear();
        els.tierPills.forEach(p => p.classList.remove('active'));
        runQuery();
      }});
    }

    if (state.megaFilter !== 'all') {
      chips.push({ label: state.megaFilter === 'true' ? 'Megas Only' : 'No Megas', onRemove: () => {
        state.megaFilter = 'all';
        els.formPills.forEach(p => p.classList.toggle('active', p.dataset.mega === 'all'));
        runQuery();
      }});
    }

    for (const m of state.moves) {
      chips.push({ label: `Move: ${m.name}`, onRemove: () => {
        state.moves = state.moves.filter(item => item.id !== m.id);
        renderSelectedMoves();
        runQuery();
      }});
    }

    for (const a of state.abilities) {
      chips.push({ label: `Ability: ${a.name}`, onRemove: () => {
        state.abilities = state.abilities.filter(item => item.name !== a.name);
        renderSelectedAbilities();
        runQuery();
      }});
    }

    if (state.isCustomAbilityOnly) {
      chips.push({ label: 'Custom Abilities Only', onRemove: () => {
        state.isCustomAbilityOnly = false;
        els.customAbilityToggle.checked = false;
        runQuery();
      }});
    }

    if (state.minSpeed > 0) {
      chips.push({ label: `Spe ≥ ${state.minSpeed}`, onRemove: () => {
        state.minSpeed = 0;
        els.speedSlider.value = 0;
        els.speedValue.textContent = 'Any';
        runQuery();
      }});
    }

    if (state.minBst > 180) {
      chips.push({ label: `BST ≥ ${state.minBst}`, onRemove: () => {
        state.minBst = 180;
        els.bstSlider.value = 180;
        els.bstValue.textContent = 'Any';
        runQuery();
      }});
    }

    if (state.statBias !== 'all') {
      chips.push({ label: `Bias: ${state.statBias}`, onRemove: () => {
        state.statBias = 'all';
        els.statBiasBtns.forEach(b => b.classList.toggle('active', b.dataset.bias === 'all'));
        runQuery();
      }});
    }

    if (chips.length === 0) {
      els.activeChipsList.innerHTML = `<span class="no-filters-msg">None (Showing all legal Pokémon)</span>`;
      els.clearAllChipsBtn.classList.add('hidden');
    } else {
      els.activeChipsList.innerHTML = chips.map((c, i) => `
        <span class="item-chip">
          <span>${c.label}</span>
          <button type="button" class="chip-remove-btn" data-index="${i}">×</button>
        </span>
      `).join('');

      els.activeChipsList.querySelectorAll('.chip-remove-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const idx = parseInt(btn.dataset.index, 10);
          if (chips[idx] && chips[idx].onRemove) {
            chips[idx].onRemove();
          }
        });
      });

      els.clearAllChipsBtn.classList.remove('hidden');
    }
  }

  /**
   * Reset All Filters to Default
   */
  function resetAllFilters() {
    state.search = '';
    state.relation = 'resist';
    state.defenseMode = 'all';
    state.considerAbilities = true;
    state.defensiveTypes.clear();
    state.speciesTypes.clear();
    state.speciesTypeMode = 'any';
    state.tiers.clear();
    state.megaFilter = 'all';
    state.moves = [];
    state.abilities = [];
    state.isCustomAbilityOnly = false;
    state.minSpeed = 0;
    state.minBst = 180;
    state.statBias = 'all';
    state.sortBy = 'num';
    state.sortOrder = 'asc';

    // Reset DOM Elements
    els.globalSearch.value = '';
    els.clearSearchBtn.classList.add('hidden');
    els.includeAbilitiesToggle.checked = true;
    els.speciesTypeMode.value = 'any';
    els.speedSlider.value = 0;
    els.speedValue.textContent = 'Any';
    els.bstSlider.value = 180;
    els.bstValue.textContent = 'Any';
    els.customAbilityToggle.checked = false;
    els.sortBySelect.value = 'num';
    els.sortDirectionIcon.textContent = '↓';

    els.relationTabs.forEach(t => t.classList.toggle('active', t.dataset.relation === 'resist'));
    els.typeChipsGrid.querySelectorAll('.type-chip').forEach(c => c.classList.remove('selected'));
    els.speciesTypeChips.querySelectorAll('.species-chip').forEach(c => c.classList.remove('active'));
    els.tierPills.forEach(p => p.classList.remove('active'));
    els.formPills.forEach(p => p.classList.toggle('active', p.dataset.mega === 'all'));
    els.statBiasBtns.forEach(b => b.classList.toggle('active', b.dataset.bias === 'all'));

    renderSelectedMoves();
    renderSelectedAbilities();
    updateDefenseSummary();
    runQuery();
  }

  /**
   * Render Pokémon Roster Cards
   */
  function renderPokemonCards(pokemonList) {
    els.rosterGrid.innerHTML = '';
    const fragment = document.createDocumentFragment();

    for (const p of pokemonList) {
      const card = createPokemonCardElement(p);
      fragment.appendChild(card);
    }

    els.rosterGrid.appendChild(fragment);
  }

  /**
   * Create Single Pokémon Card DOM Element
   */
  function createPokemonCardElement(p) {
    const card = document.createElement('article');
    card.className = 'pokemon-card';
    card.dataset.id = p.id;

    // Type Color Tokens
    const primaryType = p.types[0];
    const primaryColor = typeColors[primaryType] || { bg: '#6366f1', glow: 'rgba(99, 102, 241, 0.4)' };
    const secondaryType = p.types[1] || primaryType;
    const secondaryColor = typeColors[secondaryType] || primaryColor;

    card.style.setProperty('--card-glow', primaryColor.glow);
    card.style.setProperty('--card-border-glow', primaryColor.bg);
    card.style.setProperty('--card-primary-gradient', `linear-gradient(90deg, ${primaryColor.bg}, ${secondaryColor.bg})`);

    // Tier Badge Styling
    const tierClass = `tier-${p.tier.toLowerCase().replace(/[^a-z]/g, '')}`;

    // Defensive Highlight Tag (if filtered)
    let defenseHighlightHtml = '';
    if (p.qualifyingDefense && state.defensiveTypes.size > 0) {
      const abilityNote = p.qualifyingDefense.ability ? ` via ${p.qualifyingDefense.ability}` : '';
      defenseHighlightHtml = `
        <div class="card-defense-highlight">
          <span class="defense-highlight-icon">🛡️</span>
          <span>Satisfies defense${abilityNote}</span>
        </div>
      `;
    }

    // Type Badges HTML
    const typeBadgesHtml = p.types.map(t => {
      const c = typeColors[t] || { bg: '#6366f1', text: '#ffffff' };
      return `<span class="type-badge" style="background-color: ${c.bg}; color: ${c.text};">${t}</span>`;
    }).join('');

    // Abilities Preview
    const abilityNames = p.abilities.map(a => a.name + (a.isCustomChampions ? ' ⭐' : '')).join(', ');

    // Stat Fill Percentages (capped at 160)
    const stats = p.baseStats;
    const calcPct = (val) => Math.min(100, Math.round((val / 160) * 100));

    card.innerHTML = `
      <div class="card-top-row">
        <span class="card-dex-num">#${String(p.num).padStart(3, '0')}</span>
        <div class="card-badges-group">
          ${p.forme ? `<span class="form-badge">${p.forme.toUpperCase()}</span>` : ''}
          <span class="tier-badge ${tierClass || 'tier-other'}">${p.tier}</span>
        </div>
      </div>

      <div class="card-identity-row">
        <div class="card-artwork-wrapper">
          <img 
            class="card-artwork" 
            src="${p.artwork}" 
            alt="${p.name}" 
            loading="lazy" 
            onerror="this.onerror=null; this.src='${p.sprite}';"
          >
        </div>
        <div class="card-name-group">
          <h3 class="card-pokemon-name">${p.name}</h3>
          <div class="card-types-row">${typeBadgesHtml}</div>
        </div>
      </div>

      ${defenseHighlightHtml}

      <div class="card-stats-section">
        <div class="stat-bar-row">
          <span class="stat-code">HP</span>
          <span class="stat-val">${stats.hp}</span>
          <div class="stat-track"><div class="stat-fill hp" style="width: ${calcPct(stats.hp)}%;"></div></div>
        </div>
        <div class="stat-bar-row">
          <span class="stat-code">Atk</span>
          <span class="stat-val">${stats.atk}</span>
          <div class="stat-track"><div class="stat-fill atk" style="width: ${calcPct(stats.atk)}%;"></div></div>
        </div>
        <div class="stat-bar-row">
          <span class="stat-code">Def</span>
          <span class="stat-val">${stats.def}</span>
          <div class="stat-track"><div class="stat-fill def" style="width: ${calcPct(stats.def)}%;"></div></div>
        </div>
        <div class="stat-bar-row">
          <span class="stat-code">SpA</span>
          <span class="stat-val">${stats.spa}</span>
          <div class="stat-track"><div class="stat-fill spa" style="width: ${calcPct(stats.spa)}%;"></div></div>
        </div>
        <div class="stat-bar-row">
          <span class="stat-code">SpD</span>
          <span class="stat-val">${stats.spd}</span>
          <div class="stat-track"><div class="stat-fill spd" style="width: ${calcPct(stats.spd)}%;"></div></div>
        </div>
        <div class="stat-bar-row">
          <span class="stat-code">Spe</span>
          <span class="stat-val">${stats.spe}</span>
          <div class="stat-track"><div class="stat-fill spe" style="width: ${calcPct(stats.spe)}%;"></div></div>
        </div>
      </div>

      <div class="card-footer-row">
        <span class="card-ability-preview" title="${abilityNames}">✨ ${abilityNames}</span>
        <span class="card-bst-pill">BST ${p.bst}</span>
      </div>
    `;

    card.addEventListener('click', () => {
      openPokemonModal(p.id);
    });

    return card;
  }

  /**
   * Open Pokémon Inspector Modal (Phase 4 Foundation)
   */
  function openPokemonModal(pokemonId) {
    const p = engine.getPokemonById(pokemonId);
    if (!p) return;

    state.selectedPokemonId = pokemonId;

    // Get 18-type damage chart under default/first ability
    const defaultAbility = p.abilities[0]?.name || null;
    const chartData = engine.getDamageChart(p.id, defaultAbility);

    // Get learned moves
    const learnedMoves = engine.getPokemonMoves(p.id);

    // Get related forms (e.g. Megas / regional)
    const relatedForms = engine.getRelatedForms(p.id);

    // Build Form Switcher HTML
    let formSwitcherHtml = '';
    if (relatedForms.length > 1) {
      formSwitcherHtml = `
        <div class="modal-form-switcher">
          <span class="sub-filter-label">Forms:</span>
          <div class="pill-group">
            ${relatedForms.map(f => `
              <button type="button" class="pill-btn ${f.id === p.id ? 'active' : ''}" data-form-id="${f.id}">
                ${f.forme || 'Base'}
              </button>
            `).join('')}
          </div>
        </div>
      `;
    }

    // Build Ability Pills
    const abilityPillsHtml = p.abilities.map((a, idx) => `
      <div class="modal-ability-card ${idx === 0 ? 'active' : ''}" data-ability="${a.name}">
        <div class="modal-ability-header">
          <span class="modal-ability-name">${a.name} ${a.isCustomChampions ? '⭐ (Champions Custom)' : ''}</span>
          <span class="format-tag">${a.slot}</span>
        </div>
        <p class="modal-ability-desc">${a.desc}</p>
      </div>
    `).join('');

    // Damage Chart Grid Cells
    const damageChartCellsHtml = chartData.chart.map(item => `
      <div class="damage-cell">
        <span style="color: ${item.color.bg}; font-size: 0.75rem;">${item.type}</span>
        <span class="damage-mult-badge mult-${item.badgeClass}">${item.label}</span>
      </div>
    `).join('');

    // Learnset Table Rows
    const learnsetRowsHtml = learnedMoves.map(m => `
      <tr>
        <td style="font-weight: 600; color: #ffffff;">${m.name}</td>
        <td><span class="type-badge" style="background-color: ${typeColors[m.type]?.bg || '#6366f1'}">${m.type}</span></td>
        <td><span class="category-badge cat-${m.category.toLowerCase()}">${m.category}</span></td>
        <td style="font-family: var(--font-mono);">${m.basePower || '-'}</td>
        <td style="font-family: var(--font-mono);">${m.accuracy || '-'}%</td>
        <td style="font-family: var(--font-mono);">${m.pp}</td>
        <td style="color: var(--text-muted); font-size: 0.72rem;">${m.shortDesc || ''}</td>
      </tr>
    `).join('');

    els.modalContent.innerHTML = `
      <div class="modal-header">
        <button type="button" class="modal-close-btn" id="modal-close-btn" aria-label="Close dialog">×</button>
        <div class="modal-pokemon-hero">
          <img 
            class="modal-artwork" 
            src="${p.artwork}" 
            alt="${p.name}"
            onerror="this.onerror=null; this.src='${p.sprite}';"
          >
          <div>
            <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.25rem;">
              <span class="card-dex-num">#${String(p.num).padStart(3, '0')}</span>
              <span class="tier-badge tier-${p.tier.toLowerCase().replace(/[^a-z]/g, '')}">${p.tier}</span>
            </div>
            <h2 class="modal-hero-title" id="modal-pokemon-name">${p.name}</h2>
            <div class="card-types-row" style="margin-top: 0.4rem;">
              ${p.types.map(t => `<span class="type-badge" style="background-color: ${typeColors[t]?.bg || '#6366f1'}">${t}</span>`).join('')}
            </div>
          </div>
        </div>
      </div>

      <div class="modal-body">
        ${formSwitcherHtml}

        <!-- 18-Type Defensive Matchup Chart -->
        <div>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
            <h3 class="card-subtitle">18-Type Defensive Profile</h3>
            <span style="font-size: 0.74rem; color: var(--text-subtle);">Damage taken from attacks</span>
          </div>
          <div class="damage-chart-grid" id="modal-damage-grid">
            ${damageChartCellsHtml}
          </div>
        </div>

        <!-- Abilities -->
        <div>
          <h3 class="card-subtitle" style="margin-bottom: 0.5rem;">Legal Abilities</h3>
          <div style="display: flex; flex-direction: column; gap: 0.5rem;">
            ${abilityPillsHtml}
          </div>
        </div>

        <!-- Learnset Table -->
        <div>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
            <h3 class="card-subtitle">Champions Movepool (${learnedMoves.length} moves)</h3>
            <input 
              type="search" 
              id="modal-move-search" 
              class="filter-text-input" 
              placeholder="Filter movepool..." 
              style="width: 180px; height: 30px; font-size: 0.75rem;"
            >
          </div>
          <div class="learnset-table-wrapper">
            <table class="learnset-table">
              <thead>
                <tr>
                  <th>Move</th>
                  <th>Type</th>
                  <th>Category</th>
                  <th>Power</th>
                  <th>Accuracy</th>
                  <th>PP</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody id="modal-learnset-tbody">
                ${learnsetRowsHtml}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    // Hook Close Button
    document.getElementById('modal-close-btn')?.addEventListener('click', () => {
      els.modal.close();
    });

    // Hook Form Switcher Buttons
    els.modalContent.querySelectorAll('[data-form-id]').forEach(btn => {
      btn.addEventListener('click', () => {
        openPokemonModal(btn.dataset.formId);
      });
    });

    // Hook Modal Move Filter
    const moveSearchInput = document.getElementById('modal-move-search');
    const moveTbody = document.getElementById('modal-learnset-tbody');
    moveSearchInput?.addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase().trim();
      const filteredMoves = learnedMoves.filter(m => m.name.toLowerCase().includes(q) || m.type.toLowerCase().includes(q));
      moveTbody.innerHTML = filteredMoves.map(m => `
        <tr>
          <td style="font-weight: 600; color: #ffffff;">${m.name}</td>
          <td><span class="type-badge" style="background-color: ${typeColors[m.type]?.bg || '#6366f1'}">${m.type}</span></td>
          <td><span class="category-badge cat-${m.category.toLowerCase()}">${m.category}</span></td>
          <td style="font-family: var(--font-mono);">${m.basePower || '-'}</td>
          <td style="font-family: var(--font-mono);">${m.accuracy || '-'}%</td>
          <td style="font-family: var(--font-mono);">${m.pp}</td>
          <td style="color: var(--text-muted); font-size: 0.72rem;">${m.shortDesc || ''}</td>
        </tr>
      `).join('');
    });

    // Open native dialog modal
    els.modal.showModal();
  }

  // Kick off application on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
