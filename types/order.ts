import { PaymentMethod } from '@/lib/types';

export type OrderType = 'delivery' | 'pickup';

export type CheckoutPayload = {
  customerName: string;
  customerPhone: string;
  orderType: OrderType;
  paymentMethod: PaymentMethod;
  address?: string;
  notes?: string;
  items: {
    productId: string;
    name: string;
    quantity: number;
    priceCents: number;
  }[];
};
