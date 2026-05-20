# Formula Editor Guide

The EHT simulator supports math.js formulas for time-dependent parameters, cell-type parameters, event formulas, and external force formulas.

Use formulas when a value should change over simulation time or depend on a cell's spatial context. Use constants when several formulas should share one named value.

Unless otherwise noted, variable values are in:
- **Hours (`h`)** for simulation-time arguments.
- **Same units as the target field** for parameter modifiers (`old_value`, `init_value`, most formula outputs).
- **Simulation coordinates** for spatial terms (`x`, `y`, `delta`, `r`, `N`, `T`).

## Common Variables

| Variable | Units | Meaning | Example |
|---|---|---|---|
| `t` | h | Current simulation time | `sin(t)` |
| `dt` | h | Current timestep size | `old_value + 0.01 * dt` |
| `old_value` | same as target | Value before the formula is applied | `old_value * 0.5` |
| `init_value` | same as target | Initial value captured when the formula was created | `init_value + 0.2 * sin(t)` |

## Helper Functions

| Function | Units | Meaning | Example |
|---|---|---|---|
| `step(t, switch=5, before=0, after=1)` | h for `switch`; before/after in target units | Jump from one value to another | `step(t, switch=5, before=0, after=1)` |
| `ramp(t, start=0, stop=10, from=1, to=2)` | h for `start/stop`; output in target units | Linear transition | `ramp(t, start=0, stop=10, from=1, to=2)` |
| `triangle(t, period=10, min=1, max=2)` | h for `period`; output in target units | Periodic triangle wave | `triangle(t, period=10, min=1, max=2)` |
| `pulse(t, start=2, stop=5, off=0, on=1)` | h for start/stop; off/on in target units | On during a time window | `pulse(t, start=2, stop=5, off=0, on=1)` |
| `smoothstep(t, start=0, stop=10, from=1, to=2)` | h for `start/stop`; output in target units | Smooth transition | `smoothstep(t, start=0, stop=10, from=1, to=2)` |

## Cell Spatial Variables

Cell-type formulas and external-force formulas can use spatial variables:

| Variable | Units | Meaning |
|---|---|---|
| `alpha` | rad | Polar angle of the nucleus around the geometry center. Bottom is `0`, right is `+pi/2`, left is `-pi/2`. |
| `r` | R_soft | Distance from the geometry center to the nucleus, relative to `R_soft` |
| `delta` | R_soft | Signed distance from the basal curve along the basal normal, relative to `R_soft` |

The spatial variables are computed from the same basal geometry classes used by the simulation, so line, circle, and ellipse configurations all use their own projection and normal calculations.

External-force formulas also expose:

| Variable | Units | Meaning |
|---|---|---|
| `x`, `y` | internal simulation length (R_soft-relative) | Cartesian nucleus position relative to geometry center `C`; for v2 inputs this is converted from micron-facing values |
| `N` | unitless | Unit basal normal into the tissue at the projected basal point `a` |
| `T` | unitless | Unit tangent perpendicular to the basal normal, `T = (-N_y, N_x)` |

## External Force Formulas

External force formulas are evaluated per cell per substep. They can return a vector by using `N` or `T`:

```txt
5 * T + 3 * N
```

If an external force formula does not mention `N` or `T`, the simulator treats it as a scalar and wraps it as tangential flow toward the bottom:

```txt
-(scalar) * sign(alpha) * T
```

The formula editor preview uses the same external-force evaluator as the simulation. Its blue vector field samples the formula at multiple positions around the current preview geometry, which is useful for spotting how a force changes with `x`, `y`, `alpha`, `delta`, `T`, or `N`.

Examples:

| Formula | Units | Effect |
|---|---|---|
| `10` | target output units | Magnitude-10 tangential flow toward `alpha = 0`. |
| `10 * sin(t)` | target output units (time-varying) | Time-varying tangential flow. |
| `3 * N` | target output units | Normal push into the tissue. |
| `delta * N` | target output units | Normal force proportional to distance from the basal curve. |
| `5 * T + 3 * N` | target output units | Tangential plus normal force. |

## Constants

Constants are named numbers available in formulas. Define them in the Constants tab, then use them by name:

```txt
triangle(t, period=heartbeat, min=0, max=1)
```

Constants are best for shared timings, amplitudes, and rates that appear in more than one formula.
