import { hash01 } from '@/lib/hash01';
import type { TypewriterFrame } from '@/lib/typewriter/typewriterLoop';
import type { PhraseRaster, TitleRaster } from './asciiTitleRaster';
import { TONE_BLANK, TONE_EDGE, TONE_BODY, TONE_COUNT } from './asciiTitleTones';

interface ToneStyle {
  glyph: string;
  color: string;
}

const SETTLE_SEED = 0;
const CURSOR_COLOR = '#000';
const CURSOR_BLINK_CLASS = 'ascii-cursor-blink';
// A small stroke keeps the character grid dark at 1x density.
const TEXT_STROKE_PX = 0.3;
const FLICKER_GLYPHS = ['.', '-', '=', '+', '/', '|'];
const FLICKER_TONE_BASE = TONE_COUNT;
const FLICKER_COLOR = 'rgb(0 0 0 / 0.85)';

const TONE_STYLES: Record<number, ToneStyle> = {
  [TONE_BLANK]: { glyph: ' ', color: 'transparent' },
  [TONE_EDGE]: { glyph: '+', color: '#000' },
  [TONE_BODY]: { glyph: '#', color: '#000' },
};

function styleOfTone(tone: number): ToneStyle {
  if (tone < FLICKER_TONE_BASE) return TONE_STYLES[tone];
  return { glyph: FLICKER_GLYPHS[tone - FLICKER_TONE_BASE], color: FLICKER_COLOR };
}

function visibleTone(phrase: PhraseRaster, frame: TypewriterFrame, cellIndex: number): number {
  const finalTone = phrase.tones[cellIndex];
  if (finalTone === TONE_BLANK) return TONE_BLANK;

  const key = phrase.keyOfCell[cellIndex];
  if (key >= frame.typedKeys) return TONE_BLANK;

  const flicker = frame.flicker;
  const isFlickering = flicker !== null && flicker.key === key && flicker.progress < hash01(cellIndex, SETTLE_SEED);
  if (!isFlickering) return finalTone;

  return FLICKER_TONE_BASE + Math.floor(hash01(cellIndex, flicker.seed + 1) * FLICKER_GLYPHS.length);
}

function visibleRowTones(raster: TitleRaster, phrase: PhraseRaster, frame: TypewriterFrame, row: number): Uint8Array {
  const rowStart = row * raster.cols;
  const tones = new Uint8Array(raster.cols);
  for (let col = 0; col < raster.cols; col++) {
    tones[col] = visibleTone(phrase, frame, rowStart + col);
  }
  return tones;
}

function cursorColumn(raster: TitleRaster, phrase: PhraseRaster, frame: TypewriterFrame, row: number): number | null {
  if (frame.cursor === 'hidden') return null;

  const stop = phrase.cursorStops[frame.typedKeys];
  const band = raster.bands[stop.band];
  if (row < band.firstRow || row >= band.endRow) return null;

  return stop.col;
}

// Runs of matching glyphs keep the title DOM small.
function createSegment(raster: TitleRaster, tone: number, cellCount: number): HTMLSpanElement {
  const style = styleOfTone(tone);
  const segment = document.createElement('span');
  segment.style.display = 'inline-block';
  segment.style.verticalAlign = 'top';
  segment.style.overflow = 'hidden';
  segment.style.width = `${cellCount * raster.cellWidth}px`;
  segment.style.height = `${raster.cellHeight}px`;
  segment.style.color = style.color;
  segment.textContent = style.glyph.repeat(cellCount);
  return segment;
}

function createCursor(raster: TitleRaster, frame: TypewriterFrame): HTMLSpanElement {
  const cursor = document.createElement('span');
  cursor.style.display = 'inline-block';
  cursor.style.verticalAlign = 'top';
  cursor.style.width = `${raster.cursorCols * raster.cellWidth}px`;
  cursor.style.height = `${raster.cellHeight}px`;
  cursor.style.backgroundColor = CURSOR_COLOR;
  if (frame.cursor === 'blinking') cursor.className = CURSOR_BLINK_CLASS;
  return cursor;
}

function appendSegments(parent: DocumentFragment, raster: TitleRaster, tones: Uint8Array, from: number, to: number): void {
  let blanks = '';
  let col = from;

  while (col < to) {
    const tone = tones[col];
    if (tone === TONE_BLANK) {
      blanks += ' ';
      col += 1;
      continue;
    }

    if (blanks !== '') parent.append(blanks);
    blanks = '';

    let end = col + 1;
    while (end < to && tones[end] === tone) end += 1;
    parent.append(createSegment(raster, tone, end - col));
    col = end;
  }

  if (blanks !== '') parent.append(blanks);
}

function appendRow(parent: DocumentFragment, raster: TitleRaster, phrase: PhraseRaster, frame: TypewriterFrame, row: number): void {
  const tones = visibleRowTones(raster, phrase, frame, row);
  const cursorCol = cursorColumn(raster, phrase, frame, row);

  if (cursorCol === null) {
    appendSegments(parent, raster, tones, 0, raster.cols);
    return;
  }
  appendSegments(parent, raster, tones, 0, cursorCol);
  parent.append(createCursor(raster, frame));
  appendSegments(parent, raster, tones, cursorCol + raster.cursorCols, raster.cols);
}

export function sizeTitleElement(element: HTMLElement, raster: TitleRaster): void {
  element.style.fontSize = `${raster.fontSize}px`;
  element.style.lineHeight = `${raster.cellHeight}px`;
  element.style.setProperty('-webkit-text-stroke', `${TEXT_STROKE_PX}px`);
}

export function paintTitle(element: HTMLElement, raster: TitleRaster, frame: TypewriterFrame): void {
  const phrase = raster.phrases[frame.phraseIndex];
  const rows = document.createDocumentFragment();
  for (let row = 0; row < raster.rows; row++) {
    if (row > 0) rows.append('\n');
    appendRow(rows, raster, phrase, frame, row);
  }
  element.replaceChildren(rows);
}
