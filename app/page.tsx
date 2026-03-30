import { Storefront } from '@/components/storefront';
import { listStoreData } from '@/services/product-service';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const { categories, products } = await listStoreData();
  return <Storefront categories={categories} products={products} />;
}
