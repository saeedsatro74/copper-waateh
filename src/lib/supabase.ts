import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { InventoryState } from '../types';

const STORAGE_KEY_URL = 'COPPER_SUPABASE_URL';
const STORAGE_KEY_ANON = 'COPPER_SUPABASE_ANON_KEY';

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  isConfigured: boolean;
  source: 'env' | 'custom' | 'none';
}

export function getSupabaseConfig(): SupabaseConfig {
  const envUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim();
  const envKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

  const customUrl = (typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY_URL) || '' : '').trim();
  const customKey = (typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY_ANON) || '' : '').trim();

  if (customUrl && customKey) {
    return {
      url: customUrl,
      anonKey: customKey,
      isConfigured: true,
      source: 'custom',
    };
  }

  if (envUrl && envKey) {
    return {
      url: envUrl,
      anonKey: envKey,
      isConfigured: true,
      source: 'env',
    };
  }

  return {
    url: '',
    anonKey: '',
    isConfigured: false,
    source: 'none',
  };
}

let cachedClient: SupabaseClient | null = null;
let lastClientKey = '';

export function getSupabaseClient(): SupabaseClient | null {
  const config = getSupabaseConfig();
  if (!config.isConfigured) {
    cachedClient = null;
    return null;
  }

  const currentKey = `${config.url}_${config.anonKey}`;
  if (cachedClient && lastClientKey === currentKey) {
    return cachedClient;
  }

  try {
    cachedClient = createClient(config.url, config.anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });
    lastClientKey = currentKey;
    return cachedClient;
  } catch (error) {
    console.error('Failed to initialize Supabase client:', error);
    cachedClient = null;
    return null;
  }
}

export function saveCustomSupabaseConfig(url: string, anonKey: string): void {
  if (typeof window !== 'undefined') {
    if (url.trim() && anonKey.trim()) {
      localStorage.setItem(STORAGE_KEY_URL, url.trim());
      localStorage.setItem(STORAGE_KEY_ANON, anonKey.trim());
    } else {
      localStorage.removeItem(STORAGE_KEY_URL);
      localStorage.removeItem(STORAGE_KEY_ANON);
    }
    cachedClient = null;
    lastClientKey = '';
  }
}

export function clearCustomSupabaseConfig(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_KEY_URL);
    localStorage.removeItem(STORAGE_KEY_ANON);
    cachedClient = null;
    lastClientKey = '';
  }
}

/**
 * Test connectivity to Supabase
 */
export async function testSupabaseConnection(overrideUrl?: string, overrideKey?: string): Promise<{
  success: boolean;
  message: string;
  hasTable?: boolean;
}> {
  try {
    const url = overrideUrl || getSupabaseConfig().url;
    const key = overrideKey || getSupabaseConfig().anonKey;

    if (!url || !key) {
      return { success: false, message: 'آدرس پروژه (URL) و کلید عمومی (Anon Key) وارد نشده است.' };
    }

    const testClient = createClient(url, key);

    // Try reading from warehouse_sync
    const { data, error } = await testClient
      .from('warehouse_sync')
      .select('key, updated_at')
      .limit(1);

    if (error) {
      if (error.code === '42P01' || error.message.includes('relation') || error.message.includes('does not exist')) {
        return {
          success: true,
          hasTable: false,
          message: 'اتصال به سوپابیس با موفقیت برقرار شد، اما جدول warehouse_sync هنوز ایجاد نشده است. لطفاً اسکریپت SQL را در پنل سوپابیس اجرا فرمایید.',
        };
      }
      return {
        success: false,
        message: `خطای اتصال سوپابیس: ${error.message}`,
      };
    }

    return {
      success: true,
      hasTable: true,
      message: 'اتصال به دیتابیس سوپابیس و جدول همگام‌سازی با موفقیت برقرار و آماده به کار است.',
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.message || 'خطا در برقراری ارتباط با سوپابیس.',
    };
  }
}

/**
 * Fetch remote state from Supabase
 */
export async function fetchRemoteInventory(): Promise<{
  state: InventoryState | null;
  updatedAt?: string;
  error?: string;
}> {
  const client = getSupabaseClient();
  if (!client) {
    return { state: null, error: 'سوپابیس تنظیم نشده است.' };
  }

  try {
    const { data, error } = await client
      .from('warehouse_sync')
      .select('data, updated_at')
      .eq('key', 'copper_warehouse_main')
      .maybeSingle();

    if (error) {
      return { state: null, error: error.message };
    }

    if (data && data.data) {
      return {
        state: data.data as InventoryState,
        updatedAt: data.updated_at,
      };
    }

    return { state: null };
  } catch (err: any) {
    return { state: null, error: err.message };
  }
}

