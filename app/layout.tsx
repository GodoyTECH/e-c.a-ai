import './globals.css';
import { CartProvider } from '@/components/cart-context';

export const metadata = {
  title: 'Açaí da Casa',
  description: 'Cardápio digital com checkout e painel admin'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <CartProvider>{children}</CartProvider>
      </body>
    </html>
  );
}
