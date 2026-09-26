import React, { useState, useEffect } from 'react';
import {
  X,
  CheckCircle2,
  Calendar,
  Trash2,
  Plus,
  Receipt,
  Banknote,
  AlertCircle,
  Building2,
  User,
  Users,
} from 'lucide-react';
import { useInventory } from '../context/InventoryContext';
import { Invoice, PaymentAllocation } from '../types';
import { getPersianDateString } from '../utils/persian';

interface ChequeItem {
  id: string;
  amount: number;
  chequeNumber: string;
  dueDate: string;
  bankName: string;
  customerName: string; // نام صادرکننده / خریدار
  partnerAccount: 'partner1' | 'partner2' | 'shared'; // به حساب کدام شریک/صندوق برود
}

interface PaymentAllocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: Invoice | null;
  onConfirm: (
    allocation: PaymentAllocation,
    chequesList?: {
      amount: number;
      chequeNumber: string;
      dueDate: string;
      bankName: string;
      customerName?: string;
      partnerAccount?: 'partner1' | 'partner2' | 'shared';
    }[]
  ) => void;
}

// Convert numbers to clean Persian words
function numberToPersianWords(num: number): string {
  if (!num || isNaN(num) || num <= 0) return '';

  const yekan = ['', 'یک', 'دو', 'سه', 'چهار', 'پنج', 'شش', 'هفت', 'هشت', 'نه'];
  const dahgan = ['', 'ده', 'بیست', 'سی', 'چهل', 'پنجاه', 'شصت', 'هفتاد', 'هشتاد', 'نود'];
  const sadgan = ['', 'صد', 'دویست', 'سیصد', 'چهارصد', 'پانصد', 'ششصد', 'هفتصد', 'هشتصد', 'نهصد'];
  const dah = ['ده', 'یازده', 'دوازده', 'سیزده', 'چهارده', 'پانزده', 'شانزده', 'هفده', 'هجده', 'نوزده'];
  const steps = ['', 'هزار', 'میلیون', 'میلیارد', 'تریلیون'];

  const convertThreeDigits = (n: number): string => {
    if (n === 0) return '';
    const parts: string[] = [];
    const s = Math.floor(n / 100);
    const d = Math.floor((n % 100) / 10);
    const y = n % 10;

    if (s > 0) parts.push(sadgan[s]);

    if (d === 1) {
      parts.push(dah[y]);
    } else {
      if (d > 0) parts.push(dahgan[d]);
      if (y > 0) parts.push(yekan[y]);
    }
    return parts.join(' و ');
  };

  const result: string[] = [];
  let stepIdx = 0;
  let remaining = Math.floor(num);

  while (remaining > 0) {
    const chunk = remaining % 1000;
    if (chunk > 0) {
      const chunkStr = convertThreeDigits(chunk);
      const stepStr = steps[stepIdx] ? ` ${steps[stepIdx]}` : '';
      result.unshift(chunkStr + stepStr);
    }
    remaining = Math.floor(remaining / 1000);
    stepIdx++;
  }

  return result.join(' و ');
}

