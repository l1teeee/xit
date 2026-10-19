import { capabilitiesCopy } from '@/data/capabilities';

export function Capabilities() {
  return (
    <section id="capabilities" aria-labelledby="capabilities-title" data-veil="0.6">
      <h2 id="capabilities-title" className="sr-only">{capabilitiesCopy.title}</h2>
    </section>
  );
}
