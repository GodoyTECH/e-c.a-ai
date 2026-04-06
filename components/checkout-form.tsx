'use client';

import { currencyBRL } from '@/lib/utils';
import { useCart } from './cart-context';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { PaymentMethod, StoreSettings } from '@/lib/types';

type ResolvedAddress = {
  formattedAddress: string;
  mapsLink: string;
  lat: number;
  lng: number;
};

export function CheckoutForm() {
  const { items, totalCents, addItem, removeItem, clear } = useCart();
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [orderType, setOrderType] = useState<'delivery' | 'pickup'>('delivery');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('pix');
  const [cep, setCep] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [resolvedAddress, setResolvedAddress] = useState<ResolvedAddress | null>(null);
  const [addressConfirmed, setAddressConfirmed] = useState(false);
  const [deliveryFeeCents, setDeliveryFeeCents] = useState(0);

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

  const totalWithFee = useMemo(() => totalCents + (orderType === 'delivery' ? deliveryFeeCents : 0), [totalCents, deliveryFeeCents, orderType]);

  async function resolveAddress() {
    if (!address.trim() || cep.replace(/\D/g, '').length !== 8) {
      alert('Informe endereço e CEP válido (8 dígitos).');
      return;
    }

    const response = await fetch('/api/address/resolve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: `${address}, ${cep}, Brasil` })
    });

    if (!response.ok) {
      alert('Não foi possível validar o endereço no mapa.');
      return;
    }

    const data = await response.json();
    setResolvedAddress(data);
    setAddressConfirmed(false);

    if (settings?.delivery_fee_enabled) {
      const quoteRes = await fetch('/api/delivery/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ destinationLat: data.lat, destinationLng: data.lng })
      });

      if (quoteRes.ok) {
        const quote = await quoteRes.json();
        setDeliveryFeeCents(quote.feeCents || 0);
      }
    } else {
      setDeliveryFeeCents(0);
    }

    window.open(data.mapsLink, '_blank', 'noopener,noreferrer');
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

    if (orderType === 'delivery' && (!resolvedAddress || !addressConfirmed)) {
      alert('Valide e confirme o endereço no link do Maps antes de finalizar.');
      return;
    }

    setLoading(true);
    const payload = {
      customerName: String(formData.get('customerName') || ''),
      customerPhone: phone,
      orderType,
      paymentMethod,
      cep: cep.replace(/\D/g, ''),
      address,
      addressMapLink: resolvedAddress?.mapsLink || undefined,
      addressLat: resolvedAddress?.lat,
      addressLng: resolvedAddress?.lng,
      deliveryFeeCents: orderType === 'delivery' ? deliveryFeeCents : 0,
      notes,
      items
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

    window.location.href = data.whatsappUrl;
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
              {item.includedToppings.length > 0 && <p className="text-xs text-slate-500">Inclusos: {item.includedToppings.map((t) => t.name).join(', ')}</p>}
              {item.optionalToppings.length > 0 && <p className="text-xs text-slate-500">Adicionais: {item.optionalToppings.map((t) => `${t.name} (+${currencyBRL(t.priceCents)})`).join(', ')}</p>}
              <p className="mt-1 text-sm font-semibold">Subtotal: {currencyBRL(item.priceCents * item.quantity)}</p>
            </div>
          ))}
        </div>
        {orderType === 'delivery' && <p className="mt-2 text-sm">Frete: {currencyBRL(deliveryFeeCents)}</p>}
        <p className="mt-2 text-lg font-bold">Total: {currencyBRL(totalWithFee)}</p>
      </section>

      <form className="card space-y-3" onSubmit={onSubmit}>
        <h2 className="text-xl font-bold">Finalizar pedido</h2>
        <input name="customerName" required placeholder="Nome completo" className="w-full rounded-xl border px-3 py-2" />
        <input name="customerPhone" required placeholder="Telefone (WhatsApp)" className="w-full rounded-xl border px-3 py-2" />

        <div>
          <p className="mb-1 font-medium">Tipo de pedido</p>
          <div className="flex gap-2">
            {availableTypes.map((type) => (
              <button key={type.value} type="button" onClick={() => setOrderType(type.value)} className={`rounded-xl px-4 py-2 ${orderType === type.value ? 'bg-acai text-white' : 'bg-slate-100'}`}>{type.label}</button>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-1 font-medium">Forma de pagamento</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {[{ value: 'pix' as const, label: 'Pix' }, { value: 'credit_card' as const, label: 'Cartão de crédito' }, { value: 'debit_card' as const, label: 'Cartão de débito' }].map((method) => (
              <button key={method.value} type="button" onClick={() => setPaymentMethod(method.value)} className={`rounded-xl px-3 py-2 text-sm ${paymentMethod === method.value ? 'bg-acai text-white' : 'bg-slate-100'}`}>{method.label}</button>
            ))}
          </div>
        </div>
        {orderType === 'delivery' && (
          <div className="space-y-2 rounded-xl border p-3">
            <input value={cep} onChange={(e) => setCep(e.target.value)} required placeholder="CEP" className="w-full rounded-xl border px-3 py-2" />
            <input value={address} onChange={(e) => setAddress(e.target.value)} required placeholder="Endereço de entrega" className="w-full rounded-xl border px-3 py-2" />
            <button type="button" className="btn-secondary" onClick={resolveAddress}>Validar endereço e abrir no Maps</button>
            {resolvedAddress && (
              <div className="rounded-xl bg-slate-50 p-2 text-xs text-slate-600">
                <p>{resolvedAddress.formattedAddress}</p>
                <a className="text-acai underline" href={resolvedAddress.mapsLink} target="_blank" rel="noreferrer">Abrir link do Maps novamente</a>
                <label className="mt-2 flex items-center gap-2"><input type="checkbox" checked={addressConfirmed} onChange={(e) => setAddressConfirmed(e.target.checked)} />Confirmo que este endereço está correto</label>
              </div>
            )}
          </div>
        )}
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} name="notes" placeholder="Observações" className="w-full rounded-xl border px-3 py-2" rows={3} />

        <button className="btn-primary w-full" disabled={loading || items.length === 0}>{loading ? 'Processando...' : 'Finalizar pedido no WhatsApp'}</button>
      </form>
    </main>
  );
}
