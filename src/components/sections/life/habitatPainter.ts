const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));
const SCENE_WIDTH = 1440;
const SCENE_HEIGHT = 900;

const STEMS: readonly [string, number, number][] = [
  ['M 44 910 C 112 764 146 628 181 514 C 207 431 225 388 247 370', 8, 1],
  ['M 115 910 C 138 800 198 694 231 577 C 248 516 255 458 249 406', 4, 1],
  ['M 42 792 C 109 756 154 719 195 665', 3, 1],
  ['M 86 686 C 139 665 175 634 208 590', 2.8, 1],
  ['M 147 564 C 183 548 213 519 235 481', 2.5, 1],
  ['M 258 900 C 301 800 325 726 360 655 C 383 609 407 584 441 560', 3.5, 0.72],
  ['M 1440 885 C 1370 805 1310 733 1250 670', 6, 1],
  ['M 1424 900 C 1405 806 1412 711 1394 621 C 1382 562 1362 516 1336 476', 3.5, 1],
  ['M 1440 744 C 1393 725 1362 695 1338 658', 2.6, 1],
  ['M 1432 621 C 1387 601 1361 571 1344 534', 2.5, 1],
];

const LEAVES: readonly [number, number, number, number][] = [
  [95, 782, -34, 64],
  [166, 677, -24, 56],
  [193, 600, -49, 49],
  [216, 532, -21, 43],
  [141, 661, 157, 48],
  [193, 503, 144, 44],
  [329, 720, -38, 60],
  [385, 612, -28, 48],
  [1387, 794, -149, 58],
  [1347, 672, -133, 53],
  [1388, 603, -155, 48],
  [1364, 552, -119, 41],
];

const LEAF_STEMS = [0, 2, 3, 4, 3, 0, 5, 5, 7, 8, 7, 9];
const LEAF_COLORS: readonly [string, string] = ['#1c1c1c', '#8f8f8f'];
const LEAF_VEIN_STARTS = [0.2, 0.38, 0.56, 0.74];

// Each bud sits on the tip of a side stem, [stem, x, y, angle in degrees, length].
const BUDS: readonly [number, number, number, number, number][] = [
  [5, 441, 560, -35, 30],
  [7, 1336, 476, -123, 26],
  [8, 1338, 658, -124, 24],
];
const BUD_COLORS: readonly [string, string] = ['#2b2b2b', '#8a8a8a'];

type FlowerSpec = {
  stemIndex: number;
  x: number;
  y: number;
  radius: number;
  petalCount: number;
  seedCount: number;
  turnOffset: number;
};

const FLOWERS: readonly FlowerSpec[] = [
  { stemIndex: 0, x: 250, y: 380, radius: 132, petalCount: 12, seedCount: 16, turnOffset: 0.32 },
  { stemIndex: 6, x: 1250, y: 670, radius: 79, petalCount: 9, seedCount: 10, turnOffset: 1.18 },
];

type PetalLayer = {
  baseRadius: number;
  tipRadius: number;
  fill: readonly [string, string];
  edge: readonly [string, string];
  stepOffset: number;
};

// Radii are shares of the flower radius. The inner layer is shorter, darker and half a petal off.
const PETAL_LAYERS: readonly PetalLayer[] = [
  { baseRadius: 0.2, tipRadius: 1.05, fill: ['#2b2b2b', '#a8a8a8'], edge: ['#141414', '#707070'], stepOffset: 0 },
  { baseRadius: 0.18, tipRadius: 0.7, fill: ['#1f1f1f', '#8a8a8a'], edge: ['#101010', '#555555'], stepOffset: 0.5 },
];
const PETAL_WIDEST_AT = 0.69;
const PETAL_FILL_SHARE = 0.94;
const PETAL_EDGE_WIDTH = 1.5;
const PETAL_OPEN_AMPLITUDE = 0.05;
const PETAL_OPEN_SPEED = 0.0012;
const DISC_RADIUS_SHARE = 0.27;
const SEED_RADIUS_SHARE = 0.026;

