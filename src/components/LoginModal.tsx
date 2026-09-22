import React, { useState } from 'react';
import { Lock, User, Key, X, ShieldCheck, Warehouse } from 'lucide-react';
import { useInventory } from '../context/InventoryContext';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose }) => {
  const { state, login, setCurrentUser } = useInventory();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const user = login(username, password);
    if (user) {
      setErrorMsg('');
      onClose();
    } else {
      setErrorMsg('نام کاربری یا رمز عبور اشتباه است.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Top Header */}
        <div className="bg-slate-900 text-white p-6 text-center relative">
          <button
            onClick={onClose}
            className="absolute top-4 left-4 p-1 rounded-xl text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="w-12 h-12 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center font-black mx-auto mb-3 shadow-md">
            <Warehouse className="w-6 h-6" />
          </div>
          <h2 className="font-bold text-lg text-white">ورود به سامانه انبار مس</h2>
          <p className="text-xs text-amber-400 mt-1">
            ورود ادمین‌ها و مدیر انبار با نام کاربری و رمز عبور
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-bold">
              {errorMsg}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              نام کاربری:
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="مثلاً: manager یا admin1"
                className="w-full pr-10 pl-4 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs font-bold text-slate-900 focus:outline-hidden focus:border-amber-500 dir-ltr text-right"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              رمز عبور:
            </label>
            <div className="relative">
              <Key className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="******"
                className="w-full pr-10 pl-4 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs font-bold text-slate-900 focus:outline-hidden focus:border-amber-500 dir-ltr text-right"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
          >
            ورود به سیستم
          </button>

          {/* Quick Admin Selection */}
          <div className="pt-4 border-t border-slate-100">
            <span className="block text-[11px] font-bold text-slate-400 mb-2 text-center">
              ورود سریع با کاربران تعریف‌شده:
            </span>
            <div className="grid grid-cols-2 gap-2">
              {state.users.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => {
                    setCurrentUser(u);
                    onClose();
                  }}
                  className="p-2 text-right rounded-xl bg-slate-50 hover:bg-amber-50 border border-slate-200 hover:border-amber-300 transition-all text-xs cursor-pointer"
                >
                  <span className="font-bold text-slate-900 block truncate">
                    {u.fullName}
                  </span>
                  <span className="text-[10px] text-amber-700 font-semibold">
                    @{u.username} ({u.role === 'manager' ? 'مدیر' : 'ادمین'})
                  </span>
                </button>
              ))}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
