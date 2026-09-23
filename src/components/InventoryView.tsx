import React, { useState } from 'react';
import {
  Package,
  Layers,
  CircleDot,
  Ruler,
  Scissors,
  Filter,
  Search,
  PlusCircle,
  FileSpreadsheet,
  ArrowRightLeft,
  CheckSquare,
  Square,
  Weight,
  Layers3,
  TrendingUp,
  MinusCircle,
  SlidersHorizontal,
  Calculator,
  Trash2,
  Loader2,
} from 'lucide-react';
import { useInventory } from '../context/InventoryContext';
import { PalletCard } from './PalletCard';
import { TransferToConsignmentModal } from './TransferToConsignmentModal';
import { Handshake } from 'lucide-react';
import { DeductLooseModal } from './DeductLooseModal';
import { DeductReelModal } from './DeductReelModal';
import { DeductCoilModal } from './DeductCoilModal';
import { DeductBranchModal } from './DeductBranchModal';
import { ConsignmentsView } from './ConsignmentsView';
import {
  Brand,
  Thickness,
  Diameter,
  Category,
  SelectedItemForAction,
  LooseItem,
  StandaloneReelItem,
  CoilItem,
  BranchItem,
  Invoice,
  THICKNESS_OPTIONS,
  DIAMETER_OPTIONS,
  ThicknessUnitMode,
  DiameterUnitMode,
} from '../types';
import { formatKg, formatPersianNumber } from '../utils/persian';
import { formatThickness, formatDiameter } from '../utils/copper';

interface InventoryViewProps {
  onOpenStockEntryModal: () => void;
  onOpenInvoiceModal: () => void;
  onOpenCalculatorModal: () => void;
  onViewInvoice?: (invoice: Invoice) => void;
}

