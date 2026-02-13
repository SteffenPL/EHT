# Event System Comparison: Julia vs TypeScript

This document compares the cell event systems between the original Julia implementation and the current TypeScript implementation of the EHT model.

## Overview

Both implementations provide event systems for modeling time-dependent cell behavior changes (EMT events, cell division, parameter modifications), but they differ significantly in architecture and capabilities.

---

## Julia Implementation

### Architecture

The Julia version implements a flexible two-tier event system:

#### Event Types

1. **`CellEvent`** - Direct parameter modifications
   ```julia
   new_value = abs_value + factor * old_value
   ```
   - Can target any field in `EpiCell` struct
   - Simple linear transformation of existing values

2. **`SpecialCellEvent`** - Custom function execution
   - Executes arbitrary Julia functions
   - Used for complex structural changes (link removal, cell division)

#### Reference Time Points

Events can be scheduled relative to four different cell cycle landmarks:

- `Cell_Birth` - when cell was created
- `Cell_G2_Start` - beginning of G2 phase
- `Cell_Mitosis_Start` - beginning of mitosis
- `Cell_Division` - when cell divides

Each event has:
- `cell_ref_time::ReferenceTimePoint` - which landmark to use
- `cell_time_start::Float64` - delay after reference time
- `sim_time_start::Float64` - earliest absolute simulation time
- `sim_time_end::Float64` - latest absolute simulation time

This allows precise timing relative to cell cycle progression.

---

## TypeScript Implementation

### Architecture

The TypeScript version has evolved through two generations:

#### Legacy v1.0.0 System

Fixed event times stored per cell:
- `time_A` → lose apical adhesion
- `time_B` → lose basal adhesion
- `time_S` → lose straightness
- `time_AC` → apical constriction
- `time_P` → start running

Simple threshold-based triggering when simulation time crosses event time.

#### New v1.1.0 System

More sophisticated event orchestration:

1. **Parameter Change Events**
   ```typescript
   formula: string  // math.js expression
   // Available variables: old_value, t, dt, period
   ```
   - Flexible formula evaluation using math.js
   - Can create complex time-dependent behaviors

2. **Special Events**
   - Pre-registered handlers: `lose_apical_adhesion`, `lose_basal_adhesion`, `apical_constriction`, `start_running`
   - Type-safe event dispatch

3. **Event Features**
   - **Cell cycle phase requirements** - Events only fire in specific phases (G1, G2, Mitosis)
   - **Prerequisites** - Events can depend on other events firing first
   - **Periodic events** - Events can repeat at regular intervals
   - **Event state tracking** - Tracks `has_fired`, `fire_count`, `last_fire_time`

---

## Special Events Inventory

### Julia Special Events

#### 1. `loss_apical_connection`
**Location:** `loss_apical_basal_connection.jl:1-41`

```julia
function loss_apical_connection(state, p, i)
```

- Sets `apical_cytos_strain = -1.0` (marks cytoskeleton as degenerated)
- Reduces `stiffness_nuclei_apical *= 0.1`
- Removes apical links involving cell `i`
- Reconnects neighbors:
  - If cell has 2 neighbors (interior): connect them, add rest lengths
  - If cell has 1 neighbor (boundary): just remove link

#### 2. `loss_basal_connection`
**Location:** `loss_apical_basal_connection.jl:44-77`

```julia
function loss_basal_connection(state, p, i)
```

- Sets `basal_cytos_strain = -1.0`
- Reduces `stiffness_nuclei_basal *= 0.1`
- Removes basal links involving cell `i`
- Reconnects neighbors (same logic as apical)

#### 3. `local_loss_apical_connection` ⚠️ GLOBAL EVENT
**Location:** `loss_apical_basal_connection.jl:80-89`

```julia
function local_loss_apical_connection(state, p, i)
```

**Important:** Despite taking cell index `i`, this is a **global event** that affects the entire simulation.

