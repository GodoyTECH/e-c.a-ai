'use client';

import { currencyBRL } from '@/lib/utils';
import { formatDateTimeBR, formatTimeBR } from '@/lib/time';
import { planLocalRoute, RouteStrategy } from '@/lib/routing';
import { useEffect, useMemo, useState } from 'react';

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
  subtotal_cents: number;
  freight_cents: number;
  total_cents: number;
  payment_method: 'pix' | 'credit_card' | 'debit_card';
  customer_name: string;
  customer_phone: string;
  order_type: 'delivery' | 'pickup';
  notes?: string;
  postal_code?: string;
  delivery_address?: string;
  maps_link?: string;
  customer_latitude?: number;
  customer_longitude?: number;
  created_at: string;
  items: AdminOrderItem[];
};

type StoreSettings = {
  delivery_origin_mode?: 'store_postal_code' | 'current_location';
  current_origin_latitude?: number | null;
  current_origin_longitude?: number | null;
};

type Dashboard = {
  totalOrders: number;
  grossRevenueCents: number;
  todayConcludedRevenueCents: number;
  avgTicketCents: number;
  byStatus: { pending: number; preparing: number; inDelivery: number; concluded: number; canceled: number };
  paymentMix: { pix: number; credit_card: number; debit_card: number };
  salesByDay: Array<{ date: string; orders: number; revenueCents: number }>;
  topProducts: Array<{ name: string; quantity: number; revenueCents: number }>;
};

const ACTIVE_DELIVERY_STATUSES = new Set(['pending_whatsapp', 'pending', 'confirmed', 'preparing']);

