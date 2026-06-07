/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  transpilePackages: [
    'deck.gl',
    '@deck.gl/core',
    '@deck.gl/layers',
    '@deck.gl/geo-layers',
    '@deck.gl/extensions',
    '@luma.gl/core',
  ],
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      'mapbox-gl': 'maplibre-gl',
    };
    return config;
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
    NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000',
    NEXT_PUBLIC_MAPLIBRE_STYLE:
      process.env.NEXT_PUBLIC_MAPLIBRE_STYLE ||
      'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
    NEXT_PUBLIC_MAPBOX_TOKEN: process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '',
  },
};

module.exports = nextConfig;
