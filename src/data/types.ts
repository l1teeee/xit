export type RasterVariant = 'lines' | 'halftone' | 'dots' | 'dither' | 'hybrid';

export interface Site {
  name: string;
  year: string;
  coordinates: string;
  description: string;
}

export interface HeroCopy {
  label: string;
  titleLines: string[];
  subtitle: string;
  indicators: string[];
}
