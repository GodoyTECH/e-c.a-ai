import { ensureDbSchema, getDb } from '@/lib/db';
import { generateOrderCode } from '@/lib/utils';
import { gerarMensagemPedido } from '@/lib/formatOrderMessage';
import { gerarLinkWhatsApp } from '@/lib/whatsapp';
import { CheckoutPayload } from '@/types/order';

const DEFAULT_SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://refrescando.netlify.app/';

export async function createOrder(payload: CheckoutPayload, idempotencyKey?: string) {
  const subtotal = payload.items.reduce((acc, item) => acc + item.priceCents * item.quantity, 0);

  if (!process.env.DATABASE_URL) {
    const code = generateOrderCode();
    const siteUrl = DEFAULT_SITE_URL;
    const message = gerarMensagemPedido({
      orderCode: code,
      customerName: payload.customerName,
      customerPhone: payload.customerPhone,
      orderType: payload.orderType,
      paymentMethod: payload.paymentMethod,
      address: payload.address || null,
      notes: payload.notes || null,
      subtotalCents: subtotal,
      items: payload.items.map((item) => ({ name: item.name, quantity: item.quantity, toppings: item.toppings })),
      defaultMessage: 'Olá! Pedido criado em modo demonstração.',
      siteUrl
    });

    return {
      id: idempotencyKey || crypto.randomUUID(),
      code,
      whatsappUrl: `https://wa.me/5511999999999?text=${encodeURIComponent(message)}`
    };
  }

  await ensureDbSchema();
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

    const settings = await client.query(
      'SELECT owner_whatsapp_number, default_order_message, public_site_url, allow_delivery, allow_pickup FROM store_settings WHERE id = 1'
    );

    const code = generateOrderCode();
    const settingsRow = settings.rows[0] || {};
    if (payload.orderType === 'delivery' && settingsRow.allow_delivery === false) {
      throw new Error('Entrega está desativada nas configurações.');
    }
    if (payload.orderType === 'pickup' && settingsRow.allow_pickup === false) {
      throw new Error('Retirada está desativada nas configurações.');
    }

    const message = gerarMensagemPedido({
      orderCode: code,
      customerName: payload.customerName,
      customerPhone: payload.customerPhone,
      orderType: payload.orderType,
      paymentMethod: payload.paymentMethod,
      address: payload.address || null,
      notes: payload.notes || null,
      subtotalCents: subtotal,
      items: payload.items.map((item) => ({ name: item.name, quantity: item.quantity, toppings: item.toppings })),
      defaultMessage: settingsRow.default_order_message || null,
      siteUrl: settingsRow.public_site_url || DEFAULT_SITE_URL
    });

    const orderRes = await client.query(
      `INSERT INTO orders
        (code, customer_name, customer_phone, order_type, payment_method, address, delivery_address, notes, status, subtotal_cents, total_cents, whatsapp_target_number, whatsapp_message_snapshot, idempotency_key)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'pending_whatsapp',$9,$10,$11,$12,$13)
       RETURNING id, code`,
      [
        code,
        payload.customerName,
        payload.customerPhone,
        payload.orderType,
        payload.paymentMethod,
        payload.address || null,
        payload.address || null,
        payload.notes || null,
        subtotal,
        subtotal,
        settingsRow.owner_whatsapp_number || null,
        message,
        idempotencyKey || null
      ]
    );

    for (const item of payload.items) {
      await client.query(
        `INSERT INTO order_items (order_id, product_id, name, product_name_snapshot, quantity, unit_price_cents, unit_price_snapshot, line_total, toppings_snapshot)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [
          orderRes.rows[0].id,
          item.productId,
          item.name,
          item.name,
          item.quantity,
          item.priceCents,
          item.priceCents,
          item.priceCents * item.quantity,
          item.toppings.length ? item.toppings.join(', ') : null
        ]
      );
    }

    await client.query('COMMIT');

    let whatsappUrl: string | null = null;
    try {
      whatsappUrl = gerarLinkWhatsApp({
        ownerNumber: settingsRow.owner_whatsapp_number || '',
        order: {
          orderCode: code,
          customerName: payload.customerName,
          customerPhone: payload.customerPhone,
          orderType: payload.orderType,
          paymentMethod: payload.paymentMethod,
          address: payload.address || null,
          notes: payload.notes || null,
          subtotalCents: subtotal,
          items: payload.items.map((item) => ({ name: item.name, quantity: item.quantity, toppings: item.toppings })),
          defaultMessage: settingsRow.default_order_message || null,
          siteUrl: settingsRow.public_site_url || DEFAULT_SITE_URL
        }
      });
    } catch {
      whatsappUrl = null;
    }

    return { ...orderRes.rows[0], whatsappUrl };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function listOrders() {
  if (!process.env.DATABASE_URL) return [];

  try {
    await ensureDbSchema();
    const db = getDb();
    const orders = await db.query(
      `SELECT id, code, customer_name, customer_phone, order_type, payment_method, status, total_cents, created_at
       FROM orders
       ORDER BY created_at DESC`
    );

    return orders.rows;
  } catch (error) {
    console.warn('Falha ao listar pedidos. Retornando lista vazia.', error);
    return [];
  }
}

export async function updateOrderStatus(orderId: string, status: 'confirmed' | 'rejected', _reason?: string) {
  if (!process.env.DATABASE_URL) return;

  await ensureDbSchema();
  const db = getDb();
  await db.query('UPDATE orders SET status=$1, updated_at=NOW() WHERE id=$2', [status, orderId]);
}
