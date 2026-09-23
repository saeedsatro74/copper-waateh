import React, { useState } from 'react';
import {
  FileText,
  Search,
  PlusCircle,
  Eye,
  Undo2,
  CheckCircle2,
  Ban,
  AlertCircle,
} from 'lucide-react';
import { useInventory } from '../context/InventoryContext';
import { PaymentAllocationModal } from './PaymentAllocationModal';
import { PaymentAllocation, Invoice } from '../types';
import { formatKg, formatToman, formatPersianNumber, getTimeStringFromId } from '../utils/persian';

interface InvoicesViewProps {
  onViewInvoice: (invoice: Invoice) => void;
  onOpenInvoiceModal: () => void;
}

export const InvoicesView: React.FC<InvoicesViewProps> = ({
  onViewInvoice,
  onOpenInvoiceModal,
}) => {
  const { state, selectedItems, cancelInvoiceAndReturnToStock, confirmOfficialExitInvoice } =
    useInventory();
  const [searchQuery, setSearchQuery] = useState('');
  const [invoiceToAllocate, setInvoiceToAllocate] = useState<Invoice | null>(null);

  const handleConfirmAllocation = (allocation: PaymentAllocation) => {
    if (invoiceToAllocate) {
      confirmOfficialExitInvoice(invoiceToAllocate.id, allocation);
      setInvoiceToAllocate(null);
    }
  };

  const invoices = state.invoices;

  const sortedInvoices = [...invoices].sort((a, b) => {
    const matchA = a.id.match(/\d+/);
    const matchB = b.id.match(/\d+/);
    const timeA = matchA ? parseInt(matchA[0], 10) : 0;
    const timeB = matchB ? parseInt(matchB[0], 10) : 0;
    return timeB - timeA;
  });

  return (
    <div className="space-y-3 pb-16 text-right">
      {/* Tiny Action Header */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold shrink-0">
            <FileText className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-xs font-black text-slate-800">
              پیش‌فاکتورها و خروج کالا
            </h2>
          </div>
        </div>
      </div>

      {/* Dense Table/Card-list of Invoices */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {sortedInvoices.length === 0 ? (
          <div className="py-12 text-center text-slate-400 font-bold text-xs">
            هیچ پیش‌فاکتوری در سیستم ثبت نشده است.
          </div>
        ) : (
          <div className="overflow-x-auto">
            {/* Desktop Table View */}
            <table className="w-full text-right border-collapse text-xs hidden md:table table-fixed min-w-[900px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold">
                  <th className="py-2.5 px-4 w-12 text-center">ردیف</th>
                  <th className="py-2.5 px-4 w-32">شماره سند</th>
                  <th className="py-2.5 px-4 w-36">تاریخ و ساعت</th>
                  <th className="py-2.5 px-4 w-40">خریدار / مشتری</th>
                  <th className="py-2.5 px-4">شرح اقلام فاکتور</th>
                  <th className="py-2.5 px-4 w-28 text-left">وزن کل</th>
                  <th className="py-2.5 px-4 w-32 text-left">مبلغ کل</th>
                  <th className="py-2.5 px-4 w-28">وضعیت</th>
                  <th className="py-2.5 px-4 w-52 text-center">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {sortedInvoices.map((inv, idx) => {
                  const isOfficial = inv.status === 'official';
                  const isCancelled = inv.status === 'cancelled';

                  return (
                    <tr key={inv.id} className="hover:bg-slate-50/60 transition-colors">
                      {/* Index */}
                      <td className="py-2.5 px-4 text-center font-bold text-slate-400">
                        {formatPersianNumber(sortedInvoices.length - idx)}
                      </td>

                      {/* Doc No. */}
                      <td className="py-2.5 px-4 font-black text-slate-900">
                        {inv.officialInvoiceNumber || inv.invoiceNumber}
                      </td>

                      {/* Date & Time */}
                      <td className="py-2.5 px-4 font-medium text-slate-500 whitespace-nowrap">
                        {inv.officialDate || inv.date}
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                          ساعت: {getTimeStringFromId(inv.id)}
                        </span>
                      </td>

                      {/* Customer Info */}
                      <td className="py-2.5 px-4 font-bold text-slate-800">
                        <div className="truncate max-w-[150px]">{inv.customerName}</div>
                        {inv.customerPhone && (
                          <span className="text-[10px] text-slate-400 block font-normal">{inv.customerPhone}</span>
                        )}
                      </td>

                      {/* Goods descriptions */}
                      <td className="py-2.5 px-4 text-[11px] text-slate-500 font-medium">
                        <div className="truncate max-w-[180px]" title={inv.items.map((i) => i.description).join('، ')}>
                          {inv.items.map((i) => i.description).join('، ')}
                        </div>
                      </td>

                      {/* Weight */}
                      <td className="py-2.5 px-4 text-left font-black text-amber-950">
                        {formatKg(inv.totalWeightKg)}
                      </td>

                      {/* Total Price & Debt Info */}
                      <td className="py-2.5 px-4 text-left font-bold text-slate-900">
                        <span>{formatToman(inv.totalAmount)}</span>
                        {isOfficial && (
                          <div className="text-[10px] font-medium mt-0.5 space-y-0.5 text-right">
                            <span className="text-emerald-700 block">پرداخت: {formatToman(inv.paidAmount ?? inv.totalAmount)}</span>
                            {(inv.remainingAmount ?? 0) > 0 ? (
                              <span className="text-rose-600 block">بدهی: {formatToman(inv.remainingAmount ?? 0)}</span>
                            ) : (
                              <span className="text-emerald-600 block">تسویه کامل</span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Status badge */}
                      <td className="py-2.5 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-bold text-[10px] ${
                            isOfficial
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                              : isCancelled
                              ? 'bg-rose-50 text-rose-700 border border-rose-100'
                              : 'bg-amber-50 text-amber-700 border border-amber-100'
                          }`}
                        >
                          {isOfficial ? (
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          ) : isCancelled ? (
                            <Ban className="w-3 h-3 text-rose-600" />
                          ) : (
                            <AlertCircle className="w-3 h-3 text-amber-600" />
                          )}
                          <span>{isOfficial ? 'رسمی' : isCancelled ? 'لغو شده' : 'پیش‌فاکتور'}</span>
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-2.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {!isOfficial && !isCancelled && (
                            <>
                              <button
                                onClick={() => {
                                  if (window.confirm(`آیا از برگشت پیش‌فاکتور ${inv.invoiceNumber} به انبار اطمینان دارید؟`)) {
                                    cancelInvoiceAndReturnToStock(inv.id);
                                  }
                                }}
                                className="p-1.5 rounded-lg hover:bg-rose-50 text-rose-700 border border-transparent hover:border-rose-100 transition-colors cursor-pointer"
                                title="لغو و برگشت اقلام به انبار"
                              >
                                <Undo2 className="w-3.5 h-3.5" />
                              </button>

                              <button
                                onClick={() => setInvoiceToAllocate(inv)}
                                className="px-2 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[10px] transition-all cursor-pointer"
                                title="تایید پرداخت و فاکتور رسمی"
                              >
                                ثبت رسمی
                              </button>
                            </>
                          )}

                          <button
                            onClick={() => onViewInvoice(inv)}
                            className="p-1.5 rounded-lg hover:bg-amber-50 text-amber-900 border border-transparent hover:border-amber-100 transition-colors cursor-pointer flex items-center gap-1 font-bold text-[10px]"
                          >
                            <Eye className="w-3.5 h-3.5 text-amber-700" />
                            <span>چاپ</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Mobile View Card List */}
            <div className="md:hidden divide-y divide-slate-100 text-xs">
              {sortedInvoices.map((inv) => {
                const isOfficial = inv.status === 'official';
                const isCancelled = inv.status === 'cancelled';

                return (
                  <div key={inv.id} className="p-3.5 space-y-2 hover:bg-slate-50/50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="font-black text-slate-900">
                          {inv.officialInvoiceNumber || inv.invoiceNumber}
                        </span>
                        <span
                          className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                            isOfficial
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                              : isCancelled
                              ? 'bg-rose-50 text-rose-700 border border-rose-100'
                              : 'bg-amber-50 text-amber-700 border border-amber-100'
                          }`}
                        >
                          {isOfficial ? 'رسمی' : isCancelled ? 'لغو' : 'پیش‌فاکتور'}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-medium">
                        {inv.officialDate || inv.date}
                      </span>
                    </div>

                    <div className="text-slate-800 font-bold">
                      خریدار: {inv.customerName}
                    </div>

                    <div className="text-[10px] text-slate-500 truncate">
                      اقلام: {inv.items.map((i) => i.description).join('، ')}
                    </div>

                    <div className="flex items-center justify-between bg-slate-50 p-2 rounded-lg text-[11px]">
                      <div>
                        <span className="text-slate-400 block text-[9px]">مبلغ کل</span>
                        <span className="font-bold text-slate-900">{formatToman(inv.totalAmount)}</span>
                      </div>
                      <div className="text-left">
                        <span className="text-slate-400 block text-[9px]">وزن کل</span>
                        <span className="font-black text-amber-950">{formatKg(inv.totalWeightKg)}</span>
                      </div>
                    </div>

                    {/* Actions bar for Mobile */}
                    <div className="flex items-center justify-end gap-1.5 pt-1">
                      {!isOfficial && !isCancelled && (
                        <>
                          <button
                            onClick={() => {
                              if (window.confirm(`آیا از برگشت پیش‌فاکتور ${inv.invoiceNumber} مطمئنید؟`)) {
                                cancelInvoiceAndReturnToStock(inv.id);
                              }
                            }}
                            className="px-2.5 py-1.5 rounded-lg border border-rose-200 text-rose-700 hover:bg-rose-50 font-black text-[10px]"
                          >
                            برگشت به انبار
                          </button>

                          <button
                            onClick={() => setInvoiceToAllocate(inv)}
                            className="px-2.5 py-1.5 rounded-lg bg-emerald-600 text-white font-black text-[10px]"
                          >
                            ثبت رسمی
                          </button>
                        </>
                      )}

                      <button
                        onClick={() => onViewInvoice(inv)}
                        className="px-2.5 py-1.5 rounded-lg border border-amber-200 text-amber-900 bg-amber-50/50 font-bold text-[10px] flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5 text-amber-700" />
                        <span>مشاهده</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <PaymentAllocationModal
        isOpen={!!invoiceToAllocate}
        onClose={() => setInvoiceToAllocate(null)}
        invoice={invoiceToAllocate}
        onConfirm={handleConfirmAllocation}
      />
    </div>
  );
};
