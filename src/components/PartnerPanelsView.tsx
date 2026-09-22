import React, { useState } from 'react';
import {
  Users,
  User,
  Building2,
  Wallet,
  Scale,
  TrendingUp,
  PlusCircle,
  FileText,
  Printer,
  History,
  Layers,
  ArrowUpRight,
  ArrowDownLeft,
  CheckCircle2,
  Coins,
  Package,
  Calendar,
  Clock,
  HelpCircle,
  Edit3,
} from 'lucide-react';
import { useInventory } from '../context/InventoryContext';
import { AdjustBalanceModal } from './AdjustBalanceModal';
import { formatKg, formatToman, formatPersianNumber } from '../utils/persian';
import { Invoice } from '../types';

interface PartnerPanelsViewProps {
  onViewInvoice?: (invoice: Invoice) => void;
}

export const PartnerPanelsView: React.FC<PartnerPanelsViewProps> = ({ onViewInvoice }) => {
  const { state } = useInventory();

  const [activePanel, setActivePanel] = useState<'partner1' | 'partner2' | 'shared' | 'comparison'>('partner1');
  const [panelSubTab, setPanelSubTab] = useState<'adjustments' | 'stock' | 'invoices' | 'entries'>('adjustments');

  // Modal State
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [modalDefaultAccount, setModalDefaultAccount] = useState<'partner1' | 'partner2' | 'shared'>('partner1');

  const partnerInfo = state.warehouseProfile.partnerInfo;
  const p1Name = partnerInfo?.partner1Name || 'شریک اول (مدیر ۱)';
  const p2Name = partnerInfo?.partner2Name || 'شریک دوم (مدیر ۲)';

  // Base buy price per kg for company profit estimation (default 3,200,000 Toman)
  const [baseBuyPricePerKg, setBaseBuyPricePerKg] = useState<number>(3200000);

  // Official sales calculations
  const officialInvoices = state.invoices.filter((i) => i.status === 'official' && i.type === 'exit');
  const officialSalesAmount = officialInvoices.reduce((acc, inv) => acc + inv.totalAmount, 0);
  const officialWeightKg = officialInvoices.reduce((acc, inv) => acc + inv.totalWeightKg, 0);

  // Net Company Profit
  const totalPurchaseCost = officialWeightKg * baseBuyPricePerKg;
  const companyNetProfit = officialSalesAmount - totalPurchaseCost;
  const partner1ProfitShare = (companyNetProfit * (partnerInfo?.partner1SharePercent || 50)) / 100;
  const partner2ProfitShare = (companyNetProfit * (partnerInfo?.partner2SharePercent || 50)) / 100;

  const openAdjustModal = (acc: 'partner1' | 'partner2' | 'shared') => {
    setModalDefaultAccount(acc);
    setIsAdjustModalOpen(true);
  };

  // Helper calculations for each partner/account:
  const getAccountData = (acc: 'partner1' | 'partner2' | 'shared') => {
    const accName = acc === 'partner1' ? p1Name : acc === 'partner2' ? p2Name : 'حساب مشترک (۵۰-۵۰)';
    const storedData =
      acc === 'partner1'
        ? partnerInfo?.partner1Account
        : acc === 'partner2'
        ? partnerInfo?.partner2Account
        : partnerInfo?.sharedAccount;

    const initialCash = storedData?.initialCash || 0;
    const initialCopperKg = storedData?.initialCopperKg || 0;

    // Cash received from official invoices
    let invoiceCash = 0;
    const allocatedInvoices: { invoice: Invoice; allocatedAmount: number }[] = [];

    state.invoices.forEach((inv) => {
      if (inv.status === 'official' && inv.paymentAllocation) {
        const allocated =
          acc === 'partner1'
            ? inv.paymentAllocation.partner1Amount || 0
            : acc === 'partner2'
            ? inv.paymentAllocation.partner2Amount || 0
            : inv.paymentAllocation.sharedAmount || 0;

        if (allocated > 0) {
          invoiceCash += allocated;
          allocatedInvoices.push({ invoice: inv, allocatedAmount: allocated });
        }
      }
    });

    // Copper stock items currently owned by this purchaser in inventory
    let stockCopperKg = 0;
    const ownedPallets: any[] = [];
    const ownedReels: any[] = [];
    const ownedCoils: any[] = [];
    const ownedBranches: any[] = [];
    const ownedLoose: any[] = [];

    const isMatch = (purchaser?: string) => {
      if (acc === 'partner1') return purchaser === p1Name;
      if (acc === 'partner2') return purchaser === p2Name;
      return !purchaser || purchaser === 'حساب مشترک (۵۰-۵۰)' || purchaser.includes('مشترک');
    };

    state.pallets.forEach((p) => {
      if (isMatch(p.purchaser)) {
        const pWeight = p.reels.reduce((s, r) => s + r.weightKg, 0);
        stockCopperKg += pWeight;
        ownedPallets.push(p);
      }
    });

    state.reels.forEach((r) => {
      if (isMatch(r.purchaser)) {
        stockCopperKg += r.weightKg;
        ownedReels.push(r);
      }
    });

    state.coils.forEach((c) => {
      if (isMatch(c.purchaser)) {
        stockCopperKg += c.weightKg;
        ownedCoils.push(c);
      }
    });

    state.branches.forEach((b) => {
      if (isMatch(b.purchaser)) {
        stockCopperKg += b.totalWeightKg;
        ownedBranches.push(b);
      }
    });

    state.loose.forEach((l) => {
      if (isMatch(l.purchaser)) {
        stockCopperKg += l.weightKg;
        ownedLoose.push(l);
      }
    });

    // Entry purchases recorded for this purchaser
    const entryTransactions = state.transactions.filter(
      (tx) => tx.type === 'entry' && isMatch(tx.purchaser)
    );

    // Adjustments history
    const adjustments = (state.balanceAdjustments || []).filter(
      (adj) => adj.targetAccount === acc
    );

    const totalCash = initialCash + invoiceCash;
    const totalCopperKg = initialCopperKg + stockCopperKg;

    return {
      accKey: acc,
      accName,
      initialCash,
      initialCopperKg,
      invoiceCash,
      totalCash,
      stockCopperKg,
      totalCopperKg,
      allocatedInvoices,
      ownedPallets,
      ownedReels,
      ownedCoils,
      ownedBranches,
      ownedLoose,
      entryTransactions,
      adjustments,
      totalItemsCount:
        ownedPallets.length +
        ownedReels.length +
        ownedCoils.length +
        ownedBranches.length +
        ownedLoose.length,
    };
  };

  const p1Data = getAccountData('partner1');
  const p2Data = getAccountData('partner2');
  const sharedData = getAccountData('shared');

  const currentActiveData =
    activePanel === 'partner1'
      ? p1Data
      : activePanel === 'partner2'
      ? p2Data
      : activePanel === 'shared'
      ? sharedData
      : null;

  return (
    <div className="space-y-4 sm:space-y-6 pb-16">
      {/* Top Banner Header */}
      <div className="bg-white p-3.5 sm:p-6 rounded-3xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <div className="flex items-center space-x-2.5 sm:space-x-3 space-x-reverse min-w-0">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center font-bold shrink-0 shadow-sm">
            <Coins className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm sm:text-lg font-black text-slate-900 truncate">
              پنل‌های ادمین ۱، ادمین ۲ و حساب مشترک
            </h2>
            <p className="text-[10px] sm:text-xs text-slate-500 mt-0.5 line-clamp-1">
              مدیریت مستقل موجودی نقدی، سرمایه، سهم واریزی‌های فاکتور و کاردکس هر حساب
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 space-x-reverse w-full sm:w-auto">
          <button
            onClick={() => openAdjustModal(activePanel === 'comparison' ? 'partner1' : activePanel)}
            className="flex-1 sm:flex-none flex items-center justify-center space-x-1.5 space-x-reverse px-4 py-2.5 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-xs cursor-pointer transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            <span>ثبت / ویرایش موجودی نقدی</span>
          </button>

          <button
            onClick={() => window.print()}
            className="flex items-center justify-center p-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
            title="چاپ گزارش حساب‌ها"
          >
            <Printer className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Clean & Compact Company Profit Summary (Matching Warm Amber/Slate Palette) */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center space-x-2.5 space-x-reverse">
            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-black text-xs sm:text-sm text-slate-900">
                سود کل شرکت و سهم شرکا
              </h3>
              <p className="text-[10px] text-slate-500">
                محاسبه سود خالص بر مبنای {formatKg(officialWeightKg)} فروش قطعی رسمی
              </p>
            </div>
          </div>

          {/* Inline base buy rate setting */}
          <div className="flex items-center space-x-2 space-x-reverse bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 text-xs">
            <span className="text-slate-600 font-bold text-[11px] whitespace-nowrap">نرخ پایه خرید مس:</span>
            <input
              type="number"
              value={baseBuyPricePerKg}
              onChange={(e) => setBaseBuyPricePerKg(Number(e.target.value) || 0)}
              className="w-24 px-2 py-0.5 bg-white rounded-lg border border-slate-200 text-xs font-bold text-slate-800 text-center focus:ring-1 focus:ring-amber-500"
            />
            <span className="text-[10px] text-slate-500">تومان/کیلو</span>
          </div>
        </div>

        {/* 3 Metrics: Company Profit, Partner 1 Share, Partner 2 Share */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3">
          <div className="bg-amber-50/70 p-3.5 rounded-2xl border border-amber-200/80 flex flex-col justify-between">
            <span className="text-[11px] font-bold text-amber-900">سود خالص کل شرکت</span>
            <div className="mt-1">
              <span className={`text-base sm:text-lg font-black block truncate ${companyNetProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                {formatToman(companyNetProfit)}
              </span>
              <span className="text-[10px] text-slate-500">
                کل دریافتی فروش: {formatToman(officialSalesAmount)}
              </span>
            </div>
          </div>

          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 flex flex-col justify-between">
            <span className="text-[11px] font-bold text-slate-700">
              سهم سود {p1Name} (۵۰٪)
            </span>
            <div className="mt-1">
              <span className="text-base sm:text-lg font-black text-slate-900 block truncate">
                {formatToman(partner1ProfitShare)}
              </span>
              <span className="text-[10px] text-slate-500">قابل واریز به حساب شخصی</span>
            </div>
          </div>

          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 flex flex-col justify-between">
            <span className="text-[11px] font-bold text-slate-700">
              سهم سود {p2Name} (۵۰٪)
            </span>
            <div className="mt-1">
              <span className="text-base sm:text-lg font-black text-slate-900 block truncate">
                {formatToman(partner2ProfitShare)}
              </span>
              <span className="text-[10px] text-slate-500">قابل واریز به حساب شخصی</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3 Main Panels Selector Tabs + Comparison Tab */}
      <div className="bg-slate-100/80 p-1.5 rounded-2xl border border-slate-200/80 grid grid-cols-2 sm:grid-cols-4 gap-1.5">
        <button
          onClick={() => setActivePanel('partner1')}
          className={`py-2.5 px-3 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activePanel === 'partner1'
              ? 'bg-white text-amber-900 shadow-sm border border-amber-200'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
          }`}
        >
          <User className="w-4 h-4 text-amber-600" />
          <span className="truncate">پنل {p1Name} (ادمین ۱)</span>
        </button>

        <button
          onClick={() => setActivePanel('partner2')}
          className={`py-2.5 px-3 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activePanel === 'partner2'
              ? 'bg-white text-amber-900 shadow-sm border border-amber-200'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
          }`}
        >
          <User className="w-4 h-4 text-amber-600" />
          <span className="truncate">پنل {p2Name} (ادمین ۲)</span>
        </button>

        <button
          onClick={() => setActivePanel('shared')}
          className={`py-2.5 px-3 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activePanel === 'shared'
              ? 'bg-white text-amber-900 shadow-sm border border-amber-200'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
          }`}
        >
          <Building2 className="w-4 h-4 text-amber-600" />
          <span className="truncate">پنل حساب مشترک (۵۰-۵۰)</span>
        </button>

        <button
          onClick={() => setActivePanel('comparison')}
          className={`py-2.5 px-3 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activePanel === 'comparison'
              ? 'bg-amber-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
          }`}
        >
          <Scale className="w-4 h-4" />
          <span>مقایسه هم‌زمان ۳ حساب</span>
        </button>
      </div>

      {/* Comparison View: 3 Panels Side-by-Side */}
      {activePanel === 'comparison' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-in fade-in duration-200">
          {[p1Data, p2Data, sharedData].map((acc, idx) => (
            <div
              key={acc.accKey}
              className={`bg-white rounded-3xl border p-5 shadow-xs flex flex-col justify-between space-y-4 ${
                idx === 2 ? 'border-amber-400 ring-2 ring-amber-400/20' : 'border-slate-200'
              }`}
            >
              <div>
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                      {idx === 2 ? <Building2 className="w-4 h-4" /> : <User className="w-4 h-4" />}
                    </div>
                    <div>
                      <h3 className="font-black text-slate-900 text-sm">{acc.accName}</h3>
                      <span className="text-[10px] text-slate-400">
                        {idx === 2 ? 'انبار و صندوق مشترک' : `سهم شراکت ۵۰٪`}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => setActivePanel(acc.accKey)}
                    className="text-[11px] font-bold text-amber-700 hover:text-amber-800 cursor-pointer"
                  >
                    مشاهده ریز ➜
                  </button>
                </div>

                {/* Account Balances (Cash Only) */}
                <div className="mt-4 space-y-2.5">
                  <div className="bg-amber-50/80 p-3.5 rounded-2xl border border-amber-200">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-700 font-bold flex items-center gap-1.5">
                        <Wallet className="w-4 h-4 text-amber-600" />
                        <span>کل موجودی نقدی جاری:</span>
                      </span>
                      <span className="font-black text-amber-900 dir-ltr text-right text-base">
                        {formatToman(acc.totalCash)}
                      </span>
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-2 text-[11px] text-slate-600 pt-2 border-t border-amber-200/80">
                      <div>
                        <span className="text-slate-400 block text-[10px]">آورده و خرید بار:</span>
                        <span className="font-bold text-slate-800">{formatToman(acc.initialCash)}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">واریزی فروش فاکتورها:</span>
                        <span className="font-bold text-slate-800">{formatToman(acc.invoiceCash)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 flex justify-between items-center text-xs">
                    <span className="text-slate-500 font-medium">تعداد فاکتورهای تسویه شده:</span>
                    <span className="font-bold text-slate-800">{formatPersianNumber(acc.allocatedInvoices.length)} فاکتور</span>
                  </div>
                </div>
              </div>

              {/* Quick Action Button for this account */}
              <div className="pt-2 border-t border-slate-100">
                <button
                  onClick={() => openAdjustModal(acc.accKey)}
                  className="w-full py-2.5 px-3 bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-black rounded-xl border border-amber-300 cursor-pointer transition-colors text-center flex items-center justify-center gap-1.5"
                >
                  <Wallet className="w-4 h-4 text-amber-600" />
                  <span>ثبت و ویرایش موجودی نقدی</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Single Selected Panel Detailed View */}
      {currentActiveData && (
        <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-200">
          {/* Main KPI Status Cards for this account */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            {/* Cash Balance Card (Amber Theme matching the rest of the application) */}
            <div className="bg-gradient-to-br from-amber-500 via-orange-600 to-amber-700 text-white p-4 sm:p-5 rounded-3xl shadow-sm space-y-2 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-100 flex items-center gap-1.5">
                  <Wallet className="w-4 h-4" />
                  <span>کل موجودی نقدی حساب</span>
                </span>
                <button
                  onClick={() => openAdjustModal(currentActiveData.accKey)}
                  className="p-1 rounded-lg bg-white/20 hover:bg-white/30 text-white transition-colors cursor-pointer"
                  title="تغییر یا ثبت موجودی نقدی"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="text-lg sm:text-2xl font-black dir-ltr text-right">
                {formatToman(currentActiveData.totalCash)}
              </div>

              <div className="text-[11px] text-amber-100 pt-1 border-t border-white/20 flex justify-between">
                <span>سرمایه و خریدها: {formatToman(currentActiveData.initialCash)}</span>
                <span>دریافتی فروش: {formatToman(currentActiveData.invoiceCash)}</span>
              </div>
            </div>

            {/* Total Invoices Allocated */}
            <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-xs space-y-2">
              <div className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-amber-600" />
                <span>واریزی‌های فاکتور رسمی</span>
              </div>
              <div className="text-lg sm:text-2xl font-black text-amber-900 dir-ltr text-right">
                {formatToman(currentActiveData.invoiceCash)}
              </div>
              <div className="text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                مجموع سهم واریز شده از تسویه فاکتورها
              </div>
            </div>

            {/* Total Invoices Count */}
            <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-xs space-y-2">
              <div className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-amber-600" />
                <span>فاکتورهای تسویه شده</span>
              </div>
              <div className="text-lg sm:text-2xl font-black text-slate-900">
                {formatPersianNumber(currentActiveData.allocatedInvoices.length)} فاکتور
              </div>
              <div className="text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                سهم واریزی به این حساب ثبت شده است
              </div>
            </div>
          </div>

          {/* Sub-Tabs Navigation for this specific account */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="border-b border-slate-200 bg-slate-50/60 px-4 py-2 flex items-center space-x-2 space-x-reverse overflow-x-auto">
              <button
                onClick={() => setPanelSubTab('adjustments')}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  panelSubTab === 'adjustments'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                تاریخچه تغییرات موجودی ({formatPersianNumber(currentActiveData.adjustments.length)})
              </button>

              <button
                onClick={() => setPanelSubTab('stock')}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  panelSubTab === 'stock'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                بارهای مس در انبار ({formatPersianNumber(currentActiveData.totalItemsCount)})
              </button>

              <button
                onClick={() => setPanelSubTab('invoices')}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  panelSubTab === 'invoices'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                واریزی‌های فاکتور رسمی ({formatPersianNumber(currentActiveData.allocatedInvoices.length)})
              </button>

              <button
                onClick={() => setPanelSubTab('entries')}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  panelSubTab === 'entries'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                سوابق خرید و ورود بار ({formatPersianNumber(currentActiveData.entryTransactions.length)})
              </button>
            </div>

            <div className="p-4 sm:p-6">
              {/* 1. Adjustments History Tab */}
              {panelSubTab === 'adjustments' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-black text-xs sm:text-sm text-slate-800">
                      سوابق ثبت، واریز، برداشت و تنظیمات موجودی {currentActiveData.accName}
                    </h4>
                    <button
                      onClick={() => openAdjustModal(currentActiveData.accKey)}
                      className="text-xs font-bold text-amber-700 hover:underline cursor-pointer"
                    >
                      + ثبت تغییر جدید
                    </button>
                  </div>

                  {currentActiveData.adjustments.length === 0 ? (
                    <div className="text-center py-8 text-slate-400 text-xs font-bold">
                      هنوز هیچ تغییر یا تنظیمی برای این حساب ثبت نشده است.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-right text-xs">
                        <thead>
                          <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                            <th className="p-3">تاریخ و ساعت</th>
                            <th className="p-3">نوع دارایی</th>
                            <th className="p-3">نوع عملیات</th>
                            <th className="p-3">مقدار تغییر</th>
                            <th className="p-3">موجودی جدید</th>
                            <th className="p-3">بابت / توضیحات</th>
                            <th className="p-3">ثبت‌کننده</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {currentActiveData.adjustments.map((adj) => (
                            <tr key={adj.id} className="hover:bg-slate-50">
                              <td className="p-3 font-medium text-slate-600">
                                {adj.date} - {adj.time}
                              </td>
                              <td className="p-3 font-bold">
                                {adj.assetType === 'cash' ? (
                                  <span className="text-emerald-700">وجه نقد</span>
                                ) : (
                                  <span className="text-amber-800">مس فیزیکی</span>
                                )}
                              </td>
                              <td className="p-3">
                                {adj.operation === 'deposit' ? (
                                  <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                                    + واریز / افزایش
                                  </span>
                                ) : adj.operation === 'withdraw' ? (
                                  <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 font-bold text-[10px]">
                                    - برداشت / کاهش
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-900 font-bold text-[10px]">
                                    تنظیم مستقیم
                                  </span>
                                )}
                              </td>
                              <td className="p-3 font-black text-slate-900">
                                {adj.assetType === 'cash' ? formatToman(adj.amount) : formatKg(adj.amount)}
                              </td>
                              <td className="p-3 font-bold text-amber-900">
                                {adj.newAmount !== undefined
                                  ? adj.assetType === 'cash'
                                    ? formatToman(adj.newAmount)
                                    : formatKg(adj.newAmount)
                                  : '-'}
                              </td>
                              <td className="p-3 text-slate-600 font-medium">
                                {adj.notes || '-'}
                              </td>
                              <td className="p-3 text-slate-500 font-medium text-[11px]">
                                {adj.registeredBy}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* 2. Copper Items in Warehouse Tab */}
              {panelSubTab === 'stock' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-black text-xs sm:text-sm text-slate-800">
                      بارهای مس فیزیکی موجود در انبار به نام {currentActiveData.accName}
                    </h4>
                    <span className="text-xs font-bold text-amber-800">
                      مجموع وزن بارها: {formatKg(currentActiveData.stockCopperKg)}
                    </span>
                  </div>

                  {currentActiveData.totalItemsCount === 0 ? (
                    <div className="text-center py-8 text-slate-400 text-xs font-bold">
                      هیچ کالای فیزیکی در انبار به نام این حساب ثبت نشده است.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {/* Pallets */}
                      {currentActiveData.ownedPallets.length > 0 && (
                        <div>
                          <h5 className="font-bold text-xs text-slate-700 mb-1.5">
                            پالت‌ها ({formatPersianNumber(currentActiveData.ownedPallets.length)}):
                          </h5>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {currentActiveData.ownedPallets.map((plt) => {
                              const weight = plt.reels.reduce((s: number, r: any) => s + r.weightKg, 0);
                              return (
                                <div key={plt.id} className="bg-slate-50 p-3 rounded-2xl border border-slate-200 flex justify-between items-center text-xs">
                                  <div>
                                    <span className="font-bold text-slate-900 block">{plt.palletCode}</span>
                                    <span className="text-[10px] text-slate-500">{plt.brand} | {plt.diameter} | {plt.thickness}</span>
                                  </div>
                                  <span className="font-black text-amber-900">{formatKg(weight)}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Standalone Reels */}
                      {currentActiveData.ownedReels.length > 0 && (
                        <div>
                          <h5 className="font-bold text-xs text-slate-700 mb-1.5">
                            قرقره‌ها ({formatPersianNumber(currentActiveData.ownedReels.length)}):
                          </h5>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {currentActiveData.ownedReels.map((rel) => (
                              <div key={rel.id} className="bg-slate-50 p-3 rounded-2xl border border-slate-200 flex justify-between items-center text-xs">
                                <div>
                                  <span className="font-bold text-slate-900 block">{rel.reelCode}</span>
                                  <span className="text-[10px] text-slate-500">{rel.brand} | {rel.diameter}</span>
                                </div>
                                <span className="font-black text-amber-900">{formatKg(rel.weightKg)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Coils */}
                      {currentActiveData.ownedCoils.length > 0 && (
                        <div>
                          <h5 className="font-bold text-xs text-slate-700 mb-1.5">
                            کلاف‌ها ({formatPersianNumber(currentActiveData.ownedCoils.length)}):
                          </h5>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {currentActiveData.ownedCoils.map((c) => (
                              <div key={c.id} className="bg-slate-50 p-3 rounded-2xl border border-slate-200 flex justify-between items-center text-xs">
                                <div>
                                  <span className="font-bold text-slate-900 block">{c.code}</span>
                                  <span className="text-[10px] text-slate-500">{c.brand} | {c.thickness}</span>
                                </div>
                                <span className="font-black text-amber-900">{formatKg(c.weightKg)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Branches */}
                      {currentActiveData.ownedBranches.length > 0 && (
                        <div>
                          <h5 className="font-bold text-xs text-slate-700 mb-1.5">
                            شاخه‌ها ({formatPersianNumber(currentActiveData.ownedBranches.length)}):
                          </h5>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {currentActiveData.ownedBranches.map((b) => (
                              <div key={b.id} className="bg-slate-50 p-3 rounded-2xl border border-slate-200 flex justify-between items-center text-xs">
                                <div>
                                  <span className="font-bold text-slate-900 block">{b.code} ({b.count} شاخه)</span>
                                  <span className="text-[10px] text-slate-500">{b.brand} | {b.diameter}</span>
                                </div>
                                <span className="font-black text-amber-900">{formatKg(b.totalWeightKg)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Loose */}
                      {currentActiveData.ownedLoose.length > 0 && (
                        <div>
                          <h5 className="font-bold text-xs text-slate-700 mb-1.5">
                            خورده‌فروشی ({formatPersianNumber(currentActiveData.ownedLoose.length)}):
                          </h5>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {currentActiveData.ownedLoose.map((l) => (
                              <div key={l.id} className="bg-slate-50 p-3 rounded-2xl border border-slate-200 flex justify-between items-center text-xs">
                                <div>
                                  <span className="font-bold text-slate-900 block">{l.code}</span>
                                  <span className="text-[10px] text-slate-500">{l.description}</span>
                                </div>
                                <span className="font-black text-amber-900">{formatKg(l.weightKg)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* 3. Invoices Allocated Tab */}
              {panelSubTab === 'invoices' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-black text-xs sm:text-sm text-slate-800">
                      فاکتورهای رسمی و مبالغ واریز شده به حساب {currentActiveData.accName}
                    </h4>
                    <span className="text-xs font-bold text-emerald-700">
                      مجموع دریافتی: {formatToman(currentActiveData.invoiceCash)}
                    </span>
                  </div>

                  {currentActiveData.allocatedInvoices.length === 0 ? (
                    <div className="text-center py-8 text-slate-400 text-xs font-bold">
                      هنوز مبلغی از فاکتورهای رسمی به این حساب واریز نشده است.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-right text-xs">
                        <thead>
                          <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                            <th className="p-3">شماره فاکتور</th>
                            <th className="p-3">تاریخ</th>
                            <th className="p-3">نام خریدار</th>
                            <th className="p-3">وزن بار (kg)</th>
                            <th className="p-3">مبلغ کل فاکتور</th>
                            <th className="p-3">سهم واریزی این حساب</th>
                            <th className="p-3 text-center">عملیات</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {currentActiveData.allocatedInvoices.map(({ invoice, allocatedAmount }) => (
                            <tr key={invoice.id} className="hover:bg-slate-50">
                              <td className="p-3 font-bold text-slate-900">
                                {invoice.officialInvoiceNumber || invoice.invoiceNumber}
                              </td>
                              <td className="p-3 text-slate-600">{invoice.officialDate || invoice.date}</td>
                              <td className="p-3 font-bold text-slate-800">{invoice.customerName}</td>
                              <td className="p-3 font-bold text-amber-800">{formatKg(invoice.totalWeightKg)}</td>
                              <td className="p-3 font-bold text-slate-900">{formatToman(invoice.totalAmount)}</td>
                              <td className="p-3 font-black text-emerald-700">{formatToman(allocatedAmount)}</td>
                              <td className="p-3 text-center">
                                {onViewInvoice && (
                                  <button
                                    onClick={() => onViewInvoice(invoice)}
                                    className="px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 font-bold text-[11px] border border-amber-200 cursor-pointer"
                                  >
                                    مشاهده
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* 4. Entry Purchases Tab */}
              {panelSubTab === 'entries' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-black text-xs sm:text-sm text-slate-800">
                      سوابق خریدهای ثبت شده توسط / به نام {currentActiveData.accName}
                    </h4>
                  </div>

                  {currentActiveData.entryTransactions.length === 0 ? (
                    <div className="text-center py-8 text-slate-400 text-xs font-bold">
                      هیچ تراکنش ورود باری با پرداخت‌کنندگی این حساب ثبت نشده است.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-right text-xs">
                        <thead>
                          <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                            <th className="p-3">تاریخ و ساعت</th>
                            <th className="p-3">عنوان ورود بار</th>
                            <th className="p-3">تامین‌کننده</th>
                            <th className="p-3">وزن (kg)</th>
                            <th className="p-3">فی هر کیلو</th>
                            <th className="p-3">مبلغ کل خرید</th>
                            <th className="p-3">ثبت‌کننده</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {currentActiveData.entryTransactions.map((tx) => (
                            <tr key={tx.id} className="hover:bg-slate-50">
                              <td className="p-3 text-slate-600">{tx.timestamp}</td>
                              <td className="p-3 font-bold text-slate-900">{tx.title}</td>
                              <td className="p-3 font-medium text-slate-700">{tx.buyerOrSupplier || '-'}</td>
                              <td className="p-3 font-bold text-amber-800">{formatKg(tx.totalWeightKg)}</td>
                              <td className="p-3 font-medium text-slate-700">
                                {tx.pricePerKg ? `${formatToman(tx.pricePerKg)}/kg` : '-'}
                              </td>
                              <td className="p-3 font-black text-slate-900">
                                {tx.totalPrice ? formatToman(tx.totalPrice) : '-'}
                              </td>
                              <td className="p-3 text-slate-500 text-[11px]">{tx.registeredBy}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Adjust Balance Modal */}
      <AdjustBalanceModal
        isOpen={isAdjustModalOpen}
        onClose={() => setIsAdjustModalOpen(false)}
        defaultAccount={modalDefaultAccount}
      />
    </div>
  );
};
