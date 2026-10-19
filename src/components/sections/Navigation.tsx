import { navigation } from '@/data/navigation';

export function Navigation() {
  return (
    <header>
      <nav aria-label="Primary">
        {navigation.map(item => <a key={item.index} href={item.href}>{item.label}</a>)}
      </nav>
    </header>
  );
}
