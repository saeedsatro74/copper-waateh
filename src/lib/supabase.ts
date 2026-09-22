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

    return { success: true };
  } catch (err: any) {
    console.warn('Error saving to Supabase:', err);
    return { success: false, error: err.message };
  }
}
