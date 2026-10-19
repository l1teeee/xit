import type { KeySound } from './keySound';

export type KeyKind = 'letter' | 'space' | 'break';
export type CursorMode = 'hidden' | 'solid' | 'blinking';

export interface TypewriterFlicker {
  // Keystroke whose character is still resolving.
  key: number;
  // 0 right after the keystroke, 1 once the character has fully settled.
  progress: number;
  // Changes every flicker step, so a view can pick a new glyph each time.
  seed: number;
}

export interface TypewriterVanishing {
  // Erased keystroke whose character still shows as a glyph before it disappears.
  key: number;
  seed: number;
}

export interface TypewriterFrame {
  phraseIndex: number;
  typedKeys: number;
  cursor: CursorMode;
  flicker: TypewriterFlicker | null;
  vanishing: TypewriterVanishing[];
}

export interface FlickerTiming {
  typeMinMs: number;
  typeMaxMs: number;
  // Zero removes an erased character at once.
  eraseMs: number;
  stepMs: number;
}

// typed: the whole phrase has just been typed. erasing: the hold is over and the first key is about to be erased.
export type TypewriterMoment = 'typed' | 'erasing';

export interface TypewriterOptions {
  // One list of keystroke kinds per phrase. Every phrase starts with the same keystroke, which is never erased.
  keyKinds: KeyKind[][];
  animated: boolean;
  sound: KeySound | null;
  flicker: FlickerTiming;
  onFrame: (frame: TypewriterFrame) => void;
  onMoment?: (moment: TypewriterMoment) => void;
}

const TYPE_DELAY_MS = 85;
const TYPE_JITTER = 0.3;
const EXTRA_BEAT_MS: Record<KeyKind, number> = { letter: 0, space: 90, break: 150 };
const ERASE_DELAY_MS = 55;
const ERASE_JITTER = 0.25;
const HOLD_MS = 2000;
const START_REST_MS = 800;
const SWITCH_REST_MS = 500;
// Erasing stops when only the leading letter is left, which is the first keystroke of every phrase.
const ERASE_FLOOR_KEYS = 1;

// typing and erasing fire a keystroke on every action; holding and resting wait with the cursor blinking.
type Phase = 'typing' | 'holding' | 'erasing' | 'resting';

interface ErasedKey {
  key: number;
  erasedAt: number;
}

// One keystroke per character, plus one for every line break between lines.
export function phraseKeyKinds(lines: readonly string[]): KeyKind[] {
  const kinds: KeyKind[] = [];

  lines.forEach((line, lineIndex) => {
    for (let charIndex = 0; charIndex < line.length; charIndex++) {
      kinds.push(line[charIndex] === ' ' ? 'space' : 'letter');
    }
    if (lineIndex < lines.length - 1) kinds.push('break');
  });
  return kinds;
}

function jittered(baseMs: number, jitter: number): number {
  return baseMs * (1 - jitter + Math.random() * 2 * jitter);
}

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function typeDelay(kind: KeyKind): number {
  return jittered(TYPE_DELAY_MS, TYPE_JITTER) + EXTRA_BEAT_MS[kind];
}

// The single requestAnimationFrame loop behind every title: type a phrase, hold, erase back to the
// first keystroke only, then type the next phrase after it, forever. Rendering is left to onFrame.
export class TypewriterLoop {
  private readonly keyKinds: KeyKind[][];
  private readonly animated: boolean;
  private readonly sound: KeySound | null;
  private readonly flicker: FlickerTiming;
  private readonly onFrame: (frame: TypewriterFrame) => void;
  private readonly onMoment: ((moment: TypewriterMoment) => void) | undefined;
  private phase: Phase = 'resting';
  private phraseIndex = 0;
  private typedKeys = 0;
  private nextActionAt = 0;
  private flickerKey = -1;
  private flickerStartedAt = 0;
  private flickerDurationMs = 0;
  private erasedKeys: ErasedKey[] = [];
  // The next phrase takes over once the last erased character has finished vanishing.
  private switchAt: number | null = null;
  private lastFrameKey = '';
  private frameRequest = 0;
  private pausedAt: number | null = null;

  constructor(options: TypewriterOptions) {
    this.keyKinds = options.keyKinds;
    this.animated = options.animated;
    this.sound = options.sound;
    this.flicker = options.flicker;
    this.onFrame = options.onFrame;
    this.onMoment = options.onMoment;
  }

  start(): void {
    if (!this.animated) {
      this.typedKeys = this.currentKinds().length;
      this.emitFrame(performance.now());
      return;
    }
    const now = performance.now();
    this.nextActionAt = now + START_REST_MS;
    this.emitFrame(now);
    this.frameRequest = requestAnimationFrame(this.tick);
  }

  // Sends the current frame again, for views that were rebuilt and lost what they showed.
  repaint(): void {
    this.lastFrameKey = '';
    this.emitFrame(this.pausedAt ?? performance.now());
  }

