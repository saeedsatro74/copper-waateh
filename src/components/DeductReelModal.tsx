import React, { useState, useEffect } from 'react';
import { X, Layers, ArrowRightLeft, Scissors, Calculator } from 'lucide-react';
import { StandaloneReelItem } from '../types';
import { formatKg, formatPersianNumber } from '../utils/persian';
import { estimateCopperWeightPerMeter } from '../utils/copper';

interface DeductReelModalProps {
  reel: StandaloneReelItem | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (deductKg: number, notes?: string) => void;
}

export const DeductReelModal: React.FC<DeductReelModalProps> = ({
  reel,
  isOpen,
  onClose,
  onConfirm,
}) => {
  const [mode, setMode] = useState<'kg' | 'meters'>('kg');
  const [deductKgInput, setDeductKgInput] = useState<string>('10');
  const [metersInput, setMetersInput] = useState<string>('20');
  const [notes, setNotes] = useState<string>('');

  useEffect(() => {
    if (reel && mode === 'meters') {
      const weightPerMeter = estimateCopperWeightPerMeter(reel.diameter, reel.thickness);
      const meters = parseFloat(metersInput) || 0;
      const calculatedKg = Math.round(meters * weightPerMeter * 100) / 100;
      setDeductKgInput(calculatedKg.toString());
    }
  }, [reel, mode, metersInput]);

  if (!isOpen || !reel) return null;

  const weightPerMeter = estimateCopperWeightPerMeter(reel.diameter, reel.thickness);
  const deductKg = parseFloat(deductKgInput) || 0;
  const remainingWeight = Math.max(0, reel.weightKg - deductKg);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (deductKg <= 0) return;
    const notesText =
      notes ||
      (mode === 'meters'
        ? `برداشت ${metersInput} متر (معادل ${deductKg} کیلوگرم) و انتقال باقیمانده به خورده‌فروشی`
        : `برداشت ${deductKg} کیلوگرم و انتقال باقیمانده به خورده‌فروشی`);
    onConfirm(deductKg, notesText);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-amber-600 text-white p-5 flex items-center justify-between">
          <div className="flex items-center space-x-2 space-x-reverse">
            <Scissors className="w-5 h-5" />
            <h3 className="font-bold text-base">برداشت از قرقره و انتقال به خورده</h3>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Reel Info */}
          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-1.5 text-xs">
            <div className="flex justify-between font-bold text-slate-900">
              <span>قرقره: {reel.reelCode}</span>
              <span className="text-amber-700">برند {reel.brand}</span>
            </div>
            <div className="text-slate-600">
              سایز: {reel.thickness}mm / {reel.diameter}
            </div>
            <div className="text-slate-900 font-bold pt-1 border-t border-slate-200">
              وزن کامل قرقره: {formatKg(reel.weightKg)}
            </div>
          </div>

          {/* Mode Selector (Kg vs Meters) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              روش برداشت:
            </label>
            <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setMode('kg')}
                className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  mode === 'kg'
                    ? 'bg-white text-amber-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                بر اساس کیلوگرم (Kg)
              </button>
              <button
                type="button"
                onClick={() => setMode('meters')}
                className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  mode === 'meters'
                    ? 'bg-white text-amber-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                بر اساس متر (Meters)
              </button>
            </div>
          </div>

          {/* Mode Fields */}
          {mode === 'meters' ? (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  متراژ مورد نیاز (متر):
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0.5"
                  required
                  value={metersInput}
                  onChange={(e) => setMetersInput(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-sm font-bold text-slate-900 focus:outline-hidden focus:border-amber-500 dir-ltr text-right"
                  placeholder="مثلاً ۲۰ متر"
                />
              </div>

              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs flex items-center justify-between">
                <span className="text-slate-500">تخمین وزن هر متر (سایز {reel.diameter}):</span>
                <span className="font-bold text-slate-800">~{weightPerMeter} کیلوگرم/متر</span>
              </div>
            </div>
          ) : null}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              وزن برداشتی (کیلوگرم):
            </label>
            <input
              type="number"
              step="0.1"
              min="0.1"
              max={reel.weightKg}
              required
              value={deductKgInput}
              onChange={(e) => setDeductKgInput(e.target.value)}
              className="w-full p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-sm font-bold text-slate-900 focus:outline-hidden focus:border-amber-500 dir-ltr text-right"
              placeholder="مثلاً ۱۰"
            />
          </div>

          {/* Preview Card */}
          <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs space-y-1.5">
            <div className="flex justify-between text-slate-700">
              <span>مقدار برداشتی:</span>
              <span className="font-bold text-rose-600">{formatKg(deductKg)}</span>
            </div>
            <div className="flex justify-between text-slate-900 font-bold border-t border-amber-200/80 pt-1.5">
              <span>وزن باقیمانده قرقره:</span>
              <span className="text-emerald-700">{formatKg(remainingWeight)}</span>
            </div>
            {remainingWeight > 0 && (
              <p className="text-[11px] text-amber-800 pt-1 font-medium leading-relaxed">
                ⚡ باقیمانده قرقره ({formatKg(remainingWeight)}) به طور خودکار به دسته <b>خورده‌فروشی</b> منتقل خواهد شد.
              </p>
            )}
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
              placeholder="توضیحات (مثلاً برش ۲۰ متر برای پروژه)"
              className="w-full p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-800"
            />
          </div>

          {/* Actions */}
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
              disabled={deductKg <= 0 || deductKg > reel.weightKg}
              className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-bold text-xs shadow-md cursor-pointer"
            >
              ثبت و انتقال خودکار باقیمانده به خورده
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
