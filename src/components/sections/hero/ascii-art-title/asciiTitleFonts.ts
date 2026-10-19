import { Inter_Tight } from 'next/font/google';
import { readFontFamily } from '@/lib/fontFamily';

export interface AsciiTitleFonts {
  displayFamily: string;
  monoFamily: string;
}

export const DISPLAY_FONT_WEIGHT = 800;

// Loaded here, not in the root layout, so the page only pays for Inter Tight while the ASCII art title is mounted.
const interTight = Inter_Tight({ subsets: ['latin'], display: 'swap' });

export async function loadAsciiTitleFonts(): Promise<AsciiTitleFonts> {
  const displayFamily = interTight.style.fontFamily;
  const monoFamily = readFontFamily('--font-jetbrains-mono');

  await Promise.all([
    document.fonts.load(`${DISPLAY_FONT_WEIGHT} 100px ${displayFamily}`),
    document.fonts.load(`400 16px ${monoFamily}`),
  ]);
  await document.fonts.ready;

  return { displayFamily, monoFamily };
}
