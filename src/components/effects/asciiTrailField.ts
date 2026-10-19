export interface TrailGlyph {
  col: number;
  row: number;
  glyph: string;
  alpha: number;
}

export interface TrailFieldOptions {
  cellWidth: number;
  cellHeight: number;
  maxCells: number;
  random?: () => number;
}

interface TrailCell {
  col: number;
  row: number;
  family: string;
  seed: number;
  peakAlpha: number;
  bornAt: number;
  fadeMs: number;
}

// Digits and bits, punctuation and operators, brackets, and a few symbols.
const GLYPH_FAMILIES = ['01', '.:-=+*/\\|<>~^', '[]{}()', '#$%&@'];
const FAMILY_WEIGHTS = [0.3, 0.4, 0.2, 0.1];
const FLICKER_MS = 120;
const FLICKER_STEP_MS = 40;
const FADE_MIN_MS = 900;
const FADE_MAX_MS = 1200;
// Alpha stays between these so the trail is always dull and the title stays the strongest element.
const MIN_ALPHA = 0.1;
const MAX_ALPHA = 0.45;
const MIN_RADIUS_CELLS = 2;
const MAX_RADIUS_CELLS = 4;
const SPAWN_CHANCE = 0.75;
const MAX_STEP_CELLS = 1.5;
const MAX_PATH_STEPS = 24;

function lerp(from: number, to: number, amount: number): number {
  return from + (to - from) * amount;
}

function hash(seed: number, step: number): number {
  let value = Math.imul(seed ^ Math.imul(step + 1, 0x9e3779b1), 0x85ebca6b);
  value ^= value >>> 13;
  value = Math.imul(value, 0xc2b2ae35);
  value ^= value >>> 16;
  return value >>> 0;
}

export class TrailField {
  private readonly cellWidth: number;
  private readonly cellHeight: number;
  private readonly maxCells: number;
  private readonly random: () => number;
  // Insertion order doubles as age order, so the oldest cell is always the first key.
  private readonly cells = new Map<number, TrailCell>();
  private cols = 0;
  private rows = 0;

  constructor(options: TrailFieldOptions) {
    this.cellWidth = options.cellWidth;
    this.cellHeight = options.cellHeight;
    this.maxCells = options.maxCells;
    this.random = options.random ?? Math.random;
  }

  get liveCount(): number {
    return this.cells.size;
  }

  resize(cols: number, rows: number): void {
    this.cols = cols;
    this.rows = rows;
    this.cells.clear();
  }

  clear(): void {
    this.cells.clear();
  }

  // Drops cells around the pointer, with a soft radius of 2 to 4 cells whose density and alpha fall off outward.
  spawnAt(x: number, y: number, now: number): void {
    const radius = lerp(MIN_RADIUS_CELLS, MAX_RADIUS_CELLS, this.random()) * this.cellWidth;
    const firstCol = Math.floor((x - radius) / this.cellWidth);
    const lastCol = Math.floor((x + radius) / this.cellWidth);
    const firstRow = Math.floor((y - radius) / this.cellHeight);
    const lastRow = Math.floor((y + radius) / this.cellHeight);

    for (let row = Math.max(0, firstRow); row <= Math.min(this.rows - 1, lastRow); row++) {
      for (let col = Math.max(0, firstCol); col <= Math.min(this.cols - 1, lastCol); col++) {
        const distance = Math.hypot((col + 0.5) * this.cellWidth - x, (row + 0.5) * this.cellHeight - y);
        if (distance >= radius) continue;

        const falloff = 1 - distance / radius;
        if (this.random() > SPAWN_CHANCE * falloff) continue;
        this.place(col, row, falloff, now);
      }
    }
    this.trim();
  }

  // Fills the gaps a fast pointer leaves between two move events.
  spawnAlong(fromX: number, fromY: number, toX: number, toY: number, now: number): void {
    const distance = Math.hypot(toX - fromX, toY - fromY);
    const steps = Math.min(MAX_PATH_STEPS, Math.max(1, Math.ceil(distance / (this.cellWidth * MAX_STEP_CELLS))));
    for (let step = 1; step <= steps; step++) {
      const amount = step / steps;
      this.spawnAt(lerp(fromX, toX, amount), lerp(fromY, toY, amount), now);
    }
  }

  // Returns the cells to draw at this moment and forgets the ones that have faded out.
  visibleGlyphs(now: number): TrailGlyph[] {
    const glyphs: TrailGlyph[] = [];

    for (const [key, cell] of this.cells) {
      const age = now - cell.bornAt;
      if (age >= FLICKER_MS + cell.fadeMs) {
        this.cells.delete(key);
        continue;
      }
      glyphs.push({
        col: cell.col,
        row: cell.row,
        glyph: this.glyphAt(cell, age),
        alpha: this.alphaAt(cell, age),
      });
    }
    return glyphs;
  }

  private place(col: number, row: number, falloff: number, now: number): void {
    const key = row * this.cols + col;
    this.cells.delete(key);
    this.cells.set(key, {
      col,
      row,
      family: this.pickFamily(),
      seed: Math.floor(this.random() * 0x7fffffff),
      peakAlpha: lerp(MIN_ALPHA, MAX_ALPHA, falloff * lerp(0.55, 1, this.random())),
      bornAt: now,
      fadeMs: lerp(FADE_MIN_MS, FADE_MAX_MS, this.random()),
    });
  }

  private trim(): void {
    for (const key of this.cells.keys()) {
      if (this.cells.size <= this.maxCells) return;
      this.cells.delete(key);
    }
  }

  private pickFamily(): string {
    let pick = this.random();
    for (let index = 0; index < GLYPH_FAMILIES.length; index++) {
      pick -= FAMILY_WEIGHTS[index];
      if (pick < 0) return GLYPH_FAMILIES[index];
    }
    return GLYPH_FAMILIES[GLYPH_FAMILIES.length - 1];
  }

  // The glyph keeps changing for the flicker time, then settles on the glyph the cell was born with.
  private glyphAt(cell: TrailCell, age: number): string {
    const step = age < FLICKER_MS ? Math.floor(age / FLICKER_STEP_MS) : -1;
    return cell.family[hash(cell.seed, step) % cell.family.length];
  }

  private alphaAt(cell: TrailCell, age: number): number {
    if (age < FLICKER_MS) return cell.peakAlpha;
    const remaining = 1 - (age - FLICKER_MS) / cell.fadeMs;
    return cell.peakAlpha * remaining * remaining;
  }
}
