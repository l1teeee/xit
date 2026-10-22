import { FRAME_COLS, FRAME_COUNT, FRAME_ROWS, PACKED_TONES } from './hummingbirdFrames.data';

export { FRAME_COLS, FRAME_COUNT, FRAME_ROWS, FRAME_SECONDS, STILL_FRAME } from './hummingbirdFrames.data';

const TONES_PER_BYTE = 4;
const BITS_PER_TONE = 2;
const TONE_MASK = 0b11;
const TONES_PER_FRAME = FRAME_COLS * FRAME_ROWS;

// Undoes the packing of scripts/extract-hummingbird.py, which puts the first tone of each byte in its lowest two bits.
function unpackTones(packed: string): Uint8Array {
  const bytes = atob(packed);
  const tones = new Uint8Array(bytes.length * TONES_PER_BYTE);

  for (let byteIndex = 0; byteIndex < bytes.length; byteIndex++) {
    const byte = bytes.charCodeAt(byteIndex);
    for (let position = 0; position < TONES_PER_BYTE; position++) {
      tones[byteIndex * TONES_PER_BYTE + position] = (byte >> (BITS_PER_TONE * position)) & TONE_MASK;
    }
  }
  return tones;
}

function decodeAllFrames(): Uint8Array {
  const tones = unpackTones(PACKED_TONES);
  const expectedLength = TONES_PER_FRAME * FRAME_COUNT;

  if (tones.length !== expectedLength) {
    throw new Error(
      `The hummingbird frames hold ${tones.length} tones but ${FRAME_COUNT} frames of ${FRAME_COLS} x ${FRAME_ROWS} ` +
        `need ${expectedLength}. Run scripts/extract-hummingbird.py again.`,
    );
  }
  return tones;
}

const allTones = decodeAllFrames();

// A view into the decoded frames, not a copy, so showing a frame costs nothing.
export function frameTones(frameIndex: number): Uint8Array {
  const start = frameIndex * TONES_PER_FRAME;
  return allTones.subarray(start, start + TONES_PER_FRAME);
}
