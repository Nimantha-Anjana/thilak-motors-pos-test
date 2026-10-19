import { useEffect, useMemo, useState } from 'react';
import { Search, Receipt, Eye, Printer, X, Banknote, CreditCard, Smartphone, Calendar, TrendingUp } from 'lucide-react';
import { supabase, type Invoice } from '@/lib/supabase';
import { useSettings } from '@/context/SettingsContext';
import { formatMoney, formatDateTime } from '@/lib/utils';
import { showToast, ConfirmDialog } from '@/components/Toast';
import { PrintableInvoice } from '@/components/PrintableInvoice';

export function Invoices() {
  const { settings } = useSettings();
  const cur = settings.currency_symbol;
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [viewing, setViewing] = useState<Invoice | null>(null);
  const [printFormat, setPrintFormat] = useState<'a4' | 'thermal'>('a4');
  const [toDelete, setToDelete] = useState<Invoice | null>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('invoices')
      .select('*, customer:customers(*)')
      .order('created_at', { ascending: false });
    setInvoices((data ?? []) as Invoice[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(
    () => invoices.filter((i) =>
      i.invoice_number.toLowerCase().includes(search.toLowerCase()) ||
      (i.customer?.name ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (i.customer?.phone ?? '').includes(search)
    ),
    [invoices, search]
  );

  const totalRevenue = invoices.reduce((s, i) => s + Number(i.total), 0);
  const todayRevenue = invoices
    .filter((i) => {
      const d = new Date(i.created_at);
      const now = new Date();
      return d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    })
    .reduce((s, i) => s + Number(i.total), 0);

  const openInvoice = async (inv: Invoice) => {
    const { data: items } = await supabase
      .from('invoice_items')
      .select('*')
      .eq('invoice_id', inv.id)
      .order('created_at');
    const { data: vehicle } = await supabase
      .from('vehicles')
      .select('*')
      .eq('id', inv.vehicle_id ?? '')
      .maybeSingle();
    setViewing({ ...inv, invoice_items: (items ?? []) as any, vehicle: vehicle as any });
  };

  const remove = async () => {
    if (!toDelete) return;
    const { error } = await supabase.from('invoices').delete().eq('id', toDelete.id);
    if (error) { showToast(error.message, 'error'); return; }
    showToast('Invoice deleted', 'success');
    setToDelete(null);
    await load();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4">
          <div className="flex items-center gap-2 text-slate-400"><Receipt className="w-4 h-4" /><span className="text-xs font-medium">Total Invoices</span></div>
          <p className="text-xl font-extrabold text-slate-900 dark:text-white mt-1">{invoices.length}</p>
        </div>
        <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4">
          <div className="flex items-center gap-2 text-slate-400"><Calendar className="w-4 h-4" /><span className="text-xs font-medium">Today's Revenue</span></div>
          <p className="text-xl font-extrabold text-slate-900 dark:text-white mt-1">{formatMoney(todayRevenue, cur)}</p>
        </div>
        <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4">
          <div className="flex items-center gap-2 text-slate-400"><TrendingUp className="w-4 h-4" /><span className="text-xs font-medium">Total Revenue</span></div>
          <p className="text-xl font-extrabold text-slate-900 dark:text-white mt-1">{formatMoney(totalRevenue, cur)}</p>
        </div>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by invoice number, customer, phone..."
          className="w-full pl-10 pr-3 py-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-12 text-center">
          <Receipt className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
          <p className="text-slate-400">No invoices yet. Create your first sale from the New Sale page.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-left text-xs uppercase tracking-wider text-slate-500">
                <th className="p-4 font-semibold">Invoice</th>
                <th className="p-4 font-semibold hidden md:table-cell">Customer</th>
                <th className="p-4 font-semibold hidden lg:table-cell">Date</th>
                <th className="p-4 font-semibold">Payment</th>
                <th className="p-4 font-semibold text-right">Total</th>
                <th className="p-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((inv) => {
                const PayIcon = inv.payment_method === 'cash' ? Banknote : inv.payment_method === 'card' ? CreditCard : Smartphone;
                return (
                  <tr key={inv.id} className="border-b border-slate-100 dark:border-slate-800 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="p-4">
                      <p className="font-semibold text-slate-900 dark:text-white text-sm">{inv.invoice_number}</p>
                      <p className="text-xs text-slate-400 md:hidden">{inv.customer?.name ?? 'Walk-in'}</p>
                    </td>
                    <td className="p-4 hidden md:table-cell">
                      <p className="text-sm text-slate-700 dark:text-slate-300">{inv.customer?.name ?? 'Walk-in customer'}</p>
                      {inv.customer?.phone && <p className="text-xs text-slate-400">{inv.customer.phone}</p>}
                    </td>
                    <td className="p-4 hidden lg:table-cell text-sm text-slate-500">{formatDateTime(inv.created_at)}</td>
                    <td className="p-4">
                      <span className="inline-flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 capitalize">
                        <PayIcon className="w-3.5 h-3.5" /> {inv.payment_method}
                      </span>
                    </td>
                    <td className="p-4 text-right font-bold text-slate-900 dark:text-white">{formatMoney(Number(inv.total), cur)}</td>
                    <td className="p-4">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openInvoice(inv)} className="p-2 rounded-lg text-slate-400 hover:text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-950/30" title="View / Print">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button onClick={() => setToDelete(inv)} className="p-2 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30" title="Delete">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Invoice view modal */}
      {viewing && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm" onClick={() => setViewing(null)} />
          <div className="relative min-h-screen flex items-start justify-center p-4">
            <div className="w-full max-w-3xl my-4">
              <div className="flex items-center justify-between mb-3 no-print">
                <div className="flex gap-2">
                  <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-sm font-semibold">
                    <Printer className="w-4 h-4" /> Print
                  </button>
                  <div className="inline-flex gap-1 p-1 bg-white dark:bg-slate-800 rounded-lg">
                    <button onClick={() => setPrintFormat('a4')} className={`px-3 py-1 text-xs rounded-md ${printFormat === 'a4' ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900' : 'text-slate-500'}`}>A4</button>
                    <button onClick={() => setPrintFormat('thermal')} className={`px-3 py-1 text-xs rounded-md ${printFormat === 'thermal' ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900' : 'text-slate-500'}`}>Thermal</button>
                  </div>
                </div>
                <button onClick={() => setViewing(null)} className="p-2 rounded-lg bg-white dark:bg-slate-800 text-slate-500 hover:text-slate-900">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="bg-white rounded-xl shadow-2xl overflow-hidden">
                <PrintableInvoice invoice={viewing} settings={settings} format={printFormat} />
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!toDelete}
        title="Delete invoice?"
        message={<>Delete invoice <strong>{toDelete?.invoice_number}</strong>? This cannot be undone.</>}
        confirmLabel="Delete"
        danger
        onConfirm={remove}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}
