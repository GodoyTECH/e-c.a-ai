import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/admin?source=pwa-admin',
    name: 'Painel Admin',
    short_name: 'Painel Admin',
    description: 'Painel administrativo da loja',
    start_url: '/admin/?source=pwa-admin',
    scope: '/admin/',
    display: 'standalone',
    background_color: '#fffaf4',
    theme_color: '#6f2dbd',
    icons: [
      {
        src: '/icons/admin-icon-192.svg',
        sizes: '192x192',
        type: 'image/png'
      },
      {
        src: '/icons/admin-icon-512.svg',
        sizes: '512x512',
        type: 'image/png'
      }
    ]
  };
}
