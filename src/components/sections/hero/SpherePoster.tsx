import type { CSSProperties } from 'react';

const GRID_COLUMNS = 56;
const BAR_SHARE_OF_COLUMN = 0.6;
const columnPercent = (100 / GRID_COLUMNS).toFixed(3);
const barPercent = ((100 / GRID_COLUMNS) * BAR_SHARE_OF_COLUMN).toFixed(3);
const lightFalloff = 'radial-gradient(circle at 36% 32%, rgb(0 0 0 / 1) 0%, rgb(0 0 0 / 0.55) 60%, rgb(0 0 0 / 0.15) 100%)';

const barsStyle: CSSProperties = {
  backgroundImage: `repeating-linear-gradient(90deg, rgb(255 255 255 / 0.55) 0 ${barPercent}%, transparent ${barPercent}% ${columnPercent}%)`,
  maskImage: lightFalloff,
  WebkitMaskImage: lightFalloff,
};

export function SpherePoster() {
  return (
    <div aria-hidden="true" className="absolute inset-[4%] rounded-full bg-bg/88">
      <div className="absolute inset-0 rounded-full" style={barsStyle} />
    </div>
  );
}
