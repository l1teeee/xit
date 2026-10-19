import type { ContactCopy, ExperimentalCopy, FooterCopy, HeroCopy, Site } from './types';

export const site: Site = {
  name: 'AACII',
  descriptor: 'Digital systems studio',
  year: '2026',
  place: 'Null Island',
  coordinates: 'N 0.0000 / E 0.0000',
  email: 'hello@aacii.studio',
  availability: 'Taking commissions for Q1 2027',
  description: 'AACII is an independent studio for generative graphics, interactive systems and realtime visuals.',
};

export const hero: HeroCopy = {
  label: '[00] INDEX',
  titleLines: ['SYSTEMS', 'IN MOTION.'],
  subtitle: site.description,
  accessibleTitle: 'AACII - Systems in motion',
  indicators: ['RASTER', 'MODE', 'ROT', 'LAT/LON', 'FRAME'],
};

export const experimental: ExperimentalCopy = {
  label: '[03] FIELD STUDY',
  title: 'FIELD STUDY 001',
  caption: 'Vertical raster, live. Move the cursor to disturb the field.',
  readouts: ['CELL', 'FIELD', 'VELOCITY'],
};

export const contact: ContactCopy = {
  label: '[05] CONTACT',
  titleLines: ["LET'S BUILD", 'SOMETHING', 'THAT MOVES.'],
  cta: 'Start a project',
  href: 'mailto:hello@aacii.studio?subject=New%20project',
};

export const footer: FooterCopy = {
  copyright: '(c) 2026 AACII',
  coordinates: site.coordinates,
  backToTop: 'Back to top',
  credit: 'Built with Next.js, three.js and GLSL.',
};
