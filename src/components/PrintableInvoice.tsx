import { forwardRef } from 'react';
import { Bike, Phone, Mail, MapPin } from 'lucide-react';
import type { Invoice } from '@/lib/supabase';
import type { Settings } from '@/lib/utils';
import { formatMoney, formatDateTime } from '@/lib/utils';

type Props = {
  invoice: Invoice;
  settings: Settings;
  format?: 'a4' | 'thermal';
};

export const PrintableInvoice = forwardRef<HTMLDivElement, Props>(
  ({ invoice, settings, format = 'a4' }, ref) => {
    const cur = settings.currency_symbol;
    const isThermal = format === 'thermal';

    if (isThermal) {
      return (
        <div ref={ref} className="print-area bg-white text-black mx-auto p-4" style={{ width: '80mm', fontFamily: 'Inter, monospace' }}>
          <div className="text-center mb-3">
            {settings.business_name && <p className="text-base font-bold">{settings.business_name}</p>}
            <p className="text-[11px]">{settings.business_tagline}</p>
            {settings.address && <p className="text-[10px] mt-1">{settings.address}</p>}
            {settings.phone && <p className="text-[10px]">Tel: {settings.phone}</p>}
          </div>
          <div className="border-t border-b border-dashed border-black py-2 my-2 text-[11px]">
            <div className="flex justify-between"><span>Invoice</span><span>{invoice.invoice_number}</span></div>
            <div className="flex justify-between"><span>Date</span><span>{formatDateTime(invoice.created_at)}</span></div>
            {invoice.customer && (
              <>
                <div className="flex justify-between"><span>Customer</span><span>{invoice.customer.name}</span></div>
                <div className="flex justify-between"><span>Phone</span><span>{invoice.customer.phone}</span></div>
              </>
            )}
            {invoice.vehicle && (
              <div className="flex justify-between"><span>Vehicle</span><span>{invoice.vehicle.bike_model}</span></div>
            )}
            {invoice.vehicle && (
              <div className="flex justify-between"><span>Reg No</span><span>{invoice.vehicle.registration_number}</span></div>
            )}
          </div>
          <table className="w-full text-[11px] mb-2">
            <thead>
              <tr className="border-b border-dashed border-black">
                <th className="text-left py-1">Item</th>
                <th className="text-right">Qty</th>
                <th className="text-right">Price</th>
                <th className="text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {invoice.invoice_items?.map((it) => (
                <tr key={it.id}>
                  <td className="py-0.5">{it.name}</td>
                  <td className="text-right">{it.quantity}</td>
                  <td className="text-right">{Number(it.unit_price).toFixed(0)}</td>
                  <td className="text-right">{Number(it.line_total).toFixed(0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="border-t border-dashed border-black pt-2 text-[11px] space-y-1">
            <div className="flex justify-between"><span>Subtotal</span><span>{formatMoney(Number(invoice.subtotal), cur)}</span></div>
            {Number(invoice.discount_amount) > 0 && (
              <div className="flex justify-between"><span>Discount</span><span>-{formatMoney(Number(invoice.discount_amount), cur)}</span></div>
            )}
            {Number(invoice.tax_amount) > 0 && (
              <div className="flex justify-between"><span>Tax ({Number(invoice.tax_rate)}%)</span><span>{formatMoney(Number(invoice.tax_amount), cur)}</span></div>
            )}
            <div className="flex justify-between font-bold text-sm border-t border-black pt-1"><span>TOTAL</span><span>{formatMoney(Number(invoice.total), cur)}</span></div>
            <div className="flex justify-between"><span>Paid ({invoice.payment_method})</span><span>{formatMoney(Number(invoice.amount_paid), cur)}</span></div>
            {Number(invoice.change_due) > 0 && (
              <div className="flex justify-between"><span>Change</span><span>{formatMoney(Number(invoice.change_due), cur)}</span></div>
            )}
          </div>
          <p className="text-center text-[10px] mt-4">{settings.footer_note}</p>
        </div>
      );
    }

    // A4 format
    return (
      <div ref={ref} className="print-area bg-white text-slate-900 mx-auto p-8" style={{ maxWidth: '210mm', minHeight: '297mm' }}>
        <div className="flex items-start justify-between border-b-2 border-slate-900 pb-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-xl bg-slate-900 flex items-center justify-center">
              <Bike className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-slate-900">{settings.business_name}</h1>
              <p className="text-sm text-slate-500">{settings.business_tagline}</p>
            </div>
          </div>
          <div className="text-right text-sm">
            <p className="text-xs uppercase tracking-wider text-slate-400">Invoice</p>
            <p className="font-bold text-slate-900">{invoice.invoice_number}</p>
            <p className="text-slate-500 mt-1">{formatDateTime(invoice.created_at)}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6 mb-6 text-sm">
          <div>
            <p className="text-xs uppercase tracking-wider text-slate-400 font-semibold mb-2">Bill To</p>
            <p className="font-bold text-slate-900">{invoice.customer?.name ?? 'Walk-in Customer'}</p>
            {invoice.customer?.phone && <p className="text-slate-600">{invoice.customer.phone}</p>}
            {invoice.customer?.email && <p className="text-slate-600">{invoice.customer.email}</p>}
          </div>
          <div className="text-right">
            <div className="inline-flex flex-col items-end gap-0.5 text-slate-600">
              {settings.address && <p className="flex items-center gap-1 justify-end"><MapPin className="w-3 h-3" /> {settings.address}</p>}
              {settings.phone && <p className="flex items-center gap-1 justify-end"><Phone className="w-3 h-3" /> {settings.phone}</p>}
              {settings.email && <p className="flex items-center gap-1 justify-end"><Mail className="w-3 h-3" /> {settings.email}</p>}
            </div>
          </div>
        </div>

        {invoice.vehicle && (
          <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 mb-6 text-sm">
            <p className="text-xs uppercase tracking-wider text-slate-400 font-semibold mb-1">Vehicle Details</p>
            <p className="font-semibold text-slate-900">{invoice.vehicle.bike_model}</p>
            <p className="text-slate-600">Reg. No: {invoice.vehicle.registration_number}</p>
          </div>
        )}

        <table className="w-full mb-6">
          <thead>
            <tr className="border-b-2 border-slate-300 text-left text-xs uppercase tracking-wider text-slate-500">
              <th className="py-2">#</th>
              <th className="py-2">Item</th>
              <th className="py-2 text-center">Type</th>
              <th className="py-2 text-right">Qty</th>
              <th className="py-2 text-right">Unit Price</th>
              <th className="py-2 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {invoice.invoice_items?.map((it, i) => (
              <tr key={it.id} className="border-b border-slate-100 text-sm">
                <td className="py-2.5 text-slate-400">{i + 1}</td>
                <td className="py-2.5 font-medium text-slate-900">{it.name}</td>
                <td className="py-2.5 text-center text-xs">
                  <span className={`px-2 py-0.5 rounded-full ${it.item_type === 'service' ? 'bg-sky-100 text-sky-700' : 'bg-emerald-100 text-emerald-700'}`}>
                    {it.item_type === 'service' ? 'Service' : 'Part'}
                  </span>
                </td>
                <td className="py-2.5 text-right">{it.quantity}</td>
                <td className="py-2.5 text-right">{formatMoney(Number(it.unit_price), cur)}</td>
                <td className="py-2.5 text-right font-semibold">{formatMoney(Number(it.line_total), cur)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex justify-end">
          <div className="w-64 space-y-2 text-sm">
            <Row label="Subtotal" value={formatMoney(Number(invoice.subtotal), cur)} />
            {Number(invoice.discount_amount) > 0 && (
              <Row label={`Discount${invoice.discount_type === 'percentage' ? ` (${invoice.discount_value}%)` : ''}`} value={`-${formatMoney(Number(invoice.discount_amount), cur)}`} />
            )}
            {Number(invoice.tax_amount) > 0 && (
              <Row label={`Tax (${Number(invoice.tax_rate)}%)`} value={formatMoney(Number(invoice.tax_amount), cur)} />
            )}
            <div className="border-t-2 border-slate-900 pt-2 flex justify-between text-lg font-extrabold">
              <span>Total</span>
              <span>{formatMoney(Number(invoice.total), cur)}</span>
            </div>
            <Row label={`Paid (${invoice.payment_method})`} value={formatMoney(Number(invoice.amount_paid), cur)} />
            {Number(invoice.change_due) > 0 && <Row label="Change" value={formatMoney(Number(invoice.change_due), cur)} />}
          </div>
        </div>

        <div className="mt-12 pt-4 border-t border-slate-200 text-center">
          <p className="text-sm text-slate-500">{settings.footer_note}</p>
          <p className="text-xs text-slate-400 mt-1">This is a computer-generated invoice.</p>
        </div>
      </div>
    );
  }
);

PrintableInvoice.displayName = 'PrintableInvoice';

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-slate-600">
      <span>{label}</span>
      <span className="font-medium text-slate-900">{value}</span>
    </div>
  );
}
