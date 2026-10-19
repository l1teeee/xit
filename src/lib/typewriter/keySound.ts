export type KeyAction = 'type' | 'erase';
export type KeyStrength = 'light' | 'heavy';

export interface KeySound {
  play(action: KeyAction, strength: KeyStrength): void;
  dispose(): void;
}

interface KeyVoice {
  noiseFrequency: number;
  noiseLevel: number;
  noiseSeconds: number;
  thumpFrequency: number;
  thumpLevel: number;
  thumpSeconds: number;
}

interface AudioGraph {
  context: AudioContext;
  output: GainNode;
  noise: AudioBuffer;
}

// Browsers only start audio after a user gesture, and touch browsers differ on which event counts.
const UNLOCK_EVENTS = ['pointerdown', 'pointerup', 'keydown', 'touchstart', 'touchend'] as const;
const MASTER_GAIN = 0.11;
const MASTER_LOWPASS_HZ = 6000;
const NOISE_BUFFER_SECONDS = 0.08;
const NOISE_CENTER_HZ = 1800;
const NOISE_BAND_Q = 0.7;
const NOISE_LOWPASS_HZ = 4500;
const THUMP_CENTER_HZ = 140;
const THUMP_PITCH_DROP = 0.75;
const ATTACK_SECONDS = 0.004;
const SILENT_GAIN = 0.0001;
const STOP_MARGIN_SECONDS = 0.015;
// Per-key variation stays within a few percent so the clicks feel even and calm.
const PITCH_VARIATION = 0.03;
const VOLUME_VARIATION = 0.04;

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function describeVoice(action: KeyAction, strength: KeyStrength): KeyVoice {
  const isErase = action === 'erase';
  const isHeavy = strength === 'heavy';

  const pitch = randomBetween(1 - PITCH_VARIATION, 1 + PITCH_VARIATION) * (isErase ? 0.9 : 1);
  const volume = randomBetween(1 - VOLUME_VARIATION, 1 + VOLUME_VARIATION) * (isErase ? 0.8 : 1) * (isHeavy ? 1.15 : 1);

  return {
    noiseFrequency: NOISE_CENTER_HZ * pitch,
    noiseLevel: 0.45 * volume,
    noiseSeconds: isHeavy ? 0.03 : 0.024,
    thumpFrequency: THUMP_CENTER_HZ * pitch * (isHeavy ? 0.95 : 1),
    thumpLevel: 0.85 * volume,
    thumpSeconds: isHeavy ? 0.07 : 0.062,
  };
}

function createNoiseBuffer(context: AudioContext): AudioBuffer {
  const buffer = context.createBuffer(1, Math.ceil(context.sampleRate * NOISE_BUFFER_SECONDS), context.sampleRate);
  const samples = buffer.getChannelData(0);
  for (let index = 0; index < samples.length; index++) {
    samples[index] = Math.random() * 2 - 1;
  }
  return buffer;
}

// Every voice reaches the master gain, a very soft lowpass, then a gentle compressor that only catches stacked clicks.
function createGraph(): AudioGraph | null {
  if (typeof AudioContext === 'undefined') return null;

  try {
    const context = new AudioContext({ latencyHint: 'interactive' });

    const limiter = context.createDynamicsCompressor();
    limiter.threshold.value = -12;
    limiter.knee.value = 24;
    limiter.ratio.value = 3;
    limiter.attack.value = 0.01;
    limiter.release.value = 0.25;
    limiter.connect(context.destination);

    const softener = context.createBiquadFilter();
    softener.type = 'lowpass';
    softener.frequency.value = MASTER_LOWPASS_HZ;
    softener.Q.value = -3;
    softener.connect(limiter);

    const output = context.createGain();
    output.gain.value = MASTER_GAIN;
    output.connect(softener);

    return { context, output, noise: createNoiseBuffer(context) };
  } catch {
    return null;
  }
}

// Starts at silence, rises over the attack, decays to a level far below hearing, then the source stops a moment later.
function shapeEnvelope(envelope: GainNode, level: number, startTime: number, seconds: number): void {
  envelope.gain.setValueAtTime(0, startTime);
  envelope.gain.linearRampToValueAtTime(level, startTime + ATTACK_SECONDS);
  envelope.gain.exponentialRampToValueAtTime(SILENT_GAIN, startTime + seconds);
}