/**
 * Save inventory state to Supabase
 * Synchronizes to both the master warehouse_sync state table
 * and writes users to the dedicated warehouse_users table.
 */
export async function saveRemoteInventory(state: InventoryState): Promise<{
  success: boolean;
  error?: string;
}> {
  const client = getSupabaseClient();
  if (!client) {
    return { success: false, error: 'سوپابیس تنظیم نشده است.' };
  }

  try {
    // 1. Primary: Save entire state to warehouse_sync
    const { error } = await client.from('warehouse_sync').upsert({
      key: 'copper_warehouse_main',
      data: state,
      updated_at: new Date().toISOString(),
    });

    if (error) {
      console.warn('Failed to upsert to Supabase warehouse_sync:', error);
      return { success: false, error: error.message };
    }

    // 2. Also mirror users to the dedicated 'warehouse_users' table if available
    if (state.users && Array.isArray(state.users) && state.users.length > 0) {
      try {
        const usersToUpsert = state.users.map((u) => ({
          id: u.id,
          full_name: u.fullName,
          username: u.username,
          password: u.password || null,
          mobile: u.mobile || null,
          role: u.role || 'admin',
          created_at: u.createdAt || new Date().toISOString(),
        }));

        await client.from('warehouse_users').upsert(usersToUpsert, { onConflict: 'id' });
      } catch (userSyncErr) {
        // Non-blocking: table might not have been created yet by the user
        console.warn('Optional warehouse_users table sync:', userSyncErr);
      }
    }

    // 3. Mirror Pallets
    if (state.pallets && Array.isArray(state.pallets)) {
      try {
        const mapped = state.pallets.map((p) => ({
          id: p.id,
          pallet_code: p.palletCode,
          brand: p.brand,
          thickness: p.thickness,
          diameter: p.diameter,
          reels: p.reels || [],
          entry_date: p.entryDate,
          location: p.location,
          status: p.status,
          purchaser: p.purchaser || null,
          notes: p.notes || null,
        }));
        if (mapped.length > 0) {
          await client.from('pallets').upsert(mapped, { onConflict: 'id' });
        }
      } catch (err) {
        console.warn('Pallets table mirror error:', err);
      }
    }

    // 4. Mirror Standalone Reels
    if (state.reels && Array.isArray(state.reels)) {
      try {
        const mapped = state.reels.map((r) => ({
          id: r.id,
          reel_code: r.reelCode,
          brand: r.brand,
          thickness: r.thickness,
          diameter: r.diameter,
          weight_kg: r.weightKg,
          origin_pallet_code: r.originPalletCode || null,
          entry_date: r.entryDate,
          location: r.location,
          purchaser: r.purchaser || null,
          notes: r.notes || null,
        }));
        if (mapped.length > 0) {
          await client.from('reels').upsert(mapped, { onConflict: 'id' });
        }
      } catch (err) {
        console.warn('Reels table mirror error:', err);
      }
    }

    // 5. Mirror Coils
    if (state.coils && Array.isArray(state.coils)) {
      try {
        const mapped = state.coils.map((c) => ({
          id: c.id,
          code: c.code,
          brand: c.brand,
          thickness: c.thickness,
          diameter: c.diameter,
          weight_kg: c.weightKg,
          entry_date: c.entryDate,
          location: c.location,
          purchaser: c.purchaser || null,
          notes: c.notes || null,
        }));
        if (mapped.length > 0) {
          await client.from('coils').upsert(mapped, { onConflict: 'id' });
        }
      } catch (err) {
        console.warn('Coils table mirror error:', err);
      }
    }

    // 6. Mirror Branches
    if (state.branches && Array.isArray(state.branches)) {
      try {
        const mapped = state.branches.map((b) => ({
          id: b.id,
          code: b.code,
          brand: b.brand,
          thickness: b.thickness,
          diameter: b.diameter,
          weight_kg: b.totalWeightKg,
          branch_count: b.count,
          branch_length_m: b.lengthMeters,
          entry_date: b.entryDate,
          location: b.location,
          purchaser: b.purchaser || null,
          notes: b.notes || null,
        }));
        if (mapped.length > 0) {
          await client.from('branches').upsert(mapped, { onConflict: 'id' });
        }
      } catch (err) {
        console.warn('Branches table mirror error:', err);
      }
    }

    // 7. Mirror Loose Items
    if (state.loose && Array.isArray(state.loose)) {
      try {
        const mapped = state.loose.map((l) => ({
          id: l.id,
          code: l.code,
          brand: l.brand,
          thickness: l.thickness,
          diameter: l.diameter,
          weight_kg: l.weightKg,
          source: l.originType || 'direct_entry',
          origin_item_code: l.description || null,
          entry_date: l.entryDate,
          purchaser: l.purchaser || null,
          notes: l.notes || null,
        }));
        if (mapped.length > 0) {
          await client.from('loose_items').upsert(mapped, { onConflict: 'id' });
        }
      } catch (err) {
        console.warn('Loose items table mirror error:', err);
      }
    }

    // 8. Mirror Invoices
    if (state.invoices && Array.isArray(state.invoices)) {
      try {
        const mapped = state.invoices.map((i) => ({
          id: i.id,
          invoice_number: i.invoiceNumber,
          date: i.date,
          customer_name: i.customerName,
          customer_phone: i.customerPhone || null,
          customer_address: i.customerAddress || null,
          items: i.items || [],
          total_weight_kg: i.totalWeightKg,
          total_amount: i.totalAmount,
          status: i.status,
          type: i.type || 'exit',
          notes: i.notes || null,
          payment_allocation: i.paymentAllocation || null,
        }));
        if (mapped.length > 0) {
          await client.from('invoices').upsert(mapped, { onConflict: 'id' });
        }
      } catch (err) {
        console.warn('Invoices table mirror error:', err);
      }
    }

    // 9. Mirror Transactions
    if (state.transactions && Array.isArray(state.transactions)) {
      try {
        const mapped = state.transactions.map((t) => {
          // Parse timestamp string to unix epoch, or default to now
          let unixTimestamp = Date.now();
          try {
            if (t.timestamp) {
              const parsed = Date.parse(t.timestamp);
              if (!isNaN(parsed)) unixTimestamp = parsed;
            }
          } catch (e) {}

          return {
            id: t.id,
            timestamp: unixTimestamp,
            date: t.timestamp ? t.timestamp.split('T')[0] : null,
            time: t.timestamp ? t.timestamp.split(' ')[1] || null : null,
            type: t.type,
            item_id: null,
            item_code: t.invoiceNumber || null,
            item_type: t.category,
            weight_kg: t.totalWeightKg,
            source: t.buyerOrSupplier || null,
            destination: null,
            performed_by: t.registeredBy,
            notes: t.details || null,
          };
        });
        if (mapped.length > 0) {
          await client.from('transactions').upsert(mapped, { onConflict: 'id' });
        }
      } catch (err) {
        console.warn('Transactions table mirror error:', err);
      }
    }

    // 10. Mirror Consignments
    if (state.consignments && Array.isArray(state.consignments)) {
      try {
        const mapped = state.consignments.map((c) => ({
          id: c.id,
          recipient_name: c.recipientName,
          recipient_phone: c.recipientPhone || null,
          date: c.issueDate,
          expected_return_date: c.expectedReturnDate || null,
          items: c.items || [],
          total_weight_kg: c.totalWeightKg,
          status: c.status,
          unit_price: c.unitPrice || null,
          notes: c.notes || null,
        }));
        if (mapped.length > 0) {
          await client.from('consignments').upsert(mapped, { onConflict: 'id' });
        }
      } catch (err) {
        console.warn('Consignments table mirror error:', err);
      }
    }

    // 11. Mirror Warehouse Profile
    if (state.warehouseProfile) {
      try {
        const p = state.warehouseProfile;
        const mapped = {
          id: 'main_profile',
          name: p.name,
          manager_name: p.managerName,
          phone: p.phone,
          address: p.address,
          tax_number: null,
          partner_info: p.partnerInfo || null,
          unit_settings: p.unitSettings || null,
          brands: p.brands || null,
        };
        await client.from('warehouse_profile').upsert(mapped, { onConflict: 'id' });
      } catch (err) {
        console.warn('Warehouse profile table mirror error:', err);
      }
    }

    return { success: true };
  } catch (err: any) {
    console.warn('Error saving to Supabase:', err);
    return { success: false, error: err.message };
  }
}
