# Assets

- `public/textures/earth-land.png`: the globe land mask, derived from the
  three-globe package example images under the MIT license and based on NASA
  Blue Marble data. The mask is inverted, resized and filtered to remove small
  water features. The source color image is not shipped. The globe component is
  kept in the repository but is not rendered by the current page.
- `src/components/effects/Dither.tsx` and `Dither.css`: adapted from React Bits
  Dither, https://reactbits.dev/backgrounds/dither. License as published by the
  React Bits project. The page defaults to procedural ASCII and offers dots,
  halftone, Bayer dither, horizontal lines and hybrid through a bottom-right
  native radio picker. All styles share the existing animated wave field and
  white/gray palette, with a 350 ms shader crossfade and instant reduced-motion
  switching. Background ink is capped at `#a8a8a8`, with softer screen marks.
  The ASCII glyphs are original five-bit row masks for 5 by 7 characters,
  generated without a font atlas or image asset. The ramp omits dense hash and
  at-sign marks and favors sparse glyphs. Dots and halftone
  use analytic circles; hybrid mixes circles and lines. The darker-on-white
  luminance correction is retained, and pointer erase/click ripple stay off.
- The pointer trail is drawn at runtime on a 2D canvas with JetBrains Mono
  characters (bits, operators, brackets and symbols). No image or font file is
  added for it.
- VT323: the title typeface, a bitmap terminal face modeled on the DEC VT220 screen
  font, designed by Peter Hull and licensed under the SIL Open Font License 1.1.
  JetBrains Mono, used by the pointer trail, the background picker and the plain
  heading fallback, is licensed under the same license. Both load through
  `next/font/google`; Next.js self-hosts the generated font assets. No local font
  files are shipped.
- Inter Tight (SIL Open Font License 1.1) is only used by the shelved ASCII art
  title in `src/components/sections/hero/ascii-art-title/`. That module loads it
  through `next/font/google` itself, so the font is not requested while the title
  is not mounted.
- The hero title is real text typed at runtime in VT323, uppercase, set directly
  over the background with no window or panel. A tight white halo of layered
  text shadows keeps it legible, all in CSS. Typed and erased characters pass
  through hexadecimal digits 0 to F, which are plain text in the same font, and
  the occasional soft glitch cuts that drift bands of the text sideways and fade
  hexadecimal digits over them are copies of that text moved with CSS clip paths,
  transforms and opacity.
  VT323's latin subset has no katakana, so none is used. The title typefaces were
  compared by eye during development; no comparison harness is shipped. No image
  or font file is added for the title or picker.
- The shelved ASCII art title draws each phrase in Inter Tight 800 into an
  offscreen canvas and samples it into opaque black `#` body characters with `+`
  edges, set in JetBrains Mono 800. A temporary 1x comparison of hash, at-sign and
  plus treatments informed that choice; the harness is not shipped.
- The keyboard click is synthesized at runtime with the Web Audio API. No audio
  file is shipped.
- The globe raster treatments and fallback poster are generated in code. They
  belong to the kept but unrendered globe.
