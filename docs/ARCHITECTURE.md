# AACII site - architecture and contracts

Source of truth for every worker. Read it fully before writing code. Never edit this file.

Visual references (style only, do not copy any third party artwork):
- Globe: a sphere sampled on a square screen-space grid. Ocean cells are continuous vertical bars, land cells are round dots, the grid stays fixed while the sphere rotates underneath.
- Dot matrix creature: the same grid, but each cell grows from a small round dot into a vertical capsule and finally a solid bar as the underlying luminance gets darker.
- Glyph proportions measured on the references: dot diameter about 0.76 of the cell pitch, bar width about 0.6 of the cell pitch, a thin gap between columns.

## 1. Stack and conventions

- Node v24.11.1 and npm only. One package-lock.json. Never run pnpm, yarn or bun.
- Next.js latest stable (App Router, Turbopack), React 19, TypeScript strict, Tailwind CSS v4 with tokens in `@theme` inside `src/app/globals.css`.
- Server Components by default. Use `'use client'` only for components that need state, effects, DOM refs, WebGL or event handlers.
- WebGL: `three` and `@react-three/fiber` for the hero sphere and the experimental field. The page background is the `Dither` component, raw WebGL2 with no dependencies.
- Motion: GSAP with ScrollTrigger, SplitText and ScrambleTextPlugin through `@gsap/react`. `motion` only for small UI state transitions. `lenis` for smooth scroll, driven by the GSAP ticker.
- Source files and copy are ASCII only. Plain hyphens and straight quotes. No emoji, arrows or typographic symbols. Draw icons with CSS or inline SVG.
- Named exports for every component. Default exports only where Next.js requires them.
- No `any`, no `console.log`, no `eslint-disable`, no `@ts-ignore`, no `suppressHydrationWarning`, no dead code, no commented-out code. Comments explain WHY only.
- Content lives in `src/data`. Components never hardcode copy that exists there.

## 2. Page map

Order in `src/app/page.tsx`: SkipLink, Navigation, main[Hero, Manifesto, Projects, Experimental, Capabilities, Contact], Footer.

| Section | id | File | data-veil | Owner |
|---|---|---|---|---|
| SkipLink | - | src/components/layout/SkipLink.tsx | - | foundation |
| Navigation | - | src/components/sections/Navigation.tsx | - | T5a |
| Hero | index | src/components/sections/Hero.tsx | 0 | T1 |
| Manifesto | about | src/components/sections/Manifesto.tsx | 0.55 | T5b |
| Projects | work | src/components/sections/Projects.tsx | 0.7 | T2 |
| Experimental | lab | src/components/sections/Experimental.tsx | 1 | T3 |
| Capabilities | capabilities | src/components/sections/Capabilities.tsx | 0.6 | T5b |
| Contact | contact | src/components/sections/Contact.tsx | 0.35 | T5a |
| Footer | - | src/components/sections/Footer.tsx | 0.8 | T5a |

Section roots: `<section id="..." aria-labelledby="<id>-title" data-veil="...">` with a heading carrying `id="<id>-title"` (use `sr-only` if the visual heading differs). Footer root is `<footer data-veil>`. Navigation root is `<header>`.

`data-veil` is the opacity of a page-color layer drawn over the Dither background while that section is in view. It keeps text readable. `1` means the section fully covers the background.

## 3. Layers

| Layer | z-index variable |
|---|---|
| Dither background and veil (fixed) | -10 |
| Sections | 0 |
| Navigation | `--z-nav` 40 |
| Mobile menu | `--z-menu` 45 |
| NoiseOverlay (fixed, pointer-events none) | `--z-noise` 50 |
| CustomCursor (fixed, pointer-events none) | `--z-cursor` 60 |

## 4. Design tokens

Defined once in `src/app/globals.css` under `@theme`. Use the generated utilities, never raw hex values in components.

Colors:
- `bg` #120f17 (same as the Dither background color, used for the body)
- `black` #000000, `white` #ffffff
- `ink` #ffffff (primary text)
- `mute` #bcbcbc (secondary text, same as the Dither wave color)
- `dim` #8a8791 (labels, 5.4:1 on bg)
- `line` rgb(255 255 255 / 0.16), `line-strong` rgb(255 255 255 / 0.38)
- `signal` #0a47f5, `navy` #060b2b, `pale` #a9c0f5. These three are the only accent family. They are used by the Experimental plate and nowhere else, except a thin `signal` focus ring.

