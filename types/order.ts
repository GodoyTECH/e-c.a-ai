import { PaymentMethod } from '@/lib/types';

export type OrderType = 'delivery' | 'pickup';

export type CheckoutPayload = {
  customerName: string;
  customerPhone: string;
  orderType: OrderType;
  paymentMethod: PaymentMethod;
  address?: string;
  cep?: string;
  addressMapLink?: string;
  addressLat?: number;
  addressLng?: number;
  deliveryFeeCents?: number;
  notes?: string;
  items: {
    productId: string;
    name: string;
    quantity: number;
    priceCents: number;
    size: {
      id: string;
      label: string;
      volumeMl: number;
      priceCents: number;
    };
    includedToppings: { toppingId: string; name: string; priceCents: number }[];
    optionalToppings: { toppingId: string; name: string; priceCents: number }[];
    toppings: string[];
  }[];
};
