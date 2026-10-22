"""Turns the reference hummingbird recording into the frames the Life section plays.

Usage: python scripts/extract-hummingbird.py <path to the recording>

Writes src/components/sections/life/hummingbirdFrames.data.ts. The same recording always gives the same file.
"""

import base64
import sys
from pathlib import Path

import cv2
import numpy as np

REPO_ROOT = Path(__file__).resolve().parent.parent
OUTPUT_PATH = REPO_ROOT / 'src' / 'components' / 'sections' / 'life' / 'hummingbirdFrames.data.ts'

# The recording is a dot matrix on a fixed grid, so these numbers only fit this recording.
EXPECTED_FRAME_WIDTH_PX = 428
EXPECTED_FRAME_HEIGHT_PX = 520
RECORDING_FPS = 30
GRID_PITCH_PX = 8.3
GRID_ORIGIN_X_PX = 1.29
GRID_ORIGIN_Y_PX = 4.6
# Averaging the 3 x 3 pixels around a cell center smooths out the video compression noise.
SAMPLE_RADIUS_PX = 1

# Every cell is one of these colors, and its tone is its position in this list: background, pale dot, blue dot,
# navy capsule.
TONE_COLORS = np.array(
    [
        (224, 224, 227),
        (158, 179, 238),
        (8, 80, 234),
        (18, 23, 72),
    ],
    dtype=np.float64,
)

# Recording frame 139 repeats frame 0, so frames 0 to 138 are exactly one loop.
LOOP_FRAME_COUNT = 139
# The source runs slower than the recording, so frames repeat, and video compression flickers a cell now and then.
# A frame is kept only when more than this many cells differ from the last kept frame.
REPEAT_CELL_TOLERANCE = 8
MARGIN_CELLS = 1
# The recording frame in which the wings are raised in a V, which is the still frame for reduced motion.
STILL_RECORDING_FRAME = 18
TONES_PER_BYTE = 4
BITS_PER_TONE = 2


def read_frames(video_path: Path) -> np.ndarray:
    capture = cv2.VideoCapture(str(video_path))
    if not capture.isOpened():
        raise ValueError(f'Cannot open the recording at {video_path}')

    rgb_frames = []
    while True:
        succeeded, bgr_frame = capture.read()
        if not succeeded:
            break
        rgb_frames.append(cv2.cvtColor(bgr_frame, cv2.COLOR_BGR2RGB))
    capture.release()

    if not rgb_frames:
        raise ValueError(f'The recording at {video_path} has no frames')
    return np.stack(rgb_frames)


def check_recording_fits_measurements(frames: np.ndarray) -> None:
    frame_count, height, width, _ = frames.shape
    if (width, height) != (EXPECTED_FRAME_WIDTH_PX, EXPECTED_FRAME_HEIGHT_PX):
        raise ValueError(
            f'The recording is {width} x {height} px, '
            f'the grid measurements fit {EXPECTED_FRAME_WIDTH_PX} x {EXPECTED_FRAME_HEIGHT_PX}'
        )
    if frame_count <= LOOP_FRAME_COUNT:
        raise ValueError(f'The recording has {frame_count} frames, a loop needs more than {LOOP_FRAME_COUNT}')


