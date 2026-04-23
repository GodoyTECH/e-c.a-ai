import { isAdminAuthenticated } from '@/lib/auth';
import { computeDashboardMetrics, DashboardRange } from '@/lib/admin-dashboard';
import { listOrders } from '@/services/order-service';
import { NextRequest, NextResponse } from 'next/server';

function parseRange(value: string | null): DashboardRange {
  if (value === 'today' || value === '30d') return value;
  return '7d';
}

export async function GET(request: NextRequest) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const range = parseRange(request.nextUrl.searchParams.get('range'));
  const orders = await listOrders();
  const metrics = computeDashboardMetrics(orders, range);
  return NextResponse.json(metrics);
}
