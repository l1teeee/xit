import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith('@/')) {
      return nextResolve(new URL(`../src/${specifier.slice(2)}.ts`, import.meta.url).href, context);
    }
    if (context.parentURL?.endsWith('.ts') && specifier.startsWith('.') && !specifier.endsWith('.ts')) {
      return nextResolve(new URL(`${specifier}.ts`, context.parentURL).href, context);
    }
    return nextResolve(specifier, context);
  },
});

const { GardenPainter } = await import('../src/components/sections/garden/GardenPainter.ts');
const { AsciiSurface, loadAsciiSurfaceFont } = await import('../src/lib/ascii/asciiSurface.ts');

const scheduled = new Map();
let nextRequest = 0;
globalThis.window = { devicePixelRatio: 3 };
globalThis.requestAnimationFrame = callback => {
  const id = ++nextRequest;
  scheduled.set(id, callback);
  return id;
};
globalThis.cancelAnimationFrame = id => scheduled.delete(id);
const offscreen = [];
let loadedFont = '';
globalThis.getComputedStyle = () => ({ getPropertyValue: () => '"JetBrains Mono", monospace' });
globalThis.document = {
  documentElement: {},
  fonts: {
    load: async font => { loadedFont = font; },
    ready: Promise.resolve(),
  },
  createElement(name) {
    assert.equal(name, 'canvas');
    const view = surface(0, 0);
    offscreen.push(view);
    return view.canvas;
  },
};

function nextFrame(time) {
  const callbacks = [...scheduled.values()];
  scheduled.clear();
  for (const callback of callbacks) callback(time);
}

function surface(width, height = 600) {
  let commands = [];
  let reads = 0;
  let glyphRenders = 0;
  let gradients = 0;
  let pixels;
  let contextOptions;
  const context = {};
  for (const name of ['setTransform', 'save', 'restore', 'translate', 'rotate', 'beginPath', 'ellipse', 'fill', 'stroke', 'moveTo', 'lineTo', 'fillRect', 'closePath', 'arc', 'bezierCurveTo', 'quadraticCurveTo', 'scale']) {
    context[name] = (...args) => commands.push([name, ...args]);
  }
  context.createRadialGradient = () => {
    gradients += 1;
    return { addColorStop: () => {} };
  };
  context.fillText = (...args) => {
    glyphRenders += 1;
    commands.push(['fillText', ...args]);
  };
  context.drawImage = (_atlas, ...args) => commands.push(['drawImage', context.globalAlpha, ...args]);
  context.getImageData = (_x, _y, cols, rows) => {
    reads += 1;
    return { data: pixels ?? new Uint8ClampedArray(cols * rows * 4) };
  };
  context.clearRect = () => { commands = []; };
  return {
    canvas: {
      width: 0,
      height: 0,
      clientWidth: width,
      clientHeight: height,
      getContext: (_kind, options) => { contextOptions = options; return context; },
      getBoundingClientRect: () => { throw new Error('Use CSS client dimensions, not transformed bounds'); },
    },
    context,
    snapshot: () => JSON.stringify(commands),
    strokes: () => commands.filter(command => command[0] === 'stroke').length,
    reads: () => reads,
    glyphRenders: () => glyphRenders,
    gradients: () => gradients,
    commands: () => commands,
    contextOptions: () => contextOptions,
    setPixels: value => { pixels = new Uint8ClampedArray(value); },
  };
}

const family = await loadAsciiSurfaceFont();
assert.match(loadedFont, /^500 14px "JetBrains Mono"/);

