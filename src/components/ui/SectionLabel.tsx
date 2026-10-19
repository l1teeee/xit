import { cn } from '@/lib/cn';

export interface SectionLabelProps {
  index: string;
  label: string;
  meta?: string;
  className?: string;
}

export function SectionLabel({ index, label, meta, className }: SectionLabelProps) {
  return (
    <div className={cn('label-mono flex items-center gap-4 border-t border-line pt-3', className)}>
      <span>[{index}] {label}</span>
      <span aria-hidden="true" className="min-w-4 flex-1 border-b border-dotted border-line-strong" />
      {meta && <span>{meta}</span>}
    </div>
  );
}
