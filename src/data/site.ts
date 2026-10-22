import type { HeroCopy, SectionTitleCopy, Site } from './types';

export const site: Site = {
  name: 'AACII',
  description: 'AACII is an independent studio for generative graphics, interactive systems and realtime visuals.',
};

export const life: SectionTitleCopy = {
  phrases: [{ lines: ['Life is not natural.', 'It is digital.'] }],
};

export const garden: SectionTitleCopy = {
  phrases: [{ lines: ['A little input.', 'A living world.'] }],
};

export const cycle: SectionTitleCopy = {
  phrases: [{ lines: ['Nothing ends.', 'It reseeds.'] }],
};

export const hero: HeroCopy = {
  phrases: [
    { lines: ['SYSTEMS', 'IN MOTION.'] },
    { lines: ['SIGNAL', 'AND NOISE.'] },
    { lines: ['STRUCTURE', 'IN FLUX.'] },
    { lines: ['SHAPES', 'THAT BREATHE.'] },
  ],
};
