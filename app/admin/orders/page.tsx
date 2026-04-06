'use client';

import { currencyBRL } from '@/lib/utils';
import { useEffect, useState } from 'react';

type AdminOrderItem = {
  name: string;
  quantity: number;
  line_total: number;
  size?: { label: string; volumeMl: number };
  includedToppings: { name: string }[];
  optionalToppings: { name: string; priceCents: number }[];
};

type AdminOrder = {
  id: string;
  code: string;
  status: 'pending' | 'confirmed' | 'preparing' | 'delivered' | 'canceled' | 'pending_whatsapp' | 'rejected';
  total_cents: number;
  payment_method: 'pix' | 'credit_card' | 'debit_card';
  customer_name: string;
  customer_phone: string;
  order_type: 'delivery' | 'pickup';
  notes?: string;
  delivery_address?: string;
  created_at: string;
  items: AdminOrderItem[];
};

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);

  async function load() {
    const res = await fetch('/api/admin/orders');
    if (res.ok) setOrders(await res.json());
  }

  useEffect(() => {
    load();
  }, []);

  async function updateStatus(id: string, status: 'confirmed' | 'rejected') {
    await fetch(`/api/admin/orders/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    await load();
  }

  return (
    <main className="mx-auto max-w-5xl p-4 md:p-8">
      <h1 className="mb-4 text-2xl font-bold">Pedidos</h1>
      <div className="space-y-3">
        {orders.map((order) => (
          <article key={order.id} className="card space-y-3">
            <div className="flex flex-wrap justify-between gap-2">
              <div>
                <h2 className="font-semibold">{order.code}</h2>
                <p className="text-sm text-slate-600">{order.customer_name} • {order.customer_phone}</p>
                <p className="text-xs text-slate-500">Tipo: {order.order_type === 'delivery' ? 'Entrega' : 'Retirada'}</p>
                <p className="text-xs text-slate-500">Pagamento: {order.payment_method === 'pix' ? 'Pix' : order.payment_method === 'credit_card' ? 'Cartão de crédito' : 'Cartão de débito'}</p>
                <p className="text-xs text-slate-500">Data: {new Date(order.created_at).toLocaleString('pt-BR')}</p>
                {order.delivery_address && <p className="text-xs text-slate-500">Endereço: {order.delivery_address}</p>}
                {order.notes && <p className="text-xs text-slate-500">Observações: {order.notes}</p>}
              </div>
              <div className="text-right">
                <p className="font-semibold">{currencyBRL(order.total_cents)}</p>
                <p className="text-xs text-slate-500">{order.status}</p>
              </div>
            </div>

            <div className="space-y-2 rounded-xl border p-3">
              {order.items.map((item, index) => (
                <div key={`${item.name}-${index}`} className="rounded-lg bg-slate-50 p-2 text-sm">
                  <p className="font-semibold">{index + 1}. {item.name}</p>
                  {item.size && <p>Tamanho: {item.size.label} ({item.size.volumeMl}ml)</p>}
                  <p>Quantidade: {item.quantity}</p>
                  <p>Inclusos: {item.includedToppings.length ? item.includedToppings.map((t) => t.name).join(', ') : 'Nenhum'}</p>
                  <p>Adicionais: {item.optionalToppings.length ? item.optionalToppings.map((t) => `${t.name} (+${currencyBRL(t.priceCents)})`).join(', ') : 'Nenhum'}</p>
                  <p className="font-semibold">Subtotal item: {currencyBRL(item.line_total)}</p>
                </div>
              ))}
            </div>
            {(order.status === 'pending_whatsapp' || order.status === 'pending') && (
              <div className="mt-3 flex gap-2">
                <button className="btn-primary" onClick={() => updateStatus(order.id, 'confirmed')}>Confirmar</button>
                <button className="btn-secondary" onClick={() => updateStatus(order.id, 'rejected')}>Rejeitar</button>
              </div>
            )}
          </article>
        ))}
      </div>
    </main>
  );
}
