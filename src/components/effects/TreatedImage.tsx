import type { ImageTreatment, ProceduralSourceId } from '@/data/types';

export interface TreatedImageProps {
  source: { kind: 'procedural'; id: ProceduralSourceId } | { kind: 'image'; src: string };
  treatment: ImageTreatment;
  label: string;
  cell?: number;
  className?: string;
  priority?: boolean;
}

export function TreatedImage({ label, className }: TreatedImageProps) {
  return <div role="img" aria-label={label} className={className} data-canvas="treated-image" />;
}
