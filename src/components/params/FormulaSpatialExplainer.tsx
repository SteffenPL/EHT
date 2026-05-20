import { useId, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { createBasalGeometry, type BasalGeometry } from '@/core/math/basal-geometry';
import { Vector2 } from '@/core/math/vector2';
import { Slider } from '@/components/ui/slider';
import { computeEllipseFromPerimeter } from '@/models/eht/params/geometry';
import {
  buildExternalForceScope,
  evaluateExternalForceAtPosition,
  type ExternalForceEvaluation,
} from '@/models/eht/simulation/external-force-formula';
import { cn } from '@/lib/utils';

interface FormulaSpatialExplainerProps {
  className?: string;
  compact?: boolean;
  formula?: string;
  constants?: Record<string, number>;
  initialPerimeter?: number;
  initialAspectRatio?: number;
  softRadius?: number;
}

interface Point {
  x: number;
  y: number;
}

const CENTER = { x: 300, y: 220 };
const DEFAULT_PERIMETER = 105;
const DEFAULT_ASPECT_RATIO = 1;
const DEFAULT_SOFT_RADIUS = 6;
const MIN_PERIMETER = 20;
const MAX_PERIMETER = 900;
const MIN_ASPECT_RATIO = -3;
const MAX_ASPECT_RATIO = 3;
const FIELD_SAMPLE_COUNT = 16;
const FORCE_COLOR = '#60a5fa';

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function simToScreen(point: Point, scale: number): Point {
  return {
    x: CENTER.x + point.x * scale,
    y: CENTER.y - point.y * scale,
  };
}

function geometryPath(geometry: BasalGeometry, scale: number, lineHalfWidth: number): string {
  if (geometry.type === 'line') {
    const left = simToScreen({ x: -lineHalfWidth, y: 0 }, scale);
    const right = simToScreen({ x: lineHalfWidth, y: 0 }, scale);
    return `M${left.x.toFixed(2)},${left.y.toFixed(2)} L${right.x.toFixed(2)},${right.y.toFixed(2)}`;
  }

  const points: Point[] = [];
  for (let i = 0; i <= 180; i++) {
    const arcLength = (i / 180) * geometry.perimeter;
    points.push(simToScreen(geometry.getPointAtArcLength(arcLength), scale));
  }
  return points.map((p, index) => `${index === 0 ? 'M' : 'L'}${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ') + ' Z';
}

function alphaArcPath(alpha: number): string {
  const radius = 48;
  const start = { x: CENTER.x, y: CENTER.y + radius };
  const end = {
    x: CENTER.x + Math.sin(alpha) * radius,
    y: CENTER.y + Math.cos(alpha) * radius,
  };
  const sweep = alpha >= 0 ? 0 : 1;
  return `M${start.x.toFixed(2)},${start.y.toFixed(2)} A${radius},${radius} 0 0 ${sweep} ${end.x.toFixed(2)},${end.y.toFixed(2)}`;
}

function format(value: number, digits = 1): string {
  const fixed = value.toFixed(digits);
  return fixed.replace('-0.0', '0.0').replace('-0.00', '0.00');
}

function formulaErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function basalPositionForAlpha(
  a: number,
  b: number,
  alpha: number,
  lineHalfWidth: number
): Vector2 {
  if (!Number.isFinite(a) || !Number.isFinite(b)) {
    return new Vector2(Math.sin(alpha) * lineHalfWidth * 0.88, 0);
  }

  const sinAlpha = Math.sin(alpha);
  const cosAlpha = Math.cos(alpha);
  const boundaryRadius = 1 / Math.sqrt((sinAlpha * sinAlpha) / (a * a) + (cosAlpha * cosAlpha) / (b * b));
  return new Vector2(boundaryRadius * sinAlpha, -boundaryRadius * cosAlpha);
}

function positionForAlphaDelta(
  geometry: BasalGeometry,
  a: number,
  b: number,
  alpha: number,
  delta: number,
  lineHalfWidth: number
): Vector2 {
  const basalPoint = basalPositionForAlpha(a, b, alpha, lineHalfWidth);
  const projectedPoint = geometry.projectPoint(basalPoint);
  const normal = geometry.getNormal(projectedPoint);
  return projectedPoint.add(normal.scale(delta));
}

function radialDirection(point: Vector2): Vector2 {
  const toCenter = Vector2.zero().sub(point);
  if (toCenter.mag() <= 1e-9) {
    return new Vector2(0, 1);
  }
  return toCenter.normalize();
}

function sampleFieldPositions(
  geometry: BasalGeometry,
  offset: number,
  lineHalfWidth: number,
  a: number,
  b: number
): Vector2[] {
  const positions: Vector2[] = [];

  if (geometry.type === 'line') {
    for (const signedOffset of [-offset, offset]) {
      for (let i = 0; i < FIELD_SAMPLE_COUNT; i++) {
        const t = (i + 0.5) / FIELD_SAMPLE_COUNT;
        const basalPoint = new Vector2(-lineHalfWidth + t * lineHalfWidth * 2, 0);
        const normal = geometry.getNormal(basalPoint);
        positions.push(basalPoint.add(normal.scale(signedOffset)));
      }
    }
    return positions;
  }

  for (const direction of [1, -1]) {
    for (let i = 0; i < FIELD_SAMPLE_COUNT; i++) {
      const alpha = -Math.PI + ((i + 0.5) / FIELD_SAMPLE_COUNT) * 2 * Math.PI;
      const basalPoint = geometry.projectPoint(basalPositionForAlpha(a, b, alpha, lineHalfWidth));
      const towardCenter = radialDirection(basalPoint);
      positions.push(basalPoint.add(towardCenter.scale(offset * direction)));
    }
  }
  return positions;
}

function vectorEnd(start: Point, force: Vector2, maxMagnitude: number): Point {
  const magnitude = force.mag();
  if (!isFinite(magnitude) || magnitude <= 1e-9 || maxMagnitude <= 1e-9) {
    return start;
  }

  const length = 10 + (magnitude / maxMagnitude) * 26;
  const unit = force.normalize();
  return {
    x: start.x + unit.x * length,
    y: start.y - unit.y * length,
  };
}

function guideVectorEnd(start: Point, vector: Vector2, length = 44): Point {
  return {
    x: start.x + vector.x * length,
    y: start.y - vector.y * length,
  };
}

function Control({
  label,
  value,
  min,
  max,
  step,
  suffix,
  help,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  suffix?: string;
  help: ReactNode;
  onChange: (value: number) => void;
}) {
  return (
    <div className="space-y-1.5">
      <label className="flex items-center justify-between gap-3 text-xs font-semibold">
        <span>{label}</span>
        <output className="font-mono text-primary">
          {format(value, step >= 1 ? 0 : 2)}
          {suffix ? ` ${suffix}` : ''}
        </output>
      </label>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-full accent-primary"
      />
      <p className="text-[11px] leading-snug text-muted-foreground">{help}</p>
    </div>
  );
}

function SliderControl({
  label,
  value,
  min,
  max,
  step,
  suffix,
  help,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  suffix?: string;
  help: ReactNode;
  onChange: (value: number) => void;
}) {
  return (
    <div className="space-y-2">
      <label className="flex items-center justify-between gap-3 text-xs font-semibold">
        <span>{label}</span>
        <output className="font-mono text-primary">
          {format(value, step >= 1 ? 0 : 2)}
          {suffix ? ` ${suffix}` : ''}
        </output>
      </label>
      <Slider
        min={min}
        max={max}
        step={step}
        value={[value]}
        onValueChange={([next]) => onChange(next ?? value)}
      />
      <p className="text-[11px] leading-snug text-muted-foreground">{help}</p>
    </div>
  );
}

export function FormulaSpatialExplainer({
  className,
  compact = false,
  formula,
  constants,
  initialPerimeter,
  initialAspectRatio,
  softRadius,
}: FormulaSpatialExplainerProps) {
  const markerPrefix = useId().replace(/:/g, '');
  const [perimeter, setPerimeter] = useState(() =>
    clamp(initialPerimeter ?? DEFAULT_PERIMETER, MIN_PERIMETER, MAX_PERIMETER)
  );
  const [aspectRatio, setAspectRatio] = useState(() =>
    clamp(initialAspectRatio ?? DEFAULT_ASPECT_RATIO, MIN_ASPECT_RATIO, MAX_ASPECT_RATIO)
  );
  const [alphaDegrees, setAlphaDegrees] = useState(45);
  const [time, setTime] = useState(0);
  const [delta, setDelta] = useState(12);

  const model = useMemo(() => {
    const { a, b, curvature_1, curvature_2 } = computeEllipseFromPerimeter(perimeter, aspectRatio);
    const basalGeometry = createBasalGeometry(curvature_1, curvature_2, 360);
    const visibleHalfWidth = Number.isFinite(a) ? a : perimeter / 2;
    const visibleHalfHeight = Number.isFinite(b) ? b : Math.max(12, perimeter * 0.22);
    const deltaLimit = Math.max(5, Math.min(visibleHalfWidth, visibleHalfHeight) * 0.6);
    const previewDelta = clamp(delta, -deltaLimit, deltaLimit);
    const fieldOffset = Math.max(2, 2 * (softRadius ?? DEFAULT_SOFT_RADIUS));
    const scale = Math.min(
      220 / Math.max(visibleHalfWidth + fieldOffset, 1),
      150 / Math.max(visibleHalfHeight + fieldOffset, 1)
    );
    const alpha = (alphaDegrees * Math.PI) / 180;
    const nucleus = positionForAlphaDelta(basalGeometry, a, b, alpha, previewDelta, visibleHalfWidth);
    const spatial = buildExternalForceScope(nucleus, basalGeometry, time, constants);
    const safeFormula = formula?.trim() || '0';
    let selectedEvaluation: ExternalForceEvaluation | null = null;
    let previewError: string | null = null;

    try {
      selectedEvaluation = evaluateExternalForceAtPosition({
        formula: safeFormula,
        position: nucleus,
        basalGeometry,
        t: time,
        constants,
      });
    } catch (error) {
      previewError = formulaErrorMessage(error);
    }

    const field = sampleFieldPositions(basalGeometry, fieldOffset, visibleHalfWidth, a, b).map((position) => {
      try {
        return {
          position,
          evaluation: evaluateExternalForceAtPosition({
            formula: safeFormula,
            position,
            basalGeometry,
            t: time,
            constants,
          }),
        };
      } catch (error) {
        previewError = previewError ?? formulaErrorMessage(error);
        return { position, evaluation: null };
      }
    });

    const maxForceMagnitude = Math.max(
      ...field.map(sample => sample.evaluation?.force.mag() ?? 0),
      selectedEvaluation?.force.mag() ?? 0
    );

    return {
      a,
      b,
      basalGeometry,
      field,
      maxForceMagnitude,
      nucleus,
      previewError,
      previewDelta,
      scale,
      selectedEvaluation,
      spatial,
      deltaLimit,
      fieldOffset,
      visibleHalfHeight,
      visibleHalfWidth,
    };
  }, [alphaDegrees, aspectRatio, constants, delta, formula, perimeter, softRadius, time]);

  const nucleusScreen = simToScreen(model.nucleus, model.scale);
  const projectionScreen = simToScreen(model.spatial.projectedPoint, model.scale);
  const boundaryScreen = simToScreen(model.basalGeometry.projectPoint(model.nucleus), model.scale);
  const nEnd = guideVectorEnd(projectionScreen, model.spatial.normal);
  const tEnd = guideVectorEnd(projectionScreen, model.spatial.tangent);
  const cellLabelX = model.spatial.alpha >= 0 ? nucleusScreen.x + 24 : nucleusScreen.x - 132;
  const projectionLabelX = model.spatial.alpha >= 0 ? projectionScreen.x + 18 : projectionScreen.x - 132;
  const force = model.selectedEvaluation?.force ?? Vector2.zero();
  const forceEnd = vectorEnd(nucleusScreen, force, model.maxForceMagnitude);
  const forceMagnitude = force.mag();
  const hasSelectedForce = Number.isFinite(forceMagnitude) && forceMagnitude > 1e-9;
  const effectiveFormula = model.selectedEvaluation?.effectiveFormula ?? null;

  return (
    <section className={cn('rounded-md border bg-card p-3 text-card-foreground', className)}>
      <div className="space-y-3">
        <div className="rounded-md border bg-background p-2">
          <svg viewBox="0 0 600 440" role="img" aria-label="Formula spatial variable explainer" className="aspect-[1.35/1] w-full">
            <defs>
              <marker id={`${markerPrefix}-formula-arrow-blue`} markerWidth="7" markerHeight="7" refX="6" refY="2.5" orient="auto">
                <path d="M0,0 L0,5 L7,2.5 z" fill={FORCE_COLOR} />
              </marker>
              <marker id={`${markerPrefix}-formula-arrow-teal`} markerWidth="7" markerHeight="7" refX="6" refY="2.5" orient="auto">
                <path d="M0,0 L0,5 L7,2.5 z" fill="#0f766e" />
              </marker>
              <marker id={`${markerPrefix}-formula-arrow-gold`} markerWidth="7" markerHeight="7" refX="6" refY="2.5" orient="auto">
                <path d="M0,0 L0,5 L7,2.5 z" fill="#b7791f" />
              </marker>
              <marker id={`${markerPrefix}-formula-arrow-red`} markerWidth="7" markerHeight="7" refX="6" refY="2.5" orient="auto">
                <path d="M0,0 L0,5 L7,2.5 z" fill="#a4493f" />
              </marker>
              <marker id={`${markerPrefix}-formula-arrow-violet`} markerWidth="7" markerHeight="7" refX="6" refY="2.5" orient="auto">
                <path d="M0,0 L0,5 L7,2.5 z" fill="#6b5ca5" />
              </marker>
            </defs>

            <rect x="0" y="0" width="600" height="440" fill="hsl(var(--background))" />
            {model.basalGeometry.type !== 'line' && (
              <ellipse
                cx={CENTER.x}
                cy={CENTER.y}
                rx={model.visibleHalfWidth * model.scale}
                ry={model.visibleHalfHeight * model.scale}
                fill="hsl(var(--muted) / 0.25)"
                stroke="hsl(var(--muted-foreground) / 0.7)"
                strokeWidth="3"
              />
            )}
            <path d={geometryPath(model.basalGeometry, model.scale, model.visibleHalfWidth)} fill="none" stroke="hsl(var(--background))" strokeWidth="6" strokeLinecap="round" />
            <path d={geometryPath(model.basalGeometry, model.scale, model.visibleHalfWidth)} fill="none" stroke="hsl(var(--foreground))" strokeWidth="3" strokeLinecap="round" />
            <line x1={CENTER.x - model.visibleHalfWidth * model.scale - 18} y1={CENTER.y} x2={CENTER.x + model.visibleHalfWidth * model.scale + 18} y2={CENTER.y} stroke="hsl(var(--border))" strokeWidth="2" strokeDasharray="6 6" />
            <line x1={CENTER.x} y1={CENTER.y - model.visibleHalfHeight * model.scale - 18} x2={CENTER.x} y2={CENTER.y + model.visibleHalfHeight * model.scale + 18} stroke="hsl(var(--border))" strokeWidth="2" strokeDasharray="6 6" />
            <line x1={CENTER.x} y1={CENTER.y} x2={boundaryScreen.x} y2={boundaryScreen.y} stroke="#6b5ca5" strokeWidth="2" strokeDasharray="4 5" />
            <circle cx={CENTER.x} cy={CENTER.y} r="6" fill="hsl(var(--muted-foreground))" />
            <text x={CENTER.x + 12} y={CENTER.y - 6} fill="hsl(var(--muted-foreground))" fontSize="16">C center</text>

            {model.field.map((sample, index) => {
              const start = simToScreen(sample.position, model.scale);
              const sampleForce = sample.evaluation?.force ?? Vector2.zero();
              const end = vectorEnd(start, sampleForce, model.maxForceMagnitude);
              const magnitude = sampleForce.mag();
              return magnitude > 1e-9 ? (
                <line
                  key={index}
                  x1={start.x}
                  y1={start.y}
                  x2={end.x}
                  y2={end.y}
                  stroke={FORCE_COLOR}
                  strokeWidth="2"
                  strokeOpacity="0.6"
                  markerEnd={`url(#${markerPrefix}-formula-arrow-blue)`}
                />
              ) : (
                <circle key={index} cx={start.x} cy={start.y} r="2.5" fill={FORCE_COLOR} opacity="0.45" />
              );
            })}

            <line x1={CENTER.x} y1={CENTER.y} x2={nucleusScreen.x} y2={nucleusScreen.y} stroke="#6b5ca5" strokeWidth="3" strokeDasharray="5 5" markerEnd={`url(#${markerPrefix}-formula-arrow-violet)`} />
            {hasSelectedForce && (
              <line x1={nucleusScreen.x} y1={nucleusScreen.y} x2={forceEnd.x} y2={forceEnd.y} stroke={FORCE_COLOR} strokeWidth="4" markerEnd={`url(#${markerPrefix}-formula-arrow-blue)`} />
            )}
            <line x1={projectionScreen.x} y1={projectionScreen.y} x2={nucleusScreen.x} y2={nucleusScreen.y} stroke="#b7791f" strokeWidth="3" strokeDasharray="5 5" markerEnd={`url(#${markerPrefix}-formula-arrow-gold)`} />
            <line x1={projectionScreen.x} y1={projectionScreen.y} x2={nEnd.x} y2={nEnd.y} stroke="#0f766e" strokeWidth="4" markerEnd={`url(#${markerPrefix}-formula-arrow-teal)`} />
            <line x1={projectionScreen.x} y1={projectionScreen.y} x2={tEnd.x} y2={tEnd.y} stroke="#a4493f" strokeWidth="4" markerEnd={`url(#${markerPrefix}-formula-arrow-red)`} />
            <path d={alphaArcPath(model.spatial.alpha)} fill="none" stroke="#6b5ca5" strokeWidth="3" markerEnd={`url(#${markerPrefix}-formula-arrow-violet)`} />

            <circle cx={projectionScreen.x} cy={projectionScreen.y} r="6" fill="#b7791f" />
            <text x={projectionLabelX} y={projectionScreen.y + 24} fill="#8a5a0a" fontSize="16">a projection</text>
            <circle cx={nucleusScreen.x} cy={nucleusScreen.y} r="9" fill={FORCE_COLOR} />
            <text x={cellLabelX} y={nucleusScreen.y - 14} fill={FORCE_COLOR} fontSize="16">X cell nucleus</text>
            <text x={nEnd.x + 6} y={nEnd.y - 4} fill="#0f766e" fontSize="18" fontWeight="700">N</text>
            <text x={tEnd.x + 6} y={tEnd.y - 4} fill="#a4493f" fontSize="18" fontWeight="700">T</text>
            <text x={model.spatial.alpha >= 0 ? CENTER.x + 58 : CENTER.x - 100} y={CENTER.y + 82} fill="#6b5ca5" fontSize="16">alpha</text>
            <text x="186" y="405" fill="hsl(var(--muted-foreground))" fontSize="15">alpha = 0 at bottom; x,y are measured from C to X</text>
          </svg>
          <div className="grid gap-2 text-[11px] text-muted-foreground sm:grid-cols-2">
            <span><span className="mr-1 inline-block h-2 w-2 rounded-full bg-blue-400" />blue arrows are the evaluated external force field</span>
            <span><span className="mr-1 inline-block h-2 w-2 rounded-full bg-amber-600" /><code>delta</code> uses projected basal point <code>a</code></span>
            <span><span className="mr-1 inline-block h-2 w-2 rounded-full bg-teal-700" /><code>N</code> is basal normal into tissue</span>
            <span><span className="mr-1 inline-block h-2 w-2 rounded-full bg-red-700" /><code>T=(-N_y,N_x)</code> is perpendicular to <code>N</code></span>
          </div>
        </div>

        <aside className="space-y-3 rounded-md border bg-muted/30 p-3">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 className="text-sm font-semibold">Mapping controls</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                These controls only affect the explainer. The arrow bands are fixed at 2 x R_soft toward and away from the center.
              </p>
            </div>
            <div className="rounded-md border bg-background px-2 py-1 text-xs">
              <span className="text-muted-foreground">t</span>
              <span className="ml-2 font-mono text-primary">{format(time, 1)} h</span>
            </div>
          </div>

          <div className={cn('grid gap-3', compact ? 'md:grid-cols-2 xl:grid-cols-5' : 'md:grid-cols-2 lg:grid-cols-5')}>
            <Control
              label="Perimeter"
              value={perimeter}
              min={MIN_PERIMETER}
              max={MAX_PERIMETER}
              step={5}
              suffix="um"
              help={<>Starts from <code>general.perimeter</code> and rescales the preview to fit.</>}
              onChange={setPerimeter}
            />
            <Control
              label="Aspect ratio"
              value={aspectRatio}
              min={MIN_ASPECT_RATIO}
              max={MAX_ASPECT_RATIO}
              step={0.05}
              help={<>Uses <code>aspect_ratio = b/a</code>. 0 is a straight line; 1 is a circle.</>}
              onChange={setAspectRatio}
            />
            <Control
              label="Alpha"
              value={alphaDegrees}
              min={-180}
              max={180}
              step={1}
              suffix="deg"
              help={<>Chooses a basal point using <code>alpha = atan2(x, -y)</code>.</>}
              onChange={setAlphaDegrees}
            />
            <Control
              label="Time"
              value={time}
              min={0}
              max={120}
              step={0.5}
              suffix="h"
              help={<>Sets <code>t</code> for time-dependent formulas.</>}
              onChange={setTime}
            />
            <SliderControl
              label="Delta"
              value={model.previewDelta}
              min={-model.deltaLimit}
              max={model.deltaLimit}
              step={0.5}
              suffix="um"
              help={<>Moves only the highlighted nucleus point along <code>N</code>.</>}
              onChange={setDelta}
            />
          </div>

          <dl className="grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-md border bg-background p-2">
              <dt className="font-semibold uppercase text-muted-foreground">x, y</dt>
              <dd className="font-mono">{format(model.nucleus.x)}, {format(model.nucleus.y)}</dd>
            </div>
            <div className="rounded-md border bg-background p-2">
              <dt className="font-semibold uppercase text-muted-foreground">r</dt>
              <dd className="font-mono">{format(model.spatial.r)}</dd>
            </div>
            <div className="rounded-md border bg-background p-2">
              <dt className="font-semibold uppercase text-muted-foreground">alpha</dt>
              <dd className="font-mono">{format(model.spatial.alpha, 2)} rad</dd>
            </div>
            <div className="rounded-md border bg-background p-2">
              <dt className="font-semibold uppercase text-muted-foreground">axes</dt>
              <dd className="font-mono">
                {model.basalGeometry.type === 'line'
                  ? `line ${format(model.visibleHalfWidth * 2)}`
                  : `a=${format(model.a)}, b=${format(model.b)}`}
              </dd>
            </div>
            <div className="rounded-md border bg-background p-2">
              <dt className="font-semibold uppercase text-muted-foreground">N</dt>
              <dd className="font-mono">({format(model.spatial.normal.x, 2)}, {format(model.spatial.normal.y, 2)})</dd>
            </div>
            <div className="rounded-md border bg-background p-2">
              <dt className="font-semibold uppercase text-muted-foreground">T</dt>
              <dd className="font-mono">({format(model.spatial.tangent.x, 2)}, {format(model.spatial.tangent.y, 2)})</dd>
            </div>
            <div className="rounded-md border bg-background p-2">
              <dt className="font-semibold uppercase text-muted-foreground">delta</dt>
              <dd className="font-mono">{format(model.spatial.delta)}</dd>
            </div>
            <div className="rounded-md border bg-background p-2">
              <dt className="font-semibold uppercase text-muted-foreground">sign(alpha)</dt>
              <dd className="font-mono">{Math.abs(model.spatial.alpha) < 1e-6 ? 0 : Math.sign(model.spatial.alpha)}</dd>
            </div>
            <div className="rounded-md border bg-background p-2">
              <dt className="font-semibold uppercase text-muted-foreground">force</dt>
              <dd className="font-mono">({format(force.x, 2)}, {format(force.y, 2)})</dd>
            </div>
            <div className="rounded-md border bg-background p-2">
              <dt className="font-semibold uppercase text-muted-foreground">t</dt>
              <dd className="font-mono">{format(time, 1)} h</dd>
            </div>
            <div className="rounded-md border bg-background p-2">
              <dt className="font-semibold uppercase text-muted-foreground">field offset</dt>
              <dd className="font-mono">2 x R_soft = {format(model.fieldOffset)} um</dd>
            </div>
          </dl>

          {(formula || !compact) && (
            <div className={cn(
              'rounded-md p-2 font-mono text-xs',
              model.previewError ? 'border border-destructive bg-background text-destructive' : 'bg-primary text-primary-foreground'
            )}>
              {model.previewError
                ? `Invalid formula: ${model.previewError}`
                : `Effective: ${effectiveFormula ?? '0'}`}
            </div>
          )}
        </aside>
      </div>
    </section>
  );
}
