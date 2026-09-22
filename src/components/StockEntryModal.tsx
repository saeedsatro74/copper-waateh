import React, { useState, useEffect } from 'react';
import {
  X,
  PlusCircle,
  Package,
  Layers,
  CircleDot,
  Ruler,
  Scissors,
  CheckCircle2,
  Building,
  Sparkles,
  Calculator,
  Wallet,
  Coins,
  Trash2,
  Plus,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { useInventory } from '../context/InventoryContext';
import {
  Brand,
  Thickness,
  Diameter,
  Category,
  ReelItem,
  THICKNESS_OPTIONS,
  DIAMETER_OPTIONS,
} from '../types';
import { formatKg, formatToman, formatPersianNumber } from '../utils/persian';
import { formatThickness, formatDiameter, estimateCopperWeightPerMeter } from '../utils/copper';

interface StockEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: {
    category?: Category;
    diameter?: string;
    thickness?: string;
    weightKg?: number;
    lengthMeters?: number;
  } | null;
}

export const StockEntryModal: React.FC<StockEntryModalProps> = ({
  isOpen,
  onClose,
  initialData,
}) => {
  const { addStockEntry, state } = useInventory();
  const unitSettings = state.warehouseProfile.unitSettings;
  const brands = state.warehouseProfile.brands || ['باهنر', 'قائم', 'استریا', 'بابک'];

  const [category, setCategory] = useState<Category>(initialData?.category || 'pallet');
  const [brand, setBrand] = useState<Brand>(brands[0] || 'باهنر');
  const [thickness, setThickness] = useState<Thickness>(initialData?.thickness || THICKNESS_OPTIONS[6].value); // 0.75 mm
  const [diameter, setDiameter] = useState<Diameter>(initialData?.diameter || DIAMETER_OPTIONS[3].value); // 3/8"
  const [supplierName, setSupplierName] = useState('شرکت صنایع مس باهنر کرمان');
  const [location, setLocation] = useState('سالن اصلی - انبار مرکزی');
  const [pricePerKg, setPricePerKg] = useState<number>(680000);
  const [notes, setNotes] = useState('');
  const [purchaser, setPurchaser] = useState<string>(
    state.warehouseProfile.partnerInfo?.partner1Name || 'ادمین ۱'
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Pallet specific state: weights of 5 reels
  const [reelWeights, setReelWeights] = useState<number[]>([150, 148, 152, 145, 149]);

  // Standalone item weight/count/length
  const [weightKg, setWeightKg] = useState<number>(initialData?.weightKg || 150);
  const [branchCount, setBranchCount] = useState<number>(20);
  const [lengthMeters, setLengthMeters] = useState<number>(initialData?.lengthMeters || 50);

  useEffect(() => {
    if (initialData) {
      if (initialData.category) setCategory(initialData.category);
      if (initialData.diameter) setDiameter(initialData.diameter);
      if (initialData.thickness) setThickness(initialData.thickness);
      if (initialData.weightKg) setWeightKg(initialData.weightKg);
      if (initialData.lengthMeters) setLengthMeters(initialData.lengthMeters);
    }
  }, [initialData]);

  if (!isOpen) return null;

  const currentTotalWeight =
    category === 'pallet'
      ? reelWeights.reduce((a, b) => a + Number(b || 0), 0)
      : Number(weightKg) || 0;

  const calculatedTotalPrice = Math.round(currentTotalWeight * (Number(pricePerKg) || 0));

  // Handle coil length change & auto weight calculation
  const handleCoilLengthSelect = (meters: number) => {
    setLengthMeters(meters);
    const wPerM = estimateCopperWeightPerMeter(diameter, thickness);
    const estimatedTotal = Math.round(wPerM * meters * 100) / 100;
    if (estimatedTotal > 0) {
      setWeightKg(estimatedTotal);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    let entryData: any = {
      brand,
      thickness,
      diameter,
      location,
      notes,
      purchaser,
    };

    if (category === 'pallet') {
      const reels: ReelItem[] = reelWeights.map((w, idx) => ({
        id: `rel-${Date.now()}-${idx}`,
        serialNo: `Q-${brand.substring(0, 3).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`,
        weightKg: Number(w) || 150,
      }));
      entryData.reels = reels;
    } else if (category === 'reel') {
      entryData.weightKg = weightKg;
    } else if (category === 'coil') {
      entryData.weightKg = weightKg;
    } else if (category === 'branch') {
      entryData.count = branchCount;
      entryData.lengthMeters = lengthMeters;
      entryData.totalWeightKg = weightKg;
    } else if (category === 'loose') {
      entryData.weightKg = weightKg;
      entryData.description = notes || 'بار خورده تحویل شده';
    }

    addStockEntry(category, entryData, supplierName, pricePerKg, purchaser);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl my-2 sm:my-8 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-amber-600 text-white p-3.5 sm:p-5 flex items-center justify-between">
          <div className="flex items-center space-x-2.5 space-x-reverse min-w-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-white/20 flex items-center justify-center text-white font-bold shrink-0">
              <PlusCircle className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0">
              <h2 className="font-bold text-sm sm:text-base truncate">ثبت ورود جدید کالا به انبار</h2>
              <p className="text-[10px] sm:text-xs text-amber-100 truncate">
                ثبت کامل مشخصات پالت، قرقره، کلاف، شاخه یا بار خورده
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

        <form onSubmit={handleSubmit} className="p-3.5 sm:p-6 space-y-4 sm:space-y-6 max-h-[82vh] overflow-y-auto">
          {/* Category Tabs Selection */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">
              نوع کالای ورودی:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              <button
                type="button"
                onClick={() => setCategory('pallet')}
                className={`flex flex-col items-center justify-center p-3 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                  category === 'pallet'
                    ? 'bg-amber-50 border-amber-500 text-amber-900 ring-2 ring-amber-500/20'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Package className="w-5 h-5 mb-1 text-amber-700" />
                <span>پالت کامل</span>
              </button>

              <button
                type="button"
                onClick={() => setCategory('reel')}
                className={`flex flex-col items-center justify-center p-3 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                  category === 'reel'
                    ? 'bg-amber-50 border-amber-500 text-amber-900 ring-2 ring-amber-500/20'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Layers className="w-5 h-5 mb-1 text-amber-700" />
                <span>قرقره تکی</span>
              </button>

              <button
                type="button"
                onClick={() => setCategory('coil')}
                className={`flex flex-col items-center justify-center p-3 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                  category === 'coil'
                    ? 'bg-amber-50 border-amber-500 text-amber-900 ring-2 ring-amber-500/20'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <CircleDot className="w-5 h-5 mb-1 text-amber-700" />
                <span>کلاف</span>
              </button>

              <button
                type="button"
                onClick={() => setCategory('branch')}
                className={`flex flex-col items-center justify-center p-3 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                  category === 'branch'
                    ? 'bg-amber-50 border-amber-500 text-amber-900 ring-2 ring-amber-500/20'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Ruler className="w-5 h-5 mb-1 text-amber-700" />
                <span>شاخه</span>
              </button>

              <button
                type="button"
                onClick={() => setCategory('loose')}
                className={`flex flex-col items-center justify-center p-3 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                  category === 'loose'
                    ? 'bg-amber-50 border-amber-500 text-amber-900 ring-2 ring-amber-500/20'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Scissors className="w-5 h-5 mb-1 text-amber-700" />
                <span>خورده‌فروشی</span>
              </button>
            </div>
          </div>

          {/* Core Specs Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">کارخانه / برند مس:</label>
              <select
                value={brand}
                onChange={(e) => setBrand(e.target.value as Brand)}
                className="w-full p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs font-bold text-slate-800"
              >
                {brands.map((b) => (
                  <option key={b} value={b}>
                    برند {b}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                ضخامت دیواره لوله:
              </label>
              <select
                value={thickness}
                onChange={(e) => setThickness(e.target.value)}
                className="w-full p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs font-bold text-slate-800"
              >
                {THICKNESS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {formatThickness(opt.value, unitSettings?.thicknessUnit)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                قطر / سایز لوله:
              </label>
              <select
                value={diameter}
                onChange={(e) => setDiameter(e.target.value)}
                className="w-full p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs font-bold text-slate-800"
              >
                {DIAMETER_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {formatDiameter(opt.value, unitSettings?.diameterUnit)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* PALLET SPECIFIC WEIGHTS INPUT (5 REELS) */}
          {category === 'pallet' && (
            <div className="bg-amber-50/50 p-4 rounded-2xl border border-amber-200 space-y-3">
              <span className="font-bold text-xs text-amber-900 block">
                وزن قرقره‌های روی پالت (معمولاً ۵ قرقره):
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {reelWeights.map((w, idx) => (
                  <div key={idx}>
                    <label className="block text-[10px] font-bold text-amber-800 mb-1">
                      قرقره {idx + 1} (kg):
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      required
                      value={w}
                      onChange={(e) => {
                        const newW = [...reelWeights];
                        newW[idx] = Number(e.target.value);
                        setReelWeights(newW);
                      }}
                        className="w-full p-2 bg-white rounded-lg border border-amber-300 text-xs font-bold text-slate-900"
                    />
                  </div>
                ))}
              </div>
              <div className="text-left text-xs font-black text-amber-800 pt-1">
                وزن کل پالت: {formatKg(reelWeights.reduce((a, b) => a + Number(b || 0), 0))}
              </div>
            </div>
          )}

          {/* NON-PALLET WEIGHT & QUANTITY INPUTS */}
          {category !== 'pallet' && (
            <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
              {/* COIL LENGTH SPECIFIC SELECTION */}
              {category === 'coil' && (
                <div className="space-y-2 pb-3 border-b border-slate-200">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-amber-900 flex items-center space-x-1.5 space-x-reverse">
                      <Sparkles className="w-4 h-4 text-amber-600" />
                      <span>متراژ استاندارد کلاف (طول به متر):</span>
                    </label>
                    <span className="text-[10px] text-slate-500 font-medium">
                      کلیک برای محاسبه خودکار وزن کلاف
                    </span>
                  </div>

                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                    {[5, 15, 30, 50, 100].map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => handleCoilLengthSelect(m)}
                        className={`p-2 rounded-xl text-xs font-bold transition-all border text-center cursor-pointer ${
                          lengthMeters === m
                            ? 'bg-amber-600 text-white border-amber-700 ring-2 ring-amber-500/30'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-amber-50'
                        }`}
                      >
                        {formatPersianNumber(m)} متری
                      </button>
                    ))}

                    <div className="relative">
                      <input
                        type="number"
                        min="1"
                        value={lengthMeters}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setLengthMeters(val);
                          const wPerM = estimateCopperWeightPerMeter(diameter, thickness);
                          if (val > 0 && wPerM > 0) {
                            setWeightKg(Math.round(wPerM * val * 100) / 100);
                          }
                        }}
                        placeholder="طول سفارشی"
                        className="w-full p-2 bg-white rounded-xl border border-slate-300 text-xs font-bold text-slate-900 text-center"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {category === 'branch' && (
                  <>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        تعداد شاخه‌ها:
                      </label>
                      <input
                        type="number"
                        required
                        value={branchCount}
                        onChange={(e) => setBranchCount(Number(e.target.value))}
                        className="w-full p-2.5 bg-white rounded-xl border border-slate-200 text-xs font-bold text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        طول هر شاخه (متر):
                      </label>
                      <input
                        type="number"
                        required
                        value={lengthMeters}
                        onChange={(e) => setLengthMeters(Number(e.target.value))}
                        className="w-full p-2.5 bg-white rounded-xl border border-slate-200 text-xs font-bold text-slate-900"
                      />
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    وزن کل به کیلوگرم (kg):
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={weightKg}
                    onChange={(e) => setWeightKg(Number(e.target.value))}
                    className="w-full p-2.5 bg-white rounded-xl border border-slate-200 text-xs font-bold text-amber-800"
                  />
                  {category === 'coil' && (
                    <span className="text-[10px] text-amber-700 font-medium block mt-1">
                      محاسبه شده برای کلاف {formatPersianNumber(lengthMeters)} متری (قابل ویرایش دستی)
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Supplier & Location Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                نام تامین‌کننده / کارخانه سازنده:
              </label>
              <input
                type="text"
                required
                value={supplierName}
                onChange={(e) => setSupplierName(e.target.value)}
                placeholder="مثلاً: شرکت صنایع مس باهنر کرمان"
                className="w-full p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs font-medium text-slate-800"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                محل دقیق چیدمان در انبار:
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="مثلاً: سالن A - ردیف ۳ - قفسه ۱"
                className="w-full p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs font-medium text-slate-800"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                قیمت خرید هر کیلوگرم (تومان):
              </label>
              <input
                type="number"
                step="1000"
                value={pricePerKg}
                onChange={(e) => setPricePerKg(Number(e.target.value))}
                className="w-full p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs font-bold text-slate-800"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                خریدار / پرداخت‌کننده خرید:
              </label>
              <select
                value={purchaser}
                onChange={(e) => setPurchaser(e.target.value)}
                className="w-full p-2.5 bg-amber-50/70 rounded-xl border border-amber-300 text-xs font-bold text-amber-900"
              >
                <option value={state.warehouseProfile.partnerInfo?.partner1Name || 'ادمین ۱'}>
                  {state.warehouseProfile.partnerInfo?.partner1Name || 'ادمین ۱'} (شریک اول)
                </option>
                <option value={state.warehouseProfile.partnerInfo?.partner2Name || 'ادمین ۲'}>
                  {state.warehouseProfile.partnerInfo?.partner2Name || 'ادمین ۲'} (شریک دوم)
                </option>
                <option value="حساب مشترک (۵۰-۵۰)">حساب مشترک انبار (۵۰-۵۰)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                توضیحات و یادداشت:
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="شماره بارنامه، وضعیت پلمپ..."
                className="w-full p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-800"
              />
            </div>
          </div>

          {/* Dynamic Live Total Purchase Price & Partner Cash Balance Credit Card */}
          <div className="bg-gradient-to-br from-amber-500/10 via-orange-500/10 to-emerald-500/10 p-4 rounded-2xl border-2 border-amber-400 shadow-sm space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-amber-200/80">
              <div className="flex items-center space-x-2 space-x-reverse text-amber-950 font-black text-xs sm:text-sm">
                <Calculator className="w-4 h-4 text-amber-700" />
                <span>محاسبه ارزش کل بار ورودی و افزایش خودکار موجودی نقدی شریک</span>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-amber-200 text-amber-900 text-[11px] font-black">
                محاسبه آنی
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-center sm:text-right">
              <div className="bg-white p-3 rounded-xl border border-amber-200/80 shadow-2xs">
                <span className="text-[11px] text-slate-500 font-bold block mb-1">وزن کل بار ورودی:</span>
                <span className="text-sm font-black text-slate-900">
                  {formatKg(currentTotalWeight)}
                </span>
              </div>

              <div className="bg-white p-3 rounded-xl border border-amber-200/80 shadow-2xs">
                <span className="text-[11px] text-slate-500 font-bold block mb-1">قیمت هر کیلوگرم:</span>
                <span className="text-sm font-black text-slate-900 dir-ltr text-right">
                  {formatToman(pricePerKg)}
                </span>
              </div>

              <div className="bg-gradient-to-br from-emerald-600 to-teal-700 text-white p-3 rounded-xl shadow-xs">
                <span className="text-[11px] text-emerald-100 font-bold block mb-1">مبلغ کل هزینه خرید بار:</span>
                <span className="text-sm sm:text-base font-black dir-ltr text-right block">
                  {formatToman(calculatedTotalPrice)}
                </span>
              </div>
            </div>

            <div className="bg-white/95 p-3 rounded-xl border border-emerald-300 flex items-center space-x-2.5 space-x-reverse text-xs text-emerald-950 font-medium">
              <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                <Wallet className="w-4 h-4" />
              </div>
              <p className="leading-relaxed">
                با ثبت این بار، مبلغ <span className="font-black text-emerald-700 dir-ltr inline-block mx-1 text-sm">{formatToman(calculatedTotalPrice)}</span> به عنوان آورده و هزینه خرید بار، مستقیماً به موجودی نقدی <span className="font-black text-slate-900 bg-amber-100/80 px-1.5 py-0.5 rounded-md">«{purchaser}»</span> افزوده خواهد شد.
              </p>
            </div>
          </div>

          <div className="pt-2 flex justify-end space-x-3 space-x-reverse">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50 disabled:opacity-50"
            >
              انصراف
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:bg-amber-400 text-white font-bold text-xs shadow-md cursor-pointer flex items-center space-x-2 space-x-reverse"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>ثبت ورودی در انبار</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
