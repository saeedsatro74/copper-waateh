export type Brand = string;

export type Thickness = string;

export type Diameter = string;

export type ThicknessUnitMode = 'mm' | 'inch' | 'both';
export type DiameterUnitMode = 'inch' | 'mm' | 'both';

export interface UnitDisplaySettings {
  thicknessUnit: ThicknessUnitMode;
  diameterUnit: DiameterUnitMode;
}

export interface ThicknessOption {
  mm: string;
  inch: string;
  label: string;
  value: string;
}

export interface DiameterOption {
  inchFraction: string;
  mm: string;
  label: string;
  value: string;
}

export const THICKNESS_OPTIONS: ThicknessOption[] = [
  { mm: '0.35', inch: '0.014', label: '0.35 mm', value: '0.35' },
  { mm: '0.40', inch: '0.016', label: '0.40 mm', value: '0.40' },
  { mm: '0.45', inch: '0.018', label: '0.45 mm', value: '0.45' },
  { mm: '0.50', inch: '0.020', label: '0.50 mm', value: '0.50' },
  { mm: '0.635', inch: '0.025', label: '0.635 mm', value: '0.635' },
  { mm: '0.71', inch: '0.028', label: '0.71 mm', value: '0.71' },
  { mm: '0.75', inch: '0.030', label: '0.75 mm', value: '0.75' },
  { mm: '0.81', inch: '0.032', label: '0.81 mm', value: '0.81' },
  { mm: '0.90', inch: '0.035', label: '0.90 mm', value: '0.90' },
  { mm: '1.00', inch: '0.039', label: '1.00 mm', value: '1.00' },
  { mm: '1.24', inch: '0.049', label: '1.24 mm', value: '1.24' },
  { mm: '1.42', inch: '0.050', label: '1.42 mm', value: '1.42' },
  { mm: '1.65', inch: '0.065', label: '1.65 mm', value: '1.65' },
];

export const DIAMETER_OPTIONS: DiameterOption[] = [
  { inchFraction: '3/16"', mm: '4.75', label: '3/16" (۴.۷۵ mm)', value: '3/16"' },
  { inchFraction: '1/4"', mm: '6.65', label: '1/4" (۶.۶۵ mm)', value: '1/4"' },
  { inchFraction: '5/16"', mm: '7.94', label: '5/16" (۷.۹۴ mm)', value: '5/16"' },
  { inchFraction: '3/8"', mm: '9.52', label: '3/8" (۹.۵۲ mm)', value: '3/8"' },
  { inchFraction: '1/2"', mm: '12.70', label: '1/2" (۱۲.۷۰ mm)', value: '1/2"' },
  { inchFraction: '5/8"', mm: '15.87', label: '5/8" (۱۵.۸۷ mm)', value: '5/8"' },
  { inchFraction: '3/4"', mm: '19.05', label: '3/4" (۱۹.۰۵ mm)', value: '3/4"' },
  { inchFraction: '7/8"', mm: '22.22', label: '7/8" (۲۲.۲۲ mm)', value: '7/8"' },
  { inchFraction: '1-1/8"', mm: '28.58', label: '1-1/8" (۲۸.۵۸ mm)', value: '1-1/8"' },
  { inchFraction: '1-3/8"', mm: '34.92', label: '1-3/8" (۳۴.۹۲ mm)', value: '1-3/8"' },
];

export type Category = 'pallet' | 'reel' | 'coil' | 'branch' | 'loose';

export interface ReelItem {
  id: string;
  weightKg: number;
  serialNo: string;
  notes?: string;
}

export interface PalletItem {
  id: string;
  palletCode: string;
  brand: Brand;
  thickness: Thickness;
  diameter: Diameter;
  reels: ReelItem[];
  entryDate: string;
  location: string;
  status: 'sealed' | 'opened';
  purchaser?: string;
  notes?: string;
}

export interface StandaloneReelItem {
  id: string;
  reelCode: string;
  brand: Brand;
  thickness: Thickness;
  diameter: Diameter;
  weightKg: number;
  originPalletCode?: string;
  entryDate: string;
  location: string;
  purchaser?: string;
  notes?: string;
}

export interface CoilItem {
  id: string;
  code: string;
  brand: Brand;
  thickness: Thickness;
  diameter: Diameter;
  lengthMeters?: number;
  weightKg: number;
  entryDate: string;
  location: string;
  purchaser?: string;
  notes?: string;
}

export interface BranchItem {
  id: string;
  code: string;
  brand: Brand;
  thickness: Thickness;
  diameter: Diameter;
  lengthMeters: number;
  count: number;
  totalWeightKg: number;
  entryDate: string;
  location: string;
  purchaser?: string;
  notes?: string;
}

export interface LooseItem {
  id: string;
  code: string;
  brand: Brand;
  thickness: Thickness;
  diameter: Diameter;
  weightKg: number;
  description: string;
  originType: 'opened_reel' | 'direct_entry' | 'coil_piece';
  entryDate: string;
  purchaser?: string;
  notes?: string;
}

export interface User {
  id: string;
  fullName: string;
  username: string;
  password?: string;
  mobile: string;
  role: 'manager' | 'admin';
  createdAt: string;
}

