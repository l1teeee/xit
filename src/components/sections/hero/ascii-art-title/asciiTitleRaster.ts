import type { HeroPhrase } from '@/data/types';
import { phraseKeyKinds, type KeyKind } from '@/lib/typewriter/typewriterLoop';
import { DISPLAY_FONT_WEIGHT, type AsciiTitleFonts } from './asciiTitleFonts';
import { TONE_BLANK, classifyTones } from './asciiTitleTones';

const SAMPLES_PER_CELL_AXIS = 4;
const MEASURE_FONT_PX = 100;
const LINE_PITCH_EM = 0.92;
const MOBILE_REFERENCE_WIDTH_PX = 390;
const DESKTOP_REFERENCE_WIDTH_PX = 1280;
const MOBILE_WIDTH_FILL = 0.78;
const DESKTOP_WIDTH_FILL = 0.48;
const MAX_TITLE_WIDTH_PX = 760;
const MAX_BLOCK_HEIGHT_SHARE = 0.7;
const TARGET_TITLE_COLUMNS = 130;
const MIN_CELL_WIDTH_PX = 3;
// Taller cells leave room for complete monospace glyphs.
const CELL_ASPECT = 1.4;
const CURSOR_WIDTH_OF_CAP_HEIGHT = 0.28;
const MIN_CURSOR_COLUMNS = 2;
const CURSOR_GAP_COLUMNS = 1;
const SIDE_MARGIN_COLUMNS = 2;
const EDGE_PADDING_ROWS = 1;

// The first letter of every phrase is the same letter and is never erased, so it is keystroke 0 of every phrase.
export const LEADING_KEY = 0;

export type TitleKeyKind = KeyKind;

export interface TitleArea {
  width: number;
  height: number;
}

export interface TitleRasterOptions {
  area: TitleArea;
  pixelRatio: number;
  // False when the cursor is never shown, so no room is kept for it beside the widest line.
  reserveCursorSpace: boolean;
}

export interface TitleBand {
  firstRow: number;
  endRow: number;
}

export interface TitleCursorStop {
  band: number;
  col: number;
}

export interface PhraseRaster {
  tones: Uint8Array;
  // Keystroke that types each cell of this phrase, or -1 for a blank cell.
  keyOfCell: Int16Array;
  keyKinds: TitleKeyKind[];
  // Where the cursor stands after n keystrokes, for n = 0..keyKinds.length.
  cursorStops: TitleCursorStop[];
}

export interface TitleRaster {
  cols: number;
  rows: number;
  cellWidth: number;
  cellHeight: number;
  fontSize: number;
  cursorCols: number;
  bands: TitleBand[];
  phrases: PhraseRaster[];
}

interface TitleMetrics {
  // Advance width in em of the first n characters, per phrase, per line, for n = 0..length.
  prefixWidthsEm: number[][][];
  capHeightEm: number;
  monoAspect: number;
}

interface TitleLayout {
  displayFontPx: number;
  capHeight: number;
  cellWidth: number;
  cellHeight: number;
  fontSize: number;
  cursorCols: number;
  cols: number;
  rows: number;
  // Left edge shared by every line of every phrase, so the leading letter never moves.
  left: number;
  prefixWidths: number[][][];
  baselines: number[];
}

interface LetterRange {
  keyIndex: number;
  line: number;
  left: number;
  right: number;
}

interface PhraseKeys {
  kinds: TitleKeyKind[];
  cursorStops: TitleCursorStop[];
  letters: LetterRange[];
}

function displayFont(sizePx: number, fonts: AsciiTitleFonts): string {
  return `${DISPLAY_FONT_WEIGHT} ${sizePx}px ${fonts.displayFamily}`;
}

function validatePhrases(phrases: readonly HeroPhrase[]): void {
  if (phrases.length === 0) throw new Error('The title needs at least one phrase');

  const lineCount = phrases[0].lines.length;
  const leadingLetter = phrases[0].lines[0]?.[0];
  if (lineCount === 0 || !leadingLetter || leadingLetter === ' ') throw new Error('The first phrase needs a first letter');

  for (const phrase of phrases) {
    if (phrase.lines.length !== lineCount) throw new Error('Every phrase needs the same number of lines');
    if (phrase.lines[0]?.[0] !== leadingLetter) throw new Error('Every phrase must start with the same letter');
  }
}

