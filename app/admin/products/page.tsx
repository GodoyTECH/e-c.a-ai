'use client';

import Image from 'next/image';
import { demoCategories } from '@/lib/demo-data';
import { currencyBRL } from '@/lib/utils';
import { FormEvent, useEffect, useMemo, useState } from 'react';

type Product = {
  id: string;
  name: string;
  description: string;
  price_cents: number;
  category_id: string;
  active: boolean;
  featured: boolean;
  main_image_url: string | null;
};

type Category = { id: string; name: string };

function parsePriceToCents(value: string) {
  const normalized = value.trim().replace(/\s/g, '').replace(',', '.');
  if (!normalized) return null;
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;
  const numeric = Number.parseFloat(normalized);
  if (!Number.isFinite(numeric) || numeric < 0) return null;
  return Math.round(numeric * 100);
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [priceInput, setPriceInput] = useState('');
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState('');

  const resolvedCategories = useMemo(() => {
    if (categories.length) return categories;
    return demoCategories.map((category) => ({ id: category.id, name: category.name }));
  }, [categories]);

  const load = async () => {
    setError('');
    const [productsRes, storeRes] = await Promise.all([fetch('/api/admin/products'), fetch('/api/products')]);

    if (productsRes.ok) {
      setProducts(await productsRes.json());
    }

    if (storeRes.ok) {
      const data = await storeRes.json();
      if (Array.isArray(data.categories)) {
        setCategories(data.categories);
      }
    }
  };

  useEffect(() => {
    load();
  }, []);

  async function onSelectImage(file: File | null) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      setImageBase64(result);
      setPreview(result);
    };
    reader.readAsDataURL(file);
  }

  async function saveProduct(formData: FormData) {
    setError('');
    const cents = parsePriceToCents(priceInput);
    if (cents === null) {
      setError('Preço inválido. Exemplo: 49,90');
      return;
    }

    let uploadedUrl: string | null = null;
    if (imageBase64) {
      const uploadRes = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64 })
      });

      if (!uploadRes.ok) {
        setError('Falha no upload da imagem. Verifique Cloudinary.');
        return;
      }

      const uploadData = await uploadRes.json();
      uploadedUrl = uploadData.url || null;
    }

    const payload = {
      name: String(formData.get('name') || ''),
      description: String(formData.get('description') || ''),
      price_cents: cents,
      category_id: String(formData.get('category_id') || ''),
      active: formData.get('active') === 'on',
      featured: formData.get('featured') === 'on',
      main_image_url: uploadedUrl,
      images: uploadedUrl ? [uploadedUrl] : []
    };

    const response = await fetch('/api/admin/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      setError('Não foi possível salvar o produto.');
      return;
    }

    setPriceInput('');
    setImageBase64(null);
    setPreview(null);
    const form = document.getElementById('new-product-form') as HTMLFormElement | null;
    form?.reset();
    await load();
  }

  return (
    <main className="mx-auto grid max-w-6xl gap-4 p-4 md:grid-cols-2 md:p-8">
      <form
        id="new-product-form"
        className="card space-y-2"
        onSubmit={async (event: FormEvent<HTMLFormElement>) => {
          event.preventDefault();
          const formData = new FormData(event.currentTarget);
          await saveProduct(formData);
        }}
      >
        <h1 className="text-xl font-bold">Novo produto</h1>
        <input className="w-full rounded-xl border px-3 py-2" name="name" placeholder="Nome" required />
        <textarea className="w-full rounded-xl border px-3 py-2" name="description" placeholder="Descrição" required />
        <input
          className="w-full rounded-xl border px-3 py-2"
          value={priceInput}
          onChange={(event) => setPriceInput(event.target.value)}
          inputMode="decimal"
          placeholder="Preço em reais (ex: 49,90)"
          required
        />
        <select className="w-full rounded-xl border px-3 py-2" name="category_id" required>
          <option value="">Selecione categoria</option>
          {resolvedCategories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>

        <div className="space-y-2 rounded-xl border border-dashed p-3">
          <p className="text-sm font-medium">Imagem do produto</p>
          <label className="btn-secondary inline-flex cursor-pointer items-center">
            Anexar imagem
            <input
              className="hidden"
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(event) => onSelectImage(event.target.files?.[0] || null)}
            />
          </label>

          {preview && (
            <div className="space-y-2">
              <Image src={preview} alt="Preview" width={640} height={240} unoptimized className="h-36 w-full rounded-xl object-cover" />
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  setPreview(null);
                  setImageBase64(null);
                }}
              >
                Remover imagem
              </button>
            </div>
          )}
        </div>

        <label className="flex gap-2">
          <input type="checkbox" name="active" defaultChecked /> Ativo
        </label>
        <label className="flex gap-2">
          <input type="checkbox" name="featured" /> Destaque
        </label>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button className="btn-primary" type="submit">
          Salvar
        </button>
      </form>

      <section className="space-y-2">
        <h2 className="text-xl font-bold">Produtos cadastrados</h2>
        {products.map((product) => (
          <article key={product.id} className="card flex items-center justify-between gap-3">
            <div>
              <p className="font-semibold">{product.name}</p>
              <p className="text-sm text-slate-600">{currencyBRL(product.price_cents)}</p>
            </div>
            <button
              className="btn-secondary"
              onClick={async () => {
                await fetch(`/api/admin/products?id=${product.id}`, { method: 'DELETE' });
                await load();
              }}
            >
              Excluir
            </button>
          </article>
        ))}
      </section>
    </main>
  );
}