Fonts: `font-sans` is Inter Tight (variable), `font-mono` is JetBrains Mono (variable), both through `next/font/google`, exposed as CSS variables `--font-inter-tight` and `--font-jetbrains-mono`.

Type scale (utilities `text-micro`, `text-label`, `text-body`, `text-lead`, `text-title`, `text-display`, `text-mega`), each with its own line-height and letter-spacing:

| token | size | line-height | tracking |
|---|---|---|---|
| micro | 0.6875rem | 1.3 | 0.08em |
| label | 0.75rem | 1.4 | 0.06em |
| body | clamp(0.95rem, 0.9rem + 0.25vw, 1.125rem) | 1.55 | 0 |
| lead | clamp(1.25rem, 1rem + 1.2vw, 2rem) | 1.25 | -0.02em |
| title | clamp(2rem, 1.2rem + 3.5vw, 4.5rem) | 0.95 | -0.035em |
| display | clamp(3rem, 1rem + 9vw, 11rem) | 0.86 | -0.045em |
| mega | clamp(4rem, 0.5rem + 17vw, 22rem) | 0.8 | -0.06em |

Voice: display and title text is uppercase Inter Tight weight 600. Labels, indices, indicators and captions are uppercase JetBrains Mono at `text-micro` or `text-label`, color `mute` or `dim`. Body copy is Inter Tight weight 400 in `mute` or `ink`.

Spacing: `px-gutter` (clamp(1rem, 0.5rem + 2vw, 2rem)) and `py-section` (clamp(6rem, 12vw, 14rem)). Easing `ease-expo-out` is cubic-bezier(0.16, 1, 0.3, 1).

Custom utilities in globals.css: `label-mono` (mono, micro, uppercase, tracking, `mute`), `grid-12` (12 column grid with gutter gap).

## 5. Foundation modules (real code, shared, read-only for everyone except the foundation task)

- `src/lib/cn.ts`: `cn(...inputs: ClassValue[]): string`.
- `src/lib/gsap.ts`: registers ScrollTrigger, SplitText and ScrambleTextPlugin once. Exports `gsap`, `ScrollTrigger`, `SplitText`, `ScrambleTextPlugin`. Client only.
- `src/lib/pointer.ts`: one passive window pointermove listener for the whole app. Exports `retainPointer(): () => void` (ref counted install and removal) and `getPointer(): Readonly<PointerState>` with `{ x, y, nx, ny, speed, active }`. `x` and `y` are client px, `nx` and `ny` are 0..1 with a top-left origin, `speed` is 0..1 eased and decays to 0 when idle, `active` is true after the first move. Components poll it per frame and never add their own pointermove listeners.
- `src/lib/quality.ts`: `getQualityProfile(): QualityProfile`, see section 9.
- `src/lib/scroll.ts`: `registerLenis(instance: Lenis | null): void`, `scrollToSection(id: string): void` (Lenis when active, native smooth scroll otherwise, instant under reduced motion).
- `src/lib/siteUrl.ts`: `getSiteUrl(): string` from `NEXT_PUBLIC_SITE_URL`, then `VERCEL_PROJECT_PRODUCTION_URL`, then `http://localhost:3000`.
- `src/hooks/useReducedMotion.ts`: `useReducedMotion(): boolean`.
- `src/hooks/useCoarsePointer.ts`: `useCoarsePointer(): boolean`.
- `src/hooks/useQualityProfile.ts`: `useQualityProfile(): QualityProfile` (medium on the server and first render, real values after mount).
- `src/hooks/useInView.ts`: `useInView(ref, options?): boolean`.
- `src/components/effects/Dither.tsx` and `Dither.css`: the React Bits Dither adapted to TypeScript, named export `Dither`, same props and behavior.
- `src/components/layout/SiteBackground.tsx`: fixed Dither background plus the veil layer (see section 7).
- `src/components/layout/SmoothScroll.tsx`: Lenis driven by the GSAP ticker, synced with ScrollTrigger, disabled under reduced motion.
- `src/components/layout/SkipLink.tsx`: visible on focus, targets `#main`.
- `src/components/effects/FullscreenShader.tsx`: R3F canvas running one full-screen fragment shader, see section 8.
- `src/shaders/chunks/noise.ts` exports `noiseChunk` with `hash21`, `hash22`, `valueNoise`, `fbm`, `rot2`.
- `src/shaders/chunks/dither.ts` exports `ditherChunk` with `float bayer8(vec2 cell)` returning a threshold in 0..1.
- `src/shaders/chunks/raster.ts` exports `rasterChunk`:
  - `vec2 rasterCell(vec2 fragPx, float cellPx, out vec2 local)` returns the cell id; `local` is the position inside the cell in cell units, -0.5..0.5, y up.
  - `float rasterGlyph(vec2 local, float density, float aa)` returns coverage 0..1. `density` 0 is empty, 0.5 is a full round dot, 1 is a solid vertical bar that fuses with the cells above and below. Between 0 and 0.5 the circle radius grows to 0.38. Between 0.5 and 1 the shape morphs from the dot into a capsule with half-width 0.30 and half-height growing to 0.5, corner radius shrinking to 0 so stacked cells become one continuous line. `aa` is the antialias width in cell units.
