export type RasterVariant = 'lines' | 'halftone' | 'dots' | 'dither' | 'hybrid';

export interface Site {
  name: string;
  description: string;
}

export interface HeroPhrase {
  lines: string[];
}

export interface HeroCopy {
  // Every phrase starts with the same letter. The first phrase is the static heading text.
  phrases: HeroPhrase[];
}
