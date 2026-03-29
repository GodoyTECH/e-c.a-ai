import { getDb } from '@/lib/db';
import { generateOrderCode } from '@/lib/utils';
import { gerarLinkWhatsApp } from '@/lib/whatsapp';
import { CheckoutPayload } from '@/types/order';

export async function createOrder(payload: CheckoutPayload, idempotencyKey?: string) {
  const db = getDb();
  const client = await db.connect();

  try {
    await client.query('BEGIN');

    if (idempotencyKey) {
      const existing = await client.query('SELECT id, code FROM orders WHERE idempotency_key = $1', [idempotencyKey]);
      if (existing.rows[0]) {
        await client.query('ROLLBACK');
        return { ...existing.rows[0], whatsappUrl: null };
      }
    }

    const subtotal = payload.items.reduce((acc, item) => acc + item.priceCents * item.quantity, 0);

    const orderRes = await client.query(
      `INSERT INTO orders
        (code, customer_name, customer_phone, order_type, address, notes, status, subtotal_cents, idempotency_key)
       VALUES ($1,$2,$3,$4,$5,$6,'pending_whatsapp',$7,$8)
       RETURNING id, code`,
      [
        generateOrderCode(),
        payload.customerName,
        payload.customerPhone,
        payload.orderType,
        payload.address || null,
        payload.notes || null,
        subtotal,
        idempotencyKey || null
      ]
    );

    for (const item of payload.items) {
      await client.query(
        `INSERT INTO order_items (order_id, product_id, name, quantity, unit_price_cents)
         VALUES ($1,$2,$3,$4,$5)`,
        [orderRes.rows[0].id, item.productId, item.name, item.quantity, item.priceCents]
      );
    }

    const settings = await client.query(
      'SELECT owner_whatsapp_number, default_order_message FROM store_settings WHERE id = 1'
    );

    await client.query('COMMIT');

    const whatsappUrl = gerarLinkWhatsApp({
      ownerNumber: settings.rows[0]?.owner_whatsapp_number || '',
      order: {
        customerName: payload.customerName,
        customerPhone: payload.customerPhone,
        orderType: payload.orderType,
        address: payload.address || null,
        notes: payload.notes || null,
        subtotalCents: subtotal,
        items: payload.items.map((item) => ({ name: item.name, quantity: item.quantity })),
        defaultMessage: settings.rows[0]?.default_order_message || null
      }
    });

    return { ...orderRes.rows[0], whatsappUrl };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function listOrders() {
  const db = getDb();
  const orders = await db.query(
    `SELECT id, code, customer_name, customer_phone, order_type, status, subtotal_cents, created_at
     FROM orders
     ORDER BY created_at DESC`
  );

  return orders.rows;
}

export async function updateOrderStatus(
  orderId: string,
  status: 'confirmed' | 'rejected',
  reason?: string
) {
  const db = getDb();
  await db.query(
    'UPDATE orders SET status=$1, notes=COALESCE($3, notes), updated_at=NOW() WHERE id=$2',
    [status, orderId, reason ?? null]
  );
}
