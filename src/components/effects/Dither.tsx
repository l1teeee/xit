// Adapted from React Bits Dither, https://reactbits.dev/backgrounds/dither
'use client';

import { useEffect, useRef, type CSSProperties } from 'react';
import { getPointer, retainPointer } from '@/lib/pointer';
import { BLOOM_FIELD } from '@/shaders/chunks/bloomField';
import { WATER_FIELD } from '@/shaders/chunks/waterField';
import { VOID_FIELD } from '@/shaders/chunks/voidField';
import './Dither.css';

export type DitherColor = string | [number, number, number];
export type DitherMode = 'ascii' | 'dots' | 'dither' | 'hybrid' | 'bayer' | 'bayer4' | 'bayer2' | 'halftone' | 'lines' | 'crosshatch' | 'noise' | 'none';
export type DitherMouseEffect = 'erase' | 'reveal' | 'ripple';
export type DitherField =
  | { kind: 'bloom'; layout: (width: number, height: number) => Float32Array }
  | { kind: 'water' }
  | { kind: 'void' };

export interface DitherProps {
  field?: DitherField;
  waveSpeed?: number;
  waveFrequency?: number;
  waveAmplitude?: number;
  waveColor?: DitherColor;
  backgroundColor?: DitherColor;
  colorNum?: number;
  pixelSize?: number;
  disableAnimation?: boolean;
  fade?: number;
  enableMouseInteraction?: boolean;
  mouseRadius?: number;
  ditherMode?: DitherMode;
  palette?: string[];
  scale?: number;
  contrast?: number;
  brightness?: number;
  mouseEffect?: DitherMouseEffect;
  mouseStrength?: number;
  trail?: number;
  clickRipple?: boolean;
  intro?: boolean;
  dpr?: number;
  className?: string;
  style?: CSSProperties;
}

type Settings = {
  field?: DitherField;
  waveSpeed: number;
  waveFrequency: number;
  waveAmplitude: number;
  waveColor: DitherColor;
  backgroundColor: DitherColor;
  colorNum: number;
  pixelSize: number;
  disableAnimation: boolean;
  fade: number;
  enableMouseInteraction: boolean;
  mouseRadius: number;
  mode: number;
  palette: string[];
  scale: number;
  contrast: number;
  brightness: number;
  effect: number;
  mouseStrength: number;
  trail: number;
  clickRipple: boolean;
  intro: boolean;
  dpr?: number;
};

type TrailPoint = { x: number; y: number; weight: number };

type Ripple = { x: number; y: number; age: number };

type Program = { program: WebGLProgram; uniforms: Record<string, WebGLUniformLocation | null> };

const MODES: Record<DitherMode, number> = {
  ascii: 8,
  dots: 9,
  dither: 0,
  hybrid: 10,
  bayer: 0,
  bayer4: 1,
  bayer2: 2,
  halftone: 3,
  lines: 4,
  crosshatch: 5,
  noise: 6,
  none: 7
};
const EFFECTS: Record<string, number> = { erase: 0, reveal: 1, ripple: 2 };
const MAX_TRAIL = 16;
const MAX_RIPPLES = 6;
const MAX_PALETTE = 8;
const INTRO_SECONDS = 1.8;
const BLOOM_OPEN_SECONDS = 2.4;
const RIPPLE_SECONDS = 3.2;
// uFieldShape values: 0 is the hero's waves.
const FIELD_SHAPES = { bloom: 1, water: 2, void: 3 } as const;
// Where the first drop of a water field falls, just below the centered title, so visitors find the water without text.
const WATER_INTRO_DROP = { x: 0, y: -0.22 } as const;

const VERTEX = `#version 300 es
in vec2 aPosition;
void main() {
  gl_Position = vec4(aPosition, 0.0, 1.0);
}`;