const GRASS_BLADE_COUNT = 170;
const GRASS_COLORS = ['#b0b0b0', '#969696', '#7c7c7c'];
const GRASS_MAX_SHARE = 0.62;
const GRASS_MIN_HEIGHT_IN_TITLE_ZONE = 0.3;
const MEADOW_HEIGHT_SHARE = 0.18;
const MEADOW_PETAL_COUNT = 5;
// [position across the scene, depth from 0 (near) to 1 (far)], farthest first so near flowers paint last.
const MEADOW_FLOWERS: readonly [number, number][] = [
  [0.33, 0.9], [0.67, 0.85], [0.07, 0.8], [0.85, 0.6], [0.16, 0.55], [0.74, 0.3], [0.26, 0.2], [0.94, 0.15],
];

const POLLEN_COUNT = 26;
const POLLEN_RISE = 40;

// The title and the bird live in the HTML above this canvas, so the quiet layers keep away from them.
// 60 percent of the 610 px, 80vw section title (see MatrixTitle.css).
const TITLE_MAX_WIDTH = 366;
const TITLE_WIDTH_SHARE = 0.48;
const TITLE_CLEARANCE_MARGIN = 36;
const TITLE_CLEARANCE_RAMP = 110;
const BIRD_MAX_WIDTH = 820;
const BIRD_WIDTH_SHARE = 0.82;
const BIRD_ASPECT = 34 / 51;
const BIRD_CENTER_SHARE = 0.41;
const BIRD_MAX_HEIGHT_SHARE = 0.37;

type Stem = { path: Path2D; baseX: number; baseY: number; amplitude: number };
type Leaf = { outline: Path2D; midrib: Path2D; sideVeins: Path2D };
type Bud = { body: Path2D; sepals: Path2D };
type FlowerShapes = {
  petals: Path2D[];
  seeds: [number, number][];
  seedRadius: number;
  discRadius: number;
};
type GrassBlade = { position: number; path: Path2D; heightShare: number; fill: string; sway: number };
type MeadowFlower = {
  position: number;
  radius: number;
  stemShare: number;
  petalColor: string;
  stemColor: string;
  centerColor: string;
  tilt: number;
  rotation: number;
};
type PollenSpeck = {
  height: number;
  radius: number;
  opacity: number;
  periodMs: number;
  phase: number;
  waveHeight: number;
  waveCycles: number;
};
type HabitatShapes = {
  stems: Stem[];
  leaves: Leaf[];
  buds: Bud[];
  flowers: FlowerShapes[];
  grass: GrassBlade[];
  meadowFlowers: MeadowFlower[];
  meadowPetal: Path2D;
  pollen: PollenSpeck[];
};

type FlowerStyles = { petalFills: CanvasGradient[]; petalEdges: CanvasGradient[] };
type HabitatStyles = { leafFills: CanvasGradient[]; budFills: CanvasGradient[]; flowers: FlowerStyles[] };

type SceneLayout = {
  scale: number;
  offsetX: number;
  offsetY: number;
  left: number;
  top: number;
  bottom: number;
  width: number;
  visibleHeight: number;
  meadowHeight: number;
  titleHalfWidth: number;
  titleRamp: number;
  birdHalfWidth: number;
  birdHalfHeight: number;
  birdCenterY: number;
};

let cachedShapes: HabitatShapes | undefined;
let cachedStyles: { context: CanvasRenderingContext2D; styles: HabitatStyles } | undefined;

function createRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let mixed = Math.imul(state ^ (state >>> 15), 1 | state);
    mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed;
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}

function smoothstep(from: number, to: number, value: number): number {
  const progress = Math.min(1, Math.max(0, (value - from) / (to - from)));
  return progress * progress * (3 - 2 * progress);
}

function grayHex(level: number): string {
  return `#${Math.round(level).toString(16).padStart(2, '0').repeat(3)}`;
}

// Ease into the wind so the initial frame retains the original composition.
function swayAngle(timeMs: number, periodMs: number, phase: number, amplitudeDegrees: number): number {
  return amplitudeDegrees * Math.PI / 180
    * Math.sin(timeMs * Math.PI * 2 / periodMs + phase) * Math.min(1, timeMs / 1000);
}

