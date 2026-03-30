import { Storefront } from '@/components/storefront';
import { listStoreData } from '@/services/product-service';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  if (!process.env.DATABASE_URL) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-20 text-center">
        <h1 className="text-2xl font-semibold text-slate-900">Configuração pendente</h1>
        <p className="mt-3 text-slate-600">
          Defina a variável <code>DATABASE_URL</code> no ambiente da Netlify para carregar os produtos.
        </p>
      </main>
    );
  }

  const { categories, products } = await listStoreData();
  return <Storefront categories={categories} products={products} />;
}
