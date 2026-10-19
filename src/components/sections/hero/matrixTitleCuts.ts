// Glitch cuts: now and then a band of the title drifts sideways a hair and dissolves into hexadecimal digits
// for a moment, then settles back, like a gentle digital shimmer. This file decides when and where; the
// view draws them.

export interface CutBand {
  // Vertical extent in em, measured from the cap line of the first line.
  topEm: number;
  bottomEm: number;
  // Sideways drift: a direction and a distance in em.
  direction: -1 | 1;
  shiftEm: number;
  // The band drifts out and fades in over fadeInMs, then eases back and fades out over fadeOutMs.
  fadeInMs: number;
  fadeOutMs: number;
  // How much of the band is hexadecimal digits at the peak, from 0 to 1.
  peakOpacity: number;
  // performance.now() time at which the band is gone.
  endsAt: number;
  // Picks the hexadecimal digits this band shows.
  seed: number;
}

export interface CutSurface {
  setCuts(bands: readonly CutBand[]): void;
  // Changes the digits the bands show.
  stepDigits(step: number): void;
}

interface Range {
  min: number;
  max: number;
}

const RANDOM_EVENT_INTERVAL_MS: Range = { min: 2600, max: 5500 };
const EVENT_BAND_COUNT: Range = { min: 1, max: 3 };
const FADE_IN_MS: Range = { min: 80, max: 110 };
const FADE_OUT_MS: Range = { min: 120, max: 190 };
const DIGIT_STEP_MS: Range = { min: 70, max: 90 };
const PEAK_OPACITY: Range = { min: 0.6, max: 0.85 };
// Short bands that each touch a line or only part of a line.
const FIRST_BAND_TOP_EM: Range = { min: 0, max: 0.3 };
const BAND_HEIGHT_EM: Range = { min: 0.08, max: 0.2 };
const BAND_GAP_EM: Range = { min: 0.08, max: 0.35 };
const BAND_SHIFT_EM: Range = { min: 0.03, max: 0.12 };
// Small titles scale the drift down, so it never goes below this and always stays visible.
const MIN_SHIFT_PX = 1.5;
const MIN_VISIBLE_BAND_EM = 0.05;
// The clip reaches this far past the block on every side so halos and the cursor are never cropped.
const CLIP_MARGIN = '1em';

function randomIn(range: Range): number {
  return range.min + Math.random() * (range.max - range.min);
}

function randomIntIn(range: Range): number {
  return Math.floor(range.min + Math.random() * (range.max - range.min + 1));
}

// Bands run from the top of the block downward with random gaps, drifting alternately left and right.
function createBands(blockEm: number, count: number, now: number): CutBand[] {
  const seed = randomIntIn({ min: 0, max: 999999 });
  const bands: CutBand[] = [];
  let direction: -1 | 1 = Math.random() < 0.5 ? -1 : 1;
  let top = randomIn(FIRST_BAND_TOP_EM);

  while (bands.length < count && top < blockEm) {
    const bottom = Math.min(top + randomIn(BAND_HEIGHT_EM), blockEm);
    if (bottom - top < MIN_VISIBLE_BAND_EM) break;

    const fadeInMs = randomIn(FADE_IN_MS);
    const fadeOutMs = randomIn(FADE_OUT_MS);
    bands.push({
      topEm: top,
      bottomEm: bottom,
      direction,
      shiftEm: randomIn(BAND_SHIFT_EM),
      fadeInMs,
      fadeOutMs,
      peakOpacity: randomIn(PEAK_OPACITY),
      endsAt: now + fadeInMs + fadeOutMs,
      seed: seed + bands.length,
    });
    direction = direction === 1 ? -1 : 1;
    top = bottom + randomIn(BAND_GAP_EM);
  }
  return bands;
}

// The distance is in em, with a floor in pixels. The max() is inside calc() so the sign stays.
export function bandShiftTransform(band: CutBand): string {
  return `translateX(calc(${band.direction} * max(${MIN_SHIFT_PX}px, ${band.shiftEm}em)))`;
}

