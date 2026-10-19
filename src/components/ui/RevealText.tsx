export interface RevealTextProps {
  children: string;
  as?: 'h1' | 'h2' | 'h3' | 'p' | 'span' | 'div';
  split?: 'lines' | 'words' | 'chars';
  trigger?: 'scroll' | 'mount';
  delay?: number;
  stagger?: number;
  className?: string;
}

export function RevealText({ children, as: Tag = 'div', className }: RevealTextProps) {
  return <Tag className={className} style={{ whiteSpace: 'pre-line' }}>{children}</Tag>;
}