export interface PartnerAccountData {
  initialCash: number; // موجودی نقدی وارد شده (تومان)
  initialCopperKg: number; // موجودی مس وارد شده (کیلوگرم)
  notes?: string;
  lastUpdated?: string;
}

export interface BalanceAdjustmentRecord {
  id: string;
  targetAccount: 'partner1' | 'partner2' | 'shared';
  accountName: string;
  assetType: 'cash' | 'copper'; // پول نقد یا مس
  operation: 'deposit' | 'withdraw' | 'set_direct'; // واریز/افزایش | برداشت/کاهش | تنظیم مستقیم
  amount: number; // مبلغ به تومان یا وزن مس به کیلوگرم
  previousAmount?: number;
  newAmount?: number;
  notes?: string;
  date: string;
  time: string;
  registeredBy: string;
}

export interface PartnerInfo {
  partner1Name: string;
  partner2Name: string;
  partner1SharePercent: number;
  partner2SharePercent: number;
  partner1Account?: PartnerAccountData;
  partner2Account?: PartnerAccountData;
  sharedAccount?: PartnerAccountData;
}

export interface PaymentAllocation {
  paymentMethod: 'cash' | 'card' | 'bank_transfer' | 'cheque' | 'shared_account';
  trackingNumber?: string;
  receiverPartner: 'partner1' | 'partner2' | 'shared' | 'split_50_50' | 'custom_split' | 'manual';
  partner1Amount: number;
  partner2Amount: number;
  sharedAmount: number;
  partner1Percent: number;
  partner2Percent: number;
  notes?: string;
  paidAt?: string;
}

export interface PaymentRecord {
  id: string;
  date: string;
  amount: number;
  partner1Amount: number;
  partner2Amount: number;
  sharedAmount: number;
  paymentMethod: string;
  trackingNumber?: string;
  notes?: string;
}

export interface ConsignmentItem {
  id: string;
  code: string;
  recipientName: string;
  recipientPhone?: string;
  issueDate: string;
  expectedReturnDate?: string;
  category: Category;
  brand: Brand;
  thickness: Thickness;
  diameter: Diameter;
  weightKg: number;
  description: string;
  unitPrice?: number;
  status: 'active' | 'returned' | 'converted_to_sale';
  notes?: string;
  registeredBy: string;
  originalItemData?: SelectedItemForAction;
}

export interface InvoiceLineItem {
  id: string;
  description: string;
  brand: Brand;
  thickness: Thickness;
  diameter: Diameter;
  categoryName: string;
  quantity: number;
  unit: 'کیلوگرم' | 'عدد' | 'شاخه' | 'کلاف' | 'قرقره' | 'پالت';
  weightKg: number;
  unitPrice: number;
  buyPricePerKg?: number;
  totalPrice: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  officialInvoiceNumber?: string;
  date: string;
  officialDate?: string;
  type: 'exit' | 'entry';
  customerName: string;
  customerPhone: string;
  customerAddress?: string;
  sellerName: string;
  sellerPhone: string;
  items: InvoiceLineItem[];
  originalItems?: SelectedItemForAction[];
  totalWeightKg: number;
  totalAmount: number;
  paidAmount?: number;
  remainingAmount?: number;
  paymentsHistory?: PaymentRecord[];
  totalProfit?: number;
  paymentAllocation?: PaymentAllocation;
  notes: string;
  registeredBy: string;
  status: 'proforma' | 'official' | 'cancelled' | 'issued';
  cancelReason?: string;
}

export interface Transaction {
  id: string;
  type: 'entry' | 'exit' | 'pallet_unpack' | 'reel_unpack' | 'consignment_out' | 'consignment_return';
  title: string;
  category: Category;
  itemsCount: number;
  totalWeightKg: number;
  buyerOrSupplier?: string;
  purchaser?: string;
  invoiceNumber?: string;
  registeredBy: string;
  userRole: string;
  timestamp: string;
  details: string;
  pricePerKg?: number;
  buyPricePerKg?: number;
  totalPrice?: number;
  estimatedProfit?: number;
  paymentAllocation?: PaymentAllocation;
  itemSummaries?: string[];
}

export interface SelectedItemForAction {
  id: string;
  category: Category;
  subItemId?: string; // e.g., reel ID inside a pallet
  serialNo?: string;
  palletCode?: string;
  brand: Brand;
  thickness: Thickness;
  diameter: Diameter;
  weightKg: number;
  description: string;
  unitPrice?: number;
  buyPricePerKg?: number;
  lengthMeters?: number;
  count?: number;
  purchaser?: string;
}

export interface WarehouseProfile {
  name: string;
  phone: string;
  address: string;
  managerName: string;
  defaultInvoiceFooter: string;
  unitSettings?: UnitDisplaySettings;
  partnerInfo?: PartnerInfo;
  brands?: string[];
}

export interface InventoryState {
  pallets: PalletItem[];
  reels: StandaloneReelItem[];
  coils: CoilItem[];
  branches: BranchItem[];
  loose: LooseItem[];
  consignments: ConsignmentItem[];
  transactions: Transaction[];
  invoices: Invoice[];
  users: User[];
  warehouseProfile: WarehouseProfile;
  balanceAdjustments?: BalanceAdjustmentRecord[];
}
