'use client';

import { useEffect, useState } from 'react';

export default function AdminSettingsPage() {
  const [form, setForm] = useState({
    store_name: '',
    owner_whatsapp_number: '',
    allow_delivery: true,
    allow_pickup: true,
    default_order_message: ''
  });

  useEffect(() => {
    fetch('/api/admin/settings')
      .then((res) => res.json())
      .then((data) => setForm({ ...form, ...data, owner_whatsapp_number: data.owner_whatsapp_number || '' }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onSave() {
    await fetch('/api/admin/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    });
    alert('Configurações salvas.');
  }

  return (
    <main className="mx-auto max-w-3xl p-4 md:p-8">
      <section className="card space-y-3">
        <h1 className="text-2xl font-bold">Configurações da loja</h1>
        <input className="w-full rounded-xl border px-3 py-2" value={form.store_name} onChange={(e) => setForm({ ...form, store_name: e.target.value })} placeholder="Nome da loja" />
        <input className="w-full rounded-xl border px-3 py-2" value={form.owner_whatsapp_number} onChange={(e) => setForm({ ...form, owner_whatsapp_number: e.target.value })} placeholder="WhatsApp do dono (somente números)" />
        <textarea className="w-full rounded-xl border px-3 py-2" rows={3} value={form.default_order_message} onChange={(e) => setForm({ ...form, default_order_message: e.target.value })} placeholder="Mensagem padrão opcional" />

        <label className="flex items-center gap-2"><input type="checkbox" checked={form.allow_delivery} onChange={(e) => setForm({ ...form, allow_delivery: e.target.checked })} /> Entrega</label>
        <label className="flex items-center gap-2"><input type="checkbox" checked={form.allow_pickup} onChange={(e) => setForm({ ...form, allow_pickup: e.target.checked })} /> Retirada</label>

        <button className="btn-primary" onClick={onSave}>Salvar configurações</button>
      </section>
    </main>
  );
}
