'use client';

import { nowIso } from '@/lib/time';
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
  freight_per_km_brl: string;
  store_postal_code: string;
  delivery_origin_mode: 'store_postal_code' | 'current_location';
  current_origin_latitude: number | null;
  current_origin_longitude: number | null;
  current_origin_updated_at: string | null;
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
  freight_per_km_brl: '0,00',
  store_postal_code: '',
  delivery_origin_mode: 'store_postal_code',
  current_origin_latitude: null,
  current_origin_longitude: null,
  current_origin_updated_at: null
};

const MARKETING_MESSAGE_KEY = 'marketing-message-v1';

function parseFreightValue(value: string) {
  const normalized = value.replace(',', '.').replace(/[^\d.]/g, '');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
}

export default function AdminSettingsPage() {
  const [form, setForm] = useState<SettingsForm>(defaultForm);
  const [loading, setLoading] = useState(false);
  const [capturingLocation, setCapturingLocation] = useState(false);
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
      freight_per_km_brl: Number(data.freight_per_km_brl ?? Number(data.freight_per_km_cents || 0) / 100).toFixed(2).replace('.', ','),
      store_postal_code: data.store_postal_code || '',
      delivery_origin_mode: data.delivery_origin_mode === 'current_location' ? 'current_location' : 'store_postal_code',
      current_origin_latitude: Number.isFinite(Number(data.current_origin_latitude)) ? Number(data.current_origin_latitude) : null,
      current_origin_longitude: Number.isFinite(Number(data.current_origin_longitude)) ? Number(data.current_origin_longitude) : null,
      current_origin_updated_at: data.current_origin_updated_at || null
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

  async function captureCurrentLocation() {
    if (!navigator.geolocation) {
      alert('Geolocalização indisponível no navegador.');
      return;
    }

    setCapturingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCapturingLocation(false);
        setForm((prev) => ({
          ...prev,
          delivery_origin_mode: 'current_location',
          current_origin_latitude: Number(position.coords.latitude.toFixed(6)),
          current_origin_longitude: Number(position.coords.longitude.toFixed(6)),
          current_origin_updated_at: nowIso()
        }));
      },
      () => {
        setCapturingLocation(false);
        alert('Permissão negada ou falha ao capturar localização. Mantendo origem por CEP da loja.');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  function resetDeliveryOrigin() {
    setForm((prev) => ({
      ...prev,
      delivery_origin_mode: 'store_postal_code',
      store_postal_code: '',
      current_origin_latitude: null,
      current_origin_longitude: null,
      current_origin_updated_at: null
    }));
  }


  async function shareMarketingMessage() {
    const text = marketingMessage.trim() || defaultMarketingMessage;

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ text });
        return;
      } catch {
        // fallback below when share modal is canceled or unsupported by host app
      }
    }

    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(text);
        alert('Mensagem copiada! Cole em qualquer aplicativo para compartilhar.');
        return;
      } catch {
        // fallback below
      }
    }

    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
  }

  async function onSave() {
    setLoading(true);
    const freightPerKm = parseFreightValue(form.freight_per_km_brl);
    const sanitizedPostalCode = form.store_postal_code.replace(/\D/g, '');
    const shouldUseCurrentLocation = form.delivery_origin_mode === 'current_location';
    const hasCurrentCoordinates = form.current_origin_latitude != null && form.current_origin_longitude != null;

    if (shouldUseCurrentLocation && !hasCurrentCoordinates) {
      setLoading(false);
      alert('Capture a localização atual antes de salvar quando a origem selecionada for localização atual.');
      return;
    }

    if (!shouldUseCurrentLocation && !sanitizedPostalCode) {
      setLoading(false);
      alert('Informe o CEP da loja ou selecione localização atual para garantir o recálculo de frete.');
      return;
    }

    const payload = {
      ...form,
      owner_whatsapp_number: form.owner_whatsapp_number.replace(/\D/g, ''),
      public_site_url: form.public_site_url.trim(),
      freight_per_km_brl: freightPerKm,
      freight_per_km_cents: Math.round(freightPerKm * 100),
      store_postal_code: sanitizedPostalCode,
      current_origin_latitude: shouldUseCurrentLocation ? form.current_origin_latitude : null,
      current_origin_longitude: shouldUseCurrentLocation ? form.current_origin_longitude : null,
      current_origin_updated_at: shouldUseCurrentLocation ? form.current_origin_updated_at : null,
      store_latitude: null,
      store_longitude: null
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
          <input className="w-full rounded-xl border px-3 py-2" value={form.freight_per_km_brl} onChange={(e) => setForm({ ...form, freight_per_km_brl: e.target.value })} placeholder="Valor por km (R$), ex: 0,20 ou 1.75" />
          <input
            className="w-full rounded-xl border px-3 py-2"
            value={form.store_postal_code}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                store_postal_code: e.target.value,
                delivery_origin_mode: 'store_postal_code'
              }))
            }
            placeholder="CEP da loja (fallback)"
          />
          <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
            <p className="font-semibold text-slate-700">Origem da entrega</p>
            <label className="mt-2 flex items-center gap-2">
              <input
                type="radio"
                checked={form.delivery_origin_mode === 'store_postal_code'}
                onChange={() => setForm((prev) => ({ ...prev, delivery_origin_mode: 'store_postal_code' }))}
              />
              Usar CEP da loja como origem
            </label>
            <label className="mt-1 flex items-center gap-2">
              <input
                type="radio"
                checked={form.delivery_origin_mode === 'current_location'}
                onChange={() => setForm((prev) => ({ ...prev, delivery_origin_mode: 'current_location' }))}
              />
              Usar localização atual do entregador
            </label>
            <button className="btn-secondary mt-2" type="button" onClick={captureCurrentLocation}>
              {capturingLocation ? 'Capturando localização...' : 'Usar localização atual'}
            </button>
            <button className="btn-secondary mt-2 ml-2" type="button" onClick={resetDeliveryOrigin}>
              Redefinir origem/endereço
            </button>
            {form.current_origin_latitude != null && form.current_origin_longitude != null && (
              <p className="mt-2">
                Origem atual: {form.current_origin_latitude}, {form.current_origin_longitude}
                {form.current_origin_updated_at ? ` • Atualizada em ${new Date(form.current_origin_updated_at).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}` : ''}
              </p>
            )}
          </div>
          <p className="text-xs text-slate-500">Sem localização atual e sem CEP da loja, o sistema aplica fallback seguro de frete R$ 0,00.</p>
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
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-primary" onClick={shareMarketingMessage}>
            Compartilhar mensagem
          </button>
          <button type="button" className="btn-secondary" onClick={() => setMarketingMessage(defaultMarketingMessage)}>
            Restaurar mensagem padrão
          </button>
        </div>
      </section>
    </main>
  );
}
