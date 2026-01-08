# EHT Simulator

A browser-based simulator for Epithelial-to-Hematopoietic Transition (EHT) in cell biology. Simulates cell mechanics, division, and EMT events in a curved epithelial tissue.

## Project Aim

Model the physical and biological processes during EHT:
- Cell mechanics (repulsion, springs, constraints)
- Cell division with interkinetic nuclear migration (INM)
- EMT events: loss of apical/basal adhesion, loss of straightness, cell polarization/running
- Curved basal membrane geometry

The simulator supports both interactive single simulations and batch parameter sweeps for statistical analysis.

## Tech Stack

- **Framework**: React 18 + TypeScript
- **Bundler**: Vite
- **Rendering**: Pixi.js (WebGL)
- **UI**: shadcn/ui + Tailwind CSS
- **Parameters**: TOML files (@iarna/toml)
- **Data Export**: CSV (papaparse)
- **Math**: Immutable Vector2, seeded random (seedrandom)

## Project Structure

```
src/
├── core/                 # Simulation engine (no rendering deps)
│   ├── types/           # TypeScript interfaces (params, state, output)
│   ├── math/            # Vector2, SeededRandom, geometry utilities
│   ├── params/          # Defaults, TOML parsing, schema validation (Zod)
│   ├── simulation/      # Engine, forces, constraints, events, division
│   └── batch/           # Batch runner, statistics, CSV serialization
│
├── rendering/           # Pixi.js renderer (SimulationRenderer, themes)
│
├── hooks/               # React hooks (useSimulation, useRenderer)
│
├── components/
│   ├── ui/              # shadcn/ui components (Button, Card, Tabs, etc.)
│   ├── layout/          # AppLayout, Header
│   ├── simulation/      # SingleSimulationTab, Canvas, Controls, StatsPanel
│   ├── params/          # ParameterPanel, ParameterGroup, ParameterInput
│   └── batch/           # BatchTab, ParameterRangeList, StatisticSelector
│
└── lib/                 # Utilities (cn for classnames)
```

## Key Principles

1. **Core has no rendering deps** - Can run headless in Node.js or browser
2. **Immutable Vector2** - All vector operations return new instances
3. **Seeded random** - Reproducible simulations via `random_seed` parameter
4. **TOML for parameters** - Human-readable, backwards compatible (missing params use defaults)
5. **Modular model design** - Parameters → Simulation Engine → State snapshots → Render/Export

## Batch Simulations

Batch mode runs multiple simulations with parameter sweeps:

1. **Define parameter ranges** - Select parameters to vary (e.g., `general.N_emt` from 2 to 10 in 5 steps)
2. **Configure time samples** - Snapshots at specified times (e.g., 0h, 12h, 24h, 36h, 48h)
3. **Run batch** - Executes all parameter combinations × seeds
4. **Store snapshots** - Each snapshot stores cell positions, adhesion state, neighbors, age
5. **Compute statistics** - Select from 20+ predefined statistics (cell counts, positions, escape rates, etc.)
6. **Export** - Save batch snapshots as CSV (can reload later), export computed statistics

### Batch Data Flow

```
Base Params + Parameter Ranges
         ↓
   Run Simulations
         ↓
   BatchSnapshot[] (stored at sample times)
         ↓
   Save/Load CSV ←→ batch_snapshots.csv
         ↓
   Select Statistics
         ↓
   Compute (instant from memory)
         ↓
   Results Table → Export CSV
```

## Development

```bash
npm install          # Install dependencies
npm run dev          # Start dev server (Vite)
npm run build        # Production build
npm run lint         # ESLint
```

Please note that sometimes a port is busy, so read the output of `npm run dev` to find the port that is used.

## Parameters

Parameters are organized in TOML format:

- `[general]` - Simulation setup (cell counts, geometry, time)
- `[cell_prop]` - Physical properties (radii, stiffness)
- `[cell_types.control]` - Control cell behavior
- `[cell_types.emt]` - EMT cell behavior (spring constants, EMT event times)

Load/save TOML files via the UI. Missing parameters are filled with defaults.
