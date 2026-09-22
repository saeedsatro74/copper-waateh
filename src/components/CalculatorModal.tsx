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
  Sparkles,
  Info,
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
import { formatKg, formatToman, formatPersianNumber } from '../utils/persian';

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

  // Selected preset or custom
  const [selectedDiameter, setSelectedDiameter] = useState<string>('3/8"');
  const [customDiameterMm, setCustomDiameterMm] = useState<number>(9.52);
  const [isCustomDiameter, setIsCustomDiameter] = useState<boolean>(false);

  const [selectedThickness, setSelectedThickness] = useState<string>('0.75');
  const [customThicknessMm, setCustomThicknessMm] = useState<number>(0.75);
  const [isCustomThickness, setIsCustomThickness] = useState<boolean>(false);

  // Length presets: 5m, 15m, 30m, 50m, 100m, custom
  const [lengthMeters, setLengthMeters] = useState<number>(50);
  const [quantity, setQuantity] = useState<number>(1);
  const [pricePerKg, setPricePerKg] = useState<number>(720000);

  const [copied, setCopied] = useState<boolean>(false);

  if (!isOpen) return null;

  // Derive exact mm values
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

  const totalPrice = Math.round(totalWeightKg * pricePerKg);

  const handleCopyResult = () => {
    const text = `محاسبه وزن لوله مس:
قطر: ${isCustomDiameter ? `${currentDiameterMm} mm` : selectedDiameter}
ضخامت: ${isCustomThickness ? `${currentThicknessMm} mm` : `${selectedThickness} mm`}
طول: ${lengthMeters} متر (تعداد: ${quantity})
وزن هر متر: ${weightPerMeterKg} kg/m
وزن کل: ${totalWeightKg} کیلوگرم
مبلغ کل (بر اساس فی ${formatToman(pricePerKg)}): ${formatToman(totalPrice)}`;

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 w-full max-w-3xl my-2 sm:my-6 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-600 to-orange-600 text-white p-3.5 sm:p-5 flex items-center justify-between">
          <div className="flex items-center space-x-2.5 space-x-reverse min-w-0">
            <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-white/20 flex items-center justify-center text-white font-bold shrink-0">
              <Calculator className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0">
              <h2 className="font-bold text-sm sm:text-base truncate">
                ماشین حساب تخصصی وزن و کلاف مس
              </h2>
              <p className="text-[10px] sm:text-xs text-amber-100 truncate">
                محاسبه دقیق وزن بر اساس قطر (اینچ/mm)، ضخامت و متراژ ۵، ۱۵، ۳۰ و ۵۰ متری
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 sm:p-2 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-3.5 sm:p-6 space-y-4 sm:space-y-6 max-h-[82vh] overflow-y-auto">
          {/* DIAMETER SELECTION */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 flex items-center space-x-1.5 space-x-reverse">
                <CircleDot className="w-4 h-4 text-amber-600" />
                <span>انتخاب قطر / سایز لوله:</span>
              </label>

              <div className="flex items-center space-x-1 space-x-reverse bg-slate-100 p-0.5 rounded-lg text-[10px] font-bold">
                <button
                  type="button"
                  onClick={() => setDiameterUnit('inch')}
                  className={`px-2 py-0.5 rounded ${
                    diameterUnit === 'inch' ? 'bg-amber-600 text-white' : 'text-slate-600'
                  }`}
                >
                  اینچ
                </button>
                <button
                  type="button"
                  onClick={() => setDiameterUnit('mm')}
                  className={`px-2 py-0.5 rounded ${
                    diameterUnit === 'mm' ? 'bg-amber-600 text-white' : 'text-slate-600'
                  }`}
                >
                  میلی‌متر
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
              {DIAMETER_OPTIONS.map((opt) => {
                const isSelected = !isCustomDiameter && selectedDiameter === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      setSelectedDiameter(opt.value);
                      setIsCustomDiameter(false);
                    }}
                    className={`p-2 rounded-xl text-xs font-bold transition-all border text-center cursor-pointer ${
                      isSelected
                        ? 'bg-amber-500 text-slate-950 border-amber-600 ring-2 ring-amber-500/30'
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
                className={`p-2 rounded-xl text-xs font-bold transition-all border text-center cursor-pointer ${
                  isCustomDiameter
                    ? 'bg-amber-500 text-slate-950 border-amber-600 ring-2 ring-amber-500/30'
                    : 'bg-slate-100 border-slate-300 text-slate-800 hover:bg-slate-200'
                }`}
              >
                قطر سفارشی...
              </button>
            </div>

            {isCustomDiameter && (
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 flex items-center space-x-3 space-x-reverse mt-2">
                <span className="text-xs font-bold text-amber-900">ورود قطر خارجی (میلی‌متر):</span>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  value={customDiameterMm}
                  onChange={(e) => setCustomDiameterMm(Number(e.target.value))}
                  className="w-32 p-1.5 bg-white border border-amber-300 rounded-lg text-xs font-bold text-slate-900 text-center"
                />
                <span className="text-xs text-amber-800 font-medium">mm</span>
              </div>
            )}
          </div>

          {/* THICKNESS SELECTION */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 flex items-center space-x-1.5 space-x-reverse">
                <Ruler className="w-4 h-4 text-amber-600" />
                <span>انتخاب ضخامت دیواره:</span>
              </label>

              <div className="flex items-center space-x-1 space-x-reverse bg-slate-100 p-0.5 rounded-lg text-[10px] font-bold">
                <button
                  type="button"
                  onClick={() => setThicknessUnit('mm')}
                  className={`px-2 py-0.5 rounded ${
                    thicknessUnit === 'mm' ? 'bg-amber-600 text-white' : 'text-slate-600'
                  }`}
                >
                  میلی‌متر
                </button>
                <button
                  type="button"
                  onClick={() => setThicknessUnit('inch')}
                  className={`px-2 py-0.5 rounded ${
                    thicknessUnit === 'inch' ? 'bg-amber-600 text-white' : 'text-slate-600'
                  }`}
                >
                  اینچ
                </button>
              </div>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
              {THICKNESS_OPTIONS.map((opt) => {
                const isSelected = !isCustomThickness && selectedThickness === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      setSelectedThickness(opt.value);
                      setIsCustomThickness(false);
                    }}
                    className={`p-2 rounded-xl text-xs font-bold transition-all border text-center cursor-pointer ${
                      isSelected
                        ? 'bg-amber-500 text-slate-950 border-amber-600 ring-2 ring-amber-500/30'
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
                className={`p-2 rounded-xl text-xs font-bold transition-all border text-center cursor-pointer ${
                  isCustomThickness
                    ? 'bg-amber-500 text-slate-950 border-amber-600 ring-2 ring-amber-500/30'
                    : 'bg-slate-100 border-slate-300 text-slate-800 hover:bg-slate-200'
                }`}
              >
                سفارشی...
              </button>
            </div>

            {isCustomThickness && (
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 flex items-center space-x-3 space-x-reverse mt-2">
                <span className="text-xs font-bold text-amber-900">ورود ضخامت (میلی‌متر):</span>
                <input
                  type="number"
                  step="0.01"
                  min="0.1"
                  value={customThicknessMm}
                  onChange={(e) => setCustomThicknessMm(Number(e.target.value))}
                  className="w-32 p-1.5 bg-white border border-amber-300 rounded-lg text-xs font-bold text-slate-900 text-center"
                />
                <span className="text-xs text-amber-800 font-medium">mm</span>
              </div>
            )}
          </div>

          {/* COIL LENGTH SELECTION */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-800 block">
              انتخاب متراژ کلاف یا طول لوله (متر):
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {standardLengths.map((len) => (
                <button
                  key={len}
                  type="button"
                  onClick={() => setLengthMeters(len)}
                  className={`p-2.5 rounded-xl text-xs font-black transition-all border text-center cursor-pointer ${
                    lengthMeters === len
                      ? 'bg-orange-600 text-white border-orange-700 ring-2 ring-orange-500/30 shadow-xs'
                      : 'bg-slate-50 border-slate-200 text-slate-800 hover:bg-slate-100'
                  }`}
                >
                  {formatPersianNumber(len)} متری
                </button>
              ))}

              <div className="relative">
                <input
                  type="number"
                  min="1"
                  value={lengthMeters}
                  onChange={(e) => setLengthMeters(Number(e.target.value))}
                  placeholder="دلخواه..."
                  className="w-full p-2 bg-white rounded-xl border border-slate-300 text-xs font-bold text-slate-900 text-center focus:ring-2 focus:ring-amber-500"
                />
                <span className="text-[10px] text-slate-400 block text-center mt-0.5">متر دلخواه</span>
              </div>
            </div>
          </div>

          {/* QUANTITY & PRICE INPUTS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                تعداد حلقه / کلاف:
              </label>
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                className="w-full p-2 bg-white rounded-xl border border-slate-200 text-xs font-bold text-slate-900 text-center"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                مبلغ هر کیلوگرم (تومان):
              </label>
              <input
                type="number"
                step="1000"
                value={pricePerKg}
                onChange={(e) => setPricePerKg(Number(e.target.value))}
                className="w-full p-2 bg-white rounded-xl border border-slate-200 text-xs font-bold text-emerald-700 text-center dir-ltr"
              />
            </div>
          </div>

          {/* LIVE RESULT SUMMARY BOX */}
          <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-amber-950 text-white p-4 sm:p-5 rounded-2xl shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center space-x-2 space-x-reverse">
                <Sparkles className="w-5 h-5 text-amber-400" />
                <span className="font-bold text-xs sm:text-sm text-amber-300">
                  نتیجه محاسبات استاندارد چگالی مس ({formatPersianNumber('8.96')} g/cm³)
                </span>
              </div>
              <span className="text-[11px] text-slate-300">
                سایز: {isCustomDiameter ? `${currentDiameterMm}mm` : selectedDiameter} | ضخامت: {currentThicknessMm}mm
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-center">
              <div className="bg-white/10 p-2.5 rounded-xl border border-white/10">
                <span className="text-[10px] text-slate-300 block mb-1">وزن هر متر (kg/m)</span>
                <span className="font-black text-sm sm:text-base text-amber-300">
                  {formatPersianNumber(weightPerMeterKg)} kg/m
                </span>
              </div>

              <div className="bg-amber-500/20 p-2.5 rounded-xl border border-amber-500/30">
                <span className="text-[10px] text-amber-200 block mb-1">
                  وزن کل ({formatPersianNumber(lengthMeters)} متر x {formatPersianNumber(quantity)} کلاف)
                </span>
                <span className="font-black text-base sm:text-lg text-amber-400">
                  {formatKg(totalWeightKg)}
                </span>
              </div>

              <div className="col-span-2 sm:col-span-1 bg-emerald-500/20 p-2.5 rounded-xl border border-emerald-500/30">
                <span className="text-[10px] text-emerald-200 block mb-1">قیمت کل برآورد شده</span>
                <span className="font-black text-sm sm:text-base text-emerald-400">
                  {formatToman(totalPrice)}
                </span>
              </div>
            </div>

            {/* Quick Reference Standard Lengths Comparison */}
            <div className="pt-2 border-t border-white/10">
              <span className="text-[10px] text-slate-400 block mb-1.5 font-bold">
                مقایسه وزن کلاف‌های استاندارد برای همین سایز ({isCustomDiameter ? `${currentDiameterMm}mm` : selectedDiameter} - {currentThicknessMm}mm):
              </span>
              <div className="grid grid-cols-4 gap-1.5 text-center text-[11px]">
                {[5, 15, 30, 50].map((l) => {
                  const w = Math.round(weightPerMeterKg * l * 100) / 100;
                  return (
                    <div key={l} className="bg-white/5 p-1.5 rounded-lg border border-white/5">
                      <span className="text-slate-400 block text-[9px]">{l} متری</span>
                      <span className="font-bold text-amber-200 text-[10px]">{formatKg(w)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 pt-2">
            <button
              type="button"
              onClick={handleCopyResult}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-50 transition-colors flex items-center justify-center space-x-1.5 space-x-reverse cursor-pointer"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'کپی شد!' : 'کپی خلاصه محاسبه'}</span>
            </button>

            <div className="w-full sm:w-auto flex items-center space-x-2 space-x-reverse">
              <button
                type="button"
                onClick={onClose}
                className="w-1/2 sm:w-auto px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50"
              >
                بستن
              </button>

              {onOpenStockEntryWithData && (
                <button
                  type="button"
                  onClick={handleTransferToStock}
                  className="w-1/2 sm:w-auto px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center space-x-1.5 space-x-reverse cursor-pointer"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>انتقال مستقیم به ثبت انبار</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