function buildStems(): Stem[] {
  return STEMS.map(([path]) => {
    const coordinates = path.match(/-?\d+(?:\.\d+)?/g)!.map(Number);
    const baseX = coordinates[0];
    const baseY = coordinates[1];
    const length = Math.hypot(coordinates.at(-2)! - baseX, coordinates.at(-1)! - baseY);
    return { path: new Path2D(path), baseX, baseY, amplitude: Math.min(2.5, 1.2 + length / 450) };
  });
}

function buildLeaf(length: number): Leaf {
  const midrib = new Path2D(`M ${length * 0.04} 0 L ${length * 0.86} 0`);
  const sideVeins = new Path2D();
  LEAF_VEIN_STARTS.forEach((start, index) => {
    const side = index % 2 === 0 ? -1 : 1;
    const end = start + 0.17;
    const reach = 0.65 * 0.15 * length * Math.sin(Math.PI * end);
    sideVeins.moveTo(start * length, 0);
    sideVeins.lineTo(end * length, side * reach);
  });
  return {
    outline: new Path2D(`M 0 0 Q ${length * 0.25} ${-length * 0.32} ${length} 0 Q ${length * 0.35} ${length * 0.28} 0 0 Z`),
    midrib,
    sideVeins,
  };
}

function buildBud(length: number): Bud {
  const halfWidth = length * 0.2;
  const body = new Path2D();
  body.moveTo(0, 0);
  body.bezierCurveTo(length * 0.1, -halfWidth * 1.5, length * 0.62, -halfWidth * 1.4, length, 0);
  body.bezierCurveTo(length * 0.62, halfWidth * 1.4, length * 0.1, halfWidth * 1.5, 0, 0);
  body.closePath();

  const sepals = new Path2D();
  for (const side of [-1, 1]) {
    sepals.moveTo(0, 0);
    sepals.quadraticCurveTo(length * 0.3, side * halfWidth * 2.1, length * 0.62, side * halfWidth * 1.1);
    sepals.quadraticCurveTo(length * 0.3, side * halfWidth, 0, 0);
    sepals.closePath();
  }
  return { body, sepals };
}

// A teardrop along +x, narrow at the base and widest near the tip.
function buildPetalPath(baseRadius: number, tipRadius: number, halfWidth: number): Path2D {
  const length = tipRadius - baseRadius;
  const path = new Path2D();
  path.moveTo(baseRadius, 0);
  path.bezierCurveTo(baseRadius + length * 0.28, -halfWidth * 0.67, baseRadius + length * 0.78, -halfWidth * 1.9, tipRadius, 0);
  path.bezierCurveTo(baseRadius + length * 0.78, halfWidth * 1.9, baseRadius + length * 0.28, halfWidth * 0.67, baseRadius, 0);
  path.closePath();
  return path;
}

// Wide enough that neighbours nearly touch where the petals are widest, leaving gaps toward the tips.
function buildRingPetalPath(baseRadius: number, tipRadius: number, petalCount: number): Path2D {
  const widestRadius = baseRadius + (tipRadius - baseRadius) * PETAL_WIDEST_AT;
  const halfWidth = Math.PI * widestRadius / petalCount * PETAL_FILL_SHARE;
  return buildPetalPath(baseRadius, tipRadius, halfWidth);
}

function buildFlowerShapes(flower: FlowerSpec): FlowerShapes {
  const petals = PETAL_LAYERS.map(layer =>
    buildRingPetalPath(flower.radius * layer.baseRadius, flower.radius * layer.tipRadius, flower.petalCount));

  const discRadius = flower.radius * DISC_RADIUS_SHARE;
  const seeds: [number, number][] = [];
  for (let index = 0; index < flower.seedCount; index++) {
    const reach = discRadius * 0.85 * Math.sqrt((index + 0.5) / flower.seedCount);
    seeds.push([Math.cos(index * GOLDEN_ANGLE) * reach, Math.sin(index * GOLDEN_ANGLE) * reach]);
  }
  return { petals, seeds, seedRadius: flower.radius * SEED_RADIUS_SHARE, discRadius };
}