// Shows only one band. The polygon runs along the edges of the clip area.
export function bandClipPath(band: CutBand): string {
  const left = `-${CLIP_MARGIN}`;
  const right = `calc(100% + ${CLIP_MARGIN})`;
  return `polygon(${left} ${band.topEm}em, ${right} ${band.topEm}em, ${right} ${band.bottomEm}em, ${left} ${band.bottomEm}em)`;
}

// Shows everything except the bands: the gaps between them, joined along the left edge by zero-width links.
// Bands must be sorted from top to bottom and must not overlap.
export function gapClipPath(bands: readonly CutBand[]): string {
  const left = `-${CLIP_MARGIN}`;
  const right = `calc(100% + ${CLIP_MARGIN})`;
  const top = `-${CLIP_MARGIN}`;
  const bottom = `calc(100% + ${CLIP_MARGIN})`;

  const points = [`${left} ${top}`, `${right} ${top}`];
  for (const band of bands) {
    points.push(
      `${right} ${band.topEm}em`,
      `${left} ${band.topEm}em`,
      `${left} ${band.bottomEm}em`,
      `${right} ${band.bottomEm}em`,
    );
  }
  points.push(`${right} ${bottom}`, `${left} ${bottom}`);
  return `polygon(${points.join(', ')})`;
}

// Decides when cuts happen, with a single timeout chain. A cut of one to three bands comes 2.6 to 5.5
// seconds after the last cut, and a burst of one soft band fires when a phrase has just been typed and
// right before erasing begins. Every cut restarts the random wait, so cuts never bunch up.
export class CutDirector {
  private readonly surface: CutSurface;
  private readonly blockEm: number;
  private active: CutBand[] = [];
  private digitStep = 0;
  private nextDigitStepAt = 0;
  private nextRandomEventAt = 0;
  private timer: number | undefined;
  private running = false;

  constructor(surface: CutSurface, blockEm: number) {
    this.surface = surface;
    this.blockEm = blockEm;
  }

  start(): void {
    this.running = true;
    this.nextRandomEventAt = performance.now() + randomIn(RANDOM_EVENT_INTERVAL_MS);
    this.scheduleWake();
  }

  // A burst is skipped while a cut is still fading, so bands never replace each other abruptly.
  burst(): void {
    if (!this.running || this.active.length > 0) return;
    this.fire(performance.now(), 1);
    this.scheduleWake();
  }

  // Everything is dropped and nothing is scheduled until resume, so a hidden tab costs nothing.
  pause(): void {
    this.running = false;
    window.clearTimeout(this.timer);
    this.timer = undefined;
    if (this.active.length === 0) return;
    this.active = [];
    this.surface.setCuts(this.active);
  }

  resume(): void {
    this.start();
  }

  private fire(now: number, bandCount: number): void {
    this.active = createBands(this.blockEm, bandCount, now);
    this.surface.setCuts(this.active);

    this.digitStep = 0;
    this.nextDigitStepAt = now + randomIn(DIGIT_STEP_MS);
    this.nextRandomEventAt = now + randomIn(RANDOM_EVENT_INTERVAL_MS);
  }

  private wake = (): void => {
    const now = performance.now();

    const stillActive = this.active.filter(band => band.endsAt > now);
    if (stillActive.length !== this.active.length) {
      this.active = stillActive;
      this.surface.setCuts(this.active);
    }

    if (this.active.length > 0 && now >= this.nextDigitStepAt) {
      this.digitStep += 1;
      this.surface.stepDigits(this.digitStep);
      this.nextDigitStepAt = now + randomIn(DIGIT_STEP_MS);
    }

    if (now >= this.nextRandomEventAt) this.fire(now, randomIntIn(EVENT_BAND_COUNT));
    this.scheduleWake();
  };

  private scheduleWake(): void {
    window.clearTimeout(this.timer);
    const deadlines = [this.nextRandomEventAt, ...this.active.map(band => band.endsAt)];
    if (this.active.length > 0) deadlines.push(this.nextDigitStepAt);

    const delay = Math.max(0, Math.min(...deadlines) - performance.now());
    this.timer = window.setTimeout(this.wake, delay);
  }
}
