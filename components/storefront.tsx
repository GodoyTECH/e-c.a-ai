'use client';

import { useMemo, useState } from 'react';
import { Category, Product } from '@/lib/types';
import { currencyBRL } from '@/lib/utils';
import { useCart } from './cart-context';
import Link from 'next/link';

export function Storefront({ categories, products }: { categories: Category[]; products: Product[] }) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const { addItem, items, totalCents } = useCart();

  const filtered = useMemo(() => {
    if (selectedCategory === 'all') return products;
    return products.filter((product) => product.category_id === selectedCategory);
  }, [products, selectedCategory]);

  return (
    <main className="mx-auto max-w-6xl p-4 md:p-8">
      <section className="mb-6 rounded-3xl bg-gradient-to-r from-acai via-purple-500 to-fuchsia-500 p-6 text-white shadow-xl shadow-purple-500/20">
        <h1 className="text-3xl font-bold">Açaí da Casa</h1>
        <p className="mt-2 text-sm opacity-90">Monte seu pedido em segundos. Entrega rápida e sabor intenso.</p>
      </section>

      <section className="mb-6 flex gap-2 overflow-x-auto">
        <button className="btn-secondary" onClick={() => setSelectedCategory('all')}>
          Todos
        </button>
        {categories.map((cat) => (
          <button key={cat.id} className="btn-secondary" onClick={() => setSelectedCategory(cat.id)}>
            {cat.name}
          </button>
        ))}
      </section>

      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map((product) => (
          <article key={product.id} className="card glass-card border border-white/40">
            <div className="mb-3 h-44 rounded-xl bg-slate-100 bg-cover bg-center" style={{ backgroundImage: `url(${product.main_image_url})` }} />
            <h3 className="font-semibold">{product.name}</h3>
            <p className="mt-1 text-sm text-slate-600">{product.description}</p>
            <div className="mt-3 flex items-center justify-between">
              <span className="text-lg font-bold text-acai">{currencyBRL(product.price_cents)}</span>
              <button
                className="btn-primary"
                onClick={() =>
                  addItem({
                    productId: product.id,
                    name: product.name,
                    imageUrl: product.main_image_url,
                    priceCents: product.price_cents
                  })
                }
              >
                Adicionar
              </button>
            </div>
          </article>
        ))}
      </section>

      <Link href="/checkout" className="fixed right-4 top-4 z-40 rounded-full bg-acai px-5 py-3 text-sm font-bold text-white shadow-xl md:right-8 md:top-6 md:text-base">
        Carrinho ({items.reduce((acc, i) => acc + i.quantity, 0)}) · {currencyBRL(totalCents)}
      </Link>
    </main>
  );
}
