import type { Metadata, Viewport } from 'next';
import { Inter_Tight, JetBrains_Mono } from 'next/font/google';
import { SiteBackground } from '@/components/layout/SiteBackground';
import { SmoothScroll } from '@/components/layout/SmoothScroll';
import { NoiseOverlay } from '@/components/effects/NoiseOverlay';
import { CustomCursor } from '@/components/effects/CustomCursor';
import { site } from '@/data/site';
import { getSiteUrl } from '@/lib/siteUrl';
import './globals.css';

const interTight = Inter_Tight({ subsets: ['latin'], variable: '--font-inter-tight', display: 'swap' });
const jetBrainsMono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-jetbrains-mono', display: 'swap' });
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
  themeColor: '#120f17',
  colorScheme: 'dark',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${interTight.variable} ${jetBrainsMono.variable}`}>
      <body className="bg-bg text-ink font-sans antialiased">
        <SiteBackground />
        <SmoothScroll />
        {children}
        <NoiseOverlay />
        <CustomCursor />
      </body>
    </html>
  );
}
