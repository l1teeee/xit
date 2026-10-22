import type { TitlePhrase } from '@/data/types';
import type { TypewriterFrame } from '@/lib/typewriter/typewriterLoop';
import { hexDigitAt } from './hexDecode';
import { bandClipPath, bandShiftTransform, gapClipPath, type CutBand, type CutSurface } from './matrixTitleCuts';

const SLIDE_MS = 250;
const SLIDE_EASING = 'cubic-bezier(0.4, 0, 0.2, 1)';
// Each step of the digits in a cut band picks different digits.
const DIGIT_STEP_SEED_STRIDE = 101;
const DIGIT_PREFIX = 'digit:';

// What a cell shows: nothing, a hexadecimal digit while it decodes, or its real letter.
type CellLook = 'hidden' | 'letter' | `digit:${string}`;

// The two elements that make up a character on screen. Its opacity is what fades, so the cursor on the cell never does.
interface CopiedCell {
  cell: HTMLElement;
  glyph: HTMLElement;
}

interface CharacterCell extends CopiedCell {
  letter: string;
  look: CellLook;
}

// One keystroke of the typewriter loop.
interface KeySlot {
  // The cell that holds the cursor while this keystroke is the next one to type.
  cursorCell: HTMLSpanElement;
  // Null for a line break, which has no character of its own.
  character: CharacterCell | null;
}

interface PhraseLayout {
  // The lines of the phrase, centered one under the other.
  text: HTMLElement;
  runs: HTMLElement[];
  keys: KeySlot[];
  characters: CharacterCell[];
  // Every cell, character cells and the cursor end cells, in document order.
  cells: HTMLElement[];
  // Where the cursor stands once the whole phrase is typed.
  finalCursorCell: HTMLSpanElement;
}

// One cut band on screen: a layer that drifts, holding a copy of the real text and a copy in digits.
interface CutLayer {
  element: HTMLElement;
  realCells: HTMLElement[];
  realCharacters: CopiedCell[];
  digitCharacters: CopiedCell[];
  digitStep: number;
}

function createSpan(className: string): HTMLSpanElement {
  const span = document.createElement('span');
  span.className = className;
  return span;
}

// One line of final text: a cell per character, hidden until typed, and the end cell for the cursor.
function buildLine(
  text: string,
  keys: KeySlot[],
  characters: CharacterCell[],
): { line: HTMLElement; run: HTMLElement; endCell: HTMLSpanElement } {
  const run = createSpan('matrix-run');

  for (const letter of text) {
    const isSpace = letter === ' ';
    const cell = createSpan(isSpace ? 'matrix-cell is-hidden is-space' : 'matrix-cell is-hidden');
    const glyph = createSpan('matrix-glyph');
    glyph.textContent = isSpace ? '' : letter;
    cell.append(glyph);
    run.append(cell);

    const character: CharacterCell = { cell, glyph, letter, look: 'hidden' };
    characters.push(character);
    keys.push({ cursorCell: cell, character });
  }

  // The cursor can stand past the last character without widening the line, so the end cell takes no space.
  const endCell = createSpan('matrix-cell matrix-end');
  run.append(endCell);

  const line = document.createElement('div');
  line.className = 'matrix-line';
  line.append(run);
  return { line, run, endCell };
}

// Every character of the phrase's final text gets its own cell from the start, so the lines keep
// their centered position while they fill in. The keys follow the keystrokes of the typewriter loop.
function buildPhraseLayout(phrase: TitlePhrase): PhraseLayout {
  const text = document.createElement('div');
  text.className = 'matrix-text';
  const runs: HTMLElement[] = [];
  const endCells: HTMLSpanElement[] = [];
  const keys: KeySlot[] = [];
  const characters: CharacterCell[] = [];

  for (let lineIndex = 0; lineIndex < phrase.lines.length; lineIndex++) {
    const built = buildLine(phrase.lines[lineIndex], keys, characters);
    text.append(built.line);
    runs.push(built.run);
    endCells.push(built.endCell);

    const hasNextLine = lineIndex < phrase.lines.length - 1;
    if (hasNextLine) keys.push({ cursorCell: built.endCell, character: null });
  }

  if (endCells.length === 0) throw new Error('A phrase needs at least one line');
  const cells = Array.from(text.querySelectorAll<HTMLElement>('.matrix-cell'));
  return { text, runs, keys, characters, cells, finalCursorCell: endCells[endCells.length - 1] };
}

