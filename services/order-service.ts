import { ensureDbSchema, getDb } from '@/lib/db';
import { gerarMensagemPedido } from '@/lib/formatOrderMessage';
import { gerarLinkWhatsApp } from '@/lib/whatsapp';
import { CheckoutPayload } from '@/types/order';
import { estimateFreightFromInput, sanitizePostalCode } from '@/lib/freight';
import { getStoreSettings } from '@/services/product-service';

const DEFAULT_SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://refrescando.netlify.app/';

export async function createOrder(payload: CheckoutPayload, idempotencyKey?: string) {
  const subtotal = payload.items.reduce((acc, item) => acc + item.priceCents * item.quantity, 0);

  const settingsForFreight = await getStoreSettings();
  let freightCents = Math.max(0, payload.freightCents || 0);

  if (payload.orderType === 'delivery') {
    try {
      const quote = await estimateFreightFromInput(settingsForFreight, {
        postalCode: sanitizePostalCode(payload.postalCode),
        fullAddress: payload.address || null,
        latitude: payload.customerLatitude ?? null,
        longitude: payload.customerLongitude ?? null
      });
      freightCents = Math.max(0, quote.cents);
    } catch {
      freightCents = Math.max(0, payload.freightCents || 0);
    }
  } else {
    freightCents = 0;
  }

  const totalCents = subtotal + freightCents;

  if (!process.env.DATABASE_URL) {
    const code = `ACA-${String(Math.floor(Date.now() / 1000) % 1_000_000).padStart(6, '0')}`;
    const siteUrl = DEFAULT_SITE_URL;
    const message = gerarMensagemPedido({
      orderCode: code,
      customerName: payload.customerName,
      customerPhone: payload.customerPhone,
      orderType: payload.orderType,
      paymentMethod: payload.paymentMethod,
      address: payload.address || null,
      postalCode: payload.postalCode || null,
      mapsLink: payload.mapsLink || null,
      notes: payload.notes || null,
      subtotalCents: subtotal,
      freightCents,
      totalCents,
      createdAt: new Date().toISOString(),
      items: payload.items.map((item) => ({
        name: item.name,
        quantity: item.quantity,
        size: item.size,
        includedToppings: item.includedToppings,
        optionalToppings: item.optionalToppings,
        lineTotalCents: item.priceCents * item.quantity
      })),
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

    const sequence = await client.query(
      `SELECT COALESCE(MAX(CAST(SUBSTRING(code FROM 5) AS INTEGER)), 0) AS max_seq
       FROM orders
       WHERE code ~ '^ACA-[0-9]{6}$'`
    );
    const nextCode = Number(sequence.rows[0]?.max_seq || 0) + 1;
    const code = `ACA-${String(nextCode).padStart(6, '0')}`;
    const settingsRow = settings.rows[0] || {};
    if (payload.orderType === 'delivery' && settingsRow.allow_delivery === false) {
      throw new Error('Entrega está desativada nas configurações.');
    }
    if (payload.orderType === 'pickup' && settingsRow.allow_pickup === false) {
      throw new Error('Retirada está desativada nas configurações.');
    }

    const createdAt = new Date().toISOString();

    const message = gerarMensagemPedido({
      orderCode: code,
      customerName: payload.customerName,
      customerPhone: payload.customerPhone,
      orderType: payload.orderType,
      paymentMethod: payload.paymentMethod,
      address: payload.address || null,
      postalCode: payload.postalCode || null,
      mapsLink: payload.mapsLink || null,
      notes: payload.notes || null,
      subtotalCents: subtotal,
      freightCents,
      totalCents,
      createdAt,
      items: payload.items.map((item) => ({
        name: item.name,
        quantity: item.quantity,
        size: item.size,
        includedToppings: item.includedToppings,
        optionalToppings: item.optionalToppings,
        lineTotalCents: item.priceCents * item.quantity
      })),
      defaultMessage: settingsRow.default_order_message || null,
      siteUrl: settingsRow.public_site_url || DEFAULT_SITE_URL
    });

    const orderRes = await client.query(
      `INSERT INTO orders
        (code, customer_name, customer_phone, order_type, payment_method, address, delivery_address, postal_code, maps_link, address_confirmed, notes, status, subtotal_cents, freight_cents, total_cents, customer_latitude, customer_longitude, whatsapp_target_number, whatsapp_message_snapshot, idempotency_key)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'pending_whatsapp',$12,$13,$14,$15,$16,$17,$18,$19)
       RETURNING id, code`,
      [
        code,
        payload.customerName,
        payload.customerPhone,
        payload.orderType,
        payload.paymentMethod,
        payload.address || null,
        payload.address || null,
        payload.postalCode || null,
        payload.mapsLink || null,
        payload.addressConfirmed ?? false,
        payload.notes || null,
        subtotal,
        freightCents,
        totalCents,
        payload.customerLatitude ?? null,
        payload.customerLongitude ?? null,
        settingsRow.owner_whatsapp_number || null,
        message,
        idempotencyKey || null
      ]
    );

    for (const item of payload.items) {
      const detailsSnapshot = {
        size: item.size,
        includedToppings: item.includedToppings,
        optionalToppings: item.optionalToppings,
        itemSubtotal: item.priceCents * item.quantity
      };

      await client.query(
        `INSERT INTO order_items (order_id, product_id, name, product_name_snapshot, quantity, unit_price_cents, unit_price_snapshot, line_total, toppings_snapshot, details_snapshot)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [
          orderRes.rows[0].id,
          item.productId,
          item.name,
          item.name,
          item.quantity,
          item.priceCents,
          item.priceCents,
          item.priceCents * item.quantity,
          item.optionalToppings.length ? item.optionalToppings.map((topping) => topping.name).join(', ') : null,
          JSON.stringify(detailsSnapshot)
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
          postalCode: payload.postalCode || null,
          mapsLink: payload.mapsLink || null,
          notes: payload.notes || null,
          subtotalCents: subtotal,
          freightCents,
          totalCents,
          createdAt,
          items: payload.items.map((item) => ({
            name: item.name,
            quantity: item.quantity,
            size: item.size,
            includedToppings: item.includedToppings,
            optionalToppings: item.optionalToppings,
            lineTotalCents: item.priceCents * item.quantity
          })),
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
      `SELECT id, code, customer_name, customer_phone, order_type, payment_method, status, subtotal_cents, freight_cents, total_cents, notes, delivery_address, postal_code, maps_link, customer_latitude, customer_longitude, created_at
       FROM orders
       ORDER BY created_at DESC`
    );

    const items = await db.query(
      `SELECT order_id, product_name_snapshot, quantity, line_total, details_snapshot
       FROM order_items
       ORDER BY id ASC`
    );

    const groupedItems = new Map<string, any[]>();
    for (const row of items.rows) {
      const parsed = row.details_snapshot || {};
      const list = groupedItems.get(row.order_id) || [];
      list.push({
        name: row.product_name_snapshot,
        quantity: row.quantity,
        line_total: row.line_total,
        size: parsed.size || null,
        includedToppings: parsed.includedToppings || [],
        optionalToppings: parsed.optionalToppings || []
      });
      groupedItems.set(row.order_id, list);
    }

    return orders.rows.map((order) => ({
      ...order,
      delivery_priority_score: order.order_type === 'delivery' ? 1 : 99,
      items: groupedItems.get(order.id) || []
    }));
  } catch (error) {
    console.warn('Falha ao listar pedidos. Retornando lista vazia.', error);
    return [];
  }
}

export async function updateOrderStatus(orderId: string, status: 'confirmed' | 'rejected' | 'preparing' | 'delivered', _reason?: string) {
  if (!process.env.DATABASE_URL) return;

  await ensureDbSchema();
  const db = getDb();
  await db.query('UPDATE orders SET status=$1, updated_at=NOW() WHERE id=$2', [status, orderId]);
}


export async function deleteOrder(orderId: string) {
  if (!process.env.DATABASE_URL) return;

  await ensureDbSchema();
  const db = getDb();
  await db.query('DELETE FROM orders WHERE id=$1', [orderId]);
}
