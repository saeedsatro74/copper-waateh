import React, { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  Shield,
  Building,
  Save,
  Trash2,
  CheckCircle2,
  X,
  SlidersHorizontal,
  AlertCircle,
  AlertTriangle,
  FileDown,
  Printer,
  Download,
  FileText,
  Calendar,
  Scale,
  FileSpreadsheet,
} from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { useInventory } from '../context/InventoryContext';
import { WarehouseProfile, ThicknessUnitMode, DiameterUnitMode } from '../types';
import { formatKg, formatPersianNumber, getPersianDateTimeString } from '../utils/persian';

export const SettingsView: React.FC = () => {
  const {
    state,
    currentUser,
    addUser,
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

  // Weekly Backup PDF Preview state
  const [showBackupPDFPreview, setShowBackupPDFPreview] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [backupDownloadMsg, setBackupDownloadMsg] = useState<string | null>(null);

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
      clearAllData();
      
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

  // Inventory stats calculations for backup
  const totalPallets = state.pallets || [];
  const totalPalletsWeight = totalPallets.reduce((acc, p) => acc + (p.reels || []).reduce((rAcc, r) => rAcc + r.weightKg, 0), 0);
  
  const totalReels = state.reels || [];
  const totalReelsWeight = totalReels.reduce((acc, r) => acc + r.weightKg, 0);

  const totalCoils = state.coils || [];
  const totalCoilsWeight = totalCoils.reduce((acc, c) => acc + c.weightKg, 0);

  const totalBranches = state.branches || [];
  const totalBranchesWeight = totalBranches.reduce((acc, b) => acc + b.totalWeightKg, 0);
  const totalBranchesCount = totalBranches.reduce((acc, b) => acc + b.count, 0);

  const totalLoose = state.loose || [];
  const totalLooseWeight = totalLoose.reduce((acc, l) => acc + l.weightKg, 0);

  const grandTotalWeight = totalPalletsWeight + totalReelsWeight + totalCoilsWeight + totalBranchesWeight + totalLooseWeight;
  const grandTotalItems = totalPallets.length + totalReels.length + totalCoils.length + totalBranches.length + totalLoose.length;

  const p1Name = state.warehouseProfile.partnerInfo?.partner1Name || 'شریک اول';
  const p2Name = state.warehouseProfile.partnerInfo?.partner2Name || 'شریک دوم';

  // 1. Direct PDF Generation using html2canvas + jsPDF with full multi-page support
  const downloadPDF = async () => {
    setIsGeneratingPDF(true);
    setBackupDownloadMsg(null);
    try {
      const element = document.getElementById('backup-pdf-report-print');
      if (!element) {
        throw new Error('المان گزارش برای تولید PDF یافت نشد.');
      }

      // Convert the container to canvas
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: 1200,
        onclone: (clonedDoc) => {
          const target = clonedDoc.getElementById('backup-pdf-report-print');
          if (target) {
            target.style.backgroundColor = '#ffffff';
            target.style.color = '#0f172a';
            const allElements = target.querySelectorAll('*');
            allElements.forEach((el) => {
              const htmlEl = el as HTMLElement;
              const cs = window.getComputedStyle(htmlEl);
              if (cs.color && cs.color.includes('oklch')) {
                htmlEl.style.color = '#1e293b';
              }
              if (cs.backgroundColor && cs.backgroundColor.includes('oklch')) {
                htmlEl.style.backgroundColor = '#ffffff';
              }
              if (cs.borderColor && cs.borderColor.includes('oklch')) {
                htmlEl.style.borderColor = '#cbd5e1';
              }
            });
          }
        },
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
      });

      const pageWidth = 297;
      const pageHeight = 210;
      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      const safeTime = new Date().getTime();
      pdf.save(`گزارش-موجودی-مس-${safeTime}.pdf`);
      setBackupDownloadMsg('فایل PDF با موفقیت دانلود شد.');
      setTimeout(() => setBackupDownloadMsg(null), 5000);
    } catch (err: any) {
      console.error('PDF generation error:', err);
      // Fallback: download standalone printable HTML
      downloadHTMLBackup();
      setBackupDownloadMsg('فایل سند چاپی ذخیره شد.');
      setTimeout(() => setBackupDownloadMsg(null), 5000);
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  // 2. Standalone HTML Printable file download
  const downloadHTMLBackup = () => {
    const element = document.getElementById('backup-pdf-report-print');
    if (!element) return;
    const htmlContent = `<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
  <meta charset="utf-8">
  <title>گزارش موجودی کل مس انبار</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;700;900&display=swap" rel="stylesheet">
  <style>
    body { font-family: 'Vazirmatn', system-ui, sans-serif; margin: 20px; direction: rtl; color: #0f172a; background: #fff; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; margin-bottom: 16px; font-size: 11px; }
    th, td { border: 1px solid #cbd5e1; padding: 6px 8px; text-align: right; }
    th { background-color: #f1f5f9; font-weight: bold; }
    @media print {
      body { margin: 0; }
      @page { size: A4 landscape; margin: 8mm; }
    }
  </style>
</head>
<body>
  ${element.innerHTML}
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `سند-موجودی-مس-${new Date().getTime()}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setBackupDownloadMsg('سند چاپی دانلود شد.');
    setTimeout(() => setBackupDownloadMsg(null), 4000);
  };

  // 3. Excel / CSV Spreadsheet export with Persian UTF-8 BOM
  const downloadCSVBackup = () => {
    let csv = '\uFEFF';
    csv += 'گزارش موجودی کل مس انبار\n';
    csv += `تاریخ تولید گزارش,${getPersianDateTimeString()}\n`;
    csv += `انبار,${profile.name}\n\n`;

    // 1. Pallets
    csv += '--- ۱. پالت‌های مس ---\n';
    csv += 'کد پالت,کارخانه/برند,سایز,ضخامت (mm),تعداد قرقره,وزن کل (Kg),محل استقرار,وضعیت\n';
    totalPallets.forEach((p) => {
      const pWeight = (p.reels || []).reduce((acc, r) => acc + r.weightKg, 0);
      csv += `"${p.palletCode}","${p.brand}","${p.diameter}","${p.thickness}",${p.reels?.length || 0},${pWeight},"${p.location || '-'}","${p.status === 'sealed' ? 'پلمب' : 'باز شده'}"\n`;
    });
    csv += '\n';

    // 2. Standalone Reels
    csv += '--- ۲. قرقره‌های مستقل مس ---\n';
    csv += 'کد قرقره,کارخانه/برند,سایز,ضخامت (mm),وزن (Kg),محل استقرار\n';
    totalReels.forEach((r) => {
      csv += `"${r.reelCode}","${r.brand}","${r.diameter}","${r.thickness}",${r.weightKg},"${r.location || '-'}"\n`;
    });
    csv += '\n';

    // 3. Coils
    csv += '--- ۳. کلاف‌های مس ---\n';
    csv += 'کد کلاف,کارخانه/برند,سایز,ضخامت (mm),متراژ (متر),وزن (Kg),محل استقرار\n';
    totalCoils.forEach((c) => {
      csv += `"${c.code}","${c.brand}","${c.diameter}","${c.thickness}",${c.lengthMeters || '-'},${c.weightKg},"${c.location || '-'}"\n`;
    });
    csv += '\n';

    // 4. Branches
    csv += '--- ۴. شاخه‌های مس ---\n';
    csv += 'کد شاخه,کارخانه/برند,سایز,ضخامت (mm),طول (متر),تعداد,وزن کل (Kg),محل استقرار\n';
    totalBranches.forEach((b) => {
      csv += `"${b.code}","${b.brand}","${b.diameter}","${b.thickness}",${b.lengthMeters},${b.count},${b.totalWeightKg},"${b.location || '-'}"\n`;
    });
    csv += '\n';

    // 5. Loose
    csv += '--- ۵. خرده‌مس و تفکیکی‌ها ---\n';
    csv += 'کد,کارخانه/برند منبع,سایز,ضخامت (mm),وزن (Kg),شرح\n';
    totalLoose.forEach((l) => {
      csv += `"${l.code}","${l.brand}","${l.diameter}","${l.thickness}",${l.weightKg},"${l.description || '-'}"\n`;
    });
    csv += '\n';

    csv += `مجموع کل وزن مس در انبار,${grandTotalWeight} کیلوگرم\n`;

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `اکسل-موجودی-مس-${new Date().getTime()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setBackupDownloadMsg('فایل اکسل (CSV) با موفقیت دانلود شد.');
    setTimeout(() => setBackupDownloadMsg(null), 4000);
  };

  // 4. Print via isolated iframe to bypass sandbox modal restrictions
  const handlePrintViaFrame = () => {
    const element = document.getElementById('backup-pdf-report-print');
    if (!element) return;
    try {
      const printIframe = document.createElement('iframe');
      printIframe.style.position = 'fixed';
      printIframe.style.right = '0';
      printIframe.style.bottom = '0';
      printIframe.style.width = '0';
      printIframe.style.height = '0';
      printIframe.style.border = '0';
      document.body.appendChild(printIframe);

      const doc = printIframe.contentWindow?.document;
      if (doc) {
        doc.open();
        doc.write(`
          <!DOCTYPE html>
          <html lang="fa" dir="rtl">
            <head>
              <meta charset="utf-8">
              <title>گزارش موجودی مس انبار</title>
              <link rel="preconnect" href="https://fonts.googleapis.com">
              <link href="https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;700;900&display=swap" rel="stylesheet">
              <style>
                body { font-family: 'Vazirmatn', system-ui, sans-serif; margin: 10px; direction: rtl; color: #0f172a; background: #fff; }
                table { width: 100%; border-collapse: collapse; margin-top: 8px; margin-bottom: 14px; font-size: 11px; }
                th, td { border: 1px solid #94a3b8; padding: 6px 8px; text-align: right; }
                th { background-color: #f1f5f9; font-weight: bold; }
                @media print {
                  body { margin: 0; padding: 10px; }
                  @page { size: A4 landscape; margin: 8mm; }
                }
              </style>
            </head>
            <body>
              ${element.innerHTML}
            </body>
          </html>
        `);
        doc.close();
        setTimeout(() => {
          try {
            printIframe.contentWindow?.focus();
            printIframe.contentWindow?.print();
          } catch (e) {
            console.warn('Iframe print error:', e);
            window.print();
          }
          setTimeout(() => {
            if (document.body.contains(printIframe)) {
              document.body.removeChild(printIframe);
            }
          }, 4000);
        }, 500);
      }
    } catch (e) {
      console.warn('Print error, falling back to window.print', e);
      window.print();
    }
  };

  return (
    <div className="space-y-4 pb-16 text-right">
      {/* 1. Header with Admin Management toggle */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200 flex items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-xs font-black text-slate-800">
              تنظیمات سیستم و مدیریت کاربران
            </h2>
          </div>
        </div>

        <button
          onClick={() => setShowAddUserModal(true)}
          className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs cursor-pointer transition-all"
        >
          <UserPlus className="w-3.5 h-3.5" />
          <span>افزودن ادمین</span>
        </button>
      </div>

      {resetSuccessMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-850 font-bold text-xs rounded-2xl flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          <span>{resetSuccessMessage}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Columns Left: Warehouse Information & Parameters (2 columns wide) */}
        <div className="lg:col-span-2 space-y-3">
          {/* Warehouse Parameters form */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center gap-1.5 border-b border-slate-100 pb-2">
              <Building className="w-4 h-4 text-amber-700" />
              <h3 className="font-black text-xs text-slate-800">
                اطلاعات رسمی انبار و پیش‌فاکتورها
              </h3>
            </div>

            {profileSuccessMsg && (
              <div className="p-2 bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-bold rounded-xl flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>تنظیمات با موفقیت ذخیره شد.</span>
              </div>
            )}

            <form onSubmit={handleSaveProfile} onChange={() => setIsProfileDirty(true)} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                <div>
                  <label className="block text-[10px] font-black text-slate-600 mb-1">
                    نام رسمی مرکز / انبار مس:
                  </label>
                  <input
                    type="text"
                    required
                    value={profile.name}
                    onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                    className="w-full p-2 bg-slate-50 rounded-lg border border-slate-200 text-xs font-bold text-slate-900 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-600 mb-1">
                    شماره تماس دفتر/انبار:
                  </label>
                  <input
                    type="text"
                    required
                    value={profile.phone}
                    onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                    className="w-full p-2 bg-slate-50 rounded-lg border border-slate-200 text-xs font-bold text-slate-900 focus:outline-hidden"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-black text-slate-600 mb-1">
                    آدرس کامل انبار:
                  </label>
                  <input
                    type="text"
                    required
                    value={profile.address}
                    onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                    className="w-full p-2 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-800 focus:outline-hidden"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-black text-slate-600 mb-1">
                    متن پیش‌فرض پانویس پیش‌فاکتورها:
                  </label>
                  <textarea
                    rows={1}
                    value={profile.defaultInvoiceFooter}
                    onChange={(e) =>
                      setProfile({ ...profile, defaultInvoiceFooter: e.target.value })
                    }
                    className="w-full p-2 bg-slate-50 rounded-lg border border-slate-200 text-[11px] text-slate-800 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Partners names */}
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/60 text-xs">
                <span className="block text-[10px] font-black text-slate-600 mb-2">اطلاعات شرکا (تسهیم سود ۵۰-۵۰):</span>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <input
                      type="text"
                      value={profile.partnerInfo?.partner1Name ?? ''}
                      placeholder="نام شریک اول"
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
                      className="w-full p-2 bg-white rounded-lg border border-slate-200 text-xs text-center font-bold"
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      value={profile.partnerInfo?.partner2Name ?? ''}
                      placeholder="نام شریک دوم"
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
                      className="w-full p-2 bg-white rounded-lg border border-slate-200 text-xs text-center font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* Units Display */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="block text-[10px] font-black text-slate-500 mb-1">واحد نمایش ضخامت لوله:</label>
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
                    className="w-full p-2 bg-slate-50 rounded-lg border border-slate-200 text-xs font-bold"
                  >
                    <option value="mm">میلی‌متر (mm)</option>
                    <option value="inch">اینچ (inch)</option>
                    <option value="both">هر دو</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-500 mb-1">واحد نمایش قطر / سایز:</label>
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
                    className="w-full p-2 bg-slate-50 rounded-lg border border-slate-200 text-xs font-bold"
                  >
                    <option value="inch">اینچ (")</option>
                    <option value="mm">میلی‌متر (mm)</option>
                    <option value="both">هر دو</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  className="flex items-center gap-1 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs cursor-pointer shadow-sm"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>ذخیره تغییرات انبار</span>
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Column Right: Admins List, Brand List & Backups */}
        <div className="space-y-3">
          {/* Admin List table */}
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs space-y-2.5">
            <div className="flex items-center gap-1 border-b border-slate-100 pb-2">
              <Shield className="w-4 h-4 text-amber-700" />
              <h3 className="font-black text-xs text-slate-800">
                لیست ادمین‌ها ({state.users.length} نفر)
              </h3>
            </div>

            <div className="space-y-1.5 max-h-[160px] overflow-y-auto">
              {state.users.map((u) => (
                <div key={u.id} className="flex items-center justify-between p-1.5 rounded-lg bg-slate-50/70 border border-slate-100 text-xs">
                  <div>
                    <span className="font-bold text-slate-900 block leading-tight">{u.fullName}</span>
                    <span className="text-[10px] text-slate-400">@{u.username} | {u.role === 'manager' ? 'مدیر' : 'ادمین'}</span>
                  </div>
                  {u.id !== 'usr-1' && (
                    <button
                      onClick={() => deleteUser(u.id)}
                      className="p-1 text-rose-500 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Factories list */}
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs space-y-2.5">
            <span className="block font-black text-xs text-slate-800">مدیریت برندها/کارخانه‌ها</span>
            
            <div className="flex gap-1">
              <input
                type="text"
                value={newBrandInput}
                onChange={(e) => setNewBrandInput(e.target.value)}
                placeholder="برند جدید"
                className="flex-1 p-1.5 bg-slate-50 rounded-lg border border-slate-200 text-xs text-center"
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
                className="px-2.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-lg cursor-pointer shrink-0"
              >
                ثبت
              </button>
            </div>

            <div className="flex flex-wrap gap-1 max-h-[80px] overflow-y-auto">
              {(state.warehouseProfile.brands || ['باهنر', 'قائم', 'استریا', 'بابک']).map((brandName) => (
                <div key={brandName} className="flex items-center gap-1 px-1.5 py-0.5 rounded-lg bg-slate-100 text-[10px] border border-slate-200">
                  <span className="font-bold text-slate-700">{brandName}</span>
                  <button
                    onClick={() => {
                      if (!currentUser || currentUser.role !== 'manager') return;
                      setBrandToDelete(brandName);
                      setTypedConfirmation('');
                      setDeleteBrandError(null);
                    }}
                    className="text-rose-600 hover:bg-white rounded p-0.5 cursor-pointer"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Weekly Backup Feature (PDF Download) */}
          <div className="bg-amber-50/60 border border-amber-200 p-3.5 rounded-2xl space-y-2.5 shadow-xs">
            <div>
              <span className="block font-black text-xs text-amber-950">بکاپ هفتگی موجودی کل مس (خروجی PDF و اکسل)</span>
              <span className="block text-[10px] text-slate-600 mt-0.5">
                گزارش رسمی و جدولی از کلیه دارایی‌های مس انبار (پالت‌ها، کلاف‌ها، قرقره‌ها و شاخه‌ها) آماده دریافت در قالب PDF، اکسل و سند چاپی.
              </span>
            </div>

            {backupDownloadMsg && (
              <div className="p-2 bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-bold rounded-lg flex items-center gap-1.5 animate-in fade-in">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>{backupDownloadMsg}</span>
              </div>
            )}
            
            <div className="space-y-1.5">
              <button
                type="button"
                onClick={() => setShowBackupPDFPreview(true)}
                className="w-full flex items-center justify-center gap-1.5 py-2 px-3 bg-amber-600 hover:bg-amber-700 text-white font-black text-xs rounded-xl cursor-pointer transition-all shadow-2xs"
              >
                <FileDown className="w-4 h-4" />
                <span>مشاهده پیش‌نمایش سند و دانلود PDF</span>
              </button>

              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={downloadCSVBackup}
                  className="flex items-center justify-center gap-1 py-1.5 px-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold text-[10px] rounded-lg cursor-pointer transition-all"
                  title="دانلود جدول داده‌های مس برای اکسل"
                >
                  <FileSpreadsheet className="w-3 h-3 text-emerald-600" />
                  <span>دانلود اکسل (CSV)</span>
                </button>

                <button
                  type="button"
                  onClick={downloadHTMLBackup}
                  className="flex items-center justify-center gap-1 py-1.5 px-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold text-[10px] rounded-lg cursor-pointer transition-all"
                  title="دانلود فایل HTML قابل چاپ مستقیم"
                >
                  <Download className="w-3 h-3 text-blue-600" />
                  <span>سند چاپی فوری</span>
                </button>
              </div>
            </div>
          </div>

          {/* Clean / Reset Database */}
          <div className="bg-rose-50 border border-rose-200 p-3.5 rounded-2xl flex items-center justify-between gap-2.5 shadow-xs">
            <div>
              <span className="block font-black text-xs text-rose-950">صفر کردن داده‌ها</span>
              <span className="block text-[10px] text-rose-700 mt-0.5">پاکسازی تمام موجودی و فاکتورها</span>
            </div>
            <button
              onClick={() => {
                if (!currentUser || currentUser.role !== 'manager') {
                  alert('فقط مدیر کل مجاز به پاکسازی داده‌ها است.');
                  return;
                }
                setShowResetModal(true);
                setResetConfirmWord('');
                setManagerPasswordConfirm('');
                setResetError(null);
              }}
              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-black text-[10px] rounded-lg cursor-pointer shrink-0"
            >
              ریست انبار
            </button>
          </div>
        </div>
      </div>

      {/* MODAL: ADD NEW ADMIN USER */}
      {showAddUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-amber-600 text-white p-3.5 flex items-center justify-between">
              <div className="flex items-center gap-1">
                <UserPlus className="w-4 h-4" />
                <h3 className="font-bold text-xs">افزودن ادمین جدید</h3>
              </div>
              <button
                onClick={() => setShowAddUserModal(false)}
                className="text-white/80 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="p-4 space-y-3 text-xs text-right">
              <div>
                <label className="block text-[10px] font-bold text-slate-700 mb-1">نام و نام خانوادگی ادمین:</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="مثلاً: رضا محمدی"
                  className="w-full p-2 bg-slate-50 rounded-lg border border-slate-200 font-medium"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-700 mb-1">شماره موبایل:</label>
                <input
                  type="text"
                  required
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  placeholder="۰۹۱۲..."
                  className="w-full p-2 bg-slate-50 rounded-lg border border-slate-200 font-medium text-center"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-700 mb-1">نام کاربری (برای لاگین):</label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin4"
                  className="w-full p-2 bg-slate-50 rounded-lg border border-slate-200 font-bold dir-ltr text-center"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-700 mb-1">رمز عبور:</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="******"
                  className="w-full p-2 bg-slate-50 rounded-lg border border-slate-200 font-bold dir-ltr text-center"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-700 mb-1">نقش و سطح دسترسی:</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as 'admin' | 'manager')}
                  className="w-full p-2 bg-slate-50 rounded-lg border border-slate-200 font-bold"
                >
                  <option value="admin">ادمین انبار (عادی)</option>
                  <option value="manager">مدیر کل انبار (کامل)</option>
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-1.5">
                <button
                  type="button"
                  onClick={() => setShowAddUserModal(false)}
                  className="px-3 py-1.5 border border-slate-200 rounded-lg text-slate-600 font-bold text-[11px]"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-[11px]"
                >
                  ثبت ادمین
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: STRICT FACTORY DELETION CONFIRMATION */}
      {brandToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-sm w-full p-4 space-y-3 shadow-2xl border border-rose-200 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="font-bold text-xs text-rose-700">حذف کارخانه</span>
              <button
                type="button"
                onClick={() => {
                  setBrandToDelete(null);
                  setTypedConfirmation('');
                  setDeleteBrandError(null);
                }}
                className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
              <p>شما در حال حذف برند <span className="font-black text-rose-600 bg-rose-50 px-1 py-0.5 rounded">«{brandToDelete}»</span> هستید.</p>
              <p className="text-[11px] text-slate-500">کلمه <span className="font-black underline">حذف</span> را جهت تأیید تایپ کنید:</p>

              <input
                type="text"
                value={typedConfirmation}
                onChange={(e) => {
                  setTypedConfirmation(e.target.value);
                  setDeleteBrandError(null);
                }}
                placeholder="تایپ کنید: حذف"
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-center"
                autoFocus
              />

              {deleteBrandError && (
                <div className="text-[10px] text-rose-600 font-bold">{deleteBrandError}</div>
              )}
            </div>

            <div className="pt-2 flex justify-end gap-1.5 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setBrandToDelete(null);
                  setTypedConfirmation('');
                  setDeleteBrandError(null);
                }}
                className="px-3 py-1.5 border border-slate-200 text-slate-600 rounded-lg font-bold"
              >
                انصراف
              </button>
              <button
                type="button"
                disabled={
                  typedConfirmation.trim() !== brandToDelete &&
                  typedConfirmation.trim().toLowerCase() !== 'حذف'
                }
                onClick={() => {
                  if (!currentUser || currentUser.role !== 'manager') return;
                  const trimmed = typedConfirmation.trim();
                  if (trimmed !== brandToDelete && trimmed !== 'حذف') {
                    setDeleteBrandError('لطفاً کلمه حذف را دقیقاً تایپ فرمایید.');
                    return;
                  }
                  const success = deleteBrand(brandToDelete);
                  if (success) {
                    setBrandToDelete(null);
                    setTypedConfirmation('');
                    setDeleteBrandError(null);
                  }
                }}
                className="px-4 py-1.5 bg-rose-600 text-white rounded-lg font-bold disabled:opacity-50"
              >
                تأیید و حذف
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: SECURE FULL RESET / ZEROING CONFIRMATION */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl border border-rose-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-rose-600 text-white p-3.5 flex items-center justify-between">
              <span className="font-bold text-xs">تأییدیه صفر کردن کل سیستم</span>
              <button
                type="button"
                onClick={() => {
                  setShowResetModal(false);
                  setResetError(null);
                }}
                className="text-white hover:bg-rose-700 rounded p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3 text-xs text-right">
              <div className="p-2.5 bg-rose-50 border border-rose-100 text-rose-900 rounded-lg text-[11px]">
                تمام موجودی‌های مس، تراکنش‌ها، فاکتورها و سوابق مالی شرکا کاملاً پاک شده و قابل بازگشت نیست.
              </div>

              {resetError && (
                <div className="text-xs text-rose-600 font-bold">{resetError}</div>
              )}

              <div>
                <label className="block font-bold text-slate-800 mb-1">تایپ کلمه تأیید ("حذف"):</label>
                <input
                  type="text"
                  value={resetConfirmWord}
                  onChange={(e) => {
                    setResetConfirmWord(e.target.value);
                    setResetError(null);
                  }}
                  placeholder="حذف"
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-center"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">رمز عبور مدیر کل انبار:</label>
                <input
                  type="password"
                  value={managerPasswordConfirm}
                  onChange={(e) => {
                    setManagerPasswordConfirm(e.target.value);
                    setResetError(null);
                  }}
                  placeholder="رمز عبور (milad@68)"
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-center"
                />
              </div>
            </div>

            <div className="p-3 bg-slate-50 border-t border-slate-100 flex justify-end gap-1.5">
              <button
                type="button"
                disabled={isResetting}
                onClick={() => {
                  setShowResetModal(false);
                  setResetError(null);
                }}
                className="px-3 py-1.5 border border-slate-200 text-slate-600 rounded-lg font-bold"
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
                className="px-4 py-1.5 bg-rose-600 text-white rounded-lg font-bold disabled:opacity-40"
              >
                {isResetting ? 'در حال ریست...' : 'حذف قطعی کل اطلاعات'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FULLSCREEN MODAL: WEEKLY INVENTORY BACKUP PDF PREVIEW */}
      {showBackupPDFPreview && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 overflow-y-auto backdrop-blur-xs flex flex-col p-4 md:p-6 select-none no-print-element">
          {/* Custom Print & High-Res PDF Style Injection */}
          <style dangerouslySetInnerHTML={{ __html: `
            #backup-pdf-report-print {
              background-color: #ffffff !important;
              color: #0f172a !important;
              font-family: 'Vazirmatn', system-ui, -apple-system, sans-serif !important;
            }
            #backup-pdf-report-print table {
              width: 100% !important;
              border-collapse: collapse !important;
              border: 1px solid #cbd5e1 !important;
            }
            #backup-pdf-report-print th {
              background-color: #f1f5f9 !important;
              color: #0f172a !important;
              border: 1px solid #cbd5e1 !important;
              padding: 6px 8px !important;
              font-weight: bold !important;
            }
            #backup-pdf-report-print td {
              border: 1px solid #e2e8f0 !important;
              padding: 6px 8px !important;
              color: #1e293b !important;
            }
            @media print {
              /* Hide all components on the page */
              body * {
                visibility: hidden !important;
              }
              /* Reveal only our dedicated print section and its children */
              #backup-pdf-report-print, #backup-pdf-report-print * {
                visibility: visible !important;
              }
              #backup-pdf-report-print {
                position: absolute !important;
                left: 0 !important;
                top: 0 !important;
                width: 100% !important;
                display: block !important;
                background: white !important;
                color: black !important;
                padding: 10px !important;
                direction: rtl !important;
              }
              .no-print-element {
                display: none !important;
              }
            }
          `}} />

          {/* Interactive Top Toolbar */}
          <div className="w-full max-w-5xl mx-auto bg-slate-900 text-white p-3 rounded-2xl flex flex-wrap items-center justify-between gap-2.5 mb-4 border border-slate-800 shadow-2xl">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold shrink-0">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-black text-xs">گزارش و پشتیبان‌گیری کل موجودی انبار</h3>
                <p className="text-[10px] text-slate-400">فایل آماده جهت پرینت یا ذخیره مستقیم به فرمت PDF</p>
              </div>
            </div>

            {backupDownloadMsg && (
              <span className="text-emerald-400 text-xs font-bold px-2 py-1 bg-emerald-950/80 rounded-lg border border-emerald-800 animate-in fade-in">
                {backupDownloadMsg}
              </span>
            )}

            <div className="flex items-center flex-wrap gap-2">
              {/* Main PDF Download Button */}
              <button
                type="button"
                onClick={downloadPDF}
                disabled={isGeneratingPDF}
                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-800 text-white text-xs font-black rounded-xl cursor-pointer transition-all shadow-md"
              >
                {isGeneratingPDF ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    <span>در حال آماده‌سازی PDF...</span>
                  </>
                ) : (
                  <>
                    <FileDown className="w-4 h-4" />
                    <span>دانلود فایل PDF</span>
                  </>
                )}
              </button>

              {/* Print Button */}
              <button
                type="button"
                onClick={handlePrintViaFrame}
                className="flex items-center gap-1 px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl cursor-pointer transition-all"
                title="ارسال به چاپگر"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>چاپ سند</span>
              </button>

              {/* Excel / CSV Button */}
              <button
                type="button"
                onClick={downloadCSVBackup}
                className="flex items-center gap-1 px-3 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-xl cursor-pointer transition-all"
                title="دانلود اکسل"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>اکسل (CSV)</span>
              </button>

              {/* HTML Backup Fallback */}
              <button
                type="button"
                onClick={downloadHTMLBackup}
                className="flex items-center gap-1 px-2.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl cursor-pointer transition-all"
                title="دانلود نسخه مستقل HTML"
              >
                <Download className="w-3.5 h-3.5" />
                <span>فایل HTML</span>
              </button>
              
              {/* Close Button */}
              <button
                type="button"
                onClick={() => setShowBackupPDFPreview(false)}
                className="flex items-center gap-1 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl cursor-pointer transition-all"
              >
                <X className="w-4 h-4" />
                <span>بستن</span>
              </button>
            </div>
          </div>

          {/* Printable Document A4 Frame */}
          <div 
            id="backup-pdf-report-print" 
            className="w-full max-w-5xl mx-auto bg-white p-6 md:p-8 rounded-2xl shadow-2xl border border-slate-200 text-right text-slate-850 space-y-6 select-text overflow-x-auto"
            style={{ direction: 'rtl' }}
          >
            {/* Header Document */}
            <div className="border-b-2 border-amber-600 pb-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="space-y-1">
                <h1 className="font-black text-base text-slate-900">گزارش هفتگی و فایل پشتیبان موجودی کل انبار</h1>
                <p className="text-xs text-amber-800 font-bold">مرکز رسمی و انبار توزیع فلزات مس: {profile.name}</p>
                <p className="text-[10px] text-slate-500">شماره تماس: {profile.phone} | آدرس انبار: {profile.address}</p>
              </div>

              <div className="text-left md:text-left text-[11px] text-slate-600 font-bold space-y-1">
                <div>تاریخ تولید گزارش: <span className="font-black text-slate-950">{getPersianDateTimeString()}</span></div>
                <div>بایگانی انبارداری مس (هفتگی)</div>
                <div className="text-[9px] text-slate-400">تسهیم سود ۵۰٪-۵۰٪ شرکا: {p1Name} &amp; {p2Name}</div>
              </div>
            </div>

            {/* Quick KPI Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div className="text-center p-2 bg-white rounded-lg border border-slate-100 shadow-3xs">
                <span className="text-[9px] text-slate-500 font-bold block mb-1">کل وزن مس انبار (کیلوگرم)</span>
                <span className="font-black text-sm text-amber-950">{formatKg(grandTotalWeight)}</span>
              </div>
              <div className="text-center p-2 bg-white rounded-lg border border-slate-100 shadow-3xs">
                <span className="text-[9px] text-slate-500 font-bold block mb-1">پالت‌های مس</span>
                <span className="font-bold text-xs text-slate-800">{formatPersianNumber(totalPallets.length)} پالت <span className="text-[9px] text-slate-400">({formatKg(totalPalletsWeight)})</span></span>
              </div>
              <div className="text-center p-2 bg-white rounded-lg border border-slate-100 shadow-3xs">
                <span className="text-[9px] text-slate-500 font-bold block mb-1">کلاف‌های مس</span>
                <span className="font-bold text-xs text-slate-800">{formatPersianNumber(totalCoils.length)} کلاف <span className="text-[9px] text-slate-400">({formatKg(totalCoilsWeight)})</span></span>
              </div>
              <div className="text-center p-2 bg-white rounded-lg border border-slate-100 shadow-3xs">
                <span className="text-[9px] text-slate-500 font-bold block mb-1">شاخه‌های مس</span>
                <span className="font-bold text-xs text-slate-800">{formatPersianNumber(totalBranchesCount)} شاخه <span className="text-[9px] text-slate-400">({formatKg(totalBranchesWeight)})</span></span>
              </div>
              <div className="text-center p-2 bg-white rounded-lg border border-slate-100 shadow-3xs">
                <span className="text-[9px] text-slate-500 font-bold block mb-1">خرده‌مس و تفکیکی‌ها</span>
                <span className="font-bold text-xs text-slate-800">{formatPersianNumber(totalLoose.length)} ردیف <span className="text-[9px] text-slate-400">({formatKg(totalLooseWeight)})</span></span>
              </div>
            </div>

            {/* SECTION 1: PALLETS */}
            <div className="space-y-2">
              <h2 className="font-black text-xs text-amber-900 border-r-4 border-amber-600 pr-2">۱. جدول پالت‌های مس موجود در انبار</h2>
              {totalPallets.length === 0 ? (
                <p className="text-[11px] text-slate-400 italic">هیچ پالت مس فعالی در انبار وجود ندارد.</p>
              ) : (
                <table className="w-full text-right text-[10px] border-collapse border border-slate-300">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-300 font-bold">
                      <th className="p-2 border border-slate-300">شناسه / کد پالت</th>
                      <th className="p-2 border border-slate-300">کارخانه سازنده</th>
                      <th className="p-2 border border-slate-300">سایز (قطر)</th>
                      <th className="p-2 border border-slate-300">ضخامت</th>
                      <th className="p-2 border border-slate-300 text-center">تعداد قرقره</th>
                      <th className="p-2 border border-slate-300">محل استقرار</th>
                      <th className="p-2 border border-slate-300">وضعیت پلمب</th>
                      <th className="p-2 border border-slate-300 text-left">وزن خالص (Kg)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {totalPallets.map((p) => {
                      const pWeight = (p.reels || []).reduce((acc, r) => acc + r.weightKg, 0);
                      return (
                        <tr key={p.id} className="border-b border-slate-200 hover:bg-slate-50">
                          <td className="p-2 font-bold border border-slate-300">{p.palletCode}</td>
                          <td className="p-2 border border-slate-300">{p.brand}</td>
                          <td className="p-2 border border-slate-300">{p.diameter}</td>
                          <td className="p-2 border border-slate-300 font-mono">{p.thickness} mm</td>
                          <td className="p-2 text-center border border-slate-300">{formatPersianNumber(p.reels?.length || 0)} عدد</td>
                          <td className="p-2 border border-slate-300">{p.location || '-'}</td>
                          <td className="p-2 border border-slate-300">
                            {p.status === 'sealed' ? 'پلمب کارخانه' : 'باز شده'}
                          </td>
                          <td className="p-2 font-bold text-left border border-slate-300">{formatPersianNumber(pWeight)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* SECTION 2: STANDALONE REELS */}
            <div className="space-y-2">
              <h2 className="font-black text-xs text-amber-900 border-r-4 border-amber-600 pr-2">۲. جدول قرقره‌های مستقل مس</h2>
              {totalReels.length === 0 ? (
                <p className="text-[11px] text-slate-400 italic">هیچ قرقره تک مجزایی در انبار ثبت نشده است.</p>
              ) : (
                <table className="w-full text-right text-[10px] border-collapse border border-slate-300">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-300 font-bold">
                      <th className="p-2 border border-slate-300">شناسه / کد قرقره</th>
                      <th className="p-2 border border-slate-300">کارخانه سازنده</th>
                      <th className="p-2 border border-slate-300">سایز (قطر)</th>
                      <th className="p-2 border border-slate-300">ضخامت</th>
                      <th className="p-2 border border-slate-300">محل استقرار</th>
                      <th className="p-2 border border-slate-300 text-left">وزن خالص (Kg)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {totalReels.map((r) => (
                      <tr key={r.id} className="border-b border-slate-200 hover:bg-slate-50">
                        <td className="p-2 font-bold border border-slate-300">{r.reelCode}</td>
                        <td className="p-2 border border-slate-300">{r.brand}</td>
                        <td className="p-2 border border-slate-300">{r.diameter}</td>
                        <td className="p-2 border border-slate-300 font-mono">{r.thickness} mm</td>
                        <td className="p-2 border border-slate-300">{r.location || '-'}</td>
                        <td className="p-2 font-bold text-left border border-slate-300">{formatPersianNumber(r.weightKg)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* SECTION 3: COILS */}
            <div className="space-y-2">
              <h2 className="font-black text-xs text-amber-900 border-r-4 border-amber-600 pr-2">۳. جدول کلاف‌های مس موجود</h2>
              {totalCoils.length === 0 ? (
                <p className="text-[11px] text-slate-400 italic">هیچ کلاف مس فیزیکی در انبار یافت نشد.</p>
              ) : (
                <table className="w-full text-right text-[10px] border-collapse border border-slate-300">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-300 font-bold">
                      <th className="p-2 border border-slate-300">شناسه کلاف</th>
                      <th className="p-2 border border-slate-300">برند / کارخانه</th>
                      <th className="p-2 border border-slate-300">سایز (قطر)</th>
                      <th className="p-2 border border-slate-300">ضخامت</th>
                      <th className="p-2 border border-slate-300">متراژ تقریبی</th>
                      <th className="p-2 border border-slate-300">محل قرارگیری</th>
                      <th className="p-2 border border-slate-300 text-left">وزن خالص (Kg)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {totalCoils.map((c) => (
                      <tr key={c.id} className="border-b border-slate-200 hover:bg-slate-50">
                        <td className="p-2 font-bold border border-slate-300">{c.code}</td>
                        <td className="p-2 border border-slate-300">{c.brand}</td>
                        <td className="p-2 border border-slate-300">{c.diameter}</td>
                        <td className="p-2 border border-slate-300 font-mono">{c.thickness} mm</td>
                        <td className="p-2 border border-slate-300">{c.lengthMeters ? `${formatPersianNumber(c.lengthMeters)} متر` : '-'}</td>
                        <td className="p-2 border border-slate-300">{c.location || '-'}</td>
                        <td className="p-2 font-bold text-left border border-slate-300">{formatPersianNumber(c.weightKg)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* SECTION 4: BRANCHES */}
            <div className="space-y-2">
              <h2 className="font-black text-xs text-amber-900 border-r-4 border-amber-600 pr-2">۴. جدول شاخه‌های مس موجود</h2>
              {totalBranches.length === 0 ? (
                <p className="text-[11px] text-slate-400 italic">هیچ شاخه مس فیزیکی در انبار ثبت نشده است.</p>
              ) : (
                <table className="w-full text-right text-[10px] border-collapse border border-slate-300">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-300 font-bold">
                      <th className="p-2 border border-slate-300">شناسه</th>
                      <th className="p-2 border border-slate-300">برند / کارخانه</th>
                      <th className="p-2 border border-slate-300">سایز (قطر)</th>
                      <th className="p-2 border border-slate-300">ضخامت</th>
                      <th className="p-2 border border-slate-300">طول شاخه</th>
                      <th className="p-2 border border-slate-300 text-center">تعداد شاخه</th>
                      <th className="p-2 border border-slate-300">محل قرارگیری</th>
                      <th className="p-2 border border-slate-300 text-left">وزن کل (Kg)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {totalBranches.map((b) => (
                      <tr key={b.id} className="border-b border-slate-200 hover:bg-slate-50">
                        <td className="p-2 font-bold border border-slate-300">{b.code}</td>
                        <td className="p-2 border border-slate-300">{b.brand}</td>
                        <td className="p-2 border border-slate-300">{b.diameter}</td>
                        <td className="p-2 border border-slate-300 font-mono">{b.thickness} mm</td>
                        <td className="p-2 border border-slate-300">{formatPersianNumber(b.lengthMeters)} متری</td>
                        <td className="p-2 text-center border border-slate-300">{formatPersianNumber(b.count)} شاخه</td>
                        <td className="p-2 border border-slate-300">{b.location || '-'}</td>
                        <td className="p-2 font-bold text-left border border-slate-300">{formatPersianNumber(b.totalWeightKg)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* SECTION 5: LOOSE ITEMS */}
            <div className="space-y-2">
              <h2 className="font-black text-xs text-amber-900 border-r-4 border-amber-600 pr-2">۵. جدول خرده‌مس‌ها و کلاف‌های کارگاهی (باز شده)</h2>
              {totalLoose.length === 0 ? (
                <p className="text-[11px] text-slate-400 italic">هیچ خرده‌مسی در بخش کارگاه موجود نیست.</p>
              ) : (
                <table className="w-full text-right text-[10px] border-collapse border border-slate-300">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-300 font-bold">
                      <th className="p-2 border border-slate-300">کد</th>
                      <th className="p-2 border border-slate-300">برند منبع</th>
                      <th className="p-2 border border-slate-300">سایز (قطر)</th>
                      <th className="p-2 border border-slate-300">ضخامت</th>
                      <th className="p-2 border border-slate-300">شرح و مبدأ بازگشایی</th>
                      <th className="p-2 border border-slate-300 text-left">وزن خالص (Kg)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {totalLoose.map((l) => (
                      <tr key={l.id} className="border-b border-slate-200 hover:bg-slate-50">
                        <td className="p-2 font-bold border border-slate-300">{l.code}</td>
                        <td className="p-2 border border-slate-300">{l.brand}</td>
                        <td className="p-2 border border-slate-300">{l.diameter}</td>
                        <td className="p-2 border border-slate-300 font-mono">{l.thickness} mm</td>
                        <td className="p-2 border border-slate-300">{l.description || '-'}</td>
                        <td className="p-2 font-bold text-left border border-slate-300">{formatPersianNumber(l.weightKg)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Official Audit signatures */}
            <div className="pt-12 grid grid-cols-3 gap-4 text-center text-[10px] text-slate-800">
              <div className="space-y-8">
                <div>تنظیم‌کننده (انباردار):</div>
                <div className="font-bold underline text-slate-900">{currentUser?.fullName || 'مسئول انبار'}</div>
              </div>
              <div className="space-y-8">
                <div>تأییدیه شریک اول:</div>
                <div className="font-bold underline text-slate-900">{p1Name}</div>
              </div>
              <div className="space-y-8">
                <div>تأییدیه شریک دوم:</div>
                <div className="font-bold underline text-slate-900">{p2Name}</div>
              </div>
            </div>

            {/* Footer Legal Disclaimer */}
            <div className="pt-4 border-t border-dashed border-slate-300 text-center text-[9px] text-slate-400">
              سند فوق صرفاً به منظور مطابقت موجودی فیزیکی و پشتیبان‌گیری دوره‌ای سیستم انبارداری صادر گردیده و فاقد ارزش معاملاتی حقوقی می‌باشد.
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
