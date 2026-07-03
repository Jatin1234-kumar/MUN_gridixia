export interface FeeBreakdown {
  baseFee: number;
  committeeFee: number;
  kitFee: number;
  serviceFee: number;
  discount: number;
  tax: number;
  total: number;
}

export interface RazorpayOrder {
  id: string;
  entity: 'order';
  amount: number;
  amount_paid: number;
  amount_due: number;
  currency: string;
  receipt: string;
  status: 'created' | 'attempted' | 'paid';
  attempts: number;
  notes?: Record<string, string>;
  created_at: number;
}

export interface RazorpayPaymentEntity {
  id: string;
  entity: 'payment';
  amount: number;
  currency: string;
  status: string;
  order_id?: string;
  method?: string;
  email?: string;
  contact?: string;
  captured?: boolean;
  error_description?: string;
  created_at?: number;
}
