import { hero } from '@/data/site';

export function Hero() {
  return (
    <section id="index" aria-labelledby="index-title" data-veil="0">
      <h1 id="index-title" className="sr-only">{hero.accessibleTitle}</h1>
    </section>
  );
}
