import React, { useState, useEffect } from 'react';
import {
  Undo2,
  Redo2,
  PackageCheck,
  History,
  FileText,
  Settings,
  User as UserIcon,
  LogOut,
  ChevronDown,
  Warehouse,
  PlusCircle,
  FileSpreadsheet,
  CheckCircle2,
  Users,
  Calculator,
  Handshake,
  Coins,
  Cloud,
  CloudOff,
  Loader2,
  Clock,
  Calendar,
} from 'lucide-react';
import { useInventory } from '../context/InventoryContext';
import { User } from '../types';

interface HeaderProps {
  activeTab: 'inventory' | 'partners' | 'transactions' | 'statements' | 'invoices' | 'consignments' | 'settings';
  setActiveTab: (tab: 'inventory' | 'partners' | 'transactions' | 'statements' | 'invoices' | 'consignments' | 'settings') => void;
  onOpenStockEntryModal: () => void;
  onOpenInvoiceModal: () => void;
  onOpenLoginModal: () => void;
  onOpenCalculatorModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  onOpenStockEntryModal,
  onOpenInvoiceModal,
  onOpenLoginModal,
  onOpenCalculatorModal,
}) => {
  const {
    state,
    currentUser,
    logout,
    canUndo,
    canRedo,
    undo,
    redo,
    setCurrentUser,
    selectedItems,
    isCloudConnected,
    isCloudSyncing,
    isOperationLoading,
    lastActionDescription,
    syncNowWithCloud,
  } = useInventory();

  const isManager = currentUser?.role === 'manager';

  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  const totalSelectedWeight = selectedItems.reduce((acc, item) => acc + item.weightKg, 0);

  const [timeStr, setTimeStr] = useState('');
  const [dateStr, setDateStr] = useState('');

  useEffect(() => {
    const updateDateTime = () => {
      const now = new Date();
      
      // Format time (e.g., 14:23:45)
      const formattedTime = new Intl.DateTimeFormat('fa-IR', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      }).format(now);

      // Format date (e.g., سه‌شنبه، ۳۱ شهریور ۱۴۰۵)
      const formattedDate = new Intl.DateTimeFormat('fa-IR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      }).format(now);

      setTimeStr(formattedTime);
      setDateStr(formattedDate);
    };

    updateDateTime();
    const interval = setInterval(updateDateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs">
      {/* Top Banner Bar */}
      <div className="max-w-7xl mx-auto px-2.5 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between py-2.5 sm:py-0 sm:h-16 gap-2">
          {/* Logo & App Name */}
          <div className="flex items-center space-x-2 sm:space-x-3 space-x-reverse min-w-0 shrink">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-amber-600 via-orange-600 to-amber-700 flex items-center justify-center text-white shadow-sm ring-1 ring-amber-500/30 shrink-0">
              <Warehouse className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm sm:text-lg font-black text-slate-900 leading-tight truncate">
                {state.warehouseProfile.name}
              </h1>
              <p className="text-[10px] sm:text-xs font-medium text-amber-700 hidden sm:block truncate">
                انبار توزیع تخصصی لوله و کلاف مس
              </p>
            </div>
          </div>

          {/* Live Date & Time Indicator */}
          {timeStr && (
            <div className="hidden md:flex items-center space-x-2.5 space-x-reverse bg-slate-50 border border-slate-200/80 px-3 py-1.5 rounded-2xl shrink-0 shadow-2xs">
              <div className="flex items-center gap-1.5 text-slate-800">
                <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="text-xs font-black dir-ltr tabular-nums tracking-wide">{timeStr}</span>
              </div>
              <div className="w-px h-3 bg-slate-200" />
              <div className="flex items-center gap-1.5 text-slate-600">
                <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="text-[10px] font-black">{dateStr}</span>
              </div>
            </div>
          )}

          {/* Center Actions: UNDO / REDO System & Realtime Sync Status */}
          <div className="flex items-center space-x-1 sm:space-x-2 space-x-reverse bg-slate-100 p-1 sm:p-1.5 rounded-xl border border-slate-200 shrink-0">
            <button
              onClick={undo}
              disabled={!canUndo}
              title="آندو / بازگشت به حالت قبل (Undo)"
              className={`flex items-center space-x-1 space-x-reverse px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[11px] sm:text-xs font-medium transition-all ${
                canUndo
                  ? 'bg-white text-slate-800 shadow-xs hover:bg-slate-50 border border-slate-200 active:scale-95 cursor-pointer'
                  : 'text-slate-400 cursor-not-allowed opacity-50'
              }`}
            >
              <Undo2 className="w-3.5 h-3.5 text-amber-600" />
              <span className="hidden md:inline">بازگشت (Undo)</span>
            </button>

            <button
              onClick={redo}
              disabled={!canRedo}
              title="ریدو / انجام مجدد (Redo)"
              className={`flex items-center space-x-1 space-x-reverse px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[11px] sm:text-xs font-medium transition-all ${
                canRedo
                  ? 'bg-white text-slate-800 shadow-xs hover:bg-slate-50 border border-slate-200 active:scale-95 cursor-pointer'
                  : 'text-slate-400 cursor-not-allowed opacity-50'
              }`}
            >
              <Redo2 className="w-3.5 h-3.5 text-amber-600" />
              <span className="hidden md:inline">انجام مجدد (Redo)</span>
            </button>

            {/* Cloud & Save Status */}
            <button
              onClick={syncNowWithCloud}
              disabled={isCloudSyncing || isOperationLoading}
              title={isCloudConnected ? "دیتابیس ابری متصل و همگام است - کلیک برای همگام‌سازی فوری" : "همگام‌سازی محلی / ابری"}
              className={`flex items-center space-x-1 space-x-reverse px-2 py-1 sm:py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                isCloudSyncing || isOperationLoading
                  ? 'bg-amber-100 text-amber-900 border border-amber-300 animate-pulse'
                  : isCloudConnected
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 cursor-pointer'
                  : 'bg-slate-200 text-slate-700 hover:bg-slate-300 cursor-pointer'
              }`}
            >
              {isCloudSyncing || isOperationLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-600" />
                  <span className="hidden lg:inline text-[10px]">در حال ذخیره...</span>
                </>
              ) : isCloudConnected ? (
                <>
                  <Cloud className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="hidden lg:inline text-[10px] font-bold">ابری همگام</span>
                </>
              ) : (
                <>
                  <CloudOff className="w-3.5 h-3.5 text-slate-500" />
                  <span className="hidden lg:inline text-[10px]">ذخیره محلی</span>
                </>
              )}
            </button>
          </div>

          {/* Right Actions: Prominent Stock Entry, Calculator, Invoice Action, User Profile */}
          <div className="flex items-center space-x-1.5 sm:space-x-2.5 space-x-reverse shrink-0">
            {/* Prominent Stock Entry Button */}
            <button
              onClick={onOpenStockEntryModal}
              title="ثبت ورود جدید مس و کالا به انبار"
              className="flex items-center space-x-1.5 sm:space-x-2 space-x-reverse px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl bg-amber-600 hover:bg-amber-700 active:scale-95 text-white text-xs sm:text-sm font-black transition-all shadow-md cursor-pointer shrink-0 border border-amber-500/50"
            >
              <PlusCircle className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-amber-100" />
              <span className="font-black">ثبت ورودی مس</span>
            </button>

            {/* Calculator Button (Single Instance) */}
            <button
              onClick={onOpenCalculatorModal}
              title="ماشین حساب تخصصی وزن لوله و کلاف مس"
              className="flex items-center space-x-1 sm:space-x-1.5 space-x-reverse px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-[11px] sm:text-xs font-black transition-all shadow-xs cursor-pointer shrink-0 border border-slate-300"
            >
              <Calculator className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-700" />
              <span className="hidden sm:inline">ماشین حساب</span>
            </button>

            {/* Quick Exit / Invoice Button if items are selected */}
            {selectedItems.length > 0 && (
              <button
                onClick={onOpenInvoiceModal}
                className="flex items-center space-x-1 space-x-reverse px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl bg-emerald-600 text-white text-[11px] sm:text-xs font-bold hover:bg-emerald-700 transition-all shadow-xs cursor-pointer animate-pulse whitespace-nowrap"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span>پیش‌فاکتور ({selectedItems.length})</span>
              </button>
            )}

            {/* User Profile Dropdown / Login */}
            {currentUser ? (
              <div className="relative">
                <button
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="flex items-center space-x-1.5 sm:space-x-2 space-x-reverse p-1 sm:px-3 sm:py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 transition-all text-right cursor-pointer"
                >
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-xs border border-amber-200 shrink-0">
                    {currentUser.fullName.charAt(0)}
                  </div>
                  <div className="text-right hidden sm:block">
                    <div className="text-xs font-bold text-slate-900 leading-tight">
                      {currentUser.fullName}
                    </div>
                    <div className="text-[10px] text-amber-700 font-medium">
                      {currentUser.role === 'manager' ? 'مدیر سیستم' : 'ادمین انبار'}
                    </div>
                  </div>
                  <ChevronDown className="w-3 h-3 text-slate-400" />
                </button>

                {userDropdownOpen && (
                  <div className="absolute left-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="px-4 py-2 border-b border-slate-100">
                      <p className="text-xs text-slate-500 font-medium">وارد شده به عنوان</p>
                      <p className="text-xs font-bold text-slate-900">{currentUser.fullName}</p>
                      <p className="text-[11px] text-slate-500 dir-ltr text-right">@{currentUser.username}</p>
                    </div>

                    <div className="py-1">
                      <div className="px-4 py-1.5 text-[11px] font-bold text-slate-400">
                        تعویض سریع کاربر
                      </div>
                      {state.users.map((u) => (
                        <button
                          key={u.id}
                          onClick={() => {
                            setCurrentUser(u);
                            setUserDropdownOpen(false);
                          }}
                          className={`w-full text-right px-4 py-2 text-xs flex items-center justify-between hover:bg-amber-50/50 transition-colors ${
                            u.id === currentUser.id
                              ? 'text-amber-700 font-bold bg-amber-50/70'
                              : 'text-slate-700'
                          }`}
                        >
                          <span>{u.fullName}</span>
                          <span className="text-[10px] text-slate-400">
                            {u.role === 'manager' ? 'مدیر' : 'ادمین'}
                          </span>
                        </button>
                      ))}
                    </div>

                    <div className="border-t border-slate-100 pt-1 mt-1 space-y-0.5">
                      <button
                        onClick={() => {
                          setUserDropdownOpen(false);
                          onOpenLoginModal();
                        }}
                        className="w-full text-right px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center space-x-2 space-x-reverse cursor-pointer"
                      >
                        <UserIcon className="w-3.5 h-3.5 text-slate-500" />
                        <span>ورود با حساب دیگر</span>
                      </button>

                      <button
                        onClick={() => {
                          setUserDropdownOpen(false);
                          logout();
                        }}
                        className="w-full text-right px-4 py-2 text-xs text-rose-600 hover:bg-rose-50 flex items-center space-x-2 space-x-reverse cursor-pointer font-bold"
                      >
                        <LogOut className="w-3.5 h-3.5 text-rose-500" />
                        <span>خروج از حساب</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={onOpenLoginModal}
                className="flex items-center space-x-1 space-x-reverse px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-[11px] sm:text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                <UserIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span>ورود</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Navigation Tabs */}
      <div className="bg-slate-50/80 border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-2.5 sm:px-6 lg:px-8">
          <nav className="flex items-center space-x-2 sm:space-x-6 space-x-reverse overflow-x-auto py-1.5 sm:py-2 scrollbar-none">
            <button
              onClick={() => setActiveTab('inventory')}
              className={`flex items-center space-x-1.5 space-x-reverse px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-[11px] sm:text-xs font-bold transition-all whitespace-nowrap cursor-pointer shrink-0 ${
                activeTab === 'inventory'
                  ? 'bg-white text-amber-700 shadow-xs border border-amber-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <PackageCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>موجودی انبار</span>
            </button>

            <button
              onClick={() => setActiveTab('partners')}
              className={`flex items-center space-x-1.5 space-x-reverse px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-[11px] sm:text-xs font-bold transition-all whitespace-nowrap cursor-pointer shrink-0 ${
                activeTab === 'partners'
                  ? 'bg-white text-amber-700 shadow-xs border border-amber-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <Coins className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-600" />
              <span>پنل کاربران</span>
            </button>

            {isManager && (
              <button
                onClick={() => setActiveTab('transactions')}
                className={`flex items-center space-x-1.5 space-x-reverse px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-[11px] sm:text-xs font-bold transition-all whitespace-nowrap cursor-pointer shrink-0 ${
                  activeTab === 'transactions'
                    ? 'bg-white text-amber-700 shadow-xs border border-amber-200'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
              >
                <History className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span>تراکنش‌ها و سوابق</span>
              </button>
            )}

            <button
              onClick={() => setActiveTab('statements')}
              className={`flex items-center space-x-1.5 space-x-reverse px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-[11px] sm:text-xs font-bold transition-all whitespace-nowrap cursor-pointer shrink-0 ${
                activeTab === 'statements'
                  ? 'bg-white text-amber-700 shadow-xs border border-amber-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>صورت حساب</span>
            </button>

            <button
              onClick={() => setActiveTab('invoices')}
              className={`flex items-center space-x-1.5 space-x-reverse px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-[11px] sm:text-xs font-bold transition-all whitespace-nowrap cursor-pointer shrink-0 ${
                activeTab === 'invoices'
                  ? 'bg-white text-amber-700 shadow-xs border border-amber-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>پیش فاکتور</span>
            </button>

            {isManager && (
              <button
                onClick={() => setActiveTab('settings')}
                className={`flex items-center space-x-1.5 space-x-reverse px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-[11px] sm:text-xs font-bold transition-all whitespace-nowrap cursor-pointer shrink-0 ${
                  activeTab === 'settings'
                    ? 'bg-white text-amber-700 shadow-xs border border-amber-200'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
              >
                <Settings className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span>تنظیمات</span>
              </button>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
};
