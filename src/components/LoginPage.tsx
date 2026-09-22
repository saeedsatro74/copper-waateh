import React, { useState } from 'react';
import { User, Key, Eye, EyeOff, Warehouse, ShieldCheck, ArrowLeft, Lock } from 'lucide-react';
import { useInventory } from '../context/InventoryContext';

export const LoginPage: React.FC = () => {
  const { state, login } = useInventory();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setIsSubmitting(true);

    setTimeout(() => {
      const user = login(username, password);
      if (user) {
        if (rememberMe && typeof window !== 'undefined') {
          localStorage.setItem('COPPER_AUTH_USER_V1', JSON.stringify(user));
        }
        setIsSubmitting(false);
      } else {
        setIsSubmitting(false);
        setErrorMsg('نام کاربری یا کلمه عبور وارد شده نادرست است.');
      }
    }, 250);
  };



  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 sm:p-6 relative overflow-hidden font-sans select-none">
      {/* Background Decorative Metallic Glows */}
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-amber-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-orange-700/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(#d97706_1px,transparent_1px)] [background-size:24px_24px] opacity-10 pointer-events-none" />

      {/* Main Login Card */}
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200/80 overflow-hidden relative z-10 animate-in fade-in zoom-in-95 duration-300">
        {/* Header Branding Banner */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 text-white p-6 sm:p-8 text-center relative border-b border-amber-500/20">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 via-orange-500 to-amber-600 text-slate-950 flex items-center justify-center font-black mx-auto mb-4 shadow-xl ring-4 ring-amber-500/20">
            <Warehouse className="w-8 h-8 text-white" />
          </div>

          <h1 className="font-black text-xl sm:text-2xl text-white tracking-tight">
            {state.warehouseProfile?.name || 'سامانه مدیریت انبار مس'}
          </h1>
          <p className="text-xs sm:text-sm text-amber-400 font-semibold mt-1.5 flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-4 h-4" />
            ورود امن به پنل حسابداری و موجودی
          </p>
        </div>

        {/* Form Body */}
        <div className="p-6 sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            {errorMsg && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-2xl font-bold flex items-center gap-2 animate-in fade-in">
                <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                نام کاربری:
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5" />
                <input
                  type="text"
                  required
                  autoFocus
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="مثلاً admin"
                  className="w-full pr-10 pl-4 py-3 bg-slate-50 hover:bg-slate-100/80 focus:bg-white rounded-2xl border border-slate-200 text-xs font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500 transition-all dir-ltr text-right"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                کلمه عبور:
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="******"
                  className="w-full pr-10 pl-10 py-3 bg-slate-50 hover:bg-slate-100/80 focus:bg-white rounded-2xl border border-slate-200 text-xs font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500 transition-all dir-ltr text-right"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-3 top-3 text-slate-400 hover:text-slate-600 p-0.5 rounded-lg cursor-pointer"
                  title={showPassword ? 'مخفی کردن' : 'نمایش رمز'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 border-slate-300"
                />
                <span className="text-xs font-bold text-slate-600">مرا به خاطر بسپار</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 active:scale-98 text-white font-black text-sm shadow-lg shadow-amber-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
            >
              {isSubmitting ? (
                <span>در حال ورود...</span>
              ) : (
                <>
                  <span>ورود به سامانه</span>
                  <ArrowLeft className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
      <div className="text-center mt-6 text-slate-500 text-xs font-medium z-10">
        سیستم یکپارچه مدیریت انبار و حسابداری لوله و کلاف مس
      </div>
    </div>
  );
};
