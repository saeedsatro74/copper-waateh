import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  InventoryState,
  PalletItem,
  StandaloneReelItem,
  CoilItem,
  BranchItem,
  LooseItem,
  Transaction,
  Invoice,
  User,
  Category,
  SelectedItemForAction,
  WarehouseProfile,
  ConsignmentItem,
  PaymentAllocation,
  PartnerInfo,
  BalanceAdjustmentRecord,
} from '../types';
import { initialInventoryData, initialUsers } from '../data/initialData';
import { getPersianDateString, getPersianDateTimeString, formatToman } from '../utils/persian';
import {
  getSupabaseClient,
  getSupabaseConfig,
  fetchRemoteInventory,
  saveRemoteInventory,
} from '../lib/supabase';

interface InventoryContextType {
  state: InventoryState;
  currentUser: User | null;
  canUndo: boolean;
  canRedo: boolean;
  
  // Cloud & Supabase Sync
  isCloudConnected: boolean;
  isCloudSyncing: boolean;
  lastCloudSyncTime: string | null;
  cloudSyncError: string | null;
  syncNowWithCloud: () => Promise<void>;
  reloadFromCloud: () => Promise<void>;
  
  // Actions
  undo: () => void;
  redo: () => void;
  
  // Auth
  setCurrentUser: (user: User | null) => void;
  login: (username: string, password?: string) => User | null;
  logout: () => void;
  
  // Inventory operations
  unpackPallet: (palletId: string, selectedReelId?: string) => void;
  unpackReelToLoose: (reelId: string) => void;
  deductFromLooseItem: (looseItemId: string, deductKg: number, notes?: string) => void;
  deductFromReelAndMoveToLoose: (reelId: string, deductKg: number, notes?: string) => void;
  
  addStockEntry: (
    type: Category,
    data: any,
    supplierName: string,
    pricePerKg?: number,
    purchaser?: string
  ) => void;
  
  processStockExitInvoice: (
    selectedItems: SelectedItemForAction[],
    customerName: string,
    customerPhone: string,
    customerAddress: string,
    pricePerKg: number,
    notes: string,
    customInvoiceNum?: string,
    itemPricesMap?: Record<string, number>
  ) => Invoice;
  
  cancelInvoiceAndReturnToStock: (invoiceId: string, reason?: string) => void;
  confirmOfficialExitInvoice: (invoiceId: string, allocation?: PaymentAllocation) => void;

  // Consignment Operations
  transferToConsignment: (
    items: SelectedItemForAction[],
    recipientName: string,
    recipientPhone: string,
    expectedReturnDate: string,
    notes: string,
    unitPrice?: number
  ) => void;
  returnFromConsignment: (consignmentId: string) => void;
  convertConsignmentToSale: (consignmentId: string, unitPrice: number, customerPhone?: string) => Invoice;

  // Partner Info & Balances
  updatePartnerInfo: (info: PartnerInfo) => void;
  adjustPartnerBalance: (
    targetAccount: 'partner1' | 'partner2' | 'shared',
    assetType: 'cash' | 'copper',
    operation: 'deposit' | 'withdraw' | 'set_direct',
    amount: number,
    notes?: string
  ) => void;

  // User Management
  addUser: (user: Omit<User, 'id' | 'createdAt'>) => void;
  updateUser: (user: User) => void;
  deleteUser: (userId: string) => void;
  
  // Warehouse Profile & Brands
  updateWarehouseProfile: (profile: WarehouseProfile) => void;
  addBrand: (brandName: string) => void;
  deleteBrand: (brandName: string) => boolean;

  // Deletion & Data Reset
  deleteInventoryItem: (category: Category, id: string) => void;
  deleteInvoice: (invoiceId: string) => void;
  deleteTransaction: (transactionId: string) => void;
  deleteConsignment: (consignmentId: string) => void;
  clearAllData: () => void;
  
  // Selected items helper for header exit/entry action
  selectedItems: SelectedItemForAction[];
  toggleSelectItem: (item: SelectedItemForAction) => void;
  clearSelectedItems: () => void;
}

const InventoryContext = createContext<InventoryContextType | undefined>(undefined);

const LOCAL_STORAGE_KEY = 'COPPER_WAREHOUSE_STATE_V1';

const getInitialState = (): InventoryState => {
  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          // Ensure any lingering sample numbers (100,000,000 / 50,000,000 / 20,000,000) are sanitized
          if (parsed.warehouseProfile?.partnerInfo) {
            const pInfo = parsed.warehouseProfile.partnerInfo;
            if (pInfo.partner1Account?.initialCash === 100000000) pInfo.partner1Account.initialCash = 0;
            if (pInfo.partner2Account?.initialCash === 50000000) pInfo.partner2Account.initialCash = 0;
            if (pInfo.sharedAccount?.initialCash === 20000000) pInfo.sharedAccount.initialCash = 0;
            if (pInfo.partner1Account?.initialCopperKg === 500) pInfo.partner1Account.initialCopperKg = 0;
            if (pInfo.partner2Account?.initialCopperKg === 300) pInfo.partner2Account.initialCopperKg = 0;
            if (pInfo.sharedAccount?.initialCopperKg === 400) pInfo.sharedAccount.initialCopperKg = 0;
          }

          return {
            ...initialInventoryData,
            ...parsed,
          };
        }
      }
    } catch (e) {
      console.warn('Failed to parse cached inventory state:', e);
    }
  }
  return initialInventoryData;
};

