import { FRAME_COLS, FRAME_ROWS } from './hummingbirdFrames';

const TONE_LIGHT = 1;
const TONE_MID = 2;
const TONE_DARK = 3;
const PALETTES = {
  light: ['#9eb3ee', '#0850ea', '#121748'],
  dark: ['#23338f', '#0850ea', '#9eb3ee'],
};

export function paintAsciiMatrix(
  context: CanvasRenderingContext2D,
  tones: Uint8Array,
  cellSize: number,
  fontFamily: string,
  ground: 'light' | 'dark' = 'light',
): void {
  const palette = PALETTES[ground];
  context.clearRect(0, 0, FRAME_COLS * cellSize, FRAME_ROWS * cellSize);
  context.font = `700 ${cellSize}px ${fontFamily}`;
  const barMetrics = context.measureText('|');
  const barHeight = barMetrics.actualBoundingBoxAscent + barMetrics.actualBoundingBoxDescent;
  context.font = `700 ${cellSize * cellSize / barHeight}px ${fontFamily}`;
  context.textBaseline = 'alphabetic';
  const finalBarMetrics = context.measureText('|');
  const bulletMetrics = context.measureText('\u2022');
  context.textAlign = 'center';

  for (let row = 0; row < FRAME_ROWS; row++) {
    for (let col = 0; col < FRAME_COLS; col++) {
      const tone = tones[row * FRAME_COLS + col];
      let glyph: string;
      let glyphMetrics: TextMetrics;
      if (tone === TONE_LIGHT) {
        glyph = '•';
        context.fillStyle = palette[0];
        glyphMetrics = bulletMetrics;
      } else if (tone === TONE_MID) {
        glyph = '•';
        context.fillStyle = palette[1];
        glyphMetrics = bulletMetrics;
      } else if (tone === TONE_DARK) {
        glyph = '|';
        context.fillStyle = palette[2];
        glyphMetrics = finalBarMetrics;
      } else {
        continue;
      }
      const glyphCenterOffset = (
        glyphMetrics.actualBoundingBoxAscent - glyphMetrics.actualBoundingBoxDescent
      ) / 2;
      context.fillText(glyph, (col + 0.5) * cellSize, (row + 0.5) * cellSize + glyphCenterOffset);
    }
  }
}
