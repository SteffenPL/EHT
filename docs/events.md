# Cell Event System Comparison

Comparison between the Julia reference implementation (`epithelium_simulation/src/cell_events/`)
and the TypeScript browser implementation (`EHT/src/models/eht/simulation/events.ts`).

---

## Architecture Overview

### Julia (`epithelium_simulation`)

- **Two abstract event types** inheriting from `AbstractCellEvent`:
  - `CellEvent` — modifies a single numeric cell parameter
  - `SpecialCellEvent` — calls an arbitrary Julia function
- Events are stored **per cell type** (`EpiCellType.cell_events` and `.special_cell_events`).
- The main simulation loop iterates all cells and all events each timestep, calling `update!`.
- Dynamic dispatch via Julia's multiple dispatch (`apply!` has separate methods for each event type).

### TypeScript (`EHT`)

- **Two co-existing systems**:
  - **Legacy v1.0.0**: Five hardcoded event types (`time_A`, `time_B`, `time_S`, `time_P`, `time_AC`) with trigger times stored directly on each `CellState`.
  - **New v1.1.0** (`events_v2`): Flexible `EventDefinition[]` array per cell type, with per-cell tracking via `event_states: Record<string, CellEventState>`.
- Auto-detection at runtime: if any cell type has `events_v2`, the v1.1.0 system is used for all cells; otherwise legacy.
- `processAllEvents()` dispatches to `processV2Events()` or `processEMTEvents()`.

---

## Event Types

### Parameter Change Events

| Feature | Julia `CellEvent` | TS v1.0.0 (legacy) | TS v1.1.0 `parameter_change` |
|---|---|---|---|
| Target parameter | Any `EpiCell` field via `:symbol` | Hardcoded (stiffness bundled with structural events) | String path, switch-case lookup over ~9 fields |
| Value formula | `abs_value + factor * old_value` | Fixed multiplier (e.g. `*= 0.1`) | math.js expression: `formula(old_value, t, dt, period)` |
| Extensibility | Fully dynamic (any field name) | Not extensible | Limited to switch-case allowlist |

**Julia** uses a simple linear formula (`abs_value + factor * old_value`) which is efficient but limited.
**TS v1.1.0** uses math.js `evaluate()` which is more expressive (arbitrary expressions) but slower.
**TS v1.0.0** hardcodes the parameter changes inside the structural event handlers (e.g. `processLoseApicalAdhesion` sets `stiffness_nuclei_apical *= 0.1`).

### Special / Structural Events

| Event | Julia function | TS v1.0.0 | TS v1.1.0 |
|---|---|---|---|
| Lose apical adhesion | `loss_apical_connection` | `processLoseApicalAdhesion` | `processLoseApicalAdhesion` |
| Lose basal adhesion | `loss_basal_connection` | `processLoseBasalAdhesion` | `processLoseBasalAdhesion` |
| Lose apical interface (cross-type) | `local_loss_apical_connection` / `recovering_local_loss_apical_connection` | `processLoseApicalInterface` | `processLoseApicalInterface` |
| Start running | (via `CellEvent` on `running_mode`) | `processStartRunning` | `processStartRunning` |
| Cell division | `divide_cell` | Not implemented | Not implemented |
| Cell cycle reset | `reset_cell_cycle` | Not implemented | Not implemented |
| Lose straightness | (via `CellEvent` on `stiffness_straightness`) | `processLoseStraightness` | (via `parameter_change`) |

**Key difference**: In Julia, `SpecialCellEvent` can wrap *any* function. In TS v1.1.0, there are exactly 4 hardcoded special event names registered in `specialEventHandlers`.

---

## Timing and Triggering

### Julia

```
cell_ref_time   →  ReferenceTimePoint enum: Cell_Birth | Cell_G2_Start | Cell_Mitosis_Start | Cell_Division
cell_time_start →  offset from reference time (cell-relative)
sim_time_start  →  earliest simulation time (global)
sim_time_end    →  latest simulation time (global)
```

- `get_relative_time()` computes cell age relative to a cell cycle phase
- `is_starting()` checks: `sim_time_start <= t < sim_time_start + dt` AND `cell_time_start <= cell_age`,
  OR `sim_time_start < t < sim_time_end` AND `cell_time_start <= cell_age < cell_time_start + dt`
- This means events fire once: either when the simulation time window opens, or when the cell reaches the required age within the window.

### TypeScript v1.0.0

```
time_X_start, time_X_end  →  range for sampling trigger_time at cell creation
trigger check:  t <= trigger_time && t + dt > trigger_time
```

- Trigger times are sampled uniformly from `[start, end]` at cell creation via `SeededRandom`.
- Heterogeneous EMT: 30% probability of skipping each event (`time = Infinity`).
- Simple threshold crossing check.

### TypeScript v1.1.0

```
start, end       →  range for independent events; dependent start is time(prereq)
probability      →  chance event participates; conditional when prereq is set
period           →  0 = one-shot, >0 = repeat every `period` units
prereq           →  event ID that controls dependent scheduling
cell_cycle_phase →  required cell cycle phase
```

- Independent one-shot events sample `trigger_time` from `[start, end]` with probability gating.
- Dependent events wait for their prerequisite to participate and fire, then sample from the prerequisite fire time to their own `end`.
- `shouldEventFire()` checks: cell cycle phase, finite or pending trigger state, dependency fire state, then time crossing or periodic cadence.
- Periodic events re-fire when `timeSinceLastFire >= period`.

### Comparison Table

