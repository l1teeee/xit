import { readFontFamily } from '@/lib/fontFamily';

const FONT_SHORTHAND_SIZE = '400 100px';

// Resolves once VT323 is ready to draw, and rejects when it is not, so the page can show its plain heading instead.
export async function loadMatrixTitleFont(): Promise<void> {
  const family = readFontFamily('--font-vt323');

  const faces = await document.fonts.load(`${FONT_SHORTHAND_SIZE} ${family}`);
  if (faces.length === 0) throw new Error('The Matrix title font is not available');
}
