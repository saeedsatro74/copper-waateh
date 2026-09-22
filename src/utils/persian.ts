/**
 * Utility functions for Persian formatting, numbers, dates, and currency.
 */

// Convert English numbers to Persian digits
export function toPersianDigits(num: number | string | undefined | null): string {
  if (num === undefined || num === null || num === '') return '۰';
  const str = String(num);
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return str.replace(/\d/g, (x) => persianDigits[parseInt(x, 10)]);
}

// Format numbers with commas (e.g. 1,500,000) and convert to Persian digits
export function formatPersianNumber(num: number | string | undefined | null): string {
  if (num === undefined || num === null || num === '') return '۰';
  const val = typeof num === 'string' ? parseFloat(num) : num;
  if (isNaN(val)) return '۰';
  const formatted = val.toLocaleString('fa-IR');
  return formatted;
}

// Format currency in Tomans / Rials with Persian digits
export function formatToman(amount: number): string {
  if (isNaN(amount) || amount === 0) return '۰ تومان';
  return `${amount.toLocaleString('fa-IR')} تومان`;
}

// Format weight in Kg
export function formatKg(weightKg: number): string {
  const rounded = Math.round(weightKg * 100) / 100;
  return `${rounded.toLocaleString('fa-IR')} کیلوگرم`;
}

// Generate current Persian Jalali date string fallback
export function getPersianDateString(): string {
  const date = new Date();
  return new Intl.DateTimeFormat('fa-IR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

// Generate current Persian Jalali date with time
export function getPersianDateTimeString(): string {
  const date = new Date();
  const datePart = new Intl.DateTimeFormat('fa-IR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
  
  const timePart = new Intl.DateTimeFormat('fa-IR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(date);

  return `${datePart} - ${timePart}`;
}

// Generate unique invoice number (e.g. INV-1403-1001)
export function generateInvoiceNumber(existingCount: number = 0): string {
  const prefix = 'پیش‌فاکتور-';
  const date = new Date();
  const yearStr = new Intl.DateTimeFormat('fa-IR-u-nu-latn', { year: 'numeric' }).format(date);
  const num = (existingCount + 101).toString();
  return `${prefix}${yearStr}-${num}`;
}
