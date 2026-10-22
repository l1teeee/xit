// Every gray here is chosen for the 14-glyph detail ramp at gamma 1: #ececec and #dcdcdc land on '.' and ',',
// the crest grays on ':', so the backdrop never gets denser than that.

const SUN_PREFERRED_X_SHARE = 0.78;
const SUN_PREFERRED_Y_SHARE = 0.22;
const SUN_RADIUS_SHARE = 0.11;
const SUN_RING_RADIUS_RATIO = 1.28;
const SUN_RING_WIDTH = 8;
const SUN_RING_COLOR = '#d8d8d8';
const SUN_GLOW_GRAY = 0xd2;
// [position from the center to the rim, opacity]
const SUN_GLOW_STOPS: readonly [number, number][] = [[0, 0.95], [0.4, 0.9], [0.75, 0.5], [1, 0]];

// Same bird footprint as habitatPainter, which the sun must stay clear of.
const BIRD_MAX_WIDTH = 820;
const BIRD_WIDTH_SHARE = 0.82;
const BIRD_ASPECT = 34 / 51;
const BIRD_CENTER_SHARE = 0.41;
const BIRD_MAX_HEIGHT_SHARE = 0.37;

type HillSpec = {
  baseShare: number;
  waves: readonly [amplitudeShare: number, cyclesAcrossWidth: number, phaseCycles: number][];
  fill: string;
  crestColor: string;
  parallaxPx: number;
};

// Farthest first, so the near hill paints over it.
const HILLS: readonly HillSpec[] = [
  {
    baseShare: 0.64,
    waves: [[0.04, 1.1, 0.3], [0.022, 2.7, 0.1], [0.01, 5.3, 0.4]],
    fill: '#ececec',
    crestColor: '#d4d4d4',
    parallaxPx: 2,
  },
  {
    baseShare: 0.76,
    waves: [[0.045, 0.8, 0.9], [0.022, 2.1, 0.2], [0.01, 4.6, 0.7]],
    fill: '#dcdcdc',
    crestColor: '#cacaca',
    parallaxPx: 4,
  },
];
const HILL_CREST_WIDTH = 16;
const HILL_SAMPLE_STEP = 8;
const HILL_EDGE_MARGIN = 8;
// Past the last grid row, so its partly covered cell stays filled.
const HILL_BOTTOM_OVERSHOOT = 14;
const PARALLAX_PERIOD_MS = 40000;

type CloudSpec = {
  heightShare: number;
  lengthShare: number;
  thicknessShare: number;
  crossingMs: number;
  startShare: number;
};

const CLOUDS: readonly CloudSpec[] = [
  { heightShare: 0.09, lengthShare: 0.46, thicknessShare: 0.06, crossingMs: 92000, startShare: 0.22 },
  { heightShare: 0.18, lengthShare: 0.34, thicknessShare: 0.07, crossingMs: 76000, startShare: 0.4 },
  { heightShare: 0.285, lengthShare: 0.52, thicknessShare: 0.055, crossingMs: 84000, startShare: 0.48 },
];
// Overlapping soft ellipses keep a band from looking like a single sausage.
// [offset along the length, rise over the thickness, length share, thickness share]
const CLOUD_PUFFS: readonly [number, number, number, number][] = [
  [0, 0, 1, 1],
  [-0.22, -0.3, 0.55, 0.8],
  [0.2, -0.2, 0.6, 0.7],
];
const CLOUD_GLOW_GRAY = 0xe6;
const CLOUD_GLOW_STOPS: readonly [number, number][] = [[0, 0.9], [0.5, 0.7], [1, 0]];

type Sun = { disc: Path2D; ring: Path2D; glow: CanvasGradient };
type Hill = { spec: HillSpec; body: Path2D; crest: Path2D };
type BackdropShapes = {
  width: number;
  height: number;
  sun: Sun;
  hills: Hill[];
  cloudGlow: CanvasGradient;
};

const shapesByContext = new WeakMap<CanvasRenderingContext2D, BackdropShapes>();

function fadingGray(level: number, opacity: number): string {
  return `rgba(${level}, ${level}, ${level}, ${opacity})`;
}

function buildGlow(
  context: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  radius: number,
  gray: number,
  stops: readonly [number, number][],
): CanvasGradient {
  const glow = context.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
  for (const [position, opacity] of stops) glow.addColorStop(position, fadingGray(gray, opacity));
  return glow;
}

// Keeps the preferred spot unless the sun, ring included, would overlap the bird's ellipse. Then it slides
// away from the bird along the line through the bird's center, which keeps it in the upper right.
function placeSun(width: number, height: number, reach: number): { x: number; y: number } {
  const birdHalfWidth = Math.min(width * BIRD_WIDTH_SHARE, BIRD_MAX_WIDTH) / 2;
  const birdHalfHeight = Math.min(birdHalfWidth * BIRD_ASPECT, height * BIRD_MAX_HEIGHT_SHARE);
  const birdCenterX = width / 2;
  const birdCenterY = height * BIRD_CENTER_SHARE;
  const offsetX = width * SUN_PREFERRED_X_SHARE - birdCenterX;
  const offsetY = height * SUN_PREFERRED_Y_SHARE - birdCenterY;
  const distance = Math.hypot(offsetX / (birdHalfWidth + reach), offsetY / (birdHalfHeight + reach));
  const stretch = Math.max(1, 1 / distance);
  return { x: birdCenterX + offsetX * stretch, y: birdCenterY + offsetY * stretch };
}