- Iterates through ALL apical connections
- Removes connections where `state[a].prototype_idx ≠ state[b].prototype_idx`
- Effect: Separates different cell types by breaking their adhesions
- Similar in spirit to TypeScript's `apical_constriction` but type-agnostic

#### 4. `recovering_local_loss_apical_connection` ⚠️ GLOBAL EVENT
**Location:** `loss_apical_basal_connection.jl:91-122`

```julia
function recovering_local_loss_apical_connection(state, p, i)
```

Enhanced version of `local_loss_apical_connection`:

- Removes connections between different cell types
- Tracks the "loose ends" created by removal
- **Reconnects the loose ends** if both exist
- Creates new connection with `rest_length = -abs(Xa - Xb)` (negative = repulsive?)

Use case: Temporarily separate cell types, then pull them back together.

#### 5. `divide_cell`
**Location:** `cell_division.jl:1-97`

```julia
function divide_cell(state, p, i)
```

Handles cell division with sophisticated connection management:

1. **Preserve properties:**
   - `apical_cytos_rest_length`
   - `basal_cytos_rest_length`
   - `has_apical_cytos`
   - `has_basal_cytos`

2. **Create daughter cells:**
   - With probability `prob_out_div`: only 1 daughter (cell exits division)
   - Otherwise: 2 daughters

3. **Redistribute connections:**
   - Updates apical links: `i => right` becomes `i => right` and `j => right`
   - Updates basal links similarly
   - Adds new link between daughters: `add_edge!(apicalcons, i, j)`

4. **Position daughters:**
   - Offset by `±0.05 * R_soft * random_direction`

5. **Re-initialize events:**
   - Calls `init_cell_event!` for all events on both daughters

#### 6. `reset_cell_cycle`
**Location:** `reset_cell_cycle.jl:1-26`

```julia
function reset_cell_cycle(s, p, i)
```

Resets cell cycle without division:

- Creates new cell copying "start times" from old cell
- Resets `age = 0.0`
- Updates `birth_time = s.t`
- Randomizes new `division_time` from `Uniform(life_span.min, life_span.max)`
- Re-initializes all cell events

Use case: Modeling cell cycle arrest and re-entry, or cell reprogramming.

### TypeScript Special Events

#### 1. `processLoseApicalAdhesion` (v1.0.0)
**Location:** `events.ts:20-61`

```typescript
function processLoseApicalAdhesion(state, cellIndex)
```

- Sets `has_A = false`
- Reduces `stiffness_nuclei_apical *= 0.1`
- Removes apical links and reconnects neighbors

**Difference from Julia:** No `apical_cytos_strain` tracking.

#### 2. `processLoseBasalAdhesion` (v1.0.0)
**Location:** `events.ts:67-99`

```typescript
function processLoseBasalAdhesion(state, cellIndex)
```

- Sets `has_B = false`
- Reduces `stiffness_nuclei_basal *= 0.1`
- Removes basal links and reconnects neighbors

**Difference from Julia:** No `basal_cytos_strain` tracking.

#### 3. `processLoseStraightness`
**Location:** `events.ts:104-110`

```typescript
function processLoseStraightness(state, cellIndex)
```

- Sets `stiffness_straightness = 1.0`

**Not present in Julia.**

#### 4. `processStartRunning`
**Location:** `events.ts:115-121`

```typescript
function processStartRunning(state, cellIndex)
```

- Sets `running_mode = 3`
- Enables polarized cell migration behavior

**Not present in Julia.**

#### 5. `processApicalConstriction` ⚠️ GLOBAL EVENT
**Location:** `events.ts:137-224`

```typescript
function processApicalConstriction(state, cellIndex)
```

Complex type-specific global event:

1. Identifies the constricting cell type from `cellIndex`
2. Removes all "mixed" links (one cell constricting, one not)
3. Builds adjacency maps before/after removal
4. Reconnects non-constricting cells across constricting gaps
5. Sets rest length to current distance

**Key difference from Julia:** Type-specific (only affects cells of one type), while Julia's `local_loss_apical_connection` is type-agnostic.

