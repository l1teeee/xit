export type RasterVariant = 'lines' | 'halftone' | 'dots' | 'dither' | 'hybrid';

export interface Site {
  name: string;
  description: string;
}

export interface TitlePhrase {
  lines: string[];
}

export interface SectionTitleCopy {
  // One phrase typed like the hero title.
  phrases: TitlePhrase[];
}

export interface HeroCopy {
  // Every phrase starts with the same letter. The first phrase is the static heading text.
  phrases: TitlePhrase[];
}