export const InventoryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Undo/Redo history state pattern with localStorage cache support
  const [history, setHistory] = useState<{
    past: InventoryState[];
    present: InventoryState;
    future: InventoryState[];
  }>({
    past: [],
    present: getInitialState(),
    future: [],
  });

  // Cloud / Supabase Sync State
  const [isCloudConnected, setIsCloudConnected] = useState<boolean>(false);
  const [isCloudSyncing, setIsCloudSyncing] = useState<boolean>(false);
  const [lastCloudSyncTime, setLastCloudSyncTime] = useState<string | null>(null);
  const [cloudSyncError, setCloudSyncError] = useState<string | null>(null);

  const [currentUser, setCurrentUser] = useState<User | null>(initialUsers[0]); // Default logged in as manager
  const [selectedItems, setSelectedItems] = useState<SelectedItemForAction[]>([]);

  // Helper to commit state changes with undo history
  const updatePresentState = (newPresent: InventoryState) => {
    setHistory((prev) => ({
      past: [...prev.past, prev.present],
      present: newPresent,
      future: [], // clear redo stack on new action
    }));
  };

  // 1. Auto-save to LocalStorage whenever state changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(history.present));
      } catch (e) {
        console.warn('LocalStorage save error:', e);
      }
    }
  }, [history.present]);

  // 2. Manual/Triggered sync to Supabase
  const syncNowWithCloud = async () => {
    const config = getSupabaseConfig();
    if (!config.isConfigured) return;
    setIsCloudSyncing(true);
    setCloudSyncError(null);
    try {
      const res = await saveRemoteInventory(history.present);
      if (res.success) {
        setIsCloudConnected(true);
        setLastCloudSyncTime(new Date().toLocaleTimeString('fa-IR'));
      } else if (res.error) {
        setCloudSyncError(res.error);
      }
    } catch (err: any) {
      setCloudSyncError(err.message || 'خطا در همگام‌سازی ابری');
    } finally {
      setIsCloudSyncing(false);
    }
  };

  // 3. Reload from Supabase
  const reloadFromCloud = async () => {
    const config = getSupabaseConfig();
    if (!config.isConfigured) return;
    setIsCloudSyncing(true);
    setCloudSyncError(null);
    try {
      const remote = await fetchRemoteInventory();
      if (remote.state) {
        updatePresentState(remote.state);
        setIsCloudConnected(true);
        setLastCloudSyncTime(remote.updatedAt ? new Date(remote.updatedAt).toLocaleTimeString('fa-IR') : 'هم‌اکنون');
      } else if (remote.error) {
        setCloudSyncError(remote.error);
      } else {
        // First time cloud initialization - upload local state
        setIsCloudConnected(true);
        await saveRemoteInventory(history.present);
        setLastCloudSyncTime('هم‌اکنون');
      }
    } catch (err: any) {
      setCloudSyncError(err.message || 'خطا در بارگذاری از دیتابیس');
    } finally {
      setIsCloudSyncing(false);
    }
  };

  // 4. Initial load from Supabase and listen to Realtime changes
  useEffect(() => {
    const config = getSupabaseConfig();
    if (!config.isConfigured) {
      setIsCloudConnected(false);
      return;
    }

    reloadFromCloud();

    // Subscribe to Realtime Postgres changes
    const client = getSupabaseClient();
    if (!client) return;

    try {
      const channel = client
        .channel('warehouse_sync_changes')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'warehouse_sync' },
          (payload: any) => {
            if (payload.new && payload.new.data) {
              setHistory((prev) => ({
                past: [...prev.past, prev.present],
                present: payload.new.data as InventoryState,
                future: [],
              }));
              setIsCloudConnected(true);
              setLastCloudSyncTime(new Date().toLocaleTimeString('fa-IR'));
            }
          }
        )
        .subscribe();

      return () => {
        client.removeChannel(channel);
      };
    } catch (err) {
      console.warn('Realtime subscription error:', err);
    }
  }, []);

  // 5. Debounced auto-save to cloud on local changes
  useEffect(() => {
    const config = getSupabaseConfig();
    if (!config.isConfigured) return;

    const timeout = setTimeout(() => {
      saveRemoteInventory(history.present).then((res) => {
        if (res.success) {
          setIsCloudConnected(true);
          setLastCloudSyncTime(new Date().toLocaleTimeString('fa-IR'));
        }
      });
    }, 1500);

    return () => clearTimeout(timeout);
  }, [history.present]);

  const undo = () => {
    setHistory((prev) => {
      if (prev.past.length === 0) return prev;
      const previous = prev.past[prev.past.length - 1];
      const newPast = prev.past.slice(0, prev.past.length - 1);
      return {
        past: newPast,
        present: previous,
        future: [prev.present, ...prev.future],
      };
    });
  };

  const redo = () => {
    setHistory((prev) => {
      if (prev.future.length === 0) return prev;
      const next = prev.future[0];
      const newFuture = prev.future.slice(1);
      return {
        past: [...prev.past, prev.present],
        present: next,
        future: newFuture,
      };
    });
  };

  const canUndo = history.past.length > 0;
  const canRedo = history.future.length > 0;
  const state = history.present;

  // Auth functions
  const login = (username: string, password?: string): User | null => {
    const found = state.users.find(
      (u) => u.username.toLowerCase() === username.toLowerCase().trim()
    );
    if (found) {
      if (!password || found.password === password) {
        setCurrentUser(found);
        return found;
      }
    }
    return null;
  };

  const logout = () => {
    setCurrentUser(null);
  };

  // Toggle item selection for Exit / Issuance
  const toggleSelectItem = (item: SelectedItemForAction) => {
    setSelectedItems((prev) => {
      const exists = prev.some(
        (i) => i.id === item.id && i.subItemId === item.subItemId
      );
      if (exists) {
        return prev.filter(
          (i) => !(i.id === item.id && i.subItemId === item.subItemId)
        );
      } else {
        return [...prev, item];
      }
    });
  };

  const clearSelectedItems = () => {
    setSelectedItems([]);
  };

  // Rule: Unpack Pallet.
  // When a reel inside a pallet is selected/opened, the entire pallet unpacks.
  // All remaining reels from that pallet become standalone reels in the "reels" category!
  const unpackPallet = (palletId: string, selectedReelId?: string) => {
    const pallet = state.pallets.find((p) => p.id === palletId);
    if (!pallet) return;

    // Convert all reels in pallet into standalone reels
    const newStandaloneReels: StandaloneReelItem[] = pallet.reels.map((r, index) => ({
      id: `srel-unp-${Date.now()}-${index}`,
      reelCode: `${r.serialNo}`,
      brand: pallet.brand,
      thickness: pallet.thickness,
      diameter: pallet.diameter,
      weightKg: r.weightKg,
      originPalletCode: pallet.palletCode,
      entryDate: getPersianDateString(),
      location: pallet.location,
      notes: `جدا شده از پالت ${pallet.palletCode}`,
    }));

    // Total weight unpacked
    const totalUnpackedWeight = pallet.reels.reduce((sum, r) => sum + r.weightKg, 0);

    // Create Transaction record
    const newTx: Transaction = {
      id: `trx-${Date.now()}`,
      type: 'pallet_unpack',
      title: `باز کردن پالت ${pallet.palletCode} (${pallet.brand} - ${pallet.thickness} - ${pallet.diameter})`,
      category: 'pallet',
      itemsCount: pallet.reels.length,
      totalWeightKg: totalUnpackedWeight,
      registeredBy: currentUser ? currentUser.fullName : 'مدیر سیستم',
      userRole: currentUser ? (currentUser.role === 'manager' ? 'مدیر' : 'ادمین انبار') : 'مدیر',
      timestamp: getPersianDateTimeString(),
      details: `پالت کد ${pallet.palletCode} باز شد و ${pallet.reels.length} عدد قرقره به وزن مجموع ${totalUnpackedWeight} کیلوگرم به دسته قرقره‌ها منتقل شدند.`,
      itemSummaries: pallet.reels.map(
        (r) => `قرقره ${r.serialNo}: ${r.weightKg} کیلوگرم`
      ),
    };

    // Remove pallet from pallets array, append new reels to reels array
    const updatedPallets = state.pallets.filter((p) => p.id !== palletId);
    const updatedReels = [...state.reels, ...newStandaloneReels];
    const updatedTransactions = [newTx, ...state.transactions];

    updatePresentState({
      ...state,
      pallets: updatedPallets,
      reels: updatedReels,
      transactions: updatedTransactions,
    });
  };

  // Rule: Unpack Reel to Loose (خورده‌فروشی)
  // When a reel in "reels" category is opened for retail, it moves to "loose" category.
  const unpackReelToLoose = (reelId: string) => {
    const reel = state.reels.find((r) => r.id === reelId);
    if (!reel) return;

    const newLooseItem: LooseItem = {
      id: `los-unp-${Date.now()}`,
      code: `LSE-${reel.reelCode}`,
      brand: reel.brand,
      thickness: reel.thickness,
      diameter: reel.diameter,
      weightKg: reel.weightKg,
      description: `قرقره باز شده ${reel.reelCode} - آماده خورده‌فروشی`,
      originType: 'opened_reel',
      entryDate: getPersianDateString(),
      notes: `انتقال مستقیم از دسته قرقره‌ها به خورده‌فروشی`,
    };

    const newTx: Transaction = {
      id: `trx-${Date.now()}`,
      type: 'reel_unpack',
      title: `انتقال قرقره ${reel.reelCode} به دسته خورده‌فروشی`,
      category: 'reel',
      itemsCount: 1,
      totalWeightKg: reel.weightKg,
      registeredBy: currentUser ? currentUser.fullName : 'مدیر سیستم',
      userRole: currentUser ? (currentUser.role === 'manager' ? 'مدیر' : 'ادمین انبار') : 'مدیر',
      timestamp: getPersianDateTimeString(),
      details: `قرقره کد ${reel.reelCode} به وزن ${reel.weightKg} کیلوگرم به دسته خورده‌فروشی منتقل گردید.`,
    };

    const updatedReels = state.reels.filter((r) => r.id !== reelId);
    const updatedLoose = [...state.loose, newLooseItem];
    const updatedTransactions = [newTx, ...state.transactions];

    updatePresentState({
      ...state,
      reels: updatedReels,
      loose: updatedLoose,
      transactions: updatedTransactions,
    });
  };

  // Deduct weight from Loose Item (e.g. deduct 5 kg from loose item)
  const deductFromLooseItem = (looseItemId: string, deductKg: number, notes?: string) => {
    const looseItem = state.loose.find((l) => l.id === looseItemId);
    if (!looseItem || deductKg <= 0) return;

    const currentWeight = looseItem.weightKg;
    const remainingWeight = Math.max(0, currentWeight - deductKg);

    let updatedLoose: LooseItem[];
    if (remainingWeight <= 0) {
      updatedLoose = state.loose.filter((l) => l.id !== looseItemId);
    } else {
      updatedLoose = state.loose.map((l) =>
        l.id === looseItemId ? { ...l, weightKg: Math.round(remainingWeight * 100) / 100 } : l
      );
    }

    const newTx: Transaction = {
      id: `trx-${Date.now()}`,
      type: 'exit',
      title: `کسر/برداشت ${deductKg} کیلوگرم از بار خورده ${looseItem.code}`,
      category: 'loose',
      itemsCount: 1,
      totalWeightKg: deductKg,
      registeredBy: currentUser ? currentUser.fullName : 'مدیر سیستم',
      userRole: currentUser ? (currentUser.role === 'manager' ? 'مدیر' : 'ادمین انبار') : 'مدیر',
      timestamp: getPersianDateTimeString(),
      details: `از بار خورده ${looseItem.code} مقدار ${deductKg} کیلوگرم کسر شد. وزن قبلی: ${currentWeight} کیلوگرم، وزن باقیمانده: ${remainingWeight} کیلوگرم. ${notes ? `توضیحات: ${notes}` : ''}`,
    };

    updatePresentState({
      ...state,
      loose: updatedLoose,
      transactions: [newTx, ...state.transactions],
    });
  };

  // Deduct weight/meters from Reel & automatically move remaining reel to Loose
  const deductFromReelAndMoveToLoose = (reelId: string, deductKg: number, notes?: string) => {
    const reel = state.reels.find((r) => r.id === reelId);
    if (!reel || deductKg <= 0) return;

    const totalWeight = reel.weightKg;
    const remainingWeight = Math.max(0, totalWeight - deductKg);

    // Remove reel from standalone reels
    const updatedReels = state.reels.filter((r) => r.id !== reelId);

    let updatedLoose = [...state.loose];
    if (remainingWeight > 0) {
      const newLooseItem: LooseItem = {
        id: `los-unp-${Date.now()}`,
        code: `LSE-${reel.reelCode}`,
        brand: reel.brand,
        thickness: reel.thickness,
        diameter: reel.diameter,
        weightKg: Math.round(remainingWeight * 100) / 100,
        description: `قرقره باز شده ${reel.reelCode} (کاهش ${deductKg} کیلوگرم) - آماده خورده‌فروشی`,
        originType: 'opened_reel',
        entryDate: getPersianDateString(),
        notes: notes || `برداشت ${deductKg} کیلوگرم و انتقال باقیمانده به خورده‌فروشی`,
      };
      updatedLoose.unshift(newLooseItem);
    }

    const newTx: Transaction = {
      id: `trx-${Date.now()}`,
      type: 'reel_unpack',
      title: `برداشت ${deductKg} کیلوگرم از قرقره ${reel.reelCode} و انتقال باقیمانده به خورده‌فروشی`,
      category: 'reel',
      itemsCount: 1,
      totalWeightKg: deductKg,
      registeredBy: currentUser ? currentUser.fullName : 'مدیر سیستم',
      userRole: currentUser ? (currentUser.role === 'manager' ? 'مدیر' : 'ادمین انبار') : 'مدیر',
      timestamp: getPersianDateTimeString(),
      details: `از قرقره کد ${reel.reelCode} (وزن کل: ${totalWeight} کیلوگرم) مقدار ${deductKg} کیلوگرم برداشته شد. باقیمانده (${remainingWeight} کیلوگرم) خودکار به خورده‌فروشی منتقل شد. ${notes ? `توضیحات: ${notes}` : ''}`,
    };

    updatePresentState({
      ...state,
      reels: updatedReels,
      loose: updatedLoose,
      transactions: [newTx, ...state.transactions],
    });
  };

  // Add Stock Entry (ورود جدید به انبار)
  const addStockEntry = (
    type: Category,
    data: any,
    supplierName: string,
    pricePerKg?: number,
    purchaser?: string
  ) => {
    let newPallets = [...state.pallets];
    let newReels = [...state.reels];
    let newCoils = [...state.coils];
    let newBranches = [...state.branches];
    let newLoose = [...state.loose];
    let addedWeight = 0;
    let addedCount = 1;
    let title = '';
    const purchaserName = purchaser || data.purchaser || 'حساب مشترک (۵۰-۵۰)';

    if (type === 'pallet') {
      const pallet: PalletItem = {
        id: `plt-${Date.now()}`,
        palletCode: data.palletCode || `PLT-${data.brand.substring(0, 3).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`,
        brand: data.brand,
        thickness: data.thickness,
        diameter: data.diameter,
        status: 'sealed',
        entryDate: getPersianDateString(),
        location: data.location || 'سالن اصلی',
        reels: data.reels || [],
        notes: data.notes,
        purchaser: purchaserName,
      };
      newPallets.unshift(pallet);
      addedWeight = pallet.reels.reduce((s, r) => s + r.weightKg, 0);
      addedCount = pallet.reels.length;
      title = `ورود پالت ${pallet.palletCode} (${pallet.reels.length} قرقره)`;
    } else if (type === 'reel') {
      const reel: StandaloneReelItem = {
        id: `srel-${Date.now()}`,
        reelCode: data.reelCode || `REEL-${Math.floor(1000 + Math.random() * 9000)}`,
        brand: data.brand,
        thickness: data.thickness,
        diameter: data.diameter,
        weightKg: Number(data.weightKg) || 150,
        entryDate: getPersianDateString(),
        location: data.location || 'انبار قرقره‌ها',
        notes: data.notes,
        purchaser: purchaserName,
      };
      newReels.unshift(reel);
      addedWeight = reel.weightKg;
      title = `ورود قرقره ${reel.reelCode}`;
    } else if (type === 'coil') {
      const coil: CoilItem = {
        id: `coil-${Date.now()}`,
        code: data.code || `CL-${Math.floor(1000 + Math.random() * 9000)}`,
        brand: data.brand,
        thickness: data.thickness,
        diameter: data.diameter,
        weightKg: Number(data.weightKg) || 15,
        entryDate: getPersianDateString(),
        location: data.location || 'انبار کلاف',
        notes: data.notes,
        purchaser: purchaserName,
      };
      newCoils.unshift(coil);
      addedWeight = coil.weightKg;
      title = `ورود کلاف ${coil.code}`;
    } else if (type === 'branch') {
      const branch: BranchItem = {
        id: `brn-${Date.now()}`,
        code: data.code || `BR-${Math.floor(1000 + Math.random() * 9000)}`,
        brand: data.brand,
        thickness: data.thickness,
        diameter: data.diameter,
        lengthMeters: Number(data.lengthMeters) || 6,
        count: Number(data.count) || 10,
        totalWeightKg: Number(data.totalWeightKg) || 50,
        entryDate: getPersianDateString(),
        location: data.location || 'انبار شاخه‌ها',
        notes: data.notes,
        purchaser: purchaserName,
      };
      newBranches.unshift(branch);
      addedWeight = branch.totalWeightKg;
      addedCount = branch.count;
      title = `ورود شاخه ${branch.code} (${branch.count} شاخه)`;
    } else if (type === 'loose') {
      const loose: LooseItem = {
        id: `los-${Date.now()}`,
        code: data.code || `LSE-${Math.floor(1000 + Math.random() * 9000)}`,
        brand: data.brand,
        thickness: data.thickness,
        diameter: data.diameter,
        weightKg: Number(data.weightKg) || 25,
        description: data.description || 'ورود مستقیم بار خورده‌فروشی',
        originType: 'direct_entry',
        entryDate: getPersianDateString(),
        notes: data.notes,
        purchaser: purchaserName,
      };
      newLoose.unshift(loose);
      addedWeight = loose.weightKg;
      title = `ورود بار خورده‌فروشی ${loose.code}`;
    }

    const purchaseCost = (pricePerKg && addedWeight > 0) ? Math.round(pricePerKg * addedWeight) : 0;

    let updatedPartnerInfo: PartnerInfo = state.warehouseProfile.partnerInfo
      ? { ...state.warehouseProfile.partnerInfo }
      : {
          partner1Name: 'شریک اول (مدیر ۱)',
          partner2Name: 'شریک دوم (مدیر ۲)',
          partner1SharePercent: 50,
          partner2SharePercent: 50,
          partner1Account: { initialCash: 0, initialCopperKg: 0 },
          partner2Account: { initialCash: 0, initialCopperKg: 0 },
          sharedAccount: { initialCash: 0, initialCopperKg: 0 },
        };

    let newAdjustments = [...(state.balanceAdjustments || [])];

    if (purchaseCost > 0) {
      const p1Name = updatedPartnerInfo.partner1Name || 'شریک اول (مدیر ۱)';
      const p2Name = updatedPartnerInfo.partner2Name || 'شریک دوم (مدیر ۲)';

      let targetAccKey: 'partner1' | 'partner2' | 'shared' = 'shared';
      if (purchaserName === p1Name || purchaserName.includes('اول') || purchaserName.includes('مدیر ۱')) {
        targetAccKey = 'partner1';
      } else if (purchaserName === p2Name || purchaserName.includes('دوم') || purchaserName.includes('مدیر ۲')) {
        targetAccKey = 'partner2';
      } else {
        targetAccKey = 'shared';
      }

      const accObj =
        targetAccKey === 'partner1'
          ? { ...(updatedPartnerInfo.partner1Account || { initialCash: 0, initialCopperKg: 0 }) }
          : targetAccKey === 'partner2'
          ? { ...(updatedPartnerInfo.partner2Account || { initialCash: 0, initialCopperKg: 0 }) }
          : { ...(updatedPartnerInfo.sharedAccount || { initialCash: 0, initialCopperKg: 0 }) };

      const prevCash = accObj.initialCash || 0;
      const newCash = prevCash + purchaseCost;
      accObj.initialCash = newCash;

      if (targetAccKey === 'partner1') updatedPartnerInfo.partner1Account = accObj;
      else if (targetAccKey === 'partner2') updatedPartnerInfo.partner2Account = accObj;
      else updatedPartnerInfo.sharedAccount = accObj;

      const newAdj: BalanceAdjustmentRecord = {
        id: `adj-entry-${Date.now()}`,
        targetAccount: targetAccKey,
        accountName: purchaserName,
        assetType: 'cash',
        operation: 'deposit',
        amount: purchaseCost,
        previousAmount: prevCash,
        newAmount: newCash,
        notes: `افزایش خودکار موجودی نقدی بابت خرید و ورود بار ${title} (${addedWeight.toLocaleString('fa-IR')} کیلوگرم با فی هر کیلو ${pricePerKg?.toLocaleString('fa-IR')} تومان)`,
        date: getPersianDateString(),
        time: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }),
        registeredBy: currentUser ? currentUser.fullName : 'مدیر سیستم',
      };

      newAdjustments.unshift(newAdj);
    }

    const newTx: Transaction = {
      id: `trx-${Date.now()}`,
      type: 'entry',
      title: title,
      category: type,
      itemsCount: addedCount,
      totalWeightKg: addedWeight,
      buyerOrSupplier: supplierName || 'تامین‌کننده ناشناس',
      registeredBy: currentUser ? currentUser.fullName : 'مدیر سیستم',
      userRole: currentUser ? (currentUser.role === 'manager' ? 'مدیر' : 'ادمین انبار') : 'مدیر',
      timestamp: getPersianDateTimeString(),
      details: `ثبت ورود جدید توسط ${currentUser?.fullName || 'کاربر'} از تامین‌کننده ${supplierName}. خریدار / پرداخت‌کننده: ${purchaserName}.${
        purchaseCost > 0 ? ` مبلغ کل خرید بار: ${formatToman(purchaseCost)} (به موجودی نقدی ${purchaserName} اضافه شد).` : ''
      }`,
      pricePerKg: pricePerKg,
      totalPrice: purchaseCost > 0 ? purchaseCost : undefined,
      purchaser: purchaserName,
    };

    updatePresentState({
      ...state,
      warehouseProfile: {
        ...state.warehouseProfile,
        partnerInfo: updatedPartnerInfo,
      },
      pallets: newPallets,
      reels: newReels,
      coils: newCoils,
      branches: newBranches,
      loose: newLoose,
      transactions: [newTx, ...state.transactions],
      balanceAdjustments: newAdjustments,
    });
  };

  // Process Stock Exit & Issue Proforma Invoice
  const processStockExitInvoice = (
    itemsToExit: SelectedItemForAction[],
    customerName: string,
    customerPhone: string,
    customerAddress: string,
    pricePerKg: number,
    notes: string,
    customInvoiceNum?: string,
    itemPricesMap?: Record<string, number>
  ): Invoice => {
    let updatedPallets = [...state.pallets];
    let updatedReels = [...state.reels];
    let updatedCoils = [...state.coils];
    let updatedBranches = [...state.branches];
    let updatedLoose = [...state.loose];

    let totalWeight = 0;
    let totalCalculatedAmount = 0;
    const invoiceLineItems: any[] = [];
    const itemSummaries: string[] = [];

    itemsToExit.forEach((item, index) => {
      totalWeight += item.weightKg;
      const itemKey = item.subItemId ? `${item.id}-${item.subItemId}` : item.id;
      const itemUnitPrice = itemPricesMap?.[itemKey] ?? item.unitPrice ?? pricePerKg;
      const lineTotal = Math.round(item.weightKg * itemUnitPrice);
      totalCalculatedAmount += lineTotal;

      invoiceLineItems.push({
        id: `li-${Date.now()}-${index}`,
        description: item.description,
        brand: item.brand,
        thickness: item.thickness,
        diameter: item.diameter,
        categoryName:
          item.category === 'pallet'
            ? 'پالت'
            : item.category === 'reel'
            ? 'قرقره'
            : item.category === 'coil'
            ? 'کلاف'
            : item.category === 'branch'
            ? 'شاخه'
            : 'خورده',
        quantity: 1,
        unit: 'کیلوگرم',
        weightKg: item.weightKg,
        unitPrice: itemUnitPrice,
        totalPrice: lineTotal,
      });

      itemSummaries.push(
        `${item.description} - ${item.brand} (وزن: ${item.weightKg} کیلوگرم ، فی: ${itemUnitPrice.toLocaleString('fa-IR')} تومان)`
      );

      // Remove or update items from state
      if (item.category === 'pallet') {
        if (item.subItemId) {
          // A specific reel inside a sealed pallet was issued!
          // Unpack the pallet and remove that reel!
          const pallet = updatedPallets.find((p) => p.id === item.id);
          if (pallet) {
            const remainingReels = pallet.reels.filter((r) => r.id !== item.subItemId);
            // Move remaining reels into standalone reels
            const newStandalone = remainingReels.map((r, i) => ({
              id: `srel-exit-unp-${Date.now()}-${i}`,
              reelCode: r.serialNo,
              brand: pallet.brand,
              thickness: pallet.thickness,
              diameter: pallet.diameter,
              weightKg: r.weightKg,
              originPalletCode: pallet.palletCode,
              entryDate: getPersianDateString(),
              location: pallet.location,
              notes: `باقیمانده از پالت ${pallet.palletCode} پس از خروج یک قرقره`,
            }));
            updatedPallets = updatedPallets.filter((p) => p.id !== item.id);
            updatedReels = [...updatedReels, ...newStandalone];
          }
        } else {
          // Whole pallet issued
          updatedPallets = updatedPallets.filter((p) => p.id !== item.id);
        }
      } else if (item.category === 'reel') {
        updatedReels = updatedReels.filter((r) => r.id !== item.id);
      } else if (item.category === 'coil') {
        updatedCoils = updatedCoils.filter((c) => c.id !== item.id);
      } else if (item.category === 'branch') {
        updatedBranches = updatedBranches.filter((b) => b.id !== item.id);
      } else if (item.category === 'loose') {
        updatedLoose = updatedLoose.filter((l) => l.id !== item.id);
      }
    });

    const invoiceNum =
      customInvoiceNum ||
      `پیش‌فاکتور-۱۴۰۳-${state.invoices.length + 101}`;
    const totalAmount = totalCalculatedAmount;

    const newInvoice: Invoice = {
      id: `inv-${Date.now()}`,
      invoiceNumber: invoiceNum,
      date: getPersianDateString(),
      type: 'exit',
      customerName: customerName || 'مشتری متفرقه',
      customerPhone: customerPhone || '-',
      customerAddress: customerAddress || '-',
      sellerName: state.warehouseProfile.name,
      sellerPhone: state.warehouseProfile.phone,
      items: invoiceLineItems,
      originalItems: itemsToExit,
      totalWeightKg: totalWeight,
      totalAmount: totalAmount,
      notes: notes || state.warehouseProfile.defaultInvoiceFooter,
      registeredBy: currentUser ? currentUser.fullName : 'مدیر سیستم',
      status: 'proforma',
    };

    const newTx: Transaction = {
      id: `trx-${Date.now()}`,
      type: 'exit',
      title: `خروج کالا و صدور پیش‌فاکتور ${invoiceNum}`,
      category: itemsToExit[0]?.category || 'pallet',
      itemsCount: itemsToExit.length,
      totalWeightKg: totalWeight,
      buyerOrSupplier: customerName || 'مشتری متفرقه',
      invoiceNumber: invoiceNum,
      registeredBy: currentUser ? currentUser.fullName : 'مدیر سیستم',
      userRole: currentUser ? (currentUser.role === 'manager' ? 'مدیر' : 'ادمین انبار') : 'مدیر',
      timestamp: getPersianDateTimeString(),
      details: `صدور پیش‌فاکتور برای ${customerName} شامل ${itemsToExit.length} قلم کالا به وزن کل ${totalWeight} کیلوگرم.`,
      pricePerKg: pricePerKg,
      totalPrice: totalAmount,
      itemSummaries: itemSummaries,
    };

    updatePresentState({
      ...state,
      pallets: updatedPallets,
      reels: updatedReels,
      coils: updatedCoils,
      branches: updatedBranches,
      loose: updatedLoose,
      invoices: [newInvoice, ...state.invoices],
      transactions: [newTx, ...state.transactions],
    });

    // Clear selections
    setSelectedItems([]);

    return newInvoice;
  };

  // Cancel Proforma Invoice and Return Items to Stock
  const cancelInvoiceAndReturnToStock = (invoiceId: string, reason?: string) => {
    const inv = state.invoices.find((i) => i.id === invoiceId);
    if (!inv || inv.status === 'cancelled') return;

    let updatedPallets = [...state.pallets];
    let updatedReels = [...state.reels];
    let updatedCoils = [...state.coils];
    let updatedBranches = [...state.branches];
    let updatedLoose = [...state.loose];

    // Restore original items or line items
    if (inv.originalItems && inv.originalItems.length > 0) {
      inv.originalItems.forEach((orig, idx) => {
        if (orig.category === 'reel') {
          const newReel: StandaloneReelItem = {
            id: `srel-rest-${Date.now()}-${idx}`,
            reelCode: `REEL-RST-${Math.floor(100 + Math.random() * 900)}`,
            brand: orig.brand,
            thickness: orig.thickness,
            diameter: orig.diameter,
            weightKg: orig.weightKg,
            entryDate: getPersianDateString(),
            location: 'انبار (برگشتی از پیش‌فاکتور)',
            notes: `برگشت به انبار پس از لغو پیش‌فاکتور ${inv.invoiceNumber}`,
          };
          updatedReels.unshift(newReel);
        } else if (orig.category === 'coil') {
          const newCoil: CoilItem = {
            id: `coil-rest-${Date.now()}-${idx}`,
            code: `CL-RST-${Math.floor(100 + Math.random() * 900)}`,
            brand: orig.brand,
            thickness: orig.thickness,
            diameter: orig.diameter,
            weightKg: orig.weightKg,
            entryDate: getPersianDateString(),
            location: 'انبار کلاف (برگشتی)',
            notes: `برگشت به انبار پس از لغو پیش‌فاکتور ${inv.invoiceNumber}`,
          };
          updatedCoils.unshift(newCoil);
        } else if (orig.category === 'branch') {
          const newBranch: BranchItem = {
            id: `brn-rest-${Date.now()}-${idx}`,
            code: `BR-RST-${Math.floor(100 + Math.random() * 900)}`,
            brand: orig.brand,
            thickness: orig.thickness,
            diameter: orig.diameter,
            lengthMeters: orig.lengthMeters || 6,
            count: orig.count || 10,
            totalWeightKg: orig.weightKg,
            entryDate: getPersianDateString(),
            location: 'انبار شاخه‌ها (برگشتی)',
            notes: `برگشت به انبار پس از لغو پیش‌فاکتور ${inv.invoiceNumber}`,
          };
          updatedBranches.unshift(newBranch);
        } else if (orig.category === 'loose') {
          const newLoose: LooseItem = {
            id: `los-rest-${Date.now()}-${idx}`,
            code: `LSE-RST-${Math.floor(100 + Math.random() * 900)}`,
            brand: orig.brand,
            thickness: orig.thickness,
            diameter: orig.diameter,
            weightKg: orig.weightKg,
            description: `برگشتی از پیش‌فاکتور ${inv.invoiceNumber}`,
            originType: 'direct_entry',
            entryDate: getPersianDateString(),
            notes: `برگشت به انبار پس از لغو پیش‌فاکتور ${inv.invoiceNumber}`,
          };
          updatedLoose.unshift(newLoose);
        } else {
          // Pallet or fallback
          const newLoose: LooseItem = {
            id: `los-rest-${Date.now()}-${idx}`,
            code: `LSE-RST-${Math.floor(100 + Math.random() * 900)}`,
            brand: orig.brand,
            thickness: orig.thickness,
            diameter: orig.diameter,
            weightKg: orig.weightKg,
            description: `برگشتی بار از پیش‌فاکتور ${inv.invoiceNumber}`,
            originType: 'direct_entry',
            entryDate: getPersianDateString(),
            notes: `برگشت به انبار پس از لغو پیش‌فاکتور ${inv.invoiceNumber}`,
          };
          updatedLoose.unshift(newLoose);
        }
      });
    } else {
      // Fallback from line items if originalItems is absent
      inv.items.forEach((line, idx) => {
        const newLoose: LooseItem = {
          id: `los-rest-fb-${Date.now()}-${idx}`,
          code: `LSE-RST-${Math.floor(100 + Math.random() * 900)}`,
          brand: line.brand,
          thickness: line.thickness,
          diameter: line.diameter,
          weightKg: line.weightKg,
          description: line.description || `کالای برگشتی از پیش‌فاکتور ${inv.invoiceNumber}`,
          originType: 'direct_entry',
          entryDate: getPersianDateString(),
          notes: `برگشت به انبار پس از لغو پیش‌فاکتور ${inv.invoiceNumber}`,
        };
        updatedLoose.unshift(newLoose);
      });
    }

    const updatedInvoices = state.invoices.map((i) =>
      i.id === invoiceId
        ? {
            ...i,
            status: 'cancelled' as const,
            cancelReason: reason || 'لغو پیش‌فاکتور و برگشت بار به انبار',
          }
        : i
    );

    const newTx: Transaction = {
      id: `trx-${Date.now()}`,
      type: 'entry',
      title: `لغو پیش‌فاکتور ${inv.invoiceNumber} و برگشت بار به موجودی انبار`,
      category: 'loose',
      itemsCount: inv.items.length,
      totalWeightKg: inv.totalWeightKg,
      buyerOrSupplier: inv.customerName,
      invoiceNumber: inv.invoiceNumber,
      registeredBy: currentUser ? currentUser.fullName : 'مدیر سیستم',
      userRole: currentUser ? (currentUser.role === 'manager' ? 'مدیر' : 'ادمین انبار') : 'مدیر',
      timestamp: getPersianDateTimeString(),
      details: `پیش‌فاکتور شماره ${inv.invoiceNumber} مربوط به مشتری ${inv.customerName} لغو شد و تمام بار به وزن ${inv.totalWeightKg} کیلوگرم خودکار به موجودی انبار بازگردانده شد.`,
    };

    updatePresentState({
      ...state,
      pallets: updatedPallets,
      reels: updatedReels,
      coils: updatedCoils,
      branches: updatedBranches,
      loose: updatedLoose,
      invoices: updatedInvoices,
      transactions: [newTx, ...state.transactions],
    });
  };

  // Confirm Final Exit and Issue Official Invoice
  const confirmOfficialExitInvoice = (invoiceId: string, allocation?: PaymentAllocation) => {
    const inv = state.invoices.find((i) => i.id === invoiceId);
    if (!inv || inv.status === 'official' || inv.status === 'cancelled') return;

    const numOnly = inv.invoiceNumber.replace(/[^0-9]/g, '') || `${Math.floor(100 + Math.random() * 900)}`;
    const officialNum = `فاکتور-رسمی-۱۴۰۳-${numOnly}`;
    const officialDate = getPersianDateString();

    let paidAmt = inv.paidAmount ?? inv.totalAmount;
    let remAmt = 0;

    if (allocation) {
      paidAmt = allocation.partner1Amount + allocation.partner2Amount + allocation.sharedAmount;
      remAmt = Math.max(0, inv.totalAmount - paidAmt);
    }

    let detailsMsg = `پیش‌فاکتور ${inv.invoiceNumber} به فاکتور رسمی خروج قطعی به شماره ${officialNum} تبدیل شد.`;
    if (allocation) {
      const p1Name = state.warehouseProfile.partnerInfo?.partner1Name || 'شریک اول';
      const p2Name = state.warehouseProfile.partnerInfo?.partner2Name || 'شریک دوم';
      const p1Str = allocation.partner1Amount > 0 ? `${p1Name}: ${allocation.partner1Amount.toLocaleString('fa-IR')} تومان` : '';
      const p2Str = allocation.partner2Amount > 0 ? `${p2Name}: ${allocation.partner2Amount.toLocaleString('fa-IR')} تومان` : '';
      const shStr = allocation.sharedAmount > 0 ? `حساب مشترک: ${allocation.sharedAmount.toLocaleString('fa-IR')} تومان` : '';
      detailsMsg += ` واریز وجه: ${[p1Str, p2Str, shStr].filter(Boolean).join(' - ')}. روش تسویه: ${allocation.paymentMethod}. دریافتی: ${paidAmt.toLocaleString('fa-IR')} تومان. مانده بدهی: ${remAmt.toLocaleString('fa-IR')} تومان.`;
    }

    const updatedInvoices = state.invoices.map((i) =>
      i.id === invoiceId
        ? {
            ...i,
            status: 'official' as const,
            officialInvoiceNumber: officialNum,
            officialDate: officialDate,
            paidAmount: paidAmt,
            remainingAmount: remAmt,
            paymentAllocation: allocation || i.paymentAllocation,
          }
        : i
    );

    const newTx: Transaction = {
      id: `trx-${Date.now()}`,
      type: 'exit',
      title: `تایید خروج قطعی کالا و صدور فاکتور رسمی ${officialNum}`,
      category: 'pallet',
      itemsCount: inv.items.length,
      totalWeightKg: inv.totalWeightKg,
      buyerOrSupplier: inv.customerName,
      invoiceNumber: officialNum,
      registeredBy: currentUser ? currentUser.fullName : 'مدیر سیستم',
      userRole: currentUser ? (currentUser.role === 'manager' ? 'مدیر' : 'ادمین انبار') : 'مدیر',
      timestamp: getPersianDateTimeString(),
      details: detailsMsg,
      totalPrice: inv.totalAmount,
      paymentAllocation: allocation,
    };

    updatePresentState({
      ...state,
      invoices: updatedInvoices,
      transactions: [newTx, ...state.transactions],
    });
  };

  // Consignment Operations
  const transferToConsignment = (
    items: SelectedItemForAction[],
    recipientName: string,
    recipientPhone: string,
    expectedReturnDate: string,
    notes: string,
    unitPrice?: number
  ) => {
    if (!items || items.length === 0) return;

    let updatedPallets = [...state.pallets];
    let updatedReels = [...state.reels];
    let updatedCoils = [...state.coils];
    let updatedBranches = [...state.branches];
    let updatedLoose = [...state.loose];
    const newConsignments: ConsignmentItem[] = [];

    items.forEach((item, index) => {
      const code = `AMN-${Date.now().toString().slice(-4)}-${index + 1}`;
      const csgItem: ConsignmentItem = {
        id: `csg-${Date.now()}-${index}`,
        code,
        recipientName,
        recipientPhone,
        issueDate: getPersianDateString(),
        expectedReturnDate: expectedReturnDate || 'تعیین نشده',
        category: item.category,
        brand: item.brand,
        thickness: item.thickness,
        diameter: item.diameter,
        weightKg: item.weightKg,
        description: item.description,
        unitPrice: unitPrice || item.unitPrice || 0,
        status: 'active',
        notes,
        registeredBy: currentUser ? currentUser.fullName : 'مدیر سیستم',
        originalItemData: item,
      };
      newConsignments.push(csgItem);

      if (item.category === 'pallet') {
        if (item.subItemId) {
          updatedPallets = updatedPallets.map((p) => {
            if (p.id === item.id) {
              return { ...p, reels: p.reels.filter((r) => r.id !== item.subItemId) };
            }
            return p;
          });
        } else {
          updatedPallets = updatedPallets.filter((p) => p.id !== item.id);
        }
      } else if (item.category === 'reel') {
        updatedReels = updatedReels.filter((r) => r.id !== item.id);
      } else if (item.category === 'coil') {
        updatedCoils = updatedCoils.filter((c) => c.id !== item.id);
      } else if (item.category === 'branch') {
        updatedBranches = updatedBranches.filter((b) => b.id !== item.id);
      } else if (item.category === 'loose') {
        updatedLoose = updatedLoose.filter((l) => l.id !== item.id);
      }
    });

    const totalWeight = items.reduce((acc, i) => acc + i.weightKg, 0);

    const newTx: Transaction = {
      id: `trx-${Date.now()}`,
      type: 'consignment_out',
      title: `انتقال ${items.length} مورد کالا به لیست امانی (${recipientName})`,
      category: items[0].category,
      itemsCount: items.length,
      totalWeightKg: totalWeight,
      buyerOrSupplier: recipientName,
      registeredBy: currentUser ? currentUser.fullName : 'مدیر سیستم',
      userRole: currentUser ? (currentUser.role === 'manager' ? 'مدیر' : 'ادمین انبار') : 'مدیر',
      timestamp: getPersianDateTimeString(),
      details: `خروج امانی اقلام از انبار به تحویل‌گیرنده: ${recipientName} (${recipientPhone || 'بدون شماره'}). مهلت بازگشت: ${expectedReturnDate || 'تعیین نشده'}. ${notes}`,
    };

    updatePresentState({
      ...state,
      pallets: updatedPallets,
      reels: updatedReels,
      coils: updatedCoils,
      branches: updatedBranches,
      loose: updatedLoose,
      consignments: [...newConsignments, ...(state.consignments || [])],
      transactions: [newTx, ...state.transactions],
    });

    setSelectedItems([]);
  };

  const returnFromConsignment = (consignmentId: string) => {
    const csg = (state.consignments || []).find((c) => c.id === consignmentId);
    if (!csg || csg.status !== 'active') return;

    let updatedLoose = [...state.loose];
    const newLoose: LooseItem = {
      id: `los-csg-${Date.now()}`,
      code: `LSE-RST-${Math.floor(100 + Math.random() * 900)}`,
      brand: csg.brand,
      thickness: csg.thickness,
      diameter: csg.diameter,
      weightKg: csg.weightKg,
      description: `برگشتی از امانی ${csg.recipientName} (کد ${csg.code})`,
      originType: 'direct_entry',
      entryDate: getPersianDateString(),
      notes: `بازگشت به انبار از لیست امانی تحویل‌گیرنده ${csg.recipientName}`,
    };
    updatedLoose.unshift(newLoose);

    const updatedConsignments = (state.consignments || []).map((c) =>
      c.id === consignmentId ? { ...c, status: 'returned' as const } : c
    );

    const newTx: Transaction = {
      id: `trx-${Date.now()}`,
      type: 'consignment_return',
      title: `بازگشت کالای امانی (کد ${csg.code}) به انبار از ${csg.recipientName}`,
      category: csg.category,
      itemsCount: 1,
      totalWeightKg: csg.weightKg,
      buyerOrSupplier: csg.recipientName,
      registeredBy: currentUser ? currentUser.fullName : 'مدیر سیستم',
      userRole: currentUser ? (currentUser.role === 'manager' ? 'مدیر' : 'ادمین انبار') : 'مدیر',
      timestamp: getPersianDateTimeString(),
      details: `کالای امانی کد ${csg.code} تحویلی به ${csg.recipientName} به وزن ${csg.weightKg} کیلوگرم مجدداً به انبار اضافه گردید.`,
    };

    updatePresentState({
      ...state,
      loose: updatedLoose,
      consignments: updatedConsignments,
      transactions: [newTx, ...state.transactions],
    });
  };

  const convertConsignmentToSale = (consignmentId: string, unitPrice: number, customerPhone?: string) => {
    const csg = (state.consignments || []).find((c) => c.id === consignmentId);
    if (!csg) throw new Error('کالای امانی یافت نشد');

    const invNum = `پیش‌فاکتور-۱۴۰۳-${Math.floor(100 + Math.random() * 900)}`;
    const totalAmount = csg.weightKg * unitPrice;

    const lineItem = {
      id: `li-csg-${Date.now()}`,
      description: `${csg.description || csg.brand} (تبدیل از امانی ${csg.code})`,
      brand: csg.brand,
      thickness: csg.thickness,
      diameter: csg.diameter,
      categoryName: csg.category,
      quantity: 1,
      unit: 'کیلوگرم' as const,
      weightKg: csg.weightKg,
      unitPrice,
      totalPrice: totalAmount,
    };

    const newInvoice: Invoice = {
      id: `inv-csg-${Date.now()}`,
      invoiceNumber: invNum,
      date: getPersianDateString(),
      type: 'exit',
      customerName: csg.recipientName,
      customerPhone: customerPhone || csg.recipientPhone || '---',
      sellerName: state.warehouseProfile.name,
      sellerPhone: state.warehouseProfile.phone,
      items: [lineItem],
      totalWeightKg: csg.weightKg,
      totalAmount,
      notes: `تبدیل کالای امانی به فروش قطعی / پیش‌فاکتور (کد امانی ${csg.code})`,
      registeredBy: currentUser ? currentUser.fullName : 'مدیر سیستم',
      status: 'proforma',
    };

    const updatedConsignments = (state.consignments || []).map((c) =>
      c.id === consignmentId ? { ...c, status: 'converted_to_sale' as const } : c
    );

    updatePresentState({
      ...state,
      consignments: updatedConsignments,
      invoices: [newInvoice, ...state.invoices],
    });

    return newInvoice;
  };

  const updatePartnerInfo = (info: PartnerInfo) => {
    updatePresentState({
      ...state,
      warehouseProfile: {
        ...state.warehouseProfile,
        partnerInfo: info,
      },
    });
  };

  const adjustPartnerBalance = (
    targetAccount: 'partner1' | 'partner2' | 'shared',
    assetType: 'cash' | 'copper',
    operation: 'deposit' | 'withdraw' | 'set_direct',
    amount: number,
    notes?: string
  ) => {
    const p1Name = state.warehouseProfile.partnerInfo?.partner1Name || 'شریک اول (مدیر ۱)';
    const p2Name = state.warehouseProfile.partnerInfo?.partner2Name || 'شریک دوم (مدیر ۲)';
    const accountName =
      targetAccount === 'partner1'
        ? p1Name
        : targetAccount === 'partner2'
        ? p2Name
        : 'حساب مشترک انبار (۵۰-۵۰)';

    const currentPartnerInfo: PartnerInfo = state.warehouseProfile.partnerInfo || {
      partner1Name: p1Name,
      partner2Name: p2Name,
      partner1SharePercent: 50,
      partner2SharePercent: 50,
    };

    const targetAccountKey: 'partner1Account' | 'partner2Account' | 'sharedAccount' =
      targetAccount === 'partner1'
        ? 'partner1Account'
        : targetAccount === 'partner2'
        ? 'partner2Account'
        : 'sharedAccount';

    const currentAccData = currentPartnerInfo[targetAccountKey] || {
      initialCash: 0,
      initialCopperKg: 0,
    };

    const prevAmt = assetType === 'cash' ? (currentAccData.initialCash || 0) : (currentAccData.initialCopperKg || 0);
    let newAmt = prevAmt;

    if (operation === 'deposit') {
      newAmt = prevAmt + amount;
    } else if (operation === 'withdraw') {
      newAmt = Math.max(0, prevAmt - amount);
    } else if (operation === 'set_direct') {
      newAmt = amount;
    }

    const updatedAccountData = {
      ...currentAccData,
      [assetType === 'cash' ? 'initialCash' : 'initialCopperKg']: newAmt,
      notes: notes || currentAccData.notes,
      lastUpdated: getPersianDateString(),
    };

    const updatedPartnerInfo: PartnerInfo = {
      ...currentPartnerInfo,
      [targetAccountKey]: updatedAccountData,
    };

    const nowTime = new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });

    const newAdjRecord: BalanceAdjustmentRecord = {
      id: `adj-${Date.now()}`,
      targetAccount,
      accountName,
      assetType,
      operation,
      amount,
      previousAmount: prevAmt,
      newAmount: newAmt,
      notes: notes || '',
      date: getPersianDateString(),
      time: nowTime,
      registeredBy: currentUser ? currentUser.fullName : 'مدیر سیستم',
    };

    const opLabel = operation === 'deposit' ? 'واریز/افزایش' : operation === 'withdraw' ? 'برداشت/کاهش' : 'تنظیم مستقیم';
    const assetLabel = assetType === 'cash' ? 'وجه نقد' : 'موجودی مس';
    const amountLabel = assetType === 'cash' ? `${amount.toLocaleString('fa-IR')} تومان` : `${amount.toLocaleString('fa-IR')} کیلوگرم`;

    const newTx: Transaction = {
      id: `trx-${Date.now()}`,
      type: operation === 'withdraw' ? 'exit' : 'entry',
      title: `${opLabel} ${assetLabel} ${accountName}`,
      category: 'loose',
      itemsCount: 1,
      totalWeightKg: assetType === 'copper' ? amount : 0,
      totalPrice: assetType === 'cash' ? amount : undefined,
      buyerOrSupplier: accountName,
      purchaser: accountName,
      registeredBy: currentUser ? currentUser.fullName : 'مدیر سیستم',
      userRole: currentUser ? (currentUser.role === 'manager' ? 'مدیر' : 'ادمین انبار') : 'مدیر',
      timestamp: getPersianDateTimeString(),
      details: `${opLabel} ${assetLabel} به مقدار ${amountLabel}. موجودی جدید: ${assetType === 'cash' ? newAmt.toLocaleString('fa-IR') + ' تومان' : newAmt.toLocaleString('fa-IR') + ' کیلوگرم'}. ${notes ? `توضیحات: ${notes}` : ''}`,
    };

    updatePresentState({
      ...state,
      warehouseProfile: {
        ...state.warehouseProfile,
        partnerInfo: updatedPartnerInfo,
      },
      balanceAdjustments: [newAdjRecord, ...(state.balanceAdjustments || [])],
      transactions: [newTx, ...state.transactions],
    });
  };

  // User management
  const addUser = (userData: Omit<User, 'id' | 'createdAt'>) => {
    const newUser: User = {
      ...userData,
      id: `usr-${Date.now()}`,
      createdAt: getPersianDateString(),
    };
    const newState = {
      ...state,
      users: [...state.users, newUser],
    };
    updatePresentState(newState);

    // Immediate direct sync to Supabase if connected
    const config = getSupabaseConfig();
    if (config.isConfigured) {
      saveRemoteInventory(newState).catch((err) => {
        console.warn('Error syncing new user to Supabase:', err);
      });
    }
  };

  const updateUser = (updatedUser: User) => {
    const newState = {
      ...state,
      users: state.users.map((u) => (u.id === updatedUser.id ? updatedUser : u)),
    };
    updatePresentState(newState);

    const config = getSupabaseConfig();
    if (config.isConfigured) {
      saveRemoteInventory(newState).catch((err) => {
        console.warn('Error syncing updated user to Supabase:', err);
      });
    }
  };

  const deleteUser = (userId: string) => {
    const newState = {
      ...state,
      users: state.users.filter((u) => u.id !== userId),
    };
    updatePresentState(newState);

    const config = getSupabaseConfig();
    if (config.isConfigured) {
      saveRemoteInventory(newState).catch((err) => {
        console.warn('Error syncing deleted user to Supabase:', err);
      });
    }
  };

  const updateWarehouseProfile = (profile: WarehouseProfile) => {
    updatePresentState({
      ...state,
      warehouseProfile: profile,
    });
  };

  // Dynamic Brands / Factories Management
  const addBrand = (brandName: string) => {
    const trimmed = brandName.trim();
    if (!trimmed) return;
    const currentBrands = state.warehouseProfile.brands || ['باهنر', 'قائم', 'استریا', 'بابک'];
    if (currentBrands.includes(trimmed)) return;
    updatePresentState({
      ...state,
      warehouseProfile: {
        ...state.warehouseProfile,
        brands: [...currentBrands, trimmed],
      },
    });
  };

  const deleteBrand = (brandName: string): boolean => {
    // Strict admin role verification: Only manager can delete factory brands
    if (!currentUser || currentUser.role !== 'manager') {
      alert('خطای دسترسی: فقط مدیر کل سیستم امکان حذف کارخانه‌ها و برندهای تعریف‌شده را دارد.');
      return false;
    }

    const currentBrands = state.warehouseProfile.brands || ['باهنر', 'قائم', 'استریا', 'بابک'];
    updatePresentState({
      ...state,
      warehouseProfile: {
        ...state.warehouseProfile,
        brands: currentBrands.filter((b) => b !== brandName),
      },
    });
    return true;
  };

  // Deletion Operations for Making Corrections
  const deleteInventoryItem = (category: Category, id: string) => {
    let newPallets = [...state.pallets];
    let newReels = [...state.reels];
    let newCoils = [...state.coils];
    let newBranches = [...state.branches];
    let newLoose = [...state.loose];
    let itemTitle = '';

    if (category === 'pallet') {
      const p = newPallets.find((x) => x.id === id);
      itemTitle = p ? `پالت ${p.palletCode}` : 'پالت';
      newPallets = newPallets.filter((x) => x.id !== id);
    } else if (category === 'reel') {
      const r = newReels.find((x) => x.id === id);
      itemTitle = r ? `قرقره ${r.reelCode}` : 'قرقره';
      newReels = newReels.filter((x) => x.id !== id);
    } else if (category === 'coil') {
      const c = newCoils.find((x) => x.id === id);
      itemTitle = c ? `کلاف ${c.code}` : 'کلاف';
      newCoils = newCoils.filter((x) => x.id !== id);
    } else if (category === 'branch') {
      const b = newBranches.find((x) => x.id === id);
      itemTitle = b ? `شاخه ${b.code}` : 'شاخه';
      newBranches = newBranches.filter((x) => x.id !== id);
    } else if (category === 'loose') {
      const l = newLoose.find((x) => x.id === id);
      itemTitle = l ? `بار خورده ${l.code}` : 'بار خورده';
      newLoose = newLoose.filter((x) => x.id !== id);
    }

    setSelectedItems((prev) => prev.filter((it) => it.id !== id));

    updatePresentState({
      ...state,
      pallets: newPallets,
      reels: newReels,
      coils: newCoils,
      branches: newBranches,
      loose: newLoose,
      transactions: [
        {
          id: `trx-${Date.now()}`,
          type: 'exit',
          title: `حذف ${itemTitle} از موجودی انبار`,
          category: category,
          itemsCount: 1,
          totalWeightKg: 0,
          registeredBy: currentUser ? currentUser.fullName : 'مدیر سیستم',
          userRole: currentUser ? (currentUser.role === 'manager' ? 'مدیر' : 'ادمین انبار') : 'مدیر',
          timestamp: getPersianDateTimeString(),
          details: `حذف اصلاحی کالا (${itemTitle}) از موجودی توسط ${currentUser ? currentUser.fullName : 'کاربر'}`,
        },
        ...state.transactions,
      ],
    });
  };

  const deleteInvoice = (invoiceId: string) => {
    updatePresentState({
      ...state,
      invoices: state.invoices.filter((inv) => inv.id !== invoiceId),
    });
  };

  const deleteTransaction = (transactionId: string) => {
    updatePresentState({
      ...state,
      transactions: state.transactions.filter((tx) => tx.id !== transactionId),
    });
  };

  const deleteConsignment = (consignmentId: string) => {
    updatePresentState({
      ...state,
      consignments: (state.consignments || []).filter((c) => c.id !== consignmentId),
    });
  };

  const clearAllData = () => {
    const clearedState: InventoryState = {
      ...state,
      pallets: [],
      reels: [],
      coils: [],
      branches: [],
      loose: [],
      consignments: [],
      transactions: [],
      invoices: [],
      balanceAdjustments: [],
      warehouseProfile: {
        ...state.warehouseProfile,
        partnerInfo: {
          ...(state.warehouseProfile.partnerInfo || {
            partner1Name: 'شریک اول (مدیر ۱)',
            partner2Name: 'شریک دوم (مدیر ۲)',
            partner1SharePercent: 50,
            partner2SharePercent: 50,
          }),
          partner1Account: { initialCash: 0, initialCopperKg: 0, lastUpdated: getPersianDateString() },
          partner2Account: { initialCash: 0, initialCopperKg: 0, lastUpdated: getPersianDateString() },
          sharedAccount: { initialCash: 0, initialCopperKg: 0, lastUpdated: getPersianDateString() },
        },
      },
    };

    updatePresentState(clearedState);
    setSelectedItems([]);

    // Immediately push cleared state to cloud if Supabase is connected
    const config = getSupabaseConfig();
    if (config.isConfigured) {
      saveRemoteInventory(clearedState).catch((err) => {
        console.warn('Error clearing remote cloud state:', err);
      });
    }
  };

  return (
    <InventoryContext.Provider
      value={{
        state,
        currentUser,
        canUndo,
        canRedo,
        isCloudConnected,
        isCloudSyncing,
        lastCloudSyncTime,
        cloudSyncError,
        syncNowWithCloud,
        reloadFromCloud,
        undo,
        redo,
        setCurrentUser,
        login,
        logout,
        unpackPallet,
        unpackReelToLoose,
        deductFromLooseItem,
        deductFromReelAndMoveToLoose,
        addStockEntry,
        processStockExitInvoice,
        cancelInvoiceAndReturnToStock,
        confirmOfficialExitInvoice,
        transferToConsignment,
        returnFromConsignment,
        convertConsignmentToSale,
        updatePartnerInfo,
        adjustPartnerBalance,
        addUser,
        updateUser,
        deleteUser,
        updateWarehouseProfile,
        addBrand,
        deleteBrand,
        deleteInventoryItem,
        deleteInvoice,
        deleteTransaction,
        deleteConsignment,
        clearAllData,
        selectedItems,
        toggleSelectItem,
        clearSelectedItems,
      }}
    >
      {children}
    </InventoryContext.Provider>
  );
};

export const useInventory = () => {
  const context = useContext(InventoryContext);
  if (!context) {
    throw new Error('useInventory must be used within an InventoryProvider');
  }
  return context;
};
