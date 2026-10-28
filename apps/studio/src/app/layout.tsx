import type { Metadata } from 'next';
import { Marcellus, Mukta, Tiro_Devanagari_Sanskrit } from 'next/font/google';
import './globals.css';

const display = Marcellus({ variable: '--font-display', weight: '400', subsets: ['latin'] });
const body = Mukta({ variable: '--font-body', weight: ['400', '500', '600'], subsets: ['latin', 'devanagari'] });
const sanskrit = Tiro_Devanagari_Sanskrit({
  variable: '--font-sanskrit',
  weight: '400',
  subsets: ['devanagari'],
  preload: false,
});

export const metadata: Metadata = {
  title: { default: 'Curator Studio · Sant Vaani', template: '%s · Curator Studio' },
  description: 'Cut, review and publish clips for Sant Vaani.',
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${sanskrit.variable}`}>
      <body>{children}</body>
    </html>
  );
}
