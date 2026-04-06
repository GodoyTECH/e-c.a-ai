'use client';

import { useEffect, useState } from 'react';

type Topping = {
  id: string;
  name: string;
  price_cents: number;
  active: boolean;
  sort_order: number;
  archived: boolean;
};

function centsToInput(cents: number) {
  return (cents / 100).toFixed(2).replace('.', ',');
}

function inputToCents(value: string) {
  const normalized = value.trim().replace(',', '.');
  const numeric = Number.parseFloat(normalized);
  if (!Number.isFinite(numeric) || numeric < 0) return 0;
  return Math.round(numeric * 100);
}

export default function AdminToppingsPage() {
  const [toppings, setToppings] = useState<Topping[]>([]);
  const [loading, setLoading] = useState(false);

  async function load() {
    const response = await fetch('/api/admin/toppings', { cache: 'no-store' });
    if (response.ok) {
      setToppings(await response.json());
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function save(item: Topping) {
    setLoading(true);
    await fetch('/api/admin/toppings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item)
    });
    setLoading(false);
    await load();
  }

  async function addNew() {
    setLoading(true);
    await fetch('/api/admin/toppings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Novo condimento',
        price_cents: 0,
        active: true,
        sort_order: toppings.length + 1,
        archived: false
      })
    });
    setLoading(false);
    await load();
  }

  return (
    <main className="mx-auto max-w-4xl space-y-4 p-4 md:p-8">
      <section className="card glass-card space-y-3">
        <h1 className="text-2xl font-bold">Condimentos globais da loja</h1>
        <p className="text-sm text-slate-600">Aqui você mantém o catálogo único da loja. No produto, o admin seleciona apenas inclusos/adicionais.</p>
        <div className="flex gap-2">
          <button type="button" className="btn-primary" onClick={addNew} disabled={loading}>
            Novo condimento
          </button>
          <button type="button" className="btn-secondary" onClick={async () => {
            await fetch('/api/admin/toppings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ seed: true }) });
            await load();
          }}>
            Restaurar padrão
          </button>
        </div>

        <div className="space-y-2">
          {toppings.map((topping, index) => (
            <div key={topping.id} className="grid gap-2 rounded-xl border px-3 py-2 md:grid-cols-5 md:items-center">
              <input
                className="rounded-xl border px-2 py-1"
                value={topping.name}
                onChange={(event) =>
                  setToppings((prev) => prev.map((item) => (item.id === topping.id ? { ...item, name: event.target.value } : item)))
                }
              />
              <input
                className="rounded-xl border px-2 py-1"
                value={centsToInput(topping.price_cents)}
                onChange={(event) =>
                  setToppings((prev) =>
                    prev.map((item) => (item.id === topping.id ? { ...item, price_cents: inputToCents(event.target.value) } : item))
                  )
                }
              />
              <input
                className="rounded-xl border px-2 py-1"
                type="number"
                min={0}
                value={topping.sort_order}
                onChange={(event) =>
                  setToppings((prev) =>
                    prev.map((item) => (item.id === topping.id ? { ...item, sort_order: Number(event.target.value) } : item))
                  )
                }
              />
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={topping.active} onChange={(event) => setToppings((prev) => prev.map((item) => (item.id === topping.id ? { ...item, active: event.target.checked } : item)))} />Ativo</label>
              <button type="button" className="btn-secondary" onClick={() => save(toppings[index])}>Salvar</button>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
