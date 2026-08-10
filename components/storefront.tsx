'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Category, Product, ProductSize, Topping } from '@/lib/types';
import { currencyBRL } from '@/lib/utils';
import { useCart } from './cart-context';
import { BrClock } from './br-clock';

function createLineId(
  productId: string,
  sizeId: string,
  optionalQuantities: Record<string, number>,
  removedIncludedIds: string[]
) {
  const optionalNormalized = Object.entries(optionalQuantities)
    .filter(([, quantity]) => quantity > 0)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([toppingId, quantity]) => `${toppingId}:${quantity}`)
    .join('|');

  const removedIncludedNormalized = [...removedIncludedIds].sort().join('|');
  return `${productId}::${sizeId}::opt=${optionalNormalized}::removed=${removedIncludedNormalized}`;
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
  const [selectedSizeId, setSelectedSizeId] = useState<string>('');
  const [optionalQuantities, setOptionalQuantities] = useState<Record<string, number>>({});
  const [removedIncludedIds, setRemovedIncludedIds] = useState<string[]>([]);
  const [showBannerFallback, setShowBannerFallback] = useState(false);
  const { addItem, items, totalCents } = useCart();

  const filtered = useMemo(() => {
    if (selectedCategory === 'all') return products;
    return products.filter((product) => product.category_id === selectedCategory);
  }, [products, selectedCategory]);

  function updateOptionalQuantity(id: string, nextQuantity: number) {
    setOptionalQuantities((prev) => ({
      ...prev,
      [id]: Math.max(0, nextQuantity)
    }));
  }

  function toggleIncludedTopping(id: string) {
    setRemovedIncludedIds((prev) => {
      const willRemove = !prev.includes(id);
      const next = willRemove ? [...prev, id] : prev.filter((item) => item !== id);

      if (willRemove) {
        setOptionalQuantities((current) => ({
          ...current,
          [id]: 0
        }));
      }

      return next;
    });
  }

  function handleProductClick(product: Product) {
    setSelectedProduct(product);
    setOptionalQuantities({});
    setRemovedIncludedIds([]);
    const activeSize = (product.sizes || []).find((size) => size.active);
    setSelectedSizeId(activeSize?.id || '');
  }

  const selectedSize = useMemo<ProductSize | null>(() => {
    if (!selectedProduct) return null;
    return (selectedProduct.sizes || []).find((size) => size.id === selectedSizeId) || null;
  }, [selectedProduct, selectedSizeId]);

  const optionalToppings = useMemo(() => {
    if (!selectedProduct) return [];
    return (selectedProduct.optional_toppings || []).filter((item) => item.active);
  }, [selectedProduct]);

  const includedToppings = useMemo(() => {
    if (!selectedProduct) return [];
    return selectedProduct.included_toppings || [];
  }, [selectedProduct]);

  const additionalTotal = optionalToppings.reduce((acc, topping) => {
    const quantity = optionalQuantities[topping.topping_id] || 0;
    return acc + topping.price_cents * quantity;
  }, 0);

  const selectedPrice = (selectedSize?.price_cents || selectedProduct?.price_cents || 0) + additionalTotal;

  function addSelectedToCart() {
    if (!selectedProduct || !selectedSize) return;

    const selectedOptionals = optionalToppings.flatMap((item) => {
      const quantity = optionalQuantities[item.topping_id] || 0;
      return Array.from({ length: quantity }, () => ({
        toppingId: item.topping_id,
        name: item.name,
        priceCents: item.price_cents
      }));
    });

    const selectedIncluded = includedToppings
      .filter((item) => !removedIncludedIds.includes(item.topping_id))
      .map((item) => ({ toppingId: item.topping_id, name: item.name, priceCents: 0 }));

    const lineId = createLineId(
      selectedProduct.id,
      selectedSize.id,
      optionalQuantities,
      removedIncludedIds
    );

    addItem({
      lineId,
      productId: selectedProduct.id,
      name: selectedProduct.name,
      imageUrl: selectedProduct.main_image_url,
      priceCents: selectedPrice,
      selectedSize: {
        id: selectedSize.id,
        label: selectedSize.label,
        volumeMl: selectedSize.volume_ml,
        priceCents: selectedSize.price_cents
      },
      includedToppings: selectedIncluded,
      optionalToppings: selectedOptionals,
      toppings: selectedOptionals.map((item) => item.name)
    });

    setSelectedProduct(null);
    setOptionalQuantities({});
    setRemovedIncludedIds([]);
    setSelectedSizeId('');
  }

  function directCheckout() {
    addSelectedToCart();
    router.push('/checkout');
  }

  return (
    <main className="mx-auto max-w-6xl p-4 md:p-8">
      {/* Horário de Brasília & Status fora da Imagem */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white/90 px-4 py-2.5 shadow-sm backdrop-blur sm:px-6">
        <div className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-slate-700">
          <span className="relative flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500"></span>
          </span>
          Loja Aberta • Entregas em Tempo Real
        </div>
        <BrClock />
      </div>

      {/* Banner Principal com Layout Responsivo Sem Sobreposição do Relógio */}
      <section className="mb-6 overflow-hidden rounded-3xl border border-white/30 bg-gradient-to-br from-acai via-purple-700 to-fuchsia-700 shadow-xl shadow-purple-500/20">
        <div className="relative">
          <div className="absolute inset-0">
            {showBannerFallback ? (
              <div className="h-full w-full bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.25),transparent_50%)]" />
            ) : (
              <Image src="/banner.png" alt="Banner Refrescando" fill priority className="object-cover" onError={() => setShowBannerFallback(true)} />
            )}
          </div>
          <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-[42%] bg-gradient-to-l from-white/15 to-transparent md:block" />
          <div className="relative z-10 grid gap-4 px-6 py-8 text-white sm:px-8 sm:py-10 md:px-10 md:py-12">
            <div className="flex items-center gap-4">
              <Image
                src="/logo.png"
                alt="Logo da loja"
                width={168}
                height={168}
                className="h-20 w-20 rounded-3xl object-cover shadow-2xl shadow-black/20 sm:h-24 sm:w-24 md:h-28 md:w-28"
              />
            </div>
            <p className="max-w-2xl text-2xl font-black leading-[1.1] tracking-tight sm:text-3xl md:text-5xl">
              Açaí premium do seu jeito, entregue rápido.
            </p>
            <p className="max-w-xl text-sm leading-relaxed text-white/90 sm:text-base">
              Personalize tamanho e adicionais em poucos toques e finalize seu pedido no WhatsApp.
            </p>
            <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-white/10 blur-2xl sm:h-32 sm:w-32" />
            <div className="pointer-events-none absolute -bottom-10 left-1/3 h-20 w-20 rounded-full bg-fuchsia-200/20 blur-2xl sm:h-28 sm:w-28" />
          </div>
        </div>
      </section>

      {/* Navegação de Categorias */}
      <section className="mb-6 flex gap-2 overflow-x-auto pb-1">
        <button
          className={`btn-secondary text-sm ${selectedCategory === 'all' ? 'bg-acai text-white border-acai' : ''}`}
          onClick={() => setSelectedCategory('all')}
        >
          Todos os Produtos
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            className={`btn-secondary text-sm ${selectedCategory === cat.id ? 'bg-acai text-white border-acai' : ''}`}
            onClick={() => setSelectedCategory(cat.id)}
          >
            {cat.name}
          </button>
        ))}
      </section>

      {/* Grid de Produtos Responsiva */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((product) => {
          const activeSizes = (product.sizes || []).filter((item) => item.active);
          const minimumPrice = activeSizes.length
            ? Math.min(...activeSizes.map((item) => item.price_cents))
            : product.price_cents;

          return (
            <article key={product.id} className="card glass-card flex flex-col justify-between border border-white/40">
              <div>
                <div className="mb-3 h-44 rounded-xl bg-slate-100 bg-cover bg-center" style={{ backgroundImage: `url(${product.main_image_url})` }} />
                <h3 className="font-semibold text-slate-800">{product.name}</h3>
                <p className="mt-1 text-sm text-slate-600">{product.description}</p>
              </div>
              <div className="mt-4 flex items-center justify-between">
                <span className="text-lg font-bold text-acai">A partir de {currencyBRL(minimumPrice)}</span>
                <button className="btn-primary" onClick={() => handleProductClick(product)}>Adicionar</button>
              </div>
            </article>
          );
        })}
      </section>
    </main>
  );
}
