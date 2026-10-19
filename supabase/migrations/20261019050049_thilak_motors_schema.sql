/*
# Thilak Motors POS Schema

1. New Tables
- `customers` — Customer records with name, phone, notes. Lookup by phone.
- `vehicles` — Vehicles belonging to customers: bike model + registration number.
- `services` — Service catalog (e.g. Full Service, Oil Change) with default charge.
- `spare_parts` — Inventory items with quantity, cost price, selling price, low-stock threshold.
- `invoices` — Header for a sale/repair: customer, vehicle, totals, discount, tax, payment method.
- `invoice_items` — Line items on an invoice: either a service or a spare part, with qty and price snapshot.
- `settings` — Single-row table for store config: tax rate, currency symbol, business name.

2. Security
- This app HAS a sign-in screen (staff POS), so policies are `TO authenticated` with `auth.uid()` ownership checks.
- Owner column `user_id` defaults to `auth.uid()` on `customers`, `services`, `spare_parts`, `invoices`, and `settings` so inserts from the authenticated client succeed.
- `vehicles` are scoped through their parent customer via EXISTS check.
- `invoice_items` are scoped through their parent invoice via EXISTS check.
- Stock movement: when a spare part is sold, the invoice insert logic decrements quantity in app code.
- 4 separate policies (SELECT/INSERT/UPDATE/DELETE) per table. No `FOR ALL`.

3. Important Notes
- All owner tables have `user_id uuid NOT NULL DEFAULT auth.uid()` so the client insert omits user_id safely.
- `invoices` stores a numeric snapshot of totals so historical reports remain accurate even if services/parts change.
- `invoice_items` stores the name and unit price at time of sale for the same reason.
- `settings` is a single-row table enforced by a unique constraint on user_id.
*/

CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  phone text NOT NULL,
  email text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_customers" ON customers;
CREATE POLICY "select_own_customers" ON customers FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_customers" ON customers;
CREATE POLICY "insert_own_customers" ON customers FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_customers" ON customers;
CREATE POLICY "update_own_customers" ON customers FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_customers" ON customers;
CREATE POLICY "delete_own_customers" ON customers FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_customers_user ON customers(user_id);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);

CREATE TABLE IF NOT EXISTS vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  bike_model text NOT NULL,
  registration_number text NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_vehicles" ON vehicles;
CREATE POLICY "select_own_vehicles" ON vehicles FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM customers c WHERE c.id = vehicles.customer_id AND c.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "insert_own_vehicles" ON vehicles;
CREATE POLICY "insert_own_vehicles" ON vehicles FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM customers c WHERE c.id = vehicles.customer_id AND c.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "update_own_vehicles" ON vehicles;
CREATE POLICY "update_own_vehicles" ON vehicles FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM customers c WHERE c.id = vehicles.customer_id AND c.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM customers c WHERE c.id = vehicles.customer_id AND c.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "delete_own_vehicles" ON vehicles;
CREATE POLICY "delete_own_vehicles" ON vehicles FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM customers c WHERE c.id = vehicles.customer_id AND c.user_id = auth.uid())
  );

CREATE INDEX IF NOT EXISTS idx_vehicles_customer ON vehicles(customer_id);

CREATE TABLE IF NOT EXISTS services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  default_price numeric(10,2) NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE services ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_services" ON services;
CREATE POLICY "select_own_services" ON services FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_services" ON services;
CREATE POLICY "insert_own_services" ON services FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_services" ON services;
CREATE POLICY "update_own_services" ON services FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_services" ON services;
CREATE POLICY "delete_own_services" ON services FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_services_user ON services(user_id);

CREATE TABLE IF NOT EXISTS spare_parts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  sku text,
  category text,
  quantity integer NOT NULL DEFAULT 0,
  cost_price numeric(10,2) NOT NULL DEFAULT 0,
  selling_price numeric(10,2) NOT NULL DEFAULT 0,
  low_stock_threshold integer NOT NULL DEFAULT 5,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE spare_parts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_spare_parts" ON spare_parts;
