'use client';

import { useEffect, useMemo, useState } from 'react';

type SettingsForm = {
  store_name: string;
  owner_whatsapp_number: string;
  allow_delivery: boolean;
  allow_pickup: boolean;
  default_order_message: string;
  public_site_url: string;
  freight_enabled: boolean;
  free_shipping_enabled: boolean;
  freight_per_km_cents: number;
  store_latitude: string;
  store_longitude: string;
  store_postal_code: string;
};

const DEFAULT_PUBLIC_SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://refrescando.netlify.app/';

const defaultForm: SettingsForm = {
  store_name: '',
  owner_whatsapp_number: '',
  allow_delivery: true,
  allow_pickup: true,
  default_order_message: '',
  public_site_url: DEFAULT_PUBLIC_SITE_URL,
  freight_enabled: false,
  free_shipping_enabled: true,
  freight_per_km_cents: 0,
  store_latitude: '',
  store_longitude: '',
  store_postal_code: ''
};

const MARKETING_MESSAGE_KEY = 'marketing-message-v1';

export default function AdminSettingsPage() {
  const [form, setForm] = useState<SettingsForm>(defaultForm);
  const [loading, setLoading] = useState(false);
  const [marketingMessage, setMarketingMessage] = useState('');

  const defaultMarketingMessage = useMemo(() => {
    const siteUrl = form.public_site_url?.trim() || DEFAULT_PUBLIC_SITE_URL;
    return `🍧 Bateu vontade de um açaí geladinho?

Temos opções deliciosas com acompanhamentos incríveis e entrega rápida! 😍
Faça seu pedido agora pelo cardápio digital:
${siteUrl}`;
  }, [form.public_site_url]);

  async function loadSettings() {
    const res = await fetch('/api/admin/settings', { cache: 'no-store' });

    if (!res.ok) {
      alert('Não foi possível carregar configurações.');
      return;
    }

    const data = await res.json();

    setForm((prev) => ({
      ...prev,
      ...data,
      store_name: data.store_name || '',
      owner_whatsapp_number: data.owner_whatsapp_number || '',
      allow_delivery: typeof data.allow_delivery === 'boolean' ? data.allow_delivery : true,
      allow_pickup: typeof data.allow_pickup === 'boolean' ? data.allow_pickup : true,
      default_order_message: data.default_order_message || '',
      public_site_url: data.public_site_url || DEFAULT_PUBLIC_SITE_URL,
      freight_enabled: Boolean(data.freight_enabled),
      free_shipping_enabled: typeof data.free_shipping_enabled === 'boolean' ? data.free_shipping_enabled : true,
      freight_per_km_cents: Number(data.freight_per_km_cents || 0),
      store_latitude: data.store_latitude ? String(data.store_latitude) : '',
      store_longitude: data.store_longitude ? String(data.store_longitude) : '',
      store_postal_code: data.store_postal_code || ''
    }));
  }

  useEffect(() => {
    loadSettings();
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = localStorage.getItem(MARKETING_MESSAGE_KEY);
    setMarketingMessage(stored || defaultMarketingMessage);
  }, [defaultMarketingMessage]);

  async function onSave() {
    setLoading(true);
    const payload = {
      ...form,
      owner_whatsapp_number: form.owner_whatsapp_number.replace(/\D/g, ''),
      public_site_url: form.public_site_url.trim(),
      store_latitude: form.store_latitude ? Number(form.store_latitude) : null,
      store_longitude: form.store_longitude ? Number(form.store_longitude) : null,
      store_postal_code: form.store_postal_code.replace(/\D/g, '')
    };

    const res = await fetch('/api/admin/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    setLoading(false);

    if (!res.ok) {
      alert('Não foi possível salvar configurações.');
      return;
    }

    await loadSettings();
    alert('Configurações salvas e aplicadas.');
  }

  return (
    <main className="mx-auto max-w-3xl space-y-4 p-4 md:p-8">
      <section className="card glass-card space-y-3">
        <h1 className="text-2xl font-bold">Configurações da loja</h1>
        <input className="w-full rounded-xl border px-3 py-2" value={form.store_name} onChange={(e) => setForm({ ...form, store_name: e.target.value })} placeholder="Nome da loja" />
        <input className="w-full rounded-xl border px-3 py-2" value={form.owner_whatsapp_number} onChange={(e) => setForm({ ...form, owner_whatsapp_number: e.target.value })} placeholder="WhatsApp do dono (somente números)" />
        <textarea className="w-full rounded-xl border px-3 py-2" rows={3} value={form.default_order_message} onChange={(e) => setForm({ ...form, default_order_message: e.target.value })} placeholder="Mensagem padrão opcional" />
        <input className="w-full rounded-xl border px-3 py-2" value={form.public_site_url} onChange={(e) => setForm({ ...form, public_site_url: e.target.value })} placeholder="URL pública do site" />

        <label className="flex items-center gap-2"><input type="checkbox" checked={form.allow_delivery} onChange={(e) => setForm({ ...form, allow_delivery: e.target.checked })} /> Entrega</label>
        <label className="flex items-center gap-2"><input type="checkbox" checked={form.allow_pickup} onChange={(e) => setForm({ ...form, allow_pickup: e.target.checked })} /> Retirada</label>

        <div className="rounded-xl border p-3 space-y-2">
          <h2 className="font-semibold">Frete por quilômetro</h2>
          <label className="flex items-center gap-2"><input type="checkbox" checked={form.freight_enabled} onChange={(e) => setForm({ ...form, freight_enabled: e.target.checked })} /> Frete ativo</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={form.free_shipping_enabled} onChange={(e) => setForm({ ...form, free_shipping_enabled: e.target.checked })} /> Frete grátis</label>
          <input className="w-full rounded-xl border px-3 py-2" type="number" min={0} value={form.freight_per_km_cents} onChange={(e) => setForm({ ...form, freight_per_km_cents: Number(e.target.value) })} placeholder="Valor por km (em centavos)" />
          <input
            className="w-full rounded-xl border px-3 py-2"
            value={form.store_postal_code}
            onChange={(e) => setForm({ ...form, store_postal_code: e.target.value })}
            placeholder="CEP da loja (opcional para cálculo automático)"
          />
          <div className="grid gap-2 sm:grid-cols-2">
            <input className="w-full rounded-xl border px-3 py-2" value={form.store_latitude} onChange={(e) => setForm({ ...form, store_latitude: e.target.value })} placeholder="Latitude da loja" />
            <input className="w-full rounded-xl border px-3 py-2" value={form.store_longitude} onChange={(e) => setForm({ ...form, store_longitude: e.target.value })} placeholder="Longitude da loja" />
          </div>
          <p className="text-xs text-slate-500">Você pode informar CEP da loja ou latitude/longitude. Sem localização da loja, o frete fica em R$ 0,00.</p>
        </div>

        <button className="btn-primary" disabled={loading} onClick={onSave}>{loading ? 'Salvando...' : 'Salvar configurações'}</button>
      </section>

      <section className="card glass-card space-y-3">
        <h2 className="text-xl font-bold">Marketing e compartilhamento</h2>
        <p className="text-sm text-slate-600">Edite a mensagem promocional e use o botão para compartilhar em qualquer app compatível.</p>
        <textarea
          className="w-full rounded-xl border px-3 py-2"
          rows={6}
          value={marketingMessage}
          onChange={(event) => {
            const value = event.target.value;
            setMarketingMessage(value);
            localStorage.setItem(MARKETING_MESSAGE_KEY, value);
          }}
          placeholder="Escreva a mensagem de divulgação"
        />
      </section>
    </main>
  );
}
