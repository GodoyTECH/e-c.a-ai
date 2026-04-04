'use client';

import { currencyBRL } from '@/lib/utils';
import { useCart } from './cart-context';
import { FormEvent, useEffect, useState } from 'react';
import { PaymentMethod, StoreSettings } from '@/lib/types';

export function CheckoutForm() {
  const { items, totalCents, addItem, removeItem, clear } = useCart();
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [orderType, setOrderType] = useState<'delivery' | 'pickup'>('delivery');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('pix');

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

    setLoading(true);
    const payload = {
      customerName: String(formData.get('customerName') || ''),
      customerPhone: phone,
      orderType,
      paymentMethod,
      address: String(formData.get('address') || ''),
      notes: String(formData.get('notes') || ''),
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
            <div key={item.productId} className="flex items-center justify-between">
              <p>{item.name}</p>
              <div className="flex items-center gap-2">
                <button className="btn-secondary" onClick={() => removeItem(item.productId)} type="button">-</button>
                <span>{item.quantity}</span>
                <button
                  className="btn-secondary"
                  onClick={() => addItem({ productId: item.productId, name: item.name, priceCents: item.priceCents, imageUrl: item.imageUrl })}
                  type="button"
                >
                  +
                </button>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-4 text-lg font-bold">Total: {currencyBRL(totalCents)}</p>
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
        {orderType === 'delivery' && <input name="address" required placeholder="Endereço de entrega" className="w-full rounded-xl border px-3 py-2" />}
        <textarea name="notes" placeholder="Observações" className="w-full rounded-xl border px-3 py-2" rows={3} />

        <button className="btn-primary w-full" disabled={loading || items.length === 0}>
          {loading ? 'Processando...' : 'Finalizar pedido no WhatsApp'}
        </button>
      </form>
    </main>
  );
}