const WAVE_FRAGMENT = `#version 300 es
precision highp float;
precision highp int;
uniform vec2 uResolution;
uniform float uCell;
uniform float uTime;
uniform float uWaveSpeed;
uniform float uWaveFrequency;
uniform float uWaveAmplitude;
uniform float uScale;
uniform float uContrast;
uniform float uBrightness;
uniform int uEffect;
uniform float uRadius;
uniform float uStrength;
uniform vec3 uTrail[${MAX_TRAIL}];
uniform int uTrailCount;
uniform vec4 uRipples[${MAX_RIPPLES}];
uniform int uRippleCount;
uniform float uIntro;
uniform float uReach;
uniform int uFieldShape;
out vec4 outColor;

const float DROP_FRONT_SPEED = 0.32;
const float DROP_WAVELENGTH = 0.06;
const float DROP_DISPLACEMENT = 0.012;
const float DROP_DENSITY = 1.8;

vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
vec2 fade(vec2 t) { return t * t * t * (t * (t * 6.0 - 15.0) + 10.0); }

float cnoise(vec2 P) {
  vec4 Pi = floor(P.xyxy) + vec4(0.0, 0.0, 1.0, 1.0);
  vec4 Pf = fract(P.xyxy) - vec4(0.0, 0.0, 1.0, 1.0);
  Pi = mod289(Pi);
  vec4 ix = Pi.xzxz;
  vec4 iy = Pi.yyww;
  vec4 fx = Pf.xzxz;
  vec4 fy = Pf.yyww;
  vec4 i = permute(permute(ix) + iy);
  vec4 gx = fract(i * (1.0 / 41.0)) * 2.0 - 1.0;
  vec4 gy = abs(gx) - 0.5;
  vec4 tx = floor(gx + 0.5);
  gx = gx - tx;
  vec2 g00 = vec2(gx.x, gy.x);
  vec2 g10 = vec2(gx.y, gy.y);
  vec2 g01 = vec2(gx.z, gy.z);
  vec2 g11 = vec2(gx.w, gy.w);
  vec4 norm = taylorInvSqrt(vec4(dot(g00, g00), dot(g01, g01), dot(g10, g10), dot(g11, g11)));
  g00 *= norm.x;
  g01 *= norm.y;
  g10 *= norm.z;
  g11 *= norm.w;
  float n00 = dot(g00, vec2(fx.x, fy.x));
  float n10 = dot(g10, vec2(fx.y, fy.y));
  float n01 = dot(g01, vec2(fx.z, fy.z));
  float n11 = dot(g11, vec2(fx.w, fy.w));
  vec2 fadeXY = fade(Pf.xy);
  vec2 nx = mix(vec2(n00, n01), vec2(n10, n11), fadeXY.x);
  return 2.3 * mix(nx.x, nx.y, fadeXY.y);
}

float fbm(vec2 p) {
  float value = 0.0;
  float amp = 1.0;
  for (int i = 0; i < 4; i++) {
    value += amp * abs(cnoise(p));
    p *= uWaveFrequency;
    amp *= uWaveAmplitude;
  }
  return value;
}

float pattern(vec2 p) {
  vec2 p2 = p - uTime * uWaveSpeed;
  return fbm(p + fbm(p2));
}

${BLOOM_FIELD}

${WATER_FIELD}

${VOID_FIELD}

// A falling drop: a front expands from the impact with a train of crests behind it. Returns -1..1.
float dropWave(float dist, float age) {
  float life = clamp(age / ${RIPPLE_SECONDS.toFixed(2)}, 0.0, 1.0);
  float wavelengthsBehindFront = (age * DROP_FRONT_SPEED - dist) / DROP_WAVELENGTH;
  float frontEdge = smoothstep(-0.5, 0.0, wavelengthsBehindFront);
  float trainTail = exp(-0.45 * max(wavelengthsBehindFront, 0.0)) * (1.0 - smoothstep(2.8, 3.8, wavelengthsBehindFront));
  float fadeWithAge = 1.0 - smoothstep(0.0, 1.0, life);
  float fadeWithDistance = 1.0 / (1.0 + 4.0 * dist);
  return cos(6.28318530718 * wavelengthsBehindFront) * frontEdge * trainTail * fadeWithAge * fadeWithDistance;
}

void main() {
  vec2 corner = (gl_FragCoord.xy - 0.5) * uCell;
  vec2 uv = corner / uResolution - 0.5;
  uv.x *= uResolution.x / uResolution.y;

  float touch = 0.0;
  for (int i = 0; i < ${MAX_TRAIL}; i++) {
    if (i >= uTrailCount) break;
    vec3 point = uTrail[i];
    float reach = uRadius * mix(0.55, 1.0, point.z);
    touch = max(touch, point.z * (1.0 - smoothstep(0.0, reach, length(uv - point.xy))));
  }

  vec2 warp = vec2(0.0);
  float ring = 0.0;
  for (int i = 0; i < ${MAX_RIPPLES}; i++) {
    if (i >= uRippleCount) break;
    vec4 ripple = uRipples[i];
    vec2 delta = uv - ripple.xy;
    float dist = length(delta);
    float wave = dropWave(dist, ripple.z) * ripple.w;
    warp += (dist > 0.0001 ? delta / dist : vec2(0.0)) * wave * DROP_DISPLACEMENT;
    ring += max(wave, 0.0);
  }

  if (uEffect == 2 && touch > 0.0) {
    vec3 head = uTrail[0];
    vec2 delta = uv - head.xy;
    float dist = length(delta);
    warp += (dist > 0.0001 ? delta / dist : vec2(0.0)) * sin(dist / max(uRadius, 0.001) * 16.0 - uTime * 7.0) * 0.04 * touch * uStrength;
  }

  float f = pattern((uv + warp) / uScale);
  if (uFieldShape == 1) f = bloomField(uv + warp, f);
  if (uFieldShape == 2) f = waterField(uv + warp, f);
  if (uFieldShape == 3) f = voidField(uv + warp, f);
  if (uEffect == 0) f -= 0.5 * touch * uStrength;
  if (uEffect == 1) f += 0.5 * touch * uStrength;
  f += ring * DROP_DENSITY;
  f = (f - 0.5) * uContrast + 0.5 + uBrightness;
  float show = clamp((uIntro * uReach - length(uv)) / 0.45, 0.0, 1.0);
  float v = clamp(f, 0.0, 1.0) * show * show * (3.0 - 2.0 * show);
  outColor = vec4(floor(v * 255.0) / 255.0, fract(v * 255.0), 0.0, 1.0);
}`;

