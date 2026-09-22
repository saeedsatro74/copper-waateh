import React, { useState } from 'react';
import {
  History,
  ArrowDownRight,
  ArrowUpLeft,
  ArrowRightLeft,
  User,
  Search,
  Calendar,
  FileSpreadsheet,
  Filter,
  CheckCircle,
  FileText,
} from 'lucide-react';
import { useInventory } from '../context/InventoryContext';
import { formatKg, formatToman, formatPersianNumber, getDateTimeStringFromId } from '../utils/persian';

export const TransactionsView: React.FC = () => {
  const { state } = useInventory();

  const [filterType, setFilterType] = useState<string>('all');
  const [filterUser, setFilterUser] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const transactions = state.transactions.filter((tx) => {
    const matchesType = filterType === 'all' || tx.type === filterType;
    const matchesUser = filterUser === 'all' || tx.registeredBy.includes(filterUser);
    const matchesSearch =
      !searchQuery.trim() ||
      tx.title.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
      tx.registeredBy.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
      (tx.buyerOrSupplier &&
        tx.buyerOrSupplier.toLowerCase().includes(searchQuery.toLowerCase().trim())) ||
      (tx.invoiceNumber && tx.invoiceNumber.includes(searchQuery.trim()));

    return matchesType && matchesUser && matchesSearch;
  });

  const sortedTransactions = [...transactions].sort((a, b) => {
    const matchA = a.id.match(/\d+/);
    const matchB = b.id.match(/\d+/);
    const timeA = matchA ? parseInt(matchA[0], 10) : 0;
    const timeB = matchB ? parseInt(matchB[0], 10) : 0;
    return timeB - timeA;
  });

  return (
    <div className="space-y-4 sm:space-y-6 pb-16">
      {/* Header Stat Overview */}
      <div className="bg-white p-3.5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <div className="flex items-center space-x-2.5 sm:space-x-3 space-x-reverse min-w-0">
          <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold shrink-0">
            <History className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm sm:text-lg font-bold text-slate-900 truncate">سوابق تراکنش‌ها و ثبت‌کنندگان</h2>
            <p className="text-[10px] sm:text-xs text-slate-500 mt-0.5 line-clamp-1">
              ثبت شفاف تمام ورودی‌ها، خروجی‌ها و باز کردن پالت‌ها توسط مدیر و ادمین‌های انبار
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3 space-x-reverse bg-slate-50 p-2 sm:p-2.5 rounded-xl border border-slate-200 text-xs w-full sm:w-auto justify-around sm:justify-start">
          <div>
            <span className="text-slate-400 block text-[9px] sm:text-[10px]">کل تراکنش‌ها</span>
            <span className="font-bold text-slate-900 text-xs sm:text-sm">
              {formatPersianNumber(state.transactions.length)} ثبت
            </span>
          </div>
          <div className="h-5 w-px bg-slate-200" />
          <div>
            <span className="text-slate-400 block text-[9px] sm:text-[10px]">کاربران فعال</span>
            <span className="font-bold text-amber-800 text-xs sm:text-sm">
              {formatPersianNumber(state.users.length)} نفر
            </span>
          </div>
        </div>
      </div>

      {/* Filter and Search controls */}
      <div className="bg-white p-2.5 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-200 shadow-xs grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5 sm:top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="جستجو در عنوان، ادمین، خریدار..."
            className="w-full pr-9 pl-3 py-1.5 sm:py-2 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-hidden focus:border-amber-500"
          />
        </div>

        <div>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="w-full p-1.5 sm:p-2 bg-slate-50 rounded-xl border border-slate-200 text-xs font-bold text-slate-800"
          >
            <option value="all">همه انواع تراکنش‌ها</option>
            <option value="entry">فقط ورودی‌های انبار (ورود کالا)</option>
            <option value="exit">فقط خروجی‌ها و پیش‌فاکتورها</option>
            <option value="pallet_unpack">باز کردن پالت‌ها</option>
            <option value="reel_unpack">تبدیل قرقره به خورده</option>
          </select>
        </div>

        <div>
          <select
            value={filterUser}
            onChange={(e) => setFilterUser(e.target.value)}
            className="w-full p-1.5 sm:p-2 bg-slate-50 rounded-xl border border-slate-200 text-xs font-bold text-slate-800"
          >
            <option value="all">فیلتر بر اساس ادمین / ثبت‌کننده</option>
            {state.users.map((u) => (
              <option key={u.id} value={u.fullName}>
                {u.fullName} ({u.role === 'manager' ? 'مدیر' : 'ادمین'})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Transactions List */}
      <div className="space-y-3">
        {sortedTransactions.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500">
            <History className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="font-bold text-sm">هیچ تراکنشی مطابق فیلتر یافت نشد.</p>
          </div>
        ) : (
          sortedTransactions.map((tx) => {
            const isEntry = tx.type === 'entry';
            const isExit = tx.type === 'exit';
            const isPalletUnpack = tx.type === 'pallet_unpack';

            return (
              <div
                key={tx.id}
                className="bg-white rounded-xl sm:rounded-2xl border border-slate-200 p-3 sm:p-5 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col md:flex-row md:items-center justify-between gap-3"
              >
                <div className="flex items-start space-x-2.5 sm:space-x-3.5 space-x-reverse min-w-0">
                  {/* Icon Badge */}
                  <div
                    className={`w-9 h-9 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0 font-bold ${
                      isEntry
                        ? 'bg-emerald-100 text-emerald-800'
                        : isExit
                        ? 'bg-rose-100 text-rose-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {isEntry ? (
                      <ArrowDownRight className="w-4 h-4 sm:w-6 sm:h-6" />
                    ) : isExit ? (
                      <ArrowUpLeft className="w-4 h-4 sm:w-6 sm:h-6" />
                    ) : (
                      <ArrowRightLeft className="w-4 h-4 sm:w-6 sm:h-6" />
                    )}
                  </div>

                  {/* Title & Details */}
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-bold text-sm text-slate-900">{tx.title}</h3>

                      <span
                        className={`px-2.5 py-0.5 rounded-md font-bold text-[11px] ${
                          isEntry
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : isExit
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : 'bg-amber-50 text-amber-800 border border-amber-200'
                        }`}
                      >
                        {isEntry
                          ? 'ورود به انبار'
                          : isExit
                          ? 'خروج و پیش‌فاکتور'
                          : isPalletUnpack
                          ? 'تفکیک پالت'
                          : 'تبدیل به خورده'}
                      </span>

                      {tx.invoiceNumber && (
                        <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md text-[11px] font-bold">
                          {tx.invoiceNumber}
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed">{tx.details}</p>

                    {tx.buyerOrSupplier && (
                      <p className="text-xs text-slate-500 font-medium">
                        طرف حساب / خریدار: <span className="text-slate-800 font-bold">{tx.buyerOrSupplier}</span>
                      </p>
                    )}
                  </div>
                </div>

                {/* Registered By Admin Badge & Weight Info */}
                <div className="flex items-center justify-between md:justify-end space-x-6 space-x-reverse pt-3 md:pt-0 border-t md:border-t-0 border-slate-100 shrink-0">
                  <div className="text-right">
                    <div className="text-xs font-black text-amber-800">
                      وزن: {formatKg(tx.totalWeightKg)}
                    </div>
                    {tx.totalPrice && (
                      <div className="text-xs font-bold text-slate-900 mt-0.5">
                        {formatToman(tx.totalPrice)}
                      </div>
                    )}
                  </div>

                  {/* Who Registered (کدام ادمین / کاربر) */}
                  <div className="bg-slate-50 px-3.5 py-2 rounded-xl border border-slate-200 text-right">
                    <div className="flex items-center space-x-1.5 space-x-reverse text-xs font-bold text-slate-800">
                      <User className="w-3.5 h-3.5 text-amber-600" />
                      <span>ثبت توسط: {tx.registeredBy}</span>
                    </div>
                    <div className="text-[10px] text-slate-500 font-bold mt-0.5">
                      زمان: {tx.timestamp || getDateTimeStringFromId(tx.id)}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
