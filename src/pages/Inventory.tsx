import { useEffect, useMemo, useState } from 'react';
import { Plus, Edit3, Trash2, Package, Search, AlertTriangle, TrendingUp, DollarSign } from 'lucide-react';
import { supabase, type SparePart } from '@/lib/supabase';
import { useSettings } from '@/context/SettingsContext';
import { formatMoney } from '@/lib/utils';
import { showToast, ConfirmDialog } from '@/components/Toast';
import { Modal } from '@/components/Modal';

export function Inventory() {
  const { settings } = useSettings();
  const cur = settings.currency_symbol;
  const [parts, setParts] = useState<SparePart[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'low' | 'out'>('all');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<SparePart | null>(null);
  const [form, setForm] = useState({
    name: '', sku: '', category: '', quantity: 0, cost_price: 0, selling_price: 0, low_stock_threshold: 5,
  });
  const [toDelete, setToDelete] = useState<SparePart | null>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('spare_parts').select('*').order('created_at', { ascending: false });
    setParts((data ?? []) as SparePart[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    let list = parts.filter((p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.sku ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (p.category ?? '').toLowerCase().includes(search.toLowerCase())
    );
    if (filter === 'low') list = list.filter((p) => p.quantity > 0 && p.quantity <= p.low_stock_threshold);
    if (filter === 'out') list = list.filter((p) => p.quantity <= 0);
    return list;
  }, [parts, search, filter]);

  const lowCount = parts.filter((p) => p.quantity > 0 && p.quantity <= p.low_stock_threshold).length;
  const outCount = parts.filter((p) => p.quantity <= 0).length;
  const totalValue = parts.reduce((s, p) => s + Number(p.cost_price) * p.quantity, 0);
  const potentialRevenue = parts.reduce((s, p) => s + Number(p.selling_price) * p.quantity, 0);

  const openForm = (p?: SparePart) => {
    if (p) {
      setEditing(p);
      setForm({
        name: p.name, sku: p.sku ?? '', category: p.category ?? '',
        quantity: p.quantity, cost_price: Number(p.cost_price),
        selling_price: Number(p.selling_price), low_stock_threshold: p.low_stock_threshold,
      });
    } else {
      setEditing(null);
      setForm({ name: '', sku: '', category: '', quantity: 0, cost_price: 0, selling_price: 0, low_stock_threshold: 5 });
    }
    setShowForm(true);
  };

  const save = async () => {
    if (!form.name.trim()) { showToast('Part name is required', 'error'); return; }
    const payload = {
      name: form.name.trim(),
      sku: form.sku.trim() || null,
      category: form.category.trim() || null,
      quantity: Number(form.quantity),
      cost_price: Number(form.cost_price),
      selling_price: Number(form.selling_price),
      low_stock_threshold: Number(form.low_stock_threshold),
    };
    if (editing) {
      const { error } = await supabase.from('spare_parts').update(payload).eq('id', editing.id);
      if (error) { showToast(error.message, 'error'); return; }
      showToast('Part updated', 'success');
    } else {
      const { data, error } = await supabase.from('spare_parts').insert(payload).select('*').single();
      if (error) { showToast(error.message, 'error'); return; }
      setParts((p) => [data as SparePart, ...p]);
      showToast('Part added', 'success');
    }
    setShowForm(false);
    await load();
  };

  const remove = async () => {
    if (!toDelete) return;
    const { error } = await supabase.from('spare_parts').delete().eq('id', toDelete.id);
    if (error) { showToast(error.message, 'error'); return; }
    showToast('Part removed', 'success');
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
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MiniStat label="Total Parts" value={String(parts.length)} icon={<Package className="w-4 h-4" />} />
        <MiniStat label="Inventory Value" value={formatMoney(totalValue, cur)} icon={<DollarSign className="w-4 h-4" />} />
        <MiniStat label="Low Stock" value={String(lowCount)} icon={<AlertTriangle className="w-4 h-4" />} danger={lowCount > 0} />
        <MiniStat label="Out of Stock" value={String(outCount)} icon={<AlertTriangle className="w-4 h-4" />} danger={outCount > 0} />
      </div>

      <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search parts, SKU, category..."
            className="w-full pl-10 pr-3 py-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>
        <div className="flex gap-2">
          <div className="flex gap-1 p-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg">
            {(['all', 'low', 'out'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md capitalize transition-colors ${filter === f ? 'bg-sky-600 text-white' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
              >
                {f === 'all' ? 'All' : f === 'low' ? 'Low' : 'Out'}
              </button>
            ))}
          </div>
          <button
            onClick={() => openForm()}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-semibold"
          >
            <Plus className="w-4 h-4" /> Add Part
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-12 text-center">
          <Package className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
          <p className="text-slate-400">No spare parts found. Add engine oil, brake pads, tires, etc.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-left text-xs uppercase tracking-wider text-slate-500">
                <th className="p-4 font-semibold">Part</th>
                <th className="p-4 font-semibold hidden md:table-cell">Category</th>
                <th className="p-4 font-semibold text-right">Cost</th>
                <th className="p-4 font-semibold text-right">Sell</th>
                <th className="p-4 font-semibold text-center">Stock</th>
                <th className="p-4 font-semibold text-right hidden lg:table-cell">Value</th>
                <th className="p-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => {
                const out = p.quantity <= 0;
                const low = p.quantity > 0 && p.quantity <= p.low_stock_threshold;
                return (
                  <tr key={p.id} className="border-b border-slate-100 dark:border-slate-800 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="p-4">
                      <p className="font-medium text-slate-900 dark:text-white text-sm">{p.name}</p>
                      {p.sku && <p className="text-xs text-slate-400">{p.sku}</p>}
                    </td>
                    <td className="p-4 hidden md:table-cell">
                      {p.category && <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">{p.category}</span>}
                    </td>
                    <td className="p-4 text-right text-sm text-slate-500">{formatMoney(Number(p.cost_price), cur)}</td>
                    <td className="p-4 text-right text-sm font-semibold text-slate-900 dark:text-white">{formatMoney(Number(p.selling_price), cur)}</td>
                    <td className="p-4 text-center">
                      <span className={`inline-flex items-center justify-center min-w-[3rem] px-2.5 py-1 rounded-full text-xs font-bold ${
                        out ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400'
                        : low ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
                        : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                      }`}>
                        {p.quantity}
                      </span>
                    </td>
                    <td className="p-4 text-right text-sm text-slate-500 hidden lg:table-cell">{formatMoney(Number(p.cost_price) * p.quantity, cur)}</td>
                    <td className="p-4">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openForm(p)} className="p-2 rounded-lg text-slate-400 hover:text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-950/30">
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button onClick={() => setToDelete(p)} className="p-2 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30">
                          <Trash2 className="w-4 h-4" />
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

      <Modal open={showForm} onClose={() => setShowForm(false)} title={editing ? 'Edit Spare Part' : 'Add Spare Part'} size="lg">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Part name *</label>
            <input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="e.g. Engine Oil 1L" className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">SKU</label>
            <input value={form.sku} onChange={(e) => setForm((p) => ({ ...p, sku: e.target.value }))} placeholder="EO-001" className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Category</label>
            <input value={form.category} onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))} placeholder="Oil, Brake, Tire..." className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Quantity</label>
            <input type="number" value={form.quantity || ''} onChange={(e) => setForm((p) => ({ ...p, quantity: Number(e.target.value) }))} placeholder="0" className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Low stock alert at</label>
            <input type="number" value={form.low_stock_threshold || ''} onChange={(e) => setForm((p) => ({ ...p, low_stock_threshold: Number(e.target.value) }))} placeholder="5" className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Cost price</label>
            <input type="number" value={form.cost_price || ''} onChange={(e) => setForm((p) => ({ ...p, cost_price: Number(e.target.value) }))} placeholder="0.00" className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Selling price</label>
            <input type="number" value={form.selling_price || ''} onChange={(e) => setForm((p) => ({ ...p, selling_price: Number(e.target.value) }))} placeholder="0.00" className={inputCls} />
          </div>
          {form.cost_price > 0 && form.selling_price > 0 && (
            <div className="sm:col-span-2 text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5" />
              Profit margin: {formatMoney(Number(form.selling_price) - Number(form.cost_price), cur)} per unit ({((Number(form.selling_price) - Number(form.cost_price)) / Number(form.cost_price) * 100).toFixed(1)}%)
            </div>
          )}
          <div className="sm:col-span-2">
            <button onClick={save} className="w-full py-2.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-semibold">
              {editing ? 'Update' : 'Add'} part
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!toDelete}
        title="Delete part?"
        message={<>Delete <strong>{toDelete?.name}</strong>? Past invoices keep the name, but it won't be available for new sales.</>}
        confirmLabel="Delete"
        danger
        onConfirm={remove}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}

const inputCls = "w-full px-3 py-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500 text-sm";

function MiniStat({ label, value, icon, danger }: { label: string; value: string; icon: React.ReactNode; danger?: boolean }) {
  return (
    <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4">
      <div className="flex items-center gap-2 text-slate-400">
        <span className={danger ? 'text-rose-500' : ''}>{icon}</span>
        <span className="text-xs font-medium">{label}</span>
      </div>
      <p className={`text-lg font-extrabold mt-1 ${danger ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-white'}`}>{value}</p>
    </div>
  );
}
