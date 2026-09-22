import React from 'react';
import { Package, CheckSquare, Square, Layers, Sparkles, ArrowRightLeft, ShieldCheck, Trash2 } from 'lucide-react';
import { PalletItem, SelectedItemForAction } from '../types';
import { useInventory } from '../context/InventoryContext';
import { formatKg, formatPersianNumber } from '../utils/persian';
import { formatThickness, formatDiameter } from '../utils/copper';

interface PalletCardProps {
  pallet: PalletItem;
  onIssueSingleReel?: (reelId: string) => void;
  onOpenInvoiceModal: () => void;
}

export const PalletCard: React.FC<PalletCardProps> = ({
  pallet,
  onOpenInvoiceModal,
}) => {
  const { unpackPallet, selectedItems, toggleSelectItem, deleteInventoryItem, state } = useInventory();
  const unitSettings = state.warehouseProfile.unitSettings;

  const totalWeight = pallet.reels.reduce((sum, r) => sum + r.weightKg, 0);

  // Check if whole pallet or specific reels are selected
  const isPalletFullySelected = pallet.reels.every((r) =>
    selectedItems.some((i) => i.id === pallet.id && i.subItemId === r.id)
  );

  const handleToggleReel = (reelId: string, weightKg: number, serialNo: string) => {
    const itemToToggle: SelectedItemForAction = {
      id: pallet.id,
      subItemId: reelId,
      category: 'pallet',
      palletCode: pallet.palletCode,
      brand: pallet.brand,
      thickness: pallet.thickness,
      diameter: pallet.diameter,
      weightKg: weightKg,
      description: `قرقره ${serialNo} (از پالت ${pallet.palletCode})`,
    };
    toggleSelectItem(itemToToggle);
  };

  const handleToggleWholePallet = () => {
    // Select or deselect all reels in pallet
    pallet.reels.forEach((r) => {
      const isSelected = selectedItems.some(
        (i) => i.id === pallet.id && i.subItemId === r.id
      );
      if (isPalletFullySelected && isSelected) {
        // Deselect
        handleToggleReel(r.id, r.weightKg, r.serialNo);
      } else if (!isPalletFullySelected && !isSelected) {
        // Select
        handleToggleReel(r.id, r.weightKg, r.serialNo);
      }
    });
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col justify-between">
      {/* Top Bar with Brand Badge & Pallet Specs */}
      <div>
        <div className="bg-slate-50 border-b border-slate-100 p-2.5 sm:p-4 flex items-center justify-between">
          <div className="flex items-center space-x-2 sm:space-x-3 space-x-reverse min-w-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold shrink-0">
              <Package className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-1.5 space-x-reverse flex-wrap gap-y-0.5">
                <span className="font-bold text-xs sm:text-sm text-slate-900">{pallet.palletCode}</span>
                <span className="px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-800 font-bold text-[10px] sm:text-[11px]">
                  برند {pallet.brand}
                </span>
              </div>
              <p className="text-[10px] sm:text-xs text-slate-500 mt-0.5 truncate">
                ورود: {pallet.entryDate} | {pallet.location}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-1.5 sm:space-x-2 space-x-reverse shrink-0">
            <span className="inline-flex items-center space-x-1 space-x-reverse px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg bg-emerald-50 text-emerald-700 text-[10px] sm:text-xs font-semibold border border-emerald-200/60">
              <ShieldCheck className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-600" />
              <span>پلمپ</span>
            </span>
            <button
              onClick={() => {
                if (window.confirm(`آیا از حذف پالت ${pallet.palletCode} از موجودی انبار اطمینان دارید؟`)) {
                  deleteInventoryItem('pallet', pallet.id);
                }
              }}
              className="p-1 sm:p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
              title="حذف پالت از انبار"
            >
              <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
          </div>
        </div>

        {/* Specs Highlights */}
        <div className="grid grid-cols-3 gap-1 sm:gap-2 p-2 sm:p-3 bg-amber-50/30 border-b border-amber-100/50 text-center text-xs">
          <div>
            <span className="text-slate-400 block text-[9px] sm:text-[10px]">ضخامت</span>
            <span className="font-bold text-slate-800 text-[11px] sm:text-xs">{formatThickness(pallet.thickness, unitSettings?.thicknessUnit)}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[9px] sm:text-[10px]">قطر / سایز</span>
            <span className="font-bold text-slate-800 text-[11px] sm:text-xs">{formatDiameter(pallet.diameter, unitSettings?.diameterUnit)}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[9px] sm:text-[10px]">وزن کل</span>
            <span className="font-bold text-amber-800 text-[11px] sm:text-xs">{formatKg(totalWeight)}</span>
          </div>
        </div>

        {/* Reels List inside the Pallet */}
        <div className="p-2.5 sm:p-4">
          <div className="flex items-center justify-between mb-1.5 sm:mb-2">
            <span className="text-[11px] sm:text-xs font-bold text-slate-700 flex items-center space-x-1 space-x-reverse">
              <Layers className="w-3.5 h-3.5 text-amber-600" />
              <span>قرقره‌های روی پالت ({pallet.reels.length} عدد):</span>
            </span>

            <button
              onClick={handleToggleWholePallet}
              className="text-[10px] sm:text-[11px] font-bold text-amber-700 hover:text-amber-800 hover:underline cursor-pointer"
            >
              {isPalletFullySelected ? 'لغو انتخاب' : 'انتخاب همه'}
            </button>
          </div>

          <div className="space-y-1">
            {pallet.reels.map((reel, idx) => {
              const isSelected = selectedItems.some(
                (i) => i.id === pallet.id && i.subItemId === reel.id
              );
              return (
                <div
                  key={reel.id}
                  onClick={() => handleToggleReel(reel.id, reel.weightKg, reel.serialNo)}
                  className={`flex items-center justify-between p-2 rounded-xl border transition-all cursor-pointer select-none ${
                    isSelected
                      ? 'bg-amber-50 border-amber-300 ring-1 ring-amber-400/50'
                      : 'bg-slate-50/60 border-slate-200 hover:bg-slate-100/80'
                  }`}
                >
                  <div className="flex items-center space-x-2 space-x-reverse">
                    <button className="text-amber-600 focus:outline-hidden">
                      {isSelected ? (
                        <CheckSquare className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-600" />
                      ) : (
                        <Square className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-300" />
                      )}
                    </button>
                    <span className="text-[11px] sm:text-xs font-bold text-slate-800">
                      قرقره {formatPersianNumber(idx + 1)} ({reel.serialNo})
                    </span>
                  </div>

                  <span className="text-[11px] sm:text-xs font-bold text-slate-900 bg-white px-1.5 py-0.5 rounded-md border border-slate-200">
                    {formatKg(reel.weightKg)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="p-2.5 sm:p-3 bg-slate-50 border-t border-slate-100 space-y-1.5">
        <button
          onClick={() => unpackPallet(pallet.id)}
          className="w-full flex items-center justify-center space-x-1.5 space-x-reverse px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-[11px] sm:text-xs font-bold transition-all shadow-xs cursor-pointer"
        >
          <ArrowRightLeft className="w-3.5 h-3.5 text-amber-400" />
          <span>باز کردن پالت (انتقال به قرقره‌ها)</span>
        </button>
      </div>
    </div>
  );
};
