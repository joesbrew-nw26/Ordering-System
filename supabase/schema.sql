-- ====================================================================
-- JOE'S BREW IN-HOUSE ORDERING & BRAND WEBSITE
-- Production Supabase PostgreSQL Schema & Realtime Setup
-- ====================================================================

-- 1. Enable UUID Extension
create extension if not exists "uuid-ossp";

-- 2. Tables Master Reference
create table if not exists public.tables (
  id text primary key,
  floor text not null,
  label text not null,
  created_at timestamptz default now()
);

-- Seed physical cafe tables (4 Terrace, 4 Ground Floor)
insert into public.tables (id, floor, label) values
  ('Ground-01', 'Ground Floor', 'Ground - Table 1'),
  ('Ground-02', 'Ground Floor', 'Ground - Table 2'),
  ('Ground-03', 'Ground Floor', 'Ground - Table 3'),
  ('Top-01', 'Terrace', 'Terrace - Table 1'),
  ('Top-02', 'Terrace', 'Terrace - Table 2'),
  ('Top-03', 'Terrace', 'Terrace - Table 3'),
  ('Top-04', 'Terrace', 'Terrace - Table 4')
on conflict (id) do nothing;

-- 3. Menu Items Table
create table if not exists public.menu_items (
  id text primary key,
  name text not null,
  category text not null,
  price numeric not null,
  is_special boolean default false,
  description text,
  in_stock boolean default true,
  badge text,
  type text default 'hot',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Seed Joe's Brew 24 Curated Creations
insert into public.menu_items (id, name, category, price, is_special, description, in_stock, badge, type) values
  ('tea-01', 'Tea', 'TEA', 25, true, 'Slow-brewed traditional house milk chai with aromatic spices and velvety finish.', true, 'Joe''s Brew Special', 'hot'),
  ('tea-02', 'Black Tea', 'TEA', 20, false, 'Steeped premium Assam black tea with a warm amber finish.', true, null, 'hot'),
  ('tea-03', 'Lemon tea', 'TEA', 25, false, 'Zesty black tea infused with fresh citrus lemon and honeyed warmth.', true, null, 'hot'),
  ('coffee-01', 'Coffee', 'COFFEE', 30, true, 'Signature vintage roast filter coffee, thick froth and deep chicory aroma.', true, 'Joe''s Brew Special', 'hot'),
  ('coffee-02', 'Black coffee', 'COFFEE', 25, false, 'Intense dark drip coffee with a clean, bold roast note.', true, null, 'hot'),
  ('melt-01', 'Hot chocolate', 'MELT', 70, true, 'Rich Belgian molten chocolate melted into velvety steamed whole milk.', true, 'Joe''s Brew Special', 'hot'),
  ('cookie-01', 'Nutra biscuit (2 pcs)', 'COOKIES', 10, true, 'Crunchy whole-wheat baked tea-dunking biscuits (2 pieces).', true, 'Joe''s Brew Special', 'snack'),
  ('cookie-02', 'Sazzy biscuit (3 pcs)', 'COOKIES', 10, true, 'Golden buttery melt-in-the-mouth heritage tea biscuits (3 pieces).', true, 'Joe''s Brew Special', 'snack'),
  ('drink-01', 'Biscoff milkshake', 'DRINKS', 130, true, 'Decadent milkshake blended with Lotus Biscoff spread and cookie crumbs.', true, 'Joe''s Brew Special', 'cold'),
  ('drink-02', 'Cold milo', 'DRINKS', 100, true, 'Iced chocolate malt drink crowned with a mound of crunchy raw Milo.', true, 'Joe''s Brew Special', 'cold'),
  ('drink-03', 'Iced tea', 'DRINKS', 100, true, 'Crisp freshly brewed tea shaken over crushed ice with fresh mint and citrus.', true, 'Joe''s Brew Special', 'cold'),
  ('drink-04', 'Cold coffee', 'DRINKS', 100, true, 'Classic thick iced coffee blended with sweet milk and ice cream froth.', true, 'Joe''s Brew Special', 'cold'),
  ('drink-05', 'Chocolate milkshake', 'DRINKS', 80, false, 'Thick creamy chocolate shake finished with rich chocolate drizzle.', true, null, 'cold'),
  ('drink-06', 'Oreo milkshake', 'DRINKS', 80, false, 'Churned cream shake with chocolate cookies and crunchy Oreo crumble.', true, null, 'cold'),
  ('drink-07', 'Lassi', 'DRINKS', 50, false, 'Authentic thick sweetened yogurt lassi dusted with fragrant cardamom.', true, null, 'cold'),
  ('snack-01', 'Joe''s brew special BUN MILKELLA', 'SNACKS', 65, true, 'Our legendary warm toasted brioche bun loaded with Nutella and condensed milk.', true, 'Joe''s Brew Special', 'snack'),
  ('snack-02', 'Veg samosa (2 pcs)', 'SNACKS', 20, false, 'Crisp flaky triangular pastries filled with savory spiced potatoes (2 pieces).', true, null, 'snack'),
  ('snack-03', 'Crispy nuggets (3 pcs)', 'SNACKS', 30, true, 'Crunchy golden nuggets served hot with seasoned dip (3 pieces).', true, 'Joe''s Brew Special', 'snack'),
  ('snack-04', 'Cutlets (3 pcs)', 'SNACKS', 30, false, 'Hearty spiced potato-veggie patties pan-crisped to perfection (3 pieces).', true, null, 'snack'),
  ('snack-05', 'Crispy roll', 'SNACKS', 20, true, 'Crispy fried savory roll stuffed with seasoned spiced vegetables.', true, 'Joe''s Brew Special', 'snack'),
  ('eat-01', 'French fries', 'EATS', 90, false, 'Classic salted golden crispy potato fries with tomato dip.', true, null, 'snack'),
  ('eat-02', 'Peri peri fries', 'EATS', 110, true, 'Hot crisp fries dusted generously with our fiery house peri-peri seasoning.', true, 'Joe''s Brew Special', 'snack'),
  ('eat-03', 'Panner momos', 'EATS', 60, true, 'Steamed delicate dumplings stuffed with spiced paneer, served with spicy dip.', true, 'Joe''s Brew Special', 'snack'),
  ('eat-04', 'Happy Bites', 'EATS', 60, false, 'Golden smiley potato bites fried crispy and seasoned with sea salt.', true, null, 'snack')
on conflict (id) do update set
  name = excluded.name,
  category = excluded.category,
  price = excluded.price,
  is_special = excluded.is_special,
  description = excluded.description,
  badge = excluded.badge,
  type = excluded.type;

-- 4. Customer Table Orders
create table if not exists public.orders (
  id text primary key,
  order_number text not null,
  table_id text not null references public.tables(id),
  floor text not null,
  items jsonb not null default '[]'::jsonb,
  general_instructions text default '',
  subtotal numeric not null default 0,
  total numeric not null default 0,
  payment_mode text default 'Pay at Counter',
  payment_status text default 'Pending (Pay at Counter)',
  status text not null default 'Received', -- 'Received' | 'Preparing' | 'Ready to Serve' | 'Completed' | 'Cancelled'
  customer_name text default 'Guest',
  customer_phone text default '',
  order_mode text default 'Dine-In', -- 'Dine-In' | 'Parcel'
  packaging_charge numeric default 0,
  status_history jsonb default '[]'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Backward-compatible column addition if table already exists in Supabase
alter table public.orders add column if not exists order_mode text default 'Dine-In';
alter table public.orders add column if not exists packaging_charge numeric default 0;

-- Create index on order date for fast KDS ledger reporting
create index if not exists idx_orders_created_at on public.orders (created_at desc);
create index if not exists idx_orders_status on public.orders (status);

-- 5. Waiter Assistance Calls
create table if not exists public.waiter_calls (
  id text primary key,
  table_id text not null references public.tables(id),
  floor text not null,
  reason text default 'Assistance requested',
  timestamp timestamptz default now(),
  resolved boolean default false,
  resolved_at timestamptz
);

create index if not exists idx_waiter_calls_resolved on public.waiter_calls (resolved);

-- 6. Daily Sales & Shift Settlement Ledger (7+ Days Audit Storage)
create table if not exists public.daily_sales (
  date text primary key, -- Format: YYYY-MM-DD
  summary_data jsonb not null default '{}'::jsonb,
  is_shift_closed boolean default false,
  closed_at timestamptz,
  closed_by text,
  staff_notes text,
  updated_at timestamptz default now()
);

-- ====================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ====================================================================

-- Enable RLS on all tables
alter table public.tables enable row level security;
alter table public.menu_items enable row level security;
alter table public.orders enable row level security;
alter table public.waiter_calls enable row level security;
alter table public.daily_sales enable row level security;

-- Tables & Menu: Publicly readable by all cafe customers
create policy "Allow public read access to tables"
  on public.tables for select
  using (true);

create policy "Allow public read access to menu_items"
  on public.menu_items for select
  using (true);

create policy "Allow staff or backend update to menu_items"
  on public.menu_items for all
  using (true)
  with check (true);

-- Orders: Customers can insert their own orders and read orders; staff can update status
create policy "Allow public insert to orders"
  on public.orders for insert
  with check (true);

create policy "Allow public read access to orders"
  on public.orders for select
  using (true);

create policy "Allow public or staff update to orders"
  on public.orders for update
  using (true)
  with check (true);

-- Waiter calls: Customers can call waiter; staff can resolve
create policy "Allow public insert to waiter_calls"
  on public.waiter_calls for insert
  with check (true);

create policy "Allow public read access to waiter_calls"
  on public.waiter_calls for select
  using (true);

create policy "Allow update access to waiter_calls"
  on public.waiter_calls for update
  using (true)
  with check (true);

-- Daily Sales: Staff read/write
create policy "Allow all access to daily_sales"
  on public.daily_sales for all
  using (true)
  with check (true);

-- ====================================================================
-- SUPABASE REALTIME REPLICATION (Instant Zero-Delay WebSockets)
-- ====================================================================
-- Add tables to the supabase_realtime publication so customers and KDS
-- sync tickets live without polling or manual page reloads.

begin;
  alter publication supabase_realtime add table public.orders;
  alter publication supabase_realtime add table public.waiter_calls;
  alter publication supabase_realtime add table public.menu_items;
commit;
