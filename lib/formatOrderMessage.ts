import { PaymentMethod } from './types';
import { currencyBRL } from './utils';

type MessageOrder = {
  orderCode?: string;
  customerName: string;
  customerPhone: string;
  orderType: 'delivery' | 'pickup';
  paymentMethod: PaymentMethod;
  address?: string | null;
  notes?: string | null;
  subtotalCents: number;
  items: { name: string; quantity: number }[];
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
    '',
    'Itens:'
  ].filter(Boolean) as string[];

  order.items.forEach((item) => lines.push(`- ${item.name} x${item.quantity}`));

  lines.push(
    '',
    `Total: ${currencyBRL(order.subtotalCents)}`,
    `Pagamento: ${paymentMethodLabels[order.paymentMethod]}`,
    `Tipo: ${order.orderType === 'delivery' ? 'Entrega' : 'Retirada'}`
  );

  if (order.orderType === 'delivery' && order.address?.trim()) {
    lines.push(`Endereço: ${order.address.trim()}`);
  }

  if (order.notes?.trim()) {
    lines.push('', `Observações: ${order.notes.trim()}`);
  }

  if (order.siteUrl?.trim()) {
    lines.push('', `Site: ${order.siteUrl.trim()}`);
  }

  return lines.join('\n');
}
