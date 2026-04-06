'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Category, Product, Topping } from '@/lib/types';
import { currencyBRL } from '@/lib/utils';
import { useCart } from './cart-context';

function createLineId(productId: string, toppings: string[]) {
  const normalized = [...toppings].sort().join('|');
  return `${productId}::${normalized}`;
}

export function Storefront({
  categories,
  products,
  toppings
}: {
  categories: Category[];
  products: Product[];
  toppings: Topping[];
}) {
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedToppings, setSelectedToppings] = useState<string[]>([]);
  const [showBannerFallback, setShowBannerFallback] = useState(false);
  const { addItem, items, totalCents } = useCart();

  const filtered = useMemo(() => {
    if (selectedCategory === 'all') return products;
    return products.filter((product) => product.category_id === selectedCategory);
  }, [products, selectedCategory]);

  const activeToppings = toppings.filter((item) => item.active);

  function toggleTopping(name: string) {
    setSelectedToppings((prev) => (prev.includes(name) ? prev.filter((item) => item !== name) : [...prev, name]));
  }

  function handleProductClick(product: Product) {
    setSelectedProduct(product);
    setSelectedToppings([]);
  }

  function addSelectedToCart() {
    if (!selectedProduct) return;
    const lineId = createLineId(selectedProduct.id, selectedToppings);
    addItem({
      lineId,
      productId: selectedProduct.id,
      name: selectedProduct.name,
      imageUrl: selectedProduct.main_image_url,
      priceCents: selectedProduct.price_cents,
      toppings: selectedToppings
    });
    setSelectedProduct(null);
    setSelectedToppings([]);
  }

  function directCheckout() {
    addSelectedToCart();
    router.push('/checkout');
  }

  return (
    <main className="mx-auto max-w-6xl p-4 md:p-8">
      <section className="mb-6 overflow-hidden rounded-3xl shadow-xl shadow-purple-500/20">
        <div className="relative h-44 md:h-56">
          {showBannerFallback ? (
            <div className="h-full w-full bg-gradient-to-r from-acai via-purple-500 to-fuchsia-500" />
          ) : (
            <Image
              src="/banner.svg"
              alt="Banner Refrescando"
              fill
              priority
              className="object-cover"
              onError={() => setShowBannerFallback(true)}
            />
          )}
          <div className="absolute inset-0 bg-acai/60" />
          <div className="absolute inset-0 p-6 text-white">
            <h1 className="text-3xl font-bold">Refrescando</h1>
            <p className="mt-2 text-sm opacity-90">Monte seu pedido em segundos. Entrega rápida e sabor intenso.</p>
          </div>
        </div>
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
              <button className="btn-primary" onClick={() => handleProductClick(product)}>
                Adicionar
              </button>
            </div>
          </article>
        ))}
      </section>

      {selectedProduct && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-4 shadow-xl">
            <h2 className="text-lg font-bold">Acompanhamentos</h2>
            <p className="text-sm text-slate-600">Selecione os acompanhamentos para {selectedProduct.name}.</p>
            <div className="mt-3 grid grid-cols-1 gap-2">
              {activeToppings.map((topping) => (
                <label key={topping.id} className="flex items-center gap-2 rounded-xl border px-3 py-2">
                  <input
                    type="checkbox"
                    checked={selectedToppings.includes(topping.name)}
                    onChange={() => toggleTopping(topping.name)}
                  />
                  {topping.name}
                </label>
              ))}
              {activeToppings.length === 0 && <p className="text-sm text-slate-500">Nenhum acompanhamento ativo no momento.</p>}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button className="btn-primary" onClick={addSelectedToCart}>
                Adicionar ao carrinho
              </button>
              <button className="btn-secondary" onClick={directCheckout}>
                Finalizar direto
              </button>
              <button className="btn-secondary" onClick={() => setSelectedProduct(null)}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      <Link href="/checkout" className="fixed right-4 top-4 z-40 rounded-full bg-acai px-5 py-3 text-sm font-bold text-white shadow-xl md:right-8 md:top-6 md:text-base">
        Carrinho ({items.reduce((acc, i) => acc + i.quantity, 0)}) · {currencyBRL(totalCents)}
      </Link>
    </main>
  );
}
