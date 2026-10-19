import { useEffect, useMemo, useState } from 'react';
import {
  Search,
  Plus,
  Phone,
  Mail,
  Bike,
  Trash2,
  Edit3,
  ChevronRight,
  Receipt,
  Calendar,
  X,
} from 'lucide-react';
import { supabase, type Customer, type Vehicle, type Invoice } from '@/lib/supabase';
import { useSettings } from '@/context/SettingsContext';
import { formatMoney, formatDateTime, formatDate } from '@/lib/utils';
import { showToast, ConfirmDialog } from '@/components/Toast';
import { Modal } from '@/components/Modal';

export function Customers() {
  const { settings } = useSettings();
  const cur = settings.currency_symbol;
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', email: '', notes: '' });
  const [selected, setSelected] = useState<Customer | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [toDelete, setToDelete] = useState<Customer | null>(null);
  const [showVehicleForm, setShowVehicleForm] = useState(false);
  const [vehicleForm, setVehicleForm] = useState({ bike_model: '', registration_number: '', notes: '' });

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('customers').select('*').order('created_at', { ascending: false });
    setCustomers((data ?? []) as Customer[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(
    () => customers.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()) || c.phone.includes(search)),
    [customers, search]
  );

  const openForm = (c?: Customer) => {
    if (c) {
      setEditing(c);
      setForm({ name: c.name, phone: c.phone, email: c.email ?? '', notes: c.notes ?? '' });
    } else {
      setEditing(null);
      setForm({ name: '', phone: '', email: '', notes: '' });
    }
    setShowForm(true);
  };

  const save = async () => {
    if (!form.name.trim() || !form.phone.trim()) {
      showToast('Name and phone are required', 'error');
      return;
    }
    if (editing) {
      const { error } = await supabase.from('customers').update({
        name: form.name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim() || null,
        notes: form.notes.trim() || null,
      }).eq('id', editing.id);
      if (error) { showToast(error.message, 'error'); return; }
      showToast('Customer updated', 'success');
    } else {
      const { data, error } = await supabase.from('customers').insert({
        name: form.name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim() || null,
        notes: form.notes.trim() || null,
      }).select('*').single();
      if (error) { showToast(error.message, 'error'); return; }
      setCustomers((p) => [data as Customer, ...p]);
      showToast('Customer added', 'success');
    }
    setShowForm(false);
    await load();
  };

  const remove = async () => {
    if (!toDelete) return;
    const { error } = await supabase.from('customers').delete().eq('id', toDelete.id);
    if (error) { showToast(error.message, 'error'); return; }
    showToast('Customer removed', 'success');
    setToDelete(null);
    if (selected?.id === toDelete.id) setSelected(null);
    await load();
  };

  const openDetail = async (c: Customer) => {
    setSelected(c);
    setDetailLoading(true);
    const [v, i] = await Promise.all([
      supabase.from('vehicles').select('*').eq('customer_id', c.id).order('created_at', { ascending: false }),
      supabase.from('invoices').select('*, invoice_items(*)').eq('customer_id', c.id).order('created_at', { ascending: false }),
    ]);
    setVehicles((v.data ?? []) as Vehicle[]);
    setInvoices((i.data ?? []) as Invoice[]);
    setDetailLoading(false);
  };

  const addVehicle = async () => {
    if (!selected) return;
    if (!vehicleForm.bike_model.trim() || !vehicleForm.registration_number.trim()) {
      showToast('Bike model and registration required', 'error');
      return;
    }
    const { data, error } = await supabase.from('vehicles').insert({
      customer_id: selected.id,
      bike_model: vehicleForm.bike_model.trim(),
      registration_number: vehicleForm.registration_number.trim(),
      notes: vehicleForm.notes.trim() || null,
    }).select('*').single();
    if (error) { showToast(error.message, 'error'); return; }
    setVehicles((p) => [data as Vehicle, ...p]);
    setVehicleForm({ bike_model: '', registration_number: '', notes: '' });
    setShowVehicleForm(false);
    showToast('Vehicle added', 'success');
  };

  const removeVehicle = async (v: Vehicle) => {
    const { error } = await supabase.from('vehicles').delete().eq('id', v.id);
    if (error) { showToast(error.message, 'error'); return; }
    setVehicles((p) => p.filter((x) => x.id !== v.id));
    showToast('Vehicle removed', 'success');
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
            placeholder="Search by name or phone..."
            className="w-full pl-10 pr-3 py-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>
        <button
          onClick={() => openForm()}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-semibold transition-colors"
        >
          <Plus className="w-4 h-4" /> Add Customer
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-12 text-center">
          <p className="text-slate-400">No customers yet. Add your first customer to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((c) => {
            const totalSpent = invoices.filter((i) => i.customer_id === c.id).reduce((s, i) => s + Number(i.total), 0);
            return (
              <div key={c.id} className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start gap-3">
                  <div className="w-11 h-11 rounded-full bg-gradient-to-br from-sky-400 to-sky-600 flex items-center justify-center text-white font-bold flex-shrink-0">
                    {c.name[0]?.toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-slate-900 dark:text-white truncate">{c.name}</p>
                    <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5"><Phone className="w-3 h-3" />{c.phone}</p>
                    {c.email && <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5"><Mail className="w-3 h-3" />{c.email}</p>}
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() => openDetail(c)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm font-medium hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                  >
                    View history <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => openForm(c)} className="p-2 rounded-lg text-slate-400 hover:text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-950/30">
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button onClick={() => setToDelete(c)} className="p-2 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add/Edit modal */}
      <Modal open={showForm} onClose={() => setShowForm(false)} title={editing ? 'Edit Customer' : 'Add Customer'}>
        <div className="space-y-4">
          <Field label="Name *">
            <input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} className={inputCls} />
          </Field>
          <Field label="Phone *">
            <input value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} className={inputCls} />
          </Field>
          <Field label="Email">
            <input value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} className={inputCls} />
          </Field>
          <Field label="Notes">
            <textarea value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} rows={2} className={inputCls} />
          </Field>
          <button onClick={save} className="w-full py-2.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-semibold">
            {editing ? 'Update' : 'Add'} customer
          </button>
        </div>
      </Modal>

      {/* Detail drawer */}
      {selected && (
        <div className="fixed inset-0 z-50 no-print">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setSelected(null)} />
          <div className="absolute right-0 top-0 bottom-0 w-full max-w-md bg-white dark:bg-slate-900 shadow-2xl overflow-y-auto animate-slide-in-right">
            <div className="sticky top-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-4 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white">{selected.name}</h3>
                <p className="text-xs text-slate-500">{selected.phone}</p>
              </div>
              <button onClick={() => setSelected(null)} className="p-2 text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-6">
              {detailLoading ? (
                <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" /></div>
              ) : (
                <>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2"><Bike className="w-4 h-4" /> Vehicles</h4>
                      <button onClick={() => setShowVehicleForm(true)} className="text-xs text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1">
                        <Plus className="w-3 h-3" /> Add
                      </button>
                    </div>
                    {showVehicleForm && (
                      <div className="mb-3 p-3 rounded-lg border border-slate-200 dark:border-slate-800 space-y-2">
                        <input value={vehicleForm.bike_model} onChange={(e) => setVehicleForm((p) => ({ ...p, bike_model: e.target.value }))} placeholder="Bike model" className={inputCls} />
                        <input value={vehicleForm.registration_number} onChange={(e) => setVehicleForm((p) => ({ ...p, registration_number: e.target.value }))} placeholder="Registration number" className={inputCls} />
                        <div className="flex gap-2">
                          <button onClick={addVehicle} className="text-xs px-3 py-1.5 rounded-md bg-sky-600 text-white font-medium">Save</button>
                          <button onClick={() => setShowVehicleForm(false)} className="text-xs px-3 py-1.5 rounded-md text-slate-500">Cancel</button>
                        </div>
                      </div>
                    )}
                    {vehicles.length === 0 ? (
                      <p className="text-xs text-slate-400 py-3 text-center">No vehicles recorded.</p>
                    ) : (
                      <div className="space-y-2">
                        {vehicles.map((v) => (
                          <div key={v.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800">
                            <div>
                              <p className="text-sm font-medium text-slate-900 dark:text-white">{v.bike_model}</p>
                              <p className="text-xs text-slate-500">Reg: {v.registration_number}</p>
                              <p className="text-[10px] text-slate-400 mt-0.5">Added {formatDate(v.created_at)}</p>
                            </div>
                            <button onClick={() => removeVehicle(v)} className="text-slate-300 hover:text-rose-500">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-2"><Receipt className="w-4 h-4" /> Invoice History</h4>
                    {invoices.length === 0 ? (
                      <p className="text-xs text-slate-400 py-3 text-center">No invoices yet.</p>
                    ) : (
                      <div className="space-y-2">
                        {invoices.map((inv) => (
                          <div key={inv.id} className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-semibold text-slate-900 dark:text-white">{inv.invoice_number}</p>
                              <p className="text-sm font-bold text-slate-900 dark:text-white">{formatMoney(Number(inv.total), cur)}</p>
                            </div>
                            <p className="text-xs text-slate-400 flex items-center gap-1 mt-1"><Calendar className="w-3 h-3" />{formatDateTime(inv.created_at)}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!toDelete}
        title="Delete customer?"
        message={<>This will remove <strong>{toDelete?.name}</strong> and their vehicles. Invoices will remain but be unlinked from this customer.</>}
        confirmLabel="Delete"
        danger
        onConfirm={remove}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}

const inputCls = "w-full px-3 py-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500 text-sm";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{label}</label>
      {children}
    </div>
  );
}