  pause(): void {
    if (!this.animated || this.pausedAt !== null) return;
    cancelAnimationFrame(this.frameRequest);
    this.pausedAt = performance.now();
  }

  resume(): void {
    if (this.pausedAt === null) return;
    const now = performance.now();
    const pausedFor = now - this.pausedAt;
    this.nextActionAt += pausedFor;
    this.flickerStartedAt += pausedFor;
    this.erasedKeys.forEach(erased => {
      erased.erasedAt += pausedFor;
    });
    if (this.switchAt !== null) this.switchAt += pausedFor;
    this.pausedAt = null;
    this.frameRequest = requestAnimationFrame(this.tick);
  }

  stop(): void {
    cancelAnimationFrame(this.frameRequest);
  }

  private currentKinds(): KeyKind[] {
    return this.keyKinds[this.phraseIndex];
  }

  private tick = (now: number): void => {
    if (now >= this.nextActionAt) this.fireAction(now);
    this.applyPendingSwitch(now);
    this.emitFrame(now);
    this.frameRequest = requestAnimationFrame(this.tick);
  };

  private fireAction(now: number): void {
    if (this.phase === 'resting') this.phase = 'typing';
    if (this.phase === 'holding') {
      this.phase = 'erasing';
      this.onMoment?.('erasing');
    }

    if (this.phase === 'typing') {
      this.typeKey(now);
    } else {
      this.eraseKey(now);
    }
  }

  private typeKey(now: number): void {
    const kinds = this.currentKinds();
    const kind = kinds[this.typedKeys];
    this.typedKeys += 1;
    this.flickerKey = this.typedKeys - 1;
    this.flickerStartedAt = now;
    this.flickerDurationMs = randomBetween(this.flicker.typeMinMs, this.flicker.typeMaxMs);
    this.sound?.play('type', kind === 'letter' ? 'light' : 'heavy');

    if (this.typedKeys === kinds.length) {
      this.phase = 'holding';
      this.nextActionAt = now + HOLD_MS;
      this.onMoment?.('typed');
      return;
    }
    this.nextActionAt = now + typeDelay(kinds[this.typedKeys]);
  }

  private eraseKey(now: number): void {
    const kind = this.currentKinds()[this.typedKeys - 1];
    this.typedKeys -= 1;
    this.flickerKey = -1;
    this.erasedKeys.push({ key: this.typedKeys, erasedAt: now });
    this.sound?.play('erase', kind === 'letter' ? 'light' : 'heavy');

    if (this.typedKeys === ERASE_FLOOR_KEYS) {
      this.switchAt = now + this.flicker.eraseMs;
      this.phase = 'resting';
      this.nextActionAt = now + SWITCH_REST_MS;
      return;
    }
    this.nextActionAt = now + jittered(ERASE_DELAY_MS, ERASE_JITTER);
  }

  private applyPendingSwitch(now: number): void {
    if (this.switchAt === null || now < this.switchAt) return;

    this.phraseIndex = (this.phraseIndex + 1) % this.keyKinds.length;
    this.switchAt = null;
  }

  private currentFlicker(now: number): TypewriterFlicker | null {
    const elapsed = now - this.flickerStartedAt;
    if (this.flickerKey < 0 || elapsed >= this.flickerDurationMs) return null;

    return {
      key: this.flickerKey,
      progress: elapsed / this.flickerDurationMs,
      seed: Math.floor(elapsed / this.flicker.stepMs),
    };
  }

  // Erased keys are dropped once their glyph has been shown for the erase flicker time.
  private currentVanishing(now: number): TypewriterVanishing[] {
    this.erasedKeys = this.erasedKeys.filter(erased => now - erased.erasedAt < this.flicker.eraseMs);

    return this.erasedKeys.map(erased => ({
      key: erased.key,
      seed: Math.floor((now - erased.erasedAt) / this.flicker.stepMs),
    }));
  }

  private cursorMode(): CursorMode {
    if (!this.animated) return 'hidden';
    return this.phase === 'holding' || this.phase === 'resting' ? 'blinking' : 'solid';
  }

  // Emits only when something visible changed, so waiting phases cost no DOM work.
  private emitFrame(now: number): void {
    const flicker = this.currentFlicker(now);
    const vanishing = this.currentVanishing(now);
    const cursor = this.cursorMode();

    const vanishingKey = vanishing.map(erased => `${erased.key}:${erased.seed}`).join(',');
    const frameKey = `${this.phraseIndex}|${this.typedKeys}|${cursor}|${flicker?.seed ?? -1}|${vanishingKey}`;
    if (frameKey === this.lastFrameKey) return;
    this.lastFrameKey = frameKey;

    this.onFrame({ phraseIndex: this.phraseIndex, typedKeys: this.typedKeys, cursor, flicker, vanishing });
  }
}