for (const polarity of ['dark-on-light', 'light-on-dark']) {
  const view = surface(24, 14);
  const ascii = new AsciiSurface(view.canvas, { ink: '#000000', polarity, gamma: 0.55, dprCap: 2 }, family);
  const [density, atlas] = offscreen.slice(-2);
  assert.deepEqual(density.contextOptions(), { willReadFrequently: true });
  assert.equal(density.canvas.width, 3);
  assert.equal(density.canvas.height, 1);
  assert.equal(atlas.glyphRenders(), 7);
  const foreground = polarity === 'dark-on-light' ? 0 : 255;
  const background = 255 - foreground;
  density.setPixels([
    foreground, foreground, foreground, 255,
    foreground, foreground, foreground, 32,
    background, background, background, 255,
  ]);
  const painterContext = ascii.beginFrame();
  assert.equal(painterContext, density.context);
  assert.deepEqual(density.commands()[0], ['setTransform', 1 / 8, 0, 0, 1 / 14, 0, 0]);
  ascii.endFrame();
  assert.equal(density.reads(), 1, 'one density read per frame');
  const copies = view.commands().filter(command => command[0] === 'drawImage');
  assert.equal(copies.length, 2, 'background cells remain empty');
  assert.equal(copies[0][1], 1, 'opaque ink uses full opacity');
  assert.equal(copies[0][2], 6 * 16, 'opaque ink uses the densest glyph');
  assert.ok(copies[1][1] > 0.45 && copies[1][1] < 1, 'thin marks retain a lighter opacity');
  assert.equal(view.glyphRenders(), 0, 'visible frames only copy atlas glyphs');
  ascii.resize();
  ascii.beginFrame();
  ascii.endFrame();
  assert.equal(density.reads(), 2);
  assert.equal(atlas.glyphRenders(), 7, 'resize at the same DPR reuses the atlas');
  window.devicePixelRatio = 1;
  ascii.resize();
  assert.equal(atlas.glyphRenders(), 14, 'DPR changes rebuild the atlas once');
  window.devicePixelRatio = 3;
  ascii.dispose();
  assert.equal(view.canvas.width + density.canvas.width + atlas.canvas.width, 0);
}
assert.throws(() => new AsciiSurface({ getContext: () => null }, { ink: '#000000', polarity: 'dark-on-light' }, family), /requires a 2D/);

const desktop = surface(1440);
const animated = new GardenPainter(desktop.canvas, family, true);
const desktopDensity = offscreen.at(-2);
assert.equal(desktop.canvas.width, 2520, 'desktop DPR is capped');
assert.equal(scheduled.size, 0, 'offscreen construction must not start a loop');
animated.setActive(true);
animated.setActive(true);
assert.equal(scheduled.size, 1, 'repeated activation must keep one loop');
nextFrame(100);
nextFrame(200);
const beforePause = desktopDensity.snapshot();
animated.setActive(false);
assert.equal(scheduled.size, 0, 'pause cancels the scheduled frame');
animated.setActive(true);
nextFrame(60000);
assert.equal(desktopDensity.snapshot(), beforePause, 'hidden time must not advance the scene');
nextFrame(60016);
assert.notEqual(desktopDensity.snapshot(), beforePause, 'visible animation resumes');
assert.equal(desktopDensity.gradients(), 1, 'petal gradient is built once and reused across flowers and frames');
animated.plant(500, 250);
animated.setAnimated(false);
assert.equal(scheduled.size, 0, 'live reduced-motion changes stop the loop');
const beforeStillInput = desktopDensity.snapshot();
animated.plant(600, 200);
assert.notEqual(desktopDensity.snapshot(), beforeStillInput, 'still input paints immediately');
assert.equal(scheduled.size, 0, 'still input never starts an animation');
animated.setAnimated(true);
assert.equal(scheduled.size, 1, 'motion can resume without replacing the garden');
animated.dispose();
assert.equal(scheduled.size, 0, 'teardown releases the loop');
assert.equal(desktop.canvas.width, 0, 'teardown releases the visible canvas');

for (const [width, limit, ratio] of [[390, 24, 1.25], [1440, 48, 1.75]]) {
  const view = surface(width);
  const painter = new GardenPainter(view.canvas, family, false);
  const density = offscreen.at(-2);
  assert.equal(view.canvas.width, Math.round(width * ratio));
  painter.setActive(true);
  for (let index = 0; index < 250; index++) painter.plant(width / 2, 200);
  assert.equal(density.strokes(), limit * 10, 'repeated input must have bounded drawing work');
  assert.equal(view.strokes(), 0, 'plant geometry never draws to the visible canvas');
  assert.equal(scheduled.size, 0, 'reduced-motion garden remains still under repeated input');
  painter.dispose();
}

process.stdout.write('PASS: ASCII density, polarity, atlas reuse, font loading, bounded planting, DPR, one loop, pause/resume, reduced motion and teardown.\n');
