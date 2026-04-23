'use client';

import Image from 'next/image';
import { demoCategories } from '@/lib/demo-data';
import { currencyBRL } from '@/lib/utils';
import { FormEvent, useEffect, useMemo, useState } from 'react';

type ProductSizeInput = { id?: string; label: string; volume_ml: number; priceInput: string; active: boolean; sort_order: number };

type Product = {
  id: string;
  name: string;
  description: string;
  price_cents: number;
  category_id: string;
  active: boolean;
  featured: boolean;
  main_image_url: string | null;
  sizes?: { id: string; label: string; volume_ml: number; price_cents: number; active: boolean; sort_order: number }[];
  included_toppings?: { topping_id: string; name: string }[];
  optional_toppings?: { topping_id: string; name: string; price_cents: number; active: boolean; sort_order: number }[];
};

type Category = { id: string; name: string };

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

const emptySize = (): ProductSizeInput => ({ label: 'Médio', volume_ml: 500, priceInput: '', active: true, sort_order: 0 });

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [catalogToppings, setCatalogToppings] = useState<{ id: string; name: string; priceInput: string; active: boolean; sort_order: number; archived: boolean }[]>([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [priceInput, setPriceInput] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [active, setActive] = useState(true);
  const [featured, setFeatured] = useState(false);
  const [sizes, setSizes] = useState<ProductSizeInput[]>([emptySize()]);
  const [includedIds, setIncludedIds] = useState<string[]>([]);
  const [optionalRows, setOptionalRows] = useState<{ topping_id: string; priceInput: string; active: boolean; sort_order: number }[]>([]);
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

    if (productsRes.ok) setProducts(await productsRes.json());
    if (storeRes.ok) {
      const data = await storeRes.json();
      if (Array.isArray(data.categories)) setCategories(data.categories);
      if (Array.isArray(data.toppings)) {
        setCatalogToppings(
          data.toppings.map((item: any, index: number) => ({
            id: item.id,
            name: item.name,
            priceInput: centsToPriceInput(item.price_cents || 0),
            active: item.active,
            sort_order: item.sort_order ?? index,
            archived: item.archived ?? false
          }))
        );
      }
    }
  };

  useEffect(() => { load(); }, []);

  function resetForm() {
    setName('');
    setDescription('');
    setPriceInput('');
    setCategoryId('');
    setActive(true);
    setFeatured(false);
    setSizes([emptySize()]);
    setIncludedIds([]);
    setOptionalRows([]);
    setEditingProductId(null);
    setSelectedImageFile(null);
    setPreview(null);
  }

  async function onSelectImage(file: File | null) {
    if (!file) return;
    if (!file.type.startsWith('image/')) return setError('Arquivo inválido. Selecione uma imagem.');
    if (file.size > MAX_IMAGE_BYTES) return setError('A imagem deve ter no máximo 8MB.');
    setError('');
    setSelectedImageFile(file);
    setPreview(URL.createObjectURL(file));
  }

  function toggleIncluded(toppingId: string) {
    setIncludedIds((prev) => (prev.includes(toppingId) ? prev.filter((id) => id !== toppingId) : [...prev, toppingId]));
  }

  function updateOptional(toppingId: string, checked: boolean) {
    setOptionalRows((prev) => {
      if (checked) {
        const base = catalogToppings.find((t) => t.id === toppingId);
        if (!base || prev.some((item) => item.topping_id === toppingId)) return prev;
        return [...prev, { topping_id: toppingId, priceInput: base.priceInput, active: true, sort_order: prev.length + 1 }];
      }
      return prev.filter((item) => item.topping_id !== toppingId);
    });
  }

  async function saveProduct() {
    setError('');
    const cents = parsePriceToCents(priceInput);
    if (cents === null) return setError('Preço base inválido. Exemplo: 24,90');

    const parsedSizes = sizes.map((size, index) => ({
      id: size.id,
      label: size.label,
      volume_ml: size.volume_ml,
      price_cents: parsePriceToCents(size.priceInput) ?? 0,
      active: size.active,
      sort_order: size.sort_order ?? index
    }));

    if (parsedSizes.some((size) => !size.label.trim() || size.volume_ml <= 0 || size.price_cents < 0)) {
      return setError('Confira os tamanhos: nome, ML e preço são obrigatórios.');
    }

    let uploadedUrl: string | null | undefined = undefined;
    if (selectedImageFile) {
      const formData = new FormData();
      formData.append('file', selectedImageFile);
      const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData });
      if (!uploadRes.ok) return setError('Falha no upload da imagem. Verifique Cloudinary.');
      uploadedUrl = (await uploadRes.json()).url || null;
    }

    const currentProduct = products.find((item) => item.id === editingProductId);
    const payload = {
      id: editingProductId || undefined,
      name,
      description,
      price_cents: cents,
      category_id: categoryId,
      active,
      featured,
      sizes: parsedSizes,
      included_topping_ids: includedIds,
      optional_toppings: optionalRows.map((row, index) => ({
        topping_id: row.topping_id,
        price_cents: parsePriceToCents(row.priceInput) ?? 0,
        active: row.active,
        sort_order: row.sort_order ?? index
      })),
      main_image_url: uploadedUrl !== undefined ? uploadedUrl : currentProduct?.main_image_url || null,
      images: uploadedUrl ? [uploadedUrl] : currentProduct?.main_image_url ? [currentProduct.main_image_url] : []
    };

    const response = await fetch('/api/admin/products', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
    });

    if (!response.ok) return setError('Não foi possível salvar o produto.');
    resetForm();
    await load();
  }

  async function removeProduct(product: Product) {
    if (!window.confirm(`Excluir produto ${product.name}?`)) return;
    const response = await fetch(`/api/admin/products?id=${product.id}`, { method: 'DELETE' });
    if (!response.ok) return setError('Não foi possível excluir o produto.');
    await load();
  }

  function startEditProduct(product: Product) {
    setEditingProductId(product.id);
    setName(product.name);
    setDescription(product.description);
    setPriceInput(centsToPriceInput(product.price_cents));
    setCategoryId(product.category_id);
    setActive(product.active);
    setFeatured(product.featured);
    setSizes(
      (product.sizes || []).map((size) => ({
        id: size.id,
        label: size.label,
        volume_ml: size.volume_ml,
        priceInput: centsToPriceInput(size.price_cents),
        active: size.active,
        sort_order: size.sort_order
      }))
    );
    setIncludedIds((product.included_toppings || []).map((item) => item.topping_id));
    setOptionalRows(
      (product.optional_toppings || []).map((item) => ({
        topping_id: item.topping_id,
        priceInput: centsToPriceInput(item.price_cents),
        active: item.active,
        sort_order: item.sort_order
      }))
    );
    setSelectedImageFile(null);
    setPreview(product.main_image_url);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return (
    <main className="mx-auto grid max-w-7xl gap-4 p-4 md:grid-cols-2 md:p-8">
      <form id="new-product-form" className="card glass-card space-y-4" onSubmit={async (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); await saveProduct(); }}>
        <h1 className="text-xl font-bold">{isEditing ? 'Editar produto' : 'Novo produto'}</h1>

        <section className="space-y-2 rounded-xl border p-3">
          <h2 className="font-semibold">Dados do produto</h2>
          <input className="w-full rounded-xl border px-3 py-2" required placeholder="Nome" value={name} onChange={(e) => setName(e.target.value)} />
          <textarea className="w-full rounded-xl border px-3 py-2" required placeholder="Descrição" value={description} onChange={(e) => setDescription(e.target.value)} />
          <input className="w-full rounded-xl border px-3 py-2" value={priceInput} onChange={(e) => setPriceInput(e.target.value)} placeholder="Preço base (ex: 24,90)" required />
          <select className="w-full rounded-xl border px-3 py-2" required value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="">Selecione categoria</option>
            {resolvedCategories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
          </select>
        </section>

        <section className="space-y-2 rounded-xl border p-3">
          <h2 className="font-semibold">Imagem</h2>
          <label className="btn-secondary inline-flex cursor-pointer items-center">Anexar imagem
            <input className="hidden" type="file" accept="image/*" capture="environment" onChange={(event) => { onSelectImage(event.target.files?.[0] || null); event.currentTarget.value = ''; }} />
          </label>
          {preview && <Image src={preview} alt="Preview" width={640} height={240} unoptimized className="h-36 w-full rounded-xl object-cover" />}
        </section>

        <section className="space-y-2 rounded-xl border p-3">
          <div className="flex items-center justify-between"><h2 className="font-semibold">Tamanhos / MLs</h2><button type="button" className="btn-secondary" onClick={() => setSizes((prev) => [...prev, emptySize()])}>Adicionar tamanho</button></div>
          {sizes.map((size, index) => (
            <div key={`${size.id || 'new'}-${index}`} className="grid gap-2 rounded-xl border p-2 md:grid-cols-4">
              <input className="rounded-lg border px-2 py-1" placeholder="Nome" value={size.label} onChange={(e) => setSizes((prev) => prev.map((item, idx) => idx === index ? { ...item, label: e.target.value } : item))} />
              <input className="rounded-lg border px-2 py-1" placeholder="ML" type="number" value={size.volume_ml} onChange={(e) => setSizes((prev) => prev.map((item, idx) => idx === index ? { ...item, volume_ml: Number(e.target.value) } : item))} />
              <input className="rounded-lg border px-2 py-1" placeholder="Preço" value={size.priceInput} onChange={(e) => setSizes((prev) => prev.map((item, idx) => idx === index ? { ...item, priceInput: e.target.value } : item))} />
              <button type="button" className="btn-secondary" onClick={() => setSizes((prev) => prev.filter((_, idx) => idx !== index))}>Remover</button>
            </div>
          ))}
        </section>

        <section className="space-y-2 rounded-xl border p-3">
          <h2 className="font-semibold">Condimentos globais por produto</h2>
          {catalogToppings.filter((item) => !item.archived).map((topping) => {
            const isOptional = optionalRows.some((row) => row.topping_id === topping.id);
            const optional = optionalRows.find((row) => row.topping_id === topping.id);
            return (
              <div key={topping.id} className="rounded-xl border p-2 text-sm">
                <p className="font-medium">{topping.name}</p>
                <div className="mt-1 flex flex-wrap gap-3">
                  <label className="flex items-center gap-1"><input type="checkbox" checked={includedIds.includes(String(topping.id))} onChange={() => toggleIncluded(String(topping.id))} />Incluso</label>
                  <label className="flex items-center gap-1"><input type="checkbox" checked={isOptional} onChange={(e) => updateOptional(String(topping.id), e.target.checked)} />Adicional pago</label>
                  {isOptional && <input className="rounded-lg border px-2 py-1" value={optional?.priceInput || '0,00'} onChange={(e) => setOptionalRows((prev) => prev.map((row) => row.topping_id === topping.id ? { ...row, priceInput: e.target.value } : row))} />}
                </div>
              </div>
            );
          })}
        </section>

        <section className="space-y-2 rounded-xl border p-3">
          <h2 className="font-semibold">Status</h2>
          <label className="flex gap-2"><input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />Ativo</label>
          <label className="flex gap-2"><input type="checkbox" checked={featured} onChange={(e) => setFeatured(e.target.checked)} />Destaque</label>
        </section>

        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex flex-wrap gap-2">
          <button className="btn-primary" type="submit">{isEditing ? 'Salvar alterações' : 'Salvar produto'}</button>
          {isEditing && <button className="btn-secondary" type="button" onClick={resetForm}>Cancelar edição</button>}
        </div>
      </form>

      <section className="space-y-3">
        {products.map((product) => (
          <article key={product.id} className="card glass-card border border-white/40">
            <div className="mb-3 h-40 rounded-xl bg-slate-100 bg-cover bg-center" style={{ backgroundImage: `url(${product.main_image_url})` }} />
            <h3 className="font-semibold">{product.name}</h3>
            <p className="text-sm text-slate-600">{product.description}</p>
            <p className="mt-2 text-sm">Tamanhos: {(product.sizes || []).map((size) => `${size.label} ${size.volume_ml}ml (${currencyBRL(size.price_cents)})`).join(' • ')}</p>
            <p className="mt-1 text-sm">Inclusos: {(product.included_toppings || []).map((item) => item.name).join(', ') || 'Nenhum'}</p>
            <p className="mt-1 text-sm">Adicionais: {(product.optional_toppings || []).map((item) => `${item.name} (+${currencyBRL(item.price_cents)})`).join(', ') || 'Nenhum'}</p>
            <div className="mt-3 flex gap-2">
              <button className="btn-secondary" onClick={() => startEditProduct(product)}>Editar</button>
              <button className="btn-secondary" onClick={() => removeProduct(product)}>Excluir</button>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
