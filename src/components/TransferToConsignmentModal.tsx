import React, { useState } from 'react';
import {
  X,
  PackageCheck,
  Calendar,
  User,
  Phone,
  FileText,
  DollarSign,
  AlertCircle,
  Handshake,
} from 'lucide-react';
import { useInventory } from '../context/InventoryContext';

interface TransferToConsignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TransferToConsignmentModal: React.FC<TransferToConsignmentModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { selectedItems, transferToConsignment } = useInventory();

  const [recipientName, setRecipientName] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [expectedReturnDate, setExpectedReturnDate] = useState('');
  const [unitPrice, setUnitPrice] = useState<number>(3500000);
  const [notes, setNotes] = useState('');

  if (!isOpen) return null;

  const totalWeight = selectedItems.reduce((acc, i) => acc + i.weightKg, 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipientName.trim()) {
      alert('لطفاً نام امانت‌گیرنده را وارد کنید.');
      return;
    }

    transferToConsignment(
      selectedItems,
      recipientName.trim(),
      recipientPhone.trim(),
      expectedReturnDate.trim(),
      notes.trim(),
      unitPrice
    );

    // Reset form
    setRecipientName('');
    setRecipientPhone('');
    setExpectedReturnDate('');
    setNotes('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-lg w-full p-4 sm:p-6 my-auto text-right animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center space-x-2 space-x-reverse">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center border border-amber-200 shadow-xs">
              <Handshake className="w-5 h-5 text-amber-700" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900">
                خروج کالا به صورت امانی
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                تعداد اقلام انتخابی: <span className="font-bold text-amber-700">{selectedItems.length} مورد</span> (
                {totalWeight.toLocaleString('fa-IR')} کیلوگرم)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
          {/* Items Summary */}
          <div className="bg-amber-50/70 p-3 rounded-2xl border border-amber-200 text-xs text-amber-900 max-h-28 overflow-y-auto space-y-1">
            <span className="font-bold block mb-1">اقلام انتخابی جهت امانت:</span>
            {selectedItems.map((item) => (
              <div key={`${item.id}-${item.subItemId || ''}`} className="flex justify-between items-center text-[11px] border-b border-amber-200/60 pb-0.5">
                <span>{item.description} ({item.brand})</span>
                <span className="font-black text-amber-800">{item.weightKg} کیلوگرم</span>
              </div>
            ))}
          </div>

          {/* Recipient Name */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">
              نام و نام خانوادگی امانت‌گیرنده / شرکت <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                required
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                placeholder="مثلاً: مهندس احمدی - شرکت تهویه البرز"
                className="w-full pl-3 pr-9 py-2 rounded-xl border border-slate-300 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
              <User className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
            </div>
          </div>

          {/* Recipient Phone & Expected Return Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                شماره تماس امانت‌گیرنده:
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={recipientPhone}
                  onChange={(e) => setRecipientPhone(e.target.value)}
                  placeholder="مثلاً: ۰۹۱۲۳۴۵۶۷۸۹"
                  className="w-full pl-3 pr-9 py-2 rounded-xl border border-slate-300 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <Phone className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                تاریخ بازگشت احتمالی:
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={expectedReturnDate}
                  onChange={(e) => setExpectedReturnDate(e.target.value)}
                  placeholder="مثلاً: ۱۴۰۳/۰۷/۱۰"
                  className="w-full pl-3 pr-9 py-2 rounded-xl border border-slate-300 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <Calendar className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
              </div>
            </div>
          </div>

          {/* Unit Price Estimation */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">
              قیمت امانی پایه (ارزش تخمینی هر کیلوگرم - تومان):
            </label>
            <input
              type="number"
              step="50000"
              value={unitPrice}
              onChange={(e) => setUnitPrice(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">
              توضیحات و علت امانت:
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="مثلاً: جهت تست پروژه خط ۲ کارخانه"
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-[11px] text-slate-600 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              با ثبت این فرم، اقلام انتخابی از موجودی فعال انبار کسر شده و به لیست امانی‌ها منتقل می‌گردند.
            </span>
          </div>

          {/* Submit */}
          <div className="flex items-center justify-end space-x-2 space-x-reverse pt-2 border-t border-slate-100">
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
              <Handshake className="w-4 h-4" />
              <span>ثبت و خروج امانی کالا</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
