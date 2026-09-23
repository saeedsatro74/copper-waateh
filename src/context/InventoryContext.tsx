import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { ToastContainer, ToastMessage } from '../components/Toast';
import {
  InventoryState,
  PalletItem,
  ReelItem,
  StandaloneReelItem,
  CoilItem,
  BranchItem,
  LooseItem,
  Transaction,
  Invoice,
  InvoiceLineItem,
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
  isOperationLoading: boolean;
  lastActionDescription: string | null;
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
  unpackCoilToLoose: (coilId: string) => void;
  unpackBranchToLoose: (branchId: string) => void;
  deductFromLooseItem: (looseItemId: string, deductKg: number, notes?: string) => void;
  deductFromReelAndMoveToLoose: (reelId: string, deductKg: number, notes?: string) => void;
  deductFromCoilAndMoveToLoose: (coilId: string, deductKg: number, notes?: string) => void;
  deductFromBranchAndMoveToLoose: (branchId: string, deductKg: number, notes?: string) => void;
  
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
    itemPricesMap?: Record<string, number>,
    cashAmount?: number,
    chequesList?: { amount: number; chequeNumber: string; dueDate: string; bankName: string }[]
  ) => Invoice;
  
  clearCheque: (chequeId: string) => void;
  
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
  deleteConsignment: (consignmentId: string, returnToStock?: boolean) => void;
  clearAllData: () => void;
  
  // Selected items helper for header exit/entry action
  selectedItems: SelectedItemForAction[];
  toggleSelectItem: (item: SelectedItemForAction) => void;
  clearSelectedItems: () => void;

  // Visual Notifications & Alerts
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
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
  const [isOperationLoading, setIsOperationLoading] = useState<boolean>(false);
  const [lastActionDescription, setLastActionDescription] = useState<string | null>(null);
  const [lastCloudSyncTime, setLastCloudSyncTime] = useState<string | null>(null);
  const [cloudSyncError, setCloudSyncError] = useState<string | null>(null);

  // Timestamp of last local modification to prevent stale cloud broadcasts from reverting changes
  const lastLocalMutationTime = useRef<number>(0);
  const cloudSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load previously authenticated user session if valid, otherwise require login (strictly from sessionStorage!)
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        const savedSession = sessionStorage.getItem('COPPER_AUTH_USER_V1');
        if (savedSession) {
          const parsed = JSON.parse(savedSession);
          if (parsed && parsed.id && parsed.username) {
            return parsed;
          }
        }
      } catch (e) {
        console.warn('Failed to parse auth session:', e);
      }
    }
    return null; // Require login screen on new browser/session
  });
  const [selectedItems, setSelectedItems] = useState<SelectedItemForAction[]>([]);

  // Toast Notifications
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Update session storage when currentUser changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        if (currentUser) {
          sessionStorage.setItem('COPPER_AUTH_USER_V1', JSON.stringify(currentUser));
        } else {
          sessionStorage.removeItem('COPPER_AUTH_USER_V1');
        }
      } catch (e) {
        console.warn('SessionStorage save error:', e);
      }
    }
  }, [currentUser]);

  // 10-minute Inactivity Auto-logout
  useEffect(() => {
    if (!currentUser) return;

    let timeoutId: NodeJS.Timeout;

    const resetTimer = () => {
      if (timeoutId) clearTimeout(timeoutId);
      
      // 10 minutes = 10 * 60 * 1000 = 600,000 ms
      timeoutId = setTimeout(() => {
        logout();
        showToast('شما به دلیل ۱۰ دقیقه عدم فعالیت، به صورت خودکار از سیستم خارج شدید.', 'info');
      }, 600000);
    };

    // Set initial timer
    resetTimer();

    // Listen to user activities to reset timer
    const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    activityEvents.forEach((event) => {
      window.addEventListener(event, resetTimer);
    });

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      activityEvents.forEach((event) => {
        window.removeEventListener(event, resetTimer);
      });
    };
  }, [currentUser]);

  // Helper to commit state changes with undo history and immediate local & cloud persistence
  const updatePresentState = (newPresent: InventoryState, actionDescription?: string) => {
    lastLocalMutationTime.current = Date.now();
    
    // 1. Update React state
    setHistory((prev) => ({
      past: [...prev.past, prev.present],
      present: newPresent,
      future: [], // clear redo stack on new action
    }));

    // 2. Immediate LocalStorage commit
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newPresent));
      } catch (e) {
        console.warn('LocalStorage save error:', e);
      }
    }

    // 3. Trigger UI loading & Cloud Push immediately
    setIsOperationLoading(true);
    if (actionDescription) {
      setLastActionDescription(actionDescription);
    }

    const config = getSupabaseConfig();
    if (config.isConfigured) {
      setIsCloudSyncing(true);
      if (cloudSaveTimeoutRef.current) {
        clearTimeout(cloudSaveTimeoutRef.current);
      }
      
      saveRemoteInventory(newPresent).then((res) => {
        if (res.success) {
          setIsCloudConnected(true);
          setLastCloudSyncTime(new Date().toLocaleTimeString('fa-IR'));
          setCloudSyncError(null);
        } else if (res.error) {
          setCloudSyncError(res.error);
        }
      }).catch((err) => {
        setCloudSyncError(err?.message || 'خطا در ذخیره ابری');
      }).finally(() => {
        setTimeout(() => {
          setIsCloudSyncing(false);
          setIsOperationLoading(false);
          setLastActionDescription(null);
        }, 200);
      });
    } else {
      setTimeout(() => {
        setIsOperationLoading(false);
        setLastActionDescription(null);
      }, 200);
    }
  };

  // 1. Synchronize to LocalStorage whenever present changes (safety fallback)
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
    setIsOperationLoading(true);
    setCloudSyncError(null);
    try {
      const res = await saveRemoteInventory(history.present);
      if (res.success) {
        setIsCloudConnected(true);
        setLastCloudSyncTime(new Date().toLocaleTimeString('fa-IR'));
        showToast('اطلاعات با موفقیت در دیتابیس ابری همگام گردید.', 'success');
      } else if (res.error) {
        setCloudSyncError(res.error);
        showToast(`خطای همگام‌سازی ابری: ${res.error}`, 'error');
      }
    } catch (err: any) {
      setCloudSyncError(err.message || 'خطا در همگام‌سازی ابری');
      showToast('خطا در ارتباط با سرور ابری', 'error');
    } finally {
      setIsCloudSyncing(false);
      setIsOperationLoading(false);
    }
  };

  // 3. Reload from Supabase
  const reloadFromCloud = async () => {
    const config = getSupabaseConfig();
    if (!config.isConfigured) return;
    
    // If user made a local modification in the last 4 seconds, don't overwrite with older remote data
    if (Date.now() - lastLocalMutationTime.current < 4000) {
      return;
    }

    setIsCloudSyncing(true);
    setCloudSyncError(null);
    try {
      const remote = await fetchRemoteInventory();
      if (remote.state) {
        // Double check local mutation time before applying
        if (Date.now() - lastLocalMutationTime.current >= 4000) {
          setHistory((prev) => ({
            past: [...prev.past, prev.present],
            present: remote.state as InventoryState,
            future: [],
          }));
          setIsCloudConnected(true);
          setLastCloudSyncTime(remote.updatedAt ? new Date(remote.updatedAt).toLocaleTimeString('fa-IR') : 'هم‌اکنون');
        }
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
            // Protect against overwriting fresh local mutations with stale broadcasts
            if (Date.now() - lastLocalMutationTime.current < 4000) {
              return;
            }

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
    const cleanUsername = (username || '').toLowerCase().trim();
    const cleanPassword = (password || '').trim();

    if (!cleanUsername || !cleanPassword) {
      return null;
    }

    const found = state.users.find(
      (u) => u.username.toLowerCase() === cleanUsername
    );
    if (found) {
      // Must match password strictly
      if (found.password && found.password.trim() === cleanPassword) {
        setCurrentUser(found);
        return found;
      }
    }
    return null;
  };

  const logout = () => {
    setCurrentUser(null);
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('COPPER_AUTH_USER_V1');
      localStorage.removeItem('COPPER_AUTH_USER_V1');
    }
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
      purchaser: pallet.purchaser,
      buyPricePerKg: pallet.buyPricePerKg,
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

    showToast(`پالت ${pallet.palletCode} باز شد و ${pallet.reels.length} قرقره به بخش قرقره‌ها اضافه شد.`, 'success');
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
      purchaser: reel.purchaser,
      buyPricePerKg: reel.buyPricePerKg,
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

    showToast(`قرقره ${reel.reelCode} باز شد و به بخش خورده‌فروشی منتقل گردید.`, 'success');
  };

  const unpackCoilToLoose = (coilId: string) => {
    const coil = state.coils.find((c) => c.id === coilId);
    if (!coil) return;

    const newLooseItem: LooseItem = {
      id: `los-unp-${Date.now()}`,
      code: `LSE-COIL-${coil.code}`,
      brand: coil.brand,
      thickness: coil.thickness,
      diameter: coil.diameter,
      weightKg: coil.weightKg,
      description: `کلاف باز شده ${coil.code} - آماده خورده‌فروشی`,
      originType: 'opened_coil',
      entryDate: getPersianDateString(),
      notes: `انتقال مستقیم از دسته کلاف‌ها به خورده‌فروشی`,
    };

    const newTx: Transaction = {
      id: `trx-${Date.now()}`,
      type: 'reel_unpack',
      title: `انتقال کلاف ${coil.code} به دسته خورده‌فروشی`,
      category: 'coil',
      itemsCount: 1,
      totalWeightKg: coil.weightKg,
      registeredBy: currentUser ? currentUser.fullName : 'مدیر سیستم',
      userRole: currentUser ? (currentUser.role === 'manager' ? 'مدیر' : 'ادمین انبار') : 'مدیر',
      timestamp: getPersianDateTimeString(),
      details: `کلاف کد ${coil.code} به وزن ${coil.weightKg} کیلوگرم به دسته خورده‌فروشی منتقل گردید.`,
    };

    const updatedCoils = state.coils.filter((c) => c.id !== coilId);
    const updatedLoose = [...state.loose, newLooseItem];
    const updatedTransactions = [newTx, ...state.transactions];

    updatePresentState({
      ...state,
      coils: updatedCoils,
      loose: updatedLoose,
      transactions: updatedTransactions,
    });

    showToast(`کلاف ${coil.code} با موفقیت به دسته خورده‌فروشی منتقل شد.`, 'success');
  };

  const unpackBranchToLoose = (branchId: string) => {
    const branch = state.branches.find((b) => b.id === branchId);
    if (!branch) return;

    const newLooseItem: LooseItem = {
      id: `los-unp-${Date.now()}`,
      code: `LSE-BRN-${branch.code}`,
      brand: branch.brand,
      thickness: branch.thickness,
      diameter: branch.diameter,
      weightKg: branch.totalWeightKg,
      description: `شاخه باز شده بندیل ${branch.code} - آماده خورده‌فروشی`,
      originType: 'opened_branch',
      entryDate: getPersianDateString(),
      notes: `انتقال مستقیم از دسته بندیل شاخه‌ها به خورده‌فروشی`,
    };

    const newTx: Transaction = {
      id: `trx-${Date.now()}`,
      type: 'reel_unpack',
      title: `انتقال بندیل شاخه ${branch.code} به دسته خورده‌فروشی`,
      category: 'branch',
      itemsCount: 1,
      totalWeightKg: branch.totalWeightKg,
      registeredBy: currentUser ? currentUser.fullName : 'مدیر سیستم',
      userRole: currentUser ? (currentUser.role === 'manager' ? 'مدیر' : 'ادمین انبار') : 'مدیر',
      timestamp: getPersianDateTimeString(),
      details: `بندیل شاخه کد ${branch.code} به وزن ${branch.totalWeightKg} کیلوگرم به دسته خورده‌فروشی منتقل گردید.`,
    };

    const updatedBranches = state.branches.filter((b) => b.id !== branchId);
    const updatedLoose = [...state.loose, newLooseItem];
    const updatedTransactions = [newTx, ...state.transactions];

    updatePresentState({
      ...state,
      branches: updatedBranches,
      loose: updatedLoose,
      transactions: updatedTransactions,
    });

    showToast(`بندیل شاخه ${branch.code} با موفقیت به دسته خورده‌فروشی منتقل شد.`, 'success');
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

    showToast(`کسر وزن ${deductKg} کیلوگرم از بار خورده با موفقیت ثبت شد.`, 'success');
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

    showToast(`کسر وزن ${deductKg} کیلوگرم ثبت شد و باقیمانده به خورده‌فروشی منتقل گردید.`, 'success');
  };

  const deductFromCoilAndMoveToLoose = (coilId: string, deductKg: number, notes?: string) => {
    const coil = state.coils.find((c) => c.id === coilId);
    if (!coil || deductKg <= 0) return;

    const totalWeight = coil.weightKg;
    const remainingWeight = Math.max(0, totalWeight - deductKg);

    // Remove coil from coils
    const updatedCoils = state.coils.filter((c) => c.id !== coilId);

    let updatedLoose = [...state.loose];
    if (remainingWeight > 0) {
      const newLooseItem: LooseItem = {
        id: `los-unp-${Date.now()}`,
        code: `LSE-${coil.code}`,
        brand: coil.brand,
        thickness: coil.thickness,
        diameter: coil.diameter,
        weightKg: Math.round(remainingWeight * 100) / 100,
        description: `کلاف باز شده ${coil.code} (کاهش ${deductKg} کیلوگرم) - آماده خورده‌فروشی`,
        originType: 'opened_coil',
        entryDate: getPersianDateString(),
        notes: notes || `برداشت ${deductKg} کیلوگرم و انتقال باقیمانده به خورده‌فروشی`,
      };
      updatedLoose.unshift(newLooseItem);
    }

    const newTx: Transaction = {
      id: `trx-${Date.now()}`,
      type: 'reel_unpack',
      title: `برداشت ${deductKg} کیلوگرم از کلاف ${coil.code} و انتقال باقیمانده به خورده‌فروشی`,
      category: 'coil',
      itemsCount: 1,
      totalWeightKg: deductKg,
      registeredBy: currentUser ? currentUser.fullName : 'مدیر سیستم',
      userRole: currentUser ? (currentUser.role === 'manager' ? 'مدیر' : 'ادمین انبار') : 'مدیر',
      timestamp: getPersianDateTimeString(),
      details: `از کلاف ${coil.code} مقدار ${deductKg} کیلوگرم برداشت شد و باقیمانده به وزن ${remainingWeight} کیلوگرم به بخش خورده‌فروشی انتقال یافت.`,
    };

    updatePresentState({
      ...state,
      coils: updatedCoils,
      loose: updatedLoose,
      transactions: [newTx, ...state.transactions],
    });

    showToast(`برداشت ${deductKg} کیلوگرم از کلاف با موفقیت انجام شد و باقیمانده به خورده‌فروشی رفت.`, 'success');
  };

  const deductFromBranchAndMoveToLoose = (branchId: string, deductKg: number, notes?: string) => {
    const branch = state.branches.find((b) => b.id === branchId);
    if (!branch || deductKg <= 0) return;

    const totalWeight = branch.totalWeightKg;
    const remainingWeight = Math.max(0, totalWeight - deductKg);

    // Remove branch from branches
    const updatedBranches = state.branches.filter((b) => b.id !== branchId);

    let updatedLoose = [...state.loose];
    if (remainingWeight > 0) {
      const newLooseItem: LooseItem = {
        id: `los-unp-${Date.now()}`,
        code: `LSE-${branch.code}`,
        brand: branch.brand,
        thickness: branch.thickness,
        diameter: branch.diameter,
        weightKg: Math.round(remainingWeight * 100) / 100,
        description: `بندیل باز شده ${branch.code} (کاهش ${deductKg} کیلوگرم) - آماده خورده‌فروشی`,
        originType: 'opened_branch',
        entryDate: getPersianDateString(),
        notes: notes || `برداشت ${deductKg} کیلوگرم و انتقال باقیمانده به خورده‌فروشی`,
      };
      updatedLoose.unshift(newLooseItem);
    }

    const newTx: Transaction = {
      id: `trx-${Date.now()}`,
      type: 'reel_unpack',
      title: `برداشت ${deductKg} کیلوگرم از بندیل ${branch.code} و انتقال باقیمانده به خورده‌فروشی`,
      category: 'branch',
      itemsCount: 1,
      totalWeightKg: deductKg,
      registeredBy: currentUser ? currentUser.fullName : 'مدیر سیستم',
      userRole: currentUser ? (currentUser.role === 'manager' ? 'مدیر' : 'ادمین انبار') : 'مدیر',
      timestamp: getPersianDateTimeString(),
      details: `از بندیل ${branch.code} مقدار ${deductKg} کیلوگرم برداشت شد و باقیمانده به وزن ${remainingWeight} کیلوگرم به بخش خورده‌فروشی انتقال یافت.`,
    };

    updatePresentState({
      ...state,
      branches: updatedBranches,
      loose: updatedLoose,
      transactions: [newTx, ...state.transactions],
    });

    showToast(`برداشت ${deductKg} کیلوگرم از بندیل با موفقیت انجام شد و باقیمانده به خورده‌فروشی رفت.`, 'success');
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
    const purchaserName = purchaser || data.purchaser || 'حساب مشترک';

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
        buyPricePerKg: pricePerKg || data.buyPricePerKg || 0,
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
        buyPricePerKg: pricePerKg || data.buyPricePerKg || 0,
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
        buyPricePerKg: pricePerKg || data.buyPricePerKg || 0,
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
        buyPricePerKg: pricePerKg || data.buyPricePerKg || 0,
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
        buyPricePerKg: pricePerKg || data.buyPricePerKg || 0,
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
      const newCash = prevCash - purchaseCost;
      accObj.initialCash = newCash;

      const prevCopper = accObj.initialCopperKg || 0;
      accObj.initialCopperKg = prevCopper + addedWeight;

      if (targetAccKey === 'partner1') updatedPartnerInfo.partner1Account = accObj;
      else if (targetAccKey === 'partner2') updatedPartnerInfo.partner2Account = accObj;
      else updatedPartnerInfo.sharedAccount = accObj;

      const newAdj: BalanceAdjustmentRecord = {
        id: `adj-entry-${Date.now()}`,
        targetAccount: targetAccKey,
        accountName: purchaserName,
        assetType: 'cash',
        operation: 'withdraw',
        amount: purchaseCost,
        previousAmount: prevCash,
        newAmount: newCash,
        notes: `کسر خودکار موجودی نقدی بابت خرید و ورود بار ${title} (${addedWeight.toLocaleString('fa-IR')} کیلوگرم با فی هر کیلو ${pricePerKg?.toLocaleString('fa-IR')} تومان)`,
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

    showToast(`ورود کالای جدید به انبار با موفقیت ثبت شد (${supplierName}).`, 'success');
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
    itemPricesMap?: Record<string, number>,
    cashAmount?: number,
    chequesList?: { amount: number; chequeNumber: string; dueDate: string; bankName: string }[]
  ): Invoice => {
    let updatedPallets = [...state.pallets];
    let updatedReels = [...state.reels];
    let updatedCoils = [...state.coils];
    let updatedBranches = [...state.branches];
    let updatedLoose = [...state.loose];

    let totalWeight = 0;
    let totalCalculatedAmount = 0;
    let totalCalculatedCost = 0;
    let totalCalculatedProfit = 0;
    const invoiceLineItems: InvoiceLineItem[] = [];
    const itemSummaries: string[] = [];

    const recentEntryTx = state.transactions.find((t) => t.type === 'entry' && t.pricePerKg && t.pricePerKg > 0);
    const defaultBuyPrice = recentEntryTx?.pricePerKg || 680000;

    const p1Name = state.warehouseProfile.partnerInfo?.partner1Name || 'شریک اول (مدیر ۱)';
    const p2Name = state.warehouseProfile.partnerInfo?.partner2Name || 'شریک دوم (مدیر ۲)';

    const partnerDeductions: Record<
      'partner1' | 'partner2' | 'shared',
      { weightKg: number; amount: number; cost: number; purchaserName: string }
    > = {
      partner1: { weightKg: 0, amount: 0, cost: 0, purchaserName: p1Name },
      partner2: { weightKg: 0, amount: 0, cost: 0, purchaserName: p2Name },
      shared: { weightKg: 0, amount: 0, cost: 0, purchaserName: 'حساب مشترک' },
    };

    // Map subItems per pallet to support multiple selections from same pallet
    const palletSubItemsMap = new Map<string, string[]>();
    const wholePalletIds = new Set<string>();

    itemsToExit.forEach((item, index) => {
      totalWeight += item.weightKg;
      const itemKey = item.subItemId ? `${item.id}-${item.subItemId}` : item.id;
      const itemUnitPrice = itemPricesMap?.[itemKey] ?? item.unitPrice ?? pricePerKg;
      const lineTotal = Math.round(item.weightKg * itemUnitPrice);
      totalCalculatedAmount += lineTotal;

      const itemBuyPrice = (item.buyPricePerKg && item.buyPricePerKg > 0) ? item.buyPricePerKg : defaultBuyPrice;
      const lineCost = Math.round(item.weightKg * itemBuyPrice);
      const lineProfit = lineTotal - lineCost;
      totalCalculatedCost += lineCost;
      totalCalculatedProfit += lineProfit;

      const purchaserName = item.purchaser || 'حساب مشترک';
      let targetAcc: 'partner1' | 'partner2' | 'shared' = 'shared';
      if (purchaserName === p1Name || purchaserName.includes('اول') || purchaserName.includes('مدیر ۱')) {
        targetAcc = 'partner1';
      } else if (purchaserName === p2Name || purchaserName.includes('دوم') || purchaserName.includes('مدیر ۲')) {
        targetAcc = 'partner2';
      } else {
        targetAcc = 'shared';
      }

      partnerDeductions[targetAcc].weightKg += item.weightKg;
      partnerDeductions[targetAcc].amount += lineTotal;
      partnerDeductions[targetAcc].cost += lineCost;

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
        buyPricePerKg: itemBuyPrice,
        totalPrice: lineTotal,
        costPrice: lineCost,
        profit: lineProfit,
        purchaser: purchaserName,
      });

      itemSummaries.push(
        `${item.description} - ${item.brand} (وزن: ${item.weightKg} کیلوگرم ، فی فروش: ${itemUnitPrice.toLocaleString('fa-IR')} تومان ، فی خرید: ${itemBuyPrice.toLocaleString('fa-IR')} تومان ، سود: ${lineProfit.toLocaleString('fa-IR')} تومان)`
      );

      // Categorize items
      if (item.category === 'pallet') {
        if (item.subItemId) {
          const arr = palletSubItemsMap.get(item.id) || [];
          arr.push(item.subItemId);
          palletSubItemsMap.set(item.id, arr);
        } else {
          wholePalletIds.add(item.id);
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

    // Process Pallets with unpack logic
    const remainingPallets: PalletItem[] = [];
    const newStandaloneFromPallets: StandaloneReelItem[] = [];

    updatedPallets.forEach((pallet) => {
      if (wholePalletIds.has(pallet.id)) {
        return;
      }
      if (palletSubItemsMap.has(pallet.id)) {
        const removedSubItemIds = new Set(palletSubItemsMap.get(pallet.id));
        const remainingReels = pallet.reels.filter((r) => !removedSubItemIds.has(r.id));
        
        remainingReels.forEach((r, idx) => {
          newStandaloneFromPallets.push({
            id: `srel-exit-unp-${Date.now()}-${idx}-${Math.floor(Math.random() * 1000)}`,
            reelCode: r.serialNo,
            brand: pallet.brand,
            thickness: pallet.thickness,
            diameter: pallet.diameter,
            weightKg: r.weightKg,
            originPalletCode: pallet.palletCode,
            entryDate: getPersianDateString(),
            location: pallet.location,
            purchaser: pallet.purchaser,
            buyPricePerKg: pallet.buyPricePerKg,
            notes: `باقیمانده از پالت ${pallet.palletCode} پس از خروج قرقره‌ها`,
          });
        });
        return;
      }
      remainingPallets.push(pallet);
    });

    updatedPallets = remainingPallets;
    updatedReels = [...updatedReels, ...newStandaloneFromPallets];

    const invoiceNum =
      customInvoiceNum ||
      `پیش‌فاکتور-۱۴۰۳-${state.invoices.length + 101}`;
    const totalAmount = totalCalculatedAmount;

    let updatedPartnerInfo: PartnerInfo = state.warehouseProfile.partnerInfo
      ? { ...state.warehouseProfile.partnerInfo }
      : {
          partner1Name: p1Name,
          partner2Name: p2Name,
          partner1SharePercent: 50,
          partner2SharePercent: 50,
          partner1Account: { initialCash: 0, initialCopperKg: 0 },
          partner2Account: { initialCash: 0, initialCopperKg: 0 },
          sharedAccount: { initialCash: 0, initialCopperKg: 0 },
        };

    const newAdjustments = [...(state.balanceAdjustments || [])];
    const totalChequesAmount = chequesList ? chequesList.reduce((s, ch) => s + ch.amount, 0) : 0;
    const actualCashPaid = Math.max(0, totalAmount - totalChequesAmount);
    const cashRatio = totalAmount > 0 ? (actualCashPaid / totalAmount) : 1;

    // Deduct weight and add immediate cash portion to each owner's account
    (['partner1', 'partner2', 'shared'] as const).forEach((accKey) => {
      const ded = partnerDeductions[accKey];
      if (ded.weightKg > 0 || ded.amount > 0) {
        const accField =
          accKey === 'partner1'
            ? 'partner1Account'
            : accKey === 'partner2'
            ? 'partner2Account'
            : 'sharedAccount';

        const currentAcc = { ...(updatedPartnerInfo[accField] || { initialCash: 0, initialCopperKg: 0 }) };
        const prevCash = currentAcc.initialCash || 0;
        
        // Only deposit the actual immediate cash portion
        const cashDepositAmount = Math.round(ded.amount * cashRatio);
        const newCash = prevCash + cashDepositAmount;
        currentAcc.initialCash = newCash;

        const prevCopper = currentAcc.initialCopperKg || 0;
        const newCopper = Math.max(0, prevCopper - ded.weightKg);
        currentAcc.initialCopperKg = newCopper;

        updatedPartnerInfo[accField] = currentAcc;

        // Add deposit balance adjustment record
        newAdjustments.unshift({
          id: `adj-exit-${Date.now()}-${accKey}`,
          targetAccount: accKey,
          accountName: ded.purchaserName,
          assetType: 'cash',
          operation: 'deposit',
          amount: cashDepositAmount,
          previousAmount: prevCash,
          newAmount: newCash,
          notes: `افزایش نقدی بابت فروش در فاکتور ${invoiceNum} (${ded.weightKg.toLocaleString('fa-IR')} کیلوگرم مس با فی کل، بخش نقدی دریافتی: ${formatToman(cashDepositAmount)}${totalChequesAmount > 0 ? ` و مابقی با چک به مبلغ ${formatToman(ded.amount - cashDepositAmount)}` : ''})`,
          date: getPersianDateString(),
          time: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }),
          registeredBy: currentUser ? currentUser.fullName : 'مدیر سیستم',
        });
      }
    });

    // Create Cheque Records if any
    const newChequeRecords: Cheque[] = [];
    if (chequesList && chequesList.length > 0) {
      // Find the main partner account that sold item(s) to assign the cheque to
      const mainAccKey = (['partner1', 'partner2', 'shared'] as const).find((k) => partnerDeductions[k].amount > 0) || 'shared';
      
      chequesList.forEach((ch, idx) => {
        newChequeRecords.push({
          id: `chq-${Date.now()}-${idx}-${Math.floor(Math.random() * 1000)}`,
          amount: ch.amount,
          chequeNumber: ch.chequeNumber,
          dueDate: ch.dueDate,
          bankName: ch.bankName,
          isCleared: false,
          partnerAccount: mainAccKey,
          invoiceNumber: invoiceNum,
          customerName: customerName || 'مشتری متفرقه',
        });
      });
    }

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
      totalCost: totalCalculatedCost,
      totalProfit: totalCalculatedProfit,
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
      details: `صدور پیش‌فاکتور برای ${customerName} به وزن کل ${totalWeight} کیلوگرم. نقدی: ${formatToman(actualCashPaid)} | چک: ${formatToman(totalChequesAmount)}.`,
      pricePerKg: pricePerKg,
      totalPrice: totalAmount,
      itemSummaries: itemSummaries,
    };

    const finalCheques = [...(state.cheques || []), ...newChequeRecords];

    const nextState = {
      ...state,
      warehouseProfile: {
        ...state.warehouseProfile,
        partnerInfo: updatedPartnerInfo,
      },
      balanceAdjustments: newAdjustments,
      pallets: updatedPallets,
      reels: updatedReels,
      coils: updatedCoils,
      branches: updatedBranches,
      loose: updatedLoose,
      invoices: [newInvoice, ...state.invoices],
      transactions: [newTx, ...state.transactions],
      cheques: finalCheques,
    };

    updatePresentState(nextState);

    // Clear selections
    setSelectedItems([]);

    showToast(`پیش‌فاکتور ${invoiceNum} صادر و از وزن موجودی و حساب با موفقیت کسر گردید.`, 'success');

    // Immediate cloud sync if configured
    const config = getSupabaseConfig();
    if (config.isConfigured) {
      saveRemoteInventory(nextState).catch((err) => {
        console.warn('Error syncing stock exit to Supabase:', err);
      });
    }

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

    showToast(`پیش‌فاکتور ${inv.invoiceNumber} لغو شد و اقلام به انبار بازگشتند.`, 'info');
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

    showToast(`خروج قطعی و فاکتور رسمی ${officialNum} تأیید گردید.`, 'success');
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

    // Map subItems per pallet
    const palletSubItemsMap = new Map<string, string[]>();
    const wholePalletIds = new Set<string>();

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
          const arr = palletSubItemsMap.get(item.id) || [];
          arr.push(item.subItemId);
          palletSubItemsMap.set(item.id, arr);
        } else {
          wholePalletIds.add(item.id);
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

    // Process Pallets that have subItems or whole removals
    const remainingPallets: PalletItem[] = [];
    const newStandaloneFromPallets: StandaloneReelItem[] = [];

    updatedPallets.forEach((pallet) => {
      if (wholePalletIds.has(pallet.id)) {
        return;
      }
      if (palletSubItemsMap.has(pallet.id)) {
        const removedSubItemIds = new Set(palletSubItemsMap.get(pallet.id));
        const remainingReels = pallet.reels.filter((r) => !removedSubItemIds.has(r.id));
        
        // Unpack all remaining reels into standalone reels!
        remainingReels.forEach((r, idx) => {
          newStandaloneFromPallets.push({
            id: `srel-csg-unp-${Date.now()}-${idx}-${Math.floor(Math.random() * 1000)}`,
            reelCode: r.serialNo,
            brand: pallet.brand,
            thickness: pallet.thickness,
            diameter: pallet.diameter,
            weightKg: r.weightKg,
            originPalletCode: pallet.palletCode,
            entryDate: getPersianDateString(),
            location: pallet.location,
            notes: `باقیمانده از پالت ${pallet.palletCode} پس از انتقال قرقره به امانی`,
          });
        });
        return;
      }
      remainingPallets.push(pallet);
    });

    updatedPallets = remainingPallets;
    updatedReels = [...updatedReels, ...newStandaloneFromPallets];

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

    showToast(`تعداد ${items.length} قلم کالا با موفقیت به لیست امانی (${recipientName}) منتقل شد.`, 'success');
  };

  const returnFromConsignment = (consignmentId: string) => {
    const csg = (state.consignments || []).find((c) => c.id === consignmentId);
    if (!csg || csg.status !== 'active') return;

    let updatedPallets = [...state.pallets];
    let updatedReels = [...state.reels];
    let updatedCoils = [...state.coils];
    let updatedBranches = [...state.branches];
    let updatedLoose = [...state.loose];

    // Return to corresponding category
    if (csg.category === 'pallet') {
      const palletCode = (csg.originalItemData as any)?.palletCode || csg.code;
      const isSubItem = Boolean(csg.originalItemData?.subItemId);

      if (isSubItem) {
        const restoredSerialNo =
          csg.originalItemData?.serialNo ||
          (csg.description && csg.description.includes('قرقره')
            ? csg.description.replace(/\(از پالت.*?\)/g, '').replace('قرقره', '').trim()
            : '') ||
          csg.code;

        // Reel that originated from a pallet
        const existingPalletIdx = updatedPallets.findIndex(
          (p) => p.palletCode === palletCode || p.id === csg.originalItemData?.id
        );

        if (existingPalletIdx >= 0) {
          // Pallet still exists! Put reel back into pallet reels
          const targetPallet = updatedPallets[existingPalletIdx];
          const restoredSubItem: ReelItem = {
            id: csg.originalItemData?.subItemId || `rel-${Date.now()}`,
            serialNo: restoredSerialNo,
            weightKg: csg.weightKg,
          };
          updatedPallets[existingPalletIdx] = {
            ...targetPallet,
            status: targetPallet.status || 'opened',
            reels: [restoredSubItem, ...targetPallet.reels],
          };
        } else {
          // Pallet was previously emptied, recreate the pallet with this returned reel
          const newPallet: PalletItem = {
            id: csg.originalItemData?.id || `plt-ret-${Date.now()}`,
            palletCode: palletCode,
            brand: csg.brand,
            thickness: csg.thickness,
            diameter: csg.diameter,
            status: 'opened',
            entryDate: getPersianDateString(),
            location: 'انبار اصلی',
            notes: `بازگشت به پالت از امانی ${csg.recipientName}`,
            reels: [
              {
                id: csg.originalItemData?.subItemId || `rel-${Date.now()}`,
                serialNo: restoredSerialNo,
                weightKg: csg.weightKg,
              },
            ],
          };
          updatedPallets.unshift(newPallet);
        }
      } else {
        // Whole Pallet returned
        const restoredPallet: PalletItem = {
          id: csg.originalItemData?.id || `plt-ret-${Date.now()}`,
          palletCode: csg.code,
          brand: csg.brand,
          thickness: csg.thickness,
          diameter: csg.diameter,
          status: (csg.originalItemData as any)?.status || 'sealed',
          entryDate: getPersianDateString(),
          location: 'انبار اصلی',
          notes: `بازگشت از امانی ${csg.recipientName}`,
          reels: (csg.originalItemData as any)?.reels || [
            {
              id: `rel-${Date.now()}`,
              serialNo: `${csg.code}-1`,
              weightKg: csg.weightKg,
            },
          ],
        };
        updatedPallets.unshift(restoredPallet);
      }
    } else if (csg.category === 'reel') {
      const restoredReel: StandaloneReelItem = {
        id: csg.originalItemData?.id || `srel-csg-ret-${Date.now()}`,
        reelCode: csg.code,
        brand: csg.brand,
        thickness: csg.thickness,
        diameter: csg.diameter,
        weightKg: csg.weightKg,
        originPalletCode: (csg.originalItemData as any)?.originPalletCode || 'امانی',
        entryDate: getPersianDateString(),
        location: 'انبار اصلی',
        notes: `برگشتی از امانی ${csg.recipientName}`,
      };
      updatedReels.unshift(restoredReel);
    } else if (csg.category === 'coil') {
      updatedCoils.unshift({
        id: csg.originalItemData?.id || `coil-csg-ret-${Date.now()}`,
        code: csg.code,
        brand: csg.brand,
        thickness: csg.thickness,
        diameter: csg.diameter,
        weightKg: csg.weightKg,
        entryDate: getPersianDateString(),
        location: 'انبار اصلی',
        notes: `برگشتی از امانی ${csg.recipientName}`,
      });
    } else if (csg.category === 'branch') {
      updatedBranches.unshift({
        id: csg.originalItemData?.id || `brn-csg-ret-${Date.now()}`,
        code: csg.code,
        brand: csg.brand,
        thickness: csg.thickness,
        diameter: csg.diameter,
        lengthMeters: (csg.originalItemData as any)?.lengthMeters || 6,
        count: (csg.originalItemData as any)?.count || 1,
        totalWeightKg: csg.weightKg,
        entryDate: getPersianDateString(),
        location: 'انبار اصلی',
        notes: `برگشتی از امانی ${csg.recipientName}`,
      });
    } else {
      updatedLoose.unshift({
        id: csg.originalItemData?.id || `los-csg-${Date.now()}`,
        code: csg.code || `LSE-RST-${Math.floor(100 + Math.random() * 900)}`,
        brand: csg.brand,
        thickness: csg.thickness,
        diameter: csg.diameter,
        weightKg: csg.weightKg,
        description: `برگشتی از امانی ${csg.recipientName} (کد ${csg.code})`,
        originType: 'direct_entry',
        entryDate: getPersianDateString(),
        notes: `بازگشت به انبار از لیست امانی تحویل‌گیرنده ${csg.recipientName}`,
      });
    }

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
      pallets: updatedPallets,
      reels: updatedReels,
      coils: updatedCoils,
      branches: updatedBranches,
      loose: updatedLoose,
      consignments: updatedConsignments,
      transactions: [newTx, ...state.transactions],
    });

    showToast(`کالای امانی (${csg.code}) با موفقیت به موجودی انبار بازگردانده شد.`, 'success');
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

    showToast(`کالای امانی (${csg.code}) به پیش‌فاکتور فروش ${invNum} تبدیل گردید.`, 'success');

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

    showToast('اطلاعات و درصد شرکا ذخیره گردید.', 'success');
  };

  const adjustPartnerBalance = (
    targetAccount: 'partner1' | 'partner2' | 'shared',
    assetType: 'cash' | 'copper',
    operation: 'deposit' | 'withdraw' | 'set_direct',
    amount: number,
    notes?: string
  ) => {
    const p1Name = state.warehouseProfile.partnerInfo?.partner1Name || 'شریک اول';
    const p2Name = state.warehouseProfile.partnerInfo?.partner2Name || 'شریک دوم';
    const accountName =
      targetAccount === 'partner1'
        ? p1Name
        : targetAccount === 'partner2'
        ? p2Name
        : 'حساب مشترک انبار';

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

  const clearCheque = (chequeId: string) => {
    const targetCheque = (state.cheques || []).find((ch) => ch.id === chequeId);
    if (!targetCheque) return;

    if (targetCheque.isCleared) {
      showToast('این چک قبلاً پاس شده است.', 'info');
      return;
    }

    const updatedCheques = (state.cheques || []).map((ch) => {
      if (ch.id === chequeId) {
        return { ...ch, isCleared: true, clearedAt: getPersianDateString() };
      }
      return ch;
    });

    let updatedPartnerInfo = state.warehouseProfile.partnerInfo
      ? { ...state.warehouseProfile.partnerInfo }
      : undefined;
    
    let newAdjustments = [...(state.balanceAdjustments || [])];

    if (updatedPartnerInfo) {
      const accField =
        targetCheque.partnerAccount === 'partner1'
          ? 'partner1Account'
          : targetCheque.partnerAccount === 'partner2'
          ? 'partner2Account'
          : 'sharedAccount';

      const currentAcc = { ...(updatedPartnerInfo[accField] || { initialCash: 0, initialCopperKg: 0 }) };
      const prevCash = currentAcc.initialCash || 0;
      const newCash = prevCash + targetCheque.amount;
      currentAcc.initialCash = newCash;
      updatedPartnerInfo[accField] = currentAcc;

      // Register adjustment
      newAdjustments.unshift({
        id: `adj-chq-clr-${Date.now()}`,
        targetAccount: targetCheque.partnerAccount,
        accountName: targetCheque.partnerAccount === 'partner1' ? updatedPartnerInfo.partner1Name : targetCheque.partnerAccount === 'partner2' ? updatedPartnerInfo.partner2Name : 'حساب مشترک',
        assetType: 'cash',
        operation: 'deposit',
        amount: targetCheque.amount,
        previousAmount: prevCash,
        newAmount: newCash,
        notes: `وصول و پاس شدن چک شماره ${targetCheque.chequeNumber} بانک ${targetCheque.bankName} مربوط به فاکتور ${targetCheque.invoiceNumber} به مبلغ ${formatToman(targetCheque.amount)}`,
        date: getPersianDateString(),
        time: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }),
        registeredBy: currentUser ? currentUser.fullName : 'مدیر سیستم',
      });
    }

    const newState = {
      ...state,
      warehouseProfile: updatedPartnerInfo
        ? { ...state.warehouseProfile, partnerInfo: updatedPartnerInfo }
        : state.warehouseProfile,
      balanceAdjustments: newAdjustments,
      cheques: updatedCheques,
    };

    updatePresentState(newState);
    showToast(`چک شماره ${targetCheque.chequeNumber} به مبلغ ${formatToman(targetCheque.amount)} با موفقیت پاس گردید و به موجودی نقدی اضافه شد.`, 'success');

    const config = getSupabaseConfig();
    if (config.isConfigured) {
      saveRemoteInventory(newState).catch((err) => {
        console.warn('Error syncing cleared cheque to Supabase:', err);
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
    showToast(`کارخانه جدید «${trimmed}» اضافه شد.`, 'success');
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
    showToast(`کارخانه «${brandName}» حذف شد.`, 'info');
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

    // Explicitly delete from Supabase table if configured to prevent phantom records
    const config = getSupabaseConfig();
    if (config.isConfigured) {
      const client = getSupabaseClient();
      if (client) {
        const tableName = category === 'pallet' ? 'pallets' 
                        : category === 'reel' ? 'reels' 
                        : category === 'coil' ? 'coils' 
                        : category === 'branch' ? 'branches' 
                        : 'loose_items';
        client.from(tableName).delete().eq('id', id).then(({ error }) => {
          if (error) console.warn(`Failed to delete item ${id} from Supabase table ${tableName}:`, error);
        });
      }
    }

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

    showToast(`${itemTitle} با موفقیت از انبار حذف گردید.`, 'info');
  };

  const deleteInvoice = (invoiceId: string) => {
    const config = getSupabaseConfig();
    if (config.isConfigured) {
      const client = getSupabaseClient();
      if (client) {
        client.from('invoices').delete().eq('id', invoiceId).then(({ error }) => {
          if (error) console.warn('Failed to delete invoice from Supabase:', error);
        });
      }
    }

    updatePresentState({
      ...state,
      invoices: state.invoices.filter((inv) => inv.id !== invoiceId),
    });
    showToast('فاکتور مورد نظر حذف گردید.', 'info');
  };

  const deleteTransaction = (transactionId: string) => {
    const config = getSupabaseConfig();
    if (config.isConfigured) {
      const client = getSupabaseClient();
      if (client) {
        client.from('transactions').delete().eq('id', transactionId).then(({ error }) => {
          if (error) console.warn('Failed to delete transaction from Supabase:', error);
        });
      }
    }

    updatePresentState({
      ...state,
      transactions: state.transactions.filter((tx) => tx.id !== transactionId),
    });
    showToast('تراکنش حذف گردید.', 'info');
  };

  const deleteConsignment = (consignmentId: string, returnToStock: boolean = false) => {
    const csg = (state.consignments || []).find((c) => c.id === consignmentId);
    if (!csg) return;

    let updatedPallets = [...state.pallets];
    let updatedReels = [...state.reels];
    let updatedCoils = [...state.coils];
    let updatedBranches = [...state.branches];
    let updatedLoose = [...state.loose];

    if (returnToStock && csg.status === 'active') {
      if (csg.category === 'pallet') {
        const palletCode = (csg.originalItemData as any)?.palletCode || csg.code;
        const isSubItem = Boolean(csg.originalItemData?.subItemId);

        if (isSubItem) {
          const restoredSerialNo =
            csg.originalItemData?.serialNo ||
            (csg.description && csg.description.includes('قرقره')
              ? csg.description.replace(/\(از پالت.*?\)/g, '').replace('قرقره', '').trim()
              : '') ||
            csg.code;

          const existingPalletIdx = updatedPallets.findIndex(
            (p) => p.palletCode === palletCode || p.id === csg.originalItemData?.id
          );

          if (existingPalletIdx >= 0) {
            const targetPallet = updatedPallets[existingPalletIdx];
            const restoredSubItem: ReelItem = {
              id: csg.originalItemData?.subItemId || `rel-${Date.now()}`,
              serialNo: restoredSerialNo,
              weightKg: csg.weightKg,
            };
            updatedPallets[existingPalletIdx] = {
              ...targetPallet,
              status: targetPallet.status || 'opened',
              reels: [restoredSubItem, ...targetPallet.reels],
            };
          } else {
            const newPallet: PalletItem = {
              id: csg.originalItemData?.id || `plt-ret-${Date.now()}`,
              palletCode: palletCode,
              brand: csg.brand,
              thickness: csg.thickness,
              diameter: csg.diameter,
              status: 'opened',
              entryDate: getPersianDateString(),
              location: 'انبار اصلی',
              notes: `بازگشت به پالت از حذف امانی ${csg.recipientName}`,
              reels: [
                {
                  id: csg.originalItemData?.subItemId || `rel-${Date.now()}`,
                  serialNo: restoredSerialNo,
                  weightKg: csg.weightKg,
                },
              ],
            };
            updatedPallets.unshift(newPallet);
          }
        } else {
          const restoredPallet: PalletItem = {
            id: csg.originalItemData?.id || `plt-ret-${Date.now()}`,
            palletCode: csg.code,
            brand: csg.brand,
            thickness: csg.thickness,
            diameter: csg.diameter,
            status: (csg.originalItemData as any)?.status || 'sealed',
            entryDate: getPersianDateString(),
            location: 'انبار اصلی',
            notes: `بازگشت از امانی ${csg.recipientName}`,
            reels: (csg.originalItemData as any)?.reels || [
              {
                id: `rel-${Date.now()}`,
                serialNo: `${csg.code}-1`,
                weightKg: csg.weightKg,
              },
            ],
          };
          updatedPallets.unshift(restoredPallet);
        }
      } else if (csg.category === 'reel') {
        updatedReels.unshift({
          id: csg.originalItemData?.id || `srel-csg-ret-${Date.now()}`,
          reelCode: csg.code,
          brand: csg.brand,
          thickness: csg.thickness,
          diameter: csg.diameter,
          weightKg: csg.weightKg,
          originPalletCode: (csg.originalItemData as any)?.originPalletCode || 'امانی',
          entryDate: getPersianDateString(),
          location: 'انبار اصلی',
          notes: `برگشتی از امانی ${csg.recipientName}`,
        });
      } else if (csg.category === 'coil') {
        updatedCoils.unshift({
          id: csg.originalItemData?.id || `coil-csg-ret-${Date.now()}`,
          code: csg.code,
          brand: csg.brand,
          thickness: csg.thickness,
          diameter: csg.diameter,
          weightKg: csg.weightKg,
          entryDate: getPersianDateString(),
          location: 'انبار اصلی',
          notes: `برگشتی از امانی ${csg.recipientName}`,
        });
      } else if (csg.category === 'branch') {
        updatedBranches.unshift({
          id: csg.originalItemData?.id || `brn-csg-ret-${Date.now()}`,
          code: csg.code,
          brand: csg.brand,
          thickness: csg.thickness,
          diameter: csg.diameter,
          lengthMeters: (csg.originalItemData as any)?.lengthMeters || 6,
          count: (csg.originalItemData as any)?.count || 1,
          totalWeightKg: csg.weightKg,
          entryDate: getPersianDateString(),
          location: 'انبار اصلی',
          notes: `برگشتی از امانی ${csg.recipientName}`,
        });
      } else {
        updatedLoose.unshift({
          id: csg.originalItemData?.id || `los-csg-${Date.now()}`,
          code: csg.code || `LSE-RST-${Math.floor(100 + Math.random() * 900)}`,
          brand: csg.brand,
          thickness: csg.thickness,
          diameter: csg.diameter,
          weightKg: csg.weightKg,
          description: `برگشتی از امانی ${csg.recipientName} (کد ${csg.code})`,
          originType: 'direct_entry',
          entryDate: getPersianDateString(),
          notes: `بازگشت به انبار از لیست امانی تحویل‌گیرنده ${csg.recipientName}`,
        });
      }
    }

    const updatedConsignments = (state.consignments || []).filter((c) => c.id !== consignmentId);

    const newTx: Transaction = {
      id: `trx-${Date.now()}`,
      type: returnToStock ? 'consignment_return' : 'exit',
      title: `حذف رکورد امانی (کد ${csg.code})`,
      category: csg.category,
      itemsCount: 1,
      totalWeightKg: csg.weightKg,
      buyerOrSupplier: csg.recipientName,
      registeredBy: currentUser ? currentUser.fullName : 'مدیر سیستم',
      userRole: currentUser ? (currentUser.role === 'manager' ? 'مدیر' : 'ادمین انبار') : 'مدیر',
      timestamp: getPersianDateTimeString(),
      details: `رکورد امانی کد ${csg.code} مربوط به ${csg.recipientName} به وزن ${csg.weightKg} کیلوگرم از سیستم حذف شد.${returnToStock ? ' (موجودی کالا به انبار بازگردانده شد)' : ''}`,
    };

    // Explicitly delete from Supabase table if configured to prevent phantom records
    const config = getSupabaseConfig();
    if (config.isConfigured) {
      const client = getSupabaseClient();
      if (client) {
        client.from('consignments').delete().eq('id', consignmentId).then(({ error }) => {
          if (error) console.warn('Failed to delete consignment from Supabase table:', error);
        });
      }
    }

    updatePresentState({
      ...state,
      pallets: updatedPallets,
      reels: updatedReels,
      coils: updatedCoils,
      branches: updatedBranches,
      loose: updatedLoose,
      consignments: updatedConsignments,
      transactions: [newTx, ...state.transactions],
    });

    showToast(`رکورد امانی (${csg.code}) با موفقیت حذف گردید.`, 'info');
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

    showToast('کلیه داده‌های انبار پاکسازی گردید.', 'info');

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
        isOperationLoading,
        lastActionDescription,
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
        unpackCoilToLoose,
        unpackBranchToLoose,
        deductFromLooseItem,
        deductFromReelAndMoveToLoose,
        deductFromCoilAndMoveToLoose,
        deductFromBranchAndMoveToLoose,
        addStockEntry,
        processStockExitInvoice,
        clearCheque,
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
        showToast,
      }}
    >
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
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
