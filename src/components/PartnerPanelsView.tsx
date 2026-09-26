import React, { useState } from 'react';
import {
  User,
  Building2,
  Wallet,
  TrendingUp,
  PlusCircle,
  Coins,
  Scale,
  Eye,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { useInventory } from '../context/InventoryContext';
import { AdjustBalanceModal } from './AdjustBalanceModal';
import { formatKg, formatToman, formatPersianNumber } from '../utils/persian';
import { Invoice } from '../types';

interface PartnerPanelsViewProps {
  onViewInvoice?: (invoice: Invoice) => void;
}

export const PartnerPanelsView: React.FC<PartnerPanelsViewProps> = ({ onViewInvoice }) => {
  const { state, clearCheque, updateChequeStatus } = useInventory();

  const [activePanel, setActivePanel] = useState<'partner1' | 'partner2' | 'shared'>('partner1');

  // Modal State
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [modalDefaultAccount, setModalDefaultAccount] = useState<'partner1' | 'partner2' | 'shared'>('partner1');

  const partnerInfo = state.warehouseProfile.partnerInfo;
  const p1Name = partnerInfo?.partner1Name || 'شریک اول (مدیر ۱)';
  const p2Name = partnerInfo?.partner2Name || 'شریک دوم (مدیر ۲)';
  const p1SharePercent = partnerInfo?.partner1SharePercent ?? 50;
  const p2SharePercent = partnerInfo?.partner2SharePercent ?? 50;

  const openAdjustModal = (acc: 'partner1' | 'partner2' | 'shared') => {
    setModalDefaultAccount(acc);
    setIsAdjustModalOpen(true);
  };

  // Helper to accurately calculate invoice cost and profit: (Sale Price - Buy Price)
  const getInvoiceMetrics = (inv: Invoice) => {
    let cost = 0;
    if (inv.totalCost && inv.totalCost > 0) {
      cost = inv.totalCost;
    } else if (inv.items && inv.items.length > 0) {
      cost = inv.items.reduce((s, it) => {
        const buyPrice = (it.buyPricePerKg && it.buyPricePerKg > 0) ? it.buyPricePerKg : 680000;
        return s + Math.round(it.weightKg * buyPrice);
      }, 0);
    } else {
      cost = Math.round(inv.totalWeightKg * 680000);
    }

    const saleAmount = inv.totalAmount || 0;
    const profit = (inv.totalProfit !== undefined && inv.totalProfit !== null && !isNaN(inv.totalProfit))
      ? inv.totalProfit
      : saleAmount - cost;

    // Panel profit shares: (Sale Price - Buy Price) * Share %
    const p1Profit = Math.round((profit * p1SharePercent) / 100);
    const p2Profit = Math.round((profit * p2SharePercent) / 100);

    return {
      saleAmount,
      cost,
      profit,
      weightKg: inv.totalWeightKg || 0,
      p1Profit,
      p2Profit,
    };
  };

  // All active exit invoices
  const activeExitInvoices = state.invoices.filter((i) => i.type === 'exit' && i.status !== 'cancelled');

  // Total company net profit from actual sales
  const companyTotalProfit = activeExitInvoices.reduce((s, inv) => s + getInvoiceMetrics(inv).profit, 0);

  const p1TotalProfit = Math.round((companyTotalProfit * p1SharePercent) / 100);
  const partner2TotalProfit = Math.round((companyTotalProfit * p2SharePercent) / 100);

  // Helper calculations for each partner/account
  const getAccountData = (acc: 'partner1' | 'partner2' | 'shared') => {
    const accName = acc === 'partner1' ? p1Name : acc === 'partner2' ? p2Name : 'حساب مشترک';
    const storedData =
      acc === 'partner1'
        ? partnerInfo?.partner1Account
        : acc === 'partner2'
        ? partnerInfo?.partner2Account
        : partnerInfo?.sharedAccount;

    const initialCash = storedData?.initialCash || 0;
    const initialCopperKg = storedData?.initialCopperKg || 0;

    const isMatch = (purchaser?: string) => {
      if (acc === 'partner1') {
        return purchaser === p1Name || (purchaser?.includes('اول') ?? false) || (purchaser?.includes('مدیر ۱') ?? false);
      }
      if (acc === 'partner2') {
        return purchaser === p2Name || (purchaser?.includes('دوم') ?? false) || (purchaser?.includes('مدیر ۲') ?? false);
      }
      return !purchaser || purchaser === 'حساب مشترک' || purchaser.includes('مشترک');
    };

    // Copper stock items currently physical in warehouse
    let stockCopperKg = 0;
    state.pallets.forEach((p) => {
      if (isMatch(p.purchaser)) {
        stockCopperKg += p.reels.reduce((s, r) => s + r.weightKg, 0);
      }
    });
    state.reels.forEach((r) => {
      if (isMatch(r.purchaser)) stockCopperKg += r.weightKg;
    });
    state.coils.forEach((c) => {
      if (isMatch(c.purchaser)) stockCopperKg += c.weightKg;
    });
    state.branches.forEach((b) => {
      if (isMatch(b.purchaser)) stockCopperKg += b.totalWeightKg;
    });
    state.loose.forEach((l) => {
      if (isMatch(l.purchaser)) stockCopperKg += l.weightKg;
    });

    // Profit share for this account
    const profitShare =
      acc === 'partner1'
        ? p1TotalProfit
        : acc === 'partner2'
        ? partner2TotalProfit
        : companyTotalProfit;

    // Total cash reflects initialCash (which receives deductions & entries)
    const totalCash = initialCash;
    const totalCopperKg = initialCopperKg > 0 ? initialCopperKg : stockCopperKg;

    return {
      accKey: acc,
      accName,
      initialCash,
      initialCopperKg,
      totalCash,
      stockCopperKg,
      totalCopperKg,
      profitShare,
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
      : sharedData;

  const activeSharePercent =
    activePanel === 'partner1'
      ? p1SharePercent
      : activePanel === 'partner2'
      ? p2SharePercent
      : 100;

  // Filter cheques for the current active account/panel
  const panelCheques = (state.cheques || []).filter((ch) => ch.partnerAccount === activePanel);

  return (
    <div className="space-y-4 text-right">
      {/* 1. Account Selector Tabs at the VERY TOP */}
      <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 rounded-2xl border border-slate-200">
        <button
          onClick={() => setActivePanel('partner1')}
          className={`py-2 px-2 rounded-xl font-black text-xs sm:text-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activePanel === 'partner1'
              ? 'bg-amber-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-950'
          }`}
        >
          <User className="w-4 h-4 shrink-0" />
          <span className="truncate">{p1Name} ({formatPersianNumber(p1SharePercent)}٪)</span>
        </button>

        <button
          onClick={() => setActivePanel('partner2')}
          className={`py-2 px-2 rounded-xl font-black text-xs sm:text-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activePanel === 'partner2'
              ? 'bg-amber-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-950'
          }`}
        >
          <User className="w-4 h-4 shrink-0" />
          <span className="truncate">{p2Name} ({formatPersianNumber(p2SharePercent)}٪)</span>
        </button>

        <button
          onClick={() => setActivePanel('shared')}
          className={`py-2 px-2 rounded-xl font-black text-xs sm:text-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activePanel === 'shared'
              ? 'bg-amber-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-950'
          }`}
        >
          <Building2 className="w-4 h-4 shrink-0" />
          <span className="truncate">حساب مشترک</span>
        </button>
      </div>

      {/* 2. Compact Info Bar with Single Action */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200 flex flex-wrap items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
            <Coins className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-xs font-black text-slate-800">
              پنل حسابداری: {currentActiveData.accName}
            </h2>
            <p className="text-[10px] text-slate-500 font-medium">
              درصد سهم سود از فروش مس: {formatPersianNumber(activeSharePercent)}٪ | محاسبه سود: (قیمت فروش - قیمت خرید) × سهم
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => openAdjustModal(currentActiveData.accKey)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] cursor-pointer shadow-xs"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>ثبت/ویرایش نقدی</span>
          </button>
        </div>
      </div>

      {/* 3. Exactly THREE Metrics: Cash, Copper Stock, and Net Profit Share */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
        {/* Metric 1: Cash Balance */}
        <div className="bg-gradient-to-br from-amber-500 to-orange-600 text-white p-3.5 rounded-2xl shadow-xs space-y-0.5">
          <span className="text-[10px] text-amber-100 flex items-center gap-1 font-bold">
            <Wallet className="w-3.5 h-3.5" />
            <span>موجودی نقدی حساب</span>
          </span>
          <span className="text-sm sm:text-base font-black block truncate text-left dir-ltr">
            {formatToman(currentActiveData.totalCash)}
          </span>
          <span className="text-[9px] text-amber-100/90 block truncate">
            (خرید کسر، فروش اضافه می‌شود)
          </span>
        </div>

        {/* Metric 2: Copper in Stock */}
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 space-y-0.5 shadow-xs">
          <span className="text-[10px] text-slate-500 flex items-center gap-1 font-bold">
            <Scale className="w-3.5 h-3.5 text-amber-600" />
            <span>موجودی مس انبار</span>
          </span>
          <span className="text-sm sm:text-base font-black block truncate text-slate-800 text-left dir-ltr">
            {formatKg(currentActiveData.totalCopperKg)}
          </span>
          <span className="text-[9px] text-slate-400 block truncate">
            کل مس فیزیکی موجود این پنل
          </span>
        </div>

        {/* Metric 3: Real Net Profit Share */}
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 space-y-0.5 shadow-xs">
          <span className="text-[10px] text-slate-500 flex items-center gap-1 font-bold">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
            <span>سود خالص این پنل</span>
          </span>
          <span className={`text-sm sm:text-base font-black block truncate text-left dir-ltr ${currentActiveData.profitShare >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
            {formatToman(currentActiveData.profitShare)}
          </span>
          <span className="text-[9px] text-slate-400 block truncate">
            سهم سود {formatPersianNumber(activeSharePercent)}٪ از کل فروش‌های مس
          </span>
        </div>
      </div>

      {/* 4. One Unified Table directly under the metrics */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden mt-2">
        <div className="bg-slate-50/80 px-4 py-2.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
          <span className="font-black text-xs text-slate-800 flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-emerald-600" />
            <span>جدول سود فاکتورهای فروش و سهم پنل {currentActiveData.accName}</span>
          </span>
          <span className="text-[10px] text-slate-500 font-bold">
            محاسبه دقیق سود: قیمت فروش منهای بهای خرید ضربدر درصد سهم ({formatPersianNumber(activeSharePercent)}٪)
          </span>
        </div>

        {activeExitInvoices.length === 0 ? (
          <div className="text-center py-12 text-slate-400 font-bold text-xs">
            هیچ فاکتور فروش فعالی در سیستم ثبت نشده است.
          </div>
        ) : (
          <div className="overflow-x-auto">
            {/* Desktop View Table */}
            <table className="w-full text-right border-collapse text-xs hidden lg:table">
              <thead>
                <tr className="bg-slate-50/70 text-slate-600 font-bold border-b border-slate-200 text-[11px]">
                  <th className="py-2.5 px-3 w-10 text-center">#</th>
                  <th className="py-2.5 px-3 w-28">شماره فاکتور</th>
                  <th className="py-2.5 px-3 w-24">تاریخ</th>
                  <th className="py-2.5 px-3">خریدار / مشتری</th>
                  <th className="py-2.5 px-3 w-24 text-center">وزن مس</th>
                  <th className="py-2.5 px-3 w-32 text-left">مبلغ کل فروش</th>
                  <th className="py-2.5 px-3 w-32 text-left">بهای تمام‌شده خرید</th>
                  <th className="py-2.5 px-3 w-32 text-left">سود کل فاکتور</th>
                  <th className="py-2.5 px-3 w-32 text-left bg-emerald-50/50 text-emerald-800">سهم سود این پنل</th>
                  <th className="py-2.5 px-3 w-24 text-center">وضعیت</th>
                  <th className="py-2.5 px-3 w-16 text-center">مشاهده</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {activeExitInvoices.map((inv, idx) => {
                  const metrics = getInvoiceMetrics(inv);
                  const panelShare =
                    activePanel === 'partner1'
                      ? metrics.p1Profit
                      : activePanel === 'partner2'
                      ? metrics.p2Profit
                      : metrics.profit;

                  return (
                    <tr key={inv.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-2.5 px-3 text-center font-bold text-slate-400">
                        {formatPersianNumber(idx + 1)}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-slate-900 whitespace-nowrap">
                        {inv.officialInvoiceNumber || inv.invoiceNumber}
                      </td>
                      <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap">
                        {inv.officialDate || inv.date}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-slate-800">
                        {inv.customerName}
                      </td>
                      <td className="py-2.5 px-3 text-center font-black text-amber-800 whitespace-nowrap">
                        {formatKg(metrics.weightKg)}
                      </td>
                      <td className="py-2.5 px-3 text-left font-bold text-slate-900 whitespace-nowrap">
                        {formatToman(metrics.saleAmount)}
                      </td>
                      <td className="py-2.5 px-3 text-left font-medium text-slate-600 whitespace-nowrap">
                        {formatToman(metrics.cost)}
                      </td>
                      <td className="py-2.5 px-3 text-left font-black text-emerald-700 whitespace-nowrap">
                        {formatToman(metrics.profit)}
                      </td>
                      <td className="py-2.5 px-3 text-left font-black text-emerald-800 bg-emerald-50/30 whitespace-nowrap">
                        {formatToman(panelShare)}
                      </td>
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-bold text-[10px] ${
                            inv.status === 'official'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {inv.status === 'official' ? (
                            <>
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>فاکتور رسمی</span>
                            </>
                          ) : (
                            <>
                              <Clock className="w-3 h-3 text-amber-600" />
                              <span>پیش‌فاکتور</span>
                            </>
                          )}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {onViewInvoice && (
                          <button
                            onClick={() => onViewInvoice(inv)}
                            className="p-1 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded transition-colors cursor-pointer"
                            title="مشاهده فاکتور"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Mobile View Card List */}
            <div className="lg:hidden divide-y divide-slate-100">
              {activeExitInvoices.map((inv) => {
                const metrics = getInvoiceMetrics(inv);
                const panelShare =
                  activePanel === 'partner1'
                    ? metrics.p1Profit
                    : activePanel === 'partner2'
                    ? metrics.p2Profit
                    : metrics.profit;

                return (
                  <div key={inv.id} className="p-3 space-y-2 hover:bg-slate-50/50 transition-colors">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className="font-black text-xs text-slate-900">
                          {inv.officialInvoiceNumber || inv.invoiceNumber}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">
                          {inv.officialDate || inv.date}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                            inv.status === 'official'
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-amber-50 text-amber-700'
                          }`}
                        >
                          {inv.status === 'official' ? 'رسمی' : 'پیش‌فاکتور'}
                        </span>
                        {onViewInvoice && (
                          <button
                            onClick={() => onViewInvoice(inv)}
                            className="p-1 text-amber-600 bg-amber-50 rounded"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-600 font-medium">{inv.customerName}</span>
                      <span className="font-bold text-amber-800">{formatKg(metrics.weightKg)}</span>
                    </div>

                    <div className="grid grid-cols-3 gap-1.5 p-2 bg-slate-50 rounded-xl text-[10px]">
                      <div>
                        <span className="text-slate-400 block">مبلغ فروش:</span>
                        <span className="font-bold text-slate-800 dir-ltr block">{formatToman(metrics.saleAmount)}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">بهای خرید:</span>
                        <span className="font-bold text-slate-800 dir-ltr block">{formatToman(metrics.cost)}</span>
                      </div>
                      <div className="text-left bg-emerald-50 p-1 rounded-lg">
                        <span className="text-emerald-700 font-bold block">سهم این پنل:</span>
                        <span className="font-black text-emerald-800 dir-ltr block">{formatToman(panelShare)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* 5. Cheques Section */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden mt-4">
        <div className="bg-slate-50/80 px-4 py-2.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
          <span className="font-black text-xs text-slate-800 flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-amber-600" />
            <span>چک‌های دریافتی و در جریان وصول پنل {currentActiveData.accName}</span>
          </span>
          <span className="text-[10px] text-slate-500 font-bold">
            وضعیت هر چک را مدیریت کنید؛ تغییر وضعیت به «پاس شده» موجودی نقدی این حساب را افزایش می‌دهد.
          </span>
        </div>

        {panelCheques.length === 0 ? (
          <div className="text-center py-8 text-slate-400 font-bold text-xs">
            هیچ چکی برای این پنل ثبت نشده است.
          </div>
        ) : (
          <div className="overflow-x-auto">
            {/* Desktop Table */}
            <table className="w-full text-right border-collapse text-xs hidden lg:table">
              <thead>
                <tr className="bg-slate-50/70 text-slate-600 font-bold border-b border-slate-200 text-[11px]">
                  <th className="py-2.5 px-3">شماره چک / صیاد</th>
                  <th className="py-2.5 px-3">بانک صادرکننده</th>
                  <th className="py-2.5 px-3 text-center">تاریخ سررسید</th>
                  <th className="py-2.5 px-3">مشتری</th>
                  <th className="py-2.5 px-3">بابت فاکتور</th>
                  <th className="py-2.5 px-3 text-left">مبلغ (تومان)</th>
                  <th className="py-2.5 px-3 text-center">وضعیت</th>
                  <th className="py-2.5 px-3 text-center w-60">عملیات مدیریت چک</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {panelCheques.map((ch) => {
                  const chStatus = ch.status || (ch.isCleared ? 'cleared' : 'pending');
                  return (
                    <tr key={ch.id} className={`hover:bg-slate-50/50 transition-colors ${chStatus === 'cleared' ? 'bg-emerald-50/10' : chStatus === 'bounced' ? 'bg-rose-50/10' : ''}`}>
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{ch.chequeNumber}</td>
                      <td className="py-2.5 px-3 font-semibold text-slate-700">{ch.bankName}</td>
                      <td className="py-2.5 px-3 text-center font-bold text-slate-600">{ch.dueDate}</td>
                      <td className="py-2.5 px-3 text-slate-600">{ch.customerName}</td>
                      <td className="py-2.5 px-3 text-slate-500 font-mono font-bold">{ch.invoiceNumber}</td>
                      <td className="py-2.5 px-3 text-left font-black text-amber-700">{formatToman(ch.amount)}</td>
                      <td className="py-2.5 px-3 text-center">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md font-bold text-[10px] border ${
                          chStatus === 'cleared'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : chStatus === 'bounced'
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : chStatus === 'returned'
                            ? 'bg-slate-100 text-slate-700 border-slate-300'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>
                          {chStatus === 'cleared' ? 'وصول شده' : chStatus === 'bounced' ? 'برگشت خورده' : chStatus === 'returned' ? 'عودت داده شده' : 'در جریان وصول'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        {chStatus === 'pending' ? (
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => updateChequeStatus(ch.id, 'cleared')}
                              className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[10px] rounded-lg transition-colors cursor-pointer"
                            >
                              پاس شد
                            </button>
                            <button
                              onClick={() => updateChequeStatus(ch.id, 'bounced')}
                              className="px-2 py-1 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-[10px] rounded-lg transition-colors cursor-pointer"
                            >
                              برگشت چک
                            </button>
                            <button
                              onClick={() => updateChequeStatus(ch.id, 'returned')}
                              className="px-2 py-1 bg-slate-600 hover:bg-slate-700 text-white font-extrabold text-[10px] rounded-lg transition-colors cursor-pointer"
                            >
                              عودت چک
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-1">
                            <span className="text-slate-400 text-[10px] font-bold">
                              {chStatus === 'cleared' ? `وصول گردید (${ch.clearedAt || 'ثبت شده'})` : chStatus === 'bounced' ? 'برگشت زده شده' : 'به مشتری عودت شد'}
                            </span>
                            <button
                              onClick={() => updateChequeStatus(ch.id, 'pending')}
                              className="px-1.5 py-0.5 text-[9px] bg-slate-100 hover:bg-amber-50 border border-slate-200 hover:border-amber-200 text-slate-500 hover:text-amber-800 rounded font-bold transition-all cursor-pointer mr-2"
                              title="تغییر وضعیت مجدد جهت اصلاح خطاهای احتمالی"
                            >
                              اصلاح وضعیت
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Mobile View */}
            <div className="lg:hidden divide-y divide-slate-100">
              {panelCheques.map((ch) => {
                const chStatus = ch.status || (ch.isCleared ? 'cleared' : 'pending');
                return (
                  <div key={ch.id} className={`p-3 space-y-2 ${chStatus === 'cleared' ? 'bg-emerald-50/10' : chStatus === 'bounced' ? 'bg-rose-50/10' : ''}`}>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-900">چک {ch.chequeNumber} - {ch.bankName}</span>
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${
                        chStatus === 'cleared'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : chStatus === 'bounced'
                          ? 'bg-rose-50 text-rose-700 border-rose-200'
                          : chStatus === 'returned'
                          ? 'bg-slate-100 text-slate-700 border-slate-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                        {chStatus === 'cleared' ? 'وصول شده' : chStatus === 'bounced' ? 'برگشت خورده' : chStatus === 'returned' ? 'عودت شده' : 'در انتظار وصول'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>مشتری: {ch.customerName}</span>
                      <span>سررسید: <strong className="text-slate-700 font-bold">{ch.dueDate}</strong></span>
                    </div>
                    <div className="flex items-center justify-between text-xs font-bold pt-1">
                      <span className="text-amber-700">مبلغ: {formatToman(ch.amount)}</span>
                      <div>
                        {chStatus === 'pending' ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => updateChequeStatus(ch.id, 'cleared')}
                              className="px-2 py-1 bg-emerald-600 text-white text-[9px] font-bold rounded"
                            >
                              پاس شد
                            </button>
                            <button
                              onClick={() => updateChequeStatus(ch.id, 'bounced')}
                              className="px-2 py-1 bg-rose-600 text-white text-[9px] font-bold rounded"
                            >
                              برگشت
                            </button>
                            <button
                              onClick={() => updateChequeStatus(ch.id, 'returned')}
                              className="px-2 py-1 bg-slate-600 text-white text-[9px] font-bold rounded"
                            >
                              عودت
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <span className="text-slate-400 text-[9px]">ثبت نهایی</span>
                            <button
                              onClick={() => updateChequeStatus(ch.id, 'pending')}
                              className="px-1.5 py-0.5 text-[9px] bg-slate-50 text-slate-600 border border-slate-200 rounded"
                            >
                              اصلاح
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Adjust Balance Modal */}
      <AdjustBalanceModal
        isOpen={isAdjustModalOpen}
        onClose={() => setIsAdjustModalOpen(false)}
        defaultAccount={modalDefaultAccount}
      />
    </div>
  );
};
