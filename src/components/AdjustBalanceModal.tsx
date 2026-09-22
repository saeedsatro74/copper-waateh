import React, { useState, useEffect } from 'react';
import {
  Wallet,
  Coins,
  Scale,
  X,
  CheckCircle2,
  ArrowDownLeft,
  ArrowUpRight,
  Settings2,
  Building2,
  User,
  PlusCircle,
  HelpCircle,
} from 'lucide-react';
import { useInventory } from '../context/InventoryContext';
import { formatKg, formatToman, formatPersianNumber } from '../utils/persian';

interface AdjustBalanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultAccount?: 'partner1' | 'partner2' | 'shared';
  defaultAssetType?: 'cash' | 'copper';
}

export const AdjustBalanceModal: React.FC<AdjustBalanceModalProps> = ({
  isOpen,
  onClose,
  defaultAccount = 'partner1',
  defaultAssetType = 'cash',
}) => {
  const { state, adjustPartnerBalance } = useInventory();

  const [targetAccount, setTargetAccount] = useState<'partner1' | 'partner2' | 'shared'>(defaultAccount);
  const assetType = 'cash';
  const [operation, setOperation] = useState<'deposit' | 'withdraw' | 'set_direct'>('set_direct');
  const [amountStr, setAmountStr] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      setTargetAccount(defaultAccount);
      setOperation('set_direct');
      setAmountStr('');
      setNotes('');
    }
  }, [isOpen, defaultAccount]);

  if (!isOpen) return null;

  const partnerInfo = state.warehouseProfile.partnerInfo;
  const p1Name = partnerInfo?.partner1Name || 'شریک اول';
  const p2Name = partnerInfo?.partner2Name || 'شریک دوم';

  const activeAccountName =
    targetAccount === 'partner1'
      ? p1Name
      : targetAccount === 'partner2'
      ? p2Name
      : 'حساب مشترک انبار';

  const accData =
    targetAccount === 'partner1'
      ? partnerInfo?.partner1Account
      : targetAccount === 'partner2'
      ? partnerInfo?.partner2Account
      : partnerInfo?.sharedAccount;

  const currentCash = accData?.initialCash || 0;

  const numAmount = Number(amountStr) || 0;

  // Calculate preview of new balance
  let previewAmount = currentCash;
  if (operation === 'deposit') {
    previewAmount += numAmount;
  } else if (operation === 'withdraw') {
    previewAmount = Math.max(0, previewAmount - numAmount);
  } else if (operation === 'set_direct') {
    previewAmount = numAmount;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (numAmount < 0) return;

    adjustPartnerBalance(targetAccount, 'cash', operation, numAmount, notes.trim());
    onClose();
  };

  const quickPresets = [
    { label: '۱۰ میلیون', value: 10000000 },
    { label: '۲۰ میلیون', value: 20000000 },
    { label: '۵۰ میلیون', value: 50000000 },
    { label: '۱۰۰ میلیون', value: 100000000 },
    { label: '۲۰۰ میلیون', value: 200000000 },
    { label: '۵۰۰ میلیون', value: 500000000 },
  ];

  const quickNotes = [
    'آورده و سرمایه اولیه شریک',
    'واریز نقدی به حساب',
    'شارژ صندوق انبار',
    'برداشت شخصی از سود',
    'خرید بار مس شخصی',
    'اصلاحیه و مغایرت‌گیری موجودی',
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-xl my-4 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 text-white p-4 sm:p-5 flex items-center justify-between">
          <div className="flex items-center space-x-2.5 space-x-reverse min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center text-white font-bold shrink-0 shadow-xs">
              <Wallet className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-black text-sm sm:text-base leading-tight">
                ثبت و ویرایش موجودی نقدی شرکا (تومان)
              </h3>
              <p className="text-[11px] text-amber-100 font-medium mt-0.5">
                تعیین مستقیم، واریز یا برداشت از حساب نقدی {p1Name}، {p2Name} و حساب مشترک
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 text-right">
          {/* Step 1: Select Target Account */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700">
              ۱. انتخاب حساب شریک:
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setTargetAccount('partner1')}
                className={`p-2.5 sm:p-3 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
                  targetAccount === 'partner1'
                    ? 'border-amber-500 bg-amber-50 text-amber-900 font-black shadow-xs ring-1 ring-amber-500'
                    : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <User className="w-4 h-4 text-amber-600" />
                <span className="text-xs truncate w-full">{p1Name}</span>
                <span className="text-[10px] text-slate-500">شریک اول (۵۰٪)</span>
              </button>

              <button
                type="button"
                onClick={() => setTargetAccount('partner2')}
                className={`p-2.5 sm:p-3 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
                  targetAccount === 'partner2'
                    ? 'border-amber-500 bg-amber-50 text-amber-900 font-black shadow-xs ring-1 ring-amber-500'
                    : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <User className="w-4 h-4 text-amber-600" />
                <span className="text-xs truncate w-full">{p2Name}</span>
                <span className="text-[10px] text-slate-500">شریک دوم (۵۰٪)</span>
              </button>

              <button
                type="button"
                onClick={() => setTargetAccount('shared')}
                className={`p-2.5 sm:p-3 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
                  targetAccount === 'shared'
                    ? 'border-amber-500 bg-amber-50 text-amber-900 font-black shadow-xs ring-1 ring-amber-500'
                    : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <Building2 className="w-4 h-4 text-amber-600" />
                <span className="text-xs truncate w-full">حساب مشترک</span>
                <span className="text-[10px] text-slate-500">صندوق انبار</span>
              </button>
            </div>
          </div>

          {/* Step 2: Select Operation (Direct Set vs Deposit vs Withdraw) */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700">
              ۲. نوع عملیات بر روی موجودی نقدی:
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setOperation('set_direct')}
                className={`p-2.5 rounded-xl border text-center text-xs font-bold transition-all cursor-pointer ${
                  operation === 'set_direct'
                    ? 'border-amber-600 bg-amber-600 text-white shadow-xs'
                    : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                }`}
              >
                تعیین مستقیم موجودی
              </button>

              <button
                type="button"
                onClick={() => setOperation('deposit')}
                className={`p-2.5 rounded-xl border text-center text-xs font-bold transition-all cursor-pointer ${
                  operation === 'deposit'
                    ? 'border-emerald-600 bg-emerald-600 text-white shadow-xs'
                    : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                }`}
              >
                + افزایش / واریز نقدی
              </button>

              <button
                type="button"
                onClick={() => setOperation('withdraw')}
                className={`p-2.5 rounded-xl border text-center text-xs font-bold transition-all cursor-pointer ${
                  operation === 'withdraw'
                    ? 'border-rose-600 bg-rose-600 text-white shadow-xs'
                    : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                }`}
              >
                - کاهش / برداشت نقدی
              </button>
            </div>
          </div>

          {/* Current vs New Balance Display */}
          <div className="bg-emerald-50/50 p-3.5 rounded-2xl border border-emerald-200 flex items-center justify-between text-xs">
            <div>
              <span className="text-slate-500 block text-[10px] mb-0.5">موجودی نقدی فعلی:</span>
              <span className="font-black text-slate-900 dir-ltr text-right">
                {formatToman(currentCash)}
              </span>
            </div>

            <div className="text-center font-bold text-emerald-600 text-sm">
              {operation === 'deposit' ? '+' : operation === 'withdraw' ? '-' : '➜'}
            </div>

            <div>
              <span className="text-slate-500 block text-[10px] mb-0.5">موجودی نقدی جدید پس از تغییر:</span>
              <span className="font-black text-emerald-700 text-sm dir-ltr text-right">
                {formatToman(previewAmount)}
              </span>
            </div>
          </div>

          {/* Step 3: Amount Input */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700">
              ۳. مبلغ به تومان:
            </label>
            <div className="relative">
              <input
                type="number"
                min="0"
                step="10000"
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                placeholder={operation === 'set_direct' ? 'موجودی نقدی دقیق جدید را وارد کنید' : 'مبلغ مورد نظر را وارد کنید'}
                required
                className="w-full pl-16 pr-3.5 py-2.5 bg-slate-50 rounded-2xl border border-slate-200 text-sm font-black text-slate-900 focus:outline-hidden focus:border-amber-500"
              />
              <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-500">
                تومان
              </span>
            </div>

            {/* Quick Presets */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {quickPresets.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => setAmountStr(p.value.toString())}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold transition-colors cursor-pointer"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Step 4: Notes & Reason */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700">
              ۴. بابت / توضیحات سند:
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="مثال: آورده نقدی اولیه شریک، خرید مس شخصی، واریز به صندوق..."
              className="w-full px-3 py-2 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-hidden focus:border-amber-500"
            />
            <div className="flex flex-wrap gap-1 pt-1">
              {quickNotes.map((qn) => (
                <button
                  key={qn}
                  type="button"
                  onClick={() => setNotes(qn)}
                  className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-900 text-[10px] font-medium border border-amber-200/60 hover:bg-amber-100 transition-colors cursor-pointer"
                >
                  {qn}
                </button>
              ))}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2 space-x-reverse">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              انصراف
            </button>

            <button
              type="submit"
              disabled={numAmount <= 0}
              className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-black transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>ثبت تغییر موجودی در پنل {activeAccountName}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
