import type { KeySound } from '@/lib/typewriter/keySound';
import { TypewriterLoop, type FlickerTiming } from '@/lib/typewriter/typewriterLoop';
import { paintTitle, sizeTitleElement } from './asciiTitlePainter';
import type { TitleRaster } from './asciiTitleRaster';

const FLICKER: FlickerTiming = { typeMinMs: 110, typeMaxMs: 110, eraseMs: 0, stepMs: 35 };

interface TitleTypewriterOptions {
  animated: boolean;
  sound: KeySound | null;
}

// Paints the shared typewriter loop as rows of ASCII characters.
export class TitleTypewriter {
  private raster: TitleRaster;
  private readonly element: HTMLPreElement;
  private readonly loop: TypewriterLoop;

  constructor(element: HTMLPreElement, raster: TitleRaster, options: TitleTypewriterOptions) {
    this.element = element;
    this.raster = raster;
    sizeTitleElement(element, raster);

    this.loop = new TypewriterLoop({
      keyKinds: raster.phrases.map(phrase => phrase.keyKinds),
      animated: options.animated,
      sound: options.sound,
      flicker: FLICKER,
      onFrame: frame => paintTitle(this.element, this.raster, frame),
    });
  }

  start(): void {
    this.loop.start();
  }

  // The loop keeps phrase, keystroke index and phase, so a rebuild resumes exactly where it was.
  replaceRaster(raster: TitleRaster): void {
    this.raster = raster;
    sizeTitleElement(this.element, raster);
    this.loop.repaint();
  }

  pause(): void {
    this.loop.pause();
  }

  resume(): void {
    this.loop.resume();
  }

  stop(): void {
    this.loop.stop();
  }
}
