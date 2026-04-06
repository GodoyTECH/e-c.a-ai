import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/?source=pwa-site',
    name: 'Refrescando',
    short_name: 'Refrescando',
    description: 'Loja de açaí com checkout rápido',
    start_url: '/?source=pwa-site',
    scope: '/',
    display: 'standalone',
    background_color: '#fffaf4',
    theme_color: '#6f2dbd',
    icons: [
      {
        src: '/logo.png',
        sizes: '192x192',
        type: 'image/png'
      },
      {
        src: '/logo.png',
        sizes: '512x512',
        type: 'image/png'
      }
    ]
  };
}
