'use client';

import { currencyBRL } from '@/lib/utils';
import { useCart } from './cart-context';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { PaymentMethod, StoreSettings } from '@/lib/types';

type AddressLookup = {
  cep: string;
  street: string;
  neighborhood: string;
  city: string;
  state: string;
  number: string;
  complement: string;
  confirmed: boolean;
  mapsLink: string;
};

function formatCepValue(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

export function CheckoutForm() {
  const { items, totalCents, addItem, removeItem, clear } = useCart();
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [orderType, setOrderType] = useState<'delivery' | 'pickup'>('delivery');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('pix');
  const [addressData, setAddressData] = useState<AddressLookup | null>(null);
  const [freightEstimateCents, setFreightEstimateCents] = useState(0);

  useEffect(() => {
    fetch('/api/settings')
      .then((res) => res.json())
      .then((data) => {
        setSettings(data);
        if (!data.allow_delivery && data.allow_pickup) setOrderType('pickup');
      });
  }, []);

  const availableTypes = [
    settings?.allow_delivery ? { label: 'Entrega', value: 'delivery' as const } : null,
    settings?.allow_pickup ? { label: 'Retirada', value: 'pickup' as const } : null
  ].filter(Boolean) as { label: string; value: 'delivery' | 'pickup' }[];

  const totalWithFreight = useMemo(() => totalCents + (orderType === 'delivery' ? freightEstimateCents : 0), [orderType, totalCents, freightEstimateCents]);

  async function calculateFreight(postalCode: string, fullAddress: string) {
    if (!settings?.freight_enabled || settings?.free_shipping_enabled) {
      setFreightEstimateCents(0);
      return;
    }

    if (!settings.store_latitude || !settings.store_longitude || !settings.freight_per_km_cents) {
      setFreightEstimateCents(0);
      return;
    }

    try {
      const geocodeRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(`${fullAddress}, ${postalCode}, Brasil`)}`);
      const geocodeData = await geocodeRes.json();
      const first = geocodeData?.[0];
      if (!first?.lat || !first?.lon) {
        setFreightEstimateCents(0);
        return;
      }

      const lat1 = Number(settings.store_latitude);
      const lon1 = Number(settings.store_longitude);
      const lat2 = Number(first.lat);
      const lon2 = Number(first.lon);
      const toRad = (v: number) => (v * Math.PI) / 180;
      const earthKm = 6371;
      const dLat = toRad(lat2 - lat1);
      const dLon = toRad(lon2 - lon1);
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
      const distanceKm = earthKm * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
      setFreightEstimateCents(Math.round(distanceKm * settings.freight_per_km_cents));
    } catch {
      setFreightEstimateCents(0);
    }
  }

  async function onLookupCep(form: HTMLFormElement) {
    const formData = new FormData(form);
    const cep = String(formData.get('postalCode') || '').replace(/\D/g, '');
    if (cep.length !== 8) {
      alert('CEP inválido. Digite 8 números.');
      return;
    }

    const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
    const data = await res.json();
    if (data.erro) {
      alert('CEP não encontrado.');
      return;
    }

    const number = String(formData.get('addressNumber') || '').trim();
    const complement = String(formData.get('addressComplement') || '').trim();
    if (!data.logradouro || !data.bairro || !data.localidade || !data.uf) {
      alert('Não foi possível validar o endereço completo com esse CEP. Confira o CEP e tente novamente.');
      return;
    }

    const addressText = `${data.logradouro}, ${number || 's/n'}${complement ? ` - ${complement}` : ''}, ${data.bairro}, ${data.localidade}-${data.uf}`;
    const mapsLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addressText + `, CEP ${cep}`)}`;

    setAddressData({
      cep,
      street: data.logradouro || '',
      neighborhood: data.bairro || '',
      city: data.localidade || '',
      state: data.uf || '',
      number,
      complement,
      mapsLink,
      confirmed: false
    });

    await calculateFreight(cep, addressText);
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!items.length) {
      alert('Carrinho vazio. Adicione itens antes de finalizar.');
      return;
    }

    const formData = new FormData(event.currentTarget);
    const phone = String(formData.get('customerPhone') || '').replace(/\D/g, '');
    if (!/^\d{10,13}$/.test(phone)) {
      alert('Telefone inválido. Use DDD + número.');
      return;
    }

    if (orderType === 'delivery' && (!addressData?.confirmed || !addressData.mapsLink)) {
      alert('Confirme o endereço no mapa antes de finalizar.');
      return;
    }

    setLoading(true);
    const fullAddress = addressData
      ? `${addressData.street}, ${addressData.number || 's/n'}${addressData.complement ? ` - ${addressData.complement}` : ''}, ${addressData.neighborhood}, ${addressData.city}-${addressData.state}`
      : String(formData.get('address') || '');

    const payload = {
      customerName: String(formData.get('customerName') || ''),
      customerPhone: phone,
      orderType,
      paymentMethod,
      address: fullAddress,
      postalCode: addressData?.cep || null,
      mapsLink: addressData?.mapsLink || null,
      addressConfirmed: Boolean(addressData?.confirmed),
      freightCents: orderType === 'delivery' ? freightEstimateCents : 0,
      notes: String(formData.get('notes') || ''),
      items: items.map((item) => ({
        productId: item.productId,
        name: item.name,
        priceCents: item.priceCents,
        quantity: item.quantity,
        size: item.selectedSize,
        includedToppings: item.includedToppings,
        optionalToppings: item.optionalToppings,
        toppings: item.toppings
      }))
    };

    const response = await fetch('/api/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-idempotency-key': crypto.randomUUID()
      },
      body: JSON.stringify(payload)
    });

    setLoading(false);

    if (!response.ok) {
      alert('Não foi possível concluir o pedido.');
      return;
    }

    const data = await response.json();
    clear();

    if (!data.whatsappUrl) {
      alert('Pedido salvo, mas o WhatsApp da loja ainda não está configurado.');
      return;
    }

    try {
      window.location.href = data.whatsappUrl;
    } catch {
      alert('Não foi possível abrir o WhatsApp.');
    }
  }

  if (settings && !settings.allow_delivery && !settings.allow_pickup) {
    return (
      <main className="mx-auto max-w-xl p-8">
        <section className="card">
          <h1 className="text-xl font-bold">Checkout indisponível</h1>
          <p className="mt-2 text-sm text-slate-600">No momento não há tipo de atendimento disponível. Tente novamente mais tarde.</p>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto grid max-w-6xl gap-6 p-4 md:grid-cols-2 md:p-8">
      <section className="card h-fit">
        <h2 className="text-xl font-bold">Seu carrinho</h2>
        <div className="mt-4 space-y-3">
          {items.map((item) => (
            <div key={item.lineId} className="rounded-xl border p-3">
              <div className="flex items-center justify-between">
                <p className="font-medium">{item.name}</p>
                <div className="flex items-center gap-2">
                  <button className="btn-secondary" onClick={() => removeItem(item.lineId)} type="button">-</button>
                  <span>{item.quantity}</span>
                  <button className="btn-secondary" onClick={() => addItem({ lineId: item.lineId, productId: item.productId, name: item.name, imageUrl: item.imageUrl, priceCents: item.priceCents, selectedSize: item.selectedSize, includedToppings: item.includedToppings, optionalToppings: item.optionalToppings, toppings: item.toppings })} type="button">+</button>
                </div>
              </div>
              <p className="mt-1 text-xs text-slate-500">Tamanho: {item.selectedSize.label} ({item.selectedSize.volumeMl}ml)</p>
              {item.includedToppings.length > 0 && (
                <p className="text-xs text-slate-500">Inclusos: {item.includedToppings.map((t) => t.name).join(', ')}</p>
              )}
              {item.optionalToppings.length > 0 && (
                <p className="text-xs text-slate-500">
                  Adicionais: {item.optionalToppings.map((t) => `${t.name} (+${currencyBRL(t.priceCents)})`).join(', ')}
                </p>
              )}
              <p className="mt-1 text-sm font-semibold">Subtotal: {currencyBRL(item.priceCents * item.quantity)}</p>
            </div>
          ))}
        </div>
        {orderType === 'delivery' && (
          <p className="mt-4 text-sm text-slate-700">Frete estimado: {settings?.free_shipping_enabled || !settings?.freight_enabled ? 'Grátis' : currencyBRL(freightEstimateCents)}</p>
        )}
        <p className="mt-2 text-lg font-bold">Total: {currencyBRL(totalWithFreight)}</p>
      </section>

      <form className="card space-y-3" onSubmit={onSubmit}>
        <h2 className="text-xl font-bold">Finalizar pedido</h2>
        <input name="customerName" required placeholder="Nome completo" className="w-full rounded-xl border px-3 py-2" />
        <input name="customerPhone" required placeholder="Telefone (WhatsApp)" className="w-full rounded-xl border px-3 py-2" />

        <div>
          <p className="mb-1 font-medium">Tipo de pedido</p>
          <div className="flex gap-2">
            {availableTypes.map((type) => (
              <button
                key={type.value}
                type="button"
                onClick={() => setOrderType(type.value)}
                className={`rounded-xl px-4 py-2 ${orderType === type.value ? 'bg-acai text-white' : 'bg-slate-100'}`}
              >
                {type.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-1 font-medium">Forma de pagamento</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {[
              { value: 'pix' as const, label: 'Pix' },
              { value: 'credit_card' as const, label: 'Cartão de crédito' },
              { value: 'debit_card' as const, label: 'Cartão de débito' }
            ].map((method) => (
              <button
                key={method.value}
                type="button"
                onClick={() => setPaymentMethod(method.value)}
                className={`rounded-xl px-3 py-2 text-sm ${paymentMethod === method.value ? 'bg-acai text-white' : 'bg-slate-100'}`}
              >
                {method.label}
              </button>
            ))}
          </div>
        </div>

        {orderType === 'delivery' ? (
          <section className="space-y-2 rounded-xl border p-3">
            <h3 className="font-semibold">Endereço de entrega</h3>
            <div className="grid gap-2 sm:grid-cols-2">
              <input
                name="postalCode"
                placeholder="CEP"
                className="rounded-xl border px-3 py-2"
                required
                maxLength={9}
                inputMode="numeric"
                pattern="^\d{5}-?\d{3}$"
                onChange={(event) => {
                  event.currentTarget.value = formatCepValue(event.currentTarget.value);
                }}
              />
              <input name="addressNumber" placeholder="Número" className="rounded-xl border px-3 py-2" required />
            </div>
            <input name="addressComplement" placeholder="Complemento (opcional)" className="w-full rounded-xl border px-3 py-2" />
            <button type="button" className="btn-secondary" onClick={(event) => onLookupCep(event.currentTarget.form!)}>Buscar e validar CEP</button>
            {addressData && (
              <div className="rounded-xl bg-slate-50 p-3 text-sm">
                <p><strong>Endereço encontrado:</strong> {addressData.street}, {addressData.number || 's/n'}{addressData.complement ? ` - ${addressData.complement}` : ''}, {addressData.neighborhood}, {addressData.city}-{addressData.state} | CEP {addressData.cep}</p>
                <a href={addressData.mapsLink} target="_blank" rel="noreferrer" className="mt-2 inline-block text-acai underline">Clique no link para confirmar seu endereço no mapa</a>
                <label className="mt-2 flex items-center gap-2"><input type="checkbox" checked={addressData.confirmed} onChange={(event) => setAddressData((prev) => prev ? { ...prev, confirmed: event.target.checked } : prev)} />Confirmo que o endereço está correto no mapa</label>
              </div>
            )}
          </section>
        ) : null}

        <textarea name="notes" placeholder="Observações" className="w-full rounded-xl border px-3 py-2" rows={3} />

        <button className="btn-primary w-full" disabled={loading || items.length === 0}>
          {loading ? 'Processando...' : 'Finalizar pedido no WhatsApp'}
        </button>
      </form>
    </main>
  );
}
