import React, { useState } from 'react';
import {
  X,
  Printer,
  CheckCircle2,
  FileSpreadsheet,
  Building,
  User,
  Phone,
  Calendar,
  DollarSign,
  Weight,
  Layers,
  ArrowRight,
  ShieldAlert,
  Undo2,
  Ban,
  AlertCircle,
  TrendingUp,
} from 'lucide-react';
import { useInventory } from '../context/InventoryContext';
import { Invoice, SelectedItemForAction, PaymentAllocation } from '../types';
import { PaymentAllocationModal } from './PaymentAllocationModal';
import {
  formatKg,
  formatToman,
  formatPersianNumber,
  getPersianDateString,
  generateInvoiceNumber,
} from '../utils/persian';
import { formatThickness, formatDiameter } from '../utils/copper';

interface InvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedItemsOverride?: SelectedItemForAction[];
  invoiceToView?: Invoice | null;
}

export const InvoiceModal: React.FC<InvoiceModalProps> = ({
  isOpen,
  onClose,
  selectedItemsOverride,
  invoiceToView,
}) => {
  const {
    state,
    currentUser,
    processStockExitInvoice,
    cancelInvoiceAndReturnToStock,
    confirmOfficialExitInvoice,
    selectedItems: globalSelectedItems,
  } = useInventory();

  // Determine items to include in invoice
  const items = selectedItemsOverride || globalSelectedItems;

  // Form Fields
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [globalPrice, setGlobalPrice] = useState<number>(720000); // default copper price per kg in tomans
  const [itemPrices, setItemPrices] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState(
    state.warehouseProfile.defaultInvoiceFooter ||
      'بار تحویل داده شده کاملاً طبق مشخصات فوق بوده و مرجوعی فقط تا ۴۸ ساعت با هماهنگی انبار امکان‌پذیر است.'
  );

  // Cheque list states
  const [chequeList, setChequeList] = useState<{ amount: number; chequeNumber: string; dueDate: string; bankName: string }[]>([]);
  const [newChequeAmt, setNewChequeAmt] = useState<string>('');
  const [newChequeNum, setNewChequeNum] = useState<string>('');
  const [newChequeDue, setNewChequeDue] = useState<string>('');
  const [newChequeBank, setNewChequeBank] = useState<string>('');

  const [generatedInvoice, setGeneratedInvoice] = useState<Invoice | null>(
    invoiceToView || null
  );

  const [isAllocationModalOpen, setIsAllocationModalOpen] = useState(false);

  if (!isOpen) return null;

  const getItemKey = (item: SelectedItemForAction) =>
    item.subItemId ? `${item.id}-${item.subItemId}` : item.id;

  const getItemUnitPrice = (item: SelectedItemForAction) =>
    itemPrices[getItemKey(item)] ?? globalPrice;

  const handleSetItemPrice = (item: SelectedItemForAction, price: number) => {
    const key = getItemKey(item);
    setItemPrices((prev) => ({ ...prev, [key]: price }));
  };

  const handleApplyGlobalPriceToAll = (price: number) => {
    setGlobalPrice(price);
    const updated: Record<string, number> = {};
    items.forEach((it) => {
      updated[getItemKey(it)] = price;
    });
    setItemPrices(updated);
  };

  const totalWeightKg = invoiceToView
    ? invoiceToView.totalWeightKg
    : items.reduce((acc, item) => acc + item.weightKg, 0);

  const totalAmount = invoiceToView
    ? invoiceToView.totalAmount
    : items.reduce((acc, item) => acc + Math.round(item.weightKg * getItemUnitPrice(item)), 0);

  const partnerInfo = state.warehouseProfile.partnerInfo;
  const p1Name = partnerInfo?.partner1Name || 'شریک اول';
  const p2Name = partnerInfo?.partner2Name || 'شریک دوم';
  const p1Share = partnerInfo?.partner1SharePercent ?? 50;
  const p2Share = partnerInfo?.partner2SharePercent ?? 50;

  const recentEntryTx = state.transactions.find((t) => t.type === 'entry' && t.pricePerKg && t.pricePerKg > 0);
  const defaultBuyPrice = recentEntryTx?.pricePerKg || 680000;

  const totalBuyCost = invoiceToView
    ? (invoiceToView.totalCost || invoiceToView.items.reduce((s, it) => s + Math.round(it.weightKg * (it.buyPricePerKg || defaultBuyPrice)), 0))
    : items.reduce((acc, item) => {
        const bPrice = (item.buyPricePerKg && item.buyPricePerKg > 0) ? item.buyPricePerKg : defaultBuyPrice;
        return acc + Math.round(item.weightKg * bPrice);
      }, 0);

  const estimatedInvoiceProfit = totalAmount - totalBuyCost;
  const p1ProfitEst = Math.round((estimatedInvoiceProfit * p1Share) / 100);
  const p2ProfitEst = Math.round((estimatedInvoiceProfit * p2Share) / 100);

  const handleIssueAndFinish = (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) return;

    const itemPricesMap: Record<string, number> = {};
    items.forEach((it) => {
      itemPricesMap[getItemKey(it)] = getItemUnitPrice(it);
    });

    processStockExitInvoice(
      items,
      customerName,
      customerPhone,
      customerAddress,
      globalPrice,
      notes,
      undefined,
      itemPricesMap,
      undefined,
      chequeList
    );

    // Finalize and close modal immediately!
    onClose();
  };

  const handleIssueAndPreview = () => {
    if (items.length === 0) return;
    if (!customerName.trim()) {
      alert('لطفاً نام خریدار یا شرکت را وارد نمایید.');
      return;
    }

    const itemPricesMap: Record<string, number> = {};
    items.forEach((it) => {
      itemPricesMap[getItemKey(it)] = getItemUnitPrice(it);
    });

    const inv = processStockExitInvoice(
      items,
      customerName,
      customerPhone,
      customerAddress,
      globalPrice,
      notes,
      undefined,
      itemPricesMap,
      undefined,
      chequeList
    );

    setGeneratedInvoice(inv);
  };

  const handlePrint = () => {
    window.print();
  };

  // Keep activeInvoice synchronized with live state in context
  const targetId = invoiceToView?.id || generatedInvoice?.id;
  const liveInvoice = state.invoices.find((i) => i.id === targetId);
  const activeInvoice = liveInvoice || invoiceToView || generatedInvoice;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-1 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl my-2 sm:my-8 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header Bar */}
        <div className="bg-slate-900 text-white p-3.5 sm:p-5 flex items-center justify-between no-print">
          <div className="flex items-center space-x-2.5 space-x-reverse min-w-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
              <FileSpreadsheet className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="font-bold text-sm sm:text-base truncate">
                {activeInvoice ? 'پیش‌فاکتور صادر شده' : 'صدور پیش‌فاکتور خروج کالا'}
              </h2>
              <p className="text-[10px] sm:text-xs text-slate-400 truncate">
                {state.warehouseProfile.name} | تاریخ: {getPersianDateString()}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 space-x-reverse shrink-0">
            {activeInvoice && (
              <button
                onClick={handlePrint}
                className="flex items-center space-x-1.5 space-x-reverse px-2.5 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition-all cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span>چاپ</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 sm:p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-2 sm:p-6 md:p-8 space-y-4 sm:space-y-6 max-h-[82vh] overflow-y-auto">
          {/* STEP 1: FORM TO ENTER BUYER & PRICE DETAILS (IF NOT YET GENERATED) */}
          {!activeInvoice && (
            <form onSubmit={handleIssueAndFinish} className="space-y-4 sm:space-y-6">
              <div className="bg-amber-50/50 p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-amber-200/70 text-xs text-amber-900 flex items-center space-x-2 space-x-reverse">
                <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600 shrink-0" />
                <span>
                  شما در حال صدور پیش‌فاکتور برای <b>{formatPersianNumber(items.length)} قلم کالا</b> با
                  وزن کل <b>{formatKg(totalWeightKg)}</b> هستید.
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-[11px] sm:text-xs font-bold text-slate-700 mb-1">
                    نام خریدار / شرکت:
                  </label>
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="مثلاً: شرکت تهویه البرز / آقای رضایی"
                    className="w-full p-2 sm:p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] sm:text-xs font-bold text-slate-700 mb-1">
                    شماره همراه / تماس خریدار:
                  </label>
                  <input
                    type="text"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="مثلاً: ۰۹۱۲۳۴۵۶۷۸۹"
                    className="w-full p-2 sm:p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-[11px] sm:text-xs font-bold text-slate-700 mb-1">
                    آدرس خریدار (اختیاری):
                  </label>
                  <input
                    type="text"
                    value={customerAddress}
                    onChange={(e) => setCustomerAddress(e.target.value)}
                    placeholder="آدرس کارخانه یا محل تحویل بار..."
                    className="w-full p-2 sm:p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] sm:text-xs font-bold text-slate-700 mb-1">
                    قیمت پایه هر کیلوگرم (همگانی):
                  </label>
                  <div className="flex items-center space-x-1.5 space-x-reverse">
                    <input
                      type="number"
                      required
                      min="1000"
                      step="1000"
                      value={globalPrice}
                      onChange={(e) => setGlobalPrice(Number(e.target.value))}
                      className="w-full p-2 sm:p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
                    />
                    <button
                      type="button"
                      onClick={() => handleApplyGlobalPriceToAll(globalPrice)}
                      className="px-2.5 py-2 sm:px-3 sm:py-2.5 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-xl text-xs font-bold whitespace-nowrap transition-colors cursor-pointer shrink-0"
                    >
                      اعمال به همه
                    </button>
                  </div>
                  <span className="text-[10px] text-amber-700 font-bold mt-1 block">
                    معادل: {formatToman(globalPrice)} به ازای هر کیلوگرم
                  </span>
                </div>

                <div>
                  <label className="block text-[11px] sm:text-xs font-bold text-slate-700 mb-1">
                    مبلغ کل محاسباتی پیش‌فاکتور:
                  </label>
                  <div className="p-2 sm:p-2.5 bg-slate-100 rounded-xl border border-slate-200 text-xs font-black text-emerald-700">
                    {formatToman(totalAmount)}
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-[11px] sm:text-xs font-bold text-slate-700 mb-1">
                    توضیحات و شرایط فاکتور:
                  </label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full p-2 sm:p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-800"
                  />
                </div>
              </div>

              {/* بخش ثبت نحوه پرداخت (نقد و چک) */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <h3 className="text-xs sm:text-sm font-black text-slate-800 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                    نحوه تسویه و پرداخت فاکتور (نقد / چک)
                  </h3>
                  <span className="text-[10px] sm:text-xs text-slate-500 font-medium">
                    ثبت جزییات رسید نقدی و چک‌های دریافتی مشتری
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* خلاصه پرداخت‌ها */}
                  <div className="bg-white p-3 rounded-xl border border-slate-200/80 space-y-2">
                    <div className="flex justify-between items-center text-xs font-bold text-slate-600">
                      <span>کل مبلغ فاکتور:</span>
                      <span className="text-slate-900">{formatToman(totalAmount)}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs font-bold text-emerald-600 bg-emerald-50/50 p-1.5 rounded-lg">
                      <span>مبلغ پرداخت نقدی (واریزی):</span>
                      <span>
                        {formatToman(
                          Math.max(0, totalAmount - chequeList.reduce((s, c) => s + c.amount, 0))
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs font-bold text-amber-700 bg-amber-50/50 p-1.5 rounded-lg">
                      <span>مجموع چک‌های ثبت شده:</span>
                      <span>
                        {formatToman(chequeList.reduce((s, c) => s + c.amount, 0))}
                      </span>
                    </div>
                  </div>

                  {/* فرم سریع افزودن چک جدید */}
                  <div className="bg-white p-3 rounded-xl border border-slate-200/80 space-y-3">
                    <h4 className="text-[11px] font-extrabold text-amber-800">
                      + ثبت مشخصات چک جدید:
                    </h4>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 mb-1">مبلغ چک (تومان):</label>
                        <input
                          type="number"
                          placeholder="مثلاً: ۲۰۰۰۰۰۰"
                          value={newChequeAmt}
                          onChange={(e) => setNewChequeAmt(e.target.value)}
                          className="w-full p-2 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-800 focus:outline-hidden"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 mb-1">شماره چک / صیاد:</label>
                        <input
                          type="text"
                          placeholder="مثلاً: ۱۲۳۴۵۶"
                          value={newChequeNum}
                          onChange={(e) => setNewChequeNum(e.target.value)}
                          className="w-full p-2 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-800 focus:outline-hidden"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 mb-1">بانک صادرکننده:</label>
                        <input
                          type="text"
                          placeholder="مثلاً: ملی"
                          value={newChequeBank}
                          onChange={(e) => setNewChequeBank(e.target.value)}
                          className="w-full p-2 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-800 focus:outline-hidden"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 mb-1">تاریخ سررسید چک:</label>
                        <input
                          type="text"
                          placeholder="مثلاً: ۱۴۰۳/۰۹/۱۵"
                          value={newChequeDue}
                          onChange={(e) => setNewChequeDue(e.target.value)}
                          className="w-full p-2 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-800 text-center focus:outline-hidden"
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        const amt = Number(newChequeAmt);
                        if (!amt || amt <= 0 || !newChequeNum.trim() || !newChequeDue.trim()) {
                          alert('لطفاً اطلاعات چک را به طور کامل وارد نمایید.');
                          return;
                        }
                        const totalChequesAmount = chequeList.reduce((s, c) => s + c.amount, 0) + amt;
                        if (totalChequesAmount > totalAmount) {
                          alert('خطا: مجموع مبالغ چک‌ها نمی‌تواند بیشتر از مبلغ کل فاکتور باشد!');
                          return;
                        }
                        setChequeList((prev) => [
                          ...prev,
                          {
                            amount: amt,
                            chequeNumber: newChequeNum.trim(),
                            dueDate: newChequeDue.trim(),
                            bankName: newChequeBank.trim() || 'نامشخص',
                          },
                        ]);
                        setNewChequeAmt('');
                        setNewChequeNum('');
                        setNewChequeDue('');
                        setNewChequeBank('');
                      }}
                      className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white font-black rounded-lg text-xs transition-colors cursor-pointer"
                    >
                      ثبت و افزودن چک به فاکتور
                    </button>
                  </div>
                </div>

                {/* لیست چک‌های افزوده شده */}
                {chequeList.length > 0 && (
                  <div className="bg-white p-3 rounded-xl border border-slate-200/80">
                    <h4 className="text-[11px] font-extrabold text-slate-700 mb-2">لیست چک‌های افزوده شده به این فاکتور:</h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-right text-xs">
                        <thead>
                          <tr className="border-b border-slate-100 text-slate-400">
                            <th className="pb-1.5 font-bold text-slate-500">شماره چک</th>
                            <th className="pb-1.5 font-bold text-slate-500">بانک</th>
                            <th className="pb-1.5 font-bold text-slate-500">تاریخ سررسید</th>
                            <th className="pb-1.5 font-bold text-slate-500">مبلغ (تومان)</th>
                            <th className="pb-1.5 font-bold text-center text-slate-500">حذف</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-700 font-bold">
                          {chequeList.map((ch, idx) => (
                            <tr key={idx} className="hover:bg-slate-50/50">
                              <td className="py-2">{ch.chequeNumber}</td>
                              <td className="py-2">{ch.bankName}</td>
                              <td className="py-2 text-slate-600">{ch.dueDate}</td>
                              <td className="py-2 text-amber-600">{formatToman(ch.amount)}</td>
                              <td className="py-2 text-center">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setChequeList((prev) => prev.filter((_, i) => i !== idx));
                                  }}
                                  className="p-1 hover:bg-red-50 text-red-500 hover:text-red-700 rounded-lg transition-colors cursor-pointer"
                                >
                                  حذف
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>

              {/* Profit and Partner Distribution Live Preview */}
              <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-slate-50 p-3 sm:p-3.5 rounded-xl sm:rounded-2xl border border-emerald-200/80 shadow-xs space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-emerald-950">
                  <span className="flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4 text-emerald-600" />
                    <span>محاسبه و تقسیم خودکار سود مس در پنل‌ها:</span>
                  </span>
                  <span className="text-[10px] text-emerald-700 font-semibold">
                    (قیمت فروش منهای قیمت خرید مس)
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                  <div className="bg-white/90 p-2 rounded-xl border border-emerald-100 shadow-2xs">
                    <span className="text-[10px] text-slate-500 block">بهای کل خرید مس:</span>
                    <span className="font-bold text-slate-800 dir-ltr block truncate">{formatToman(totalBuyCost)}</span>
                  </div>
                  <div className="bg-white/90 p-2 rounded-xl border border-emerald-100 shadow-2xs">
                    <span className="text-[10px] text-slate-500 block">سود کل این فاکتور:</span>
                    <span className={`font-black dir-ltr block truncate ${estimatedInvoiceProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                      {formatToman(estimatedInvoiceProfit)}
                    </span>
                  </div>
                  <div className="bg-white/90 p-2 rounded-xl border border-emerald-100 shadow-2xs">
                    <span className="text-[10px] text-slate-500 block">سود {p1Name} ({formatPersianNumber(p1Share)}٪):</span>
                    <span className="font-black text-emerald-800 dir-ltr block truncate">{formatToman(p1ProfitEst)}</span>
                  </div>
                  <div className="bg-white/90 p-2 rounded-xl border border-emerald-100 shadow-2xs">
                    <span className="text-[10px] text-slate-500 block">سود {p2Name} ({formatPersianNumber(p2Share)}٪):</span>
                    <span className="font-black text-emerald-800 dir-ltr block truncate">{formatToman(p2ProfitEst)}</span>
                  </div>
                </div>
              </div>

              {/* Items Selected & Individual Unit Price Table */}
              <div className="border border-slate-200 rounded-xl sm:rounded-2xl overflow-hidden shadow-xs">
                <div className="bg-slate-900 text-white px-3 py-2.5 sm:px-4 sm:py-3 font-bold text-xs flex flex-wrap items-center justify-between gap-1.5">
                  <div className="flex items-center space-x-1.5 space-x-reverse">
                    <DollarSign className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>تنظیم قیمت اقلام فاکتور:</span>
                  </div>
                  <span className="text-amber-300 font-black text-[11px] sm:text-xs">
                    وزن کل: {formatKg(totalWeightKg)}
                  </span>
                </div>

                <div className="overflow-x-auto scrollbar-thin">
                  <table className="w-full text-right text-[11px] sm:text-xs min-w-[620px]">
                    <thead className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold">
                      <tr>
                        <th className="p-2 sm:p-3 text-center w-8">#</th>
                        <th className="p-2 sm:p-3">شرح کالا و برند</th>
                        <th className="p-2 sm:p-3 text-center">مالک بار</th>
                        <th className="p-2 sm:p-3 text-center">وزن (kg)</th>
                        <th className="p-2 sm:p-3 text-center">فی خرید</th>
                        <th className="p-2 sm:p-3 text-center w-32 sm:w-36">فی فروش (تومان)</th>
                        <th className="p-2 sm:p-3 text-left">مبلغ فروش</th>
                        <th className="p-2 sm:p-3 text-left">سود قلم</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {items.map((it, idx) => {
                        const currentPrice = getItemUnitPrice(it);
                        const itemTotal = Math.round(it.weightKg * currentPrice);
                        const itemBuyPrice = (it.buyPricePerKg && it.buyPricePerKg > 0) ? it.buyPricePerKg : defaultBuyPrice;
                        const itemCost = Math.round(it.weightKg * itemBuyPrice);
                        const itemProfit = itemTotal - itemCost;

                        return (
                          <tr key={idx} className="hover:bg-amber-50/40 transition-colors">
                            <td className="p-2 sm:p-3 text-center font-bold text-slate-400">
                              {formatPersianNumber(idx + 1)}
                            </td>
                            <td className="p-2 sm:p-3">
                              <div className="font-bold text-slate-900">{it.description}</div>
                              <div className="flex items-center space-x-1.5 space-x-reverse text-[10px] text-slate-500 mt-0.5">
                                <span className="px-1 py-0.5 rounded bg-amber-100 text-amber-800 font-bold text-[9px]">
                                  برند {it.brand}
                                </span>
                                <span>
                                  دسته:{' '}
                                  {it.category === 'branch'
                                    ? 'شاخه'
                                    : it.category === 'coil'
                                    ? 'کلاف'
                                    : it.category === 'reel'
                                    ? 'قرقره'
                                    : it.category === 'pallet'
                                    ? 'پالت'
                                    : 'خورده'}
                                </span>
                              </div>
                            </td>
                            <td className="p-2 sm:p-3 text-center text-slate-700 font-medium whitespace-nowrap text-[10px]">
                              <span className="px-1.5 py-0.5 bg-slate-100 rounded text-slate-700">
                                {it.purchaser || 'حساب مشترک'}
                              </span>
                            </td>
                            <td className="p-2 sm:p-3 text-center font-bold text-amber-800 whitespace-nowrap">
                              {formatKg(it.weightKg)}
                            </td>
                            <td className="p-2 sm:p-3 text-center text-slate-500 font-medium whitespace-nowrap text-[10px]">
                              {formatToman(itemBuyPrice)}
                            </td>
                            <td className="p-2 sm:p-3 text-center">
                              <input
                                type="number"
                                min="1000"
                                step="1000"
                                value={currentPrice}
                                onChange={(e) =>
                                  handleSetItemPrice(it, Number(e.target.value))
                                }
                                className="w-full p-1.5 sm:p-2 bg-white rounded-lg border border-slate-300 font-bold text-xs text-slate-900 focus:ring-2 focus:ring-amber-500 text-center dir-ltr"
                              />
                            </td>
                            <td className="p-2 sm:p-3 text-left font-bold text-slate-900 whitespace-nowrap">
                              {formatToman(itemTotal)}
                            </td>
                            <td className={`p-2 sm:p-3 text-left font-black whitespace-nowrap ${itemProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                              {formatToman(itemProfit)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="pt-2 flex flex-wrap items-center justify-end gap-2 sm:gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="button"
                  onClick={handleIssueAndPreview}
                  className="px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition-all shadow-xs cursor-pointer flex items-center space-x-1.5 space-x-reverse"
                  title="مشاهده ظاهر چاپی فاکتور قبل از خروج"
                >
                  <Printer className="w-4 h-4" />
                  <span>پیش‌نمایش چاپی</span>
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 sm:px-6 sm:py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs transition-all shadow-md cursor-pointer flex items-center space-x-1.5 space-x-reverse"
                  title="ثبت قطعی در سیستم، کسر از موجودی انبار و اتمام"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>ثبت فاکتور و اتمام</span>
                </button>
              </div>
            </form>
          )}

          {/* STEP 2: PROFESSIONAL PRINTABLE PROFORMA INVOICE VIEW */}
          {activeInvoice && (
            <div id="printable-invoice" className="bg-white p-3 sm:p-6 md:p-8 rounded-xl sm:rounded-2xl border border-slate-300 shadow-xs space-y-4 sm:space-y-6 text-slate-900 font-sans">
              {/* Invoice Header */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-3 sm:pb-6 border-b-2 border-amber-600 gap-3">
                <div className="flex items-center space-x-2.5 sm:space-x-3 space-x-reverse min-w-0">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-amber-600 text-white flex items-center justify-center font-bold shrink-0">
                    <Building className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                  <div className="min-w-0">
                    <h1 className="text-sm sm:text-lg font-black text-slate-900 truncate">
                      {activeInvoice.sellerName}
                    </h1>
                    <p className="text-[10px] sm:text-xs text-slate-600 mt-0.5 line-clamp-1">
                      توزیع و فروش انواع لوله، قرقره، کلاف و شاخه‌های مس باهنر، قائم، استریا و بابک
                    </p>
                    <p className="text-[10px] sm:text-xs text-slate-500">تلفن: {activeInvoice.sellerPhone}</p>
                  </div>
                </div>

                <div className="bg-slate-50 p-2.5 sm:p-3 rounded-xl border border-slate-200 text-right w-full sm:w-auto">
                  {activeInvoice.status === 'official' ? (
                    <div className="space-y-0.5">
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-black text-[10px] sm:text-xs border border-emerald-300 inline-block">
                        فاکتور رسمی خروج قطعی
                      </span>
                      <div className="text-[10px] sm:text-xs font-bold text-slate-800 mt-1">
                        شماره: <span className="text-emerald-700 font-black">{activeInvoice.officialInvoiceNumber || activeInvoice.invoiceNumber}</span>
                      </div>
                      <div className="text-[10px] sm:text-xs text-slate-500">
                        تاریخ خروج: {activeInvoice.officialDate || activeInvoice.date}
                      </div>
                    </div>
                  ) : activeInvoice.status === 'cancelled' ? (
                    <div className="space-y-0.5">
                      <span className="px-2 py-0.5 bg-rose-100 text-rose-800 rounded font-black text-[10px] sm:text-xs border border-rose-300 inline-block line-through">
                        پیش‌فاکتور لغو شده
                      </span>
                      <div className="text-[10px] sm:text-xs font-bold text-slate-700 mt-1">
                        شماره: <span className="text-slate-900">{activeInvoice.invoiceNumber}</span>
                      </div>
                      <div className="text-[10px] sm:text-xs text-slate-500">
                        تاریخ صدور: {activeInvoice.date}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-0.5">
                      <h3 className="font-black text-amber-800 text-xs sm:text-base">
                        پیش‌فاکتور فروش (رزرو انبار)
                      </h3>
                      <div className="text-[10px] sm:text-xs font-bold text-slate-700 mt-0.5">
                        شماره: <span className="text-slate-900">{activeInvoice.invoiceNumber}</span>
                      </div>
                      <div className="text-[10px] sm:text-xs text-slate-500">
                        تاریخ صدور: {activeInvoice.date}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Customer & Seller Info Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-4 bg-slate-50/70 p-2.5 sm:p-4 rounded-xl border border-slate-200 text-[11px] sm:text-xs">
                <div>
                  <span className="font-bold text-amber-800 block mb-0.5">مشخصات خریدار:</span>
                  <p className="font-bold text-slate-900 text-xs sm:text-sm">
                    {activeInvoice.customerName}
                  </p>
                  <p className="text-slate-600 mt-0.5">
                    شماره تماس: {activeInvoice.customerPhone || '-'}
                  </p>

                  {activeInvoice.customerAddress && (
                    <p className="text-slate-600 mt-0.5">
                      نشانی: {activeInvoice.customerAddress}
                    </p>
                  )}
                </div>

                <div>
                  <span className="font-bold text-amber-800 block mb-0.5">اطلاعات صادرکننده:</span>
                  <p className="font-semibold text-slate-800">
                    صادر شده توسط: {activeInvoice.registeredBy}
                  </p>
                  <p className="text-slate-600 mt-0.5">
                    آدرس انبار: {state.warehouseProfile.address}
                  </p>
                </div>
              </div>

              {/* Invoice Line Items Table */}
              <div className="border border-slate-300 rounded-xl overflow-x-auto scrollbar-thin">
                <table className="w-full text-right text-[10px] sm:text-xs min-w-[500px]">
                  <thead className="bg-slate-100 border-b border-slate-300 font-bold text-slate-800">
                    <tr>
                      <th className="p-1.5 sm:p-3 text-center w-8 sm:w-12 whitespace-nowrap">ردیف</th>
                      <th className="p-1.5 sm:p-3 whitespace-nowrap">شرح کالا و مشخصات فنی</th>
                      <th className="p-1.5 sm:p-3 text-center whitespace-nowrap">برند</th>
                      <th className="p-1.5 sm:p-3 text-center whitespace-nowrap">ضخامت/سایز</th>
                      <th className="p-1.5 sm:p-3 text-center whitespace-nowrap">وزن کل (kg)</th>
                      <th className="p-1.5 sm:p-3 text-left whitespace-nowrap">فی (تومان)</th>
                      <th className="p-1.5 sm:p-3 text-left whitespace-nowrap">مبلغ کل (تومان)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {activeInvoice.items.map((line, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="p-1.5 sm:p-3 text-center font-bold text-slate-500 whitespace-nowrap">
                          {formatPersianNumber(idx + 1)}
                        </td>
                        <td className="p-1.5 sm:p-3 font-bold text-slate-900">{line.description}</td>
                        <td className="p-1.5 sm:p-3 text-center whitespace-nowrap">{line.brand}</td>
                        <td className="p-1.5 sm:p-3 text-center whitespace-nowrap">
                          {formatThickness(line.thickness, state.warehouseProfile.unitSettings?.thicknessUnit)} / {formatDiameter(line.diameter, state.warehouseProfile.unitSettings?.diameterUnit)}
                        </td>
                        <td className="p-1.5 sm:p-3 text-center font-bold text-amber-800 whitespace-nowrap">
                          {formatKg(line.weightKg)}
                        </td>
                        <td className="p-1.5 sm:p-3 text-left whitespace-nowrap">{formatToman(line.unitPrice)}</td>
                        <td className="p-1.5 sm:p-3 text-left font-bold text-slate-900 whitespace-nowrap">
                          {formatToman(line.totalPrice)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-amber-50/60 font-black border-t-2 border-slate-300 text-slate-900">
                    <tr>
                      <td colSpan={4} className="p-1.5 sm:p-3 text-left font-bold whitespace-nowrap">
                        جمع کل محموله:
                      </td>
                      <td className="p-1.5 sm:p-3 text-center text-amber-800 whitespace-nowrap">
                        {formatKg(activeInvoice.totalWeightKg)}
                      </td>
                      <td className="p-1.5 sm:p-3 text-left whitespace-nowrap">قابل پرداخت:</td>
                      <td className="p-1.5 sm:p-3 text-left text-emerald-800 text-xs sm:text-sm whitespace-nowrap">
                        {formatToman(activeInvoice.totalAmount)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Footer Terms & Stamp */}
              <div className="pt-3 sm:pt-4 border-t border-slate-200 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <div className="md:col-span-2 space-y-1 text-slate-600">
                  <span className="font-bold text-slate-800 text-[11px] sm:text-xs">شرایط و توضیحات:</span>
                  <p className="text-[10px] sm:text-[11px] leading-relaxed">{activeInvoice.notes}</p>
                </div>

                <div className="border border-slate-200 rounded-xl p-3 text-center flex flex-col justify-between h-20 sm:h-28 bg-slate-50/50">
                  <span className="font-bold text-slate-700 text-[11px] sm:text-xs">امضاء و مهر انبار مس</span>
                  <span className="text-[9px] sm:text-[10px] text-slate-400">
                    ثبت شده توسط {activeInvoice.registeredBy}
                  </span>
                </div>
              </div>

              <div className="no-print pt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200">
                <div className="flex items-center space-x-2 space-x-reverse">
                  {activeInvoice.status !== 'cancelled' && activeInvoice.status !== 'official' && (
                    <>
                      <button
                        onClick={() => {
                          if (window.confirm(`آیا از لغو پیش‌فاکتور ${activeInvoice.invoiceNumber} و برگشت تمام اقلام به موجودی انبار اطمینان دارید؟`)) {
                            cancelInvoiceAndReturnToStock(activeInvoice.id);
                            onClose();
                          }
                        }}
                        className="px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 text-xs font-bold transition-all cursor-pointer flex items-center space-x-1 space-x-reverse"
                        title="لغو این پیش‌فاکتور و بازگرداندن تمام بار به انبار"
                      >
                        <Undo2 className="w-3.5 h-3.5 text-rose-600" />
                        <span>برگشت کالا به انبار</span>
                      </button>

                      <button
                        onClick={() => setIsAllocationModalOpen(true)}
                        className="px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer flex items-center space-x-1 space-x-reverse"
                        title="تایید واریز وجه، تخصیص سهم شرکا و صدور فاکتور رسمی خروج قطعی"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>تایید و صدور فاکتور رسمی</span>
                      </button>
                    </>
                  )}
                </div>

                <div className="flex items-center space-x-2 space-x-reverse">
                  <button
                    onClick={onClose}
                    className="px-4 py-1.5 sm:px-5 sm:py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-xs cursor-pointer flex items-center space-x-1.5 space-x-reverse"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>اتمام و بازگشت</span>
                  </button>
                  <button
                    onClick={handlePrint}
                    className="px-4 py-1.5 sm:px-6 sm:py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-md cursor-pointer flex items-center space-x-1.5 space-x-reverse"
                  >
                    <Printer className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    <span>چاپ فاکتور</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <PaymentAllocationModal
        isOpen={isAllocationModalOpen}
        onClose={() => setIsAllocationModalOpen(false)}
        invoice={activeInvoice}
        onConfirm={(allocation) => {
          if (activeInvoice) {
            confirmOfficialExitInvoice(activeInvoice.id, allocation);
            setIsAllocationModalOpen(false);
            onClose(); // Automatically closes invoice modal and completes the process
          }
        }}
      />
    </div>
  );
};
