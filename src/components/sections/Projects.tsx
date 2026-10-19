import { projectsCopy } from '@/data/projects';

export function Projects() {
  return (
    <section id="work" aria-labelledby="work-title" data-veil="0.7">
      <h2 id="work-title" className="sr-only">{projectsCopy.title}</h2>
    </section>
  );
}