- `src/data/types.ts`: shared types, see section 6.
- `src/data/site.ts`, `navigation.ts`, `manifesto.ts`, `projects.ts`, `capabilities.ts`: typed content from section 10.

## 6. Component contracts

Files marked stub are created by the foundation task with a minimal compiling implementation and the final props. The owner replaces the body and keeps the exports and props unchanged. Need a prop that is not listed? Stop and report it.

```ts
// src/data/types.ts
export type ImageTreatment = 'normal' | 'dither' | 'halftone' | 'dots' | 'raster' | 'ascii';
export type ProceduralSourceId = 'ribbon' | 'strata' | 'orbit' | 'orb' | 'wave' | 'terrain';
export type RasterVariant = 'lines' | 'halftone' | 'dots' | 'dither' | 'hybrid';
export interface NavItem { index: string; label: string; href: string }
export interface Project {
  slug: string; index: string; name: string; year: string; category: string;
  summary: string; source: ProceduralSourceId; signature: ImageTreatment; aspect: string;
}
export interface Capability { index: string; title: string; summary: string; tags: string[] }
```

| File | Export and props | Owner |
|---|---|---|
| ui/SectionLabel.tsx (real, server component) | `SectionLabel({ index: string; label: string; meta?: string; className?: string })`. Renders `[01] MANIFESTO ........ meta` as a mono row over a hairline. | foundation |
| ui/RevealText.tsx (stub: renders the tag with children) | `RevealText({ children: string; as?: 'h1'\|'h2'\|'h3'\|'p'\|'span'\|'div'; split?: 'lines'\|'words'\|'chars'; trigger?: 'scroll'\|'mount'; delay?: number; stagger?: number; className?: string })`. A newline in `children` forces a line break. | T4 |
| ui/MagneticLink.tsx (stub: plain anchor) | `MagneticLink({ href: string; strength?: number; cursor?: 'link'\|'project'; children: ReactNode; className?: string } & other anchor props)`. | T4 |
| ui/AsciiText.tsx (stub: plain span) | `AsciiText({ children: string; as?: 'span'\|'p'\|'div'\|'h2'\|'h3'; trigger?: 'hover'\|'view'\|'both'; charset?: string; className?: string })`. Scrambles through an ASCII ramp and resolves to the text. | T4 |
| effects/CustomCursor.tsx (stub: returns null) | `CustomCursor()`, no props. | T4 |
| effects/NoiseOverlay.tsx (stub: returns null) | `NoiseOverlay()`, no props. | T4 |
| effects/TreatedImage.tsx (stub: empty role="img" box) | `TreatedImage({ source: { kind: 'procedural'; id: ProceduralSourceId } \| { kind: 'image'; src: string }; treatment: ImageTreatment; label: string; cell?: number; className?: string; priority?: boolean })`. Changing `treatment` animates a dissolve to the new treatment. | T2 |
| effects/HalftoneImage.tsx (stub: next/image) | `HalftoneImage({ src: string; alt: string; width: number; height: number; reveal?: boolean; sizes?: string; className?: string })`. Wraps `@anam-ai/halftone-shader`. | T2 |
| effects/RasterSphere.tsx (stub: empty aria-hidden div) | `RasterSphere({ variant?: RasterVariant; className?: string })`. | T1 |
| sections/*.tsx (stubs: valid section root with sr-only heading) | `Navigation()`, `Hero()`, `Manifesto()`, `Projects()`, `Experimental()`, `Capabilities()`, `Contact()`, `Footer()`, no props. | see section 2 |

## 7. DOM contracts

- Cursor targets: `data-cursor="link" | "project" | "canvas"` and optional `data-cursor-label="VIEW"`. CustomCursor reads them by event delegation. Other components only set the attributes.
- Cursor root carries `data-custom-cursor`. It is not rendered at all on coarse pointers and under reduced motion it follows without easing.
- Every WebGL canvas wrapper carries `data-canvas="<name>"`: `dither-background`, `hero-sphere`, `field`, `treated-image`, `halftone`.
- Veil: `SiteBackground` reads every `[data-veil]` element after mount, creates one ScrollTrigger each and tweens `--veil` (0..1) on the veil layer. When the value is 0.98 or more the Dither animation is paused through its `disableAnimation` prop.
- Reveal convention for text: elements with `data-reveal` are hidden only by CSS inside `@media (scripting: enabled)` until JS sets `data-reveal-ready`. A CSS animation makes them visible after 4 seconds as a failsafe. This avoids a flash of visible text and avoids hydration warnings. `RevealText` is the only component that sets `data-reveal-ready`.
- Sections must reserve their final height before assets load (aspect-ratio boxes, min-heights) so nothing shifts.

## 8. WebGL and animation rules

- Create GL resources once. Never allocate geometry, materials, textures or render targets per frame.
- Dispose everything on unmount, including `forceContextLoss()` where the library does not do it.
- A canvas that is offscreen, or whose tab is hidden, schedules zero requestAnimationFrame callbacks. One rAF driver per canvas: either R3F `useFrame` or an own loop, never both.
- DPR is `Math.min(window.devicePixelRatio, profile.dprCap)`.
- Pointer data comes from `getPointer()`. Components never add pointermove listeners.
- Reduced motion: shaders render one static frame with time frozen, no rAF loop. GSAP animations jump to their end state. Lenis is off. Hover effects that move things become instant state changes.
- WebGL unavailable: show a static CSS fallback in the same box with no layout shift. Never throw.
- Canvases are `aria-hidden="true"` unless they carry information. Decorative elements are never focusable.
- Context budget for the whole page: Dither 1, hero sphere 1, field 1, all TreatedImage instances share exactly 1, HalftoneImage 1. Nobody else creates a WebGL context.
- Hover-only behavior is gated with `@media (hover: hover) and (pointer: fine)`.
- `FullscreenShader` contract: client component with props `{ fragmentShader: string; uniforms?: Record<string, THREE.IUniform>; onFrame?: (frame: ShaderFrame) => void; dprCap?: number; canvasName: string; className?: string; fallback?: ReactNode }`. The fragment shader uses three.js ShaderMaterial conventions on WebGL2 (GLSL ES 3.00 features allowed, write `gl_FragColor`, `varying vec2 vUv`). Built-in uniforms: `uTime` (float seconds, 0 when reduced motion), `uResolution` (vec2 device px), `uDpr`, `uPointer` (vec2 0..1 relative to the canvas, y up, eased), `uPointerVelocity` (vec2, eased), `uProgress` (float 0..1, scroll progress of the canvas through the viewport), `uReducedMotion` (0 or 1). `onFrame` runs before each render so owners can update their own uniforms. Output must composite cleanly over the page with no dark halos on antialiased edges.

## 9. Quality profile

```ts
type QualityTier = 'low' | 'medium' | 'high';
interface QualityProfile { tier: QualityTier; dprCap: number; rasterCell: number; ditherPixel: number; particleScale: number }
```

| tier | dprCap | rasterCell (css px) | ditherPixel | particleScale |
|---|---|---|---|---|
| high | 2 | 8 | 2 | 1 |
| medium | 1.5 | 9 | 2 | 0.7 |
| low | 1 | 11 | 3 | 0.4 |

Rule: `low` when the pointer is coarse, or viewport width is under 768, or `hardwareConcurrency` is 4 or less, or `saveData` is on. `high` when the pointer is fine, width is at least 1280 and `hardwareConcurrency` is 8 or more. Otherwise `medium`.

## 10. Copy deck (use verbatim)

site.ts: name "AACII", descriptor "Digital systems studio", year "2026", place "Null Island", coordinates "N 0.0000 / E 0.0000", email "hello@aacii.studio", availability "Taking commissions for Q1 2027", description "AACII is an independent studio for generative graphics, interactive systems and realtime visuals."

navigation.ts: 01 INDEX #index, 02 WORK #work, 03 ABOUT #about, 04 CONTACT #contact.

Hero: title lines "SYSTEMS" and "IN MOTION." ; subtitle = site description ; section label "[00] INDEX". Indicators: RASTER (cell px), MODE (variant), ROT (degrees), LAT/LON, FRAME.

Manifesto (manifesto.ts): label "[01] MANIFESTO"; statement lines "WE DESIGN", "DIGITAL SYSTEMS", "THAT MOVE."; body "AACII works at the edge of design and code. We build identities, interfaces and installations from rules instead of templates: systems that generate, respond and evolve."; tags "EST. 2019", "BASED IN NULL ISLAND", "47 PROJECTS", "FIG. 01 - SOURCE TO RASTER"; ladder steps SOURCE, DITHER, HALFTONE, DOTS, RASTER.

Projects (projects.ts), fields index, name, year, category, summary, source, signature, aspect:
1. "01", "GENERATIVE IDENTITIES", "2026", "Brand Systems", "A rule-based identity that redraws itself for every context it appears in.", ribbon, halftone, "4/5"
2. "02", "DIGITAL ARCHIVE", "2026", "Web / Archive", "A searchable index of forty years of printed matter, rebuilt as a navigable surface.", strata, raster, "5/4"
3. "03", "SYSTEM / 001", "2025", "Interactive Installation", "A wall of 4,096 vertical lines that answers movement in the room.", orbit, dither, "1/1"
4. "04", "MACHINE STUDIES", "2025", "Research / Motion", "Studies in mechanical motion, drawn with dots and recorded frame by frame.", orb, dots, "3/4"
5. "05", "SIGNAL / NOISE", "2025", "Audio-Visual", "A live performance where sound is drawn as terrain and noise as weather.", wave, ascii, "16/10"
6. "06", "TERRAIN INDEX", "2024", "Data / Cartography", "A cartographic index that turns elevation data into line rasters.", terrain, halftone, "4/3"
Slug is the lowercase name with non-alphanumerics replaced by hyphens. Section label "[02] SELECTED WORK".

Experimental: label "[03] FIELD STUDY", title "FIELD STUDY 001", caption "Vertical raster, live. Move the cursor to disturb the field." Readouts CELL, FIELD, VELOCITY.

Capabilities (capabilities.ts), label "[04] CAPABILITIES":
1. "01", "IDENTITY SYSTEMS", "Generative brand identities, type and motion languages.", BRAND, TYPE, MOTION
2. "02", "INTERACTIVE EXPERIENCES", "Sites, installations and tools built in WebGL.", WEB, INSTALLATION, REALTIME
3. "03", "CREATIVE DEVELOPMENT", "Shaders, realtime graphics and custom tooling.", GLSL, THREE.JS, NEXT.JS
4. "04", "MOTION RESEARCH", "Prototypes, studies and moving images made from code.", PROTOTYPES, FILM, SYSTEMS
5. "05", "ART DIRECTION", "Editorial direction for digital products and campaigns.", EDITORIAL, CAMPAIGN, STRATEGY

Contact: label "[05] CONTACT"; title lines "LET'S BUILD", "SOMETHING", "THAT MOVES."; CTA "Start a project" linking to mailto:hello@aacii.studio?subject=New%20project ; email link ; availability text.

Footer: "(c) 2026 AACII", coordinates, "Back to top", "Built with Next.js, three.js and GLSL."

## 11. Assets

- `public/textures/earth-land.png`: 1024x512 single channel land mask, R channel 1 is land, 0 is ocean.
- `public/images/earth-blue-marble.webp`: 1280px wide Earth photo, used by HalftoneImage and the treatment ladder.
- Provenance and licenses of third party code and assets go in `docs/ASSETS.md`.

## 12. Commands and ports

- `npm run lint`, `npx tsc --noEmit` (also `npm run typecheck`), `npm run build`, `npm run check` (all three).
- Main checkout dev server: port 3000. Worker dev servers: only the port written in the brief (3001 and up). Stop every server you start.
- The QA script, when available, is run with node as described in the brief. It reports console errors, overflow and canvas info and saves screenshots you can open with your image viewer tool.
