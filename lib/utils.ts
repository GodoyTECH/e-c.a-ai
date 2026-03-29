export const currencyBRL = (valueInCents: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(valueInCents / 100);

export const generateOrderCode = () => {
  const now = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `ACA-${now}-${random}`;
};

export const sanitizeCPF = (value: string) => value.replace(/\D/g, '').slice(0, 11);
