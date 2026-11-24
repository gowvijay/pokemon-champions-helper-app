# Pokémon Champions Pokédex & Defensive Matchup Query Engine

A fast, offline-first competitive Pokédex and query engine purpose-built for the **Pokémon Champions** competitive format (Pokémon Showdown mod / Regulation M).

Designed for competitive team-builders, theorycrafters, and tournament players to search legal Pokémon, analyze dual-type defensive profiles, filter by custom abilities, and discover synergistic movesets in milliseconds.

---

## 🌐 Live App (GitHub Pages)

No installation is required to use the app—it is hosted live on GitHub Pages:

👉 **[https://gowvijay.github.io/pokemon-champions-helper-app/](https://gowvijay.github.io/pokemon-champions-helper-app/)**

Every push to `main` automatically runs `npm test` and deploys the static app via [`.github/workflows/pages.yml`](.github/workflows/pages.yml).

---

## ⚡ Quick Start (Local Development)

### 1. Prerequisites
- **Node.js** (v18.0.0 or higher recommended)
- **npm** (comes with Node.js)

### 2. Installation
Clone the repository and install dependencies:

```bash
git clone https://github.com/gowvijay/pokemon-champions-helper-app.git
cd pokemon-champions-helper-app
npm install
```

### 3. Start the Local Server
Launch the lightweight local dev server:

```bash
npm run dev
```

You will see:
```text
======================================================
  Pokémon Champions Pokédex Dev Server
  Local URL: http://localhost:3000/
======================================================
```

Open your browser to:
👉 **[http://localhost:3000/](http://localhost:3000/)**

> **Custom Port:** If port 3000 is occupied, set the `PORT` environment variable:
> ```bash
> PORT=8080 npm run dev
> ```
>
> **Stop the Server:** Press `Ctrl + C` in the terminal.

---

## 🎮 Key Features

- **🛡️ Defensive Matchup Matrix**:
  - Filter Pokémon by resistances (0.5x, 0.25x), immunities (0x), or weaknesses (2x, 4x).
  - Ability-aware defense calculations: correctly factors in type-modifying abilities such as **Levitate**, **Eelevate**, **Thick Fat**, **Earth Eater**, **Flash Fire**, **Volt Absorb**, **Water Absorb**, **Purifying Salt**, **Filter**, and **Solid Rock**.
  - Query combinations like: *"Resists Water AND Fairy"* or *"Immune to Ground AND Not Weak to Rock"*.

- **📖 Complete Pokémon Champions Database**:
  - **341 Verified Legal Species**: Filters out illegal and past generation entries.
  - **510 Legal Moves**: Move category (Physical, Special, Status), power, accuracy, priority, and PP.
  - **215 Abilities**: Accurate descriptions, including Champions-exclusive custom and rebalanced abilities (*Dragonize*, *Eelevate*, *Fire Mane*, *Megasol*, *Piercing Drill*, *Spicy Spray*, etc.).
  - Includes alternate forms and Mega Evolutions.

- **🔍 Advanced Multi-Dimensional Filtering**:
  - Full-text search by Pokémon name, National Dex number, move, or ability (press `/` anywhere to focus search).
  - Stat threshold sliders: Minimum/maximum Speed, Attack, Defense, Sp. Atk, Sp. Def, HP, and Base Stat Total (BST).
  - Competitive tier filtering (Uber, OU, UU, RU).
  - Dual-type exact and partial matching.

- **📊 Interactive Pokémon Inspector Modal**:
  - Complete 18-type defensive damage breakdown matrix.
  - Searchable, sortable learnset table with move categories, base power, accuracy, and priority tags.
  - Instant toggle between base forms and Mega Evolutions.
  - Base stat distribution radar and visual bars.

- **⚡ Blazing Performance**:
  - Inverted in-memory indexes execute complex multi-attribute queries in **< 0.5 ms**.
  - Zero heavy external runtime frameworks—built with clean vanilla HTML5, CSS3, and JavaScript.

---

## 🛠️ Available NPM Scripts

| Command | Description |
| :--- | :--- |
| `npm run dev` | Starts the zero-dependency local HTTP development server at `http://localhost:3000` |
| `npm test` | Runs the 27-test automated query engine test suite and performance benchmark |
| `npm run sync` | Re-syncs and normalizes the latest Champions data from Pokémon Showdown's upstream repositories |

---

## 📂 Project Structure

```text
pokemon-champions-helper-app/
├── .github/
│   └── workflows/
│       └── pages.yml            # GitHub Actions workflow to test & deploy to GitHub Pages
├── .gitignore
├── index.html                   # Main application web interface
├── package.json                 # Project scripts and dependencies
├── development-notes.md         # Comprehensive engineering notes & roadmap
├── README.md                    # Project documentation (this file)
│
├── src/
│   ├── app.js                   # UI controller, event handlers, and modal rendering
│   ├── query-engine.js          # Dual-type arithmetic & indexing query engine (CommonJS + Browser)
│   ├── query-engine.esm.js      # ES Module wrapper for query engine
│   ├── style.css                # Modern dark-theme design system and responsive grid
│   └── data/
│       └── champions_db.json    # Normalized Champions Pokédex, moves, and abilities bundle
│
├── scripts/
│   ├── serve.js                 # Zero-dependency local static HTTP server
│   └── sync-data.js             # Data ingestion pipeline from Pokémon Showdown
│
└── tests/
    └── query-engine.test.js     # Automated test suite (27 unit & benchmark tests)
```

---

## 🔬 Data Sources & Methodology

1. **Format Rules & Legality**: Derived from Pokémon Showdown's `data/mods/champions/` module (`formats-data.ts`, `learnsets.ts`, `abilities.ts`, and `moves.ts`).
2. **Defensive Arithmetic**: Uses standard Gen 9 18×18 dual-type interaction matrices augmented by ability-based conditional rules (e.g., Snorlax with *Thick Fat* receiving 0.5x from Fire/Ice instead of 1.0x).
3. **Artwork**: Official Pokémon Sugimori artwork and Pokémon Showdown sprite servers.

---

## 🧪 Running the Tests

To verify query engine calculations, defensive ability mechanics, and benchmark execution:

```bash
npm test
```

Expected output:
```text
======================================================
  Pokémon Champions Query Engine - Phase 2 Test Suite
======================================================
  ✔ Engine initializes successfully with champions_db.json
  ✔ Dual-Type Arithmetic: Fire/Flying (Charizard)
  ...
  ✔ Performance Benchmark: 100 mixed queries execute in under 100ms
------------------------------------------------------
Tests finished: 27 passed, 0 failed
------------------------------------------------------
```
