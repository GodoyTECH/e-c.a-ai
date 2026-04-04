import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Painel Admin | Açaí da Casa',
  manifest: '/admin/manifest.webmanifest'
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return children;
}
