# Assets

- `public/textures/earth-land.png`: the globe land mask, derived from the
  three-globe package example images under the MIT license and based on NASA
  Blue Marble data. The mask is inverted, resized and filtered to remove small
  water features. The source color image is not shipped.
- `src/components/effects/Dither.tsx` and `Dither.css`: adapted from React Bits
  Dither, https://reactbits.dev/backgrounds/dither. License as published by the
  React Bits project.
- Inter Tight and JetBrains Mono: loaded through `next/font/google`; Next.js
  self-hosts the generated font assets. No local font files are shipped.
- The globe raster treatments and fallback poster are generated in code.
