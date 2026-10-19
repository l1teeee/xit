import type { Capability, SectionCopy } from './types';

export const capabilitiesCopy: SectionCopy = { label: '[04] CAPABILITIES', title: 'CAPABILITIES' };
export const capabilities: Capability[] = [
  { index: '01', title: 'IDENTITY SYSTEMS', summary: 'Generative brand identities, type and motion languages.', tags: ['BRAND', 'TYPE', 'MOTION'] },
  { index: '02', title: 'INTERACTIVE EXPERIENCES', summary: 'Sites, installations and tools built in WebGL.', tags: ['WEB', 'INSTALLATION', 'REALTIME'] },
  { index: '03', title: 'CREATIVE DEVELOPMENT', summary: 'Shaders, realtime graphics and custom tooling.', tags: ['GLSL', 'THREE.JS', 'NEXT.JS'] },
  { index: '04', title: 'MOTION RESEARCH', summary: 'Prototypes, studies and moving images made from code.', tags: ['PROTOTYPES', 'FILM', 'SYSTEMS'] },
  { index: '05', title: 'ART DIRECTION', summary: 'Editorial direction for digital products and campaigns.', tags: ['EDITORIAL', 'CAMPAIGN', 'STRATEGY'] },
];
