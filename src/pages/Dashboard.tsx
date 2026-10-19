import { useEffect, useState } from 'react';
import {
  TrendingUp,
  Wrench,
  Package,
  Receipt,
  IndianRupee,
  ArrowUpRight,
  AlertTriangle,
  Clock,
} from 'lucide-react';
import { supabase, type Invoice, type SparePart } from '@/lib/supabase';
import { useSettings } from '@/context/SettingsContext';
import { formatMoney, formatDateTime, isToday } from '@/lib/utils';
import type { Page } from '@/components/AppLayout';

export function Dashboard({ onPageChange }: { onPageChange: (p: Page) => void }) {
  const { settings } = useSettings();
  const [loading, setLoading] = useState(true);
  const [todaySales, setTodaySales] = useState(0);
  const [todayCount, setTodayCount] = useState(0);
  const [totalSales, setTotalSales] = useState(0);
  const [totalInvoices, setTotalInvoices] = useState(0);
  const [recent, setRecent] = useState<Invoice[]>([]);
  const [topParts, setTopParts] = useState<{ name: string; qty: number; revenue: number }[]>([]);
  const [lowStock, setLowStock] = useState<SparePart[]>([]);
  const [repairsToday, setRepairsToday] = useState(0);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: invoices } = await supabase
        .from('invoices')
        .select('*, customer:customers(*)')
        .order('created_at', { ascending: false })
        .limit(50);

      const allInvoices = (invoices ?? []) as unknown as Invoice[];

      const todays = allInvoices.filter((i) => isToday(i.created_at));
      setTodaySales(todays.reduce((s, i) => s + Number(i.total), 0));
      setTodayCount(todays.length);
      setTotalSales(allInvoices.reduce((s, i) => s + Number(i.total), 0));
      setTotalInvoices(allInvoices.length);
      setRecent(allInvoices.slice(0, 6));
      setRepairsToday(todays.length);

      // Top parts from invoice_items
      const { data: items } = await supabase
        .from('invoice_items')
        .select('name, quantity, line_total, item_type, invoice:invoices!inner(created_at)')
        .eq('item_type', 'part')
        .order('created_at', { ascending: false })
        .limit(200);

      const partMap = new Map<string, { qty: number; revenue: number }>();
      (items ?? []).forEach((it: any) => {
        const key = it.name;
        const cur = partMap.get(key) ?? { qty: 0, revenue: 0 };
        cur.qty += Number(it.quantity);
        cur.revenue += Number(it.line_total);
        partMap.set(key, cur);
      });
      setTopParts(
        Array.from(partMap.entries())
          .map(([name, v]) => ({ name, ...v }))
          .sort((a, b) => b.qty - a.qty)
          .slice(0, 5)
      );

      // Low stock
      const { data: parts } = await supabase.from('spare_parts').select('*');
      setLowStock((parts ?? []).filter((p) => Number(p.quantity) <= Number(p.low_stock_threshold)) as SparePart[]);

      setLoading(false);
    })();
  }, []);

  const cur = settings.currency_symbol;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Today's Sales"
          value={formatMoney(todaySales, cur)}
          sub={`${todayCount} invoice${todayCount === 1 ? '' : 's'} today`}
          icon={<IndianRupee className="w-5 h-5" />}
          accent="from-emerald-500 to-emerald-600"
        />
        <StatCard
          label="Repairs Today"
          value={String(repairsToday)}
          sub="Completed services"
          icon={<Wrench className="w-5 h-5" />}
          accent="from-sky-500 to-sky-600"
        />
        <StatCard
          label="Total Sales"
          value={formatMoney(totalSales, cur)}
          sub={`${totalInvoices} lifetime invoices`}
          icon={<TrendingUp className="w-5 h-5" />}
          accent="from-violet-500 to-violet-600"
        />
        <StatCard
          label="Low Stock Alerts"
          value={String(lowStock.length)}
          sub="Parts need restocking"
          icon={<AlertTriangle className="w-5 h-5" />}
          accent="from-amber-500 to-amber-600"
          onClick={() => onPageChange('inventory')}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent transactions */}
        <div className="lg:col-span-2 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-900 dark:text-white">Recent Transactions</h3>
            <button
              onClick={() => onPageChange('invoices')}
              className="text-sm font-medium text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1"
            >
              View all <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
          {recent.length === 0 ? (
            <EmptyState
              icon={<Receipt className="w-8 h-8" />}
              text="No invoices yet. Start your first sale!"
              actionLabel="New Sale"
              onAction={() => onPageChange('pos')}
            />
          ) : (
            <div className="space-y-2">
              {recent.map((inv) => (
                <div
                  key={inv.id}
                  className="flex items-center justify-between gap-3 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-sky-50 dark:bg-sky-950/40 flex items-center justify-center flex-shrink-0">
                      <Receipt className="w-5 h-5 text-sky-600 dark:text-sky-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                        {inv.customer?.name ?? 'Walk-in customer'}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDateTime(inv.created_at)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold text-slate-900 dark:text-white">{formatMoney(Number(inv.total), cur)}</p>
                    <p className="text-[10px] uppercase tracking-wide text-slate-400">{inv.payment_method}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top parts + low stock */}
        <div className="space-y-6">
          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5">
            <h3 className="font-bold text-slate-900 dark:text-white mb-4">Top Spare Parts</h3>
            {topParts.length === 0 ? (
              <p className="text-sm text-slate-400 py-6 text-center">No parts sold yet.</p>
            ) : (
              <div className="space-y-3">
                {topParts.map((p, i) => (
                  <div key={p.name} className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-500">
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{p.name}</p>
                      <p className="text-xs text-slate-400">{p.qty} sold</p>
                    </div>
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">{formatMoney(p.revenue, cur)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {lowStock.length > 0 && (
            <div className="rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 p-5">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                <h3 className="font-bold text-amber-900 dark:text-amber-300">Low Stock</h3>
              </div>
              <div className="space-y-2">
                {lowStock.slice(0, 5).map((p) => (
                  <div key={p.id} className="flex items-center justify-between text-sm">
                    <span className="text-amber-900 dark:text-amber-300 truncate">{p.name}</span>
                    <span className="font-semibold text-amber-700 dark:text-amber-400 flex-shrink-0">{p.quantity} left</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  icon,
  accent,
  onClick,
}: {
  label: string;
  value: string;
  sub: string;
  icon: React.ReactNode;
  accent: string;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      className={`text-left rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 transition-all ${onClick ? 'hover:shadow-md hover:-translate-y-0.5 cursor-pointer' : ''}`}
    >
      <div className="flex items-start justify-between">
        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${accent} flex items-center justify-center text-white shadow-sm`}>
          {icon}
        </div>
      </div>
      <p className="mt-4 text-2xl font-extrabold text-slate-900 dark:text-white">{value}</p>
      <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mt-0.5">{label}</p>
      <p className="text-xs text-slate-400 mt-1">{sub}</p>
    </button>
  );
}

function EmptyState({
  icon,
  text,
  actionLabel,
  onAction,
}: {
  icon: React.ReactNode;
  text: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mb-3">
        {icon}
      </div>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">{text}</p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-sm font-semibold transition-colors"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