// Unit height, so one path serves any blade height and the base width stays proportional to it.
function buildBladePath(lean: number, halfWidth: number): Path2D {
  const path = new Path2D();
  path.moveTo(-halfWidth, 0);
  path.quadraticCurveTo(lean * 0.25 - halfWidth * 0.6, -0.55, lean, -1);
  path.quadraticCurveTo(lean * 0.25 + halfWidth * 0.6, -0.55, halfWidth, 0);
  path.closePath();
  return path;
}

function buildGrass(): GrassBlade[] {
  const random = createRandom(11);
  const blades: GrassBlade[] = [];
  for (let index = 0; index < GRASS_BLADE_COUNT; index++) {
    blades.push({
      position: (index + random()) / GRASS_BLADE_COUNT,
      path: buildBladePath((random() - 0.5) * 0.3, 0.015 + random() * 0.014),
      heightShare: 0.25 + 0.75 * random() ** 1.6,
      fill: GRASS_COLORS[Math.floor(random() * GRASS_COLORS.length)],
      sway: 3 + random() * 2,
    });
  }
  return blades;
}

function buildMeadowFlowers(): MeadowFlower[] {
  const random = createRandom(23);
  return MEADOW_FLOWERS.map(([position, depth]) => {
    const petalLevel = 0x9a + depth * 0x2e;
    return {
      position,
      radius: 14 - 5 * depth,
      stemShare: 0.82 - 0.3 * depth,
      petalColor: grayHex(petalLevel),
      stemColor: grayHex(petalLevel - 0x20),
      centerColor: grayHex(0x58 + depth * 0x30),
      tilt: (random() - 0.5) * 0.2,
      rotation: random() * Math.PI * 2 / MEADOW_PETAL_COUNT,
    };
  });
}

function buildPollen(): PollenSpeck[] {
  const random = createRandom(7);
  const specks: PollenSpeck[] = [];
  for (let index = 0; index < POLLEN_COUNT; index++) {
    specks.push({
      height: 0.08 + random() * 0.62,
      radius: 1.2 + random() * 1.2,
      opacity: 0.55 + random() * 0.45,
      periodMs: 50000 + random() * 40000,
      phase: random(),
      waveHeight: 18 + random() * 34,
      waveCycles: 1.5 + random() * 2.5,
    });
  }
  return specks;
}

function buildShapes(): HabitatShapes {
  return {
    stems: buildStems(),
    leaves: LEAVES.map(([, , , length]) => buildLeaf(length)),
    buds: BUDS.map(([, , , , length]) => buildBud(length)),
    flowers: FLOWERS.map(buildFlowerShapes),
    grass: buildGrass(),
    meadowFlowers: buildMeadowFlowers(),
    meadowPetal: buildRingPetalPath(0.18, 1, MEADOW_PETAL_COUNT),
    pollen: buildPollen(),
  };
}

function createLinearFill(context: CanvasRenderingContext2D, length: number, colors: readonly [string, string]) {
  const gradient = context.createLinearGradient(0, 0, length, 0);
  gradient.addColorStop(0, colors[0]);
  gradient.addColorStop(1, colors[1]);
  return gradient;
}

function createRadialFill(
  context: CanvasRenderingContext2D,
  innerRadius: number,
  outerRadius: number,
  colors: readonly [string, string],
) {
  const gradient = context.createRadialGradient(0, 0, innerRadius, 0, 0, outerRadius);
  gradient.addColorStop(0, colors[0]);
  gradient.addColorStop(1, colors[1]);
  return gradient;
}

