# AACII - Systems in motion

A single-screen interactive hero for AACII. A rotating WebGL globe switches
between lines, halftone, dots, dither and hybrid treatments over animated
Bayer-dithered waves. Built with Next.js, React, three.js and GSAP.

## Development

Use Node v24.11.1 and npm. Install dependencies with `npm ci`.

```sh
npm run dev -- -p 3001
npm run lint
npm run typecheck
npm run build
npm run start -- -p 3001
```

Stop the development server before starting the production server on the same
port. `npm run check` runs lint, typecheck and build together.

## Structure

- `src/app/`: page, root layout, metadata, fonts and global styles.
- `src/components/sections/Hero.tsx`: the single-screen composition.
- `src/components/sections/hero/`: headline, entrance animations, readouts,
  raster controls, shared state and the static globe poster.
- `src/components/layout/SiteBackground.tsx`: the Dither configuration.
- `src/components/effects/`: Dither, RasterSphere and the shared R3F shader canvas.
- `src/shaders/`: globe shader and its noise, raster and dither chunks.
- `src/hooks/` and `src/lib/`: motion, visibility, pointer, quality and URL helpers.
- `src/data/`: hero copy, metadata content and their types.
- `public/textures/earth-land.png`: the globe's land mask.
- `docs/ASSETS.md`: asset provenance.

## Performance and accessibility

The globe loads on the client with a static poster while its bundle loads.
Each canvas has one animation driver; hidden or offscreen canvases pause.
Dither creates a canvas per effect setup and releases its context and resources
on cleanup, including React Strict Mode effect replay.

Quality tiers reduce resolution and raster detail for small screens, coarse
pointers, data saving and lower CPU counts. Device pixel ratio is capped at 1
for low quality, 1.5 for medium and 2 for high. Dither uses 3 CSS pixels per cell
on low quality and 2 otherwise.

Reduced motion freezes shader time and bypasses decorative entrance animations.
The raster controls are native radio inputs with keyboard support and visible
focus indicators. Decorative canvases are hidden from assistive technology.
Touch devices do not use pointer-driven distortion or a custom cursor.
If WebGL is unavailable, the page retains its background color, globe poster,
copy and controls without changing layout. The page fits the viewport without
scrolling.

## Deploy to Vercel

Import the repository into Vercel, select the Next.js preset and use Node 24.x.
The build command is `npm run build`; keep the framework's default output.
No environment variables are required.

`NEXT_PUBLIC_SITE_URL` is optional and overrides the canonical origin.
Otherwise the app uses Vercel's `VERCEL_PROJECT_PRODUCTION_URL`, falling back
to `http://localhost:3000` locally. Redeploy after changing the optional URL.
