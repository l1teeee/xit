'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';

export const BACKGROUND_STYLES = ['ascii', 'dots', 'halftone', 'dither', 'lines', 'hybrid'] as const;
export type BackgroundStyle = typeof BACKGROUND_STYLES[number];

export const BACKGROUND_STYLE_LABELS: Record<BackgroundStyle, string> = {
  ascii: 'roots',
  dots: 'pollen',
  halftone: 'petals',
  dither: 'moss',
  lines: 'rain',
  hybrid: 'wild',
};

interface BackgroundStyleContextValue {
  backgroundStyle: BackgroundStyle;
  setBackgroundStyle: (style: BackgroundStyle) => void;
}

const BackgroundStyleContext = createContext<BackgroundStyleContextValue | null>(null);

export function BackgroundStyleProvider({ children }: { children: ReactNode }) {
  const [backgroundStyle, setBackgroundStyle] = useState<BackgroundStyle>('ascii');

  return (
    <BackgroundStyleContext.Provider value={{ backgroundStyle, setBackgroundStyle }}>
      {children}
    </BackgroundStyleContext.Provider>
  );
}

export function useBackgroundStyle() {
  const context = useContext(BackgroundStyleContext);
  if (!context) throw new Error('useBackgroundStyle must be used within BackgroundStyleProvider');
  return context;
}
