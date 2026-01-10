# EHT Simulator - Code Review

**Date:** 2026-01-10
**Reviewer:** Claude Code
**Scope:** Full codebase review of `src/` and `cli/` directories

---

## Executive Summary

The EHT Simulator follows a solid multi-model architecture as documented in CLAUDE.md. The review identified several issues ranging from critical reproducibility bugs to minor cleanup opportunities. **Most high-priority issues have been fixed** as part of this review.

---

## Fixes Applied

The following issues were identified and fixed during this review:

| Issue | Status | Files Modified |
|-------|--------|----------------|
| Toy model unseeded RNG | **FIXED** | `src/models/toy/index.ts`, `src/models/toy/simulation/simulation.ts`, `src/models/index.worker.ts` |
| RNG state not persisted | **FIXED** | Both EHT and Toy models now store `rngSeed` in state |
| Import source inconsistency | **FIXED** | `src/models/toy/index.ts` now imports from `@/core/interfaces/model` |
| Legacy unused hooks | **FIXED** | Removed from `src/core/interfaces/model.ts` |
| `any` types in renderer | **FIXED** | `src/core/interfaces/renderer.ts` now uses `Graphics` from pixi.js |
| `any` types in model interface | **FIXED** | Added `ZodType<Params>` for schema, `SnapshotRow` type for serialization |
| Worker `null as any` | **FIXED** | Changed to `null!` and `undefined` |
| Empty directories | **FIXED** | Removed `src/core/model/`, `src/capture/`, `src/components/export/` |
| CLI test delimiter mismatch | **FIXED** | Updated tests to expect TSV format |

---

## Remaining Issues

### 1. Architecture Issues

#### 1.1 Code Duplication in Worker

**Location:** `src/models/index.worker.ts`

Model definitions are duplicated (~287 lines for Toy model alone) to avoid importing UI/renderer code in the worker context.

**Recommendation:** Refactor models to separate core logic from UI:
```
models/eht/
├── core.ts      # Pure simulation logic
├── ui.ts        # UI components
└── index.ts     # Conditional exports
```

---

#### 1.2 Parameter System Inconsistency

**Location:** `src/core/params/merge.ts`

Uses old EHT-specific structure (`cell_types`, `cell_prop`) that conflicts with the modern schema-based approach.

**Recommendation:** Migrate to generic parameter merging using Zod schemas.

---

### 2. TODO/FIXME Items Found

| File | Line | Note |
|------|------|------|
| `src/core/simulation/engine.ts` | 27 | `TODO: BatchSnapshot type is currently EHT specific probably?` |
| `src/core/math/geometry.test.ts` | 79 | `TODO: These tests reveal convergence issues in ellipseThetaFromArcLength` |
| `src/core/math/geometry.test.ts` | 270, 335, 346 | Multiple convergence issues in ellipse calculations |
| `src/models/eht/simulation/constraints.ts` | 93 | `TODO: Re-enable basal ordering correction when needed` |

---

### 3. Testing Gaps

#### Current Coverage
- Math utilities (vector, geometry) - Good
- EHT statistics - Good
- CLI basic tests - Good

#### Missing Tests
- Toy model (simulation and statistics)
- UI components
- Batch runner and worker pool
- Parameter merging
- Integration tests for full workflows

---

### 4. Large Components Needing Refactor

| Component | Lines | Notes |
|-----------|-------|-------|
| `CellTypesTab.tsx` | ~1000 | Large form, consider splitting by section |
| `BatchTab.tsx` | ~695 | Complex batch UI, could extract sub-components |

---

### 5. Code Pattern Inconsistencies

#### 5.1 Deep Copy Approaches

Mixed usage of:
```typescript
// Method 1: JSON parse/stringify
const clone = JSON.parse(JSON.stringify(obj));

// Method 2: lodash cloneDeep
import { cloneDeep } from 'lodash-es';
```

**Recommendation:** Standardize on one approach (consider `structuredClone` for modern environments).

#### 5.2 Statistics Definition Styles

- **EHT:** Dynamic generation via `generateEHTStatistics(params)`
- **Toy:** Static array `TOY_STATISTICS`

This inconsistency makes generic batch processing harder.

---

## Recommendations Summary

### Medium Priority (Remaining)
1. Consolidate worker model definitions to avoid duplication
2. Reconcile parameter merging with schema-based approach
3. Add tests for Toy model and batch runner

### Low Priority
4. Split large UI components (CellTypesTab, BatchTab)
5. Standardize deep copy approach
6. Document RNG determinism expectations

---

## Positive Observations

- Clean separation between models (EHT vs Toy)
- Well-structured core utilities (math, registry)
- Comprehensive EHT model implementation
- Good use of Zod for parameter validation
- CLI interface follows documented patterns
- shadcn/ui provides consistent component styling
- **All tests passing after fixes**
- **Build succeeds without type errors**

---

## Appendix: File Counts

```
src/core/       - 25 files
src/models/     - 28 files
src/components/ - 45 files
src/hooks/      - 8 files
src/rendering/  - 4 files
src/contexts/   - 3 files
cli/            - 7 files
```

**Total:** ~120 TypeScript/TSX source files

---

## Changes Summary

Files modified during this review:
- `src/core/interfaces/model.ts` - Removed legacy hooks, improved types
- `src/core/interfaces/renderer.ts` - Added PIXI.Graphics type
- `src/models/eht/types.ts` - Added `rngSeed` to state
- `src/models/eht/index.ts` - Use stored rngSeed
- `src/models/eht/output.ts` - Handle rngSeed in loadSnapshot
- `src/models/eht/statistics.test.ts` - Added rngSeed to test state
- `src/models/toy/index.ts` - Fixed RNG, standardized import
- `src/models/toy/simulation/types.ts` - Added stepCount, rngSeed to state
- `src/models/toy/simulation/simulation.ts` - Handle new state fields
- `src/models/index.worker.ts` - Applied same fixes as main models
- `cli/cli.test.ts` - Fixed TSV delimiter expectations
