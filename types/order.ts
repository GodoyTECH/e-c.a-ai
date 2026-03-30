export type OrderType = 'delivery' | 'pickup';

export type CheckoutPayload = {
  customerName: string;
  customerPhone: string;
  orderType: OrderType;
  address?: string;
  notes?: string;
  items: {
    productId: string;
    name: string;
    quantity: number;
    priceCents: number;
  }[];
};
