import React, { useState } from 'react';
import {
  ArrowDownRight,
  ArrowUpLeft,
  ArrowRightLeft,
  User,
} from 'lucide-react';
import { useInventory } from '../context/InventoryContext';
import { formatKg, formatToman, formatPersianNumber, getDateTimeStringFromId } from '../utils/persian';

export const TransactionsView: React.FC = () => {
  const { state } = useInventory();
  const [expandedTxIds, setExpandedTxIds] = useState<Record<string, boolean>>({});

  const toggleExpand = (id: string) => {
    setExpandedTxIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const sortedTransactions = [...state.transactions].sort((a, b) => {
    const matchA = a.id.match(/\d+/);
    const matchB = b.id.match(/\d+/);
    const timeA = matchA ? parseInt(matchA[0], 10) : 0;
    const timeB = matchB ? parseInt(matchB[0], 10) : 0;
    return timeB - timeA;
  });

  return (
    <div className="pb-16 text-right">
      {/* Dense Table Form */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse table-fixed min-w-[900px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-xs font-black">
                <th className="py-3 px-4 w-12 text-center">ردیف</th>
                <th className="py-3 px-4 w-36">زمان و تاریخ</th>
                <th className="py-3 px-4 w-28">نوع تراکنش</th>
                <th className="py-3 px-4 w-52">شرح تراکنش</th>
                <th className="py-3 px-4 w-36">ثبت‌کننده / ادمین</th>
                <th className="py-3 px-4 w-36">طرف حساب</th>
                <th className="py-3 px-4 w-24 text-left">وزن</th>
                <th className="py-3 px-4 w-32 text-left">مبلغ کل</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {sortedTransactions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 font-bold">
                    هیچ تراکنشی در سیستم ثبت نشده است.
                  </td>
                </tr>
              ) : (
                sortedTransactions.map((tx, idx) => {
                  const isEntry = tx.type === 'entry';
                  const isExit = tx.type === 'exit';
                  const isPalletUnpack = tx.type === 'pallet_unpack';
                  const isExpanded = !!expandedTxIds[tx.id];

                  return (
                    <tr key={tx.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Row Index */}
                      <td className="py-2.5 px-4 text-center font-bold text-slate-400">
                        {formatPersianNumber(sortedTransactions.length - idx)}
                      </td>

                      {/* Timestamp */}
                      <td className="py-2.5 px-4 font-medium text-slate-500 whitespace-nowrap">
                        {tx.timestamp || getDateTimeStringFromId(tx.id)}
                      </td>

                      {/* Transaction Type Badge */}
                      <td className="py-2.5 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md font-bold text-[10px] ${
                            isEntry
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : isExit
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-amber-50 text-amber-800 border border-amber-200'
                          }`}
                        >
                          {isEntry ? (
                            <ArrowDownRight className="w-3 h-3 shrink-0 text-emerald-600" />
                          ) : isExit ? (
                            <ArrowUpLeft className="w-3 h-3 shrink-0 text-rose-600" />
                          ) : (
                            <ArrowRightLeft className="w-3 h-3 shrink-0 text-amber-600" />
                          )}
                          <span>
                            {isEntry
                              ? 'ورود'
                              : isExit
                              ? 'خروج'
                              : isPalletUnpack
                              ? 'تفکیک پالت'
                              : 'تفکیک خورده'}
                          </span>
                        </span>
                      </td>

                      {/* Title & Details (Truncated / Resizable on Click) */}
                      <td
                        className="py-2.5 px-4 cursor-pointer select-none align-middle"
                        onClick={() => toggleExpand(tx.id)}
                        title="کلیک کنید تا جزئیات بیشتر باز/بسته شود"
                      >
                        <div className="font-bold text-slate-900 flex items-center gap-1 flex-wrap">
                          <span className={isExpanded ? 'whitespace-normal' : 'truncate max-w-[180px] block'}>
                            {tx.title}
                          </span>
                          {tx.invoiceNumber && (
                            <span className="bg-slate-100 text-slate-700 px-1 py-0.5 rounded text-[8px] font-black shrink-0">
                              {tx.invoiceNumber}
                            </span>
                          )}
                        </div>
                        {tx.details && (
                          <div
                            className={`text-[10px] text-slate-400 mt-0.5 transition-all ${
                              isExpanded
                                ? 'whitespace-normal break-words text-slate-600 bg-amber-50/50 p-1.5 rounded-lg border border-amber-200/30 mt-1'
                                : 'truncate max-w-[180px]'
                            }`}
                          >
                            {tx.details}
                          </div>
                        )}
                        {!isExpanded && (tx.title.length > 25 || (tx.details && tx.details.length > 25)) && (
                          <span className="text-[9px] text-amber-600 font-black hover:underline mt-0.5 block">
                            ادامه مطلب...
                          </span>
                        )}
                      </td>

                      {/* Registered By */}
                      <td className="py-2.5 px-4 font-bold text-slate-800 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <User className="w-3 h-3 text-slate-400" />
                          <span>{tx.registeredBy}</span>
                        </div>
                      </td>

                      {/* Buyer Or Supplier */}
                      <td className="py-2.5 px-4 text-slate-600 whitespace-nowrap font-medium truncate max-w-[120px]" title={tx.buyerOrSupplier}>
                        {tx.buyerOrSupplier || '-'}
                      </td>

                      {/* Total Weight */}
                      <td className="py-2.5 px-4 text-left font-black text-amber-950 whitespace-nowrap">
                        {formatKg(tx.totalWeightKg)}
                      </td>

                      {/* Total Price */}
                      <td className="py-2.5 px-4 text-left font-bold text-emerald-800 whitespace-nowrap">
                        {tx.totalPrice ? formatToman(tx.totalPrice) : '-'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
