/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['deck.gl', '@deck.gl/core', '@deck.gl/layers', '@deck.gl/geo-layers', '@deck.gl/extensions', '@luma.gl/core'],
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      // MapLibre GL uses canvas — shim for SSR
      'mapbox-gl': 'maplibre-gl',
    };
    return config;
  },
  env: {
    NEXT_PUBLIC_MAPLIBRE_STYLE: process.env.NEXT_PUBLIC_MAPLIBRE_STYLE || 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
    NEXT_PUBLIC_MAPBOX_TOKEN: process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '',
    NEXT_PUBLIC_NVIDIA_OMNIVERSE_ENDPOINT: process.env.NEXT_PUBLIC_NVIDIA_OMNIVERSE_ENDPOINT || '',
    NEXT_PUBLIC_EPA_API_KEY: process.env.NEXT_PUBLIC_EPA_API_KEY || '',
    NEXT_PUBLIC_MIAMI_DADE_OPEN_DATA_TOKEN: process.env.NEXT_PUBLIC_MIAMI_DADE_OPEN_DATA_TOKEN || '',
    NEXT_PUBLIC_NOAA_TOKEN: process.env.NEXT_PUBLIC_NOAA_TOKEN || '',
  },
};

module.exports = nextConfig;
