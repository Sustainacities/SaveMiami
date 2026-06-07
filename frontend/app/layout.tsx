import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AquaDome — Biscayne Bay Digital Twin',
  description:
    'Open Data Hub & AI Testbed for Biscayne Bay and Miami-Dade. Real-time vessel tracking, ' +
    'water quality monitoring, and climate resilience — powered by the SaveMiami initiative.',
  keywords: [
    'Biscayne Bay', 'SaveMiami', 'Digital Twin', 'AquaDome',
    'Water Quality', 'AIS Tracking', 'Miami-Dade', 'Open Data Hub',
    'Blue Economy', 'Climate Resilience',
  ],
  openGraph: {
    title: 'AquaDome — Biscayne Bay Digital Twin',
    description: 'Real-time open data platform for Biscayne Bay and Miami-Dade.',
    siteName: 'SaveMiami',
    locale: 'en_US',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-miami-night text-gray-100 antialiased">{children}</body>
    </html>
  );
}