function buildStyles(context: CanvasRenderingContext2D): HabitatStyles {
  return {
    leafFills: LEAVES.map(([, , , length]) => createLinearFill(context, length, LEAF_COLORS)),
    budFills: BUDS.map(([, , , , length]) => createLinearFill(context, length, BUD_COLORS)),
    flowers: FLOWERS.map(flower => ({
      petalFills: PETAL_LAYERS.map(layer =>
        createRadialFill(context, flower.radius * layer.baseRadius, flower.radius * layer.tipRadius, layer.fill)),
      petalEdges: PETAL_LAYERS.map(layer =>
        createRadialFill(context, flower.radius * layer.baseRadius, flower.radius * layer.tipRadius, layer.edge)),
    })),
  };
}

function getShapes(): HabitatShapes {
  cachedShapes ??= buildShapes();
  return cachedShapes;
}

function getStyles(context: CanvasRenderingContext2D): HabitatStyles {
  if (cachedStyles?.context !== context) {
    cachedStyles = { context, styles: buildStyles(context) };
  }
  return cachedStyles.styles;
}

function measureScene(width: number, height: number): SceneLayout {
  const scale = Math.min(width / SCENE_WIDTH, height / SCENE_HEIGHT);
  const offsetX = (width - SCENE_WIDTH * scale) / 2;
  const offsetY = (height - SCENE_HEIGHT * scale) / 2;
  const visibleHeight = height / scale;
  const top = -offsetY / scale;
  const birdHalfWidth = Math.min(width * BIRD_WIDTH_SHARE, BIRD_MAX_WIDTH) / 2 / scale;
  return {
    scale,
    offsetX,
    offsetY,
    left: -offsetX / scale,
    top,
    bottom: top + visibleHeight,
    width: width / scale,
    visibleHeight,
    meadowHeight: visibleHeight * MEADOW_HEIGHT_SHARE,
    titleHalfWidth: (Math.min(TITLE_MAX_WIDTH, width * TITLE_WIDTH_SHARE) / 2 + TITLE_CLEARANCE_MARGIN) / scale,
    titleRamp: TITLE_CLEARANCE_RAMP / scale,
    birdHalfWidth,
    birdHalfHeight: Math.min(birdHalfWidth * BIRD_ASPECT, visibleHeight * BIRD_MAX_HEIGHT_SHARE),
    birdCenterY: top + visibleHeight * BIRD_CENTER_SHARE,
  };
}

// 0 inside the strip above the title, 1 once the ramp beside it is crossed.
function titleClearance(x: number, scene: SceneLayout): number {
  const distance = Math.abs(x - SCENE_WIDTH / 2) - scene.titleHalfWidth;
  return smoothstep(0, scene.titleRamp, distance);
}

function birdClearance(x: number, y: number, scene: SceneLayout): number {
  const distance = Math.hypot((x - SCENE_WIDTH / 2) / scene.birdHalfWidth, (y - scene.birdCenterY) / scene.birdHalfHeight);
  return smoothstep(1, 1.35, distance);
}

function transformStem(context: CanvasRenderingContext2D, shapes: HabitatShapes, index: number, timeMs: number) {
  const stem = shapes.stems[index];
  const period = 4000 + index % 4 * 1000;
  context.save();
  context.translate(stem.baseX, stem.baseY);
  context.rotate(swayAngle(timeMs, period, index * 1.73, stem.amplitude));
  context.translate(-stem.baseX, -stem.baseY);
}

function paintCircle(context: CanvasRenderingContext2D, x: number, y: number, radius: number) {
  context.beginPath();
  context.arc(x, y, radius, 0, Math.PI * 2);
  context.fill();
}

function paintStems(context: CanvasRenderingContext2D, shapes: HabitatShapes, timeMs: number) {
  context.strokeStyle = '#2b2b2b';
  context.lineCap = 'round';
  context.lineJoin = 'round';
  for (let index = 0; index < STEMS.length; index++) {
    const [, width, opacity] = STEMS[index];
    transformStem(context, shapes, index, timeMs);
    context.lineWidth = width;
    context.globalAlpha = opacity;
    context.stroke(shapes.stems[index].path);
    context.restore();
  }
  context.globalAlpha = 1;
}

