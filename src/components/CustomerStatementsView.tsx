import React, { useState } from 'react';
import {
  Users,
  Search,
  FileText,
  Printer,
  ChevronLeft,
  ArrowUpRight,
  ArrowDownLeft,
  DollarSign,
  Wallet,
  Building2,
  CheckCircle2,
  AlertCircle,
  PlusCircle,
  X,
} from 'lucide-react';
import { useInventory } from '../context/InventoryContext';
import { Invoice } from '../types';
import { formatKg, formatToman, formatPersianNumber } from '../utils/persian';

interface CustomerStatementsViewProps {
  onViewInvoice: (invoice: Invoice) => void;
}

export const CustomerStatementsView: React.FC<CustomerStatementsViewProps> = ({
  onViewInvoice,
}) => {
  const { state } = useInventory();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<string | null>(null);

  const p1Name = state.warehouseProfile.partnerInfo?.partner1Name || 'ادمین ۱';
  const p2Name = state.warehouseProfile.partnerInfo?.partner2Name || 'ادمین ۲';

  // Group invoices by customer
  const customerMap: Record<
    string,
    {
      customerName: string;
      customerPhone: string;
      customerAddress: string;
      invoices: Invoice[];
      totalWeight: number;
      totalAmount: number;
      totalPaid: number;
      totalRemaining: number;
    }
  > = {};

  state.invoices.forEach((inv) => {
    const name = inv.customerName.trim() || 'مشتری متفرقه';
    if (!customerMap[name]) {
      customerMap[name] = {
        customerName: name,
        customerPhone: inv.customerPhone || '-',
        customerAddress: inv.customerAddress || '-',
        invoices: [],
        totalWeight: 0,
        totalAmount: 0,
        totalPaid: 0,
        totalRemaining: 0,
      };
    }

    customerMap[name].invoices.push(inv);
    if (inv.status !== 'cancelled') {
      customerMap[name].totalWeight += inv.totalWeightKg;
      customerMap[name].totalAmount += inv.totalAmount;
      const paid = inv.paidAmount ?? (inv.status === 'official' ? inv.totalAmount : 0);
      const rem = inv.remainingAmount ?? (inv.status === 'official' ? Math.max(0, inv.totalAmount - paid) : inv.totalAmount);
      customerMap[name].totalPaid += paid;
      customerMap[name].totalRemaining += rem;
    }
  });

  const customerList = Object.values(customerMap).filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      c.customerName.toLowerCase().includes(q) ||
      c.customerPhone.includes(q)
    );
  });

  const activeCustomerObj = selectedCustomer ? customerMap[selectedCustomer] : null;

  // Account Balances Calculation
  const partnerInfo = state.warehouseProfile.partnerInfo;
  const p1Account = partnerInfo?.partner1Account;
  const p2Account = partnerInfo?.partner2Account;
  const sharedAccount = partnerInfo?.sharedAccount;

  let p1TotalCash = p1Account?.initialCash || 0;
  let p2TotalCash = p2Account?.initialCash || 0;
  let sharedTotalCash = sharedAccount?.initialCash || 0;

  state.invoices.forEach((inv) => {
    if (inv.status === 'official' && inv.paymentAllocation) {
      p1TotalCash += inv.paymentAllocation.partner1Amount || 0;
      p2TotalCash += inv.paymentAllocation.partner2Amount || 0;
      sharedTotalCash += inv.paymentAllocation.sharedAmount || 0;
    }
  });

  // Copper Stock Weight per Purchaser
  let p1CopperKg = 0;
  let p2CopperKg = 0;
  let sharedCopperKg = 0;

  const calculateStockWeightByPurchaser = (purchaserName?: string) => {
    let weight = 0;
    const isP1 = purchaserName === p1Name;
    const isP2 = purchaserName === p2Name;

    state.pallets.forEach((p) => {
      const pWeight = p.reels.reduce((s, r) => s + r.weightKg, 0);
      if (p.purchaser === p1Name && isP1) weight += pWeight;
      else if (p.purchaser === p2Name && isP2) weight += pWeight;
      else if ((!p.purchaser || p.purchaser === 'حساب مشترک (۵۰-۵۰)') && !isP1 && !isP2) weight += pWeight;
    });

    state.reels.forEach((r) => {
      if (r.purchaser === p1Name && isP1) weight += r.weightKg;
      else if (r.purchaser === p2Name && isP2) weight += r.weightKg;
      else if ((!r.purchaser || r.purchaser === 'حساب مشترک (۵۰-۵۰)') && !isP1 && !isP2) weight += r.weightKg;
    });

    state.coils.forEach((c) => {
      if (c.purchaser === p1Name && isP1) weight += c.weightKg;
      else if (c.purchaser === p2Name && isP2) weight += c.weightKg;
      else if ((!c.purchaser || c.purchaser === 'حساب مشترک (۵۰-۵۰)') && !isP1 && !isP2) weight += c.weightKg;
    });

    state.branches.forEach((b) => {
      if (b.purchaser === p1Name && isP1) weight += b.totalWeightKg;
      else if (b.purchaser === p2Name && isP2) weight += b.totalWeightKg;
      else if ((!b.purchaser || b.purchaser === 'حساب مشترک (۵۰-۵۰)') && !isP1 && !isP2) weight += b.totalWeightKg;
    });

    state.loose.forEach((l) => {
      if (l.purchaser === p1Name && isP1) weight += l.weightKg;
      else if (l.purchaser === p2Name && isP2) weight += l.weightKg;
      else if ((!l.purchaser || l.purchaser === 'حساب مشترک (۵۰-۵۰)') && !isP1 && !isP2) weight += l.weightKg;
    });

    return weight;
  };

  p1CopperKg = (p1Account?.initialCopperKg || 0) + calculateStockWeightByPurchaser(p1Name);
  p2CopperKg = (p2Account?.initialCopperKg || 0) + calculateStockWeightByPurchaser(p2Name);
  sharedCopperKg = (sharedAccount?.initialCopperKg || 0) + calculateStockWeightByPurchaser('حساب مشترک (۵۰-۵۰)');

  return (
    <div className="space-y-4 sm:space-y-6 pb-16">
      {/* Header Stat Overview */}
      <div className="bg-white p-3.5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <div className="flex items-center space-x-2.5 sm:space-x-3 space-x-reverse min-w-0">
          <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold shrink-0">
            <Users className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm sm:text-lg font-bold text-slate-900 truncate">
              صورت‌حساب و حساب خریداران
            </h2>
            <p className="text-[10px] sm:text-xs text-slate-500 mt-0.5 line-clamp-1">
              مشاهده سوابق فاکتورها، پرداختی‌ها و مانده بدهکاری هر مشتری به تفکیک
            </p>
          </div>
        </div>

        <button
          onClick={() => window.print()}
          className="w-full sm:w-auto flex items-center justify-center space-x-1.5 space-x-reverse px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-xs cursor-pointer transition-all"
        >
          <Printer className="w-4 h-4" />
          <span>چاپ صورت‌حساب کامل</span>
        </button>
      </div>

      {/* 3 Partner / Shared Accounts Balance Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        {/* Account 1: Admin 1 */}
        <div className="bg-gradient-to-br from-amber-50 to-orange-50/50 p-4 rounded-2xl border border-amber-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-amber-900 flex items-center gap-1.5">
              <Wallet className="w-4 h-4 text-amber-600" />
              <span>حساب {p1Name} (شریک اول)</span>
            </span>
            <span className="px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 text-[10px] font-bold">
              سهم ۵۰٪
            </span>
          </div>

          <div className="pt-1 border-t border-amber-200/60 space-y-1">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-600 font-medium">کل موجودی نقدی حساب:</span>
              <span className="font-black text-amber-900 dir-ltr text-right">
                {formatToman(p1TotalCash)}
              </span>
            </div>
            <div className="flex justify-between items-center text-[11px] text-slate-500">
              <span>آورده و خریدها: {formatToman(p1Account?.initialCash || 0)}</span>
              <span>سهم فروش فاکتورها: {formatToman(p1TotalCash - (p1Account?.initialCash || 0))}</span>
            </div>
          </div>
        </div>

        {/* Account 2: Admin 2 */}
        <div className="bg-gradient-to-br from-amber-50 to-orange-50/50 p-4 rounded-2xl border border-amber-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-amber-900 flex items-center gap-1.5">
              <Wallet className="w-4 h-4 text-amber-600" />
              <span>حساب {p2Name} (شریک دوم)</span>
            </span>
            <span className="px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 text-[10px] font-bold">
              سهم ۵۰٪
            </span>
          </div>

          <div className="pt-1 border-t border-amber-200/60 space-y-1">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-600 font-medium">کل موجودی نقدی حساب:</span>
              <span className="font-black text-amber-900 dir-ltr text-right">
                {formatToman(p2TotalCash)}
              </span>
            </div>
            <div className="flex justify-between items-center text-[11px] text-slate-500">
              <span>آورده و خریدها: {formatToman(p2Account?.initialCash || 0)}</span>
              <span>سهم فروش فاکتورها: {formatToman(p2TotalCash - (p2Account?.initialCash || 0))}</span>
            </div>
          </div>
        </div>

        {/* Account 3: Shared Account */}
        <div className="bg-gradient-to-br from-amber-500 to-orange-600 text-white p-4 rounded-2xl shadow-md space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-amber-200" />
              <span>حساب مشترک انبار</span>
            </span>
            <span className="px-2 py-0.5 rounded-full bg-white/20 text-white text-[10px] font-bold">
              اشتراکی
            </span>
          </div>

          <div className="pt-1 border-t border-white/20 space-y-1">
            <div className="flex justify-between items-center text-xs">
              <span className="text-amber-100 font-medium">کل موجودی نقدی مشترک:</span>
              <span className="font-black text-white dir-ltr text-right">
                {formatToman(sharedTotalCash)}
              </span>
            </div>
            <div className="flex justify-between items-center text-[11px] text-amber-100/90">
              <span>صندوق و آورده: {formatToman(sharedAccount?.initialCash || 0)}</span>
              <span>سهم فروش فاکتورها: {formatToman(sharedTotalCash - (sharedAccount?.initialCash || 0))}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Customer Detail View Modal/Panel if selected */}
      {activeCustomerObj && (
        <div className="bg-white rounded-2xl border-2 border-amber-500 p-4 sm:p-6 shadow-lg space-y-4 animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-base sm:text-lg text-slate-900">
                  صورت‌حساب ریز خریدار: {activeCustomerObj.customerName}
                </h3>
                <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 font-bold text-xs">
                  {formatPersianNumber(activeCustomerObj.invoices.length)} فاکتور
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                شماره همراه: {activeCustomerObj.customerPhone} | آدرس: {activeCustomerObj.customerAddress}
              </p>
            </div>

            <button
              onClick={() => setSelectedCustomer(null)}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Customer Overall Balances */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-amber-50/50 p-3.5 rounded-xl border border-amber-200 text-center">
            <div>
              <span className="text-[10px] text-slate-500 font-bold block">مجموع وزن خریداری شده:</span>
              <span className="text-xs sm:text-sm font-black text-amber-900">
                {formatKg(activeCustomerObj.totalWeight)}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 font-bold block">جمع کل فاکتورها:</span>
              <span className="text-xs sm:text-sm font-black text-slate-900">
                {formatToman(activeCustomerObj.totalAmount)}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 font-bold block">مجموع دریافتی / واریزی:</span>
              <span className="text-xs sm:text-sm font-black text-emerald-700">
                {formatToman(activeCustomerObj.totalPaid)}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 font-bold block">مانده بدهکاری مشتری:</span>
              <span className={`text-xs sm:text-sm font-black ${activeCustomerObj.totalRemaining > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
                {activeCustomerObj.totalRemaining > 0 ? formatToman(activeCustomerObj.totalRemaining) : 'تسویه کامل'}
              </span>
            </div>
          </div>

          {/* Detailed Invoices Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                  <th className="p-2.5">شماره فاکتور</th>
                  <th className="p-2.5">تاریخ</th>
                  <th className="p-2.5">وزن (kg)</th>
                  <th className="p-2.5">مبلغ کل</th>
                  <th className="p-2.5">پرداختی</th>
                  <th className="p-2.5">مانده بدهی</th>
                  <th className="p-2.5">وضعیت</th>
                  <th className="p-2.5 text-center">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {activeCustomerObj.invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50">
                    <td className="p-2.5 font-bold text-slate-900">
                      {inv.officialInvoiceNumber || inv.invoiceNumber}
                    </td>
                    <td className="p-2.5 text-slate-600">{inv.officialDate || inv.date}</td>
                    <td className="p-2.5 font-bold text-amber-800">{formatKg(inv.totalWeightKg)}</td>
                    <td className="p-2.5 font-bold text-slate-900">{formatToman(inv.totalAmount)}</td>
                    <td className="p-2.5 font-bold text-emerald-700">
                      {formatToman(inv.paidAmount ?? (inv.status === 'official' ? inv.totalAmount : 0))}
                    </td>
                    <td className="p-2.5 font-bold text-rose-700">
                      {formatToman(inv.remainingAmount ?? (inv.status === 'official' ? 0 : inv.totalAmount))}
                    </td>
                    <td className="p-2.5">
                      {inv.status === 'official' ? (
                        <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                          رسمی / قطعی
                        </span>
                      ) : inv.status === 'cancelled' ? (
                        <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 font-bold text-[10px]">
                          لغو شده
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-bold text-[10px]">
                          پیش‌فاکتور
                        </span>
                      )}
                    </td>
                    <td className="p-2.5 text-center">
                      <button
                        onClick={() => onViewInvoice(inv)}
                        className="px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 font-bold text-[11px] border border-amber-200 cursor-pointer"
                      >
                        مشاهده
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Main Customers List Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden space-y-3 p-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="جستجوی نام یا شماره خریدار..."
              className="w-full pr-9 pl-3 py-2 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-hidden focus:border-amber-500"
            />
          </div>

          <div className="text-xs font-bold text-slate-500">
            تعداد کل خریداران: {formatPersianNumber(customerList.length)} نفر
          </div>
        </div>

        {customerList.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="font-bold text-xs sm:text-sm">هیچ صورت‌حسابی یافت نشد.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                  <th className="p-3">نام خریدار</th>
                  <th className="p-3">شماره همراه</th>
                  <th className="p-3">تعداد فاکتورها</th>
                  <th className="p-3">مجموع وزن (kg)</th>
                  <th className="p-3">جمع کل فاکتورها</th>
                  <th className="p-3">مجموع واریزی</th>
                  <th className="p-3">مانده بدهی</th>
                  <th className="p-3 text-center">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {customerList.map((cust) => (
                  <tr key={cust.customerName} className="hover:bg-amber-50/40 transition-colors">
                    <td className="p-3 font-black text-slate-900 text-xs sm:text-sm">
                      {cust.customerName}
                    </td>
                    <td className="p-3 text-slate-600 font-medium">{cust.customerPhone}</td>
                    <td className="p-3 font-bold text-slate-800">
                      {formatPersianNumber(cust.invoices.length)} فاکتور
                    </td>
                    <td className="p-3 font-bold text-amber-800">
                      {formatKg(cust.totalWeight)}
                    </td>
                    <td className="p-3 font-bold text-slate-900">
                      {formatToman(cust.totalAmount)}
                    </td>
                    <td className="p-3 font-bold text-emerald-700">
                      {formatToman(cust.totalPaid)}
                    </td>
                    <td className="p-3 font-black">
                      {cust.totalRemaining > 0 ? (
                        <span className="text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                          {formatToman(cust.totalRemaining)} بدهکار
                        </span>
                      ) : (
                        <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          تسویه کامل
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-center">
                      <button
                        onClick={() => setSelectedCustomer(cust.customerName)}
                        className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-xs cursor-pointer transition-all"
                      >
                        مشاهده ریز حساب
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