function lookOfKey(key: number, character: CharacterCell, frame: TypewriterFrame): CellLook {
  if (character.letter === ' ') return 'hidden';

  if (key < frame.typedKeys) {
    const flicker = frame.flicker;
    if (flicker !== null && flicker.key === key) return `digit:${hexDigitAt(key, flicker.seed)}`;
    return 'letter';
  }

  const vanishing = frame.vanishing.find(erased => erased.key === key);
  return vanishing ? `digit:${hexDigitAt(key, vanishing.seed)}` : 'hidden';
}

// The look is a class on the cell and the text of the glyph, and the glyph's opacity transitions in CSS: a letter
// fades in from its digit, and an erased character fades out showing the digit it had, never its letter.
function paintCell(target: CopiedCell, letter: string, look: CellLook): void {
  const isDigit = look.startsWith(DIGIT_PREFIX);
  target.cell.classList.toggle('is-hidden', look === 'hidden');
  target.cell.classList.toggle('is-digit', isDigit);
  if (look === 'letter') target.glyph.textContent = letter;
  if (isDigit) target.glyph.textContent = look.slice(DIGIT_PREFIX.length);
}

function applyLook(character: CharacterCell, look: CellLook): void {
  if (character.look === look) return;
  character.look = look;
  paintCell(character, character.letter, look);
}

function charactersOf(copy: HTMLElement): CopiedCell[] {
  const cells = Array.from(copy.querySelectorAll<HTMLElement>('.matrix-cell:not(.matrix-end)'));
  return cells.map(cell => {
    const glyph = cell.querySelector<HTMLElement>('.matrix-glyph');
    if (!glyph) throw new Error('A title cell has no glyph');
    return { cell, glyph };
  });
}

// The real text may be clipped around other bands right now, and its copy must not be.
function copyText(text: HTMLElement): HTMLElement {
  const copy = text.cloneNode(true) as HTMLElement;
  copy.style.clipPath = '';
  return copy;
}

// Only transform and opacity move: the band drifts out and back with easing while the digits fade in
// over the real text and out again. The animations end on their first keyframe, the exact real text.
function animateCut(element: HTMLElement, realCopy: HTMLElement, digitLayer: HTMLElement, band: CutBand): void {
  const total = band.fadeInMs + band.fadeOutMs;
  const peak = band.fadeInMs / total;
  const timing: KeyframeAnimationOptions = { duration: total, fill: 'both' };

  element.animate(
    [
      { transform: 'translateX(0)', easing: 'ease-out' },
      { transform: bandShiftTransform(band), offset: peak, easing: 'ease-in-out' },
      { transform: 'translateX(0)' },
    ],
    timing,
  );
  realCopy.animate([{ opacity: 1 }, { opacity: 1 - band.peakOpacity, offset: peak }, { opacity: 1 }], timing);
  digitLayer.animate([{ opacity: 0 }, { opacity: band.peakOpacity, offset: peak }, { opacity: 0 }], timing);
}

function createCutLayer(layout: PhraseLayout, band: CutBand): CutLayer {
  const element = document.createElement('div');
  element.className = 'matrix-cut';
  const realCopy = copyText(layout.text);
  const digitCopy = copyText(layout.text);
  digitCopy.querySelectorAll('.is-cursor').forEach(cell => cell.classList.remove('is-cursor'));
  const digitLayer = document.createElement('div');
  digitLayer.className = 'matrix-cut-digits';
  digitLayer.append(digitCopy);
  element.append(realCopy, digitLayer);

  element.style.clipPath = bandClipPath(band);
  animateCut(element, realCopy, digitLayer, band);
  return {
    element,
    realCells: Array.from(realCopy.querySelectorAll<HTMLElement>('.matrix-cell')),
    realCharacters: charactersOf(realCopy),
    digitCharacters: charactersOf(digitCopy),
    digitStep: 0,
  };
}

// A band is only a view of the title: its real copy mirrors what the title shows right now, and its digit copy
// shows a digit wherever the title shows anything. So an erased letter is gone from the band at the same moment.
function syncCutLayer(layer: CutLayer, layout: PhraseLayout, band: CutBand): void {
  layout.cells.forEach((cell, index) => {
    layer.realCells[index].classList.toggle('is-cursor', cell.classList.contains('is-cursor'));
  });

  layout.characters.forEach((character, index) => {
    paintCell(layer.realCharacters[index], character.letter, character.look);

    const seed = band.seed + layer.digitStep * DIGIT_STEP_SEED_STRIDE;
    const digitLook: CellLook = character.look === 'hidden' ? 'hidden' : `digit:${hexDigitAt(index, seed)}`;
    paintCell(layer.digitCharacters[index], character.letter, digitLook);
  });
}

