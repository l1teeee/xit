import { manifesto } from '@/data/manifesto';

export function Manifesto() {
  return (
    <section id="about" aria-labelledby="about-title" data-veil="0.55">
      <h2 id="about-title" className="sr-only">{manifesto.statementLines.join(' ')}</h2>
    </section>
  );
}
