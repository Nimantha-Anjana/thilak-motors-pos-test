import { useEffect, useState } from 'react';
import { Plus, Edit3, Trash2, Wrench, Search } from 'lucide-react';
import { supabase, type Service } from '@/lib/supabase';
import { useSettings } from '@/context/SettingsContext';
import { formatMoney } from '@/lib/utils';
import { showToast, ConfirmDialog } from '@/components/Toast';
import { Modal } from '@/components/Modal';

export function Services() {
  const { settings } = useSettings();
  const cur = settings.currency_symbol;
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Service | null>(null);
  const [form, setForm] = useState({ name: '', description: '', default_price: 0, is_active: true });
  const [toDelete, setToDelete] = useState<Service | null>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('services').select('*').order('created_at', { ascending: false });
    setServices((data ?? []) as Service[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = services.filter((s) => s.name.toLowerCase().includes(search.toLowerCase()));

  const openForm = (s?: Service) => {
    if (s) {
      setEditing(s);
      setForm({ name: s.name, description: s.description ?? '', default_price: Number(s.default_price), is_active: s.is_active });
    } else {
      setEditing(null);
      setForm({ name: '', description: '', default_price: 0, is_active: true });
    }
    setShowForm(true);
  };

  const save = async () => {
    if (!form.name.trim()) { showToast('Service name is required', 'error'); return; }
    if (editing) {
      const { error } = await supabase.from('services').update({
        name: form.name.trim(),
        description: form.description.trim() || null,
        default_price: Number(form.default_price),
        is_active: form.is_active,
      }).eq('id', editing.id);
      if (error) { showToast(error.message, 'error'); return; }
      showToast('Service updated', 'success');
    } else {
      const { data, error } = await supabase.from('services').insert({
        name: form.name.trim(),
        description: form.description.trim() || null,
        default_price: Number(form.default_price),
        is_active: form.is_active,
      }).select('*').single();
      if (error) { showToast(error.message, 'error'); return; }
      setServices((p) => [data as Service, ...p]);
      showToast('Service added', 'success');
    }
    setShowForm(false);
    await load();
  };

  const remove = async () => {
    if (!toDelete) return;
    const { error } = await supabase.from('services').delete().eq('id', toDelete.id);
    if (error) { showToast(error.message, 'error'); return; }
    showToast('Service removed', 'success');
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
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search services..."
            className="w-full pl-10 pr-3 py-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>
        <button
          onClick={() => openForm()}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-semibold"
        >
          <Plus className="w-4 h-4" /> Add Service
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-12 text-center">
          <Wrench className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
          <p className="text-slate-400">No services yet. Add services like Full Service, Oil Change, etc.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((s) => (
            <div key={s.id} className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-sky-50 dark:bg-sky-950/40 flex items-center justify-center flex-shrink-0">
                    <Wrench className="w-5 h-5 text-sky-600 dark:text-sky-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900 dark:text-white truncate">{s.name}</p>
                    {!s.is_active && <span className="text-[10px] text-rose-500 font-medium">Inactive</span>}
                  </div>
                </div>
                <p className="text-lg font-extrabold text-sky-600 dark:text-sky-400 flex-shrink-0">{formatMoney(Number(s.default_price), cur)}</p>
              </div>
              {s.description && <p className="text-xs text-slate-500 dark:text-slate-400 mt-3 line-clamp-2">{s.description}</p>}
              <div className="flex gap-2 mt-4">
                <button onClick={() => openForm(s)} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm font-medium hover:bg-slate-200 dark:hover:bg-slate-700">
                  <Edit3 className="w-3.5 h-3.5" /> Edit
                </button>
                <button onClick={() => setToDelete(s)} className="p-2 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={showForm} onClose={() => setShowForm(false)} title={editing ? 'Edit Service' : 'Add Service'}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Service name *</label>
            <input
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="e.g. Full Service, Oil Change"
              className="w-full px-3 py-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Default price *</label>
            <input
              type="number"
              value={form.default_price || ''}
              onChange={(e) => setForm((p) => ({ ...p, default_price: Number(e.target.value) }))}
              placeholder="0.00"
              className="w-full px-3 py-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              rows={2}
              placeholder="What's included in this service?"
              className="w-full px-3 py-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => setForm((p) => ({ ...p, is_active: e.target.checked }))}
              className="w-4 h-4 rounded accent-sky-600"
            />
            <span className="text-sm text-slate-700 dark:text-slate-300">Active (available for billing)</span>
          </label>
          <button onClick={save} className="w-full py-2.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-semibold">
            {editing ? 'Update' : 'Add'} service
          </button>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!toDelete}
        title="Delete service?"
        message={<>Delete <strong>{toDelete?.name}</strong>? Past invoices keep the name, but it won't be available for new sales.</>}
        confirmLabel="Delete"
        danger
        onConfirm={remove}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}
