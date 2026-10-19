import type { HeroCopy, Site } from './types';

export const site: Site = {
  name: 'AACII',
  year: '2026',
  coordinates: 'N 0.0000 / E 0.0000',
  description: 'AACII is an independent studio for generative graphics, interactive systems and realtime visuals.',
};

export const hero: HeroCopy = {
  label: '[00] INDEX',
  titleLines: ['SYSTEMS', 'IN MOTION.'],
  subtitle: site.description,
  indicators: ['RASTER', 'MODE', 'ROT', 'LAT/LON', 'FRAME'],
};
