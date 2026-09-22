import React, { useState } from 'react';
import { X, MinusCircle, Scissors, AlertCircle } from 'lucide-react';
import { LooseItem } from '../types';
import { formatKg, formatPersianNumber } from '../utils/persian';

interface DeductLooseModalProps {
  item: LooseItem | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (deductKg: number, notes?: string) => void;
}

export const DeductLooseModal: React.FC<DeductLooseModalProps> = ({
  item,
  isOpen,
  onClose,
  onConfirm,
}) => {
  const [deductKgInput, setDeductKgInput] = useState<string>('5');
  const [notes, setNotes] = useState<string>('');

  if (!isOpen || !item) return null;

  const deductKg = parseFloat(deductKgInput) || 0;
  const remainingWeight = Math.max(0, item.weightKg - deductKg);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (deductKg <= 0) return;
    onConfirm(deductKg, notes);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-amber-600 text-white p-5 flex items-center justify-between">
          <div className="flex items-center space-x-2 space-x-reverse">
            <Scissors className="w-5 h-5" />
            <h3 className="font-bold text-base">برداشت / کسر وزن از بار خورده</h3>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Info Card */}
          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-1.5 text-xs">
            <div className="flex justify-between font-bold text-slate-900">
              <span>بار خورده: {item.code}</span>
              <span className="text-amber-700">برند {item.brand}</span>
            </div>
            <div className="text-slate-600">
              سایز: {item.thickness}mm / {item.diameter}
            </div>
            <div className="text-slate-900 font-bold pt-1 border-t border-slate-200">
              وزن فعلی: {formatKg(item.weightKg)}
            </div>
          </div>

          {/* Deduct Input */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              مقدار برداشتی (کیلوگرم):
            </label>
            <input
              type="number"
              step="0.1"
              min="0.1"
              max={item.weightKg}
              required
              value={deductKgInput}
              onChange={(e) => setDeductKgInput(e.target.value)}
              className="w-full p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-sm font-bold text-slate-900 focus:outline-hidden focus:border-amber-500 dir-ltr text-right"
              placeholder="مثلاً ۵"
            />
          </div>

          {/* Weight Preview */}
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs space-y-1">
            <div className="flex justify-between text-slate-700">
              <span>مقدار برداشتی:</span>
              <span className="font-bold text-rose-600">{formatKg(deductKg)}</span>
            </div>
            <div className="flex justify-between text-slate-900 font-bold border-t border-amber-200/60 pt-1">
              <span>وزن باقیمانده بار:</span>
              <span className="text-emerald-700">{formatKg(remainingWeight)}</span>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              توضیحات (اختیاری):
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="علت کسر (مثلاً فروش ۵ کیلو به مشتری)"
              className="w-full p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-800"
            />
          </div>

          {/* Submit Actions */}
          <div className="pt-2 flex justify-end space-x-2 space-x-reverse">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold"
            >
              انصراف
            </button>
            <button
              type="submit"
              disabled={deductKg <= 0 || deductKg > item.weightKg}
              className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-bold text-xs shadow-md cursor-pointer"
            >
              ثبت کسر وزن
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
