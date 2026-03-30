'use client';

import { useEffect, useState } from 'react';

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

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  const load = async () => {
    const [productsRes, storeRes] = await Promise.all([fetch('/api/admin/products'), fetch('/api/products')]);

    if (productsRes.ok) setProducts(await productsRes.json());
    if (storeRes.ok) {
      const data = await storeRes.json();
      setCategories(data.categories);
    }
  };

  useEffect(() => {
    load();
  }, []);

  async function saveProduct(formData: FormData) {
    const payload = {
      name: String(formData.get('name') || ''),
      description: String(formData.get('description') || ''),
      price_cents: Number(formData.get('price_cents') || 0),
      category_id: String(formData.get('category_id') || ''),
      active: formData.get('active') === 'on',
      featured: formData.get('featured') === 'on',
      main_image_url: String(formData.get('main_image_url') || ''),
      images: String(formData.get('images') || '')
        .split(',')
        .map((v) => v.trim())
        .filter(Boolean)
    };

    await fetch('/api/admin/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    await load();
  }

  return (
    <main className="mx-auto grid max-w-6xl gap-4 p-4 md:grid-cols-2 md:p-8">
      <form
        className="card space-y-2"
        action={async (formData) => {
          await saveProduct(formData);
        }}
      >
        <h1 className="text-xl font-bold">Novo produto</h1>
        <input className="w-full rounded-xl border px-3 py-2" name="name" placeholder="Nome" required />
        <textarea className="w-full rounded-xl border px-3 py-2" name="description" placeholder="Descrição" required />
        <input className="w-full rounded-xl border px-3 py-2" name="price_cents" type="number" placeholder="Preço em centavos" required />
        <select className="w-full rounded-xl border px-3 py-2" name="category_id" required>
          <option value="">Selecione categoria</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
        <input className="w-full rounded-xl border px-3 py-2" name="main_image_url" placeholder="URL imagem principal" />
        <input className="w-full rounded-xl border px-3 py-2" name="images" placeholder="URLs extras separadas por vírgula" />
        <label className="flex gap-2">
          <input type="checkbox" name="active" defaultChecked /> Ativo
        </label>
        <label className="flex gap-2">
          <input type="checkbox" name="featured" /> Destaque
        </label>
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
              <p className="text-sm text-slate-600">R$ {(product.price_cents / 100).toFixed(2)}</p>
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