export const PaymentAllocationModal: React.FC<PaymentAllocationModalProps> = ({
  isOpen,
  onClose,
  invoice,
  onConfirm,
}) => {
  const { state } = useInventory();

  const partnerInfo = state.warehouseProfile.partnerInfo || {
    partner1Name: 'شریک اول',
    partner2Name: 'شریک دوم',
    partner1SharePercent: 50,
    partner2SharePercent: 50,
  };
  const p1Name = partnerInfo.partner1Name || 'شریک اول';
  const p2Name = partnerInfo.partner2Name || 'شریک دوم';

  const totalAmount = invoice ? invoice.totalAmount : 0;

  // Cash payment amount
  const [cashAmount, setCashAmount] = useState<number>(totalAmount);

  // Cash receiver account: 'shared' | 'partner1' | 'partner2' | 'split_50_50'
  const [cashReceiver, setCashReceiver] = useState<'shared' | 'partner1' | 'partner2' | 'split_50_50'>('shared');

  // Cheques list
  const [cheques, setCheques] = useState<ChequeItem[]>([]);

  // Two-way auto-sync toggle (Active by default)
  const [autoSync, setAutoSync] = useState<boolean>(true);

  // Optional notes
  const [notes, setNotes] = useState<string>('');

  // Initialize or reset when modal opens
  useEffect(() => {
    if (invoice && isOpen) {
      const initialPaid = invoice.paidAmount ?? invoice.totalAmount;
      setCashAmount(initialPaid);
      setCashReceiver('shared');

      // Start with 1 cheque slot ready pre-filled with customer name
      setCheques([
        {
          id: `chq-${Date.now()}`,
          amount: 0,
          chequeNumber: '',
          dueDate: '',
          bankName: '',
          customerName: invoice.customerName || '',
          partnerAccount: 'shared',
        },
      ]);
      setAutoSync(true);
      setNotes(invoice.paymentAllocation?.notes || '');
    }
  }, [invoice, isOpen]);

  if (!isOpen || !invoice) return null;

  const totalChequesAmount = cheques.reduce((s, c) => s + (Number(c.amount) || 0), 0);
  const totalReceived = (Number(cashAmount) || 0) + totalChequesAmount;
  const diffFromTotal = totalAmount - totalReceived;

  // Handle cash change with two-way sync
  const handleCashChange = (newVal: number) => {
    const safeCash = Math.max(0, newVal);
    setCashAmount(safeCash);

    if (autoSync) {
      const remainingForCheques = Math.max(0, totalAmount - safeCash);
      if (cheques.length === 0) {
        if (remainingForCheques > 0) {
          setCheques([
            {
              id: `chq-${Date.now()}`,
              amount: remainingForCheques,
              chequeNumber: '',
              dueDate: '',
              bankName: '',
              customerName: invoice.customerName || '',
              partnerAccount: 'shared',
            },
          ]);
        }
      } else {
        // Adjust the last cheque to balance the total
        const otherChequesSum = cheques.slice(0, -1).reduce((s, c) => s + (Number(c.amount) || 0), 0);
        const lastChequeAmount = Math.max(0, remainingForCheques - otherChequesSum);
        setCheques((prev) =>
          prev.map((c, idx) => (idx === prev.length - 1 ? { ...c, amount: lastChequeAmount } : c))
        );
      }
    }
  };

  // Handle individual cheque amount change with two-way sync
  const handleChequeAmountChange = (idx: number, newAmt: number) => {
    const safeAmt = Math.max(0, newAmt);
    const updated = cheques.map((c, i) => (i === idx ? { ...c, amount: safeAmt } : c));
    setCheques(updated);

    if (autoSync) {
      const newTotalCheques = updated.reduce((s, c) => s + (Number(c.amount) || 0), 0);
      setCashAmount(Math.max(0, totalAmount - newTotalCheques));
    }
  };

  // Add another cheque
  const handleAddCheque = () => {
    const newCheque: ChequeItem = {
      id: `chq-${Date.now()}-${cheques.length}`,
      amount: 0,
      chequeNumber: '',
      dueDate: '',
      bankName: '',
      customerName: invoice.customerName || '',
      partnerAccount: 'shared',
    };
    setCheques((prev) => [...prev, newCheque]);
  };

  // Remove a cheque
  const handleRemoveCheque = (idx: number) => {
    const removedChequeAmt = Number(cheques[idx]?.amount) || 0;
    const updated = cheques.filter((_, i) => i !== idx);
    setCheques(updated);

    if (autoSync) {
      setCashAmount((prev) => prev + removedChequeAmt);
    }
  };

  // Form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Only include cheques with amount > 0
    const validCheques = cheques
      .filter((c) => Number(c.amount) > 0)
      .map((c) => ({
        amount: Number(c.amount),
        chequeNumber: c.chequeNumber.trim() || 'ثبت نشده',
        dueDate: c.dueDate.trim() || 'تعیین نشده',
        bankName: c.bankName.trim() || 'بانک مشتری',
        customerName: c.customerName.trim() || invoice.customerName || 'مشتری متفرقه',
        partnerAccount: c.partnerAccount || 'shared',
      }));

    // Calculate cash shares based on chosen account
    let p1Cash = 0;
    let p2Cash = 0;
    let shCash = 0;

    if (cashReceiver === 'partner1') {
      p1Cash = cashAmount;
    } else if (cashReceiver === 'partner2') {
      p2Cash = cashAmount;
    } else if (cashReceiver === 'split_50_50') {
      p1Cash = Math.round(cashAmount / 2);
      p2Cash = Math.round(cashAmount / 2);
    } else {
      shCash = cashAmount;
    }

    const allocation: PaymentAllocation = {
      paymentMethod: validCheques.length > 0 ? 'cheque' : 'cash',
      trackingNumber: '',
      receiverPartner: cashReceiver,
      partner1Amount: p1Cash,
      partner2Amount: p2Cash,
      sharedAmount: shCash,
      partner1Percent: cashAmount > 0 ? Math.round((p1Cash / cashAmount) * 100) : 0,
      partner2Percent: cashAmount > 0 ? Math.round((p2Cash / cashAmount) * 100) : 0,
      notes: notes.trim(),
      paidAt: getPersianDateString(),
    };

    onConfirm(allocation, validCheques);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-2xl w-full p-5 sm:p-7 my-auto text-right animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-base sm:text-lg font-black text-slate-900">
              تسویه حساب فاکتور {invoice.officialInvoiceNumber || invoice.invoiceNumber}
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              مشتری: <span className="font-bold text-slate-800">{invoice.customerName}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
            title="بستن پنجره"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-5 text-xs">
          
          {/* Top Banner: Total Invoice Amount with Persian Words */}
          <div className="bg-amber-500/10 border border-amber-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-[11px] font-bold text-slate-600 block">مبلغ کل فاکتور:</span>
              <span className="text-xl sm:text-2xl font-black text-amber-900 dir-ltr inline-block">
                {totalAmount.toLocaleString('fa-IR')} <span className="text-xs font-bold text-amber-700">تومان</span>
              </span>
              <span className="text-[11px] text-amber-800 font-bold block mt-0.5">
                ({numberToPersianWords(totalAmount)} تومان)
              </span>
            </div>

            {/* Auto-Sync Toggle */}
            <div className="flex items-center gap-2 bg-white/80 border border-amber-200/80 px-3 py-2 rounded-xl shrink-0">
              <label className="text-[11px] font-bold text-slate-700 cursor-pointer flex items-center gap-1.5 select-none">
                <input
                  type="checkbox"
                  checked={autoSync}
                  onChange={(e) => setAutoSync(e.target.checked)}
                  className="w-4 h-4 text-amber-600 rounded focus:ring-amber-500 border-slate-300 cursor-pointer"
                />
                <span>هماهنگی خودکار نقد و چک (سینک)</span>
              </label>
            </div>
          </div>

          {/* Section 1: Cash Payment */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
            <div className="flex justify-between items-center">
              <label className="block text-xs font-black text-slate-800 flex items-center gap-1.5">
                <Banknote className="w-4 h-4 text-emerald-600" />
                <span>مبلغ پرداخت نقدی (تومان):</span>
              </label>
              <button
                type="button"
                onClick={() => handleCashChange(totalAmount)}
                className="text-[10px] font-bold text-amber-700 hover:text-amber-900 bg-amber-100 hover:bg-amber-200 px-2 py-0.5 rounded cursor-pointer transition-colors"
                title="تمام مبلغ نقدی پرداخت شود"
              >
                پرداخت تماماً نقدی
              </button>
            </div>

            <div className="relative">
              <input
                type="number"
                min="0"
                step="1000"
                value={cashAmount === 0 ? '' : cashAmount}
                onChange={(e) => handleCashChange(Number(e.target.value) || 0)}
                placeholder="مبلغ پرداختی نقدی..."
                className="w-full p-3 bg-white border border-slate-300 rounded-xl font-black text-sm text-left text-slate-900 pl-16 focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 focus:outline-none"
              />
              <span className="absolute left-3 top-3 text-xs text-slate-400 font-bold">تومان</span>
            </div>

            {/* Live divider & Persian words badge */}
            {cashAmount > 0 && (
              <div className="text-[11px] font-bold text-emerald-800 flex flex-wrap items-center justify-between gap-1 pt-0.5">
                <span>معادل: {numberToPersianWords(cashAmount)} تومان</span>
                <span className="dir-ltr font-black text-slate-700">
                  {cashAmount.toLocaleString('fa-IR')} تومان
                </span>
              </div>
            )}

            {/* Cash Receiver Account Selector */}
            <div className="pt-2 border-t border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span className="text-[11px] font-extrabold text-slate-700 flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-amber-600" />
                واریز نقدی به حساب کدام شریک یا صندوق برود؟
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1">
                <button
                  type="button"
                  onClick={() => setCashReceiver('shared')}
                  className={`px-2.5 py-1.5 rounded-xl font-bold text-[10px] transition-all cursor-pointer truncate ${
                    cashReceiver === 'shared'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  حساب مشترک
                </button>
                <button
                  type="button"
                  onClick={() => setCashReceiver('partner1')}
                  className={`px-2.5 py-1.5 rounded-xl font-bold text-[10px] transition-all cursor-pointer truncate ${
                    cashReceiver === 'partner1'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {p1Name}
                </button>
                <button
                  type="button"
                  onClick={() => setCashReceiver('partner2')}
                  className={`px-2.5 py-1.5 rounded-xl font-bold text-[10px] transition-all cursor-pointer truncate ${
                    cashReceiver === 'partner2'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {p2Name}
                </button>
                <button
                  type="button"
                  onClick={() => setCashReceiver('split_50_50')}
                  className={`px-2.5 py-1.5 rounded-xl font-bold text-[10px] transition-all cursor-pointer truncate ${
                    cashReceiver === 'split_50_50'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  نصف / نصف
                </button>
              </div>
            </div>
          </div>

          {/* Section 2: Cheques Section */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
            <div className="flex justify-between items-center">
              <label className="block text-xs font-black text-slate-800 flex items-center gap-1.5">
                <Receipt className="w-4 h-4 text-amber-600" />
                <span>چک‌های دریافتی مشتری:</span>
              </label>
              <button
                type="button"
                onClick={handleAddCheque}
                className="flex items-center gap-1 text-[11px] font-black text-white bg-amber-600 hover:bg-amber-700 px-2.5 py-1 rounded-xl transition-all cursor-pointer shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>افزودن چک دیگر</span>
              </button>
            </div>

            {/* List of Cheques */}
            <div className="space-y-3">
              {cheques.map((ch, idx) => (
                <div
                  key={ch.id}
                  className="bg-white border border-slate-200 rounded-xl p-3.5 space-y-3 shadow-xs transition-all"
                >
                  {/* Cheque Card Header */}
                  <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
                    <span className="font-extrabold text-[11px] text-slate-700 flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-amber-500 inline-block"></span>
                      مشخصات چک {idx + 1}:
                    </span>
                    {cheques.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveCheque(idx)}
                        className="text-rose-600 hover:text-rose-800 hover:bg-rose-50 p-1 rounded-lg transition-colors cursor-pointer"
                        title="حذف این چک"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Cheque Fields Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    {/* Cheque Amount Input */}
                    <div className="sm:col-span-1">
                      <label className="block text-[10px] font-bold text-slate-600 mb-1">
                        مبلغ چک (تومان):
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          min="0"
                          step="1000"
                          value={ch.amount === 0 ? '' : ch.amount}
                          onChange={(e) => handleChequeAmountChange(idx, Number(e.target.value) || 0)}
                          placeholder="مبلغ چک..."
                          className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-black text-xs text-left text-slate-900 pl-12 focus:ring-2 focus:ring-amber-500/20 focus:outline-none"
                        />
                        <span className="absolute left-2 top-2 text-[10px] text-slate-400 font-bold">تومان</span>
                      </div>
                    </div>

                    {/* Due Date */}
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-1">
                        تاریخ سررسید چک:
                      </label>
                      <input
                        type="text"
                        value={ch.dueDate}
                        onChange={(e) => {
                          const val = e.target.value;
                          setCheques((prev) =>
                            prev.map((item, i) => (i === idx ? { ...item, dueDate: val } : item))
                          );
                        }}
                        placeholder="مثلاً: ۱۴۰۳/۱۰/۱۵"
                        className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-bold text-xs text-center text-slate-800 focus:outline-none"
                      />
                    </div>

                    {/* Partner Account Destination */}
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-1">
                        واریز چک به حساب کدام شریک؟
                      </label>
                      <select
                        value={ch.partnerAccount}
                        onChange={(e: any) => {
                          const val = e.target.value;
                          setCheques((prev) =>
                            prev.map((item, i) => (i === idx ? { ...item, partnerAccount: val } : item))
                          );
                        }}
                        className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-bold text-xs text-slate-800 focus:outline-none"
                      >
                        <option value="shared">حساب مشترک انبار</option>
                        <option value="partner1">{p1Name}</option>
                        <option value="partner2">{p2Name}</option>
                      </select>
                    </div>

                    {/* Customer Name / Cheque Issuer */}
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-1">
                        نام صاحب چک / خریدار:
                      </label>
                      <input
                        type="text"
                        value={ch.customerName}
                        onChange={(e) => {
                          const val = e.target.value;
                          setCheques((prev) =>
                            prev.map((item, i) => (i === idx ? { ...item, customerName: val } : item))
                          );
                        }}
                        placeholder="نام صاحب چک یا خریدار..."
                        className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-bold text-xs text-slate-800 focus:outline-none"
                      />
                    </div>

                    {/* Cheque No */}
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-1">
                        شماره صیاد / چک:
                      </label>
                      <input
                        type="text"
                        value={ch.chequeNumber}
                        onChange={(e) => {
                          const val = e.target.value;
                          setCheques((prev) =>
                            prev.map((item, i) => (i === idx ? { ...item, chequeNumber: val } : item))
                          );
                        }}
                        placeholder="شماره ۱۶ رقمی صیادی..."
                        className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-bold text-xs text-slate-800 focus:outline-none"
                      />
                    </div>

                    {/* Bank Name */}
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-1">
                        بانک صادرکننده:
                      </label>
                      <input
                        type="text"
                        value={ch.bankName}
                        onChange={(e) => {
                          const val = e.target.value;
                          setCheques((prev) =>
                            prev.map((item, i) => (i === idx ? { ...item, bankName: val } : item))
                          );
                        }}
                        placeholder="مثلاً: ملی، صادرات..."
                        className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-bold text-xs text-slate-800 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Live cheque divider & words */}
                  {ch.amount > 0 && (
                    <div className="bg-amber-50/60 border border-amber-200/50 p-2 rounded-lg text-[10px] flex flex-wrap items-center justify-between gap-1 text-amber-950 font-bold">
                      <span>معادل: {numberToPersianWords(ch.amount)} تومان</span>
                      <span className="dir-ltr text-amber-900 font-black">
                        {ch.amount.toLocaleString('fa-IR')} تومان
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Bottom Live Balance Summary */}
          <div className="bg-slate-100 border border-slate-200 rounded-2xl p-3.5 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex flex-wrap items-center gap-4 text-slate-700 font-bold">
              <span>
                نقد: <strong className="text-slate-900 font-black">{cashAmount.toLocaleString('fa-IR')}</strong> تومان
              </span>
              <span>+</span>
              <span>
                چک: <strong className="text-slate-900 font-black">{totalChequesAmount.toLocaleString('fa-IR')}</strong> تومان
              </span>
              <span>=</span>
              <span>
                مجموع دریافتی:{' '}
                <strong className="text-emerald-700 font-black text-sm">
                  {totalReceived.toLocaleString('fa-IR')}
                </strong>{' '}
                تومان
              </span>
            </div>

            {/* Status indicator */}
            <div>
              {diffFromTotal === 0 ? (
                <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 font-black px-2.5 py-1 rounded-xl text-[11px] border border-emerald-200">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>تسویه کامل ۱۰۰٪</span>
                </span>
              ) : diffFromTotal > 0 ? (
                <span className="inline-flex items-center gap-1 bg-rose-100 text-rose-800 font-black px-2.5 py-1 rounded-xl text-[11px] border border-rose-200">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>مانده بدهی مشتری: {diffFromTotal.toLocaleString('fa-IR')} تومان</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 font-black px-2.5 py-1 rounded-xl text-[11px] border border-amber-200">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>اضافه پرداختی: {Math.abs(diffFromTotal).toLocaleString('fa-IR')} تومان</span>
                </span>
              )}
            </div>
          </div>

          {/* Optional Notes */}
          <div>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="توضیحات و ملاحظات تسویه (اختیاری)..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:bg-white"
            />
          </div>

          {/* Footer Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-colors cursor-pointer text-xs"
            >
              انصراف
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-md transition-all cursor-pointer flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>تایید و صدور فاکتور رسمی</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
