import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'SaveMiami — Miami Digital Twin | Open Data Hub',
  description:
    'Open Data Hub & AI Testbed for Miami-Dade. Digital Twin for zero waste, blue economy, climate resilience, and regenerative circular economy — powered by NVIDIA Inception Program.',
  keywords: [
    'Miami Digital Twin', 'SaveMiami', 'Open Data Hub', 'Zero Waste', 'PFAS',
    'Miami-Dade Incinerator', 'Blue Economy', 'Circular Economy', '305 Consortium',
    'NVIDIA Omniverse', 'Climate Resilience', 'Water.org', 'Logos Capital',
  ],
  openGraph: {
    title: 'SaveMiami — Miami Digital Twin',
    description: 'Open data platform for a zero-waste, climate-resilient Miami-Dade.',
    siteName: 'SaveMiami',
    locale: 'en_US',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
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
