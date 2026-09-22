-- ==============================================================================
-- اسکریپت جامع ساخت جداول و سیاست‌های امنیتی (RLS) دیتابیس Supabase
-- نرم‌افزار مدیریت انبار لوله مسی و حسابداری شرکا
-- این کد را کپی کرده و در بخش SQL Editor در داشبورد Supabase خود اجرا (Run) کنید.
-- ==============================================================================

-- ۱. جدول اصلی همگام‌سازی بلادرنگ انبار (ذخیره کل حالت و پشتیبان‌گیر ابری)
CREATE TABLE IF NOT EXISTS warehouse_sync (
    key TEXT PRIMARY KEY,
    data JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- فعال‌سازی سیاست امنیتی (RLS)
ALTER TABLE warehouse_sync ENABLE ROW LEVEL SECURITY;

-- ایجاد دسترسی خواندن و نوشتن همگانی با کلید anon
DROP POLICY IF EXISTS "Allow public read on warehouse_sync" ON warehouse_sync;
CREATE POLICY "Allow public read on warehouse_sync" 
ON warehouse_sync FOR SELECT 
TO public 
USING (true);

DROP POLICY IF EXISTS "Allow public write on warehouse_sync" ON warehouse_sync;
CREATE POLICY "Allow public write on warehouse_sync" 
ON warehouse_sync FOR ALL 
TO public 
USING (true) 
WITH CHECK (true);

-- فعال‌سازی انتشار بلادرنگ (Realtime)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'warehouse_sync'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE warehouse_sync;
  END IF;
END $$;


-- ==============================================================================
-- ۲. جداول مجزا و تفکیکی برای کاربران، موجودی، فاکتورها، تراکنش‌ها و حساب‌ها
-- ==============================================================================

-- جدول کاربران و ادمین‌های انبار
CREATE TABLE IF NOT EXISTS warehouse_users (
    id TEXT PRIMARY KEY,
    full_name TEXT NOT NULL,
    username TEXT NOT NULL,
    password TEXT,
    mobile TEXT,
    role TEXT DEFAULT 'admin',
    created_at TEXT
);

-- جدول پالت‌ها
CREATE TABLE IF NOT EXISTS pallets (
    id TEXT PRIMARY KEY,
    pallet_code TEXT NOT NULL,
    brand TEXT NOT NULL,
    thickness TEXT NOT NULL,
    diameter TEXT NOT NULL,
    reels JSONB DEFAULT '[]'::jsonb,
    entry_date TEXT,
    location TEXT,
    status TEXT DEFAULT 'sealed',
    purchaser TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- جدول قرقره‌ها
CREATE TABLE IF NOT EXISTS reels (
    id TEXT PRIMARY KEY,
    reel_code TEXT NOT NULL,
    brand TEXT NOT NULL,
    thickness TEXT NOT NULL,
    diameter TEXT NOT NULL,
    weight_kg NUMERIC NOT NULL,
    origin_pallet_code TEXT,
    entry_date TEXT,
    location TEXT,
    purchaser TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- جدول کلاف‌ها
CREATE TABLE IF NOT EXISTS coils (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL,
    brand TEXT NOT NULL,
    thickness TEXT NOT NULL,
    diameter TEXT NOT NULL,
    weight_kg NUMERIC NOT NULL,
    entry_date TEXT,
    location TEXT,
    purchaser TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- جدول شاخه‌ها
CREATE TABLE IF NOT EXISTS branches (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL,
    brand TEXT NOT NULL,
    thickness TEXT NOT NULL,
    diameter TEXT NOT NULL,
    weight_kg NUMERIC NOT NULL,
    branch_count INTEGER DEFAULT 1,
    branch_length_m NUMERIC DEFAULT 6,
    entry_date TEXT,
    location TEXT,
    purchaser TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- جدول خرده بار و ضایعات
CREATE TABLE IF NOT EXISTS loose_items (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL,
    brand TEXT NOT NULL,
    thickness TEXT NOT NULL,
    diameter TEXT NOT NULL,
    weight_kg NUMERIC NOT NULL,
    source TEXT,
    origin_item_code TEXT,
    entry_date TEXT,
    purchaser TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- جدول فاکتورها و پیش‌فاکتورها
CREATE TABLE IF NOT EXISTS invoices (
    id TEXT PRIMARY KEY,
    invoice_number TEXT NOT NULL,
    date TEXT NOT NULL,
    customer_name TEXT NOT NULL,
    customer_phone TEXT,
    customer_address TEXT,
    items JSONB DEFAULT '[]'::jsonb,
    total_weight_kg NUMERIC NOT NULL,
    total_amount NUMERIC NOT NULL,
    status TEXT DEFAULT 'proforma',
    type TEXT DEFAULT 'exit',
    notes TEXT,
    payment_allocation JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- جدول لاگ تراکنش‌ها
CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    timestamp BIGINT NOT NULL,
    date TEXT,
    time TEXT,
    type TEXT NOT NULL,
    item_id TEXT,
    item_code TEXT,
    item_type TEXT,
    weight_kg NUMERIC,
    source TEXT,
    destination TEXT,
    performed_by TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- جدول امانت‌ها
CREATE TABLE IF NOT EXISTS consignments (
    id TEXT PRIMARY KEY,
    recipient_name TEXT NOT NULL,
    recipient_phone TEXT,
    date TEXT NOT NULL,
    expected_return_date TEXT,
    items JSONB DEFAULT '[]'::jsonb,
    total_weight_kg NUMERIC NOT NULL,
    status TEXT DEFAULT 'active',
    unit_price NUMERIC,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- جدول مشخصات انبار و حساب‌های شرکا
CREATE TABLE IF NOT EXISTS warehouse_profile (
    id TEXT PRIMARY KEY DEFAULT 'main_profile',
    name TEXT,
    manager_name TEXT,
    phone TEXT,
    address TEXT,
    tax_number TEXT,
    partner_info JSONB,
    unit_settings JSONB,
    brands JSONB,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- فعال‌سازی RLS و اعمال سیاست دسترسی مجاز با Anon Key
ALTER TABLE warehouse_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE pallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE reels ENABLE ROW LEVEL SECURITY;
ALTER TABLE coils ENABLE ROW LEVEL SECURITY;
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE loose_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE consignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE warehouse_profile ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
    tbl text;
BEGIN
    FOR tbl IN 
        SELECT unnest(ARRAY['warehouse_users', 'pallets', 'reels', 'coils', 'branches', 'loose_items', 'invoices', 'transactions', 'consignments', 'warehouse_profile'])
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS "Allow all for anon on %I" ON %I;', tbl, tbl);
        EXECUTE format('CREATE POLICY "Allow all for anon on %I" ON %I FOR ALL TO public USING (true) WITH CHECK (true);', tbl, tbl);
    END LOOP;
END $$;