CREATE POLICY "select_own_spare_parts" ON spare_parts FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_spare_parts" ON spare_parts;
CREATE POLICY "insert_own_spare_parts" ON spare_parts FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_spare_parts" ON spare_parts;
CREATE POLICY "update_own_spare_parts" ON spare_parts FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_spare_parts" ON spare_parts;
CREATE POLICY "delete_own_spare_parts" ON spare_parts FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_spare_parts_user ON spare_parts(user_id);
CREATE INDEX IF NOT EXISTS idx_spare_parts_lowstock ON spare_parts(user_id) WHERE quantity <= low_stock_threshold;

CREATE TABLE IF NOT EXISTS invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  vehicle_id uuid REFERENCES vehicles(id) ON DELETE SET NULL,
  invoice_number text NOT NULL,
  subtotal numeric(12,2) NOT NULL DEFAULT 0,
  discount_type text NOT NULL DEFAULT 'none',
  discount_value numeric(12,2) NOT NULL DEFAULT 0,
  discount_amount numeric(12,2) NOT NULL DEFAULT 0,
  tax_rate numeric(5,2) NOT NULL DEFAULT 0,
  tax_amount numeric(12,2) NOT NULL DEFAULT 0,
  total numeric(12,2) NOT NULL DEFAULT 0,
  payment_method text NOT NULL DEFAULT 'cash',
  amount_paid numeric(12,2) NOT NULL DEFAULT 0,
  change_due numeric(12,2) NOT NULL DEFAULT 0,
  notes text,
  status text NOT NULL DEFAULT 'completed',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_invoices" ON invoices;
CREATE POLICY "select_own_invoices" ON invoices FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_invoices" ON invoices;
CREATE POLICY "insert_own_invoices" ON invoices FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_invoices" ON invoices;
CREATE POLICY "update_own_invoices" ON invoices FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_invoices" ON invoices;
CREATE POLICY "delete_own_invoices" ON invoices FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_invoices_user ON invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_created ON invoices(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_customer ON invoices(customer_id);

CREATE TABLE IF NOT EXISTS invoice_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  item_type text NOT NULL,
  ref_id uuid,
  name text NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  unit_price numeric(10,2) NOT NULL DEFAULT 0,
  line_total numeric(12,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_invoice_items" ON invoice_items;
CREATE POLICY "select_own_invoice_items" ON invoice_items FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM invoices i WHERE i.id = invoice_items.invoice_id AND i.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "insert_own_invoice_items" ON invoice_items;
CREATE POLICY "insert_own_invoice_items" ON invoice_items FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM invoices i WHERE i.id = invoice_items.invoice_id AND i.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "update_own_invoice_items" ON invoice_items;
CREATE POLICY "update_own_invoice_items" ON invoice_items FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM invoices i WHERE i.id = invoice_items.invoice_id AND i.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM invoices i WHERE i.id = invoice_items.invoice_id AND i.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "delete_own_invoice_items" ON invoice_items;
CREATE POLICY "delete_own_invoice_items" ON invoice_items FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM invoices i WHERE i.id = invoice_items.invoice_id AND i.user_id = auth.uid())
  );

CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice ON invoice_items(invoice_id);

CREATE TABLE IF NOT EXISTS settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  business_name text NOT NULL DEFAULT 'Thilak Motors',
  business_tagline text NOT NULL DEFAULT 'Motorbike Repair & Service Center',
  address text,
  phone text,
  email text,
  tax_rate numeric(5,2) NOT NULL DEFAULT 0,
  currency_symbol text NOT NULL DEFAULT 'Rs. ',
  footer_note text NOT NULL DEFAULT 'Thank you for your business!',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_settings" ON settings;
CREATE POLICY "select_own_settings" ON settings FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_settings" ON settings;
CREATE POLICY "insert_own_settings" ON settings FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_settings" ON settings;
CREATE POLICY "update_own_settings" ON settings FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_settings" ON settings;
CREATE POLICY "delete_own_settings" ON settings FOR DELETE
  TO authenticated USING (auth.uid() = user_id);
