import React, { useState, useEffect } from 'react';
import {
  X,
  CheckCircle2,
  Users,
  CreditCard,
  Building2,
  Banknote,
  AlertCircle,
  Calculator,
} from 'lucide-react';
import { useInventory } from '../context/InventoryContext';
import { Invoice, PaymentAllocation } from '../types';
import { formatToman } from '../utils/persian';

interface PaymentAllocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: Invoice | null;
  onConfirm: (
    allocation: PaymentAllocation,
    chequesList?: { amount: number; chequeNumber: string; dueDate: string; bankName: string }[]
  ) => void;
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

  const totalAmount = invoice ? invoice.totalAmount : 0;

  // Paid amount input
  const [paidAmountInput, setPaidAmountInput] = useState<number>(totalAmount);
  
  // Manual amounts for 3 accounts
  const [p1AmountInput, setP1AmountInput] = useState<number>(totalAmount / 2);
  const [p2AmountInput, setP2AmountInput] = useState<number>(totalAmount / 2);
  const [sharedAmountInput, setSharedAmountInput] = useState<number>(0);

  const [paymentMethod, setPaymentMethod] = useState<
    'cash' | 'card' | 'bank_transfer' | 'cheque' | 'shared_account'
  >('shared_account');

  const [trackingNumber, setTrackingNumber] = useState('');
  const [notes, setNotes] = useState('');

  // Cheques inputs states
  const [chequeList, setChequeList] = useState<{ amount: number; chequeNumber: string; dueDate: string; bankName: string }[]>([]);
  const [newChequeAmt, setNewChequeAmt] = useState<string>('');
  const [newChequeNum, setNewChequeNum] = useState<string>('');
  const [newChequeDue, setNewChequeDue] = useState<string>('');
  const [newChequeBank, setNewChequeBank] = useState<string>('');

  // Update defaults when modal opens for invoice
  useEffect(() => {
    if (invoice) {
      const initialPaid = invoice.paidAmount ?? invoice.totalAmount;
      setPaidAmountInput(initialPaid);

      if (invoice.paymentAllocation) {
        setP1AmountInput(invoice.paymentAllocation.partner1Amount || 0);
        setP2AmountInput(invoice.paymentAllocation.partner2Amount || 0);
        setSharedAmountInput(invoice.paymentAllocation.sharedAmount || 0);
        setPaymentMethod(invoice.paymentAllocation.paymentMethod || 'shared_account');
        setTrackingNumber(invoice.paymentAllocation.trackingNumber || '');
        setNotes(invoice.paymentAllocation.notes || '');
      } else {
        // Default to shared account or 50/50
        setP1AmountInput(initialPaid / 2);
        setP2AmountInput(initialPaid / 2);
        setSharedAmountInput(0);
      }
    }
  }, [invoice, isOpen]);

  if (!isOpen || !invoice) return null;

  const remainingAmount = Math.max(0, totalAmount - (paidAmountInput || 0));
  const currentAllocatedTotal = (p1AmountInput || 0) + (p2AmountInput || 0) + (sharedAmountInput || 0);
  const allocationDiff = (paidAmountInput || 0) - currentAllocatedTotal;

  // Quick allocation buttons
  const handlePresetAllocation = (type: 'split_50_50' | 'shared' | 'partner1' | 'partner2') => {
    const paid = paidAmountInput || 0;
    if (type === 'split_50_50') {
      setP1AmountInput(paid / 2);
      setP2AmountInput(paid / 2);
      setSharedAmountInput(0);
    } else if (type === 'shared') {
      setP1AmountInput(0);
      setP2AmountInput(0);
      setSharedAmountInput(paid);
    } else if (type === 'partner1') {
      setP1AmountInput(paid);
      setP2AmountInput(0);
      setSharedAmountInput(0);
    } else if (type === 'partner2') {
      setP1AmountInput(0);
      setP2AmountInput(paid);
      setSharedAmountInput(0);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const allocation: PaymentAllocation = {
      paymentMethod,
      trackingNumber: trackingNumber.trim(),
      receiverPartner: 'manual',
      partner1Amount: p1AmountInput || 0,
      partner2Amount: p2AmountInput || 0,
      sharedAmount: sharedAmountInput || 0,
      partner1Percent: paidAmountInput ? Math.round(((p1AmountInput || 0) / paidAmountInput) * 100) : 0,
      partner2Percent: paidAmountInput ? Math.round(((p2AmountInput || 0) / paidAmountInput) * 100) : 0,
      notes: notes.trim(),
      paidAt: new Date().toLocaleDateString('fa-IR'),
    };

    onConfirm(allocation, chequeList);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-xl w-full p-4 sm:p-6 my-auto text-right animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center space-x-2.5 space-x-reverse">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center border border-amber-200 shadow-xs">
              <Users className="w-5 h-5 text-amber-700" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900">
                ثبت دریافت وجه و تخصیص به ۳ حساب
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                فاکتور شماره {invoice.invoiceNumber} - خریدار: <span className="font-bold text-slate-800">{invoice.customerName}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Invoice Financial Summary Card */}
          <div className="bg-slate-900 text-white p-4 rounded-2xl space-y-2 text-xs shadow-md">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
              <span className="text-slate-300 font-medium">مبلغ کل فاکتور:</span>
              <span className="text-base font-black text-amber-400">
                {totalAmount.toLocaleString('fa-IR')} تومان
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">
                  مبلغ دریافتی / پرداختی خریدار (تومان):
                </label>
                <input
                  type="number"
                  value={paidAmountInput || ''}
                  onChange={(e) => {
                    const val = Number(e.target.value) || 0;
                    setPaidAmountInput(val);
                  }}
                  className="w-full p-2 bg-slate-800 border border-slate-700 rounded-xl text-white font-bold text-xs text-left text-amber-300 focus:outline-none focus:border-amber-500"
                  placeholder="مبلغ پرداختی"
                />
              </div>

              <div className="bg-slate-800/80 p-2 rounded-xl border border-slate-700/80 flex flex-col justify-center">
                <span className="text-[10px] text-slate-400 font-medium">مانده بدهی فاکتور:</span>
                <span className={`text-xs font-black ${remainingAmount > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {remainingAmount.toLocaleString('fa-IR')} تومان
                </span>
              </div>
            </div>
          </div>

          {/* Preset Buttons for Quick Allocation */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1.5">
              میانبرهای تقسیم سریع واریزی:
            </label>
            <div className="grid grid-cols-3 gap-2 text-[11px] font-bold">
              <button
                type="button"
                onClick={() => handlePresetAllocation('shared')}
                className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-amber-50 hover:border-amber-300 hover:text-amber-900 text-slate-700 text-center transition-all cursor-pointer text-xs"
              >
                تماماً حساب مشترک
              </button>
              <button
                type="button"
                onClick={() => handlePresetAllocation('partner1')}
                className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-amber-50 hover:border-amber-300 hover:text-amber-900 text-slate-700 text-center transition-all cursor-pointer text-xs truncate"
              >
                تماماً {partnerInfo.partner1Name}
              </button>
              <button
                type="button"
                onClick={() => handlePresetAllocation('partner2')}
                className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-amber-50 hover:border-amber-300 hover:text-amber-900 text-slate-700 text-center transition-all cursor-pointer text-xs truncate"
              >
                تماماً {partnerInfo.partner2Name}
              </button>
            </div>
          </div>

          {/* Manual Amounts for 3 Accounts */}
          <div className="bg-amber-50/60 p-3.5 rounded-2xl border border-amber-200/80 space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-black text-amber-950 flex items-center space-x-1 space-x-reverse">
                <Calculator className="w-4 h-4 text-amber-700" />
                <span>ورود دستی سهم ۳ حساب (به تومان):</span>
              </h3>
              {allocationDiff !== 0 && (
                <span className={`text-[11px] font-bold ${allocationDiff < 0 ? 'text-rose-600' : 'text-amber-700'}`}>
                  {allocationDiff > 0 ? `اختصاص داده نشده: ${allocationDiff.toLocaleString('fa-IR')}` : `اضافه تخصیص: ${Math.abs(allocationDiff).toLocaleString('fa-IR')}`}
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {/* Admin 1 */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1 truncate">
                  سهم {partnerInfo.partner1Name}:
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={p1AmountInput || ''}
                    onChange={(e) => setP1AmountInput(Number(e.target.value) || 0)}
                    className="w-full p-2 text-xs font-bold text-slate-900 bg-white rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500 text-left pl-7"
                    placeholder="0"
                  />
                  <span className="absolute left-2 top-2 text-[10px] text-slate-400 font-medium">تومان</span>
                </div>
              </div>

              {/* Admin 2 */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1 truncate">
                  سهم {partnerInfo.partner2Name}:
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={p2AmountInput || ''}
                    onChange={(e) => setP2AmountInput(Number(e.target.value) || 0)}
                    className="w-full p-2 text-xs font-bold text-slate-900 bg-white rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500 text-left pl-7"
                    placeholder="0"
                  />
                  <span className="absolute left-2 top-2 text-[10px] text-slate-400 font-medium">تومان</span>
                </div>
              </div>

              {/* Shared Account */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1 truncate">
                  سهم حساب مشترک:
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={sharedAmountInput || ''}
                    onChange={(e) => setSharedAmountInput(Number(e.target.value) || 0)}
                    className="w-full p-2 text-xs font-bold text-slate-900 bg-white rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500 text-left pl-7"
                    placeholder="0"
                  />
                  <span className="absolute left-2 top-2 text-[10px] text-slate-400 font-medium">تومان</span>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Method & Tracking Number */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                روش واریز / پرداخت:
              </label>
              <select
                value={paymentMethod}
                onChange={(e: any) => setPaymentMethod(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="shared_account">حساب بانکی مشترک شراکت</option>
                <option value="card">کارت به کارت مستقیم</option>
                <option value="bank_transfer">حواله پایا / ساتنا</option>
                <option value="cheque">چک صیادی / فیش بانکی</option>
                <option value="cash">نقدی / حساب صندوق</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                شماره پیگیری / فیش / چک:
              </label>
              <input
                type="text"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                placeholder="مثلا: ۹۸۴۵۱۲۹۹۰۱"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              توضیحات و ملاحظات تسویه:
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="مثلا: واریز نقدی ۵۰ میلیون به شریک اول و مابقی به شریک دوم"
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {/* بخش ثبت چک‌های دریافتی فاکتور */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-4 text-right">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2 flex-wrap gap-2">
              <h3 className="text-xs sm:text-sm font-black text-slate-800 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0"></span>
                ثبت چک‌های دریافتی از مشتری برای فاکتور رسمی
              </h3>
              <span className="text-[10px] text-slate-500 font-medium">
                (مبلغ چک‌ها از موجودی نقدی شریک کسر می‌شود)
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
                      Math.max(0, (paidAmountInput || 0) - chequeList.reduce((s, c) => s + c.amount, 0))
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
                
                <div className="grid grid-cols-2 gap-2 text-right">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">مبلغ چک (تومان):</label>
                    <input
                      type="number"
                      placeholder="مثلاً: ۲۰۰۰۰۰۰"
                      value={newChequeAmt}
                      onChange={(e) => setNewChequeAmt(e.target.value)}
                      className="w-full p-2 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-800 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">شماره چک / صیاد:</label>
                    <input
                      type="text"
                      placeholder="مثلاً: ۱۲۳۴۵۶"
                      value={newChequeNum}
                      onChange={(e) => setNewChequeNum(e.target.value)}
                      className="w-full p-2 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-800 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">بانک صادرکننده:</label>
                    <input
                      type="text"
                      placeholder="مثلاً: ملی"
                      value={newChequeBank}
                      onChange={(e) => setNewChequeBank(e.target.value)}
                      className="w-full p-2 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-800 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">تاریخ سررسید چک:</label>
                    <input
                      type="text"
                      placeholder="مثلاً: ۱۴۰۳/۰۹/۱۵"
                      value={newChequeDue}
                      onChange={(e) => setNewChequeDue(e.target.value)}
                      className="w-full p-2 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-800 text-center focus:outline-none"
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
                  className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white font-black rounded-lg text-[11px] transition-colors cursor-pointer"
                >
                  ثبت و افزودن چک به فاکتور رسمی
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

          {/* Buttons */}
          <div className="flex items-center justify-end space-x-2 space-x-reverse pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50 cursor-pointer"
            >
              انصراف
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-black text-xs shadow-md transition-all cursor-pointer flex items-center space-x-1.5 space-x-reverse"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>ثبت و صدور فاکتور رسمی خروج</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
