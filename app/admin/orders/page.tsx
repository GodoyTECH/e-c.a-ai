'use client';

import { currencyBRL } from '@/lib/utils';
import { useEffect, useState } from 'react';

type AdminOrder = {
  id: string;
  code: string;
  status: 'pending_whatsapp' | 'confirmed' | 'rejected';
  subtotal_cents: number;
  customer_name: string;
  customer_phone: string;
  order_type: 'delivery' | 'pickup';
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
          <article key={order.id} className="card">
            <div className="flex flex-wrap justify-between gap-2">
              <div>
                <h2 className="font-semibold">{order.code}</h2>
                <p className="text-sm text-slate-600">{order.customer_name} • {order.customer_phone}</p>
                <p className="text-xs text-slate-500">Tipo: {order.order_type === 'delivery' ? 'Entrega' : 'Retirada'}</p>
              </div>
              <div className="text-right">
                <p className="font-semibold">{currencyBRL(order.subtotal_cents)}</p>
                <p className="text-xs text-slate-500">{order.status}</p>
              </div>
            </div>
            {order.status === 'pending_whatsapp' && (
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