function paintLeaves(context: CanvasRenderingContext2D, shapes: HabitatShapes, styles: HabitatStyles, timeMs: number) {
  for (let index = 0; index < LEAVES.length; index++) {
    const [x, y, angle] = LEAVES[index];
    const leaf = shapes.leaves[index];
    transformStem(context, shapes, LEAF_STEMS[index], timeMs);
    context.translate(x, y);
    context.rotate(angle * Math.PI / 180);
    context.fillStyle = styles.leafFills[index];
    context.fill(leaf.outline);
    context.strokeStyle = '#d0d0d0';
    context.lineCap = 'butt';
    context.globalAlpha = 0.85;
    context.lineWidth = 2;
    context.stroke(leaf.midrib);
    context.lineWidth = 1.3;
    context.stroke(leaf.sideVeins);
    context.restore();
  }
}

function paintBuds(context: CanvasRenderingContext2D, shapes: HabitatShapes, styles: HabitatStyles, timeMs: number) {
  for (let index = 0; index < BUDS.length; index++) {
    const [stemIndex, x, y, angle] = BUDS[index];
    const bud = shapes.buds[index];
    transformStem(context, shapes, stemIndex, timeMs);
    context.translate(x, y);
    context.rotate(angle * Math.PI / 180);
    context.lineJoin = 'round';
    context.lineWidth = 1.4;
    context.strokeStyle = '#141414';
    context.fillStyle = styles.budFills[index];
    context.fill(bud.body);
    context.stroke(bud.body);
    context.fillStyle = '#2b2b2b';
    context.fill(bud.sepals);
    context.stroke(bud.sepals);
    context.restore();
  }
}

function paintPetalLayer(
  context: CanvasRenderingContext2D,
  flower: FlowerSpec,
  petal: Path2D,
  layer: PetalLayer,
  turn: number,
  timeMs: number,
) {
  const openingEase = Math.min(1, timeMs / 1000);
  const petalStep = Math.PI * 2 / flower.petalCount;
  for (let index = 0; index < flower.petalCount; index++) {
    const opening = 1 + PETAL_OPEN_AMPLITUDE * Math.sin(timeMs * PETAL_OPEN_SPEED + index * 0.45) * openingEase;
    const lengthVariation = 1 + ((index * 7) % 5 - 2) * 0.025;
    context.save();
    context.rotate(turn + (index + layer.stepOffset) * petalStep);
    context.scale(opening * lengthVariation, 1);
    context.fill(petal);
    context.stroke(petal);
    context.restore();
  }
}

function paintFlowerCenter(context: CanvasRenderingContext2D, shapes: FlowerShapes) {
  context.fillStyle = '#111111';
  paintCircle(context, 0, 0, shapes.discRadius);
  context.fillStyle = '#c8c8c8';
  context.globalAlpha = 0.85;
  for (const [x, y] of shapes.seeds) {
    paintCircle(context, x, y, shapes.seedRadius);
  }
  context.globalAlpha = 1;
}

function paintFlower(
  context: CanvasRenderingContext2D,
  flower: FlowerSpec,
  shapes: FlowerShapes,
  styles: FlowerStyles,
  timeMs: number,
) {
  const turn = flower.turnOffset + timeMs * Math.PI * 2 / 90000;
  context.lineWidth = PETAL_EDGE_WIDTH;
  context.lineJoin = 'round';
  context.globalAlpha = 1;
  for (let layerIndex = 0; layerIndex < PETAL_LAYERS.length; layerIndex++) {
    context.fillStyle = styles.petalFills[layerIndex];
    context.strokeStyle = styles.petalEdges[layerIndex];
    paintPetalLayer(context, flower, shapes.petals[layerIndex], PETAL_LAYERS[layerIndex], turn, timeMs);
  }
  paintFlowerCenter(context, shapes);
}

function paintFlowers(context: CanvasRenderingContext2D, shapes: HabitatShapes, styles: HabitatStyles, timeMs: number) {
  for (let index = 0; index < FLOWERS.length; index++) {
    const flower = FLOWERS[index];
    transformStem(context, shapes, flower.stemIndex, timeMs);
    context.translate(flower.x, flower.y);
    paintFlower(context, flower, shapes.flowers[index], styles.flowers[index], timeMs);
    context.restore();
  }
}

