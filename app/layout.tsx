import './globals.css';
import { CartProvider } from '@/components/cart-context';
import { InternalNav } from '@/components/internal-nav';
import { PwaInstallCard } from '@/components/pwa-install-card';
import { SwRegister } from '@/components/sw-register';
import { SiteFooter } from '@/components/site-footer';

export const metadata = {
  title: 'Refrescando',
  description: 'Cardápio digital com checkout e painel admin'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <CartProvider>
          <SwRegister />
          <InternalNav />
          {children}
          <PwaInstallCard />
          <SiteFooter />
        </CartProvider>
      </body>
    </html>
  );
}