function measureTitle(
  context: CanvasRenderingContext2D,
  phrases: readonly HeroPhrase[],
  fonts: AsciiTitleFonts,
): TitleMetrics {
  context.font = displayFont(MEASURE_FONT_PX, fonts);
  const prefixWidthsEm = phrases.map(phrase =>
    phrase.lines.map(line =>
      Array.from({ length: line.length + 1 }, (_, count) =>
        context.measureText(line.slice(0, count)).width / MEASURE_FONT_PX,
      ),
    ),
  );
  const capHeightEm = context.measureText('H').actualBoundingBoxAscent / MEASURE_FONT_PX;

  context.font = `400 ${MEASURE_FONT_PX}px ${fonts.monoFamily}`;
  const monoAspect = context.measureText('M').width / MEASURE_FONT_PX;

  return { prefixWidthsEm, capHeightEm, monoAspect };
}

function widestLineEm(prefixWidthsEm: number[][][]): number {
  const lineWidths = prefixWidthsEm.flatMap(phrase => phrase.map(prefix => prefix[prefix.length - 1]));
  return Math.max(...lineWidths);
}

// Width share slides from the phone value to the desktop value so resizing never jumps.
function targetTitleWidth(areaWidth: number): number {
  const span = DESKTOP_REFERENCE_WIDTH_PX - MOBILE_REFERENCE_WIDTH_PX;
  const progress = Math.min(1, Math.max(0, (areaWidth - MOBILE_REFERENCE_WIDTH_PX) / span));
  const fill = MOBILE_WIDTH_FILL + (DESKTOP_WIDTH_FILL - MOBILE_WIDTH_FILL) * progress;
  return Math.min(areaWidth * fill, MAX_TITLE_WIDTH_PX);
}

function fitDisplayFontSize(metrics: TitleMetrics, lineCount: number, area: TitleArea): number {
  const sizeForWidth = targetTitleWidth(area.width) / widestLineEm(metrics.prefixWidthsEm);

  const blockHeightEm = metrics.capHeightEm + (lineCount - 1) * LINE_PITCH_EM;
  // Leave equal clearance above and below, keeping the widest phrase box centered.
  const pickerHeight = area.width <= 480 && area.height > 480 ? 88 : 44;
  const availableHeight = Math.max(1, area.height - 2 * (pickerHeight + 32));
  const sizeForHeight = Math.min(area.height * MAX_BLOCK_HEIGHT_SHARE, availableHeight) / blockHeightEm;

  return Math.min(sizeForWidth, sizeForHeight);
}

// Snapping to device pixels keeps the browser from rounding glyph advances, which would stretch each row.
function chooseCellWidth(titleWidth: number, pixelRatio: number): number {
  const target = titleWidth / TARGET_TITLE_COLUMNS;
  const snapped = Math.round(target * pixelRatio) / pixelRatio;
  return Math.max(MIN_CELL_WIDTH_PX, snapped);
}

// The widest phrase and the cursor that trails it are centered together, so no phrase makes the block jump.
function computeLayout(
  metrics: TitleMetrics,
  lineCount: number,
  options: TitleRasterOptions,
): TitleLayout {
  const { area, pixelRatio, reserveCursorSpace } = options;
  const displayFontPx = fitDisplayFontSize(metrics, lineCount, area);
  const prefixWidths = metrics.prefixWidthsEm.map(phrase =>
    phrase.map(prefix => prefix.map(em => em * displayFontPx)),
  );
  const titleWidth = widestLineEm(metrics.prefixWidthsEm) * displayFontPx;
  const capHeight = metrics.capHeightEm * displayFontPx;
  const linePitch = LINE_PITCH_EM * displayFontPx;

  const cellWidth = chooseCellWidth(titleWidth, pixelRatio);
  const fontSize = cellWidth / metrics.monoAspect;
  const cellHeight = cellWidth * CELL_ASPECT;
  const cursorCols = Math.max(MIN_CURSOR_COLUMNS, Math.round((capHeight * CURSOR_WIDTH_OF_CAP_HEIGHT) / cellWidth));
  const cursorSpace = reserveCursorSpace ? (CURSOR_GAP_COLUMNS + cursorCols) * cellWidth : 0;
  const groupWidth = titleWidth + cursorSpace;
  const cols = Math.ceil(groupWidth / cellWidth) + 2 * SIDE_MARGIN_COLUMNS;
  const left = (cols * cellWidth - groupWidth) / 2;

  const blockHeight = capHeight + (lineCount - 1) * linePitch;
  const rows = Math.ceil(blockHeight / cellHeight) + 2 * EDGE_PADDING_ROWS;
  const firstBaseline = (rows * cellHeight - blockHeight) / 2 + capHeight;
  const baselines = Array.from({ length: lineCount }, (_, index) => firstBaseline + index * linePitch);

  return { displayFontPx, capHeight, cellWidth, cellHeight, fontSize, cursorCols, cols, rows, left, prefixWidths, baselines };
}

