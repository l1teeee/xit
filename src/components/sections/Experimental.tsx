import { experimental } from '@/data/site';

export function Experimental() {
  return (
    <section id="lab" aria-labelledby="lab-title" data-veil="1">
      <h2 id="lab-title" className="sr-only">{experimental.title}</h2>
    </section>
  );
}
