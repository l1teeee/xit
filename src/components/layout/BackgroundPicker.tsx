'use client';

import { BACKGROUND_STYLES, BACKGROUND_STYLE_LABELS, useBackgroundStyle } from './BackgroundStyle';

export function BackgroundPicker() {
  const { backgroundStyle, setBackgroundStyle } = useBackgroundStyle();

  return (
    <div role="radiogroup" aria-label="Garden texture" className="background-picker">
      {BACKGROUND_STYLES.map(style => (
        <label key={style} className="background-picker-option">
          <input
            type="radio"
            name="background-style"
            value={style}
            checked={backgroundStyle === style}
            onChange={() => setBackgroundStyle(style)}
          />
          <span>{BACKGROUND_STYLE_LABELS[style]}</span>
        </label>
      ))}
    </div>
  );
}
