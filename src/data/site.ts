import type { HeroCopy, SectionTitleCopy, Site } from './types';

export const site: Site = {
  name: 'AACII',
  description: 'A digital garden written in ASCII: a hummingbird made of letters, flowers that sway in the wind, and a field you can plant.',
};

export const life: SectionTitleCopy = {
  phrases: [{ lines: ['A hummingbird', 'made of letters.'] }],
};

export const garden: SectionTitleCopy = {
  phrases: [{ lines: ['Touch the soil.', 'Watch it bloom.'] }],
};

export const cycle: SectionTitleCopy = {
  phrases: [{ lines: ['Nothing ends.', 'It reseeds.'] }],
};

export const hero: HeroCopy = {
  phrases: [
    { lines: ['GROWN', 'IN CODE.'] },
    { lines: ['GARDENS', 'OF TEXT.'] },
    { lines: ['GRASS', 'THAT TYPES.'] },
    { lines: ['GREEN,', 'IN GRAYSCALE.'] },
  ],
};