const DITHER_FRAGMENT = `#version 300 es
precision highp float;
precision highp int;
uniform sampler2D uField;
uniform ivec2 uFieldSize;
uniform float uCellDevice;
uniform int uMode;
uniform int uPreviousMode;
uniform float uModeMix;
uniform float uColorNum;
uniform vec3 uWave;
uniform vec3 uBackground;
uniform vec3 uPalette[${MAX_PALETTE}];
uniform int uPaletteCount;
uniform float uTransparent;
uniform float uFade;
out vec4 outColor;

const float bayer8[64] = float[64](
  0.0 / 64.0, 48.0 / 64.0, 12.0 / 64.0, 60.0 / 64.0, 3.0 / 64.0, 51.0 / 64.0, 15.0 / 64.0, 63.0 / 64.0,
  32.0 / 64.0, 16.0 / 64.0, 44.0 / 64.0, 28.0 / 64.0, 35.0 / 64.0, 19.0 / 64.0, 47.0 / 64.0, 31.0 / 64.0,
  8.0 / 64.0, 56.0 / 64.0, 4.0 / 64.0, 52.0 / 64.0, 11.0 / 64.0, 59.0 / 64.0, 7.0 / 64.0, 55.0 / 64.0,
  40.0 / 64.0, 24.0 / 64.0, 36.0 / 64.0, 20.0 / 64.0, 43.0 / 64.0, 27.0 / 64.0, 39.0 / 64.0, 23.0 / 64.0,
  2.0 / 64.0, 50.0 / 64.0, 14.0 / 64.0, 62.0 / 64.0, 1.0 / 64.0, 49.0 / 64.0, 13.0 / 64.0, 61.0 / 64.0,
  34.0 / 64.0, 18.0 / 64.0, 46.0 / 64.0, 30.0 / 64.0, 33.0 / 64.0, 17.0 / 64.0, 45.0 / 64.0, 29.0 / 64.0,
  10.0 / 64.0, 58.0 / 64.0, 6.0 / 64.0, 54.0 / 64.0, 9.0 / 64.0, 57.0 / 64.0, 5.0 / 64.0, 53.0 / 64.0,
  42.0 / 64.0, 26.0 / 64.0, 38.0 / 64.0, 22.0 / 64.0, 41.0 / 64.0, 25.0 / 64.0, 37.0 / 64.0, 21.0 / 64.0
);

const float bayer4[16] = float[16](
  0.0 / 16.0, 8.0 / 16.0, 2.0 / 16.0, 10.0 / 16.0,
  12.0 / 16.0, 4.0 / 16.0, 14.0 / 16.0, 6.0 / 16.0,
  3.0 / 16.0, 11.0 / 16.0, 1.0 / 16.0, 9.0 / 16.0,
  15.0 / 16.0, 7.0 / 16.0, 13.0 / 16.0, 5.0 / 16.0
);

const float bayer2[4] = float[4](0.0 / 4.0, 2.0 / 4.0, 3.0 / 4.0, 1.0 / 4.0);

float threshold(vec2 cell, int mode) {
  if (mode == 1) {
    ivec2 c = ivec2(mod(cell, 4.0));
    return bayer4[c.y * 4 + c.x];
  }
  if (mode == 2) {
    ivec2 c = ivec2(mod(cell, 2.0));
    return bayer2[c.y * 2 + c.x];
  }
  if (mode == 4) {
    return abs(fract(cell.y / 4.0) - 0.5) * 2.0 * 0.999;
  }
  if (mode == 5) {
    float a = abs(fract((cell.x + cell.y) / 6.0) - 0.5) * 2.0;
    float b = abs(fract((cell.x - cell.y) / 6.0) - 0.5) * 2.0;
    return min(a, b) * 0.999;
  }
  if (mode == 6) {
    return fract(52.9829189 * fract(dot(cell, vec2(0.06711056, 0.00583715))));
  }
  if (mode == 7) {
    return 0.25;
  }
  ivec2 c = ivec2(mod(cell, 8.0));
  return bayer8[c.y * 8 + c.x];
}

vec3 toSrgb(vec3 c) {
  c = clamp(c, 0.0, 1.0);
  return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c));
}

float cellHash(vec2 cell) {
  uvec2 q = uvec2(ivec2(cell)) * uvec2(1597334673u, 3812015801u);
  uint n = (q.x ^ q.y) * 1597334673u;
  return float(n >> 8u) * (1.0 / 16777216.0);
}

// Cells drop out in scattered white-noise order so the dissolve is even with no visible pattern,
// instead of the field thinning down to its peaks.
bool dissolved(vec2 cell) {
  return cellHash(cell) < uFade;
}

vec4 emptyColor() {
  if (uPaletteCount > 1) return vec4(toSrgb(uPalette[0]), 1.0);
  if (uTransparent > 0.5) return vec4(0.0);
  return vec4(toSrgb(uBackground), 1.0);
}

float fieldAt(vec2 cell) {
  vec4 value = texelFetch(uField, clamp(ivec2(cell), ivec2(0), uFieldSize - 1), 0);
  return value.r + value.g / 255.0;
}

// Seven rows of five bits per glyph; dense hash and at-sign marks are omitted for legibility.
const uint glyphRows[42] = uint[42](
  0u, 0u, 0u, 0u, 0u, 0u, 0u,
  0u, 0u, 0u, 0u, 0u, 4u, 4u,
  0u, 4u, 4u, 0u, 4u, 4u, 0u,
  0u, 0u, 0u, 31u, 0u, 0u, 0u,
  0u, 4u, 4u, 31u, 4u, 4u, 0u,
  0u, 21u, 14u, 31u, 14u, 21u, 0u
);

float asciiInk(vec2 pixel, float density) {
  ivec2 local = ivec2(floor(mod(pixel, vec2(8.0, 14.0)))) - ivec2(1, 3);
  if (local.x < 0 || local.x >= 5 || local.y < 0 || local.y >= 7) return 0.0;
  int glyph = int(floor(density * 5.99));
  uint row = glyphRows[glyph * 7 + 6 - local.y];
  return float((row >> uint(4 - local.x)) & 1u);
}

vec4 screenColor(int mode) {
  vec2 pixel = gl_FragCoord.xy * 2.0 / uCellDevice;
  vec2 pitch = mode == 8 ? vec2(8.0, 14.0) : vec2(8.0);
  vec2 screen = pixel;
  if (mode == 3) screen = vec2(pixel.x + pixel.y, pixel.y - pixel.x) * 0.70710678;
  vec2 center = (floor(screen / pitch) + 0.5) * pitch;
  if (mode == 3) center = vec2(center.x - center.y, center.x + center.y) * 0.70710678;
  float density = smoothstep(0.22, 0.86, fieldAt(center / 2.0));
  float ink;
  if (mode == 8) {
    ink = asciiInk(pixel, pow(density, 1.8));
  } else {
    float radius = 3.25 * sqrt(density);
    float distanceToDot = length(mod(screen, pitch) - pitch * 0.5);
    float aa = 0.7 * 2.0 / uCellDevice;
    ink = (1.0 - smoothstep(radius - aa, radius + aa, distanceToDot)) * step(0.015, density);
    if (mode == 10) {
      float lineDistance = abs(mod(pixel.y, 8.0) - 4.0);
      float lines = 1.0 - smoothstep(density * 2.5 - aa, density * 2.5 + aa, lineDistance);
      ink = mix(ink, lines, smoothstep(0.4, 0.7, density));
    }
  }
  if (dissolved(floor(screen / pitch))) ink = 0.0;
  float strength = mix(0.35, 0.85, density);
  if (mode == 8) strength *= 1.0 - 0.25 * smoothstep(0.7, 1.0, density);
  vec3 color = toSrgb(uWave);
  if (uPaletteCount > 1) color = toSrgb(uPalette[uPaletteCount - 1]);
  float alpha = ink * strength;
  if (uTransparent > 0.5) return vec4(color * alpha, alpha);
  return vec4(mix(toSrgb(uBackground), color, alpha), 1.0);
}

vec4 renderMode(int mode) {
  if (mode == 3 || mode >= 8) return screenColor(mode);
  vec2 cell = floor(gl_FragCoord.xy / uCellDevice);
  if (dissolved(cell)) return emptyColor();
  vec4 sampleValue = texelFetch(uField, clamp(ivec2(cell), ivec2(0), uFieldSize - 1), 0);
  float f = sampleValue.r + sampleValue.g / 255.0;
  float t = threshold(cell, mode) - 0.25;

  if (uPaletteCount > 1) {
    float n = float(uPaletteCount);
    float v = f + t / (n - 1.0);
    v = clamp(v - mix(0.2, 0.0, smoothstep(0.45, 0.8, v)), 0.0, 1.0);
    int index = int(floor(v * (n - 1.0) + 0.5));
    return vec4(toSrgb(uPalette[index]), 1.0);
  }

  float levels = max(uColorNum, 1.01) - 1.0;
  if (uTransparent > 0.5) {
    float v = f + t / levels;
    v = clamp(v - mix(0.2, 0.0, smoothstep(0.45, 0.8, v)), 0.0, 1.0);
    float a = floor(v * levels + 0.5) / levels;
    return vec4(toSrgb(uWave) * a, a);
  }

  float base = dot(uBackground, vec3(0.2126, 0.7152, 0.0722));
  vec3 offset = (uWave - vec3(base)) * f + t / levels;
  float luminance = dot(uBackground + offset, vec3(0.2126, 0.7152, 0.0722));
  bool rising = dot(uWave, vec3(0.2126, 0.7152, 0.0722)) >= base;
  // Faint waves are pulled back toward the background so they do not speckle.
  // Waves lighter than the background fade toward dark, waves darker than it fade toward light.
  float faintness = rising ? luminance : 1.0 - luminance;
  float pull = mix(0.2, 0.0, smoothstep(0.45, 0.8, faintness));
  offset -= rising ? pull : -pull;
  float lower = rising ? 0.0 : -max(uBackground.r, max(uBackground.g, uBackground.b));
  float upper = rising ? 1.0 - min(uBackground.r, min(uBackground.g, uBackground.b)) : 0.0;
  offset = floor(clamp(offset, lower, upper) * levels + 0.5) / levels;
  // Quantization must not make a mark darker than either configured endpoint.
  vec3 color = clamp(uBackground + offset, min(uBackground, uWave), max(uBackground, uWave));
  return vec4(toSrgb(color), 1.0);
}

void main() {
  outColor = renderMode(uMode);
  if (uModeMix < 1.0) outColor = mix(renderMode(uPreviousMode), outColor, uModeMix);
}`;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const compile = (gl: WebGL2RenderingContext, type: number, source: string) => {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return shader;
  console.error('Dither shader compilation failed:', gl.getShaderInfoLog(shader));
  gl.deleteShader(shader);
  return null;
};

