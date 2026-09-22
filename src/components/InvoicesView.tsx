import React, { useState } from 'react';
import {
  FileText,
  Search,
  Printer,
  PlusCircle,
  Eye,
  User,
  Calendar,
  FileSpreadsheet,
  CheckCircle2,
  Undo2,
  Check,
  Ban,
  AlertCircle,
} from 'lucide-react';
import { useInventory } from '../context/InventoryContext';
import { PaymentAllocationModal } from './PaymentAllocationModal';
import { PaymentAllocation, Invoice } from '../types';
import { formatKg, formatToman, formatPersianNumber } from '../utils/persian';

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

  const invoices = state.invoices.filter((inv) => {
    const matchesSearch =
      !searchQuery.trim() ||
      inv.invoiceNumber.includes(searchQuery.trim()) ||
      (inv.officialInvoiceNumber && inv.officialInvoiceNumber.includes(searchQuery.trim())) ||
      inv.customerName.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
      (inv.customerPhone && inv.customerPhone.includes(searchQuery.trim()));

    return matchesSearch;
  });

  return (
    <div className="space-y-4 sm:space-y-6 pb-16">
      {/* Header Stat Overview */}
      <div className="bg-white p-3.5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <div className="flex items-center space-x-2.5 sm:space-x-3 space-x-reverse min-w-0">
          <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold shrink-0">
            <FileText className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm sm:text-lg font-bold text-slate-900 truncate">
              پیش‌فاکتورهای خروج کالا
            </h2>
            <p className="text-[10px] sm:text-xs text-slate-500 mt-0.5 line-clamp-1">
              مدیریت، مشاهده مجدد و چاپ پیش‌فاکتورهای صادرشده برای خریداران
            </p>
          </div>
        </div>

        <button
          onClick={onOpenInvoiceModal}
          disabled={selectedItems.length === 0}
          title={
            selectedItems.length === 0
              ? 'ابتدا اقلامی را از صفحه موجودی انبار تیک بزنید'
              : 'صدور پیش‌فاکتور'
          }
          className={`w-full sm:w-auto flex items-center justify-center space-x-1.5 space-x-reverse px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-xl font-bold text-xs transition-all shadow-xs ${
            selectedItems.length > 0
              ? 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer'
              : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
          }`}
        >
          <PlusCircle className="w-4 h-4" />
          <span>صدور پیش‌فاکتور ({formatPersianNumber(selectedItems.length)} مورد انتخابی)</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-2.5 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-200 shadow-xs relative">
        <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3 sm:top-4" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="جستجو بر اساس شماره پیش‌فاکتور، نام خریدار یا شماره تلفن..."
          className="w-full pr-9 pl-3 sm:pr-10 sm:pl-4 py-1.5 sm:py-2 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-hidden focus:border-amber-500"
        />
      </div>

      {/* Invoices List Table */}
      <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {invoices.length === 0 ? (
          <div className="p-8 sm:p-12 text-center text-slate-500">
            <FileText className="w-10 h-10 sm:w-12 sm:h-12 text-slate-300 mx-auto mb-2" />
            <p className="font-bold text-xs sm:text-sm">هیچ پیش‌فاکتوری ثبت نشده است.</p>
            <p className="text-[10px] sm:text-xs text-slate-400 mt-1">
              جهت صدور پیش‌فاکتور، اقلام موردنظر را از تب موجودی انبار انتخاب کرده و تیک بزنید.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {invoices.map((inv) => (
              <div
                key={inv.id}
                className="p-3.5 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-3.5 hover:bg-slate-50/60 transition-colors"
              >
                <div className="space-y-1.5 min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5 sm:gap-2.5">
                    <span className="font-black text-xs sm:text-sm text-slate-900">
                      {inv.officialInvoiceNumber || inv.invoiceNumber}
                    </span>

                    {inv.status === 'official' ? (
                      <span className="px-2.5 py-0.5 rounded-lg bg-emerald-100 text-emerald-900 text-[10px] sm:text-[11px] font-black border border-emerald-300 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span>فاکتور رسمی (تایید خروج قطعی)</span>
                      </span>
                    ) : inv.status === 'cancelled' ? (
                      <span className="px-2.5 py-0.5 rounded-lg bg-rose-100 text-rose-800 text-[10px] sm:text-[11px] font-bold border border-rose-300 flex items-center gap-1">
                        <Ban className="w-3 h-3 text-rose-600" />
                        <span>لغو شده (برگشت داده شده به انبار)</span>
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-lg bg-amber-100 text-amber-900 text-[10px] sm:text-[11px] font-bold border border-amber-300 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 text-amber-700" />
                        <span>پیش‌فاکتور (رزرو - در انتظار تسویه)</span>
                      </span>
                    )}

                    <span className="text-[10px] sm:text-xs text-slate-500 font-medium">تاریخ: {inv.officialDate || inv.date}</span>
                  </div>

                  <p className="text-xs font-bold text-slate-800">
                    خریدار: {inv.customerName} | همراه: {inv.customerPhone || '-'}
                  </p>

                  <p className="text-[10px] sm:text-[11px] text-slate-500 line-clamp-1">
                    اقلام: {inv.items.map((i) => i.description).join('، ')}
                  </p>

                  {inv.status === 'cancelled' && inv.cancelReason && (
                    <p className="text-[10px] sm:text-[11px] text-rose-600 font-semibold">
                      علت لغو: {inv.cancelReason}
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap items-center justify-between lg:justify-end gap-2 sm:gap-3 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                  <div className="text-right pl-2 sm:pl-4">
                    <div className="text-[11px] sm:text-xs font-bold text-amber-800">
                      وزن: {formatKg(inv.totalWeightKg)}
                    </div>
                    <div className="text-xs sm:text-sm font-black text-slate-900">
                      {formatToman(inv.totalAmount)}
                    </div>
                    {inv.status === 'official' && (
                      <div className="text-[10px] sm:text-[11px] font-bold mt-1 space-y-0.5">
                        <div className="text-emerald-700">
                          پرداختی: {formatToman(inv.paidAmount ?? inv.totalAmount)}
                        </div>
                        {(inv.remainingAmount ?? 0) > 0 ? (
                          <div className="text-rose-700">
                            مانده بدهی: {formatToman(inv.remainingAmount ?? 0)}
                          </div>
                        ) : (
                          <div className="text-emerald-600">تسویه کامل</div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                    {/* If proforma / issued: allow Cancel & Return to Stock OR Confirm Official Exit */}
                    {inv.status !== 'cancelled' && inv.status !== 'official' && (
                      <>
                        <button
                          onClick={() => {
                            if (window.confirm(`آیا از لغو پیش‌فاکتور ${inv.invoiceNumber} و برگشت تمام اقلام به موجودی انبار اطمینان دارید؟`)) {
                              cancelInvoiceAndReturnToStock(inv.id);
                            }
                          }}
                          className="flex items-center space-x-1 space-x-reverse px-2.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-800 text-[11px] sm:text-xs font-bold border border-rose-200 transition-all cursor-pointer"
                          title="لغو این پیش‌فاکتور و برگشت خودکار اقلام آن به انبار"
                        >
                          <Undo2 className="w-3.5 h-3.5 text-rose-600" />
                          <span>برگشت به انبار</span>
                        </button>

                        <button
                          onClick={() => setInvoiceToAllocate(inv)}
                          className="flex items-center space-x-1 space-x-reverse px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] sm:text-xs font-bold transition-all cursor-pointer shadow-xs"
                          title="تایید واریزی، تخصیص سهم شرکا و صدور فاکتور رسمی خروج"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>تایید و فاکتور رسمی</span>
                        </button>
                      </>
                    )}

                    <button
                      onClick={() => onViewInvoice(inv)}
                      className="flex items-center space-x-1 space-x-reverse px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-bold border border-amber-200 transition-all cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5 text-amber-700" />
                      <span>مشاهده و چاپ</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
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