function paintGrass(context: CanvasRenderingContext2D, shapes: HabitatShapes, scene: SceneLayout, timeMs: number) {
  const tallestBlade = scene.meadowHeight * GRASS_MAX_SHARE;
  for (let index = 0; index < shapes.grass.length; index++) {
    const blade = shapes.grass[index];
    const x = scene.left + blade.position * scene.width;
    const clearance = GRASS_MIN_HEIGHT_IN_TITLE_ZONE + (1 - GRASS_MIN_HEIGHT_IN_TITLE_ZONE) * titleClearance(x, scene);
    const height = tallestBlade * blade.heightShare * clearance;
    context.save();
    context.translate(x, scene.bottom + 2);
    context.rotate(swayAngle(timeMs, 4000 + index % 4 * 1000, blade.position * 6, blade.sway));
    context.scale(height, height);
    context.fillStyle = blade.fill;
    context.fill(blade.path);
    context.restore();
  }
}

function paintMeadowFlowers(context: CanvasRenderingContext2D, shapes: HabitatShapes, scene: SceneLayout, timeMs: number) {
  const petalStep = Math.PI * 2 / MEADOW_PETAL_COUNT;
  context.lineCap = 'round';
  for (let index = 0; index < shapes.meadowFlowers.length; index++) {
    const flower = shapes.meadowFlowers[index];
    const x = scene.left + flower.position * scene.width;
    if (titleClearance(x, scene) === 0) continue;
    const stemHeight = scene.meadowHeight * flower.stemShare;
    context.save();
    context.translate(x, scene.bottom + 2);
    context.rotate(flower.tilt + swayAngle(timeMs, 4600 + index % 3 * 900, flower.position * 6, 2.6));
    context.strokeStyle = flower.stemColor;
    context.lineWidth = 1.8;
    context.beginPath();
    context.moveTo(0, 0);
    context.lineTo(0, -stemHeight);
    context.stroke();
    context.translate(0, -stemHeight);
    context.rotate(flower.rotation);
    context.scale(flower.radius, flower.radius);
    context.fillStyle = flower.petalColor;
    for (let petal = 0; petal < MEADOW_PETAL_COUNT; petal++) {
      context.fill(shapes.meadowPetal);
      context.rotate(petalStep);
    }
    context.fillStyle = flower.centerColor;
    paintCircle(context, 0, 0, 0.24);
    context.restore();
  }
}

function paintPollen(context: CanvasRenderingContext2D, shapes: HabitatShapes, scene: SceneLayout, timeMs: number) {
  context.fillStyle = '#7a7a7a';
  for (const speck of shapes.pollen) {
    const progress = (timeMs / speck.periodMs + speck.phase) % 1;
    const wave = Math.sin((progress * speck.waveCycles + speck.phase) * Math.PI * 2);
    const x = scene.left + progress * scene.width;
    const y = scene.top + speck.height * scene.visibleHeight + speck.waveHeight * wave - POLLEN_RISE * progress;
    const edgeFade = Math.min(1, progress / 0.1, (1 - progress) / 0.1);
    context.globalAlpha = speck.opacity * edgeFade * birdClearance(x, y, scene);
    paintCircle(context, x, y, speck.radius);
  }
  context.globalAlpha = 1;
}

export function paintHabitat(context: CanvasRenderingContext2D, width: number, height: number, timeMs: number) {
  const shapes = getShapes();
  const styles = getStyles(context);
  const scene = measureScene(width, height);
  context.save();
  context.translate(scene.offsetX, scene.offsetY);
  context.scale(scene.scale, scene.scale);
  paintGrass(context, shapes, scene, timeMs);
  paintMeadowFlowers(context, shapes, scene, timeMs);
  paintStems(context, shapes, timeMs);
  paintLeaves(context, shapes, styles, timeMs);
  paintBuds(context, shapes, styles, timeMs);
  paintFlowers(context, shapes, styles, timeMs);
  paintPollen(context, shapes, scene, timeMs);
  context.restore();
}