def sample_cell_colors(frames: np.ndarray) -> np.ndarray:
    _, height, width, _ = frames.shape
    cols = int((width - GRID_ORIGIN_X_PX) // GRID_PITCH_PX) + 1
    rows = int((height - GRID_ORIGIN_Y_PX) // GRID_PITCH_PX) + 1
    colors = np.zeros((len(frames), rows, cols, 3))

    for row in range(rows):
        center_y = round(GRID_ORIGIN_Y_PX + GRID_PITCH_PX * row)
        top = max(0, center_y - SAMPLE_RADIUS_PX)
        bottom = min(height, center_y + SAMPLE_RADIUS_PX + 1)
        for col in range(cols):
            center_x = round(GRID_ORIGIN_X_PX + GRID_PITCH_PX * col)
            left = max(0, center_x - SAMPLE_RADIUS_PX)
            right = min(width, center_x + SAMPLE_RADIUS_PX + 1)
            colors[:, row, col] = frames[:, top:bottom, left:right].mean(axis=(1, 2))
    return colors


def classify_cells(frames: np.ndarray) -> np.ndarray:
    colors = sample_cell_colors(frames)
    distances = np.linalg.norm(colors[..., np.newaxis, :] - TONE_COLORS, axis=-1)
    return distances.argmin(axis=-1).astype(np.uint8)


def cut_loop(tones: np.ndarray) -> np.ndarray:
    changed_cells = np.count_nonzero(tones[LOOP_FRAME_COUNT] != tones[0])
    if changed_cells > REPEAT_CELL_TOLERANCE:
        raise ValueError(
            f'Recording frame {LOOP_FRAME_COUNT} differs from frame 0 by {changed_cells} cells, so it does not loop there'
        )
    return tones[:LOOP_FRAME_COUNT]


def crop_to_bird(tones: np.ndarray) -> np.ndarray:
    _, rows, cols = tones.shape
    used_rows, used_cols = np.nonzero(tones.max(axis=0))
    top = used_rows.min() - MARGIN_CELLS
    bottom = used_rows.max() + 1 + MARGIN_CELLS
    left = used_cols.min() - MARGIN_CELLS
    right = used_cols.max() + 1 + MARGIN_CELLS

    if top < 0 or left < 0 or bottom > rows or right > cols:
        raise ValueError('The bird is too close to the edge of the grid to keep an empty margin around it')
    return tones[:, top:bottom, left:right]


# The recording frame each kept frame came from is returned too, because the still frame is chosen by it.
def drop_repeated_frames(tones: np.ndarray) -> tuple[np.ndarray, list[int]]:
    source_frames = [0]
    for frame in range(1, len(tones)):
        last_kept = tones[source_frames[-1]]
        changed_cells = np.count_nonzero(tones[frame] != last_kept)
        if changed_cells > REPEAT_CELL_TOLERANCE:
            source_frames.append(frame)
    return tones[source_frames], source_frames


# The still recording frame may itself have been dropped as a repeat, so this is the kept frame that stands in for it.
def find_still_frame(source_frames: list[int]) -> int:
    on_screen = [index for index, source in enumerate(source_frames) if source <= STILL_RECORDING_FRAME]
    return on_screen[-1]


# Four tones per byte, the first tone in the lowest two bits, running frame by frame, row by row, column by column.
def pack_tones(tones: np.ndarray) -> str:
    cells = tones.reshape(-1)
    if len(cells) % TONES_PER_BYTE != 0:
        raise ValueError(f'{len(cells)} cells do not fill whole bytes, and the decoder does not accept padding')

    groups = cells.reshape(-1, TONES_PER_BYTE)
    packed = np.zeros(len(groups), dtype=np.uint8)
    for position in range(TONES_PER_BYTE):
        packed |= groups[:, position] << (BITS_PER_TONE * position)
    return base64.b64encode(packed.tobytes()).decode('ascii')


def render_module(tones: np.ndarray, still_frame: int) -> str:
    frame_count, rows, cols = tones.shape
    frame_seconds = LOOP_FRAME_COUNT / RECORDING_FPS / frame_count
    lines = [
        '// Generated by scripts/extract-hummingbird.py from the reference recording. Do not edit by hand.',
        f'export const FRAME_COLS = {cols};',
        f'export const FRAME_ROWS = {rows};',
        f'export const FRAME_COUNT = {frame_count};',
        f'// The {LOOP_FRAME_COUNT} frames of one loop at {RECORDING_FPS} fps, shared evenly by the kept frames.',
        f'export const FRAME_SECONDS = {frame_seconds!r};',
        f'export const STILL_FRAME = {still_frame};',
        '// Four tones per byte, the first tone in the lowest two bits, frame by frame, row by row, column by column.',
        f"export const PACKED_TONES = '{pack_tones(tones)}';",
    ]
    return '\n'.join(lines) + '\n'


def write_module(text: str) -> None:
    OUTPUT_PATH.write_text(text, encoding='utf-8', newline='\n')


def main() -> None:
    if len(sys.argv) != 2:
        sys.exit('Usage: python scripts/extract-hummingbird.py <path to the recording>')

    frames = read_frames(Path(sys.argv[1]))
    check_recording_fits_measurements(frames)
    all_tones = classify_cells(frames)
    loop_tones = cut_loop(all_tones)
    bird_tones = crop_to_bird(loop_tones)
    kept_tones, source_frames = drop_repeated_frames(bird_tones)
    still_frame = find_still_frame(source_frames)
    write_module(render_module(kept_tones, still_frame))

    frame_count, rows, cols = kept_tones.shape
    print(f'Wrote {OUTPUT_PATH}: {frame_count} frames of {cols} x {rows} cells, still frame {still_frame}')


if __name__ == '__main__':
    main()
