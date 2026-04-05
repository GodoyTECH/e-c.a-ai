import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/?source=pwa-site',
    name: 'Refresh Ice',
    short_name: 'Loja Açaí',
    description: 'Loja de açaí com checkout rápido',
    start_url: '/?source=pwa-site',
    scope: '/',
    display: 'standalone',
    background_color: '#fffaf4',
    theme_color: '#6f2dbd',
    icons: [
      {
        src: '/icons/site-icon-192.svg',
        sizes: '192x192',
        type: 'image/svg+xml'
      },
      {
        src: '/icons/site-icon-512.svg',
        sizes: '512x512',
        type: 'image/svg+xml'
      }
    ]
  };
}
