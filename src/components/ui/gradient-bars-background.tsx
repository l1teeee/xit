import type { CSSProperties } from 'react';
import { cn } from '@/lib/cn';
import './gradient-bars-background.css';

interface GradientBarsProps {
  numBars?: number;
  gradientFrom?: string;
  gradientTo?: string;
  animationDuration?: number;
  className?: string;
}

type BarStyle = CSSProperties & { '--initial-scale': number };

const MAX_HEIGHT_PERCENT = 100;
const MIN_HEIGHT_PERCENT = 30;
const CENTER_POSITION = 0.5;
const HEIGHT_CURVE_EXPONENT = 1.2;
const DELAY_STEP_SECONDS = 0.1;

// The bars are shortest in the middle and grow toward both edges.
function barHeightPercent(index: number, total: number): number {
  const position = index / (total - 1);
  const distanceFromCenter = Math.abs(position - CENTER_POSITION);
  const heightFraction = Math.pow(distanceFromCenter * 2, HEIGHT_CURVE_EXPONENT);
  return MIN_HEIGHT_PERCENT + (MAX_HEIGHT_PERCENT - MIN_HEIGHT_PERCENT) * heightFraction;
}

export function GradientBars({
  numBars = 15,
  gradientFrom = 'rgb(255, 60, 0)',
  gradientTo = 'transparent',
  animationDuration = 2,
  className,
}: GradientBarsProps) {
  return (
    <div className={cn('gradient-bars', className)}>
      <div className="gradient-bars-track">
        {Array.from({ length: numBars }, (_, index) => {
          // Math.pow may differ in the last digit between engines, which would be a hydration mismatch.
          const initialScale = Number((barHeightPercent(index, numBars) / MAX_HEIGHT_PERCENT).toFixed(4));
          const barStyle: BarStyle = {
            flex: `1 0 calc(100% / ${numBars})`,
            maxWidth: `calc(100% / ${numBars})`,
            background: `linear-gradient(to top, ${gradientFrom}, ${gradientTo})`,
            transform: `scaleY(${initialScale})`,
            animationDuration: `${animationDuration}s`,
            animationDelay: `${index * DELAY_STEP_SECONDS}s`,
            '--initial-scale': initialScale,
          };
          return <div key={index} className="gradient-bar" style={barStyle} />;
        })}
      </div>
    </div>
  );
}
