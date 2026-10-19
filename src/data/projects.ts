import type { Project, SectionCopy } from './types';

export const projectsCopy: SectionCopy = { label: '[02] SELECTED WORK', title: 'SELECTED WORK' };
export const projects: Project[] = [
  { slug: 'generative-identities', index: '01', name: 'GENERATIVE IDENTITIES', year: '2026', category: 'Brand Systems', summary: 'A rule-based identity that redraws itself for every context it appears in.', source: 'ribbon', signature: 'halftone', aspect: '4/5' },
  { slug: 'digital-archive', index: '02', name: 'DIGITAL ARCHIVE', year: '2026', category: 'Web / Archive', summary: 'A searchable index of forty years of printed matter, rebuilt as a navigable surface.', source: 'strata', signature: 'raster', aspect: '5/4' },
  { slug: 'system-001', index: '03', name: 'SYSTEM / 001', year: '2025', category: 'Interactive Installation', summary: 'A wall of 4,096 vertical lines that answers movement in the room.', source: 'orbit', signature: 'dither', aspect: '1/1' },
  { slug: 'machine-studies', index: '04', name: 'MACHINE STUDIES', year: '2025', category: 'Research / Motion', summary: 'Studies in mechanical motion, drawn with dots and recorded frame by frame.', source: 'orb', signature: 'dots', aspect: '3/4' },
  { slug: 'signal-noise', index: '05', name: 'SIGNAL / NOISE', year: '2025', category: 'Audio-Visual', summary: 'A live performance where sound is drawn as terrain and noise as weather.', source: 'wave', signature: 'ascii', aspect: '16/10' },
  { slug: 'terrain-index', index: '06', name: 'TERRAIN INDEX', year: '2024', category: 'Data / Cartography', summary: 'A cartographic index that turns elevation data into line rasters.', source: 'terrain', signature: 'halftone', aspect: '4/3' },
];
