import React, { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  Shield,
  Phone,
  Key,
  UserCheck,
  Building,
  Save,
  Trash2,
  CheckCircle2,
  X,
  Edit2,
  Lock,
  SlidersHorizontal,
  AlertCircle,
  AlertTriangle,
} from 'lucide-react';
import { useInventory } from '../context/InventoryContext';
import { User, WarehouseProfile, ThicknessUnitMode, DiameterUnitMode } from '../types';

export const SettingsView: React.FC = () => {
  const {
    state,
    currentUser,
    addUser,
    updateUser,
    deleteUser,
    addBrand,
    deleteBrand,
    clearAllData,
    updateWarehouseProfile,
  } = useInventory();

  // Factory / Brand management state
  const [newBrandInput, setNewBrandInput] = useState('');
  const [brandToDelete, setBrandToDelete] = useState<string | null>(null);
  const [typedConfirmation, setTypedConfirmation] = useState('');
  const [deleteBrandError, setDeleteBrandError] = useState<string | null>(null);

  // Danger Zone: Secure Full Reset Modal state (Manager Only)
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetConfirmWord, setResetConfirmWord] = useState('');
  const [managerPasswordConfirm, setManagerPasswordConfirm] = useState('');
  const [resetError, setResetError] = useState<string | null>(null);

  // New Admin Form State
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [mobile, setMobile] = useState('');
  const [role, setRole] = useState<'admin' | 'manager'>('admin');

  // Warehouse Profile Form State
  const [profile, setProfile] = useState<WarehouseProfile>(state.warehouseProfile);
  const [profileSuccessMsg, setProfileSuccessMsg] = useState(false);
  const [isProfileDirty, setIsProfileDirty] = useState(false);

  useEffect(() => {
    if (!isProfileDirty) {
      setProfile(state.warehouseProfile);
    }
  }, [state.warehouseProfile, isProfileDirty]);

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !username || !mobile) return;

    addUser({
      fullName,
      username,
      password: password || '123456',
      mobile,
      role,
    });

    setFullName('');
    setUsername('');
    setPassword('');
    setMobile('');
    setRole('admin');
    setShowAddUserModal(false);
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateWarehouseProfile(profile);
    setIsProfileDirty(false);
    setProfileSuccessMsg(true);
    setTimeout(() => setProfileSuccessMsg(false), 3000);
  };

  const [isResetting, setIsResetting] = useState(false);
  const [resetSuccessMessage, setResetSuccessMessage] = useState<string | null>(null);

  const handleExecuteResetAll = async () => {
    const trimmedConfirmWord = resetConfirmWord.trim();
    if (!currentUser || currentUser.role !== 'manager') {
      setResetError('خطای امنیتی: تنها مدیر ارشد کل انبار مجاز به ریست و صفر کردن اطلاعات سیستم می‌باشد.');
      return;
    }

    if (trimmedConfirmWord !== 'حذف کل اطلاعات' && trimmedConfirmWord !== 'حذف') {
      setResetError('لطفاً عبارت "حذف کل اطلاعات" یا "حذف" را دقیقاً تایپ فرمایید.');
      return;
    }

    // Manager password verification: accept user password or fallback milad@68
    const isValidPassword = 
      managerPasswordConfirm.trim() === 'milad@68' || 
      (currentUser.password && currentUser.password.trim() === managerPasswordConfirm.trim());

    if (!isValidPassword) {
      setResetError('رمز عبور مدیر کل وارد شده نادرست است (رمز: milad@68).');
      return;
    }

    setIsResetting(true);
    setResetError(null);

    try {
      // Execute safe clear
      clearAllData();
      
      // Also ensure localStorage is hard cleared and set to 0 immediately
      if (typeof window !== 'undefined') {
        try {
          const raw = localStorage.getItem('COPPER_WAREHOUSE_STATE_V1');
          if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed && parsed.warehouseProfile?.partnerInfo) {
              parsed.warehouseProfile.partnerInfo.partner1Account = { initialCash: 0, initialCopperKg: 0, lastUpdated: '' };
              parsed.warehouseProfile.partnerInfo.partner2Account = { initialCash: 0, initialCopperKg: 0, lastUpdated: '' };
              parsed.warehouseProfile.partnerInfo.sharedAccount = { initialCash: 0, initialCopperKg: 0, lastUpdated: '' };
              localStorage.setItem('COPPER_WAREHOUSE_STATE_V1', JSON.stringify(parsed));
            }
          }
        } catch (e) {
          console.warn('Storage sync:', e);
        }
      }

      setIsResetting(false);
      setShowResetModal(false);
      setResetConfirmWord('');
      setManagerPasswordConfirm('');
      setResetSuccessMessage('کلیه موجودی‌ها، فاکتورها، تراکنش‌ها و مانده حساب‌ها با موفقیت ۱۰۰٪ صفر شدند.');
      setTimeout(() => setResetSuccessMessage(null), 6000);
    } catch (err: any) {
      setIsResetting(false);
      setResetError('خطا در پاکسازی داده‌ها: ' + (err?.message || 'لطفاً مجدداً امتحان کنید.'));
    }
  };

  return (
    <div className="space-y-4 sm:space-y-8 pb-16">
      {/* Header Banner */}
      <div className="bg-white p-3.5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <div className="flex items-center space-x-2.5 sm:space-x-3 space-x-reverse min-w-0">
          <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold shrink-0">
            <Users className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm sm:text-lg font-bold text-slate-900 truncate">
              تنظیمات سیستم و مدیریت ادمین‌ها
            </h2>
            <p className="text-[10px] sm:text-xs text-slate-500 mt-0.5 line-clamp-1">
              مدیریت حساب‌های ادمین‌ها، دسترسی‌های سیستم و مشخصات انبار
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowAddUserModal(true)}
          className="w-full sm:w-auto flex items-center justify-center space-x-1.5 space-x-reverse px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
        >
          <UserPlus className="w-4 h-4" />
          <span>افزودن ادمین جدید</span>
        </button>
      </div>

      {/* SECTION 1: ADMINS & USERS LIST */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center space-x-2 space-x-reverse">
            <Shield className="w-4 h-4 text-amber-700" />
            <h3 className="font-bold text-sm text-slate-900">
              لیست ادمین‌ها و مدیران انبار ({state.users.length} کاربر)
            </h3>
          </div>
          <span className="text-xs text-slate-500">
            تمام تراکنش‌های ثبت شده توسط این نام‌ها ثبت خواهند شد.
          </span>
        </div>

        <div className="divide-y divide-slate-100">
          {state.users.map((u) => (
            <div
              key={u.id}
              className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/60 transition-colors"
            >
              <div className="flex items-center space-x-3 space-x-reverse">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs ${
                    u.role === 'manager'
                      ? 'bg-amber-100 text-amber-800 border border-amber-200'
                      : 'bg-slate-100 text-slate-700 border border-slate-200'
                  }`}
                >
                  {u.fullName.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center space-x-2 space-x-reverse">
                    <span className="font-bold text-sm text-slate-900">{u.fullName}</span>
                    <span
                      className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                        u.role === 'manager'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {u.role === 'manager' ? 'مدیر کل' : 'ادمین انبار'}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 mt-1 flex items-center space-x-4 space-x-reverse">
                    <span>
                      نام کاربری: <b className="text-slate-800 dir-ltr inline-block">@{u.username}</b>
                    </span>
                    <span>
                      همراه: <b className="text-slate-800">{u.mobile}</b>
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2 space-x-reverse self-end sm:self-auto">
                <span className="text-[11px] text-slate-400">تاریخ ایجاد: {u.createdAt}</span>
                {u.id !== 'usr-1' && (
                  <button
                    onClick={() => deleteUser(u.id)}
                    className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                    title="حذف ادمین"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* SECTION 2: WAREHOUSE PROFILE & INVOICE FOOTER SETTINGS */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
        <div className="flex items-center space-x-2 space-x-reverse pb-3 border-b border-slate-100">
          <Building className="w-5 h-5 text-amber-700" />
          <h3 className="font-bold text-sm text-slate-900">
            اطلاعات رسمی انبار و پیش‌فاکتورها
          </h3>
        </div>

        {profileSuccessMsg && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center space-x-2 space-x-reverse">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>مشخصات انبار با موفقیت بروزرسانی شد.</span>
          </div>
        )}

        <form onSubmit={handleSaveProfile} onChange={() => setIsProfileDirty(true)} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                نام رسمی مرکز / انبار مس:
              </label>
              <input
                type="text"
                required
                value={profile.name}
                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                className="w-full p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs font-bold text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                شماره تماس دفتر/انبار:
              </label>
              <input
                type="text"
                required
                value={profile.phone}
                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                className="w-full p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs font-bold text-slate-900"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                آدرس کامل انبار:
              </label>
              <input
                type="text"
                required
                value={profile.address}
                onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                className="w-full p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs font-medium text-slate-900"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                متن پیش‌فرض پانویس و شرایط پیش‌فاکتورها:
              </label>
              <textarea
                rows={2}
                value={profile.defaultInvoiceFooter}
                onChange={(e) =>
                  setProfile({ ...profile, defaultInvoiceFooter: e.target.value })
                }
                className="w-full p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-800"
              />
            </div>
          </div>

          {/* Partnership & Partners Settings */}
          <div className="pt-4 border-t border-slate-100">
            <h4 className="text-xs font-bold text-slate-800 mb-3 flex items-center space-x-1.5 space-x-reverse">
              <Users className="w-4 h-4 text-emerald-600" />
              <span>اطلاعات شراکت و اسامی شرکا (سهم ۵۰٪ - ۵۰٪):</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-emerald-50/50 p-3.5 rounded-2xl border border-emerald-200/80">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  نام و نام خانوادگی شریک اول (مدیر ۱):
                </label>
                <input
                  type="text"
                  value={profile.partnerInfo?.partner1Name ?? ''}
                  placeholder="شریک اول (خودم)"
                  onChange={(e) =>
                    setProfile({
                      ...profile,
                      partnerInfo: {
                        ...(profile.partnerInfo || {
                          partner1Name: 'شریک اول',
                          partner2Name: 'شریک دوم',
                          partner1SharePercent: 50,
                          partner2SharePercent: 50,
                        }),
                        partner1Name: e.target.value,
                      },
                    })
                  }
                  className="w-full p-2.5 bg-white rounded-xl border border-slate-200 text-xs font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  نام و نام خانوادگی شریک دوم (مدیر ۲):
                </label>
                <input
                  type="text"
                  value={profile.partnerInfo?.partner2Name ?? ''}
                  placeholder="شریک دوم (همکار)"
                  onChange={(e) =>
                    setProfile({
                      ...profile,
                      partnerInfo: {
                        ...(profile.partnerInfo || {
                          partner1Name: 'شریک اول',
                          partner2Name: 'شریک دوم',
                          partner1SharePercent: 50,
                          partner2SharePercent: 50,
                        }),
                        partner2Name: e.target.value,
                      },
                    })
                  }
                  className="w-full p-2.5 bg-white rounded-xl border border-slate-200 text-xs font-bold text-slate-900"
                />
              </div>
            </div>
          </div>

          {/* Unit Display Settings */}
          <div className="pt-4 border-t border-slate-100">
            <h4 className="text-xs font-bold text-slate-800 mb-3 flex items-center space-x-1.5 space-x-reverse">
              <SlidersHorizontal className="w-4 h-4 text-amber-600" />
              <span>تنظیمات پیش‌فرض واحد اندازه‌گیری (اینچ / میلی‌متر):</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  واحد نمایش ضخامت لوله مسی:
                </label>
                <select
                  value={profile.unitSettings?.thicknessUnit || 'mm'}
                  onChange={(e) =>
                    setProfile({
                      ...profile,
                      unitSettings: {
                        ...(profile.unitSettings || { thicknessUnit: 'mm', diameterUnit: 'inch' }),
                        thicknessUnit: e.target.value as ThicknessUnitMode,
                      },
                    })
                  }
                  className="w-full p-2.5 bg-white rounded-xl border border-slate-200 text-xs font-bold text-slate-900"
                >
                  <option value="mm">میلی‌متر (پیش‌فرض - 0.75 mm)</option>
                  <option value="inch">اینچ (0.030 in)</option>
                  <option value="both">هر دو (0.75 mm (0.030 in))</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  واحد نمایش قطر / سایز لوله مسی:
                </label>
                <select
                  value={profile.unitSettings?.diameterUnit || 'inch'}
                  onChange={(e) =>
                    setProfile({
                      ...profile,
                      unitSettings: {
                        ...(profile.unitSettings || { thicknessUnit: 'mm', diameterUnit: 'inch' }),
                        diameterUnit: e.target.value as DiameterUnitMode,
                      },
                    })
                  }
                  className="w-full p-2.5 bg-white rounded-xl border border-slate-200 text-xs font-bold text-slate-900"
                >
                  <option value="inch">اینچ (پیش‌فرض - "3/8)</option>
                  <option value="mm">میلی‌متر (9.52 mm)</option>
                  <option value="both">هر دو ("3/8 (9.52 mm))</option>
                </select>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="flex items-center space-x-1.5 space-x-reverse px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-xs cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>ذخیره تغییرات انبار</span>
            </button>
          </div>
        </form>
      </div>

      {/* FACTORIES / BRANDS MANAGEMENT CARD */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center space-x-2 space-x-reverse">
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
              <Building className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900">
                مدیریت کارخانه‌ها و برندهای تولیدکننده مس
              </h3>
              <p className="text-xs text-slate-400">
                افزودن و حذف کارخانه‌های لوله مسی فعال در سیستم (جهت اصلاحات و ورود بار)
              </p>
            </div>
          </div>
        </div>

        {/* Add Factory Input */}
        <div className="flex items-center space-x-2 space-x-reverse">
          <input
            type="text"
            value={newBrandInput}
            onChange={(e) => setNewBrandInput(e.target.value)}
            placeholder="نام کارخانه جدید (مثلاً: مهیا، جهان مس...)"
            className="flex-1 p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                if (newBrandInput.trim()) {
                  addBrand(newBrandInput.trim());
                  setNewBrandInput('');
                }
              }
            }}
          />
          <button
            type="button"
            onClick={() => {
              if (newBrandInput.trim()) {
                addBrand(newBrandInput.trim());
                setNewBrandInput('');
              }
            }}
            className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer shrink-0"
          >
            افزودن کارخانه
          </button>
        </div>

        {/* Factories List */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 pt-2">
          {(state.warehouseProfile.brands || ['باهنر', 'قائم', 'استریا', 'بابک']).map((brandName) => (
            <div
              key={brandName}
              className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200"
            >
              <div className="flex items-center space-x-2 space-x-reverse min-w-0">
                <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0"></span>
                <span className="font-bold text-xs text-slate-800 truncate">کارخانه {brandName}</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!currentUser || currentUser.role !== 'manager') {
                    alert('خطای عدم دسترسی: تنها مدیر کل انبار مجاز به حذف کارخانه‌ها می‌باشد.');
                    return;
                  }
                  setBrandToDelete(brandName);
                  setTypedConfirmation('');
                  setDeleteBrandError(null);
                }}
                className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                title={`حذف کارخانه ${brandName}`}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* DANGER ZONE: DATA ZEROING / RESET */}
      <div className="bg-white rounded-2xl border border-rose-200 p-5 shadow-xs space-y-3">
        {resetSuccessMessage && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-xl text-xs font-bold text-emerald-900 flex items-center space-x-2 space-x-reverse animate-in fade-in duration-200">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{resetSuccessMessage}</span>
          </div>
        )}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3 space-x-reverse">
            <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2 space-x-reverse">
                <h3 className="font-bold text-sm text-rose-950">
                  صفر کردن و بازنشانی کامل کلیه اطلاعات
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-bold">
                  فقط مدیر ارشد کل
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                پاکسازی قطعی تمام موجودی‌های انبار، پالت‌ها، کلاف‌ها، شاخه‌ها، فاکتورها، تراکنش‌ها و صفر کردن کامل حساب شرکا
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              if (!currentUser || currentUser.role !== 'manager') {
                alert('خطای عدم دسترسی: تنها کاربر با نقش «مدیر کل» مجاز به پاکسازی کلیه داده‌ها می‌باشد.');
                return;
              }
              setShowResetModal(true);
              setResetConfirmWord('');
              setManagerPasswordConfirm('');
              setResetError(null);
            }}
            className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer shrink-0 flex items-center space-x-2 space-x-reverse self-start sm:self-auto"
          >
            <Trash2 className="w-4 h-4" />
            <span>صفر کردن کلیه اطلاعات</span>
          </button>
        </div>
      </div>

      {/* MODAL: ADD NEW ADMIN USER */}
      {showAddUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-amber-600 text-white p-5 flex items-center justify-between">
              <div className="flex items-center space-x-2 space-x-reverse">
                <UserPlus className="w-5 h-5" />
                <h3 className="font-bold text-base">افزودن ادمین جدید</h3>
              </div>
              <button
                onClick={() => setShowAddUserModal(false)}
                className="text-white/80 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  نام و نام خانوادگی ادمین:
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="مثلاً: رضا محمدی"
                  className="w-full p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs font-medium text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  شماره موبایل:
                </label>
                <input
                  type="text"
                  required
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  placeholder="۰۹۱۲..."
                  className="w-full p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs font-medium text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  نام کاربری (برای لاگین):
                </label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="مثلاً: admin4"
                  className="w-full p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs font-bold text-slate-900 dir-ltr text-right"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  رمز عبور:
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="******"
                  className="w-full p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs font-bold text-slate-900 dir-ltr text-right"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  نقش و سطح دسترسی:
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as 'admin' | 'manager')}
                  className="w-full p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs font-bold text-slate-800"
                >
                  <option value="admin">ادمین انبار (ثبت ورود/خروج و پیش‌فاکتور)</option>
                  <option value="manager">مدیر کل انبار</option>
                </select>
              </div>

              <div className="pt-3 flex justify-end space-x-2 space-x-reverse">
                <button
                  type="button"
                  onClick={() => setShowAddUserModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-md"
                >
                  ثبت حساب ادمین
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: STRICT FACTORY DELETION CONFIRMATION */}
      {brandToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl border border-rose-200 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2 space-x-reverse text-rose-600">
                <div className="w-9 h-9 rounded-xl bg-rose-100 flex items-center justify-center shrink-0">
                  <AlertCircle className="w-5 h-5 text-rose-600" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-800">تأیید امنیتی حذف کارخانه</h3>
                  <span className="text-[11px] text-slate-500">مختص مدیر کل انبار</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setBrandToDelete(null);
                  setTypedConfirmation('');
                  setDeleteBrandError(null);
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-xs text-slate-600 leading-relaxed">
                شما در حال حذف کارخانه <span className="font-black text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200 text-xs">«{brandToDelete}»</span> از سامانه هستید.
              </p>
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-xs leading-relaxed">
                جهت جلوگیری از حذف اشتباهی، لطفاً نام کارخانه یعنی <span className="font-black text-amber-950 underline select-all">{brandToDelete}</span> یا کلمه <span className="font-black text-amber-950 underline">حذف</span> را در کادر زیر تایپ نمایید:
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  کلمه تأیید را وارد کنید:
                </label>
                <input
                  type="text"
                  value={typedConfirmation}
                  onChange={(e) => {
                    setTypedConfirmation(e.target.value);
                    setDeleteBrandError(null);
                  }}
                  placeholder={`تایپ کنید: ${brandToDelete} یا حذف`}
                  className="w-full p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none focus:border-rose-500"
                  autoFocus
                />
              </div>

              {deleteBrandError && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-bold flex items-center space-x-1.5 space-x-reverse">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{deleteBrandError}</span>
                </div>
              )}
            </div>

            <div className="pt-2 flex justify-end space-x-2 space-x-reverse border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setBrandToDelete(null);
                  setTypedConfirmation('');
                  setDeleteBrandError(null);
                }}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50 cursor-pointer"
              >
                انصراف
              </button>
              <button
                type="button"
                disabled={
                  typedConfirmation.trim() !== brandToDelete &&
                  typedConfirmation.trim().toLowerCase() !== 'حذف' &&
                  typedConfirmation.trim().toLowerCase() !== 'delete'
                }
                onClick={() => {
                  if (!currentUser || currentUser.role !== 'manager') {
                    setDeleteBrandError('شما دسترسی لازم برای این کار را ندارید.');
                    return;
                  }
                  const trimmed = typedConfirmation.trim();
                  if (trimmed !== brandToDelete && trimmed !== 'حذف' && trimmed.toLowerCase() !== 'delete') {
                    setDeleteBrandError(`لطفاً نام دقیق "${brandToDelete}" یا کلمه "حذف" را تایپ فرمایید.`);
                    return;
                  }
                  const success = deleteBrand(brandToDelete);
                  if (success) {
                    setBrandToDelete(null);
                    setTypedConfirmation('');
                    setDeleteBrandError(null);
                  }
                }}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs shadow-md transition-all cursor-pointer"
              >
                تأیید و حذف قطعی کارخانه
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: SECURE FULL RESET / ZEROING CONFIRMATION (MANAGER ONLY) */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-rose-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-rose-600 text-white p-5 flex items-center justify-between">
              <div className="flex items-center space-x-2 space-x-reverse">
                <AlertTriangle className="w-5 h-5 text-white" />
                <h3 className="font-bold text-base">تأییدیه امنیتی پاکسازی و صفر کردن کامل اطلاعات</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowResetModal(false);
                  setResetError(null);
                }}
                className="text-white/80 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 leading-relaxed space-y-1">
                <p className="font-bold text-rose-950">هشدار بسیار مهم و غیرقابل بازگشت:</p>
                <p className="text-[11px] text-rose-800">
                  این عملیات تمام موجودی‌های مس (پالت‌ها، کلاف‌ها، شاخه‌ها)، فاکتورها، تراکنش‌های مالی و حساب‌های شرکا را کاملاً صفر و تخلیه می‌کند.
                </p>
              </div>

              {resetError && (
                <div className="p-3 bg-rose-100 border border-rose-300 text-rose-900 rounded-xl flex items-center space-x-2 space-x-reverse font-bold">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{resetError}</span>
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-800 mb-1.5">
                  ۱. جهت تأیید، کلمه <span className="text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200 font-bold select-all">حذف</span> یا عبارت <span className="text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200 font-bold select-all">حذف کل اطلاعات</span> را بنویسید:
                </label>
                <input
                  type="text"
                  value={resetConfirmWord}
                  onChange={(e) => {
                    setResetConfirmWord(e.target.value);
                    setResetError(null);
                  }}
                  placeholder="حذف"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block font-bold text-slate-800">
                    ۲. رمز عبور حساب مدیر کل ({currentUser?.fullName || 'مدیر'}):
                  </label>
                  <span className="text-[10px] text-slate-500 font-mono bg-slate-100 px-1.5 py-0.5 rounded dir-ltr">
                    رمز پیش‌فرض: milad@68
                  </span>
                </div>
                <input
                  type="password"
                  value={managerPasswordConfirm}
                  onChange={(e) => {
                    setManagerPasswordConfirm(e.target.value);
                    setResetError(null);
                  }}
                  placeholder="رمز عبور مدیر کل (مثلاً milad@68)"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-rose-500"
                />
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end space-x-2 space-x-reverse">
              <button
                type="button"
                disabled={isResetting}
                onClick={() => {
                  setShowResetModal(false);
                  setResetError(null);
                }}
                className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-200 font-bold text-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                انصراف
              </button>
              <button
                type="button"
                disabled={
                  isResetting ||
                  (resetConfirmWord.trim() !== 'حذف کل اطلاعات' && resetConfirmWord.trim() !== 'حذف')
                }
                onClick={handleExecuteResetAll}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xs shadow-md transition-colors flex items-center space-x-1.5 space-x-reverse cursor-pointer"
              >
                <Trash2 className={`w-4 h-4 ${isResetting ? 'animate-spin' : ''}`} />
                <span>{isResetting ? 'در حال صفر کردن سیستم...' : 'تأیید نهایی و صفر کردن کامل سیستم'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
