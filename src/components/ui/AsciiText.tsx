export interface AsciiTextProps {
  children: string;
  as?: 'span' | 'p' | 'div' | 'h2' | 'h3';
  trigger?: 'hover' | 'view' | 'both';
  charset?: string;
  className?: string;
}

export function AsciiText({ children, as: Tag = 'span', className }: AsciiTextProps) {
  return <Tag className={className}>{children}</Tag>;
}
