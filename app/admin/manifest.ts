import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/admin?source=pwa-admin',
    name: 'Painel Admin Refrescando',
    short_name: 'Admin Refrescando',
    description: 'Painel administrativo da loja',
    start_url: '/admin?source=pwa-admin',
    scope: '/admin',
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
