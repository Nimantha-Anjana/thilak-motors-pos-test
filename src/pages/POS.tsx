import { useEffect, useMemo, useState } from 'react';
import {
  Search,
  Wrench,
  Package,
  Plus,
  Minus,
  Trash2,
  ShoppingCart,
  User,
  Bike,
  Percent,
  IndianRupee,
  CreditCard,
  Banknote,
  Smartphone,
  CheckCircle2,
  Printer,
  X,
  Loader2,
  Phone,
} from 'lucide-react';
import { supabase, type Service, type SparePart, type Customer, type Vehicle, type Invoice } from '@/lib/supabase';
import { useSettings } from '@/context/SettingsContext';
import { useAuth } from '@/context/AuthContext';
import { formatMoney, generateInvoiceNumber } from '@/lib/utils';
import { showToast } from '@/components/Toast';
import { Modal } from '@/components/Modal';
import { PrintableInvoice } from '@/components/PrintableInvoice';
import type { Page } from '@/components/AppLayout';

type CartItem = {
  key: string;
  type: 'service' | 'part';
  refId: string;
  name: string;
  unitPrice: number;
  quantity: number;
  maxQty?: number;
};

export function POS({ onPageChange }: { onPageChange: (p: Page) => void }) {
  const { settings } = useSettings();
  const { user } = useAuth();
  const cur = settings.currency_symbol;
  const [tab, setTab] = useState<'services' | 'parts'>('services');
  const [search, setSearch] = useState('');
  const [services, setServices] = useState<Service[]>([]);
  const [parts, setParts] = useState<SparePart[]>([]);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<CartItem[]>([]);

  // Customer / vehicle
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerPicker, setShowCustomerPicker] = useState(false);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [showVehicleForm, setShowVehicleForm] = useState(false);
  const [newVehicle, setNewVehicle] = useState({ bike_model: '', registration_number: '' });

  // New walk-in customer
  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [newCust, setNewCust] = useState({ name: '', phone: '' });

  // Discount / tax / payment
  const [discountType, setDiscountType] = useState<'none' | 'percentage' | 'fixed'>('none');
  const [discountValue, setDiscountValue] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'online'>('cash');
  const [amountPaid, setAmountPaid] = useState(0);
  const [notes, setNotes] = useState('');

  const [checkoutBusy, setCheckoutBusy] = useState(false);
  const [completedInvoice, setCompletedInvoice] = useState<Invoice | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [s, p, c] = await Promise.all([
        supabase.from('services').select('*').eq('is_active', true).order('name'),
        supabase.from('spare_parts').select('*').order('name'),
        supabase.from('customers').select('*').order('name'),
      ]);
      setServices((s.data ?? []) as Service[]);
      setParts((p.data ?? []) as SparePart[]);
      setCustomers((c.data ?? []) as Customer[]);
      setLoading(false);
    })();
  }, []);

  const filteredServices = useMemo(
    () => services.filter((s) => s.name.toLowerCase().includes(search.toLowerCase())),
    [services, search]
  );
  const filteredParts = useMemo(
    () => parts.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()) || (p.sku ?? '').toLowerCase().includes(search.toLowerCase())),
    [parts, search]
  );
  const filteredCustomers = useMemo(
    () => customers.filter((c) => c.name.toLowerCase().includes(customerSearch.toLowerCase()) || c.phone.includes(customerSearch)),
    [customers, customerSearch]
  );

  const addToCart = (item: CartItem) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.key === item.key);
      if (existing) {
        const nextQty = existing.quantity + 1;
        if (item.maxQty != null && nextQty > item.maxQty) {
          showToast(`Only ${item.maxQty} in stock`, 'error');
          return prev;
        }
        return prev.map((c) => (c.key === item.key ? { ...c, quantity: nextQty } : c));
      }
      return [...prev, item];
    });
  };

  const updateQty = (key: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((c) => {
          if (c.key !== key) return c;
          const next = c.quantity + delta;
          if (c.maxQty != null && next > c.maxQty) {
            showToast(`Only ${c.maxQty} in stock`, 'error');
            return c;
          }
          return { ...c, quantity: Math.max(1, next) };
        })
        .filter((c) => c.quantity > 0)
    );
  };

  const removeFromCart = (key: string) => setCart((prev) => prev.filter((c) => c.key !== key));

  const setPrice = (key: string, price: number) =>
    setCart((prev) => prev.map((c) => (c.key === key ? { ...c, unitPrice: Math.max(0, price) } : c)));

  const subtotal = cart.reduce((s, c) => s + c.unitPrice * c.quantity, 0);
  const discountAmount = useMemo(() => {
    if (discountType === 'percentage') return (subtotal * Math.min(discountValue, 100)) / 100;
    if (discountType === 'fixed') return Math.min(discountValue, subtotal);
    return 0;
  }, [discountType, discountValue, subtotal]);
  const taxableBase = subtotal - discountAmount;
  const taxAmount = (taxableBase * Number(settings.tax_rate)) / 100;
  const total = taxableBase + taxAmount;
  const changeDue = Math.max(0, amountPaid - total);

  const onSelectCustomer = async (c: Customer) => {
    setSelectedCustomer(c);
    setShowCustomerPicker(false);
    setSelectedVehicle(null);
    const { data } = await supabase.from('vehicles').select('*').eq('customer_id', c.id).order('created_at');
    setVehicles((data ?? []) as Vehicle[]);
  };

  const createWalkInCustomer = async () => {
    if (!newCust.name.trim() || !newCust.phone.trim()) {
      showToast('Name and phone are required', 'error');
      return;
    }
    const { data, error } = await supabase
      .from('customers')
      .insert({ name: newCust.name.trim(), phone: newCust.phone.trim() })
      .select('*')
      .single();
    if (error) {
      showToast(error.message, 'error');
      return;
    }
    const created = data as Customer;
    setCustomers((p) => [...p, created]);
    onSelectCustomer(created);
    setNewCust({ name: '', phone: '' });
    setShowNewCustomer(false);
    showToast('Customer added', 'success');
  };

  const addVehicle = async () => {
    if (!selectedCustomer) return;
    if (!newVehicle.bike_model.trim() || !newVehicle.registration_number.trim()) {
      showToast('Bike model and registration are required', 'error');
      return;
    }
    const { data, error } = await supabase
      .from('vehicles')
      .insert({ customer_id: selectedCustomer.id, ...newVehicle })
      .select('*')
      .single();
    if (error) {
      showToast(error.message, 'error');
      return;
    }
    const v = data as Vehicle;
    setVehicles((p) => [...p, v]);
    setSelectedVehicle(v);
    setNewVehicle({ bike_model: '', registration_number: '' });
    setShowVehicleForm(false);
    showToast('Vehicle added', 'success');
  };

  const checkout = async () => {
    if (cart.length === 0) {
      showToast('Cart is empty', 'error');
      return;
    }
    if (!user) return;
    setCheckoutBusy(true);

    const invoiceNumber = generateInvoiceNumber();
    const invoiceRow = {
      invoice_number: invoiceNumber,
      customer_id: selectedCustomer?.id ?? null,
      vehicle_id: selectedVehicle?.id ?? null,
      subtotal,
      discount_type: discountType,
      discount_value: discountValue,
      discount_amount: discountAmount,
      tax_rate: Number(settings.tax_rate),
      tax_amount: taxAmount,
      total,
      payment_method: paymentMethod,
      amount_paid: amountPaid || total,
      change_due: amountPaid ? changeDue : 0,
      notes: notes || null,
      status: 'completed',
    };

    const { data: invData, error: invError } = await supabase
      .from('invoices')
      .insert(invoiceRow)
      .select('*, customer:customers(*), vehicle:vehicles(*)')
      .single();
    if (invError) {
      showToast(invError.message, 'error');
      setCheckoutBusy(false);
      return;
    }
    const invoice = invData as Invoice;

    const itemsRows = cart.map((c) => ({
      invoice_id: invoice.id,
      item_type: c.type,
      ref_id: c.refId,
      name: c.name,
      quantity: c.quantity,
      unit_price: c.unitPrice,
      line_total: c.unitPrice * c.quantity,
    }));
    const { error: itemsError } = await supabase.from('invoice_items').insert(itemsRows);
    if (itemsError) {
      showToast(itemsError.message, 'error');
      setCheckoutBusy(false);
      return;
    }

    // Decrement stock for parts
    await Promise.all(
      cart
        .filter((c) => c.type === 'part')
        .map(async (c) => {
          const part = parts.find((p) => p.id === c.refId);
          if (!part) return;
          const newQty = Math.max(0, part.quantity - c.quantity);
          await supabase.from('spare_parts').update({ quantity: newQty }).eq('id', part.id);
        })
    );

    // Fetch items for the invoice
    const { data: fullItems } = await supabase
      .from('invoice_items')
      .select('*')
      .eq('invoice_id', invoice.id)
      .order('created_at');
    setCompletedInvoice({ ...invoice, invoice_items: (fullItems ?? []) as any });

    // Reset cart
    setCart([]);
    setDiscountType('none');
    setDiscountValue(0);
    setAmountPaid(0);
    setNotes('');
    setSelectedCustomer(null);
    setSelectedVehicle(null);
    setVehicles([]);
    setCheckoutBusy(false);
    showToast('Invoice created successfully!', 'success');
  };

  const resetAll = () => {
    setCompletedInvoice(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (completedInvoice) {
    return <CheckoutSuccess invoice={completedInvoice} onNew={resetAll} onViewInvoices={() => onPageChange('invoices')} settings={settings} />;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6 animate-fade-in">
      {/* Left: catalog */}
      <div className="space-y-4">
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4">
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`Search ${tab === 'services' ? 'services' : 'parts'}...`}
              className="w-full pl-10 pr-3 py-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>
          <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg w-fit">
            <button
              onClick={() => setTab('services')}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === 'services' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500'}`}
            >
              <Wrench className="w-4 h-4" /> Services
            </button>
            <button
              onClick={() => setTab('parts')}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === 'parts' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500'}`}
            >
              <Package className="w-4 h-4" /> Spare Parts
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {tab === 'services'
            ? filteredServices.map((s) => (
                <button
                  key={s.id}
                  onClick={() => addToCart({ key: `svc-${s.id}`, type: 'service', refId: s.id, name: s.name, unitPrice: Number(s.default_price), quantity: 1 })}
                  className="text-left p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-sky-400 hover:shadow-md transition-all group"
                >
                  <div className="w-10 h-10 rounded-lg bg-sky-50 dark:bg-sky-950/40 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                    <Wrench className="w-5 h-5 text-sky-600 dark:text-sky-400" />
                  </div>
                  <p className="font-semibold text-slate-900 dark:text-white text-sm">{s.name}</p>
                  {s.description && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">{s.description}</p>}
                  <p className="text-sky-600 dark:text-sky-400 font-bold mt-2">{formatMoney(Number(s.default_price), cur)}</p>
                </button>
              ))
            : filteredParts.map((p) => {
                const out = p.quantity <= 0;
                return (
                  <button
                    key={p.id}
                    disabled={out}
                    onClick={() => addToCart({ key: `part-${p.id}`, type: 'part', refId: p.id, name: p.name, unitPrice: Number(p.selling_price), quantity: 1, maxQty: p.quantity })}
                    className="text-left p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-emerald-400 hover:shadow-md transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="flex items-start justify-between">
                      <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Package className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${out ? 'bg-rose-100 text-rose-600' : p.quantity <= p.low_stock_threshold ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>
                        {out ? 'Out' : `${p.quantity} in stock`}
                      </span>
                    </div>
                    <p className="font-semibold text-slate-900 dark:text-white text-sm mt-3">{p.name}</p>
                    {p.sku && <p className="text-xs text-slate-400">{p.sku}</p>}
                    <p className="text-emerald-600 dark:text-emerald-400 font-bold mt-2">{formatMoney(Number(p.selling_price), cur)}</p>
                  </button>
                );
              })}
          {tab === 'services' && filteredServices.length === 0 && (
            <div className="col-span-full text-center py-12 text-slate-400 text-sm">
              No services found. Add some in the Services page.
            </div>
          )}
          {tab === 'parts' && filteredParts.length === 0 && (
            <div className="col-span-full text-center py-12 text-slate-400 text-sm">
              No spare parts found. Add some in the Inventory page.
            </div>
          )}
        </div>
      </div>

      {/* Right: cart */}
      <div className="lg:sticky lg:top-20 self-start">
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col max-h-[calc(100vh-6rem)]">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <ShoppingCart className="w-5 h-5" /> Current Sale
              </h3>
              {cart.length > 0 && (
                <button onClick={() => setCart([])} className="text-xs text-rose-500 hover:underline">Clear all</button>
              )}
            </div>

            {/* Customer */}
            {selectedCustomer ? (
              <div className="rounded-lg bg-slate-50 dark:bg-slate-800 p-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <User className="w-4 h-4 text-sky-500 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{selectedCustomer.name}</p>
                      <p className="text-xs text-slate-500">{selectedCustomer.phone}</p>
                    </div>
                  </div>
                  <button onClick={() => { setSelectedCustomer(null); setSelectedVehicle(null); setVehicles([]); }} className="text-slate-400 hover:text-rose-500">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                {vehicles.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {vehicles.map((v) => (
                      <button
                        key={v.id}
                        onClick={() => setSelectedVehicle(v)}
                        className={`text-xs px-2 py-1 rounded-md font-medium transition-colors ${selectedVehicle?.id === v.id ? 'bg-sky-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}
                      >
                        {v.bike_model} · {v.registration_number}
                      </button>
                    ))}
                  </div>
                )}
                {vehicles.length > 0 && !showVehicleForm && (
                  <button onClick={() => setShowVehicleForm(true)} className="mt-2 text-xs text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1">
                    <Plus className="w-3 h-3" /> Add vehicle
                  </button>
                )}
                {showVehicleForm && (
                  <div className="mt-2 space-y-2">
                    <input
                      value={newVehicle.bike_model}
                      onChange={(e) => setNewVehicle((p) => ({ ...p, bike_model: e.target.value }))}
                      placeholder="Bike model"
                      className="w-full px-2 py-1.5 text-sm rounded-md bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-sky-500"
                    />
                    <input
                      value={newVehicle.registration_number}
                      onChange={(e) => setNewVehicle((p) => ({ ...p, registration_number: e.target.value }))}
                      placeholder="Reg. number"
                      className="w-full px-2 py-1.5 text-sm rounded-md bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-sky-500"
                    />
                    <div className="flex gap-2">
                      <button onClick={addVehicle} className="text-xs px-2 py-1 rounded-md bg-sky-600 text-white font-medium">Save</button>
                      <button onClick={() => setShowVehicleForm(false)} className="text-xs px-2 py-1 rounded-md text-slate-500">Cancel</button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={() => setShowCustomerPicker(true)}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border border-dashed border-slate-300 dark:border-slate-700 text-slate-500 hover:border-sky-400 hover:text-sky-600 text-sm font-medium transition-colors"
                >
                  <User className="w-4 h-4" /> Select customer
                </button>
                <button
                  onClick={() => setShowNewCustomer(true)}
                  className="px-3 py-2.5 rounded-lg border border-dashed border-slate-300 dark:border-slate-700 text-slate-500 hover:border-sky-400 hover:text-sky-600 transition-colors"
                  title="Add new customer"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Cart items */}
          <div className="flex-1 overflow-y-auto p-4">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-12">
                <ShoppingCart className="w-10 h-10 text-slate-300 dark:text-slate-700 mb-2" />
                <p className="text-sm text-slate-400">Add services or parts to start a sale</p>
              </div>
            ) : (
              <div className="space-y-2">
                {cart.map((c) => (
                  <div key={c.key} className="rounded-lg border border-slate-200 dark:border-slate-800 p-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        {c.type === 'service' ? <Wrench className="w-4 h-4 text-sky-500 flex-shrink-0" /> : <Package className="w-4 h-4 text-emerald-500 flex-shrink-0" />}
                        <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{c.name}</p>
                      </div>
                      <button onClick={() => removeFromCart(c.key)} className="text-slate-300 hover:text-rose-500 flex-shrink-0">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="flex items-center justify-between mt-2 gap-2">
                      <div className="flex items-center gap-1">
                        <button onClick={() => updateQty(c.key, -1)} className="w-6 h-6 rounded-md bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700">
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-8 text-center text-sm font-semibold text-slate-900 dark:text-white">{c.quantity}</span>
                        <button onClick={() => updateQty(c.key, 1)} className="w-6 h-6 rounded-md bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700">
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-slate-400">@</span>
                        <input
                          type="number"
                          value={c.unitPrice}
                          onChange={(e) => setPrice(c.key, Number(e.target.value))}
                          className="w-20 px-1.5 py-1 text-sm text-right rounded-md bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-sky-500"
                        />
                      </div>
                      <p className="text-sm font-bold text-slate-900 dark:text-white w-20 text-right">{formatMoney(c.unitPrice * c.quantity, cur)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Summary + checkout */}
          {cart.length > 0 && (
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
              {/* Discount */}
              <div className="flex gap-2">
                <select
                  value={discountType}
                  onChange={(e) => setDiscountType(e.target.value as any)}
                  className="px-2 py-1.5 text-sm rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-sky-500"
                >
                  <option value="none">No discount</option>
                  <option value="percentage">Percentage %</option>
                  <option value="fixed">Fixed amount</option>
                </select>
                {discountType !== 'none' && (
                  <input
                    type="number"
                    value={discountValue || ''}
                    onChange={(e) => setDiscountValue(Number(e.target.value))}
                    placeholder={discountType === 'percentage' ? '%' : 'Amount'}
                    className="flex-1 px-2 py-1.5 text-sm rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                )}
              </div>

              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between text-slate-500 dark:text-slate-400">
                  <span>Subtotal</span><span>{formatMoney(subtotal, cur)}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-rose-500">
                    <span>Discount</span><span>-{formatMoney(discountAmount, cur)}</span>
                  </div>
                )}
                {taxAmount > 0 && (
                  <div className="flex justify-between text-slate-500 dark:text-slate-400">
                    <span>Tax ({Number(settings.tax_rate)}%)</span><span>{formatMoney(taxAmount, cur)}</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-extrabold text-slate-900 dark:text-white pt-1 border-t border-slate-200 dark:border-slate-700">
                  <span>Total</span><span>{formatMoney(total, cur)}</span>
                </div>
              </div>

              {/* Payment */}
              <div>
                <p className="text-xs font-medium text-slate-500 mb-1.5">Payment method</p>
                <div className="grid grid-cols-3 gap-1.5">
                  {([['cash', Banknote], ['card', CreditCard], ['online', Smartphone]] as const).map(([m, Icon]) => (
                    <button
                      key={m}
                      onClick={() => setPaymentMethod(m)}
                      className={`flex flex-col items-center gap-1 py-2 rounded-lg border text-xs font-medium transition-colors ${paymentMethod === m ? 'border-sky-500 bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400' : 'border-slate-200 dark:border-slate-700 text-slate-500'}`}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="capitalize">{m}</span>
                    </button>
                  ))}
                </div>
              </div>

              {paymentMethod === 'cash' && (
                <div>
                  <p className="text-xs font-medium text-slate-500 mb-1.5">Amount paid</p>
                  <input
                    type="number"
                    value={amountPaid || ''}
                    onChange={(e) => setAmountPaid(Number(e.target.value))}
                    placeholder={total.toFixed(2)}
                    className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                  {amountPaid > 0 && changeDue > 0 && (
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">Change: {formatMoney(changeDue, cur)}</p>
                  )}
                </div>
              )}

              <button
                onClick={checkout}
                disabled={checkoutBusy}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold transition-colors disabled:opacity-60"
              >
                {checkoutBusy ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                Complete Sale · {formatMoney(total, cur)}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Customer picker modal */}
      <Modal open={showCustomerPicker} onClose={() => setShowCustomerPicker(false)} title="Select Customer" subtitle="Search by name or phone">
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              value={customerSearch}
              onChange={(e) => setCustomerSearch(e.target.value)}
              placeholder="Search customers..."
              autoFocus
              className="w-full pl-10 pr-3 py-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>
          <div className="max-h-80 overflow-y-auto space-y-1">
            {filteredCustomers.map((c) => (
              <button
                key={c.id}
                onClick={() => onSelectCustomer(c)}
                className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 text-left transition-colors"
              >
                <div className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-sm font-bold text-slate-600 dark:text-slate-300">
                  {c.name[0]?.toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-900 dark:text-white">{c.name}</p>
                  <p className="text-xs text-slate-500 flex items-center gap-1"><Phone className="w-3 h-3" />{c.phone}</p>
                </div>
              </button>
            ))}
            {filteredCustomers.length === 0 && (
              <p className="text-center text-sm text-slate-400 py-6">No customers found.</p>
            )}
          </div>
          <button
            onClick={() => { setShowCustomerPicker(false); setShowNewCustomer(true); }}
            className="w-full py-2.5 rounded-lg border border-sky-500 text-sky-600 dark:text-sky-400 text-sm font-medium hover:bg-sky-50 dark:hover:bg-sky-950/30"
          >
            + Add new customer
          </button>
        </div>
      </Modal>

      {/* New customer modal */}
      <Modal open={showNewCustomer} onClose={() => setShowNewCustomer(false)} title="Add Customer" subtitle="Quick add a walk-in customer">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Name</label>
            <input
              value={newCust.name}
              onChange={(e) => setNewCust((p) => ({ ...p, name: e.target.value }))}
              placeholder="Customer name"
              className="w-full px-3 py-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Phone</label>
            <input
              value={newCust.phone}
              onChange={(e) => setNewCust((p) => ({ ...p, phone: e.target.value }))}
              placeholder="Phone number"
              className="w-full px-3 py-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>
          <button
            onClick={createWalkInCustomer}
            className="w-full py-2.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-semibold"
          >
            Save customer
          </button>
        </div>
      </Modal>
    </div>
  );
}

function CheckoutSuccess({
  invoice,
  onNew,
  onViewInvoices,
  settings,
}: {
  invoice: Invoice;
  onNew: () => void;
  onViewInvoices: () => void;
  settings: any;
}) {
  const [format, setFormat] = useState<'a4' | 'thermal'>('a4');
  const cur = settings.currency_symbol;

  return (
    <div className="animate-fade-in">
      <div className="max-w-2xl mx-auto no-print">
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 text-center mb-6">
          <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/40 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-9 h-9 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">Sale Complete!</h2>
          <p className="text-sm text-slate-500 mt-1">Invoice {invoice.invoice_number} · {formatMoney(Number(invoice.total), cur)}</p>
          <div className="flex flex-wrap gap-3 justify-center mt-6">
            <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-semibold">
              <Printer className="w-4 h-4" /> Print invoice
            </button>
            <button onClick={onViewInvoices} className="px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-800">
              View all invoices
            </button>
            <button onClick={onNew} className="px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-800">
              New sale
            </button>
          </div>
          <div className="inline-flex gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg mt-4">
            <button onClick={() => setFormat('a4')} className={`px-3 py-1 text-xs rounded-md ${format === 'a4' ? 'bg-white dark:bg-slate-900 shadow-sm' : 'text-slate-500'}`}>A4</button>
            <button onClick={() => setFormat('thermal')} className={`px-3 py-1 text-xs rounded-md ${format === 'thermal' ? 'bg-white dark:bg-slate-900 shadow-sm' : 'text-slate-500'}`}>Thermal 80mm</button>
          </div>
        </div>
      </div>
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <PrintableInvoice invoice={invoice} settings={settings} format={format} />
      </div>
    </div>
  );
}