function layoutBands(layout: TitleLayout): TitleBand[] {
  return layout.baselines.map(baseline => ({
    firstRow: Math.floor((baseline - layout.capHeight) / layout.cellHeight),
    endRow: Math.ceil(baseline / layout.cellHeight),
  }));
}

function buildKeys(lines: readonly string[], prefixWidths: number[][], layout: TitleLayout): PhraseKeys {
  const kinds = phraseKeyKinds(lines);
  const letters: LetterRange[] = [];
  const cursorStops: TitleCursorStop[] = [{ band: 0, col: Math.floor(layout.left / layout.cellWidth) }];
  let keyIndex = 0;

  lines.forEach((line, lineIndex) => {
    const prefix = prefixWidths[lineIndex];

    for (let charIndex = 0; charIndex < line.length; charIndex++) {
      const charLeft = layout.left + prefix[charIndex];
      const charRight = layout.left + prefix[charIndex + 1];

      if (kinds[keyIndex] === 'letter') letters.push({ keyIndex, line: lineIndex, left: charLeft, right: charRight });
      cursorStops.push({ band: lineIndex, col: Math.ceil(charRight / layout.cellWidth) + CURSOR_GAP_COLUMNS });
      keyIndex += 1;
    }

    const hasNextLine = lineIndex < lines.length - 1;
    if (hasNextLine) {
      cursorStops.push({ band: lineIndex + 1, col: Math.floor(layout.left / layout.cellWidth) });
      keyIndex += 1;
    }
  });

  return { kinds, cursorStops, letters };
}

function drawPhrase(
  canvas: HTMLCanvasElement,
  context: CanvasRenderingContext2D,
  lines: readonly string[],
  fonts: AsciiTitleFonts,
  layout: TitleLayout,
): void {
  // Resizing the canvas resets the context, so every drawing setting comes after it.
  canvas.width = layout.cols * SAMPLES_PER_CELL_AXIS;
  canvas.height = layout.rows * SAMPLES_PER_CELL_AXIS;
  context.setTransform(
    SAMPLES_PER_CELL_AXIS / layout.cellWidth, 0,
    0, SAMPLES_PER_CELL_AXIS / layout.cellHeight,
    0, 0,
  );
  context.font = displayFont(layout.displayFontPx, fonts);
  context.fillStyle = '#fff';
  context.textAlign = 'left';
  context.textBaseline = 'alphabetic';

  lines.forEach((line, index) => context.fillText(line, layout.left, layout.baselines[index]));
}

function sampleCoverage(image: ImageData, cols: number, rows: number): Uint8Array {
  const coverage = new Uint8Array(cols * rows);
  const samplesPerCell = SAMPLES_PER_CELL_AXIS * SAMPLES_PER_CELL_AXIS;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      let alphaSum = 0;
      for (let sampleY = 0; sampleY < SAMPLES_PER_CELL_AXIS; sampleY++) {
        for (let sampleX = 0; sampleX < SAMPLES_PER_CELL_AXIS; sampleX++) {
          const pixelX = col * SAMPLES_PER_CELL_AXIS + sampleX;
          const pixelY = row * SAMPLES_PER_CELL_AXIS + sampleY;
          alphaSum += image.data[(pixelY * image.width + pixelX) * 4 + 3];
        }
      }
      coverage[row * cols + col] = Math.round(alphaSum / samplesPerCell);
    }
  }
  return coverage;
}

