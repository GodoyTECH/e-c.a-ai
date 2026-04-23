import './globals.css';
import { CartProvider } from '@/components/cart-context';
import { InternalNav } from '@/components/internal-nav';
import { PwaInstallCard } from '@/components/pwa-install-card';
import { SwRegister } from '@/components/sw-register';
import { SiteFooter } from '@/components/site-footer';

export const metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://refrescando.netlify.app'),
  title: 'Refrescando',
  description: 'Cardápio digital com checkout e painel admin',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: '/icons/site-icon-192.svg',
    apple: '/icons/site-icon-192.svg',
    shortcut: '/icons/site-icon-512.svg'
  },
  openGraph: {
    title: 'Refrescando',
    description: 'Cardápio digital com checkout e painel admin',
    images: ['/logo.png']
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <CartProvider>
          <SwRegister />
          <InternalNav />
          {children}
          <SiteFooter />
          <PwaInstallCard />
        </CartProvider>
      </body>
    </html>
  );
}
