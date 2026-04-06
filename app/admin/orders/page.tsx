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
  delivery_priority_score?: number;
  items: AdminOrderItem[];
};

type StoreSettings = {
  delivery_origin_mode?: 'store_postal_code' | 'current_location';
  current_origin_latitude?: number | null;
  current_origin_longitude?: number | null;
};

const ACTIVE_DELIVERY_STATUSES = new Set(['pending_whatsapp', 'pending', 'confirmed', 'preparing']);

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [activeStrategy, setActiveStrategy] = useState<RouteStrategy>('fastest');
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);

  async function load() {
    const [ordersRes, settingsRes] = await Promise.all([fetch('/api/admin/orders'), fetch('/api/admin/settings')]);
    if (ordersRes.ok) setOrders(await ordersRes.json());
    if (settingsRes.ok) setSettings(await settingsRes.json());
  }

  useEffect(() => {
    load();
  }, []);

  async function updateStatus(id: string, status: 'confirmed' | 'rejected' | 'preparing' | 'delivered') {
    await fetch(`/api/admin/orders/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
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
        points: allDeliveries.map((order) => ({
          orderId: order.id,
          label: order.code,
          createdAt: order.created_at,
          latitude: order.customer_latitude,
          longitude: order.customer_longitude
        }))
      }).map((point) => allDeliveries.find((order) => order.id === point.orderId)!),
    [allDeliveries, origin]
  );

  const routeEconomic = useMemo(
    () =>
      planLocalRoute({
        origin,
        strategy: 'economic',
        points: allDeliveries.map((order) => ({
          orderId: order.id,
          label: order.code,
          createdAt: order.created_at,
          latitude: order.customer_latitude,
          longitude: order.customer_longitude
        }))
      }).map((point) => allDeliveries.find((order) => order.id === point.orderId)!),
    [allDeliveries, origin]
  );

  const routeChronological = useMemo(
    () => [...allDeliveries].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()),
    [allDeliveries]
  );

  const activeRoute = useMemo(() => {
    if (activeStrategy === 'economic') return routeEconomic;
    if (activeStrategy === 'chronological') return routeChronological;
    return routeFastest;
  }, [activeStrategy, routeChronological, routeEconomic, routeFastest]);

  useEffect(() => {
    if (activeRoute.length && !activeOrderId) setActiveOrderId(activeRoute[0].id);
    if (!activeRoute.length) setActiveOrderId(null);
  }, [activeRoute, activeOrderId]);

  const dashboard = useMemo(() => {
    const todayKey = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
    const isSameDay = (iso: string) => {
      const dayKey = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date(iso));
      return dayKey === todayKey;
    };

    const todayOrders = orders.filter((order) => isSameDay(order.created_at));
    const todayTotal = todayOrders.reduce((sum, order) => sum + Number(order.total_cents || 0), 0);
    const deliveredToday = todayOrders.filter((order) => order.status === 'delivered').length;
    const pending = orders.filter((order) => ACTIVE_DELIVERY_STATUSES.has(order.status)).length;
    const delivered = orders.filter((order) => order.status === 'delivered').length;

    return {
      totalToday: todayOrders.length,
      pending,
      delivered,
      revenueToday: todayTotal,
      avgTicket: todayOrders.length ? Math.round(todayTotal / todayOrders.length) : 0,
      inRoute: orders.filter((order) => order.status === 'preparing' || order.status === 'confirmed').length,
      deliveredToday
    };
  }, [orders]);

  async function markDeliveredAndAdvance(order: AdminOrder) {
    await updateStatus(order.id, 'delivered');
    const currentIndex = activeRoute.findIndex((item) => item.id === order.id);
    const nextOrder = currentIndex >= 0 ? activeRoute[currentIndex + 1] : null;

    if (nextOrder) {
      const shouldContinue = window.confirm('Pedido entregue com sucesso. Deseja seguir para o próximo pedido?');
      if (shouldContinue) setActiveOrderId(nextOrder.id);
    } else {
      alert('Pedido entregue com sucesso. Não há próximo pedido na rota ativa.');
      setActiveOrderId(null);
    }
  }

  function checkChronologicalConflict(nextOrder: AdminOrder) {
    if (activeStrategy === 'chronological') return;
    const oldestPending = routeChronological[0];
    if (!oldestPending || oldestPending.id === nextOrder.id) return;

    const continueCurrent = window.confirm(
      `Este próximo pedido (${nextOrder.code}) não é o mais antigo pendente (${oldestPending.code}).\n\nClique em OK para continuar rota atual ou Cancelar para recalcular por horário.`
    );

    if (!continueCurrent) {
      setActiveStrategy('chronological');
      setActiveOrderId(oldestPending.id);
    }
  }

  const strategyLabel = {
    fastest: 'Rota mais rápida',
    economic: 'Rota mais econômica',
    chronological: 'Ordem por horário'
  };

  return (
    <main className="mx-auto max-w-6xl p-4 md:p-8">
      <h1 className="mb-4 text-2xl font-bold">Pedidos</h1>

      <section className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <article className="card"><p className="text-xs text-slate-500">Pedidos do dia</p><p className="text-xl font-bold">{dashboard.totalToday}</p></article>
        <article className="card"><p className="text-xs text-slate-500">Pendentes</p><p className="text-xl font-bold">{dashboard.pending}</p></article>
        <article className="card"><p className="text-xs text-slate-500">Entregues</p><p className="text-xl font-bold">{dashboard.delivered}</p></article>
        <article className="card"><p className="text-xs text-slate-500">Faturamento do dia</p><p className="text-xl font-bold">{currencyBRL(dashboard.revenueToday)}</p></article>
        <article className="card"><p className="text-xs text-slate-500">Ticket médio</p><p className="text-xl font-bold">{currencyBRL(dashboard.avgTicket)}</p></article>
        <article className="card"><p className="text-xs text-slate-500">Pedidos em rota</p><p className="text-xl font-bold">{dashboard.inRoute}</p></article>
        <article className="card"><p className="text-xs text-slate-500">Entregas concluídas hoje</p><p className="text-xl font-bold">{dashboard.deliveredToday}</p></article>
      </section>

      <section className="card mb-4 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="font-semibold">Estratégia ativa:</h2>
          <span className="rounded-full bg-acai px-3 py-1 text-xs font-semibold text-white">{strategyLabel[activeStrategy]}</span>
          <button className="btn-secondary" onClick={() => setActiveStrategy('fastest')}>Rota mais rápida</button>
          <button className="btn-secondary" onClick={() => setActiveStrategy('economic')}>Rota mais econômica</button>
          <button className="btn-secondary" onClick={() => setActiveStrategy('chronological')}>Ordem por horário</button>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <article className="rounded-xl border p-3"><h3 className="font-semibold">Rota mais rápida</h3>{routeFastest.map((order, idx) => <p key={order.id} className="text-sm">{idx + 1}. {order.code} • {formatTimeBR(order.created_at)}</p>)}</article>
          <article className="rounded-xl border p-3"><h3 className="font-semibold">Rota mais econômica</h3>{routeEconomic.map((order, idx) => <p key={order.id} className="text-sm">{idx + 1}. {order.code} • {formatTimeBR(order.created_at)}</p>)}</article>
          <article className="rounded-xl border p-3"><h3 className="font-semibold">Ordem por horário</h3>{routeChronological.map((order, idx) => <p key={order.id} className="text-sm">{idx + 1}. {order.code} • {formatTimeBR(order.created_at)}</p>)}</article>
        </div>
      </section>

      <div className="space-y-3">
        {orders.map((order) => {
          const isInActiveRoute = activeRoute.some((item) => item.id === order.id);
          const routeIndex = activeRoute.findIndex((item) => item.id === order.id);
          const isCurrent = activeOrderId === order.id;

          return (
            <article key={order.id} className={`card space-y-3 ${isCurrent ? 'ring-2 ring-acai' : ''}`}>
              <div className="flex flex-wrap justify-between gap-2">
                <div>
                  <h2 className="font-semibold">{order.code}</h2>
                  {isInActiveRoute && <p className="text-xs font-semibold text-acai">Sequência atual: {routeIndex + 1} • {strategyLabel[activeStrategy]}</p>}
                  <p className="text-sm text-slate-600">{order.customer_name} • {order.customer_phone}</p>
                  <p className="text-xs text-slate-500">Tipo: {order.order_type === 'delivery' ? 'Entrega' : 'Retirada'}</p>
                  <p className="text-xs text-slate-500">Pagamento: {order.payment_method === 'pix' ? 'Pix' : order.payment_method === 'credit_card' ? 'Cartão de crédito' : 'Cartão de débito'}</p>
                  <p className="text-xs text-slate-500">Horário (Brasília): {formatDateTimeBR(order.created_at)}</p>
                  {order.postal_code && <p className="text-xs text-slate-500">CEP: {order.postal_code}</p>}
                  {order.delivery_address && <p className="text-xs text-slate-700 font-medium">Endereço: {order.delivery_address}</p>}
                  {order.maps_link && <a className="text-xs text-acai underline" target="_blank" rel="noreferrer" href={order.maps_link}>Abrir no Maps</a>}
                  {order.notes && <p className="text-xs text-slate-500">Observações: {order.notes}</p>}
                </div>
                <div className="text-right">
                  <p className="text-sm">Subtotal: {currencyBRL(order.subtotal_cents || 0)}</p>
                  <p className="text-sm font-semibold text-acai">Frete: {currencyBRL(order.freight_cents || 0)}</p>
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
              <div className="mt-3 flex flex-wrap gap-2">
                {order.maps_link && <a className="btn-secondary" target="_blank" rel="noreferrer" href={order.maps_link}>Iniciar entrega / Abrir rota</a>}
                {(order.status === 'pending_whatsapp' || order.status === 'pending') && (
                  <>
                    <button className="btn-primary" onClick={() => updateStatus(order.id, 'confirmed')}>Confirmar</button>
                    <button className="btn-secondary" onClick={() => updateStatus(order.id, 'rejected')}>Rejeitar</button>
                  </>
                )}
                {(order.status === 'confirmed' || order.status === 'preparing') && (
                  <>
                    <button className="btn-secondary" onClick={() => updateStatus(order.id, 'preparing')}>Marcar em rota</button>
                    <button
                      className="btn-primary"
                      onClick={() => {
                        checkChronologicalConflict(order);
                        markDeliveredAndAdvance(order);
                      }}
                    >
                      Marcar como entregue
                    </button>
                  </>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </main>
  );
}