#### 6. `updateRunningState`
**Location:** `events.ts:230-258`

```typescript
function updateRunningState(cell, state)
```

Determines if cell is in running state:

- Requires `has_B = false` (detached from basal membrane)
- Checks distance from basal curve in opposite normal direction
- Requires `signed_distance < -2.0` (cell far enough away)
- Checks `running_mode` conditions

**Not present in Julia.**

---

## Feature Comparison Matrix

| Feature | Julia | TypeScript |
|---------|-------|-----------|
| **Event timing** | 4 reference time points (Birth, G2, Mitosis, Division) | Single reference (trigger_time) |
| **Cell cycle integration** | Reference time points | Phase requirements (G1/G2/Mitosis) |
| **Parameter modification** | `abs_value + factor * old_value` | Math.js formulas (more flexible) |
| **Event dependencies** | ❌ No | ✅ Prerequisites |
| **Periodic events** | ❌ No | ✅ Yes (period parameter) |
| **Event state tracking** | Implicit | ✅ Explicit (has_fired, fire_count) |
| **Global events** | ✅ Yes (local_loss_apical_connection) | ✅ Limited (apical_constriction) |
| **Cytoskeleton degeneration** | ✅ Yes (strain = -1) | ❌ No |
| **Cell division event** | ✅ Yes | ❌ No (handled elsewhere) |
| **Cell cycle reset** | ✅ Yes | ❌ No |
| **Straightness loss** | ❌ No | ✅ Yes |
| **Running/migration** | ❌ No | ✅ Yes |
| **Type-specific events** | Via parameter conditions | ✅ Native (apical_constriction) |

---

## Missing Features Analysis

### Julia Features Not in TypeScript

1. **❌ Flexible Reference Time Points**
   - Julia can schedule events relative to G2 start, mitosis start, or division
   - TypeScript only supports scheduling relative to cell birth
   - **Impact:** Cannot model "divide 2 hours after entering G2" behaviors

2. **❌ Cytoskeleton Strain Tracking**
   - Julia tracks degeneration via `apical_cytos_strain = -1`
   - Could enable gradual weakening or visual indicators
   - **Impact:** Loss of fidelity in cytoskeleton state representation

3. **❌ Global Type-Agnostic Connection Removal**
   - Julia's `local_loss_apical_connection` removes ALL cross-type connections
   - TypeScript's `apical_constriction` is type-specific
   - **Impact:** Cannot model global tissue reorganization events

4. **❌ Recovering Connection Event**
   - Julia's `recovering_local_loss_apical_connection` reconnects after separation
   - Could model transient separation followed by re-adhesion
   - **Impact:** Cannot model certain dynamic tissue behaviors

5. **❌ Cell Cycle Reset Event**
   - Julia's `reset_cell_cycle` allows cells to restart without division
   - Models cell cycle arrest/re-entry or reprogramming
   - **Impact:** Cannot model quiescence, senescence, or cell reprogramming

6. **❌ Direct Factor-Based Modification**
   - Julia's `abs_value + factor * old_value` is simple and predictable
   - Useful for multiplicative changes (e.g., "reduce to 10% of current")
   - **Impact:** Must express in math.js formulas (more verbose)

### TypeScript Features Not in Julia

1. **❌ Lose Straightness Event**
   - Modifies `stiffness_straightness` constraint
   - Models loss of cell polarity/elongation
   - **Impact:** Julia cannot model polarity loss separately from other events

2. **❌ Running Mode / Migration State**
   - Complex logic for polarized cell migration
   - Checks distance from basal membrane
   - **Impact:** Julia cannot model detached cell migration behavior

3. **❌ Event Prerequisites (Dependencies)**
   - TypeScript events can depend on other events firing first
   - Enables event chains: "lose basal THEN start running"
   - **Impact:** Julia must manually coordinate events via timing

4. **❌ Periodic Events**
   - TypeScript events can repeat at regular intervals
   - Useful for oscillatory behaviors or repeated perturbations
   - **Impact:** Julia would need manual periodic scheduling

