# Pokémon Champions Query Application - Development Notes

## Project Overview
A local application and Pokédex database specifically built for querying available Pokémon in **Pokémon Champions**. It provides competitive information including types, abilities, available movesets, and advanced queries such as defensive type matchups (resistances, weaknesses, and immunities).

## Implementation Plan

### 1. Data Retrieval Strategy (The Source of Truth)
- **Primary Source**: Smogon / Pokémon Showdown's `data/mods/champions/` repository.
  - `formats-data.ts`: Provides active format legality and tier assignments (`RU`, `UU`, `OU`, `Uber` vs `Illegal` / `Past`).
  - `learnsets.ts`: Specifies the exact movepools legal in *Pokémon Champions*.
  - `abilities.ts` & `moves.ts`: Overrides and balance changes specific to *Pokémon Champions*.
  - Base dex data (`data/pokedex.ts`): Base stats, types, weight, height, and forms.
- **Secondary Enrichment**: High-resolution official artwork and sprites from Pokémon Showdown / PokéAPI asset repositories.
- **Data Normalization**: Offline-first JSON bundle (`src/data/champions_db.json`) containing all parsed, clean, and normalized records for instant client-side querying.
- **Update Mechanism**: Single script (`scripts/sync-data.js` or `npm run sync`) to re-sync data when new competitive Regulations rotate (e.g., Reg M-A, M-B, M-C).

### 2. Defensive Matchup & Query Engine
- **Type Effectiveness Calculation**: Dual-type arithmetic calculating 0x (immune), 0.25x (double resist), 0.5x (resist), 1x (neutral), 2x (weak), and 4x (double weak).
- **Ability Considerations**: Integration of type-altering abilities (e.g., Levitate, Flash Fire, Volt Absorb, Sap Sipper, Thick Fat).
- **Multi-Filter Queries**:
  - Filter by defensive resistances (e.g., "Resists Water AND Fairy").
  - Filter by moves (e.g., "Learns Fake Out AND Tailwind").
  - Filter by abilities (e.g., "Intimidate").
  - Filter by base stats and tiers/regulations.

### 3. Application Architecture & UI
- **Tech Stack**: Vanilla HTML5, CSS3, and JavaScript/TypeScript with modern aesthetics, fast local dev server.
- **Design System**: Sleek modern dark mode, CSS custom properties, glassmorphism, glowing type badge accents, responsive grid.
- **Components**:
  - Top Search & Filter Bar (search by name, move, ability).
  - Defensive Resistance Matrix Filter (interactive type chips).
  - Main Pokémon Roster Grid with stat bars and type badges.
  - Interactive Pokémon Detail Modal (18-type damage chart, abilities, searchable learnset table, and Mega Evolution form toggles).

---

## Roadmap & Progress Tracking

- [x] **Project Initialization**: Created workspace under `/Users/gowvijay/Development/vibes2026/pokemon/` and established `development-notes.md`.
- [x] **Phase 1: Ingestion Pipeline & Data Normalization** *(Completed)*
  - [x] Installed `@pkmn/dex` and built `scripts/sync-data.js` pipeline fetching from Pokémon Showdown's `data/mods/champions/` repository.
  - [x] Extracted and verified **341 legal Pokémon species** in *Pokémon Champions* (filtering out `Illegal` / `Past` entries).
  - [x] Normalized and indexed **510 unique legal moves** (with category, power, accuracy, pp, priority, and short descriptions).
  - [x] Indexed **215 abilities** with descriptions, including Champions-specific custom/rebalanced abilities (`dragonize`, `eelevate`, `firemane`, `megasol`, `piercingdrill`, `spicyspray`, etc.).
  - [x] Calculated complete 18-type defensive damage profiles (resistances, immunities, weaknesses) for every legal Pokémon.
  - [x] Generated optimized local database bundle at `src/data/champions_db.json` (0.76 MB).
  - [x] Added `npm run sync` script in `package.json` for one-command data updates.
- [x] **Phase 2: Core Calculation & Query Engine** *(Completed)*
  - [x] Implemented universal browser & Node query engine in `src/query-engine.js` and ESM wrapper `src/query-engine.esm.js`.
  - [x] Built dual-type defensive arithmetic with 18x18 canonical Gen 9 type chart.
  - [x] Integrated defensive abilities modifying damage profiles (`Levitate`, `Eelevate`, `Earth Eater`, `Flash Fire`, `Thick Fat`, `Volt Absorb`, `Water Absorb`, `Sap Sipper`, `Purifying Salt`, `Filter`, `Solid Rock`, `Dry Skin`, `Heatproof`, etc.).
  - [x] Implemented multi-type defensive resistance queries (`resists`, `doubleResists`, `immuneTo`, `weakTo`, `notWeakTo`, with `considerAbilities` toggle).
  - [x] Added movepool querying (`moves`, `moveMode: 'all'|'any'`, `moveCategory`, `moveType`) and move autocomplete (`searchMoves`).
  - [x] Added ability search and filtering (`abilities`, `abilityMode`, `isCustomAbility`).
  - [x] Added stat threshold filters (`minSpeed`, `maxSpeed`, `minBst`, custom nested ranges, and stat bias profiles).
  - [x] Added format, tier, mega form, and full-text search filters.
  - [x] Built inverted indexes for sub-millisecond execution (< 0.4ms per query).
  - [x] Added comprehensive automated test suite (`tests/query-engine.test.js` - 27 tests passing) and `npm test` script.
- [ ] **Phase 3: UI & Component Development** *(Next)*
  - [ ] Build design system (dark theme, glassmorphic cards, type-themed glowing accents).
  - [ ] Create responsive Pokémon roster grid with live filtering.
  - [ ] Implement interactive defensive type selector controls.
- [ ] **Phase 4: Detailed Inspector & Movepool Table**
  - [ ] Build interactive Pokémon inspector modal.
  - [ ] Render 18-type damage chart with multiplier tags.
  - [ ] Render searchable, sortable movepool table.
  - [ ] Add Mega Evolution / alternate form switching.
- [ ] **Phase 5: Polish & Local Dev Server**
  - [ ] Set up lightweight local dev server (`npm run dev`).
  - [ ] Verify query performance and responsiveness across all filters.
- [x] **Phase 6: Git & GitHub Pages Deployment** *(Completed)*
  - [x] Initialized local Git repository on `main` and created `.gitignore` (excluding `node_modules/`, `.DS_Store`, `*.log`, and `.env`).
  - [x] Installed GitHub CLI (`gh` `2.105.0`) at `/usr/local/bin/gh` and created public repository [`gowvijay/pokemon-champions-helper-app`](https://github.com/gowvijay/pokemon-champions-helper-app).
  - [x] Added `.github/workflows/pages.yml` to run `npm test` and deploy static assets (`index.html`, `src/`, and `public/` if non-empty) to GitHub Pages on every push to `main`.
  - [x] Enabled GitHub Pages (GitHub Actions workflow) and verified live deployment at https://gowvijay.github.io/pokemon-champions-helper-app/.