function playNoiseBurst(graph: AudioGraph, voice: KeyVoice, startTime: number): void {
  const { context, output, noise } = graph;

  const source = context.createBufferSource();
  source.buffer = noise;

  const band = context.createBiquadFilter();
  band.type = 'bandpass';
  band.frequency.value = voice.noiseFrequency;
  band.Q.value = NOISE_BAND_Q;

  const rolloff = context.createBiquadFilter();
  rolloff.type = 'lowpass';
  rolloff.frequency.value = NOISE_LOWPASS_HZ;
  rolloff.Q.value = -3;

  const envelope = context.createGain();
  shapeEnvelope(envelope, voice.noiseLevel, startTime, voice.noiseSeconds);

  source.connect(band);
  band.connect(rolloff);
  rolloff.connect(envelope);
  envelope.connect(output);
  source.onended = () => envelope.disconnect();
  source.start(startTime);
  source.stop(startTime + voice.noiseSeconds + STOP_MARGIN_SECONDS);
}

function playThump(graph: AudioGraph, voice: KeyVoice, startTime: number): void {
  const { context, output } = graph;

  const oscillator = context.createOscillator();
  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(voice.thumpFrequency, startTime);
  oscillator.frequency.exponentialRampToValueAtTime(voice.thumpFrequency * THUMP_PITCH_DROP, startTime + voice.thumpSeconds);

  const envelope = context.createGain();
  shapeEnvelope(envelope, voice.thumpLevel, startTime, voice.thumpSeconds);

  oscillator.connect(envelope);
  envelope.connect(output);
  oscillator.onended = () => envelope.disconnect();
  oscillator.start(startTime);
  oscillator.stop(startTime + voice.thumpSeconds + STOP_MARGIN_SECONDS);
}

// A refused or failed resume is expected: the context may be allowed to start only after a gesture. The gesture
// listeners stay armed for the whole life of the sound, so the next gesture tries again.
function ignoreRefusedResume(): undefined {
  return undefined;
}

export function createKeySound(): KeySound {
  let graph: AudioGraph | null = null;

  function resumeIfNotRunning(): void {
    if (!graph || graph.context.state === 'running' || graph.context.state === 'closed') return;
    graph.context.resume().catch(ignoreRefusedResume);
  }

  function onStateChange(): void {
    resumeIfNotRunning();
  }

  // The context is created inside a gesture so the browser starts it running and logs no autoplay warning.
  // The listeners are never removed on success: the context can be suspended or interrupted later
  // (a device change, a long pause, Safari taking the audio away), and the next gesture brings it back.
  function unlock(): void {
    if (!graph) {
      graph = createGraph();
      graph?.context.addEventListener('statechange', onStateChange);
    }
    resumeIfNotRunning();
  }

  function onVisibilityChange(): void {
    if (!document.hidden) resumeIfNotRunning();
  }

  UNLOCK_EVENTS.forEach(type => window.addEventListener(type, unlock, { capture: true, passive: true }));
  document.addEventListener('visibilitychange', onVisibilityChange);
  // A page the user has already interacted with may start audio at once, without waiting for another gesture.
  if (navigator.userActivation?.hasBeenActive) unlock();

  return {
    play(action, strength) {
      if (!graph) return;
      if (graph.context.state !== 'running') {
        resumeIfNotRunning();
        return;
      }

      const voice = describeVoice(action, strength);
      const startTime = graph.context.currentTime;
      playNoiseBurst(graph, voice, startTime);
      playThump(graph, voice, startTime);
    },

    dispose() {
      UNLOCK_EVENTS.forEach(type => window.removeEventListener(type, unlock, true));
      document.removeEventListener('visibilitychange', onVisibilityChange);
      if (graph) {
        graph.context.removeEventListener('statechange', onStateChange);
        if (graph.context.state !== 'closed') void graph.context.close();
      }
      graph = null;
    },
  };
}
