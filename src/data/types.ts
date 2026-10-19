export type ImageTreatment = 'normal' | 'dither' | 'halftone' | 'dots' | 'raster' | 'ascii';
export type ProceduralSourceId = 'ribbon' | 'strata' | 'orbit' | 'orb' | 'wave' | 'terrain';
export type RasterVariant = 'lines' | 'halftone' | 'dots' | 'dither' | 'hybrid';
export interface NavItem { index: string; label: string; href: string }
export interface Project {
  slug: string; index: string; name: string; year: string; category: string;
  summary: string; source: ProceduralSourceId; signature: ImageTreatment; aspect: string;
}
export interface Capability { index: string; title: string; summary: string; tags: string[] }

export interface Site {
  name: string; descriptor: string; year: string; place: string; coordinates: string;
  email: string; availability: string; description: string;
}
export interface SectionCopy { label: string; title: string }
export interface HeroCopy {
  label: string; titleLines: string[]; subtitle: string; accessibleTitle: string; indicators: string[];
}
export interface ManifestoCopy {
  label: string; statementLines: string[]; body: string; tags: string[]; ladderSteps: string[];
}
export interface ExperimentalCopy extends SectionCopy { caption: string; readouts: string[] }
export interface ContactCopy { label: string; titleLines: string[]; cta: string; href: string }
export interface FooterCopy { copyright: string; coordinates: string; backToTop: string; credit: string }