const ranges = [
  { value: 'today', label: 'Hoje' },
  { value: '7d', label: '7 dias' },
  { value: '30d', label: '30 dias' }
] as const;

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [range, setRange] = useState<'today' | '7d' | '30d'>('7d');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeStrategy, setActiveStrategy] = useState<RouteStrategy>('fastest');
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError('');
    const [ordersRes, settingsRes, dashboardRes] = await Promise.all([
      fetch('/api/admin/orders', { cache: 'no-store' }),
      fetch('/api/admin/settings', { cache: 'no-store' }),
      fetch(`/api/admin/dashboard?range=${range}`, { cache: 'no-store' })
    ]);

    if (!ordersRes.ok || !dashboardRes.ok) {
      setError('Falha ao carregar pedidos/dashboard.');
      setLoading(false);
      return;
    }

    setOrders(await ordersRes.json());
    setDashboard(await dashboardRes.json());
    if (settingsRes.ok) setSettings(await settingsRes.json());
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range]);

  async function updateStatus(id: string, status: 'confirmed' | 'rejected' | 'preparing' | 'delivered') {
    await fetch(`/api/admin/orders/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    await load();
  }

  async function deleteOrder(id: string, code: string) {
    if (!window.confirm(`Excluir o pedido ${code}? Essa ação é permanente.`)) return;
    const res = await fetch(`/api/admin/orders/${id}`, { method: 'DELETE' });
    if (!res.ok) return alert('Não foi possível excluir o pedido.');
    alert('Pedido excluído com sucesso.');
    await load();
  }

  const allDeliveries = useMemo(
    () => orders.filter((order) => order.order_type === 'delivery' && ACTIVE_DELIVERY_STATUSES.has(order.status)),
    [orders]
  );

  const origin = useMemo(() => {
    if (!settings) return null;
    if (
      settings.delivery_origin_mode === 'current_location' &&
      settings.current_origin_latitude != null &&
      settings.current_origin_longitude != null
    ) {
      return { latitude: Number(settings.current_origin_latitude), longitude: Number(settings.current_origin_longitude) };
    }
    return null;
  }, [settings]);

  const routeFastest = useMemo(
    () =>
      planLocalRoute({
        origin,
        strategy: 'fastest',
        points: allDeliveries.map((order) => ({ orderId: order.id, label: order.code, createdAt: order.created_at, latitude: order.customer_latitude, longitude: order.customer_longitude }))
      }).map((point) => allDeliveries.find((order) => order.id === point.orderId)!),
    [allDeliveries, origin]
  );

  const routeEconomic = useMemo(
    () =>
      planLocalRoute({
        origin,
        strategy: 'economic',
        points: allDeliveries.map((order) => ({ orderId: order.id, label: order.code, createdAt: order.created_at, latitude: order.customer_latitude, longitude: order.customer_longitude }))
      }).map((point) => allDeliveries.find((order) => order.id === point.orderId)!),
    [allDeliveries, origin]
  );

  const routeChronological = useMemo(() => [...allDeliveries].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()), [allDeliveries]);
  const activeRoute = useMemo(() => (activeStrategy === 'economic' ? routeEconomic : activeStrategy === 'chronological' ? routeChronological : routeFastest), [activeStrategy, routeChronological, routeEconomic, routeFastest]);

  const maxSalesValue = Math.max(...(dashboard?.salesByDay.map((item) => item.revenueCents) || [0]), 1);
  const statusTotal = dashboard ? Object.values(dashboard.byStatus).reduce((sum, value) => sum + value, 0) : 0;

  return (
    <main className="mx-auto max-w-6xl space-y-4 p-4 md:p-8">
      <h1 className="text-2xl font-bold">Pedidos</h1>
      <div className="flex flex-wrap gap-2">{ranges.map((item) => <button key={item.value} className={range === item.value ? 'btn-primary' : 'btn-secondary'} onClick={() => setRange(item.value)}>{item.label}</button>)}</div>
      {loading && <section className="card">Carregando dashboard...</section>}
      {error && <section className="card text-red-600">{error}</section>}

      {dashboard && !loading && (
        <>
          <section className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <article className="card"><p className="text-xs text-slate-500">Total pedidos</p><p className="text-xl font-bold">{dashboard.totalOrders}</p></article>
            <article className="card"><p className="text-xs text-slate-500">Pendentes</p><p className="text-xl font-bold">{dashboard.byStatus.pending}</p></article>
            <article className="card"><p className="text-xs text-slate-500">Em preparo</p><p className="text-xl font-bold">{dashboard.byStatus.preparing}</p></article>
            <article className="card"><p className="text-xs text-slate-500">Em entrega</p><p className="text-xl font-bold">{dashboard.byStatus.inDelivery}</p></article>
            <article className="card"><p className="text-xs text-slate-500">Concluídos</p><p className="text-xl font-bold">{dashboard.byStatus.concluded}</p></article>
            <article className="card"><p className="text-xs text-slate-500">Cancelados</p><p className="text-xl font-bold">{dashboard.byStatus.canceled}</p></article>
            <article className="card"><p className="text-xs text-slate-500">Faturamento período</p><p className="text-xl font-bold">{currencyBRL(dashboard.grossRevenueCents)}</p></article>
            <article className="card"><p className="text-xs text-slate-500">Vendas concluídas hoje</p><p className="text-xl font-bold">{currencyBRL(dashboard.todayConcludedRevenueCents)}</p></article>
            <article className="card"><p className="text-xs text-slate-500">Ticket médio</p><p className="text-xl font-bold">{currencyBRL(dashboard.avgTicketCents)}</p></article>
          </section>

          <section className="grid gap-3 lg:grid-cols-2">
            <article className="card space-y-2"><h2 className="font-semibold">Status dos pedidos</h2>
              {Object.entries(dashboard.byStatus).map(([label, value]) => (
                <div key={label}><div className="mb-1 flex justify-between text-xs"><span>{label}</span><span>{value}</span></div><div className="h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-acai" style={{ width: `${statusTotal ? (value / statusTotal) * 100 : 0}%` }} /></div></div>
              ))}
            </article>
            <article className="card space-y-2"><h2 className="font-semibold">Formas de pagamento</h2>
              {Object.entries(dashboard.paymentMix).map(([label, value]) => (
                <div key={label}><div className="mb-1 flex justify-between text-xs"><span>{label}</span><span>{value}</span></div><div className="h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-violet-500" style={{ width: `${dashboard.totalOrders ? (value / dashboard.totalOrders) * 100 : 0}%` }} /></div></div>
              ))}
            </article>
            <article className="card space-y-2 lg:col-span-2"><h2 className="font-semibold">Faturamento por dia (concluídos)</h2><div className="grid grid-cols-2 gap-2 sm:grid-cols-4 md:grid-cols-7">{dashboard.salesByDay.map((day) => (<div key={day.date} className="rounded-lg border p-2 text-center"><p className="text-xs">{day.date.slice(5)}</p><div className="mx-auto mt-1 w-7 rounded bg-violet-300" style={{ height: `${Math.max(16, (day.revenueCents / maxSalesValue) * 90)}px` }} /><p className="mt-1 text-[10px]">{currencyBRL(day.revenueCents)}</p></div>))}</div></article>
            <article className="card space-y-2 lg:col-span-2"><h2 className="font-semibold">Produtos mais vendidos</h2>{dashboard.topProducts.length === 0 ? <p className="text-sm text-slate-500">Sem vendas concluídas no período.</p> : dashboard.topProducts.map((product) => (<div key={product.name}><div className="mb-1 flex justify-between text-xs"><span>{product.name}</span><span>{product.quantity} un.</span></div><div className="h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-emerald-500" style={{ width: `${(product.quantity / dashboard.topProducts[0].quantity) * 100}%` }} /></div></div>))}</article>
          </section>
        </>
      )}

      <section className="card mb-4 space-y-3">
        <div className="flex flex-wrap items-center gap-2"><h2 className="font-semibold">Estratégia ativa:</h2><button className="btn-secondary" onClick={() => setActiveStrategy('fastest')}>Rota mais rápida</button><button className="btn-secondary" onClick={() => setActiveStrategy('economic')}>Rota mais econômica</button><button className="btn-secondary" onClick={() => setActiveStrategy('chronological')}>Ordem por horário</button></div>
        <div className="grid gap-3 md:grid-cols-3"><article className="rounded-xl border p-3"><h3 className="font-semibold">Rota mais rápida</h3>{routeFastest.map((order, idx) => <p key={order.id} className="text-sm">{idx + 1}. {order.code} • {formatTimeBR(order.created_at)}</p>)}</article><article className="rounded-xl border p-3"><h3 className="font-semibold">Rota mais econômica</h3>{routeEconomic.map((order, idx) => <p key={order.id} className="text-sm">{idx + 1}. {order.code} • {formatTimeBR(order.created_at)}</p>)}</article><article className="rounded-xl border p-3"><h3 className="font-semibold">Ordem por horário</h3>{routeChronological.map((order, idx) => <p key={order.id} className="text-sm">{idx + 1}. {order.code} • {formatTimeBR(order.created_at)}</p>)}</article></div>
      </section>

      <div className="space-y-3">
        {orders.map((order) => {
          const isCurrent = activeOrderId === order.id;
          return (
            <article key={order.id} className={`card space-y-3 ${isCurrent ? 'ring-2 ring-acai' : ''}`}>
              <div className="flex flex-wrap justify-between gap-2"><div><h2 className="font-semibold">{order.code}</h2><p className="text-sm text-slate-600">{order.customer_name} • {order.customer_phone}</p><p className="text-xs text-slate-500">Tipo: {order.order_type === 'delivery' ? 'Entrega' : 'Retirada'}</p><p className="text-xs text-slate-500">Horário (Brasília): {formatDateTimeBR(order.created_at)}</p>{order.delivery_address && <p className="text-xs font-medium text-slate-700">Endereço: {order.delivery_address}</p>}</div><div className="text-right"><p className="font-semibold">{currencyBRL(order.total_cents)}</p><p className="text-xs text-slate-500">{order.status}</p></div></div>
              <div className="mt-3 flex flex-wrap gap-2">{(order.status === 'pending_whatsapp' || order.status === 'pending') && <button className="btn-primary" onClick={() => updateStatus(order.id, 'confirmed')}>Confirmar</button>}{(order.status === 'confirmed' || order.status === 'preparing') && <><button className="btn-secondary" onClick={() => updateStatus(order.id, 'preparing')}>Marcar em rota</button><button className="btn-primary" onClick={() => updateStatus(order.id, 'delivered')}>Marcar entregue</button></>}<button className="btn-secondary" onClick={() => deleteOrder(order.id, order.code)}>Excluir pedido</button></div>
            </article>
          );
        })}
      </div>
    </main>
  );
}