| Feature | Julia | TS v1.0.0 | TS v1.1.0 |
|---|---|---|---|
| Time reference point | Cell cycle phase (birth/G2/mitosis/division) | Absolute sim time | Cell cycle phase + absolute time |
| Simulation time window | `[sim_time_start, sim_time_end)` | N/A (single trigger) | N/A (single trigger + period) |
| Cell-relative timing | `cell_time_start` offset from ref point | No (absolute times) | `cell_cycle_phase` requirement |
| Stochastic trigger | No (deterministic) | Yes (uniform sampling + 30% skip) | Yes (uniform sampling + probability) |
| Periodic events | No | No | Yes (`period > 0`) |
| Dependencies | No | No | Yes (`prereq` controls downstream timing) |
| Per-cell state tracking | No (stateless, re-check each step) | Implicit (time fields on cell) | Explicit (`CellEventState` with `has_fired`, `fire_count`, etc.) |

---

## Link / Graph Restructuring

Both implementations handle apical and basal link removal similarly:

### Apical Adhesion Loss

**Julia** (`loss_apical_connection`):
1. Find all edges containing cell `i` via `findall`
2. Assert at most 2 neighbors (1D chain topology)
3. If 2 neighbors: reconnect them, **sum rest lengths** (`rest_length = rl1 + rl2`)
4. If 1 neighbor: just remove the edge
5. Also modifies `apical_cytos_strain = -1` and `stiffness_nuclei_apical *= 0.1`

**TypeScript** (`processLoseApicalAdhesion`):
1. Find all links with `l === cellIndex` or `r === cellIndex`
2. If 2 links: remove both, reconnect neighbors, **set rest length = current distance** (`Vector2.dist`)
3. If 1 link: just remove it
4. Also sets `stiffness_nuclei_apical *= 0.1`

**Difference**: Julia sums the old rest lengths; TypeScript uses the current geometric distance. This produces different mechanical behavior after reconnection.

### Basal Adhesion Loss

**Julia** (`loss_basal_connection`):
- Same pattern as apical, but on `basalcons`
- Sets `basal_cytos_strain = -1` and `stiffness_nuclei_basal *= 0.1`

**TypeScript** (`processLoseBasalAdhesion`):
- Same pattern as apical, but on `ba_links`
- Also sets `stiffness_nuclei_basal *= 0.1`
- No rest length tracking for basal links in TS (basal links have no `rl` field)

### Lose Apical Interface (Cross-Type Link Cutting)

**Julia** has two variants:
- `local_loss_apical_connection`: removes all cross-type apical links (no reconnection)
- `recovering_local_loss_apical_connection`: removes cross-type links and reconnects the lose ends of the non-constricting type, using current distance as rest length (negative sign convention)

**TypeScript** (`processLoseApicalInterface`):
- Removes all "mixed" links (one cell of the triggering type, one not)
- Walks the original adjacency graph to find non-interface neighbors across the triggering cluster
- Reconnects them with rest length = current distance
- Processed once per cell type (batch operation), not per cell

---

## Running State

**Julia**: Running mode is a simple parameter (`running_mode::Int64`), set via `CellEvent`. No special geometric checks in the event system (handled elsewhere in forces).

**TypeScript**: `updateRunningState()` performs a geometry-based check:
1. Projects cell's basal point onto the basal curve
2. Computes signed distance in normal direction
3. Sets `is_running = true` if distance < -2.0 AND running_mode >= 3 (or mode >= 1 with positive signed distance)
4. Called every timestep for every cell

---

## Cell Division and Cycle

**Julia**: Full cell division support:
- `divide_cell`: creates a daughter cell, copies cytoskeleton state, inserts into link graphs, re-initializes events for both children
- `reset_cell_cycle`: resets cell age, re-samples division time, re-initializes all events
- Both properly re-call `init_cell_event!` for all events on the new/reset cell

**TypeScript**: No cell division in the event system. `copyEventStates()` exists for copying event state to daughter cells, but the division mechanics are not implemented.

---

## Initialization

**Julia**: `init_cell_event!` checks if an event is "active" at the current time (using `is_active`) and applies it immediately. This handles cells created mid-simulation that should already have certain events applied.

**TypeScript v1.0.0**: Trigger times sampled at cell creation in `createCell()`. No retroactive application.

**TypeScript v1.1.0**: `initializeEventStates()` samples trigger times and creates tracking state. No retroactive application of already-passed events.

---

## Summary of Key Differences

1. **Extensibility**: Julia events can target any cell field dynamically; TS uses a fixed allowlist.
2. **Special events**: Julia allows arbitrary functions; TS has 4 hardcoded special event types.
3. **Rest length on reconnection**: Julia sums old rest lengths; TS uses current geometric distance.
4. **Cell division**: Fully implemented in Julia; absent in TS.
5. **Periodic events**: Only in TS v1.1.0.
6. **Prerequisites**: Only in TS v1.1.0.
7. **Probability gating**: TS has per-event probability; Julia has no stochastic event activation. For dependent TS events, probability is conditional on the prerequisite event participating.
8. **Cell cycle reference**: Julia has 4 reference points (birth/G2/mitosis/division); TS v1.1.0 has phase requirements but not offset-based timing.
9. **Stateful tracking**: TS v1.1.0 tracks `has_fired`, `fire_count`, `last_fire_time`, and dependency-pending state; Julia events are stateless (re-evaluated each step).
10. **Running state**: TS includes geometry-based running checks in the event loop; Julia handles running elsewhere.
