import { InventoryState, User } from '../types';
import { getPersianDateString } from '../utils/persian';

export const initialUsers: User[] = [
  {
    id: 'usr-admin',
    fullName: 'مدیر کل سیستم',
    username: 'admin',
    password: 'milad@68',
    mobile: '09120000000',
    role: 'manager',
    createdAt: getPersianDateString(),
  },
];

export const initialInventoryData: InventoryState = {
  users: initialUsers,
  warehouseProfile: {
    name: 'انبار مس واته',
    phone: '۰۲۱-۶۶۸۸۹۹۰۰',
    address: 'تهران - بازار آهن شادآباد - بلوار بهار - پلاک ۱۲',
    managerName: 'مدیر کل سیستم',
    defaultInvoiceFooter: 'بار تحویل داده شده کاملاً طبق مشخصات فوق بوده و مرجوعی فقط تا ۴۸ ساعت با هماهنگی انبار امکان‌پذیر است.',
    unitSettings: {
      thicknessUnit: 'mm',
      diameterUnit: 'inch',
    },
    brands: ['باهنر', 'قائم', 'استریا', 'بابک'],
    partnerInfo: {
      partner1Name: 'شریک اول (مدیر ۱)',
      partner2Name: 'شریک دوم (مدیر ۲)',
      partner1SharePercent: 50,
      partner2SharePercent: 50,
      partner1Account: {
        initialCash: 0,
        initialCopperKg: 0,
        notes: 'موجودی نقدی شریک اول',
        lastUpdated: getPersianDateString(),
      },
      partner2Account: {
        initialCash: 0,
        initialCopperKg: 0,
        notes: 'موجودی نقدی شریک دوم',
        lastUpdated: getPersianDateString(),
      },
      sharedAccount: {
        initialCash: 0,
        initialCopperKg: 0,
        notes: 'حساب مشترک ۵۰-۵۰',
        lastUpdated: getPersianDateString(),
      },
    },
  },
  balanceAdjustments: [],
  pallets: [],
  reels: [],
  coils: [],
  branches: [],
  loose: [],
  consignments: [],
  transactions: [],
  invoices: [],
};
