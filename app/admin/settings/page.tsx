'use client';

import { useEffect, useState } from 'react';

type SettingsForm = {
  store_name: string;
  owner_whatsapp_number: string;
  allow_delivery: boolean;
  allow_pickup: boolean;
  default_order_message: string;
  public_site_url: string;
};

const defaultForm: SettingsForm = {
  store_name: '',
  owner_whatsapp_number: '',
  allow_delivery: true,
  allow_pickup: true,
  default_order_message: '',
  public_site_url: 'https://refreshice.netlify.app/'
};

export default function AdminSettingsPage() {
  const [form, setForm] = useState<SettingsForm>(defaultForm);
  const [loading, setLoading] = useState(false);

  async function loadSettings() {
    const res = await fetch('/api/admin/settings', { cache: 'no-store' });
    if (!res.ok) {
      alert('Não foi possível carregar configurações.');
      return;
    }

    const data = await res.json();
    setForm((prev) => ({ ...prev, ...data, owner_whatsapp_number: data.owner_whatsapp_number || '' }));
  }

  useEffect(() => {
    loadSettings();
  }, []);

  async function onSave() {
    setLoading(true);
    const payload = {
      ...form,
      owner_whatsapp_number: form.owner_whatsapp_number.replace(/\D/g, ''),
      public_site_url: form.public_site_url.trim()
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
    <main className="mx-auto max-w-3xl p-4 md:p-8">
      <section className="card space-y-3">
        <h1 className="text-2xl font-bold">Configurações da loja</h1>
        <input className="w-full rounded-xl border px-3 py-2" value={form.store_name} onChange={(e) => setForm({ ...form, store_name: e.target.value })} placeholder="Nome da loja" />
        <input className="w-full rounded-xl border px-3 py-2" value={form.owner_whatsapp_number} onChange={(e) => setForm({ ...form, owner_whatsapp_number: e.target.value })} placeholder="WhatsApp do dono (somente números)" />
        <textarea className="w-full rounded-xl border px-3 py-2" rows={3} value={form.default_order_message} onChange={(e) => setForm({ ...form, default_order_message: e.target.value })} placeholder="Mensagem padrão opcional" />
        <input className="w-full rounded-xl border px-3 py-2" value={form.public_site_url} onChange={(e) => setForm({ ...form, public_site_url: e.target.value })} placeholder="URL pública do site" />

        <label className="flex items-center gap-2"><input type="checkbox" checked={form.allow_delivery} onChange={(e) => setForm({ ...form, allow_delivery: e.target.checked })} /> Entrega</label>
        <label className="flex items-center gap-2"><input type="checkbox" checked={form.allow_pickup} onChange={(e) => setForm({ ...form, allow_pickup: e.target.checked })} /> Retirada</label>

        <button className="btn-primary" disabled={loading} onClick={onSave}>{loading ? 'Salvando...' : 'Salvar configurações'}</button>
      </section>
    </main>
  );
}
