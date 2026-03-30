import { currencyBRL } from './utils';

type MessageOrder = {
  customerName: string;
  customerPhone: string;
  orderType: 'delivery' | 'pickup';
  address?: string | null;
  notes?: string | null;
  subtotalCents: number;
  items: { name: string; quantity: number }[];
  defaultMessage?: string | null;
};

export function gerarMensagemPedido(order: MessageOrder) {
  const lines = [
    order.defaultMessage?.trim() || 'Olá! Gostaria de fazer um pedido:',
    '',
    `Nome: ${order.customerName}`,
    `Telefone: ${order.customerPhone}`,
    `Tipo: ${order.orderType === 'delivery' ? 'Entrega' : 'Retirada'}`,
    '',
    'Pedido:'
  ];

  order.items.forEach((item) => lines.push(`- ${item.quantity}x ${item.name}`));

  lines.push('', `Total: ${currencyBRL(order.subtotalCents)}`);

  if (order.notes?.trim()) {
    lines.push('', 'Observações:', order.notes.trim());
  }

  if (order.orderType === 'delivery' && order.address?.trim()) {
    lines.push('', 'Endereço:', order.address.trim());
  }

  return lines.join('\n');
}
