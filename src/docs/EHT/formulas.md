# Formula Editor Guide

The EHT simulator supports math.js formulas for time-dependent parameters, cell-type parameters, event formulas, and external force formulas.

Use formulas when a value should change over simulation time or depend on a cell's spatial context. Use constants when several formulas should share one named value.

## Common Variables

| Variable | Meaning | Example |
|---|---|---|
| `t` | Current simulation time in hours | `sin(t)` |
| `dt` | Current timestep size | `old_value + 0.01 * dt` |
| `old_value` | Value before the formula is applied | `old_value * 0.5` |
| `init_value` | Initial value captured when the formula was created | `init_value + 0.2 * sin(t)` |

## Helper Functions

| Function | Meaning | Example |
|---|---|---|
| `step(t, switch, before, after)` | Jump from one value to another | `step(t, 5, 0, 1)` |
| `ramp(t, start, end, from, to)` | Linear transition | `ramp(t, 0, 10, 1, 2)` |
| `triangle(t, period, min, max)` | Periodic triangle wave | `triangle(t, 0.5, 0, 1)` |
| `pulse(t, start, end, off, on)` | On during a time window | `pulse(t, 2, 5, 0, 1)` |
| `smoothstep(t, start, end, from, to)` | Smooth transition | `smoothstep(t, 0, 10, 1, 2)` |

## Cell Spatial Variables

Cell-type formulas and external-force formulas can use spatial variables:

| Variable | Meaning |
|---|---|
| `alpha` | Polar angle of the nucleus around the geometry center. Bottom is `0`, right is `+pi/2`, left is `-pi/2`. |
| `r` | Distance from the geometry center to the nucleus. |
| `delta` | Signed distance from the basal curve along the basal normal. |

The spatial variables are computed from the same basal geometry classes used by the simulation, so line, circle, and ellipse configurations all use their own projection and normal calculations.

External-force formulas also expose:

| Variable | Meaning |
|---|---|
| `x`, `y` | Cartesian nucleus position relative to the geometry center `C`. |
| `N` | Unit basal normal into the tissue at the projected basal point `a`. |
| `T` | Unit tangent perpendicular to the basal normal, `T = (-N_y, N_x)`. |

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

| Formula | Effect |
|---|---|
| `10` | Magnitude-10 tangential flow toward `alpha = 0`. |
| `10 * sin(t)` | Time-varying tangential flow. |
| `3 * N` | Normal push into the tissue. |
| `delta * N` | Normal force proportional to distance from the basal curve. |
| `5 * T + 3 * N` | Tangential plus normal force. |

## Constants

Constants are named numbers available in formulas. Define them in the Constants tab, then use them by name:

```txt
triangle(t, heartbeat, 0, 1)
```

Constants are best for shared timings, amplitudes, and rates that appear in more than one formula.
