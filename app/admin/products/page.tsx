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

type FormState = {
  name: string;
  description: string;
  priceInput: string;
  category_id: string;
  active: boolean;
  featured: boolean;
};

const emptyForm: FormState = {
  name: '',
  description: '',
  priceInput: '',
  category_id: '',
  active: true,
  featured: false
};

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

function parsePriceToCents(value: string) {
  const normalized = value.trim().replace(/\s/g, '').replace(',', '.');
  if (!normalized) return null;
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;
  const numeric = Number.parseFloat(normalized);
  if (!Number.isFinite(numeric) || numeric < 0) return null;
  return Math.round(numeric * 100);
}

function centsToPriceInput(cents: number) {
  return (cents / 100).toFixed(2).replace('.', ',');
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState('');

  const resolvedCategories = useMemo(() => {
    if (categories.length) return categories;
    return demoCategories.map((category) => ({ id: category.id, name: category.name }));
  }, [categories]);

  const isEditing = Boolean(editingProductId);

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

  function resetForm() {
    setForm(emptyForm);
    setEditingProductId(null);
    setSelectedImageFile(null);
    setPreview(null);
  }

  async function onSelectImage(file: File | null) {
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Arquivo inválido. Selecione uma imagem.');
      return;
    }

    if (file.size > MAX_IMAGE_BYTES) {
      setError('A imagem deve ter no máximo 8MB.');
      return;
    }

    setError('');
    setSelectedImageFile(file);
    setPreview(URL.createObjectURL(file));
  }

  async function saveProduct() {
    setError('');
    const cents = parsePriceToCents(form.priceInput);
    if (cents === null) {
      setError('Preço inválido. Exemplo: 49,90');
      return;
    }

    let uploadedUrl: string | null | undefined = undefined;
    if (selectedImageFile) {
      const formData = new FormData();
      formData.append('file', selectedImageFile);
      const uploadRes = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });

      if (!uploadRes.ok) {
        const uploadErr = await uploadRes.json().catch(() => ({}));
        setError(uploadErr?.details || uploadErr?.error || 'Falha no upload da imagem. Verifique Cloudinary.');
        return;
      }

      const uploadData = await uploadRes.json();
      uploadedUrl = uploadData.url || null;
    }

    const currentProduct = products.find((item) => item.id === editingProductId);

    const payload = {
      id: editingProductId || undefined,
      name: form.name,
      description: form.description,
      price_cents: cents,
      category_id: form.category_id,
      active: form.active,
      featured: form.featured,
      main_image_url: uploadedUrl !== undefined ? uploadedUrl : currentProduct?.main_image_url || null,
      images:
        uploadedUrl !== undefined
          ? uploadedUrl
            ? [uploadedUrl]
            : []
          : currentProduct?.main_image_url
            ? [currentProduct.main_image_url]
            : []
    };

    const response = await fetch('/api/admin/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      setError(isEditing ? 'Não foi possível atualizar o produto.' : 'Não foi possível salvar o produto.');
      return;
    }

    resetForm();
    await load();
  }

  function startEditProduct(product: Product) {
    setEditingProductId(product.id);
    setForm({
      name: product.name,
      description: product.description,
      priceInput: centsToPriceInput(product.price_cents),
      category_id: product.category_id,
      active: product.active,
      featured: product.featured
    });
    setSelectedImageFile(null);
    setPreview(product.main_image_url);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function insertSampleProducts() {
    if (!resolvedCategories.length) {
      setError('Cadastre ou carregue categorias antes de inserir produtos de exemplo.');
      return;
    }

    const fallbackCategory = resolvedCategories[0].id;
    const samples = [
      {
        name: 'Açaí Copo 300ml',
        description: 'Açaí tradicional com granola e banana.',
        price_cents: 1990,
        category_id: fallbackCategory,
        active: true,
        featured: true,
        main_image_url: 'https://images.unsplash.com/photo-1590086782792-42dd2350140d?auto=format&fit=crop&w=1200&q=80',
        images: []
      },
      {
        name: 'Açaí Especial 500ml',
        description: 'Açaí com leite em pó, morango e paçoca.',
        price_cents: 3290,
        category_id: fallbackCategory,
        active: true,
        featured: true,
        main_image_url: 'https://images.unsplash.com/photo-1542444592-0d6685ce4fd4?auto=format&fit=crop&w=1200&q=80',
        images: []
      },
      {
        name: 'Combo Duplo 2x400ml',
        description: 'Combo promocional com dois copos de 400ml.',
        price_cents: 5490,
        category_id: fallbackCategory,
        active: true,
        featured: false,
        main_image_url: 'https://images.unsplash.com/photo-1515003197210-e0cd71810b5f?auto=format&fit=crop&w=1200&q=80',
        images: []
      }
    ];

    setError('');
    for (const sample of samples) {
      const response = await fetch('/api/admin/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sample)
      });

      if (!response.ok) {
        setError('Falha ao inserir produtos ilustrativos.');
        return;
      }
    }

    await load();
  }

  return (
    <main className="mx-auto grid max-w-6xl gap-4 p-4 md:grid-cols-2 md:p-8">
      <form
        id="new-product-form"
        className="card glass-card space-y-2"
        onSubmit={async (event: FormEvent<HTMLFormElement>) => {
          event.preventDefault();
          await saveProduct();
        }}
      >
        <h1 className="text-xl font-bold">{isEditing ? 'Editar produto' : 'Novo produto'}</h1>
        <input
          className="w-full rounded-xl border px-3 py-2"
          name="name"
          placeholder="Nome"
          required
          value={form.name}
          onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
        />
        <textarea
          className="w-full rounded-xl border px-3 py-2"
          name="description"
          placeholder="Descrição"
          required
          value={form.description}
          onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
        />
        <input
          className="w-full rounded-xl border px-3 py-2"
          value={form.priceInput}
          onChange={(event) => setForm((prev) => ({ ...prev, priceInput: event.target.value }))}
          inputMode="decimal"
          placeholder="Preço em reais (ex: 49,90)"
          required
        />
        <select
          className="w-full rounded-xl border px-3 py-2"
          name="category_id"
          required
          value={form.category_id}
          onChange={(event) => setForm((prev) => ({ ...prev, category_id: event.target.value }))}
        >
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
              onChange={(event) => {
                onSelectImage(event.target.files?.[0] || null);
                event.currentTarget.value = '';
              }}
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
                  setSelectedImageFile(null);
                }}
              >
                Remover imagem
              </button>
            </div>
          )}
        </div>

        <label className="flex gap-2">
          <input
            type="checkbox"
            name="active"
            checked={form.active}
            onChange={(event) => setForm((prev) => ({ ...prev, active: event.target.checked }))}
          />{' '}
          Ativo
        </label>
        <label className="flex gap-2">
          <input
            type="checkbox"
            name="featured"
            checked={form.featured}
            onChange={(event) => setForm((prev) => ({ ...prev, featured: event.target.checked }))}
          />{' '}
          Destaque
        </label>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex flex-wrap gap-2">
          <button className="btn-primary" type="submit">
            {isEditing ? 'Salvar alterações' : 'Salvar'}
          </button>
          {isEditing && (
            <button className="btn-secondary" type="button" onClick={resetForm}>
              Cancelar edição
            </button>
          )}
          <button className="btn-secondary" type="button" onClick={insertSampleProducts}>
            Inserir produtos ilustrativos
          </button>
        </div>
      </form>

      <section className="space-y-2">
        <h2 className="text-xl font-bold">Produtos cadastrados</h2>
        {products.map((product) => (
          <article key={product.id} className="card glass-card flex items-center justify-between gap-3">
            <div>
              <p className="font-semibold">{product.name}</p>
              <p className="text-sm text-slate-600">{currencyBRL(product.price_cents)}</p>
            </div>
            <div className="flex gap-2">
              <button className="btn-secondary" onClick={() => startEditProduct(product)}>
                Editar
              </button>
              <button
                className="btn-secondary"
                onClick={async () => {
                  await fetch(`/api/admin/products?id=${product.id}`, { method: 'DELETE' });
                  if (editingProductId === product.id) {
                    resetForm();
                  }
                  await load();
                }}
              >
                Excluir
              </button>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
