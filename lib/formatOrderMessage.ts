import { PaymentMethod } from './types';
import { currencyBRL } from './utils';

type MessageOrderItem = {
  name: string;
  quantity: number;
  size?: { label: string; volumeMl: number; priceCents: number };
  includedToppings?: { name: string }[];
  optionalToppings?: { name: string; priceCents: number }[];
  lineTotalCents?: number;
};

type MessageOrder = {
  orderCode?: string;
  customerName: string;
  customerPhone: string;
  orderType: 'delivery' | 'pickup';
  paymentMethod: PaymentMethod;
  address?: string | null;
  notes?: string | null;
  cep?: string | null;
  mapsLink?: string | null;
  deliveryFeeCents?: number;
  subtotalCents: number;
  items: MessageOrderItem[];
  defaultMessage?: string | null;
  siteUrl?: string | null;
};

const paymentMethodLabels: Record<PaymentMethod, string> = {
  pix: 'Pix',
  credit_card: 'Cartão de crédito',
  debit_card: 'Cartão de débito'
};

export function gerarMensagemPedido(order: MessageOrder) {
  const lines = [
    order.defaultMessage?.trim() || 'Olá! Quero confirmar meu pedido.',
    '',
    order.orderCode ? `Pedido: #${order.orderCode}` : null,
    `Cliente: ${order.customerName}`,
    `Telefone: ${order.customerPhone}`,
    `Data: ${new Date().toLocaleString('pt-BR')}`,
    '',
    'Itens:'
  ].filter(Boolean) as string[];

  order.items.forEach((item, index) => {
    lines.push(`${index + 1}. ${item.name}`);
    if (item.size) {
      lines.push(`   • Tamanho: ${item.size.label} (${item.size.volumeMl}ml)`);
    }
    lines.push(`   • Quantidade: ${item.quantity}`);
    lines.push(`   • Preço base: ${currencyBRL(item.size?.priceCents ?? 0)}`);

    if (item.includedToppings?.length) {
      lines.push(`   • Inclusos: ${item.includedToppings.map((topping) => topping.name).join(', ')}`);
    }

    if (item.optionalToppings?.length) {
      lines.push(
        `   • Adicionais: ${item.optionalToppings
          .map((topping) => `${topping.name} (+${currencyBRL(topping.priceCents)})`)
          .join(', ')}`
      );
    } else {
      lines.push('   • Adicionais: nenhum');
    }

    lines.push(`   • Subtotal do item: ${currencyBRL(item.lineTotalCents ?? 0)}`);
  });

  lines.push(
    '',
    `Subtotal: ${currencyBRL(order.subtotalCents)}`,
    `Total: ${currencyBRL(order.subtotalCents)}`,
    `Pagamento: ${paymentMethodLabels[order.paymentMethod]}`,
    `Tipo: ${order.orderType === 'delivery' ? 'Entrega' : 'Retirada'}`
  );

  if ((order.deliveryFeeCents || 0) > 0) {
    lines.push(`Frete: ${currencyBRL(order.deliveryFeeCents || 0)}`);
  }

  if (order.orderType === 'delivery' && order.address?.trim()) {
    lines.push(`Endereço: ${order.address.trim()}`);
    if (order.cep?.trim()) lines.push(`CEP: ${order.cep.trim()}`);
    if (order.mapsLink?.trim()) lines.push(`Maps: ${order.mapsLink.trim()}`);
  }

  if (order.notes?.trim()) {
    lines.push(`Observações: ${order.notes.trim()}`);
  }

  if (order.siteUrl?.trim()) {
    lines.push('', `Site: ${order.siteUrl.trim()}`);
  }

  return lines.join('\n');
}