export const InventoryView: React.FC<InventoryViewProps> = ({
  onOpenStockEntryModal,
  onOpenInvoiceModal,
  onOpenCalculatorModal,
  onViewInvoice,
}) => {
  const {
    state,
    unpackReelToLoose,
    unpackCoilToLoose,
    unpackBranchToLoose,
    deductFromLooseItem,
    deductFromReelAndMoveToLoose,
    deductFromCoilAndMoveToLoose,
    deductFromBranchAndMoveToLoose,
    deleteInventoryItem,
    selectedItems,
    toggleSelectItem,
    clearSelectedItems,
    updateWarehouseProfile,
  } = useInventory();

  const [activeCategory, setActiveCategory] = useState<Category | 'consignment'>('pallet');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterBrand, setFilterBrand] = useState<string>('all');
  const [filterThickness, setFilterThickness] = useState<string>('all');
  const [filterDiameter, setFilterDiameter] = useState<string>('all');

  const [selectedLooseItem, setSelectedLooseItem] = useState<LooseItem | null>(null);
  const [deductLooseModalOpen, setDeductLooseModalOpen] = useState<boolean>(false);
  const [selectedReelItem, setSelectedReelItem] = useState<StandaloneReelItem | null>(null);
  const [deductReelModalOpen, setDeductReelModalOpen] = useState<boolean>(false);
  const [selectedCoilItem, setSelectedCoilItem] = useState<CoilItem | null>(null);
  const [deductCoilModalOpen, setDeductCoilModalOpen] = useState<boolean>(false);
  const [selectedBranchItem, setSelectedBranchItem] = useState<BranchItem | null>(null);
  const [deductBranchModalOpen, setDeductBranchModalOpen] = useState<boolean>(false);
  const [isConsignmentModalOpen, setIsConsignmentModalOpen] = useState<boolean>(false);
  const [itemToDelete, setItemToDelete] = useState<{ category: Category; id: string; title: string } | null>(null);
  const [isDeletingItem, setIsDeletingItem] = useState(false);

  const unitSettings = state.warehouseProfile.unitSettings;

  const handleUnitChange = (key: 'thicknessUnit' | 'diameterUnit', val: string) => {
    const currentSettings = state.warehouseProfile.unitSettings || {
      thicknessUnit: 'mm',
      diameterUnit: 'inch',
    };
    updateWarehouseProfile({
      ...state.warehouseProfile,
      unitSettings: {
        ...currentSettings,
        [key]: val,
      },
    });
  };

  // Specs options
  const brands: Brand[] = state.warehouseProfile.brands || ['باهنر', 'قائم', 'استریا', 'بابک'];

  // Total warehouse weight summary
  const palletsWeight = state.pallets.reduce(
    (acc, p) => acc + p.reels.reduce((rAcc, r) => rAcc + r.weightKg, 0),
    0
  );
  const reelsWeight = state.reels.reduce((acc, r) => acc + r.weightKg, 0);
  const coilsWeight = state.coils.reduce((acc, c) => acc + c.weightKg, 0);
  const branchesWeight = state.branches.reduce((acc, b) => acc + b.totalWeightKg, 0);
  const looseWeight = state.loose.reduce((acc, l) => acc + l.weightKg, 0);

  const grandTotalWeight =
    palletsWeight + reelsWeight + coilsWeight + branchesWeight + looseWeight;

  // Generic spec matcher
  const matchesFilter = (itemBrand: string, itemThickness: string, itemDiameter: string, text: string) => {
    const matchesBrand = filterBrand === 'all' || itemBrand === filterBrand;
    const matchesThickness =
      filterThickness === 'all' ||
      itemThickness === filterThickness ||
      itemThickness.includes(filterThickness);
    const matchesDiameter =
      filterDiameter === 'all' ||
      itemDiameter === filterDiameter ||
      itemDiameter.includes(filterDiameter);
    const matchesSearch =
      !searchQuery.trim() ||
      text.toLowerCase().includes(searchQuery.toLowerCase().trim());

    return matchesBrand && matchesThickness && matchesDiameter && matchesSearch;
  };

  // Filtered Lists
  const filteredPallets = state.pallets.filter((p) =>
    matchesFilter(
      p.brand,
      p.thickness,
      p.diameter,
      `${p.palletCode} ${p.brand} ${p.notes || ''}`
    )
  );

  const filteredReels = state.reels.filter((r) =>
    matchesFilter(
      r.brand,
      r.thickness,
      r.diameter,
      `${r.reelCode} ${r.brand} ${r.notes || ''}`
    )
  );

  const filteredCoils = state.coils.filter((c) =>
    matchesFilter(
      c.brand,
      c.thickness,
      c.diameter,
      `${c.code} ${c.brand} ${c.notes || ''}`
    )
  );

  const filteredBranches = state.branches.filter((b) =>
    matchesFilter(
      b.brand,
      b.thickness,
      b.diameter,
      `${b.code} ${b.brand} ${b.notes || ''}`
    )
  );

  const filteredLoose = state.loose.filter((l) =>
    matchesFilter(
      l.brand,
      l.thickness,
      l.diameter,
      `${l.code} ${l.brand} ${l.description}`
    )
  );

  // Selection toggle helper for simple non-pallet items
  const isSelected = (itemId: string) =>
    selectedItems.some((i) => i.id === itemId && !i.subItemId);

  const toggleSimpleItem = (
    id: string,
    category: Category,
    description: string,
    brand: Brand,
    thickness: Thickness,
    diameter: Diameter,
    weightKg: number,
    purchaser?: string,
    buyPricePerKg?: number
  ) => {
    const item: SelectedItemForAction = {
      id,
      category,
      brand,
      thickness,
      diameter,
      weightKg,
      purchaser,
      buyPricePerKg,
      description,
    };
    toggleSelectItem(item);
  };

  return (
    <div className="space-y-3 sm:space-y-6 pb-12">
      {/* Overview Stat Cards */}
      <div className="grid grid-cols-3 sm:grid-cols-3 lg:grid-cols-6 gap-1.5 sm:gap-3">
        <div className="bg-white p-2 sm:p-3.5 rounded-xl sm:rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <span className="text-[10px] sm:text-xs font-bold text-slate-500 truncate">موجودی کل</span>
          <div className="mt-1 sm:mt-2">
            <span className="text-xs sm:text-base font-black text-amber-700 block truncate">
              {formatKg(grandTotalWeight)}
            </span>
            <span className="text-[9px] sm:text-[10px] font-semibold text-slate-400">تمام دسته‌ها</span>
          </div>
        </div>

        <div className="bg-white p-2 sm:p-3.5 rounded-xl sm:rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <span className="text-[10px] sm:text-xs font-bold text-slate-500 truncate">پالت‌ها</span>
          <div className="mt-1 sm:mt-2">
            <span className="text-xs sm:text-base font-bold text-slate-900 block truncate">
              {state.pallets.length} پالت
            </span>
            <span className="text-[9px] sm:text-[10px] font-semibold text-amber-700 block truncate">
              {formatKg(palletsWeight)}
            </span>
          </div>
        </div>

        <div className="bg-white p-2 sm:p-3.5 rounded-xl sm:rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <span className="text-[10px] sm:text-xs font-bold text-slate-500 truncate">قرقره‌ها</span>
          <div className="mt-1 sm:mt-2">
            <span className="text-xs sm:text-base font-bold text-slate-900 block truncate">
              {state.reels.length} عدد
            </span>
            <span className="text-[9px] sm:text-[10px] font-semibold text-amber-700 block truncate">
              {formatKg(reelsWeight)}
            </span>
          </div>
        </div>

        <div className="bg-white p-2 sm:p-3.5 rounded-xl sm:rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <span className="text-[10px] sm:text-xs font-bold text-slate-500 truncate">کلاف‌ها</span>
          <div className="mt-1 sm:mt-2">
            <span className="text-xs sm:text-base font-bold text-slate-900 block truncate">
              {state.coils.length} کلاف
            </span>
            <span className="text-[9px] sm:text-[10px] font-semibold text-amber-700 block truncate">
              {formatKg(coilsWeight)}
            </span>
          </div>
        </div>

        <div className="bg-white p-2 sm:p-3.5 rounded-xl sm:rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <span className="text-[10px] sm:text-xs font-bold text-slate-500 truncate">شاخه‌ها</span>
          <div className="mt-1 sm:mt-2">
            <span className="text-xs sm:text-base font-bold text-slate-900 block truncate">
              {state.branches.reduce((acc, b) => acc + b.count, 0)} شاخه
            </span>
            <span className="text-[9px] sm:text-[10px] font-semibold text-amber-700 block truncate">
              {formatKg(branchesWeight)}
            </span>
          </div>
        </div>

        <div className="bg-white p-2 sm:p-3.5 rounded-xl sm:rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <span className="text-[10px] sm:text-xs font-bold text-slate-500 truncate">خورده‌فروشی</span>
          <div className="mt-1 sm:mt-2">
            <span className="text-xs sm:text-base font-bold text-slate-900 block truncate">
              {state.loose.length} مورد
            </span>
            <span className="text-[9px] sm:text-[10px] font-semibold text-amber-700 block truncate">
              {formatKg(looseWeight)}
            </span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-2.5 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-200 shadow-xs space-y-2.5 sm:space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="جستجو بر اساس کد پالت، برند، سریال..."
              className="w-full pr-8 pl-3 py-1.5 sm:py-2 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
            />
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center space-x-2 space-x-reverse shrink-0">
            <button
              onClick={onOpenStockEntryModal}
              className="flex items-center justify-center space-x-1.5 space-x-reverse px-3 py-1.5 sm:py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer whitespace-nowrap"
            >
              <PlusCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>ثبت ورودی جدید</span>
            </button>
          </div>
        </div>

        {/* Brand, Thickness, Diameter Filters */}
        <div className="grid grid-cols-3 sm:grid-cols-3 gap-1.5 sm:gap-3 pt-2 border-t border-slate-100">
          <div>
            <label className="block text-[10px] sm:text-[11px] font-bold text-slate-600 mb-0.5 truncate">
              برند لوله:
            </label>
            <select
              value={filterBrand}
              onChange={(e) => setFilterBrand(e.target.value)}
              className="w-full p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[11px] sm:text-xs font-medium text-slate-800 focus:outline-hidden focus:border-amber-500"
            >
              <option value="all">همه برندها</option>
              {brands.map((b) => (
                <option key={b} value={b}>
                  برند {b}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] sm:text-[11px] font-bold text-slate-600 mb-0.5 truncate">
              ضخامت دیواره:
            </label>
            <select
              value={filterThickness}
              onChange={(e) => setFilterThickness(e.target.value)}
              className="w-full p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[11px] sm:text-xs font-medium text-slate-800 focus:outline-hidden focus:border-amber-500"
            >
              <option value="all">همه ضخامت‌ها</option>
              {THICKNESS_OPTIONS.map((t) => (
                <option key={t.value} value={t.value}>
                  {formatThickness(t.value, unitSettings?.thicknessUnit)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] sm:text-[11px] font-bold text-slate-600 mb-0.5 truncate">
              قطر / سایز:
            </label>
            <select
              value={filterDiameter}
              onChange={(e) => setFilterDiameter(e.target.value)}
              className="w-full p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[11px] sm:text-xs font-medium text-slate-800 focus:outline-hidden focus:border-amber-500"
            >
              <option value="all">همه سایزها</option>
              {DIAMETER_OPTIONS.map((d) => (
                <option key={d.value} value={d.value}>
                  {formatDiameter(d.value, unitSettings?.diameterUnit)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Quick Unit Settings Toggle Bar */}
        <div className="flex flex-wrap items-center justify-between gap-1.5 sm:gap-3 p-2 sm:p-3 bg-amber-50/70 rounded-xl border border-amber-200/80 text-[11px] sm:text-xs">
          <div className="flex items-center space-x-1.5 space-x-reverse font-bold text-amber-900">
            <SlidersHorizontal className="w-3.5 h-3.5 text-amber-700" />
            <span>واحد نمایش:</span>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center space-x-1 space-x-reverse">
              <span className="text-slate-600 font-medium">ضخامت:</span>
              <select
                value={unitSettings?.thicknessUnit || 'mm'}
                onChange={(e) =>
                  handleUnitChange('thicknessUnit', e.target.value)
                }
                className="px-1.5 py-0.5 bg-white border border-slate-200 rounded-md text-[11px] font-bold text-slate-800 cursor-pointer"
              >
                <option value="mm">mm</option>
                <option value="inch">in</option>
                <option value="both">mm+in</option>
              </select>
            </div>

            <div className="flex items-center space-x-1 space-x-reverse">
              <span className="text-slate-600 font-medium">قطر:</span>
              <select
                value={unitSettings?.diameterUnit || 'inch'}
                onChange={(e) =>
                  handleUnitChange('diameterUnit', e.target.value)
                }
                className="px-1.5 py-0.5 bg-white border border-slate-200 rounded-md text-[11px] font-bold text-slate-800 cursor-pointer"
              >
                <option value="inch">in</option>
                <option value="mm">mm</option>
                <option value="both">in+mm</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Selected Items Sticky Floating Action Bar */}
      {selectedItems.length > 0 && (
        <div className="bg-slate-900 text-white p-3 sm:p-4 rounded-xl sm:rounded-2xl shadow-xl flex flex-col sm:flex-row items-center justify-between gap-2.5 animate-in fade-in slide-in-from-bottom-3 duration-200 border border-slate-800">
          <div className="flex items-center space-x-2.5 space-x-reverse">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-slate-800 flex items-center justify-center font-bold text-slate-300 shrink-0">
              <CheckSquare className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400" />
            </div>
            <div>
              <span className="font-bold text-xs sm:text-sm block">
                {formatPersianNumber(selectedItems.length)} مورد انتخاب شده جهت خروج / پیش‌فاکتور
              </span>
              <span className="text-[11px] sm:text-xs text-slate-400">
                وزن کل انتخاب شده: {formatKg(selectedItems.reduce((acc, i) => acc + i.weightKg, 0))}
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-2 space-x-reverse w-full sm:w-auto justify-end">
            <button
              onClick={clearSelectedItems}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-bold transition-all cursor-pointer"
            >
              لغو
            </button>
            <button
              onClick={() => setIsConsignmentModalOpen(true)}
              className="flex items-center space-x-1.5 space-x-reverse px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-900 font-black text-xs transition-all shadow-md cursor-pointer whitespace-nowrap"
            >
              <Handshake className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-800" />
              <span className="text-slate-900">انتقال به امانی</span>
            </button>
            <button
              onClick={onOpenInvoiceModal}
              className="flex items-center space-x-1.5 space-x-reverse px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs transition-all shadow-md cursor-pointer whitespace-nowrap"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
              <span>پیش‌فاکتور خروج</span>
            </button>
          </div>
        </div>
      )}

      {/* Category Tabs Header */}
      <div className="flex space-x-1.5 space-x-reverse overflow-x-auto border-b border-slate-200 pb-1 scrollbar-none">
        <button
          onClick={() => setActiveCategory('pallet')}
          className={`flex items-center space-x-1.5 space-x-reverse px-3 sm:px-5 py-1.5 sm:py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
            activeCategory === 'pallet'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Package className="w-3.5 h-3.5" />
          <span>پالت‌ها ({state.pallets.length})</span>
        </button>

        <button
          onClick={() => setActiveCategory('reel')}
          className={`flex items-center space-x-1.5 space-x-reverse px-3 sm:px-5 py-1.5 sm:py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
            activeCategory === 'reel'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>قرقره‌ها ({state.reels.length})</span>
        </button>

        <button
          onClick={() => setActiveCategory('coil')}
          className={`flex items-center space-x-1.5 space-x-reverse px-3 sm:px-5 py-1.5 sm:py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
            activeCategory === 'coil'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <CircleDot className="w-3.5 h-3.5" />
          <span>کلاف‌ها ({state.coils.length})</span>
        </button>

        <button
          onClick={() => setActiveCategory('branch')}
          className={`flex items-center space-x-1.5 space-x-reverse px-3 sm:px-5 py-1.5 sm:py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
            activeCategory === 'branch'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Ruler className="w-3.5 h-3.5" />
          <span>شاخه‌ها ({state.branches.length})</span>
        </button>

        <button
          onClick={() => setActiveCategory('loose')}
          className={`flex items-center space-x-1.5 space-x-reverse px-3 sm:px-5 py-1.5 sm:py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
            activeCategory === 'loose'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Scissors className="w-3.5 h-3.5" />
          <span>خورده‌فروشی ({state.loose.length})</span>
        </button>

        <button
          onClick={() => setActiveCategory('consignment')}
          className={`flex items-center space-x-1.5 space-x-reverse px-3 sm:px-5 py-1.5 sm:py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
            activeCategory === 'consignment'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Handshake className="w-3.5 h-3.5" />
          <span>امانی‌ها ({(state.consignments || []).length})</span>
        </button>
      </div>

      {/* Category Content Panels */}
      <div>
        {/* PALLETS TAB */}
        {activeCategory === 'pallet' && (
          <div>
            {filteredPallets.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500">
                <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="font-bold text-sm">هیچ پالتی با این مشخصات در انبار یافت نشد.</p>
                <p className="text-xs text-slate-400 mt-1">فیلترها را تغییر دهید یا پالت جدید ثبت کنید.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {filteredPallets.map((pallet) => (
                  <PalletCard
                    key={pallet.id}
                    pallet={pallet}
                    onOpenInvoiceModal={onOpenInvoiceModal}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* REELS TAB */}
        {activeCategory === 'reel' && (
          <div>
            {filteredReels.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500">
                <Layers className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="font-bold text-sm">هیچ قرقره تک در این بخش موجود نیست.</p>
                <p className="text-xs text-slate-400 mt-1">
                  با باز کردن پالت‌ها، قرقره‌های آن بصورت تکی وارد این بخش خواهند شد.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-3">
                {filteredReels.map((reel) => {
                  const selected = isSelected(reel.id);
                  return (
                    <div
                      key={reel.id}
                      className={`bg-white rounded-xl border transition-all duration-200 p-3 shadow-xs flex flex-col justify-between ${
                        selected
                          ? 'border-amber-400 ring-2 ring-amber-400/30 bg-amber-50/20'
                          : 'border-slate-200 hover:shadow-md'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2">
                          <div className="flex items-center space-x-1.5 space-x-reverse min-w-0">
                            <button
                              onClick={() =>
                                toggleSimpleItem(
                                  reel.id,
                                  'reel',
                                  `قرقره ${reel.reelCode}`,
                                  reel.brand,
                                  reel.thickness,
                                  reel.diameter,
                                  reel.weightKg,
                                  reel.purchaser,
                                  reel.buyPricePerKg
                                )
                              }
                              className="text-amber-600 focus:outline-hidden cursor-pointer"
                            >
                              {selected ? (
                                <CheckSquare className="w-4 h-4 text-amber-600" />
                              ) : (
                                <Square className="w-4 h-4 text-slate-300" />
                              )}
                            </button>
                            <span className="font-bold text-xs sm:text-sm text-slate-900 truncate">
                              {reel.reelCode}
                            </span>
                          </div>
                          <div className="flex items-center space-x-1 space-x-reverse shrink-0">
                            <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-bold text-[9px] sm:text-[10px]">
                              {reel.brand}
                            </span>
                            <button
                              onClick={() => {
                                setItemToDelete({
                                  category: 'reel',
                                  id: reel.id,
                                  title: `قرقره ${reel.reelCode}`,
                                });
                              }}
                              className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="حذف قرقره"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-1 text-center text-[11px] bg-slate-50 p-2 rounded-lg mb-2">
                          <div>
                            <span className="text-slate-400 block text-[9px]">ضخامت</span>
                            <span className="font-bold text-slate-800 text-[10px] sm:text-xs truncate block">{formatThickness(reel.thickness, unitSettings?.thicknessUnit)}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[9px]">قطر</span>
                            <span className="font-bold text-slate-800 text-[10px] sm:text-xs truncate block">{formatDiameter(reel.diameter, unitSettings?.diameterUnit)}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[9px]">وزن</span>
                            <span className="font-bold text-amber-950 text-[10px] sm:text-xs block">{formatKg(reel.weightKg)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons for Reel */}
                      <div className="pt-2 border-t border-slate-100 grid grid-cols-2 gap-1.5">
                        <button
                          onClick={() => {
                            setSelectedReelItem(reel);
                            setDeductReelModalOpen(true);
                          }}
                          className="flex items-center justify-center space-x-1 space-x-reverse px-1 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-[10px] font-black transition-all shadow-xs cursor-pointer"
                        >
                          <Scissors className="w-3 h-3" />
                          <span>برداشت جزئی</span>
                        </button>

                        <button
                          onClick={() => unpackReelToLoose(reel.id)}
                          className="flex items-center justify-center space-x-1 space-x-reverse px-1 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-950 text-[10px] font-black border border-amber-200 transition-all cursor-pointer"
                        >
                          <ArrowRightLeft className="w-3 h-3 text-amber-700" />
                          <span>تبدیل به خرده</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* COILS TAB */}
        {activeCategory === 'coil' && (
          <div>
            {filteredCoils.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500">
                <CircleDot className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="font-bold text-sm">هیچ کلاف مس در انبار یافت نشد.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-3">
                {filteredCoils.map((coil) => {
                  const selected = isSelected(coil.id);
                  return (
                    <div
                      key={coil.id}
                      className={`bg-white rounded-xl border transition-all duration-200 p-3 shadow-xs flex flex-col justify-between ${
                        selected
                          ? 'border-amber-400 ring-2 ring-amber-400/30 bg-amber-50/20'
                          : 'border-slate-200 hover:shadow-md'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2">
                          <div className="flex items-center space-x-1.5 space-x-reverse min-w-0">
                            <button
                              onClick={() =>
                                toggleSimpleItem(
                                  coil.id,
                                  'coil',
                                  `کلاف ${coil.code}`,
                                  coil.brand,
                                  coil.thickness,
                                  coil.diameter,
                                  coil.weightKg,
                                  coil.purchaser,
                                  coil.buyPricePerKg
                                )
                              }
                              className="text-amber-600 focus:outline-hidden cursor-pointer"
                            >
                              {selected ? (
                                <CheckSquare className="w-4 h-4 text-amber-600" />
                              ) : (
                                <Square className="w-4 h-4 text-slate-300" />
                              )}
                            </button>
                            <span className="font-bold text-xs sm:text-sm text-slate-900 truncate">
                              کلاف {coil.code}
                            </span>
                          </div>
                          <div className="flex items-center space-x-1 space-x-reverse shrink-0">
                            <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-bold text-[9px] sm:text-[10px]">
                              {coil.brand}
                            </span>
                            <button
                              onClick={() => {
                                setItemToDelete({
                                  category: 'coil',
                                  id: coil.id,
                                  title: `کلاف ${coil.code}`,
                                });
                              }}
                              className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="حذف کلاف"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-1 text-center text-[11px] bg-slate-50 p-2 rounded-lg">
                          <div>
                            <span className="text-slate-400 block text-[9px]">ضخامت</span>
                            <span className="font-bold text-slate-800 text-[10px] sm:text-xs truncate block">{formatThickness(coil.thickness, unitSettings?.thicknessUnit)}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[9px]">قطر</span>
                            <span className="font-bold text-slate-800 text-[10px] sm:text-xs truncate block">{formatDiameter(coil.diameter, unitSettings?.diameterUnit)}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[9px]">وزن</span>
                            <span className="font-bold text-amber-950 text-[10px] sm:text-xs block">{formatKg(coil.weightKg)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons for Coil */}
                      <div className="pt-2 border-t border-slate-100 grid grid-cols-2 gap-1.5 mt-2">
                        <button
                          onClick={() => {
                            setSelectedCoilItem(coil);
                            setDeductCoilModalOpen(true);
                          }}
                          className="flex items-center justify-center space-x-1 space-x-reverse px-1 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-[10px] font-black transition-all shadow-xs cursor-pointer"
                        >
                          <Scissors className="w-3 h-3" />
                          <span>برداشت جزئی</span>
                        </button>

                        <button
                          onClick={() => {
                            unpackCoilToLoose(coil.id);
                          }}
                          className="flex items-center justify-center space-x-1 space-x-reverse px-1 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-950 text-[10px] font-black border border-amber-200 transition-all cursor-pointer"
                        >
                          <ArrowRightLeft className="w-3 h-3 text-amber-700" />
                          <span>تبدیل به خرده</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* BRANCHES TAB */}
        {activeCategory === 'branch' && (
          <div>
            {filteredBranches.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500">
                <Ruler className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="font-bold text-sm">هیچ شاخه مس در انبار یافت نشد.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-3">
                {filteredBranches.map((branch) => {
                  const selected = isSelected(branch.id);
                  return (
                    <div
                      key={branch.id}
                      className={`bg-white rounded-xl border transition-all duration-200 p-3 shadow-xs flex flex-col justify-between ${
                        selected
                          ? 'border-amber-400 ring-2 ring-amber-400/30 bg-amber-50/20'
                          : 'border-slate-200 hover:shadow-md'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2">
                          <div className="flex items-center space-x-1.5 space-x-reverse min-w-0">
                            <button
                              onClick={() =>
                                toggleSimpleItem(
                                  branch.id,
                                  'branch',
                                  `بندیل شاخه ${branch.code} (${branch.count} شاخه ۶ متری)`,
                                  branch.brand,
                                  branch.thickness,
                                  branch.diameter,
                                  branch.totalWeightKg,
                                  branch.purchaser,
                                  branch.buyPricePerKg
                                )
                              }
                              className="text-amber-600 focus:outline-hidden cursor-pointer"
                            >
                              {selected ? (
                                <CheckSquare className="w-4 h-4 text-amber-600" />
                              ) : (
                                <Square className="w-4 h-4 text-slate-300" />
                              )}
                            </button>
                            <span className="font-bold text-xs sm:text-sm text-slate-900 truncate">
                              بندیل {branch.code}
                            </span>
                          </div>
                          <div className="flex items-center space-x-1 space-x-reverse shrink-0">
                            <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-bold text-[9px] sm:text-[10px]">
                              {branch.brand}
                            </span>
                            <button
                              onClick={() => {
                                setItemToDelete({
                                  category: 'branch',
                                  id: branch.id,
                                  title: `بندیل شاخه ${branch.code}`,
                                });
                              }}
                              className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="حذف بندیل شاخه"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                         <div className="grid grid-cols-3 gap-1 text-center text-[11px] bg-slate-50 p-2 rounded-lg">
                          <div>
                            <span className="text-slate-400 block text-[9px]">تعداد</span>
                            <span className="font-bold text-slate-800 text-[10px] sm:text-xs block">
                              {formatPersianNumber(branch.count)} عدد
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[9px]">ضخامت/سایز</span>
                            <span className="font-bold text-slate-800 text-[10px] sm:text-xs truncate block">
                              {formatThickness(branch.thickness, unitSettings?.thicknessUnit)}/{formatDiameter(branch.diameter, unitSettings?.diameterUnit)}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[9px]">وزن کل</span>
                            <span className="font-bold text-amber-950 text-[10px] sm:text-xs block">
                              {formatKg(branch.totalWeightKg)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons for Branch */}
                      <div className="pt-2 border-t border-slate-100 grid grid-cols-2 gap-1.5 mt-2">
                        <button
                          onClick={() => {
                            setSelectedBranchItem(branch);
                            setDeductBranchModalOpen(true);
                          }}
                          className="flex items-center justify-center space-x-1 space-x-reverse px-1 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-[10px] font-black transition-all shadow-xs cursor-pointer"
                        >
                          <Scissors className="w-3 h-3" />
                          <span>برداشت جزئی</span>
                        </button>

                        <button
                          onClick={() => {
                            unpackBranchToLoose(branch.id);
                          }}
                          className="flex items-center justify-center space-x-1 space-x-reverse px-1 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-950 text-[10px] font-black border border-amber-200 transition-all cursor-pointer"
                        >
                          <ArrowRightLeft className="w-3 h-3 text-amber-700" />
                          <span>تبدیل به خرده</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* LOOSE / RETAIL TAB */}
        {activeCategory === 'loose' && (
          <div>
            {filteredLoose.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500">
                <Scissors className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="font-bold text-sm">هیچ آیتم خورده‌فروشی در انبار ثبت نشده است.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-3">
                {filteredLoose.map((item) => {
                  const selected = isSelected(item.id);
                  return (
                    <div
                      key={item.id}
                      className={`bg-white rounded-xl border transition-all duration-200 p-3 shadow-xs flex flex-col justify-between ${
                        selected
                          ? 'border-amber-400 ring-2 ring-amber-400/30 bg-amber-50/20'
                          : 'border-slate-200 hover:shadow-md'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2">
                          <div className="flex items-center space-x-1.5 space-x-reverse min-w-0">
                            <button
                              onClick={() =>
                                toggleSimpleItem(
                                  item.id,
                                  'loose',
                                  `بار خورده ${item.code}`,
                                  item.brand,
                                  item.thickness,
                                  item.diameter,
                                  item.weightKg,
                                  item.purchaser,
                                  item.buyPricePerKg
                                )
                              }
                              className="text-amber-600 focus:outline-hidden cursor-pointer"
                            >
                              {selected ? (
                                <CheckSquare className="w-4 h-4 text-amber-600" />
                              ) : (
                                <Square className="w-4 h-4 text-slate-300" />
                              )}
                            </button>
                            <span className="font-bold text-xs sm:text-sm text-slate-900 truncate">
                              خورده {item.code}
                            </span>
                          </div>
                          <div className="flex items-center space-x-1 space-x-reverse shrink-0">
                            <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-bold text-[9px] sm:text-[10px]">
                              {item.brand}
                            </span>
                            <button
                              onClick={() => {
                                setItemToDelete({
                                  category: 'loose',
                                  id: item.id,
                                  title: `بار خورده ${item.code}`,
                                });
                              }}
                              className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="حذف آیتم خورده"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-1 text-center text-[11px] bg-slate-50 p-2 rounded-lg">
                          <div>
                            <span className="text-slate-400 block text-[9px]">ضخامت</span>
                            <span className="font-bold text-slate-800 text-[10px] sm:text-xs truncate block">{formatThickness(item.thickness, unitSettings?.thicknessUnit)}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[9px]">قطر</span>
                            <span className="font-bold text-slate-800 text-[10px] sm:text-xs truncate block">{formatDiameter(item.diameter, unitSettings?.diameterUnit)}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[9px]">وزن دقیق</span>
                            <span className="font-bold text-amber-950 text-[10px] sm:text-xs block">{formatKg(item.weightKg)}</span>
                          </div>
                        </div>

                        {item.description && (
                          <p className="text-[11px] text-slate-600 font-medium mt-2 leading-relaxed bg-amber-50/50 p-1.5 rounded-md border border-amber-100/40">
                            {item.description}
                          </p>
                        )}
                        {item.notes && (
                          <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                            یادداشت: {item.notes}
                          </p>
                        )}
                      </div>

                      {/* Deduct Button for Loose item */}
                      <div className="pt-2 border-t border-slate-100 mt-2">
                        <button
                          onClick={() => {
                            setSelectedLooseItem(item);
                            setDeductLooseModalOpen(true);
                          }}
                          className="w-full flex items-center justify-center space-x-1.5 space-x-reverse px-2.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-[10px] font-black transition-all shadow-xs cursor-pointer"
                        >
                          <MinusCircle className="w-3 h-3" />
                          <span>برداشت / کسر بار</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* CONSIGNMENTS TAB */}
        {activeCategory === 'consignment' && (
          <div className="pt-2">
            <ConsignmentsView onViewInvoice={onViewInvoice} />
          </div>
        )}
      </div>

      {/* Modals */}
      <DeductLooseModal
        item={selectedLooseItem}
        isOpen={deductLooseModalOpen}
        onClose={() => {
          setDeductLooseModalOpen(false);
          setSelectedLooseItem(null);
        }}
        onConfirm={(deductKg, notes) => {
          if (selectedLooseItem) {
            deductFromLooseItem(selectedLooseItem.id, deductKg, notes);
          }
        }}
      />

      <DeductReelModal
        reel={selectedReelItem}
        isOpen={deductReelModalOpen}
        onClose={() => {
          setDeductReelModalOpen(false);
          setSelectedReelItem(null);
        }}
        onConfirm={(deductKg, notes) => {
          if (selectedReelItem) {
            deductFromReelAndMoveToLoose(selectedReelItem.id, deductKg, notes);
          }
        }}
      />

      <DeductCoilModal
        coil={selectedCoilItem}
        isOpen={deductCoilModalOpen}
        onClose={() => {
          setDeductCoilModalOpen(false);
          setSelectedCoilItem(null);
        }}
        onConfirm={(deductKg, notes) => {
          if (selectedCoilItem) {
            deductFromCoilAndMoveToLoose(selectedCoilItem.id, deductKg, notes);
          }
        }}
      />

      <DeductBranchModal
        branch={selectedBranchItem}
        isOpen={deductBranchModalOpen}
        onClose={() => {
          setDeductBranchModalOpen(false);
          setSelectedBranchItem(null);
        }}
        onConfirm={(deductKg, notes) => {
          if (selectedBranchItem) {
            deductFromBranchAndMoveToLoose(selectedBranchItem.id, deductKg, notes);
          }
        }}
      />

      <TransferToConsignmentModal
        isOpen={isConsignmentModalOpen}
        onClose={() => setIsConsignmentModalOpen(false)}
      />

      {/* In-app Deletion Confirmation Modal */}
      {itemToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-sm w-full p-5 text-right space-y-4">
            <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-rose-600" />
              <span>تأیید حذف کالا</span>
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              آیا از حذف <strong>{itemToDelete.title}</strong> از موجودی انبار اطمینان دارید؟
            </p>
            <div className="flex items-center gap-2 justify-end pt-2">
              <button
                disabled={isDeletingItem}
                onClick={() => setItemToDelete(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
              >
                انصراف
              </button>
              <button
                disabled={isDeletingItem}
                onClick={async () => {
                  setIsDeletingItem(true);
                  await new Promise((r) => setTimeout(r, 120));
                  deleteInventoryItem(itemToDelete.category, itemToDelete.id);
                  setIsDeletingItem(false);
                  setItemToDelete(null);
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-60 text-white text-xs font-black rounded-xl cursor-pointer shadow-xs flex items-center gap-1.5"
              >
                {isDeletingItem ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>در حال حذف...</span>
                  </>
                ) : (
                  <span>بله، حذف شود</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
