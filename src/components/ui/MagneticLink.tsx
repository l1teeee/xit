import type { ComponentPropsWithoutRef, ReactNode } from 'react';

export type MagneticLinkProps = {
  href: string;
  strength?: number;
  cursor?: 'link' | 'project';
  children: ReactNode;
  className?: string;
} & Omit<ComponentPropsWithoutRef<'a'>, 'href' | 'children' | 'className'>;

export function MagneticLink({ href, strength, cursor, children, className, ...props }: MagneticLinkProps) {
  void strength;
  return <a {...props} href={href} className={className} data-cursor={cursor}>{children}</a>;
}
