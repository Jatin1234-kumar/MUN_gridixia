/// <reference types="vite/client" />

interface Navigator {
  connection?: {
    effectiveType?: string;
    saveData?: boolean;
    downlink?: number;
  };
}

interface RazorpayCheckoutSuccess {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

interface RazorpayCheckoutOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  handler: (response: RazorpayCheckoutSuccess) => void | Promise<void>;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  notes?: Record<string, string>;
  theme?: { color?: string };
  modal?: { ondismiss?: () => void };
}

interface Window {
  Razorpay?: new (options: RazorpayCheckoutOptions) => { open: () => void };
}
