import React, { useState } from 'react';
import {
  Handshake,
  Search,
  RotateCcw,
  ShoppingCart,
  Printer,
  Calendar,
  User,
  Phone,
  FileText,
  CheckCircle2,
  AlertCircle,
  Package,
  Layers,
  ArrowRight,
  X,
} from 'lucide-react';
import { useInventory } from '../context/InventoryContext';
import { ConsignmentItem, Invoice } from '../types';

interface ConsignmentsViewProps {
  onViewInvoice?: (invoice: Invoice) => void;
}

export const ConsignmentsView: React.FC<ConsignmentsViewProps> = ({ onViewInvoice }) => {
  const { state, returnFromConsignment, convertConsignmentToSale } = useInventory();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'returned' | 'converted_to_sale'>('all');

  const [convertingItem, setConvertingItem] = useState<ConsignmentItem | null>(null);
  const [convertPricePerKg, setConvertPricePerKg] = useState<number>(3500000);
  const [customerPhoneInput, setCustomerPhoneInput] = useState<string>('');

  const [receiptItem, setReceiptItem] = useState<ConsignmentItem | null>(null);

  const consignments = (state.consignments || []).filter((csg) => {
    const matchesSearch =
      !searchQuery.trim() ||
      csg.recipientName.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
      csg.code.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
      csg.brand.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
      (csg.recipientPhone && csg.recipientPhone.includes(searchQuery.trim()));

    const matchesStatus = filterStatus === 'all' || csg.status === filterStatus;

    return matchesSearch && matchesStatus;
  });

  const activeCount = (state.consignments || []).filter((c) => c.status === 'active').length;
  const returnedCount = (state.consignments || []).filter((c) => c.status === 'returned').length;
  const convertedCount = (state.consignments || []).filter((c) => c.status === 'converted_to_sale').length;
  const totalActiveWeight = (state.consignments || [])
    .filter((c) => c.status === 'active')
    .reduce((acc, c) => acc + c.weightKg, 0);

  const handleReturn = (csg: ConsignmentItem) => {
    if (
      window.confirm(
        `آیا از بازگشت کالای امانی ${csg.code} (تحویل‌گیرنده: ${csg.recipientName}) به موجودی انبار اطمینان دارید؟`
      )
    ) {
      returnFromConsignment(csg.id);
    }
  };

  const handleStartConvert = (csg: ConsignmentItem) => {
    setConvertingItem(csg);
    setConvertPricePerKg(csg.unitPrice || 3500000);
    setCustomerPhoneInput(csg.recipientPhone || '');
  };

  const handleConfirmConvert = () => {
    if (!convertingItem) return;
    try {
      const inv = convertConsignmentToSale(convertingItem.id, convertPricePerKg, customerPhoneInput);
      setConvertingItem(null);
      if (onViewInvoice) {
        onViewInvoice(inv);
      } else {
        alert(`پیش‌فاکتور ${inv.invoiceNumber} با موفقیت صادر شد.`);
      }
    } catch (e: any) {
      alert(e.message || 'خطا در تبدیل امانی به فروش');
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 text-right pb-10">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-amber-950 to-slate-900 text-white p-4 sm:p-6 rounded-3xl shadow-xl border border-amber-500/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3 space-x-reverse">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center font-bold shadow-xs shrink-0">
            <Handshake className="w-6 h-6 text-amber-400" />
          </div>
          <div>
            <h1 className="text-base sm:text-xl font-black text-amber-300">
              مدیریت لیست امانی‌ها (کالاهای تحویلی موقت)
            </h1>
            <p className="text-xs text-slate-300">
              ثبت، پیگیری و تعیین تکلیف بارهای خارج شده از انبار به صورت امانی
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs">
          <div className="bg-slate-800/80 px-3.5 py-2 rounded-2xl border border-amber-500/30">
            <span className="text-slate-400 block text-[10px]">امانت‌های فعال:</span>
            <span className="font-black text-amber-400 text-sm">{activeCount} مورد</span>
          </div>
          <div className="bg-slate-800/80 px-3.5 py-2 rounded-2xl border border-emerald-500/30">
            <span className="text-slate-400 block text-[10px]">وزن بارهای امانی فعال:</span>
            <span className="font-black text-emerald-400 text-sm">
              {totalActiveWeight.toLocaleString('fa-IR')} کیلوگرم
            </span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-3.5 sm:p-4 rounded-3xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Status Tabs */}
        <div className="flex items-center space-x-1 sm:space-x-2 space-x-reverse overflow-x-auto w-full md:w-auto pb-1 md:pb-0 scrollbar-none">
          <button
            onClick={() => setFilterStatus('all')}
            className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              filterStatus === 'all'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            همه امانی‌ها ({(state.consignments || []).length})
          </button>
          <button
            onClick={() => setFilterStatus('active')}
            className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              filterStatus === 'active'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            امانت فعال ({activeCount})
          </button>
          <button
            onClick={() => setFilterStatus('returned')}
            className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              filterStatus === 'returned'
                ? 'bg-slate-800 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            برگشت به انبار ({returnedCount})
          </button>
          <button
            onClick={() => setFilterStatus('converted_to_sale')}
            className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              filterStatus === 'converted_to_sale'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            تبدیل به فروش ({convertedCount})
          </button>
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-72">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="جستجو نام امانت‌گیرنده، کد..."
            className="w-full pl-3 pr-9 py-2 rounded-2xl border border-slate-300 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
        </div>
      </div>

      {/* Consignments Cards List */}
      {consignments.length === 0 ? (
        <div className="bg-white rounded-3xl p-8 border border-slate-200 text-center space-y-2">
          <Handshake className="w-12 h-12 text-slate-300 mx-auto" />
          <p className="text-sm font-bold text-slate-700">هیچ کالا یا بار امانی یافت نشد.</p>
          <p className="text-xs text-slate-500">
            برای ثبت امانی، اقلام مورد نظر را در جدول موجودی انتخاب کرده و دکمه «انتقال به امانی» را بزنید.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {consignments.map((csg) => (
            <div
              key={csg.id}
              className={`bg-white rounded-3xl p-4 border transition-all flex flex-col justify-between space-y-3 ${
                csg.status === 'active'
                  ? 'border-amber-300 shadow-sm ring-1 ring-amber-400/20'
                  : csg.status === 'converted_to_sale'
                  ? 'border-emerald-200 bg-emerald-50/20'
                  : 'border-slate-200 bg-slate-50/50'
              }`}
            >
              <div className="space-y-2">
                {/* Header Badge */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="font-black text-xs text-slate-900">{csg.code}</span>
                  {csg.status === 'active' ? (
                    <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[10px] font-bold border border-amber-300 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 text-amber-700" />
                      <span>در دست امانت‌گیرنده</span>
                    </span>
                  ) : csg.status === 'returned' ? (
                    <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold border border-slate-300 flex items-center gap-1">
                      <RotateCcw className="w-3 h-3 text-slate-500" />
                      <span>برگشت به انبار</span>
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold border border-emerald-300 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      <span>تبدیل به فروش</span>
                    </span>
                  )}
                </div>

                {/* Recipient Details */}
                <div className="space-y-1">
                  <div className="flex items-center text-xs font-bold text-slate-900 gap-1.5">
                    <User className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span>امانت‌گیرنده: {csg.recipientName}</span>
                  </div>

                  {csg.recipientPhone && (
                    <div className="flex items-center text-[11px] text-slate-600 gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>تماس: {csg.recipientPhone}</span>
                    </div>
                  )}

                  <div className="flex items-center text-[11px] text-slate-500 gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>تاریخ خروج: {csg.issueDate}</span>
                    {csg.expectedReturnDate && (
                      <span className="text-amber-800 font-semibold"> (بازگشت: {csg.expectedReturnDate})</span>
                    )}
                  </div>
                </div>

                {/* Item Specifications Box */}
                <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-200 text-xs space-y-1">
                  <div className="font-bold text-slate-900">{csg.description || csg.brand}</div>
                  <div className="flex flex-wrap gap-2 text-[10px] font-semibold text-slate-600">
                    <span>برند: {csg.brand}</span>
                    <span>ضخامت: {csg.thickness}</span>
                    <span>قطر: {csg.diameter}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs font-black text-amber-800 pt-1 border-t border-slate-200/60">
                    <span>وزن بار: {csg.weightKg} کیلوگرم</span>
                    {csg.unitPrice ? (
                      <span>ارزش: {(csg.weightKg * csg.unitPrice).toLocaleString('fa-IR')} تومان</span>
                    ) : null}
                  </div>
                </div>

                {csg.notes && (
                  <p className="text-[10px] text-slate-500 italic line-clamp-2">
                    ملاحظات: {csg.notes}
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-1.5">
                <button
                  onClick={() => setReceiptItem(csg)}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1"
                >
                  <Printer className="w-3.5 h-3.5 text-slate-600" />
                  <span>رسید</span>
                </button>

                {csg.status === 'active' && (
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleReturn(csg)}
                      className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-[11px] font-bold transition-all cursor-pointer border border-slate-300 flex items-center gap-1"
                      title="بازگشت خودکار بار به موجودی فعال انبار"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-slate-600" />
                      <span>برگشت به انبار</span>
                    </button>

                    <button
                      onClick={() => handleStartConvert(csg)}
                      className="px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold transition-all cursor-pointer shadow-xs flex items-center gap-1"
                      title="صدور پیش‌فاکتور و تبدیل به فروش قطعی"
                    >
                      <ShoppingCart className="w-3.5 h-3.5" />
                      <span>تبدیل به فروش</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Convert Consignment to Sale */}
      {convertingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-md w-full p-5 text-right space-y-4">
            <h3 className="font-black text-slate-900 text-base">
              تبدیل کالا امانی {convertingItem.code} به پیش‌فاکتور فروش
            </h3>

            <div className="bg-amber-50 p-3 rounded-2xl border border-amber-200 text-xs space-y-1 text-amber-900">
              <p>
                <strong>تحویل‌گیرنده:</strong> {convertingItem.recipientName}
              </p>
              <p>
                <strong>بار:</strong> {convertingItem.description} ({convertingItem.weightKg} کیلوگرم)
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                قیمت هر کیلوگرم (تومان):
              </label>
              <input
                type="number"
                step="50000"
                value={convertPricePerKg}
                onChange={(e) => setConvertPricePerKg(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                شماره تماس خریدار:
              </label>
              <input
                type="text"
                value={customerPhoneInput}
                onChange={(e) => setCustomerPhoneInput(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="bg-emerald-900 text-white p-3 rounded-2xl text-xs flex justify-between items-center font-bold">
              <span>مبلغ کل پیش‌فاکتور:</span>
              <span className="text-amber-300 text-sm">
                {(convertingItem.weightKg * convertPricePerKg).toLocaleString('fa-IR')} تومان
              </span>
            </div>

            <div className="flex justify-end space-x-2 space-x-reverse pt-2">
              <button
                onClick={() => setConvertingItem(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                انصراف
              </button>
              <button
                onClick={handleConfirmConvert}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-md cursor-pointer"
              >
                صدور پیش‌فاکتور
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Printable Trust Receipt Modal */}
      {receiptItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 text-right space-y-4 print:p-0">
            <div className="flex justify-between items-center border-b border-slate-200 pb-3 no-print">
              <h3 className="font-black text-slate-900 text-base">رسید امانی کالا</h3>
              <button
                onClick={() => setReceiptItem(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Printable Receipt Body */}
            <div className="p-4 bg-amber-50/40 rounded-2xl border border-amber-200 space-y-3 text-xs text-slate-900">
              <div className="text-center pb-2 border-b border-slate-300">
                <h2 className="font-black text-base text-slate-900">{state.warehouseProfile.name}</h2>
                <p className="text-[11px] text-slate-600">رسید رسمی خروج موقت / امانی کالا</p>
                <p className="text-[10px] text-slate-500 font-bold mt-1">کد امانی: {receiptItem.code}</p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  <span className="text-slate-500">تحویل‌گیرنده: </span>
                  <span className="font-bold">{receiptItem.recipientName}</span>
                </div>
                <div>
                  <span className="text-slate-500">شماره تماس: </span>
                  <span className="font-bold">{receiptItem.recipientPhone || '---'}</span>
                </div>
                <div>
                  <span className="text-slate-500">تاریخ تحویل: </span>
                  <span className="font-bold">{receiptItem.issueDate}</span>
                </div>
                <div>
                  <span className="text-slate-500">تاریخ موعد بازگشت: </span>
                  <span className="font-bold">{receiptItem.expectedReturnDate}</span>
                </div>
              </div>

              <div className="bg-white p-3 rounded-xl border border-slate-300 space-y-1">
                <p className="font-bold">شرح کالا:</p>
                <p>{receiptItem.description}</p>
                <div className="flex justify-between text-amber-900 font-black pt-1 border-t border-slate-200">
                  <span>وزن خالص: {receiptItem.weightKg} کیلوگرم</span>
                  <span>برند: {receiptItem.brand}</span>
                </div>
              </div>

              <p className="text-[10px] text-slate-600 text-justify">
                این محموله به صورت امانی نزد تحویل‌گیرنده بوده و تا تسویه کامل یا بازگشت به انبار، متعلق به {state.warehouseProfile.name} می‌باشد.
              </p>

              <div className="grid grid-cols-2 gap-4 pt-6 text-center text-[10px] font-bold">
                <div className="border-t border-slate-400 pt-1">امضاء تحویل‌دهنده (انبار)</div>
                <div className="border-t border-slate-400 pt-1">امضاء تحویل‌گیرنده (امانت)</div>
              </div>
            </div>

            <div className="no-print flex justify-end space-x-2 space-x-reverse pt-2">
              <button
                onClick={() => setReceiptItem(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                بستن
              </button>
              <button
                onClick={() => window.print()}
                className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-black text-xs shadow-md cursor-pointer flex items-center gap-1.5"
              >
                <Printer className="w-4 h-4" />
                <span>چاپ رسید امانی</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