const link = (gl: WebGL2RenderingContext, fragmentSource: string): Program | null => {
  const vertex = compile(gl, gl.VERTEX_SHADER, VERTEX);
  const fragment = compile(gl, gl.FRAGMENT_SHADER, fragmentSource);
  const program = gl.createProgram();
  if (!vertex || !fragment || !program) {
    if (vertex) gl.deleteShader(vertex);
    if (fragment) gl.deleteShader(fragment);
    if (program) gl.deleteProgram(program);
    return null;
  }
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.bindAttribLocation(program, 0, 'aPosition');
  gl.linkProgram(program);
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error('Dither program linking failed:', gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
    return null;
  }
  const uniforms: Record<string, WebGLUniformLocation | null> = {};
  const count = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
  for (let i = 0; i < count; i++) {
    const info = gl.getActiveUniform(program, i);
    if (info) uniforms[info.name.replace('[0]', '')] = gl.getUniformLocation(program, info.name);
  }
  return { program, uniforms };
};

const getBloomLayout = (field: DitherField | undefined) => (field?.kind === 'bloom' ? field.layout : undefined);

const toLinear = (value: number) => (value <= 0.04045 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4));

export const Dither = ({
  field,
  waveSpeed = 0.05,
  waveFrequency = 3,
  waveAmplitude = 0.3,
  waveColor = [0.5, 0.5, 0.5],
  backgroundColor = [0, 0, 0],
  colorNum = 4,
  pixelSize = 2,
  disableAnimation = false,
  fade = 0,
  enableMouseInteraction = true,
  mouseRadius = 1,
  ditherMode = 'bayer',
  palette,
  scale = 1,
  contrast = 1,
  brightness = 0,
  mouseEffect = 'erase',
  mouseStrength = 1,
  trail = 0.5,
  clickRipple = true,
  intro = true,
  dpr,
  className = '',
  style
}: DitherProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const wakeRef = useRef<(() => void) | null>(null);
  const settings: Settings = {
    field,
    waveSpeed,
    waveFrequency,
    waveAmplitude,
    waveColor,
    backgroundColor,
    colorNum: Math.max(2, colorNum),
    pixelSize: Math.max(1, pixelSize),
    disableAnimation,
    fade: clamp(fade, 0, 1),
    enableMouseInteraction,
    mouseRadius: Math.max(0.001, mouseRadius),
    mode: MODES[ditherMode] ?? 0,
    palette: Array.isArray(palette) ? palette.filter(Boolean).slice(0, MAX_PALETTE) : [],
    scale: Math.max(0.05, scale),
    contrast,
    brightness,
    effect: EFFECTS[mouseEffect] ?? 0,
    mouseStrength: Math.max(0, mouseStrength),
    trail: clamp(trail, 0, 1),
    clickRipple,
    intro,
    dpr
  };
  const settingsRef = useRef(settings);
  useEffect(() => {
    settingsRef.current = settings;
    wakeRef.current?.();
  });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;
    // Each effect owns its canvas so Strict Mode never reuses a lost context.
    const canvas = document.createElement('canvas');
    canvas.className = 'dither-canvas';
    canvas.dataset.canvas = 'dither-background';
    canvas.setAttribute('aria-hidden', 'true');
    const gl = canvas.getContext('webgl2', {
      alpha: true,
      premultipliedAlpha: true,
      antialias: false,
      depth: false,
      stencil: false
    });
    if (!gl) return undefined;

    const wave = link(gl, WAVE_FRAGMENT);
    const dither = link(gl, DITHER_FRAGMENT);
    if (!wave || !dither) {
      if (wave) gl.deleteProgram(wave.program);
      if (dither) gl.deleteProgram(dither.program);
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return undefined;
    }
    container.appendChild(canvas);

    const buffer = gl.createBuffer();
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

    const field = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, field);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    const framebuffer = gl.createFramebuffer();

    const probe = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    let reduce = motionQuery.matches;
    const releasePointer = retainPointer();
    const cache = new Map<string, number[]>();
    const toColor = (value: DitherColor): number[] => {
      if (Array.isArray(value)) return [0, 1, 2].map(i => clamp(Number(value[i]) || 0, 0, 1));
      const key = String(value);
      const cached = cache.get(key);
      if (cached) return cached;
      let rgb = [0, 0, 0];
      if (probe) {
        probe.clearRect(0, 0, 1, 1);
        probe.fillStyle = '#000000';
        probe.fillStyle = key;
        probe.fillRect(0, 0, 1, 1);
        const [r, g, b] = probe.getImageData(0, 0, 1, 1).data;
        rgb = [r, g, b].map(channel => toLinear(channel / 255));
      }
      cache.set(key, rgb);
      return rgb;
    };

    const view = { width: 1, height: 1, ratio: 1, cell: 1, cellCss: 1, cols: 1, rows: 1 };
    const pointer = { x: 0, y: 0, inside: false, set: false };
    const trailPoints: TrailPoint[] = [];
    const ripples: Ripple[] = [];
    const trailData = new Float32Array(MAX_TRAIL * 3);
    const rippleData = new Float32Array(MAX_RIPPLES * 4);
    const paletteData = new Float32Array(MAX_PALETTE * 3);
    const state = {
      time: 0,
      hx: 0,
      hy: 0,
      presence: 0,
      openness: getBloomLayout(settingsRef.current.field) && !settingsRef.current.disableAnimation ? 0 : 1,
      reveal: settingsRef.current.intro && !reduce ? 0 : 1
    };
    let raf = 0;
    let last = 0;
    let visible = false;
    let lastPointerX = Number.NaN;
    let lastPointerY = Number.NaN;
    let currentMode = settingsRef.current.mode;
    let previousMode = currentMode;
    let modeChangedAt = Number.NEGATIVE_INFINITY;
    let lastDisabled = settingsRef.current.disableAnimation;

    const allocate = () => {
      const s = settingsRef.current;
      view.cell = Math.max(1, Math.round(s.pixelSize * view.ratio));
      view.cellCss = view.cell / view.ratio;
      view.cols = Math.max(1, Math.ceil(canvas.width / view.cell));
      view.rows = Math.max(1, Math.ceil(canvas.height / view.cell));
      gl.bindTexture(gl.TEXTURE_2D, field);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, view.cols, view.rows, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, field, 0);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    };

    const toUv = (x: number, y: number): [number, number] => {
      const aspect = view.width / view.height;
      return [(x / view.width - 0.5) * aspect, -(y / view.height - 0.5)];
    };

    const addRipple = (x: number, y: number) => {
      ripples.push({ x, y, age: 0 });
      if (ripples.length > MAX_RIPPLES) ripples.shift();
    };

    const render = () => {
      const s = settingsRef.current;
      const expected = Math.max(1, Math.round(s.pixelSize * view.ratio));
      if (expected !== view.cell) allocate();
      const now = performance.now();
      if (s.mode !== currentMode) {
        if (now - modeChangedAt >= 175) previousMode = currentMode;
        currentMode = s.mode;
        modeChangedAt = now;
      }
      const modeMix = reduce || s.disableAnimation ? 1 : Math.min(1, (now - modeChangedAt) / 350);

      let trailCount = 0;
      for (let i = 0; i < trailPoints.length && trailCount < MAX_TRAIL; i++) {
        const point = trailPoints[i];
        if (point.weight <= 0.01) continue;
        trailData.set([point.x, point.y, point.weight], trailCount * 3);
        trailCount++;
      }
      let rippleCount = 0;
      for (let i = ripples.length - 1; i >= 0 && rippleCount < MAX_RIPPLES; i--) {
        rippleData.set([ripples[i].x, ripples[i].y, ripples[i].age, 1], rippleCount * 4);
        rippleCount++;
      }

      const eased = s.intro && !reduce && !s.disableAnimation ? state.reveal * state.reveal * (3 - 2 * state.reveal) : 1;

      gl.bindVertexArray(vao);
      gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
      gl.viewport(0, 0, view.cols, view.rows);
      gl.useProgram(wave.program);
      const w = wave.uniforms;
      gl.uniform2f(w.uResolution, canvas.width / view.ratio, canvas.height / view.ratio);
      gl.uniform1f(w.uCell, view.cellCss);
      gl.uniform1f(w.uTime, state.time);
      gl.uniform1f(w.uWaveSpeed, s.waveSpeed);
      gl.uniform1f(w.uWaveFrequency, s.waveFrequency);
      gl.uniform1f(w.uWaveAmplitude, s.waveAmplitude);
      gl.uniform1i(w.uFieldShape, s.field ? FIELD_SHAPES[s.field.kind] : 0);
      gl.uniform1f(w.uBloomOpenness, reduce || s.disableAnimation ? 1 : 1 - Math.pow(1 - state.openness, 3));
      gl.uniform1f(w.uScale, s.scale);
      gl.uniform1f(w.uContrast, s.contrast);
      gl.uniform1f(w.uBrightness, s.brightness);
      gl.uniform1i(w.uEffect, s.effect);
      gl.uniform1f(w.uRadius, s.mouseRadius);
      gl.uniform1f(w.uStrength, s.mouseStrength);
      gl.uniform3fv(w.uTrail, trailData);
      gl.uniform1i(w.uTrailCount, trailCount);
      gl.uniform4fv(w.uRipples, rippleData);
      gl.uniform1i(w.uRippleCount, rippleCount);
      gl.uniform1f(w.uIntro, eased);
      gl.uniform1f(w.uReach, 0.5 * Math.hypot(view.width / view.height, 1) + 0.45);
      gl.drawArrays(gl.TRIANGLES, 0, 3);

      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.useProgram(dither.program);
      const d = dither.uniforms;
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, field);
      gl.uniform1i(d.uField, 0);
      gl.uniform2i(d.uFieldSize, view.cols, view.rows);
      gl.uniform1f(d.uCellDevice, view.cell);
      gl.uniform1i(d.uMode, s.mode);
      gl.uniform1i(d.uPreviousMode, previousMode);
      gl.uniform1f(d.uModeMix, modeMix * modeMix * (3 - 2 * modeMix));
      gl.uniform1f(d.uColorNum, s.colorNum);
      gl.uniform3fv(d.uWave, toColor(s.waveColor));
      const transparent = s.backgroundColor === 'transparent';
      gl.uniform3fv(d.uBackground, transparent ? [0, 0, 0] : toColor(s.backgroundColor));
      gl.uniform1f(d.uTransparent, transparent ? 1 : 0);
      gl.uniform1f(d.uFade, s.fade);
      s.palette.forEach((value, index) => paletteData.set(toColor(value), index * 3));
      gl.uniform3fv(d.uPalette, paletteData);
      gl.uniform1i(d.uPaletteCount, s.palette.length);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    const frame = (now: number) => {
      raf = 0;
      if (!visible || document.hidden) return;
      const s = settingsRef.current;
      if (reduce || s.disableAnimation) {
        if (reduce) state.time = 0;
        render();
        last = 0;
        return;
      }
      const sharedPointer = getPointer();
      if (sharedPointer.active && (sharedPointer.x !== lastPointerX || sharedPointer.y !== lastPointerY)) {
        lastPointerX = sharedPointer.x;
        lastPointerY = sharedPointer.y;
        locate(sharedPointer.x, sharedPointer.y);
      }
      const dt = last ? clamp((now - last) / 1000, 0.0005, 0.05) : 1 / 60;
      last = now;
      if (!s.disableAnimation && !reduce) state.time += dt;
      if (getBloomLayout(s.field)) state.openness = Math.min(1, state.openness + dt / BLOOM_OPEN_SECONDS);

      const engaged = s.enableMouseInteraction && pointer.inside && !reduce;
      state.presence += ((engaged ? 1 : 0) - state.presence) * (1 - Math.exp(-dt / (engaged ? 0.12 : 0.35)));
      if (pointer.set) {
        const [tx, ty] = toUv(pointer.x, pointer.y);
        const follow = 1 - Math.exp(-dt / 0.06);
        const moved = Math.hypot(tx - state.hx, ty - state.hy);
        state.hx += (tx - state.hx) * follow;
        state.hy += (ty - state.hy) * follow;
        const decay = Math.exp(-dt / (0.08 + s.trail * 0.7));
        trailPoints.forEach(point => {
          point.weight *= decay;
        });
        const head = trailPoints[0];
        if (!head || Math.hypot(head.x - state.hx, head.y - state.hy) > 0.012 || moved > 0.012) {
          trailPoints.unshift({ x: state.hx, y: state.hy, weight: state.presence });
        } else {
          head.x = state.hx;
          head.y = state.hy;
          head.weight = state.presence;
        }
        if (s.trail <= 0.001) trailPoints.length = Math.min(trailPoints.length, 1);
        while (
          trailPoints.length > MAX_TRAIL ||
          (trailPoints.length > 1 && trailPoints[trailPoints.length - 1].weight < 0.01)
        ) {
          trailPoints.pop();
        }
      }

      for (let i = ripples.length - 1; i >= 0; i--) {
        ripples[i].age += dt;
        if (ripples[i].age >= RIPPLE_SECONDS) ripples.splice(i, 1);
      }

      if (!s.intro || reduce) state.reveal = 1;
      else if (state.reveal < 1) state.reveal = Math.min(1, state.reveal + dt / INTRO_SECONDS);

      render();
      const busy =
        !s.disableAnimation ||
        state.reveal < 1 ||
        ripples.length > 0 ||
        state.presence > 0.002 ||
        trailPoints.some(point => point.weight > 0.01);
      if (busy && !reduce) raf = requestAnimationFrame(frame);
      else last = 0;
    };

    const wake = () => {
      if (!visible || document.hidden) return;
      if (reduce || settingsRef.current.disableAnimation) {
        cancelAnimationFrame(raf);
        raf = 0;
        last = 0;
        if (reduce) state.time = 0;
        render();
        return;
      }
      if (!raf) raf = requestAnimationFrame(frame);
    };

    const resize = () => {
      const s = settingsRef.current;
      const width = Math.max(1, container.clientWidth);
      const height = Math.max(1, container.clientHeight);
      const ratio = Math.min(window.devicePixelRatio || 1, s.dpr ?? 2);
      view.width = width;
      view.height = height;
      canvas.width = Math.max(1, Math.round(width * ratio));
      canvas.height = Math.max(1, Math.round(height * ratio));
      view.ratio = canvas.width / width;
      const bloomLayout = getBloomLayout(s.field);
      if (bloomLayout) {
        gl.useProgram(wave.program);
        gl.uniform4fv(wave.uniforms.uBlooms, bloomLayout(width, height));
      }
      allocate();
      wake();
    };

    const locate = (clientX: number, clientY: number) => {
      const rect = container.getBoundingClientRect();
      pointer.x = clientX - rect.left;
      pointer.y = clientY - rect.top;
      pointer.inside = pointer.x >= 0 && pointer.y >= 0 && pointer.x <= rect.width && pointer.y <= rect.height;
      if (pointer.inside && !pointer.set) {
        const [x, y] = toUv(pointer.x, pointer.y);
        state.hx = x;
        state.hy = y;
        pointer.set = true;
      }
    };

    const onPointerDown = (event: PointerEvent) => {
      const s = settingsRef.current;
      locate(event.clientX, event.clientY);
      if (!pointer.inside || !s.clickRipple || reduce || s.disableAnimation) return;
      const [x, y] = toUv(pointer.x, pointer.y);
      addRipple(x, y);
      wake();
    };

    const onPointerUp = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse') pointer.inside = false;
    };

    const onPointerLeave = () => {
      pointer.inside = false;
    };

    const onVisibility = () => {
      cancelAnimationFrame(raf);
      raf = 0;
      last = 0;
      wake();
    };

    const onMotionChange = () => {
      reduce = motionQuery.matches;
      onVisibility();
    };

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);
    const intersection = new IntersectionObserver(entries => {
      visible = entries.some(entry => entry.isIntersecting);
      cancelAnimationFrame(raf);
      raf = 0;
      last = 0;
      if (visible) wake();
    });
    intersection.observe(container);
    motionQuery.addEventListener('change', onMotionChange);
    window.addEventListener('pointerdown', onPointerDown, { passive: true });
    window.addEventListener('pointerup', onPointerUp, { passive: true });
    window.addEventListener('pointercancel', onPointerUp, { passive: true });
    document.documentElement.addEventListener('pointerleave', onPointerLeave);
    document.addEventListener('visibilitychange', onVisibility);
    resize();

    let lastDpr = settingsRef.current.dpr;
    let lastBloomLayout = getBloomLayout(settingsRef.current.field);
    wakeRef.current = () => {
      const s = settingsRef.current;
      const bloomLayout = getBloomLayout(s.field);
      const becameActive = lastDisabled && !s.disableAnimation;
      if (bloomLayout && becameActive) state.openness = 0;
      if (s.field?.kind === 'water' && s.clickRipple && !reduce && becameActive) {
        addRipple(WATER_INTRO_DROP.x, WATER_INTRO_DROP.y);
      }
      // Ripples stand still while paused, so a rested scene must not wake up with a frozen ring.
      if (s.disableAnimation) ripples.length = 0;
      lastDisabled = s.disableAnimation;
      if (s.dpr !== lastDpr || bloomLayout !== lastBloomLayout) {
        lastDpr = s.dpr;
        lastBloomLayout = bloomLayout;
        resize();
        return;
      }
      wake();
    };

    return () => {
      cancelAnimationFrame(raf);
      wakeRef.current = null;
      resizeObserver.disconnect();
      intersection.disconnect();
      releasePointer();
      motionQuery.removeEventListener('change', onMotionChange);
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
      document.documentElement.removeEventListener('pointerleave', onPointerLeave);
      document.removeEventListener('visibilitychange', onVisibility);
      gl.deleteProgram(wave.program);
      gl.deleteProgram(dither.program);
      gl.deleteBuffer(buffer);
      gl.deleteVertexArray(vao);
      gl.deleteTexture(field);
      gl.deleteFramebuffer(framebuffer);
      canvas.remove();
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    };
  }, []);

  return (
    <div ref={containerRef} className={`dither-container${className ? ` ${className}` : ''}`} style={{ background: typeof backgroundColor === 'string' ? backgroundColor : `rgb(${backgroundColor.map(channel => Math.round(channel * 255)).join(' ')})`, ...style }} />
  );
};

