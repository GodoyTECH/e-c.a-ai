'use client';

import { useEffect, useState } from 'react';

type Topping = {
  id: string;
  name: string;
  active: boolean;
};

export default function AdminToppingsPage() {
  const [toppings, setToppings] = useState<Topping[]>([]);

  async function load() {
    const response = await fetch('/api/admin/toppings', { cache: 'no-store' });
    if (response.ok) {
      setToppings(await response.json());
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function toggleTopping(id: string, active: boolean) {
    await fetch('/api/admin/toppings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, active })
    });
    await load();
  }

  async function seedDefaults() {
    await fetch('/api/admin/toppings', { method: 'POST' });
    await load();
  }

  return (
    <main className="mx-auto max-w-3xl space-y-4 p-4 md:p-8">
      <section className="card glass-card space-y-3">
        <h1 className="text-2xl font-bold">Acompanhamentos</h1>
        <p className="text-sm text-slate-600">Ative ou desative os acompanhamentos exibidos no checkout.</p>
        <button type="button" className="btn-secondary" onClick={seedDefaults}>
          Restaurar lista padrão
        </button>

        <div className="space-y-2">
          {toppings.map((topping) => (
            <label key={topping.id} className="flex items-center justify-between rounded-xl border px-3 py-2">
              <span>{topping.name}</span>
              <input type="checkbox" checked={topping.active} onChange={(e) => toggleTopping(topping.id, e.target.checked)} />
            </label>
          ))}
        </div>
      </section>
    </main>
  );
}
