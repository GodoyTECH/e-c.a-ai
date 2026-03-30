import { gerarMensagemPedido } from './formatOrderMessage';

export function sanitizeWhatsAppNumber(number: string) {
  return number.replace(/\D/g, '');
}

export function gerarLinkWhatsApp(input: {
  ownerNumber: string;
  order: Parameters<typeof gerarMensagemPedido>[0];
}) {
  const number = sanitizeWhatsAppNumber(input.ownerNumber);
  if (!number) {
    throw new Error('Número de WhatsApp da loja não configurado.');
  }

  const message = gerarMensagemPedido(input.order);
  const encoded = encodeURIComponent(message);
  return `https://wa.me/${number}?text=${encoded}`;
}
