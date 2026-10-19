import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

export type Customer = {
  id: string;
  user_id: string;
  name: string;
  phone: string;
  email: string | null;
  notes: string | null;
  created_at: string;
};

export type Vehicle = {
  id: string;
  customer_id: string;
  bike_model: string;
  registration_number: string;
  notes: string | null;
  created_at: string;
};

export type Service = {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  default_price: number;
  is_active: boolean;
  created_at: string;
};

export type SparePart = {
  id: string;
  user_id: string;
  name: string;
  sku: string | null;
  category: string | null;
  quantity: number;
  cost_price: number;
  selling_price: number;
  low_stock_threshold: number;
  created_at: string;
};

export type InvoiceItem = {
  id: string;
  invoice_id: string;
  item_type: 'service' | 'part';
  ref_id: string | null;
  name: string;
  quantity: number;
  unit_price: number;
  line_total: number;
  created_at: string;
};

export type Invoice = {
  id: string;
  user_id: string;
  customer_id: string | null;
  vehicle_id: string | null;
  invoice_number: string;
  subtotal: number;
  discount_type: 'none' | 'percentage' | 'fixed';
  discount_value: number;
  discount_amount: number;
  tax_rate: number;
  tax_amount: number;
  total: number;
  payment_method: 'cash' | 'card' | 'online';
  amount_paid: number;
  change_due: number;
  notes: string | null;
  status: string;
  created_at: string;
  customer?: Customer | null;
  vehicle?: Vehicle | null;
  invoice_items?: InvoiceItem[];
};

export type Settings = {
  id: string;
  user_id: string;
  business_name: string;
  business_tagline: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  tax_rate: number;
  currency_symbol: string;
  footer_note: string;
  created_at: string;
};
