import React, { useState } from 'react';
import {
  User,
  Building2,
  Wallet,
  TrendingUp,
  PlusCircle,
  ArrowUpRight,
  ArrowDownLeft,
  Coins,
  Scale,
} from 'lucide-react';
import { useInventory } from '../context/InventoryContext';
import { AdjustBalanceModal } from './AdjustBalanceModal';
import { formatKg, formatToman, formatPersianNumber } from '../utils/persian';
import { Invoice } from '../types';

interface PartnerPanelsViewProps {
  onViewInvoice?: (invoice: Invoice) => void;
}

interface LedgerItem {
  id: string;
  date: string;
  type: 'واریز/برداشت نقدی' | 'دریافت سهم فروش' | 'خرید مس';
  description: string;
  amountText: string;
  effect: 'plus' | 'minus';
  category: 'cash' | 'copper';
}

export const PartnerPanelsView: React.FC<PartnerPanelsViewProps> = ({ onViewInvoice }) => {
  const { state } = useInventory();

  const [activePanel, setActivePanel] = useState<'partner1' | 'partner2' | 'shared'>('partner1');

  // Modal State
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [modalDefaultAccount, setModalDefaultAccount] = useState<'partner1' | 'partner2' | 'shared'>('partner1');

  const partnerInfo = state.warehouseProfile.partnerInfo;
  const p1Name = partnerInfo?.partner1Name || 'شریک اول';
  const p2Name = partnerInfo?.partner2Name || 'شریک دوم';

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
    const accName = acc === 'partner1' ? p1Name : acc === 'partner2' ? p2Name : 'حساب مشترک';
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

    const isMatch = (purchaser?: string) => {
      if (acc === 'partner1') return purchaser === p1Name;
      if (acc === 'partner2') return purchaser === p2Name;
      return !purchaser || purchaser === 'حساب مشترک' || purchaser.includes('مشترک');
    };

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

    // Entry purchases recorded for this purchaser
    const entryTransactions = state.transactions.filter(
      (tx) => tx.type === 'entry' && isMatch(tx.purchaser)
    );

    // Adjustments history
    const adjustments = (state.balanceAdjustments || []).filter((adj) => adj.targetAccount === acc);

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
      entryTransactions,
      adjustments,
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

  const currentProfitShare =
    activePanel === 'partner1'
      ? partner1ProfitShare
      : activePanel === 'partner2'
      ? partner2ProfitShare
      : 0;

  // Build unified ledger list
  const ledger: LedgerItem[] = [];

  // Add adjustments
  currentActiveData.adjustments.forEach((adj) => {
    const isPlus = adj.operation === 'deposit';
    ledger.push({
      id: adj.id,
      date: `${adj.date} ${adj.time || ''}`.trim(),
      type: 'واریز/برداشت نقدی',
      description: adj.notes || (isPlus ? 'افزایش موجودی دستی' : 'کاهش موجودی دستی'),
      amountText: adj.assetType === 'cash' ? formatToman(adj.amount) : formatKg(adj.amount),
      effect: adj.operation === 'withdraw' ? 'minus' : 'plus',
      category: adj.assetType === 'cash' ? 'cash' : 'copper',
    });
  });

  // Add allocated invoices
  currentActiveData.allocatedInvoices.forEach(({ invoice, allocatedAmount }) => {
    ledger.push({
      id: `invoice-${invoice.id}`,
      date: invoice.officialDate || invoice.date,
      type: 'دریافت سهم فروش',
      description: `دریافت سهم فروش فاکتور ${invoice.officialInvoiceNumber || invoice.invoiceNumber} (${invoice.customerName})`,
      amountText: formatToman(allocatedAmount),
      effect: 'plus',
      category: 'cash',
    });
  });

  // Add entry purchases
  currentActiveData.entryTransactions.forEach((tx) => {
    ledger.push({
      id: `entry-${tx.id}`,
      date: tx.timestamp,
      type: 'خرید مس',
      description: `خرید ${tx.title} از ${tx.buyerOrSupplier || 'تامین‌کننده'}`,
      amountText: formatKg(tx.totalWeightKg),
      effect: 'plus',
      category: 'copper',
    });
  });

  // Sort ledger by date descending
  const sortedLedger = ledger.sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="space-y-4 pb-16 text-right">
      {/* 1. Account Selector Tabs at the VERY TOP */}
      <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 rounded-2xl border border-slate-200">
        <button
          onClick={() => setActivePanel('partner1')}
          className={`py-2 px-2 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activePanel === 'partner1'
              ? 'bg-amber-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-950'
          }`}
        >
          <User className="w-4 h-4" />
          <span className="truncate">{p1Name}</span>
        </button>

        <button
          onClick={() => setActivePanel('partner2')}
          className={`py-2 px-2 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activePanel === 'partner2'
              ? 'bg-amber-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-950'
          }`}
        >
          <User className="w-4 h-4" />
          <span className="truncate">{p2Name}</span>
        </button>

        <button
          onClick={() => setActivePanel('shared')}
          className={`py-2 px-2 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activePanel === 'shared'
              ? 'bg-amber-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-950'
          }`}
        >
          <Building2 className="w-4 h-4" />
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
              حساب کاربری: {currentActiveData.accName}
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Rate input in a very small inline card */}
          <div className="flex items-center gap-1 bg-slate-50 px-2.5 py-1 rounded-xl border border-slate-100 text-[10px]">
            <span className="text-slate-500">نرخ پایه خرید مس:</span>
            <input
              type="number"
              value={baseBuyPricePerKg}
              onChange={(e) => setBaseBuyPricePerKg(Number(e.target.value) || 0)}
              className="w-20 bg-white border border-slate-200 rounded text-center text-[10px] font-bold p-0.5 focus:outline-hidden"
            />
            <span className="text-slate-400">تومان</span>
          </div>

          <button
            onClick={() => openAdjustModal(currentActiveData.accKey)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] cursor-pointer"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>ثبت/ویرایش نقدی</span>
          </button>
        </div>
      </div>

      {/* 3. Compact Metrics Grid (No huge boxes) */}
      <div className="grid grid-cols-3 gap-2.5">
        <div className="bg-gradient-to-br from-amber-500 to-orange-600 text-white p-3.5 rounded-2xl shadow-xs space-y-0.5">
          <span className="text-[10px] text-amber-100 flex items-center gap-1">
            <Wallet className="w-3.5 h-3.5" />
            <span>موجودی نقدی</span>
          </span>
          <span className="text-sm sm:text-base font-black block truncate text-left dir-ltr">
            {formatToman(currentActiveData.totalCash)}
          </span>
        </div>

        <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-0.5">
          <span className="text-[10px] text-slate-500 flex items-center gap-1">
            <Scale className="w-3.5 h-3.5 text-amber-600" />
            <span>موجودی مس انبار</span>
          </span>
          <span className="text-sm sm:text-base font-black block truncate text-slate-800 text-left dir-ltr">
            {formatKg(currentActiveData.totalCopperKg)}
          </span>
        </div>

        <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-0.5">
          <span className="text-[10px] text-slate-500 flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5 text-amber-600" />
            <span>سهم سود خالص رسمی</span>
          </span>
          <span className={`text-sm sm:text-base font-black block truncate text-left dir-ltr ${currentProfitShare >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
            {activePanel === 'shared' ? 'فقط شرکا' : formatToman(currentProfitShare)}
          </span>
        </div>
      </div>

      {/* 4. Unified Clean History Ledger (Perfect on Mobile & Desktop) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="bg-slate-50/80 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
          <span className="font-black text-xs text-slate-800">ریز کاردکس و تاریخچه حساب</span>
          <span className="text-[10px] text-slate-500 font-bold">
            {formatPersianNumber(sortedLedger.length)} ردیف تراکنش ثبت شده
          </span>
        </div>

        {sortedLedger.length === 0 ? (
          <div className="text-center py-12 text-slate-400 font-bold text-xs">
            هیچ تراکنش یا تغییری برای این حساب ثبت نشده است.
          </div>
        ) : (
          <div className="overflow-x-auto">
            {/* Desktop View Table */}
            <table className="w-full text-right border-collapse text-xs hidden md:table">
              <thead>
                <tr className="bg-slate-50/50 text-slate-500 font-bold border-b border-slate-200 text-[11px]">
                  <th className="py-2.5 px-4 w-12 text-center">ردیف</th>
                  <th className="py-2.5 px-4 w-40">تاریخ و ساعت</th>
                  <th className="py-2.5 px-4 w-36">نوع رویداد</th>
                  <th className="py-2.5 px-4">شرح تراکنش</th>
                  <th className="py-2.5 px-4 w-36 text-left">مقدار دارایی</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {sortedLedger.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-2.5 px-4 text-center font-bold text-slate-400">
                      {formatPersianNumber(sortedLedger.length - idx)}
                    </td>
                    <td className="py-2.5 px-4 text-slate-500 font-medium whitespace-nowrap">
                      {item.date}
                    </td>
                    <td className="py-2.5 px-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-bold text-[10px] ${
                          item.effect === 'plus'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                            : 'bg-rose-50 text-rose-700 border border-rose-100'
                        }`}
                      >
                        {item.effect === 'plus' ? (
                          <ArrowDownLeft className="w-3 h-3 text-emerald-600" />
                        ) : (
                          <ArrowUpRight className="w-3 h-3 text-rose-600" />
                        )}
                        <span>{item.type}</span>
                      </span>
                    </td>
                    <td className="py-2.5 px-4 font-semibold text-slate-800">
                      {item.description}
                    </td>
                    <td className={`py-2.5 px-4 text-left font-black whitespace-nowrap ${
                      item.effect === 'plus' ? 'text-emerald-700' : 'text-rose-700'
                    }`}>
                      {item.effect === 'plus' ? '+' : '-'} {item.amountText}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Mobile View Card List */}
            <div className="md:hidden divide-y divide-slate-100">
              {sortedLedger.map((item, idx) => (
                <div key={item.id} className="p-3 flex items-center justify-between gap-3 hover:bg-slate-50/50">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                        item.effect === 'plus'
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-rose-50 text-rose-700'
                      }`}>
                        {item.type}
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium">{item.date}</span>
                    </div>
                    <p className="text-xs font-bold text-slate-800 truncate" title={item.description}>
                      {item.description}
                    </p>
                  </div>
                  
                  <div className={`text-left font-black text-xs shrink-0 whitespace-nowrap ${
                    item.effect === 'plus' ? 'text-emerald-700' : 'text-rose-700'
                  }`}>
                    {item.effect === 'plus' ? '+' : '-'} {item.amountText}
                  </div>
                </div>
              ))}
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
