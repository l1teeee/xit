import type { Metadata, Viewport } from 'next';
import { JetBrains_Mono, VT323 } from 'next/font/google';
import { site } from '@/data/site';
import { getSiteUrl } from '@/lib/siteUrl';
import './globals.css';

const jetBrainsMono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-jetbrains-mono', display: 'swap' });
const vt323 = VT323({ weight: '400', subsets: ['latin'], variable: '--font-vt323', display: 'swap' });
const title = 'AACII - Digital systems studio';

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: { default: title, template: '%s | AACII' },
  description: site.description,
  applicationName: site.name,
  keywords: ['AACII', 'generative graphics', 'interactive systems', 'realtime visuals', 'digital systems studio'],
  authors: [{ name: site.name }],
  creator: site.name,
  alternates: { canonical: '/' },
  robots: { index: true, follow: true },
  openGraph: { type: 'website', siteName: site.name, locale: 'en_US', url: '/', title, description: site.description },
  twitter: { card: 'summary_large_image', title, description: site.description },
};

export const viewport: Viewport = {
  themeColor: '#ffffff',
  colorScheme: 'light',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${jetBrainsMono.variable} ${vt323.variable} overflow-hidden`}>
      <body className="h-dvh min-h-0 overflow-hidden bg-bg text-ink font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