5. **❌ Cell Cycle Phase Requirements**
   - TypeScript can gate events to specific phases (G1, G2, Mitosis)
   - Ensures events only fire in biologically appropriate contexts
   - **Impact:** Julia must use reference time points + offsets

6. **❌ Math.js Formula Flexibility**
   - TypeScript formulas can access `t`, `dt`, `period`, `old_value`
   - Enables complex time-dependent behaviors
   - **Impact:** Julia has simpler but less flexible parameter changes

---

## Architectural Observations

### Julia Strengths

1. **Biological Fidelity**
   - Reference time points map directly to cell cycle biology
   - Cytoskeleton strain tracking represents physical state
   - Division probability (`prob_out_div`) models asymmetric division

2. **Simplicity**
   - Direct parameter modification via `abs_value + factor`
   - Explicit special event functions
   - No complex dependency graphs

3. **Flexibility**
   - Special events can execute arbitrary code
   - Global events can modify entire simulation state
   - Event application logic is transparent

### TypeScript Strengths

1. **Orchestration**
   - Prerequisites enable event chains
   - Phase requirements ensure biological validity
   - Periodic events enable oscillatory behaviors

2. **Expressiveness**
   - Math.js formulas provide computational flexibility
   - Event state tracking enables debugging
   - Type-safe event dispatch

3. **Safety**
   - Events are sandboxed (cannot execute arbitrary code)
   - Pre-registered special event handlers
   - Validation via event state checks

---

## Recommendations

### Short-term Improvements

1. **Add cytoskeleton strain tracking to TypeScript**
   ```typescript
   cell.apical_cytos_strain = -1.0;
   cell.basal_cytos_strain = -1.0;
   ```
   - Improves biological fidelity
   - Enables visual representation of degeneration

2. **Implement cell cycle reset event**
   - Copy Julia's `reset_cell_cycle` logic
   - Useful for modeling quiescence, arrest, reprogramming

3. **Add type-agnostic global event**
   - Generalize `apical_constriction` to work on any type
   - Or add new `global_loss_apical_connection` event

### Long-term Enhancements

1. **Add reference time point support**
   - Extend event system with `cell_ref_time` options
   - Map to cell cycle phases (G2_start, mitosis_start, division)

2. **Improve division handling**
   - Currently handled outside event system
   - Consider integrating as a special event like Julia

3. **Add recovering connection event**
   - Implement Julia's reconnection logic
   - Enables modeling of transient separation

4. **Consider hybrid approach**
   - Keep TypeScript's prerequisites and phases
   - Add Julia's reference time points
   - Support both formula and factor-based modifications

---

## Migration Path

To port Julia behaviors to TypeScript:

### Easy (1-2 hours each)

- ✅ Straightness loss - already implemented
- ✅ Running mode - already implemented
- ⚠️ Cytoskeleton strain tracking - add two float fields

### Medium (4-8 hours each)

- ⚠️ Cell cycle reset event - port logic from Julia
- ⚠️ Type-agnostic global event - generalize apical_constriction
- ⚠️ Recovering connection event - port reconnection logic

### Complex (1-2 days each)

- ⚠️ Reference time point system - architectural change to event timing
- ⚠️ Division as event - integrate division into event system
- ⚠️ Factor-based modifications - add alongside formula system

---

## Conclusion

Both implementations have unique strengths:

- **Julia** excels at biological fidelity and cell cycle integration
- **TypeScript** excels at event orchestration and safety

The ideal system would combine:
- Julia's reference time points and strain tracking
- TypeScript's prerequisites, phases, and formulas

This would provide both biological accuracy and expressive power for modeling complex cell behaviors.

---

## References

- Julia implementation: `/home/steffenpl/workspace/epithelium_simulation/src/cell_events/`
- TypeScript implementation: `/home/steffenpl/workspace/EHT/src/models/eht/simulation/events.ts`
- EHT model documentation: `/home/steffenpl/workspace/EHT/src/docs/EHT/model.md`
