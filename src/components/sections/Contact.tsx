import { contact } from '@/data/site';

export function Contact() {
  return (
    <section id="contact" aria-labelledby="contact-title" data-veil="0.35">
      <h2 id="contact-title" className="sr-only">{contact.titleLines.join(' ')}</h2>
    </section>
  );
}
