# EHT Model Description

The **Epithelial-to-Hematopoietic Transition (EHT)** model simulates cell dynamics in epithelial tissue, particularly focusing on cells undergoing transition processes like EMT (Epithelial-to-Mesenchymal Transition).

## Units

- Length-like quantities are in **microns** (`\mathrm{\mu}m`) unless noted.
- Stiffness and force coefficients (`k_*`) are **simulation coefficients / unitless scaling factors**.
- Normalized fields (`x`, `alpha`, `aspect_ratio`, `sign(alpha)`) are **unitless**.

## Cell Representation

Each cell consists of three points:

- **X** = (x, y): Nucleus position
- **A** = (A_x, A_y): Apical point (top attachment)
- **B** = (B_x, B_y): Basal point (bottom attachment)

## Forces

The model uses an overdamped dynamics system where forces drive cell motion. The total force on each cell component determines its velocity.

### 1. Cell-Cell Repulsion

Soft repulsion between overlapping cell nuclei:

$$F_{rep} = -k_{rep} \frac{R_{ij} - d}{d \cdot R_{ij}^2} \cdot \hat{r}_{ij}$$

where:
- $d$ = distance between nuclei (**µm**)
- $R_{ij} = R_i^{soft} + R_j^{soft}$ (sum of soft radii, **µm**)
- $k_{rep}$ = repulsion stiffness (simulation-coefficient, unitless)
- Active when $d < R_{ij}$

### 2. Apical-Nucleus Spring

Connects nucleus X to apical point A:

$$F_{AX} = 2 k_{AX} \frac{|AX| - \ell_{AX}}{|AX| \cdot \ell_{AX}^2} \cdot \widehat{AX}$$

where:
- $\ell_{AX} = \eta_A + R$ (rest length = cytoskeleton length + cell radius, **µm**)
- $k_{AX}$ = apical-nucleus stiffness (simulation-coefficient, unitless)

### 3. Basal-Nucleus Spring

Connects nucleus X to basal point B:

$$F_{BX} = 2 k_{BX} \frac{|BX| - \ell_{BX}}{|BX| \cdot \ell_{BX}^2} \cdot \widehat{BX}$$

where:
- $\ell_{BX} = \eta_B + R$ (rest length, **µm**)
- $k_{BX}$ = basal-nucleus stiffness (simulation-coefficient, unitless)

### 4. Straightness Constraint

Penalizes deviation from straight A-X-B alignment:

$$E_{straight} = k_S \frac{(X-A) \cdot (X-B)}{|X-A| \cdot |X-B|}$$

where:
- $k_S$ = straightness stiffness (simulation-coefficient, unitless)

### 5. Apical Junction Springs

Connects apical points of neighboring cells:

$$F_{AA} = \frac{k_{AA}}{4} \frac{d - \ell_0}{d} \cdot \hat{r}_{ij}$$

where:
- $d$ = distance between apical points (**µm**)
- $\ell_0$ = rest length (stored per link, **µm**)

## Geometry

The basal membrane can be:
- **Straight line**: When perimeter = 0
- **Elliptical curve**: Defined by perimeter and aspect ratio

Cells attach their basal points (B) to this curve and apical points (A) form a connected strip via apical links.
Geometry terms use physical units where possible (`perimeter`, `w_init`, etc. are in **µm**).

## Cell Cycle

Cells progress through phases:
1. **G1**: Normal growth
2. **G2**: Pre-mitosis (moving toward apical surface)
3. **Mitosis**: Division in progress
4. **Division**: Ready to divide (triggers division logic)

## EMT Events

Cells undergoing EMT lose properties over time:
- **time_A**: Lose apical adhesion
- **time_B**: Lose basal adhesion
- **time_S**: Lose straightness constraint
- **time_P**: Start polarized running behavior
