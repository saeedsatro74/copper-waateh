import React, { useState } from 'react';
import {
  X,
  Calculator,
  Ruler,
  Weight,
  CircleDot,
  Copy,
  Check,
  PlusCircle,
} from 'lucide-react';
import {
  THICKNESS_OPTIONS,
  DIAMETER_OPTIONS,
  ThicknessUnitMode,
  DiameterUnitMode,
} from '../types';
import {
  formatThickness,
  formatDiameter,
  calculateTotalCopperWeightKg,
  getDiameterMm,
  getThicknessMm,
} from '../utils/copper';
import { formatKg, formatPersianNumber } from '../utils/persian';

interface CalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenStockEntryWithData?: (data: {
    category: 'coil' | 'branch';
    diameter: string;
    thickness: string;
    weightKg: number;
    lengthMeters: number;
  }) => void;
}

export const CalculatorModal: React.FC<CalculatorModalProps> = ({
  isOpen,
  onClose,
  onOpenStockEntryWithData,
}) => {
  const [diameterUnit, setDiameterUnit] = useState<DiameterUnitMode>('inch');
  const [thicknessUnit, setThicknessUnit] = useState<ThicknessUnitMode>('mm');

  const [selectedDiameter, setSelectedDiameter] = useState<string>('3/8"');
  const [customDiameterMm, setCustomDiameterMm] = useState<number>(9.52);
  const [isCustomDiameter, setIsCustomDiameter] = useState<boolean>(false);

  const [selectedThickness, setSelectedThickness] = useState<string>('0.75');
  const [customThicknessMm, setCustomThicknessMm] = useState<number>(0.75);
  const [isCustomThickness, setIsCustomThickness] = useState<boolean>(false);

  const [lengthMeters, setLengthMeters] = useState<number>(50);
  const [quantity, setQuantity] = useState<number>(1);
  const [copied, setCopied] = useState<boolean>(false);

  if (!isOpen) return null;

  const currentDiameterMm = isCustomDiameter
    ? customDiameterMm
    : getDiameterMm(selectedDiameter);

  const currentThicknessMm = isCustomThickness
    ? customThicknessMm
    : getThicknessMm(selectedThickness);

  const { weightPerMeterKg, totalWeightKg } = calculateTotalCopperWeightKg(
    currentDiameterMm,
    currentThicknessMm,
    lengthMeters,
    quantity
  );

  const handleCopyResult = () => {
    const text = `محاسبه وزن لوله مس:
قطر: ${isCustomDiameter ? `${currentDiameterMm} mm` : selectedDiameter}
ضخامت: ${isCustomThickness ? `${currentThicknessMm} mm` : `${selectedThickness} mm`}
طول: ${lengthMeters} متر
وزن کل: ${totalWeightKg} کیلوگرم`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleTransferToStock = () => {
    if (onOpenStockEntryWithData) {
      onOpenStockEntryWithData({
        category: 'coil',
        diameter: isCustomDiameter ? `${currentDiameterMm}mm` : selectedDiameter,
        thickness: isCustomThickness ? `${currentThicknessMm}` : selectedThickness,
        weightKg: totalWeightKg,
        lengthMeters: lengthMeters,
      });
    }
    onClose();
  };

  const standardLengths = [5, 15, 30, 50, 100];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200 text-right">
        {/* Header */}
        <div className="bg-amber-600 text-white p-4 flex items-center justify-between">
          <div className="flex items-center space-x-2 space-x-reverse">
            <Calculator className="w-5 h-5 text-amber-100" />
            <h3 className="font-bold text-sm sm:text-base">ماشین حساب سریع وزن لوله مس</h3>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 sm:p-5 space-y-4 max-h-[85vh] overflow-y-auto">
          {/* DIAMETER */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black text-slate-800 flex items-center gap-1">
                <CircleDot className="w-4 h-4 text-amber-600" />
                <span>۱. قطر لوله:</span>
              </label>
              <div className="flex bg-slate-100 p-0.5 rounded-lg text-[10px] font-bold">
                <button
                  type="button"
                  onClick={() => setDiameterUnit('inch')}
                  className={`px-2 py-0.5 rounded ${
                    diameterUnit === 'inch' ? 'bg-amber-600 text-white shadow-xs' : 'text-slate-600'
                  }`}
                >
                  اینچ
                </button>
                <button
                  type="button"
                  onClick={() => setDiameterUnit('mm')}
                  className={`px-2 py-0.5 rounded ${
                    diameterUnit === 'mm' ? 'bg-amber-600 text-white shadow-xs' : 'text-slate-600'
                  }`}
                >
                  میلی‌متر
                </button>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-1">
              {DIAMETER_OPTIONS.slice(0, 8).map((opt) => {
                const isSelected = !isCustomDiameter && selectedDiameter === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      setSelectedDiameter(opt.value);
                      setIsCustomDiameter(false);
                    }}
                    className={`py-1.5 px-1 rounded-lg text-[11px] font-bold transition-all border text-center cursor-pointer ${
                      isSelected
                        ? 'bg-amber-600 text-white border-amber-700 font-black shadow-xs'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {formatDiameter(opt.value, diameterUnit)}
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => setIsCustomDiameter(true)}
                className={`py-1.5 px-1 rounded-lg text-[11px] font-bold transition-all border text-center cursor-pointer col-span-4 ${
                  isCustomDiameter
                    ? 'bg-amber-600 text-white border-amber-700 font-black shadow-xs'
                    : 'bg-slate-100 border-slate-300 text-slate-800 hover:bg-slate-200'
                }`}
              >
                {isCustomDiameter ? `قطر سفارشی: ${customDiameterMm}mm` : 'ورود قطر سفارشی...'}
              </button>
            </div>

            {isCustomDiameter && (
              <div className="p-2 bg-amber-50 rounded-xl border border-amber-200 flex items-center justify-between mt-1 text-xs">
                <span className="font-bold text-amber-900">اندازه قطر (میلی‌متر):</span>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    value={customDiameterMm}
                    onChange={(e) => setCustomDiameterMm(Number(e.target.value))}
                    className="w-24 p-1 bg-white border border-amber-300 rounded text-center font-bold text-slate-900 focus:outline-hidden"
                  />
                  <span className="text-amber-800">mm</span>
                </div>
              </div>
            )}
          </div>

          {/* THICKNESS */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black text-slate-800 flex items-center gap-1">
                <Ruler className="w-4 h-4 text-amber-600" />
                <span>۲. ضخامت دیواره:</span>
              </label>
              <div className="flex bg-slate-100 p-0.5 rounded-lg text-[10px] font-bold">
                <button
                  type="button"
                  onClick={() => setThicknessUnit('mm')}
                  className={`px-2 py-0.5 rounded ${
                    thicknessUnit === 'mm' ? 'bg-amber-600 text-white shadow-xs' : 'text-slate-600'
                  }`}
                >
                  میلی‌متر
                </button>
                <button
                  type="button"
                  onClick={() => setThicknessUnit('inch')}
                  className={`px-2 py-0.5 rounded ${
                    thicknessUnit === 'inch' ? 'bg-amber-600 text-white shadow-xs' : 'text-slate-600'
                  }`}
                >
                  اینچ
                </button>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-1">
              {THICKNESS_OPTIONS.slice(0, 8).map((opt) => {
                const isSelected = !isCustomThickness && selectedThickness === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      setSelectedThickness(opt.value);
                      setIsCustomThickness(false);
                    }}
                    className={`py-1.5 px-1 rounded-lg text-[11px] font-bold transition-all border text-center cursor-pointer ${
                      isSelected
                        ? 'bg-amber-600 text-white border-amber-700 font-black shadow-xs'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {formatThickness(opt.value, thicknessUnit)}
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => setIsCustomThickness(true)}
                className={`py-1.5 px-1 rounded-lg text-[11px] font-bold transition-all border text-center cursor-pointer col-span-4 ${
                  isCustomThickness
                    ? 'bg-amber-600 text-white border-amber-700 font-black shadow-xs'
                    : 'bg-slate-100 border-slate-300 text-slate-800 hover:bg-slate-200'
                }`}
              >
                {isCustomThickness ? `ضخامت سفارشی: ${customThicknessMm}mm` : 'ورود ضخامت سفارشی...'}
              </button>
            </div>

            {isCustomThickness && (
              <div className="p-2 bg-amber-50 rounded-xl border border-amber-200 flex items-center justify-between mt-1 text-xs">
                <span className="font-bold text-amber-900">اندازه ضخامت (میلی‌متر):</span>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    step="0.01"
                    min="0.1"
                    value={customThicknessMm}
                    onChange={(e) => setCustomThicknessMm(Number(e.target.value))}
                    className="w-24 p-1 bg-white border border-amber-300 rounded text-center font-bold text-slate-900 focus:outline-hidden"
                  />
                  <span className="text-amber-800">mm</span>
                </div>
              </div>
            )}
          </div>

          {/* LENGTH */}
          <div className="space-y-1.5">
            <label className="text-xs font-black text-slate-800 block">
              ۳. طول لوله (متراژ):
            </label>
            <div className="grid grid-cols-5 gap-1">
              {standardLengths.map((len) => (
                <button
                  key={len}
                  type="button"
                  onClick={() => setLengthMeters(len)}
                  className={`py-1.5 px-1 rounded-lg text-[11px] font-bold transition-all border text-center cursor-pointer ${
                    lengthMeters === len
                      ? 'bg-amber-600 text-white border-amber-700 font-black shadow-xs'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {formatPersianNumber(len)}م
                </button>
              ))}
            </div>

            <div className="flex items-center justify-between p-2 bg-slate-50 rounded-xl border border-slate-200 text-xs mt-1">
              <span>متراژ دلخواه دستی:</span>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min="1"
                  value={lengthMeters}
                  onChange={(e) => setLengthMeters(Number(e.target.value))}
                  className="w-24 p-1 bg-white border border-slate-300 rounded text-center font-black text-slate-900 focus:outline-hidden"
                />
                <span className="text-slate-500">متر</span>
              </div>
            </div>
          </div>

          {/* QUANTITY */}
          <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs">
            <span className="font-bold text-slate-700">تعداد کلاف / حلقه:</span>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                className="w-16 p-1 bg-white border border-slate-300 rounded text-center font-bold text-slate-900"
              />
              <span className="text-slate-500">حلقه</span>
            </div>
          </div>

          {/* RESULT BOX */}
          <div className="bg-slate-900 text-white p-4 rounded-xl border border-slate-800 space-y-2.5 shadow-md">
            <div className="flex items-center justify-between text-xs text-slate-400 border-b border-slate-800 pb-1.5">
              <span>مشخصات محاسباتی:</span>
              <span>سایز: {isCustomDiameter ? `${currentDiameterMm}mm` : selectedDiameter} | ضخامت: {currentThicknessMm}mm</span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-xs text-amber-300">وزن هر متر:</span>
              <span className="font-bold text-xs text-slate-200">{formatPersianNumber(weightPerMeterKg)} کیلوگرم/متر</span>
            </div>

            <div className="flex items-center justify-between bg-amber-500/10 p-2.5 rounded-lg border border-amber-500/20">
              <span className="font-bold text-xs text-amber-200 flex items-center gap-1">
                <Weight className="w-4 h-4 text-amber-500" />
                <span>وزن نهایی لوله مس:</span>
              </span>
              <span className="font-black text-lg text-amber-400">
                {formatKg(totalWeightKg)}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between gap-2 pt-1 text-xs">
            <button
              type="button"
              onClick={handleCopyResult}
              className="px-3 py-2 rounded-xl border border-slate-300 text-slate-700 font-bold hover:bg-slate-50 transition-colors flex items-center justify-center gap-1 cursor-pointer"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'کپی شد' : 'کپی محاسبات'}</span>
            </button>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50"
              >
                بستن
              </button>

              {onOpenStockEntryWithData && (
                <button
                  type="button"
                  onClick={handleTransferToStock}
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-black shadow-xs transition-all flex items-center justify-center gap-1 cursor-pointer"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>ثبت در انبار</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
