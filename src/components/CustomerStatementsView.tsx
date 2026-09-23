import React, { useState } from 'react';
import {
  Users,
  Search,
  Printer,
  ChevronLeft,
  X,
  Wallet,
  Building2,
  CheckCircle2,
  AlertCircle,
  Ban,
  Eye,
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

  const p1Name = state.warehouseProfile.partnerInfo?.partner1Name || 'شریک اول';
  const p2Name = state.warehouseProfile.partnerInfo?.partner2Name || 'شریک دوم';

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

  const customerList = Object.values(customerMap);

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

  return (
    <div className="space-y-3 pb-16 text-right">
      {/* 1. Ultra Compact Header Info Bar */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold shrink-0">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-xs font-black text-slate-800">
              دفتر حساب و صورت‌حساب خریداران
            </h2>
          </div>
        </div>
      </div>

      {/* 2. Customer Detail View Panel if selected */}
      {activeCustomerObj && (
        <div className="bg-white rounded-2xl border-2 border-amber-500 p-4 shadow-md space-y-3 animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-black text-sm text-slate-900">
                  کاردکس حساب خریدار: {activeCustomerObj.customerName}
                </h3>
                <span className="px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-900 font-bold text-[10px]">
                  {formatPersianNumber(activeCustomerObj.invoices.length)} فاکتور
                </span>
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">
                همراه: {activeCustomerObj.customerPhone} | آدرس: {activeCustomerObj.customerAddress}
              </p>
            </div>

            <button
              onClick={() => setSelectedCustomer(null)}
              className="p-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Customer Overall Balances Mini-Grid */}
          <div className="grid grid-cols-4 gap-2 bg-amber-50/50 p-2.5 rounded-xl border border-amber-100 text-center text-xs">
            <div>
              <span className="text-[9px] text-slate-500 block font-medium">کل وزن خریداری شده:</span>
              <span className="font-black text-amber-950">
                {formatKg(activeCustomerObj.totalWeight)}
              </span>
            </div>
            <div>
              <span className="text-[9px] text-slate-500 block font-medium">جمع کل فاکتورها:</span>
              <span className="font-bold text-slate-900">
                {formatToman(activeCustomerObj.totalAmount)}
              </span>
            </div>
            <div>
              <span className="text-[9px] text-slate-500 block font-medium">مجموع دریافتی:</span>
              <span className="font-bold text-emerald-700">
                {formatToman(activeCustomerObj.totalPaid)}
              </span>
            </div>
            <div>
              <span className="text-[9px] text-slate-500 block font-medium">مانده بدهکاری مشتری:</span>
              <span className={`font-black ${activeCustomerObj.totalRemaining > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
                {activeCustomerObj.totalRemaining > 0 ? formatToman(activeCustomerObj.totalRemaining) : 'تسویه کامل'}
              </span>
            </div>
          </div>

          {/* Detailed Invoices list */}
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 text-[10px]">
                  <th className="p-2">شماره فاکتور</th>
                  <th className="p-2">تاریخ ثبت</th>
                  <th className="p-2">وزن کل</th>
                  <th className="p-2">مبلغ فاکتور</th>
                  <th className="p-2">مبلغ پرداختی</th>
                  <th className="p-2">مانده بدهی</th>
                  <th className="p-2">وضعیت سند</th>
                  <th className="p-2 text-center">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {activeCustomerObj.invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/80">
                    <td className="p-2 font-black text-slate-900">
                      {inv.officialInvoiceNumber || inv.invoiceNumber}
                    </td>
                    <td className="p-2 text-slate-500">{inv.officialDate || inv.date}</td>
                    <td className="p-2 font-bold text-amber-950">{formatKg(inv.totalWeightKg)}</td>
                    <td className="p-2 font-bold text-slate-900">{formatToman(inv.totalAmount)}</td>
                    <td className="p-2 font-bold text-emerald-700">
                      {formatToman(inv.paidAmount ?? (inv.status === 'official' ? inv.totalAmount : 0))}
                    </td>
                    <td className="p-2 font-black text-rose-700">
                      {formatToman(inv.remainingAmount ?? (inv.status === 'official' ? 0 : inv.totalAmount))}
                    </td>
                    <td className="p-2 whitespace-nowrap">
                      {inv.status === 'official' ? (
                        <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[9px] font-bold border border-emerald-100">
                          رسمی / قطعی
                        </span>
                      ) : inv.status === 'cancelled' ? (
                        <span className="px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 text-[9px] font-bold border border-rose-100">
                          لغو شده
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 text-[9px] font-bold border border-amber-100">
                          پیش‌فاکتور
                        </span>
                      )}
                    </td>
                    <td className="p-2 text-center">
                      <button
                        onClick={() => onViewInvoice(inv)}
                        className="px-2 py-0.5 rounded bg-amber-50 hover:bg-amber-100 text-amber-900 font-bold text-[10px] border border-amber-200 cursor-pointer"
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

      {/* 3. Main Customers Ledger list with Real-Time Quick Search */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-3 space-y-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="text-[10px] text-slate-400 font-bold">
            کل خریداران فعال انبار: {formatPersianNumber(customerList.length)} نفر
          </div>
        </div>

        {customerList.length === 0 ? (
          <div className="py-12 text-center text-slate-400 font-bold text-xs">
            هیچ صورت‌حسابی یافت نشد.
          </div>
        ) : (
          <div className="overflow-x-auto">
            {/* Desktop Customers Table */}
            <table className="w-full text-right text-xs hidden md:table border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                  <th className="py-2.5 px-3">نام خریدار / مشتری</th>
                  <th className="py-2.5 px-3 w-32">شماره همراه</th>
                  <th className="py-2.5 px-3 w-28 text-center">تعداد فاکتورها</th>
                  <th className="py-2.5 px-3 w-28 text-left">مجموع وزن (kg)</th>
                  <th className="py-2.5 px-3 w-36 text-left">جمع کل خریدها</th>
                  <th className="py-2.5 px-3 w-36 text-left">کل مبالغ دریافتی</th>
                  <th className="py-2.5 px-3 w-40 text-left">وضعیت نهایی بدهی</th>
                  <th className="py-2.5 px-3 w-28 text-center">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {customerList.map((cust) => (
                  <tr key={cust.customerName} className="hover:bg-amber-50/20 transition-colors">
                    <td className="py-2.5 px-3 font-black text-slate-900 text-xs">
                      {cust.customerName}
                    </td>
                    <td className="py-2.5 px-3 text-slate-500 font-medium">{cust.customerPhone}</td>
                    <td className="py-2.5 px-3 text-center font-bold text-slate-600">
                      {formatPersianNumber(cust.invoices.length)} فاکتور
                    </td>
                    <td className="py-2.5 px-3 font-black text-amber-950 text-left">
                      {formatKg(cust.totalWeight)}
                    </td>
                    <td className="py-2.5 px-3 font-bold text-slate-900 text-left">
                      {formatToman(cust.totalAmount)}
                    </td>
                    <td className="py-2.5 px-3 font-bold text-emerald-800 text-left">
                      {formatToman(cust.totalPaid)}
                    </td>
                    <td className="py-2.5 px-3 text-left">
                      {cust.totalRemaining > 0 ? (
                        <span className="inline-block text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-100 font-black text-[10px]">
                          {formatToman(cust.totalRemaining)} بدهکار
                        </span>
                      ) : (
                        <span className="inline-block text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 font-bold text-[10px]">
                          تسویه کامل
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <button
                        onClick={() => setSelectedCustomer(cust.customerName)}
                        className="px-2.5 py-1 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-black text-[10px] cursor-pointer"
                      >
                        ریز حساب
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Mobile Customers List */}
            <div className="md:hidden divide-y divide-slate-100">
              {customerList.map((cust) => (
                <div key={cust.customerName} className="py-2.5 space-y-1.5 hover:bg-slate-50/50">
                  <div className="flex items-center justify-between">
                    <span className="font-black text-slate-900 text-xs">{cust.customerName}</span>
                    <span className="text-[10px] text-slate-400 font-bold">
                      {formatPersianNumber(cust.invoices.length)} فاکتور
                    </span>
                  </div>

                  <div className="flex justify-between text-[11px] text-slate-500">
                    <span>همراه: {cust.customerPhone}</span>
                    <span>وزن: {formatKg(cust.totalWeight)}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      {cust.totalRemaining > 0 ? (
                        <span className="text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded text-[9px] font-black border border-rose-100">
                          بدهکار: {formatToman(cust.totalRemaining)}
                        </span>
                      ) : (
                        <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded text-[9px] font-bold border border-emerald-100">
                          تسویه کامل
                        </span>
                      )}
                    </div>

                    <button
                      onClick={() => setSelectedCustomer(cust.customerName)}
                      className="px-2.5 py-1 rounded-lg bg-amber-600 text-white font-black text-[10px]"
                    >
                      ریز حساب
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
