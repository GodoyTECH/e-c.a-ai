export type AdminOrderStatus = 'pending' | 'confirmed' | 'preparing' | 'delivered' | 'canceled' | 'pending_whatsapp' | 'rejected';
export type AdminPaymentMethod = 'pix' | 'credit_card' | 'debit_card';

export type DashboardOrder = {
  id: string;
  status: AdminOrderStatus;
  total_cents: number;
  subtotal_cents: number;
  freight_cents: number;
  order_type: 'delivery' | 'pickup';
  payment_method: AdminPaymentMethod;
  created_at: string;
  items: Array<{ name: string; quantity: number; line_total: number }>;
};

export type DashboardRange = 'today' | '7d' | '30d';

const PENDING_STATUSES = new Set<AdminOrderStatus>(['pending_whatsapp', 'pending']);
const PREPARING_STATUSES = new Set<AdminOrderStatus>(['confirmed']);
const IN_DELIVERY_STATUSES = new Set<AdminOrderStatus>(['preparing']);
const CONCLUDED_STATUSES = new Set<AdminOrderStatus>(['delivered']);
const CANCELED_STATUSES = new Set<AdminOrderStatus>(['canceled', 'rejected']);

function dayKey(iso: string) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date(iso));
}

function toRangeStart(range: DashboardRange) {
  const now = new Date();
  const date = new Date(now);
  if (range === '7d') date.setDate(now.getDate() - 6);
  if (range === '30d') date.setDate(now.getDate() - 29);
  return dayKey(date.toISOString());
}

export function computeDashboardMetrics(allOrders: DashboardOrder[], range: DashboardRange) {
  const today = dayKey(new Date().toISOString());
  const startKey = range === 'today' ? today : toRangeStart(range);

  const inRangeOrders = allOrders.filter((order) => dayKey(order.created_at) >= startKey);
  const concludedOrders = inRangeOrders.filter((order) => CONCLUDED_STATUSES.has(order.status));

  const byStatus = {
    pending: inRangeOrders.filter((order) => PENDING_STATUSES.has(order.status)).length,
    preparing: inRangeOrders.filter((order) => PREPARING_STATUSES.has(order.status)).length,
    inDelivery: inRangeOrders.filter((order) => IN_DELIVERY_STATUSES.has(order.status)).length,
    concluded: concludedOrders.length,
    canceled: inRangeOrders.filter((order) => CANCELED_STATUSES.has(order.status)).length
  };

  const grossRevenueCents = inRangeOrders
    .filter((order) => !CANCELED_STATUSES.has(order.status))
    .reduce((sum, order) => sum + Number(order.total_cents || 0), 0);

  const concludedRevenueCents = concludedOrders.reduce((sum, order) => sum + Number(order.total_cents || 0), 0);

  const todayConcludedRevenueCents = allOrders
    .filter((order) => dayKey(order.created_at) === today && CONCLUDED_STATUSES.has(order.status))
    .reduce((sum, order) => sum + Number(order.total_cents || 0), 0);

  const avgTicketCents = concludedOrders.length ? Math.round(concludedRevenueCents / concludedOrders.length) : 0;

  const paymentMix = inRangeOrders.reduce(
    (acc, order) => {
      acc[order.payment_method] += 1;
      return acc;
    },
    { pix: 0, credit_card: 0, debit_card: 0 }
  );

  const salesByDayMap = new Map<string, { orders: number; revenueCents: number }>();
  for (const order of inRangeOrders) {
    const key = dayKey(order.created_at);
    const curr = salesByDayMap.get(key) || { orders: 0, revenueCents: 0 };
    curr.orders += 1;
    if (CONCLUDED_STATUSES.has(order.status)) curr.revenueCents += Number(order.total_cents || 0);
    salesByDayMap.set(key, curr);
  }

  const salesByDay = [...salesByDayMap.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, values]) => ({ date, ...values }));

  const productMap = new Map<string, { quantity: number; revenueCents: number }>();
  for (const order of concludedOrders) {
    for (const item of order.items || []) {
      const curr = productMap.get(item.name) || { quantity: 0, revenueCents: 0 };
      curr.quantity += Number(item.quantity || 0);
      curr.revenueCents += Number(item.line_total || 0);
      productMap.set(item.name, curr);
    }
  }

  const topProducts = [...productMap.entries()]
    .map(([name, values]) => ({ name, ...values }))
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 5);

  return {
    range,
    totalOrders: inRangeOrders.length,
    grossRevenueCents,
    concludedRevenueCents,
    todayConcludedRevenueCents,
    avgTicketCents,
    byStatus,
    paymentMix,
    salesByDay,
    topProducts
  };
}