// Draws typewriter frames as real text in fixed-width cells. The layout never reads the DOM
// while typing: the lines are centered by CSS, and only a phrase change measures anything.
export class MatrixTitleView implements CutSurface {
  private readonly host: HTMLElement;
  private readonly phrases: readonly TitlePhrase[];
  private readonly animated: boolean;
  private phraseIndex = -1;
  private layout: PhraseLayout | null = null;
  private cursorCell: HTMLSpanElement | null = null;
  private readonly cutLayers = new Map<CutBand, CutLayer>();
  // Bands that were on screen when the phrase changed. Their layers are gone, so they are never drawn again.
  private readonly droppedBands = new Set<CutBand>();

  constructor(host: HTMLElement, phrases: readonly TitlePhrase[], animated: boolean) {
    this.host = host;
    this.phrases = phrases;
    this.animated = animated;
  }

  render(frame: TypewriterFrame): void {
    if (frame.phraseIndex !== this.phraseIndex) {
      this.changePhrase(frame);
      return;
    }
    if (this.layout) this.paint(this.layout, frame);
  }

  // Shows exactly these bands. Each is a copy of the real text clipped to its band that drifts sideways,
  // with a copy in hexadecimal digits fading in over it, while the text underneath is clipped away.
  // Every band starts and ends as an exact copy of the text, so nothing pops when it appears or goes.
  setCuts(bands: readonly CutBand[]): void {
    const layout = this.layout;
    if (!layout) return;

    for (const band of this.droppedBands) {
      if (!bands.includes(band)) this.droppedBands.delete(band);
    }
    const liveBands = bands.filter(band => !this.droppedBands.has(band));

    for (const [band, layer] of this.cutLayers) {
      if (liveBands.includes(band)) continue;
      layer.element.remove();
      this.cutLayers.delete(band);
    }
    for (const band of liveBands) {
      if (this.cutLayers.has(band)) continue;
      const layer = createCutLayer(layout, band);
      syncCutLayer(layer, layout, band);
      this.host.append(layer.element);
      this.cutLayers.set(band, layer);
    }
    layout.text.style.clipPath = liveBands.length === 0 ? '' : gapClipPath(liveBands);
  }

  stepDigits(step: number): void {
    const layout = this.layout;
    if (!layout) return;

    for (const [band, layer] of this.cutLayers) {
      layer.digitStep = step;
      syncCutLayer(layer, layout, band);
    }
  }

  dispose(): void {
    this.cutLayers.clear();
    this.droppedBands.clear();
    this.host.replaceChildren();
    this.layout = null;
    this.cursorCell = null;
    this.phraseIndex = -1;
  }

  private paint(layout: PhraseLayout, frame: TypewriterFrame): void {
    this.host.dataset.cursor = frame.cursor;
    layout.keys.forEach((key, index) => {
      if (key.character) applyLook(key.character, lookOfKey(index, key.character, frame));
    });
    this.moveCursor(layout, frame.typedKeys);

    for (const [band, layer] of this.cutLayers) syncCutLayer(layer, layout, band);
  }

  // The leading letter is shared by every phrase but sits at a new place in each, because every line is
  // centered. The runs slide from where they were to where they now belong, so nothing jumps. The new
  // text is painted before it is attached, so the letter that stays is never faded in again.
  private changePhrase(frame: TypewriterFrame): void {
    const previousLefts = this.layout ? this.layout.runs.map(run => run.getBoundingClientRect().left) : [];

    const layout = buildPhraseLayout(this.phrases[frame.phraseIndex]);
    for (const band of this.cutLayers.keys()) this.droppedBands.add(band);
    this.cutLayers.clear();
    this.layout = layout;
    this.phraseIndex = frame.phraseIndex;
    this.cursorCell = null;

    this.paint(layout, frame);
    this.host.replaceChildren(layout.text);
    if (this.animated) this.slideRuns(layout.runs, previousLefts);
  }

  private slideRuns(runs: HTMLElement[], previousLefts: number[]): void {
    runs.forEach((run, index) => {
      if (index >= previousLefts.length) return;

      const shift = previousLefts[index] - run.getBoundingClientRect().left;
      if (shift === 0) return;
      run.animate(
        [{ transform: `translateX(${shift}px)` }, { transform: 'translateX(0)' }],
        { duration: SLIDE_MS, easing: SLIDE_EASING },
      );
    });
  }

  private moveCursor(layout: PhraseLayout, typedKeys: number): void {
    const keys = layout.keys;
    const target = typedKeys < keys.length ? keys[typedKeys].cursorCell : layout.finalCursorCell;
    if (target === this.cursorCell) return;

    this.cursorCell?.classList.remove('is-cursor');
    target.classList.add('is-cursor');
    this.cursorCell = target;
  }
}
