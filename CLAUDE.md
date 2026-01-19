# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# EHT Simulator

Browser-based multi-model cell simulation platform for Epithelial-to-Hematopoietic Transition (EHT) research.

## Tech Stack

React 18 + TypeScript, Vite, Pixi.js, shadcn/ui + Tailwind, TOML params, CSV export, Vitest

## Commands

```bash
# Development
npm run dev              # Start dev server (Vite will display the port)
npm run build            # TypeScript compile + production build
npm run preview          # Preview production build

# Testing
npm run test             # Run all tests once
npm run test:watch       # Run tests in watch mode
npm run test:ui          # Open Vitest UI
npm run test:coverage    # Run tests with coverage report

# CLI (headless simulations)
npm run cli -- run                              # Single simulation with defaults
npm run cli -- run -c params.toml -o out.csv    # With config and output
npm run cli -- batch -c batch.toml --stats all  # Batch with all statistics
npm run cli -- stats                            # List available statistics
```

## Architecture

### Core Concepts

**Model Registry Pattern**: Models self-register on import via a singleton registry. Each model is a complete, self-contained unit implementing the `SimulationModel` interface.

**Plugin-like Model System**: Models are discovered and registered at runtime. The core system is model-agnostic and only depends on the interface contract defined in [src/core/interfaces/model.ts](src/core/interfaces/model.ts).

**Separation of Core and UI**: The core simulation engine ([src/core/simulation/engine.ts](src/core/simulation/engine.ts)) has no rendering dependencies and can run headlessly. Rendering is model-specific and optional.

### Directory Structure

```
src/
├── core/              # Shared simulation infrastructure
│   ├── interfaces/    # Model and renderer contracts
│   ├── registry/      # Model discovery and version management
│   ├── simulation/    # Generic simulation engine (model-agnostic)
│   ├── batch/         # Batch runner, worker pool, statistics aggregation
│   ├── params/        # TOML/URL/config parameter handling
│   ├── math/          # Vector math, geometry utilities, seeded RNG
│   └── types/         # Shared type definitions
├── models/            # Self-contained model implementations
│   ├── eht/           # EHT model (main model)
│   │   ├── params/    # Parameter types, schema, defaults
│   │   ├── simulation/# Init, step, forces, constraints, events
│   │   ├── ui/        # Model-specific React parameter panels
│   │   ├── renderer.ts# Pixi.js rendering logic
│   │   ├── statistics.ts # Stat computation for this model
│   │   └── index.ts   # Model registration
│   └── toy/           # Simple example model
├── components/        # Shared UI components
│   ├── ui/            # shadcn/ui base components
│   ├── layout/        # App layout, header, model selector
│   ├── params/        # Generic parameter input components
│   ├── simulation/    # Canvas, controls, stats display
│   └── batch/         # Batch configuration, results, plots
├── rendering/         # Shared rendering infrastructure (Pixi.js wrapper)
├── hooks/             # React hooks (useSimulation, useRenderer)
├── contexts/          # React contexts (ModelContext, ThemeContext)
├── docs/              # Markdown documentation with KaTeX math
└── pages/             # Top-level route components

cli/                   # Headless CLI interface
├── commands/          # run, batch, stats commands
├── utils/             # CLI-specific utilities
└── index.ts           # Entry point (tsx)
```

### How Models Work

1. **Registration**: Models register themselves in [src/models/index.ts](src/models/index.ts) by importing and calling `modelRegistry.register()`
2. **Interface**: Each model implements `SimulationModel<Params, State>` from [src/core/interfaces/model.ts](src/core/interfaces/model.ts)
3. **Required Methods**:
   - `init(params, seed)` - Create initial state
   - `step(state, dt, params)` - Advance simulation one timestep
   - `getSnapshot(state)` - Serialize state for CSV export
   - `loadSnapshot(rows, params)` - Deserialize from CSV
   - `computeStats(state, params)` - Calculate statistics
4. **Optional Components**:
   - `ui` - Custom React parameter panels (ParametersTab, CellTypesTab, SimulationTab)
   - `renderer` - Pixi.js rendering logic
   - `statistics` - Available statistics definitions
   - `batchParameters` - Parameters available for batch sweeps
   - `renderOptions` - Model-specific visualization toggles

### Key Files

- [src/core/registry/registry.ts](src/core/registry/registry.ts) - Singleton model registry with version management
- [src/core/simulation/engine.ts](src/core/simulation/engine.ts) - Model-agnostic simulation loop
- [src/core/batch/runner.ts](src/core/batch/runner.ts) - Batch simulation with worker pool support
- [src/models/eht/index.ts](src/models/eht/index.ts) - EHT model definition and registration
- [src/models/eht/simulation/step.ts](src/models/eht/simulation/step.ts) - EHT timestep (forces, constraints, events)
- [src/hooks/useSimulation.ts](src/hooks/useSimulation.ts) - React hook for single simulation state management

### Batch Simulations

Batch runs use Web Workers for parallel execution. The worker pool ([src/core/batch/workerPool.ts](src/core/batch/workerPool.ts)) distributes parameter configs across workers. Each worker imports the model registry ([src/models/index.worker.ts](src/models/index.worker.ts)) and runs simulations independently.

### Documentation Pages

Documentation files live in [src/docs/](src/docs/) as markdown with KaTeX math support. Each doc page must use **static imports** (no dynamic loading):

```tsx
// Correct: static import
import content from '../../docs/EHT/model.md?raw';
export function EHTModelDoc() {
  return <DocPage content={content} />;
}
```

Routes: `/docs/eht/model`, `/docs/eht/statistics`

## Development Notes

- **In-place state mutation**: For performance, the EHT model mutates state in-place during `step()` rather than creating new objects
- **Deterministic RNG**: Use `SeededRandom` from [src/core/math/random.ts](src/core/math/random.ts) for reproducible simulations
- **Parameter validation**: Models use Zod schemas for runtime parameter validation
- **TOML format**: Parameters can be imported/exported as TOML files
- **URL state**: Parameters can be encoded in URL for sharing
- **CSV snapshots**: Simulations can be saved/loaded as CSV files with metadata