function nearestIndex(values: number[], target: number): number {
  let nearest = 0;
  values.forEach((value, index) => {
    if (Math.abs(value - target) < Math.abs(values[nearest] - target)) nearest = index;
  });
  return nearest;
}

function distanceToRange(x: number, left: number, right: number): number {
  if (x < left) return left - x;
  if (x > right) return x - right;
  return 0;
}

// Ink that overhangs a letter's advance box is handed to the closest letter, never to a space.
function assignCellsToKeys(tones: Uint8Array, layout: TitleLayout, letters: LetterRange[]): Int16Array {
  const keyOfCell = new Int16Array(tones.length).fill(-1);
  const lineCenters = layout.baselines.map(baseline => baseline - layout.capHeight / 2);

  for (let row = 0; row < layout.rows; row++) {
    const line = nearestIndex(lineCenters, (row + 0.5) * layout.cellHeight);
    const lineLetters = letters.filter(letter => letter.line === line);

    for (let col = 0; col < layout.cols; col++) {
      const cellIndex = row * layout.cols + col;
      if (tones[cellIndex] === TONE_BLANK) continue;

      const x = (col + 0.5) * layout.cellWidth;
      let closest = lineLetters[0];
      for (const letter of lineLetters) {
        if (distanceToRange(x, letter.left, letter.right) < distanceToRange(x, closest.left, closest.right)) {
          closest = letter;
        }
      }
      keyOfCell[cellIndex] = closest.keyIndex;
    }
  }
  return keyOfCell;
}

function buildPhraseRaster(
  phrase: HeroPhrase,
  prefixWidths: number[][],
  fonts: AsciiTitleFonts,
  layout: TitleLayout,
  canvas: HTMLCanvasElement,
  context: CanvasRenderingContext2D,
): PhraseRaster {
  drawPhrase(canvas, context, phrase.lines, fonts, layout);
  const image = context.getImageData(0, 0, canvas.width, canvas.height);
  const tones = classifyTones(sampleCoverage(image, layout.cols, layout.rows));
  const keys = buildKeys(phrase.lines, prefixWidths, layout);

  return {
    tones,
    keyOfCell: assignCellsToKeys(tones, layout, keys.letters),
    keyKinds: keys.kinds,
    cursorStops: keys.cursorStops,
  };
}

// Neighbouring letters can bleed a little ink into the leading letter's cells, and that differs per phrase.
// Every phrase therefore reuses the first phrase's cells for that letter, so it never changes between phrases.
function lockLeadingLetter(phrases: PhraseRaster[]): void {
  const reference = phrases[0];

  for (const phrase of phrases.slice(1)) {
    for (let cellIndex = 0; cellIndex < phrase.tones.length; cellIndex++) {
      if (reference.keyOfCell[cellIndex] === LEADING_KEY) {
        phrase.tones[cellIndex] = reference.tones[cellIndex];
        phrase.keyOfCell[cellIndex] = LEADING_KEY;
      } else if (phrase.keyOfCell[cellIndex] === LEADING_KEY) {
        phrase.tones[cellIndex] = TONE_BLANK;
        phrase.keyOfCell[cellIndex] = -1;
      }
    }
  }
}

export function createTitleRaster(
  phrases: readonly HeroPhrase[],
  fonts: AsciiTitleFonts,
  options: TitleRasterOptions,
): TitleRaster {
  validatePhrases(phrases);

  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error('2D canvas is unavailable');

  const metrics = measureTitle(context, phrases, fonts);
  const layout = computeLayout(metrics, phrases[0].lines.length, options);
  const phraseRasters = phrases.map((phrase, index) =>
    buildPhraseRaster(phrase, layout.prefixWidths[index], fonts, layout, canvas, context),
  );
  lockLeadingLetter(phraseRasters);

  return {
    cols: layout.cols,
    rows: layout.rows,
    cellWidth: layout.cellWidth,
    cellHeight: layout.cellHeight,
    fontSize: layout.fontSize,
    cursorCols: layout.cursorCols,
    bands: layoutBands(layout),
    phrases: phraseRasters,
  };
}
