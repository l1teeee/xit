import { readFontFamily } from '../fontFamily';
import { ASCII_GLYPHS } from './asciiGlyphs';

type AsciiSurfaceOptions = {
  cellWidth?: number;
  cellHeight?: number;
  ink: string;
  polarity: 'dark-on-light' | 'light-on-dark';
  gamma?: number;
  dprCap?: number;
  glyphs?: readonly string[];
};

export async function loadAsciiSurfaceFont(): Promise<string> {
  const family = readFontFamily('--font-jetbrains-mono');
  await document.fonts.load(`500 14px ${family}`);
  await document.fonts.ready;
  return family;
}

export class AsciiSurface {
  private canvas: HTMLCanvasElement;
  private context: CanvasRenderingContext2D;
  private densityCanvas: HTMLCanvasElement;
  private densityContext: CanvasRenderingContext2D;
  private atlas: HTMLCanvasElement;
  private atlasContext: CanvasRenderingContext2D;
  private cellWidth: number;
  private cellHeight: number;
  private ink: string;
  private polarity: AsciiSurfaceOptions['polarity'];
  private gamma: number;
  private dprCap: number;
  private glyphs: readonly string[];
  private fontFamily: string;
  private cols = 0;
  private rows = 0;
  private width = 0;
  private height = 0;
  private pixelRatio = 0;
  private atlasCellWidth = 0;
  private atlasCellHeight = 0;

  constructor(canvas: HTMLCanvasElement, options: AsciiSurfaceOptions, fontFamily: string) {
    const context = canvas.getContext('2d');
    if (!context) throw new Error('ASCII surface requires a 2D canvas context');
    const densityCanvas = document.createElement('canvas');
    const densityContext = densityCanvas.getContext('2d', { willReadFrequently: true });
    const atlas = document.createElement('canvas');
    const atlasContext = atlas.getContext('2d');
    if (!densityContext || !atlasContext) throw new Error('ASCII surface requires offscreen 2D canvas contexts');

    this.canvas = canvas;
    this.context = context;
    this.densityCanvas = densityCanvas;
    this.densityContext = densityContext;
    this.atlas = atlas;
    this.atlasContext = atlasContext;
    this.cellWidth = options.cellWidth ?? 8;
    this.cellHeight = options.cellHeight ?? 14;
    this.ink = options.ink;
    this.polarity = options.polarity;
    this.gamma = options.gamma ?? 1;
    this.dprCap = options.dprCap ?? 1.75;
    this.glyphs = options.glyphs ?? ASCII_GLYPHS;
    this.fontFamily = fontFamily;
    this.resize();
  }

  resize(): void {
    this.width = this.canvas.clientWidth;
    this.height = this.canvas.clientHeight;
    this.cols = Math.max(1, Math.ceil(this.width / this.cellWidth));
    this.rows = Math.max(1, Math.ceil(this.height / this.cellHeight));
    const pixelRatio = Math.min(window.devicePixelRatio || 1, this.dprCap);
    this.canvas.width = Math.max(1, Math.round(this.width * pixelRatio));
    this.canvas.height = Math.max(1, Math.round(this.height * pixelRatio));
    this.densityCanvas.width = this.cols;
    this.densityCanvas.height = this.rows;
    if (pixelRatio !== this.pixelRatio) {
      this.pixelRatio = pixelRatio;
      this.buildAtlas();
    }
  }

  beginFrame(): CanvasRenderingContext2D {
    const context = this.densityContext;
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.clearRect(0, 0, this.cols, this.rows);
    context.globalAlpha = 1;
    context.setTransform(1 / this.cellWidth, 0, 0, 1 / this.cellHeight, 0, 0);
    return context;
  }

  endFrame(): void {
    const pixels = this.densityContext.getImageData(0, 0, this.cols, this.rows).data;
    const context = this.context;
    context.setTransform(this.pixelRatio, 0, 0, this.pixelRatio, 0, 0);
    context.clearRect(0, 0, this.width, this.height);
    for (let row = 0; row < this.rows; row += 1) {
      for (let col = 0; col < this.cols; col += 1) {
        const offset = (row * this.cols + col) * 4;
        const lightness = (pixels[offset] + pixels[offset + 1] + pixels[offset + 2]) / 765;
        const tone = this.polarity === 'dark-on-light' ? 1 - lightness : lightness;
        const density = Math.pow(pixels[offset + 3] / 255 * tone, this.gamma);
        const glyph = Math.min(this.glyphs.length - 1, Math.ceil(density * (this.glyphs.length - 1)));
        if (glyph === 0) continue;
        context.globalAlpha = 0.45 + density * 0.55;
        context.drawImage(
          this.atlas,
          glyph * this.atlasCellWidth, 0, this.atlasCellWidth, this.atlasCellHeight,
          col * this.cellWidth, row * this.cellHeight, this.cellWidth, this.cellHeight,
        );
      }
    }
    context.globalAlpha = 1;
  }

  dispose(): void {
    this.canvas.width = 0;
    this.canvas.height = 0;
    this.densityCanvas.width = 0;
    this.densityCanvas.height = 0;
    this.atlas.width = 0;
    this.atlas.height = 0;
  }

  private buildAtlas(): void {
    this.atlasCellWidth = Math.ceil(this.cellWidth * this.pixelRatio);
    this.atlasCellHeight = Math.ceil(this.cellHeight * this.pixelRatio);
    this.atlas.width = this.atlasCellWidth * this.glyphs.length;
    this.atlas.height = this.atlasCellHeight;
    const context = this.atlasContext;
    context.setTransform(this.pixelRatio, 0, 0, this.pixelRatio, 0, 0);
    context.font = `500 ${this.cellHeight * 0.9}px ${this.fontFamily}`;
    context.fillStyle = this.ink;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    for (let index = 0; index < this.glyphs.length; index += 1) {
      context.fillText(
        this.glyphs[index],
        (index + 0.5) * this.atlasCellWidth / this.pixelRatio,
        this.atlasCellHeight / this.pixelRatio / 2,
      );
    }
  }
}
