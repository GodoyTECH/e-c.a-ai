'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

export default function AdminLoginPage() {
  const router = useRouter();
  const [error, setError] = useState('');

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const password = String(formData.get('password') || '');

    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password })
    });

    if (!res.ok) {
      setError('Senha inválida');
      return;
    }

    router.push('/admin');
    router.refresh();
  }

  return (
    <main className="mx-auto max-w-md p-8">
      <form className="card space-y-3" onSubmit={onSubmit}>
        <div className="flex justify-center">
          <Image src="/logo.png" alt="Logo" width={80} height={80} className="h-20 w-20 rounded-3xl object-cover shadow-md" />
        </div>
        <h1 className="text-xl font-bold">Acesso admin</h1>
        <input type="password" name="password" required className="w-full rounded-xl border px-3 py-2" />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button className="btn-primary w-full">Entrar</button>
      </form>
    </main>
  );
}
