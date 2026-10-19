import type { RasterVariant } from '@/data/types';
import { ditherChunk } from '@/shaders/chunks/dither';
import { noiseChunk } from '@/shaders/chunks/noise';
import { rasterChunk } from '@/shaders/chunks/raster';

// The numbers must match the branches in variantInk below.
export const rasterSphereVariantIndex: Record<RasterVariant, number> = {
  lines: 0,
  halftone: 1,
  dots: 2,
  dither: 3,
  hybrid: 4,
};

const sphereBody = /* glsl */ `
uniform sampler2D uLand;
uniform float uLandReady;
uniform vec2 uResolution;
uniform vec2 uPointer;
uniform float uTime;
uniform float uReducedMotion;
uniform float uCellPx;
uniform float uYaw;
uniform float uTilt;
uniform float uMix;
uniform int uVariantFrom;
uniform int uVariantTo;
uniform float uDetail;
uniform float uLens;

const float PI = 3.14159265359;
const float TAU = 6.28318530718;
const float DISK_RADIUS = 0.46;
const vec3 PLATE_COLOR = vec3(0.0706, 0.0588, 0.0902);
const float PLATE_ALPHA = 0.88;
const float PLATE_EDGE_PX = 0.75;
const float WARP_AMPLITUDE = 0.004;
const float SHIMMER_AMOUNT = 0.08;
const float LENS_RADIUS = 0.28;
const float LENS_MAGNIFY = 0.08;

// Inverse of: tilt about the x axis applied after a spin about the vertical axis.
// The point facing the viewer therefore sits at latitude uTilt and longitude uYaw.
vec3 toGlobeFrame(vec3 viewNormal) {
  float cosTilt = cos(uTilt);
  float sinTilt = sin(uTilt);
  vec3 untilted = vec3(
    viewNormal.x,
    viewNormal.y * cosTilt + viewNormal.z * sinTilt,
    viewNormal.z * cosTilt - viewNormal.y * sinTilt
  );
  float cosYaw = cos(uYaw);
  float sinYaw = sin(uYaw);
  return vec3(
    untilted.x * cosYaw + untilted.z * sinYaw,
    untilted.y,
    untilted.z * cosYaw - untilted.x * sinYaw
  );
}

float landCoverage(vec3 viewNormal, vec2 diskPosition, float diskRadiusPx) {
  vec3 globe = toGlobeFrame(viewNormal);
  float lon = atan(globe.x, globe.z);
  float lat = asin(clamp(globe.y, -1.0, 1.0));

  if (uDetail > 0.5) {
    vec2 drift = vec2(uTime * 0.05, -uTime * 0.04);
    vec2 warp = vec2(
      valueNoise(diskPosition * 3.0 + drift),
      valueNoise(diskPosition * 3.0 + vec2(19.3, 7.7) - drift)
    ) - 0.5;
    lon += warp.x * 2.0 * WARP_AMPLITUDE;
    lat += warp.y * 2.0 * WARP_AMPLITUDE;
  }

  vec2 uv = vec2(lon / TAU + 0.5, lat / PI + 0.5);

  // Explicit LOD: automatic derivatives jump at the longitude seam and across cell borders,
  // which would classify a whole column of cells as ocean.
  float texelsPerCell = (uCellPx / diskRadiusPx) * float(textureSize(uLand, 0).x) / TAU;
  float lod = max(0.0, log2(max(texelsPerCell, 1.0)) - 0.5);
  return smoothstep(0.3, 0.7, textureLod(uLand, uv, lod).r);
}

float surfaceLuminance(vec3 viewNormal) {
  vec3 light = normalize(vec3(-0.55, 0.45, 0.70));
  float shade = clamp(dot(viewNormal, light), 0.0, 1.0);
  float limb = pow(max(viewNormal.z, 0.0), 0.55);
  return mix(0.18, 1.0, shade) * mix(0.45, 1.0, limb);
}

// Multiplier of at least 1: the density clamp then keeps lit bars fused and only shaded dashes breathe.
float columnShimmer(vec2 cell) {
  float phase = hash21(vec2(cell.x, 11.0)) * TAU;
  float wave = 0.5 + 0.5 * sin(cell.y * 0.35 - uTime * 1.6 + phase);
  return 1.0 + SHIMMER_AMOUNT * wave * (1.0 - uReducedMotion);
}

float lensInfluence(vec2 cellCenter, float diskRadiusPx) {
  vec2 pointerPx = (uPointer - 0.5) * uResolution;
  float falloff = 1.0 - smoothstep(0.0, LENS_RADIUS * diskRadiusPx, distance(cellCenter, pointerPx));
  return uLens * uDetail * falloff;
}

// Every variant returns vec2(glyph density, ink alpha).
vec2 linesParams(float lum, float land, float shimmer) {
  float oceanDensity = min(1.0, mix(0.62, 1.0, lum) * shimmer);
  float oceanAlpha = mix(0.22, 0.62, lum);
  float landDensity = mix(0.30, 0.5, lum);
  return vec2(mix(oceanDensity, landDensity, land), mix(oceanAlpha, 0.95, land));
}

vec2 halftoneParams(float lum, float land) {
  float density = min(0.5, 0.5 * pow(lum, 0.8) * mix(1.0, 1.25, land));
  return vec2(density, 0.95);
}

vec2 dotsParams(float lum, float land) {
  return vec2(0.42, mix(lum, 1.0, 0.6 * land));
}

vec2 ditherParams(float lum, float land, vec2 cell) {
  float cellOn = step(bayer8(cell), lum + land * 0.25);
  return vec2(0.5 * cellOn, 0.9);
}

vec2 dotVariantParams(int variant, float lum, float land, vec2 cell) {
  if (variant == 1) return halftoneParams(lum, land);
  if (variant == 2) return dotsParams(lum, land);
  return ditherParams(lum, land, cell);
}

float linesInk(vec2 local, float lum, float land, float shimmer, float aa) {
  vec2 ocean = linesParams(lum, 0.0, shimmer);
  vec2 continent = linesParams(lum, 1.0, shimmer);
  // Ocean columns have no row end caps, including on the shaded hemisphere.
  float bars = rasterGlyph(vec2(local.x, 0.0), ocean.x, aa) * ocean.y;
  float dots = rasterGlyph(local, continent.x, aa) * continent.y;
  return mix(bars, dots, land);
}

float variantInk(int variant, vec2 local, float lum, float land, vec2 cell, float shimmer, float aa) {
  if (variant == 0) return linesInk(local, lum, land, shimmer, aa);
  if (variant == 4) {
    vec2 dots = dotsParams(lum, land);
    float shadow = rasterGlyph(local, dots.x, aa) * dots.y;
    return mix(shadow, linesInk(local, lum, land, shimmer, aa), smoothstep(0.35, 0.65, lum));
  }
  vec2 params = dotVariantParams(variant, lum, land, cell);
  return rasterGlyph(local, params.x, aa) * params.y;
}

void main() {
  if (uLandReady < 0.5) {
    gl_FragColor = vec4(0.0);
    return;
  }

  float diskRadiusPx = DISK_RADIUS * min(uResolution.x, uResolution.y);
  vec2 centered = gl_FragCoord.xy - 0.5 * uResolution;
  float plateAlpha = PLATE_ALPHA * (1.0 - smoothstep(diskRadiusPx - PLATE_EDGE_PX, diskRadiusPx + PLATE_EDGE_PX, length(centered)));

  vec2 local;
  vec2 cell = rasterCell(centered, uCellPx, local);
  vec2 cellCenter = (cell + 0.5) * uCellPx;
  if (length(cellCenter) > diskRadiusPx) {
    gl_FragColor = vec4(PLATE_COLOR, plateAlpha);
    return;
  }

  vec2 diskPosition = cellCenter / diskRadiusPx;
  vec3 viewNormal = vec3(diskPosition, sqrt(max(0.0, 1.0 - dot(diskPosition, diskPosition))));
  float land = landCoverage(viewNormal, diskPosition, diskRadiusPx);
  float lum = surfaceLuminance(viewNormal);
  float shimmer = columnShimmer(cell);

  float magnify = 1.0 + LENS_MAGNIFY * lensInfluence(cellCenter, diskRadiusPx);
  vec2 glyphLocal = local / magnify;
  float aa = 0.7 / uCellPx;
  float ink = variantInk(uVariantTo, glyphLocal, lum, land, cell, shimmer, aa);
  if (uMix < 1.0) {
    float previousInk = variantInk(uVariantFrom, glyphLocal, lum, land, cell, shimmer, aa);
    ink = mix(previousInk, ink, uMix);
  }

  // Glyph over plate, written as straight alpha because the material blends with SRC_ALPHA.
  float alpha = ink + plateAlpha * (1.0 - ink);
  vec3 premultiplied = vec3(ink) + PLATE_COLOR * plateAlpha * (1.0 - ink);
  gl_FragColor = vec4(premultiplied / max(alpha, 0.0001), alpha);
}
`;

export const rasterSphereFragmentShader = [noiseChunk, ditherChunk, rasterChunk, sphereBody].join('\n');
