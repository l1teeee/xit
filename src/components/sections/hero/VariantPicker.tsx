'use client';

import type { RasterVariant } from '@/data/types';
import { cn } from '@/lib/cn';
import { useHeroStage } from './HeroStage';

const options: RasterVariant[] = ['lines', 'halftone', 'dots', 'dither', 'hybrid'];

export function VariantPicker() {
  const { variant, selectVariant } = useHeroStage();

  return (
    <div role="radiogroup" aria-label="Raster mode" className="label-mono -ml-2 flex flex-wrap">
      {options.map(option => (
        <label
          key={option}
          className="relative inline-flex min-h-11 cursor-pointer items-center px-2 py-2 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-signal"
        >
          <input
            type="radio"
            name="raster-mode"
            value={option}
            checked={variant === option}
            onChange={() => selectVariant(option)}
            className="sr-only"
          />
          <span className={cn('decoration-1 underline-offset-4 transition-colors', variant === option ? 'text-ink underline' : 'text-mute hover:text-ink')}>
            {option.toUpperCase()}
          </span>
        </label>
      ))}
    </div>
  );
}
