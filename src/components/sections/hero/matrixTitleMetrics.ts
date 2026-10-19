import type { CSSProperties } from 'react';
import type { HeroPhrase } from '@/data/types';

// The title geometry in em, the single source for the CSS and for the code that sizes the block.
// advance, cap and ascent are VT323's own metrics (its descent is 0.2, so ascent plus descent is 1).
// Tracking is a hair of space between letters. A word space is a thinner cell than a letter.
const ADVANCE_EM = 0.4;
const TRACKING_EM = 0.02;
const SPACE_EM = 0.26;
const CAP_EM = 0.5625;
const ASCENT_EM = 0.8;
// Tight terminal leading: the two lines almost touch.
const LINE_EM = 0.72;

const LETTER_CELL_EM = ADVANCE_EM + TRACKING_EM;

function lineWidthEm(line: string): number {
  let width = 0;
  for (const char of line) width += char === ' ' ? SPACE_EM : LETTER_CELL_EM;
  return width;
}

function widestLineEm(phrases: readonly HeroPhrase[]): number {
  const widths = phrases.flatMap(phrase => phrase.lines.map(lineWidthEm));
  return Math.max(...widths);
}

// Height of the block of capital letters: from the cap line of the first line to the baseline of the last.
export function titleBlockEm(lineCount: number): number {
  return CAP_EM + (lineCount - 1) * LINE_EM;
}

// The custom properties MatrixTitle.css builds the title from.
export function titleStyle(phrases: readonly HeroPhrase[]): CSSProperties {
  return {
    '--advance-em': ADVANCE_EM,
    '--tracking-em': TRACKING_EM,
    '--space-em': SPACE_EM,
    '--cap-em': CAP_EM,
    '--ascent-em': ASCENT_EM,
    '--line-em': LINE_EM,
    '--title-em': widestLineEm(phrases),
    '--title-lines': phrases[0].lines.length,
  } as CSSProperties;
}