function buildSun(context: CanvasRenderingContext2D, width: number, height: number): Sun {
  const radius = height * SUN_RADIUS_SHARE;
  const ringRadius = radius * SUN_RING_RADIUS_RATIO;
  const { x, y } = placeSun(width, height, ringRadius + SUN_RING_WIDTH / 2);
  const disc = new Path2D();
  disc.arc(x, y, radius, 0, Math.PI * 2);
  const ring = new Path2D();
  ring.arc(x, y, ringRadius, 0, Math.PI * 2);
  return { disc, ring, glow: buildGlow(context, x, y, radius, SUN_GLOW_GRAY, SUN_GLOW_STOPS) };
}

function crestY(spec: HillSpec, widthShare: number, height: number): number {
  let share = spec.baseShare;
  for (const [amplitudeShare, cycles, phase] of spec.waves) {
    share += amplitudeShare * Math.sin((widthShare * cycles + phase) * Math.PI * 2);
  }
  return share * height;
}

function buildHill(spec: HillSpec, width: number, height: number): Hill {
  const startX = -HILL_EDGE_MARGIN;
  const endX = width + HILL_EDGE_MARGIN;
  const stepCount = Math.ceil((endX - startX) / HILL_SAMPLE_STEP);
  const crest = new Path2D();
  crest.moveTo(startX, crestY(spec, startX / width, height));
  for (let step = 1; step <= stepCount; step++) {
    const x = Math.min(endX, startX + step * HILL_SAMPLE_STEP);
    crest.lineTo(x, crestY(spec, x / width, height));
  }
  const body = new Path2D(crest);
  body.lineTo(endX, height + HILL_BOTTOM_OVERSHOOT);
  body.lineTo(startX, height + HILL_BOTTOM_OVERSHOOT);
  body.closePath();
  return { spec, body, crest };
}

function buildShapes(context: CanvasRenderingContext2D, width: number, height: number): BackdropShapes {
  return {
    width,
    height,
    sun: buildSun(context, width, height),
    hills: HILLS.map(spec => buildHill(spec, width, height)),
    // Unit circle, stretched into a band by the transform at paint time.
    cloudGlow: buildGlow(context, 0, 0, 1, CLOUD_GLOW_GRAY, CLOUD_GLOW_STOPS),
  };
}

function getShapes(context: CanvasRenderingContext2D, width: number, height: number): BackdropShapes {
  const cached = shapesByContext.get(context);
  if (cached && cached.width === width && cached.height === height) return cached;
  const shapes = buildShapes(context, width, height);
  shapesByContext.set(context, shapes);
  return shapes;
}

function paintSun(context: CanvasRenderingContext2D, sun: Sun) {
  context.fillStyle = sun.glow;
  context.fill(sun.disc);
  context.strokeStyle = SUN_RING_COLOR;
  context.lineWidth = SUN_RING_WIDTH;
  context.stroke(sun.ring);
}

function paintCloud(
  context: CanvasRenderingContext2D,
  shapes: BackdropShapes,
  cloud: CloudSpec,
  timeMs: number,
) {
  const length = shapes.width * cloud.lengthShare;
  const thickness = shapes.height * cloud.thicknessShare;
  const progress = (cloud.startShare + timeMs / cloud.crossingMs) % 1;
  const centerX = -length / 2 + (shapes.width + length) * progress;
  const centerY = shapes.height * cloud.heightShare;

  context.fillStyle = shapes.cloudGlow;
  for (const [offset, rise, lengthShare, thicknessShare] of CLOUD_PUFFS) {
    context.save();
    context.translate(centerX + offset * length, centerY + rise * thickness);
    context.scale(length / 2 * lengthShare, thickness / 2 * thicknessShare);
    context.beginPath();
    context.arc(0, 0, 1, 0, Math.PI * 2);
    context.fill();
    context.restore();
  }
}

function paintHill(context: CanvasRenderingContext2D, hill: Hill, timeMs: number) {
  const { spec } = hill;
  context.save();
  context.translate(Math.sin(timeMs * Math.PI * 2 / PARALLAX_PERIOD_MS) * spec.parallaxPx, 0);
  context.fillStyle = spec.fill;
  context.fill(hill.body);
  context.strokeStyle = spec.crestColor;
  context.lineWidth = HILL_CREST_WIDTH;
  context.lineJoin = 'round';
  context.stroke(hill.crest);
  context.restore();
}

export function paintLifeBackdrop(context: CanvasRenderingContext2D, width: number, height: number, timeMs: number) {
  const shapes = getShapes(context, width, height);
  paintSun(context, shapes.sun);
  for (const cloud of CLOUDS) paintCloud(context, shapes, cloud, timeMs);
  for (const hill of shapes.hills) paintHill(context, hill, timeMs);
}
