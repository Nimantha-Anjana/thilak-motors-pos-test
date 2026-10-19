import { useState } from 'react';
import { Save, Store, Phone, Mail, MapPin, Receipt, Loader2 } from 'lucide-react';
import { useSettings } from '@/context/SettingsContext';
import { showToast } from '@/components/Toast';

export function SettingsPage() {
  const { settings, update } = useSettings();
  const [form, setForm] = useState({
    business_name: settings.business_name,
    business_tagline: settings.business_tagline,
    address: settings.address ?? '',
    phone: settings.phone ?? '',
    email: settings.email ?? '',
    tax_rate: Number(settings.tax_rate),
    currency_symbol: settings.currency_symbol,
    footer_note: settings.footer_note,
  });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    const { error } = await update({
      business_name: form.business_name.trim() || 'Thilak Motors',
      business_tagline: form.business_tagline.trim(),
      address: form.address.trim() || null,
      phone: form.phone.trim() || null,
      email: form.email.trim() || null,
      tax_rate: Number(form.tax_rate),
      currency_symbol: form.currency_symbol.trim() || 'Rs. ',
      footer_note: form.footer_note.trim(),
    });
    setSaving(false);
    if (error) showToast(error, 'error');
    else showToast('Settings saved', 'success');
  };

  return (
    <div className="max-w-2xl space-y-6 animate-fade-in">
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6">
        <div className="flex items-center gap-2 mb-5">
          <Store className="w-5 h-5 text-sky-600 dark:text-sky-400" />
          <h3 className="font-bold text-slate-900 dark:text-white">Business Information</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Business name</label>
            <input value={form.business_name} onChange={(e) => setForm((p) => ({ ...p, business_name: e.target.value }))} className={inputCls} />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Tagline</label>
            <input value={form.business_tagline} onChange={(e) => setForm((p) => ({ ...p, business_tagline: e.target.value }))} className={inputCls} />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Address</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
              <textarea value={form.address} onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))} rows={2} className={`${inputCls} pl-9`} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Phone</label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} className={`${inputCls} pl-9`} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} className={`${inputCls} pl-9`} />
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6">
        <div className="flex items-center gap-2 mb-5">
          <Receipt className="w-5 h-5 text-sky-600 dark:text-sky-400" />
          <h3 className="font-bold text-slate-900 dark:text-white">Invoice Settings</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Tax rate (%)</label>
            <input type="number" step="0.01" value={form.tax_rate || ''} onChange={(e) => setForm((p) => ({ ...p, tax_rate: Number(e.target.value) }))} placeholder="0" className={inputCls} />
            <p className="text-xs text-slate-400 mt-1">Applied automatically to every sale.</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Currency symbol</label>
            <input value={form.currency_symbol} onChange={(e) => setForm((p) => ({ ...p, currency_symbol: e.target.value }))} placeholder="Rs. " className={inputCls} />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Invoice footer note</label>
            <input value={form.footer_note} onChange={(e) => setForm((p) => ({ ...p, footer_note: e.target.value }))} className={inputCls} />
          </div>
        </div>
      </div>

      <button
        onClick={save}
        disabled={saving}
        className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-semibold disabled:opacity-60"
      >
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        Save settings
      </button>
    </div>
  );
}

const inputCls = "w-full px-3 py-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500 text-sm";
