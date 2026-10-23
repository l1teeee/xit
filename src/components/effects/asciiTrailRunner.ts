import { SCENE_PALETTE } from '@/data/scenePalette';
import { readFontFamily } from '@/lib/fontFamily';
import { TrailField } from './asciiTrailField';

const CELL_WIDTH_PX = 10;
const CELL_HEIGHT_PX = 16;
const FONT_PX = 15;
const FONT_WEIGHT = 500;
const MAX_LIVE_CELLS = 260;
// A move after a longer pause starts a new stroke instead of drawing a line from the old position.
const STROKE_GAP_MS = 80;

function hexToRgbList(hex: string): string {
  const red = parseInt(hex.slice(1, 3), 16);
  const green = parseInt(hex.slice(3, 5), 16);
  const blue = parseInt(hex.slice(5, 7), 16);
  return `${red}, ${green}, ${blue}`;
}

// The hero ink, so the trail reads as the same color as the hero's background marks.
const TRAIL_RGB = hexToRgbList(SCENE_PALETTE.index.ink);

export async function loadAsciiTrailFont(): Promise<string> {
  const family = readFontFamily('--font-jetbrains-mono');
  await document.fonts.load(`${FONT_WEIGHT} ${FONT_PX}px ${family}`);
  await document.fonts.ready;
  return family;
}

// Draws the trail while cells are alive and stops its animation frame completely when none are left.
// Returns the function that removes every listener and releases the canvas.
export function runAsciiTrail(canvas: HTMLCanvasElement, fontFamily: string, pixelRatioCap: number): () => void {
  const context = canvas.getContext('2d');
  if (!context) return () => undefined;

  const field = new TrailField({
    cellWidth: CELL_WIDTH_PX,
    cellHeight: CELL_HEIGHT_PX,
    maxCells: MAX_LIVE_CELLS,
  });
  let cssWidth = 0;
  let cssHeight = 0;
  let pixelRatio = 1;
  let frameRequest = 0;
  let lastX = 0;
  let lastY = 0;
  let lastMoveAt = Number.NEGATIVE_INFINITY;

  const draw = (now: number): void => {
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    context.clearRect(0, 0, cssWidth, cssHeight);
    context.font = `${FONT_WEIGHT} ${FONT_PX}px ${fontFamily}`;
    context.textAlign = 'center';
    context.textBaseline = 'middle';

    for (const cell of field.visibleGlyphs(now)) {
      context.fillStyle = `rgba(${TRAIL_RGB}, ${cell.alpha.toFixed(3)})`;
      context.fillText(cell.glyph, (cell.col + 0.5) * CELL_WIDTH_PX, (cell.row + 0.5) * CELL_HEIGHT_PX);
    }
  };

  const tick = (now: number): void => {
    frameRequest = 0;
    draw(now);
    if (field.liveCount > 0) frameRequest = requestAnimationFrame(tick);
  };

  const wake = (): void => {
    if (frameRequest === 0 && !document.hidden) frameRequest = requestAnimationFrame(tick);
  };

  const resize = (): void => {
    const rect = canvas.getBoundingClientRect();
    cssWidth = rect.width;
    cssHeight = rect.height;
    pixelRatio = Math.min(window.devicePixelRatio || 1, pixelRatioCap);
    canvas.width = Math.max(1, Math.round(cssWidth * pixelRatio));
    canvas.height = Math.max(1, Math.round(cssHeight * pixelRatio));
    field.resize(Math.ceil(cssWidth / CELL_WIDTH_PX), Math.ceil(cssHeight / CELL_HEIGHT_PX));
    draw(performance.now());
  };

  const onPointerMove = (event: PointerEvent): void => {
    if (event.pointerType === 'touch') return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const now = performance.now();

    if (now - lastMoveAt < STROKE_GAP_MS) {
      field.spawnAlong(lastX, lastY, x, y, now);
    } else {
      field.spawnAt(x, y, now);
    }
    lastX = x;
    lastY = y;
    lastMoveAt = now;
    wake();
  };

  const onVisibilityChange = (): void => {
    if (!document.hidden) return;
    cancelAnimationFrame(frameRequest);
    frameRequest = 0;
    field.clear();
    draw(performance.now());
  };

  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(canvas);
  window.addEventListener('pointermove', onPointerMove, { passive: true });
  document.addEventListener('visibilitychange', onVisibilityChange);

  return () => {
    cancelAnimationFrame(frameRequest);
    resizeObserver.disconnect();
    window.removeEventListener('pointermove', onPointerMove);
    document.removeEventListener('visibilitychange', onVisibilityChange);
    field.clear();
    canvas.width = 0;
    canvas.height = 0;
  };
}
