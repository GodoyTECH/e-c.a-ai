import type { Metadata } from 'next';
import Image from 'next/image';

export const metadata: Metadata = {
  title: 'Painel Admin | Refrescando',
  manifest: '/admin/manifest.webmanifest',
  icons: {
    icon: '/logo.png',
    apple: '/logo.png'
  }
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 pt-4 md:px-8">
        <Image src="/logo.png" alt="Logo" width={64} height={64} className="h-14 w-14 rounded-2xl object-cover shadow-md md:h-16 md:w-16" />
        <p className="text-sm text-slate-600 md:text-base">Painel operacional para pedidos, catálogo e configurações.</p>
      </div>
      {children}
    </>
  );
}
