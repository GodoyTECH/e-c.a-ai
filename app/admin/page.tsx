import Link from 'next/link';

export default function AdminPage() {
  return (
    <main className="mx-auto max-w-4xl p-4 md:p-8">
      <h1 className="mb-4 text-2xl font-bold">Painel Administrativo</h1>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Link href="/admin/orders" className="card glass-card hover:ring-acai">
          <h2 className="font-semibold">Pedidos</h2>
          <p className="text-sm text-slate-600">Acompanhe pedidos recentes e status.</p>
        </Link>
        <Link href="/admin/products" className="card glass-card hover:ring-acai">
          <h2 className="font-semibold">Produtos</h2>
          <p className="text-sm text-slate-600">Gerencie catálogo e destaque.</p>
        </Link>
        <Link href="/admin/settings" className="card glass-card hover:ring-acai">
          <h2 className="font-semibold">Configurações</h2>
          <p className="text-sm text-slate-600">WhatsApp, tipo de atendimento e mensagem padrão.</p>
        </Link>
        <Link href="/admin/toppings" className="card glass-card hover:ring-acai">
          <h2 className="font-semibold">Acompanhamentos</h2>
          <p className="text-sm text-slate-600">Ative/desative condimentos do açaí.</p>
        </Link>
      </div>
    </main>
  );
}
