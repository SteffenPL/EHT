# EHT Simulator

Browser-based multi-model cell simulation platform for EHT research.

## Tech Stack

React 18 + TypeScript, Vite, Pixi.js, shadcn/ui + Tailwind, TOML params, CSV export

## Architecture

```
src/
├── core/          # Shared: registry, math, batch runner (minimal)
├── models/        # Self-contained models (eht/, toy/), each with own:
│   └── <model>/   #   - types, params, simulation, statistics, rendering
├── components/    # UI: layout, params, simulation, batch, plots
└── hooks/         # React hooks
```

## Key Principles

1. **Models are self-contained** - Each model in `src/models/<name>/` has its own types, params, simulation logic, statistics, and rendering
2. **Minimal shared code** - Only registry, math utilities, and batch infrastructure shared between models
3. **Core and webpage has no rendering deps** - Can run headless


## Workflow

1. Select model
2. Load/edit parameters
3. View single simulation
4. Define parameter ranges
5. Run batch simulation (or load)
6. Save batch results
7. Compute statistics
8. Export statistics
9. View plots

## CLI Interface

Headless simulation via `npm run cli`:

```bash
npm run cli -- run                              # Single sim with defaults
npm run cli -- run -c params.toml -o out.csv   # With config and output
npm run cli -- batch -c batch.toml --stats all # Batch with all stats
npm run cli -- stats                            # List available statistics
```

## Documentation Pages

Documentation is in `src/docs/` as markdown files with KaTeX math. Each doc page must be **fully static** - use direct imports, no dynamic loading:

```tsx
// Static page component (correct)
import content from '../../docs/EHT/model.md?raw';
export function EHTModelDoc() {
  return <DocPage content={content} />;
}
```

Routes: `/docs/eht/model`, `/docs/eht/statistics`

## Development

```bash
npm run dev    # Dev server (check output for port)
npm run build  # Production build
```
