-- =============================================================================
-- Home Tool Center — Initial schema
-- Migration 0001_init
-- =============================================================================

-- ---------- Extensions ----------
create extension if not exists "uuid-ossp";
create extension if not exists pg_trgm;

-- ---------- Common helpers ----------
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- =============================================================================
-- CATEGORIES (hierarchical)
-- =============================================================================
create table categories (
  id uuid primary key default uuid_generate_v4(),
  slug text unique not null,
  name_th text not null,
  name_en text,
  parent_id uuid references categories(id) on delete set null,
  description text,
  banner_image_url text,
  seo_title text,
  seo_description text,
  sort_order int default 0,
  is_published boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index idx_categories_parent on categories(parent_id);
create index idx_categories_published on categories(is_published) where is_published;
create trigger trg_categories_updated_at before update on categories
  for each row execute function set_updated_at();

-- =============================================================================
-- BRANDS
-- =============================================================================
create table brands (
  id uuid primary key default uuid_generate_v4(),
  slug text unique not null,
  name text not null,
  logo_url text,
  banner_url text,
  description text,
  sort_order int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create trigger trg_brands_updated_at before update on brands
  for each row execute function set_updated_at();

-- =============================================================================
-- PRODUCTS
-- =============================================================================
create table products (
  id uuid primary key default uuid_generate_v4(),
  slug text unique not null,
  sku text,
  name_th text not null,
  name_en text,
  short_description text,
  description_md text,
  brand_id uuid references brands(id) on delete set null,
  primary_category_id uuid references categories(id) on delete set null,
  images jsonb default '[]'::jsonb,
  package_size text,
  variants jsonb default '[]'::jsonb,
  catalog_pdf_url text,
  specs jsonb default '[]'::jsonb,
  seo_title text,
  seo_description text,
  og_image_url text,
  status text default 'published' check (status in ('draft','published','archived')),
  sort_order int default 0,
  published_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index idx_products_status on products(status) where status = 'published';
create index idx_products_category on products(primary_category_id, status);
create index idx_products_brand on products(brand_id);
create index idx_products_name_trgm on products using gin (name_th gin_trgm_ops);
create trigger trg_products_updated_at before update on products
  for each row execute function set_updated_at();

-- =============================================================================
-- PRODUCT_CATEGORIES (extra m2m)
-- =============================================================================
create table product_categories (
  product_id uuid references products(id) on delete cascade,
  category_id uuid references categories(id) on delete cascade,
  primary key (product_id, category_id)
);
create index idx_product_categories_category on product_categories(category_id);

-- =============================================================================
-- RELATED_PRODUCTS
-- =============================================================================
create table related_products (
  product_id uuid references products(id) on delete cascade,
  related_product_id uuid references products(id) on delete cascade,
  sort_order int default 0,
  primary key (product_id, related_product_id),
  check (product_id <> related_product_id)
);

-- =============================================================================
-- POSTS (blog)
-- =============================================================================
create table posts (
  id uuid primary key default uuid_generate_v4(),
  slug text unique not null,
  title text not null,
  excerpt text,
  content_md text,
  cover_image_url text,
  author text,
  tags text[] default '{}'::text[],
  category_id uuid references categories(id) on delete set null,
  seo_title text,
  seo_description text,
  og_image_url text,
  status text default 'draft' check (status in ('draft','published','archived')),
  published_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index idx_posts_published on posts(status, published_at desc) where status = 'published';
create index idx_posts_tags on posts using gin(tags);
create trigger trg_posts_updated_at before update on posts
  for each row execute function set_updated_at();

-- =============================================================================
-- QUOTE_REQUESTS
-- =============================================================================
create table quote_requests (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  phone text not null,
  email text,
  company text,
  message text,
  items jsonb default '[]'::jsonb,
  source_page text,
  status text default 'new' check (status in ('new','contacted','quoted','won','lost')),
  admin_note text,
  ip_address inet,
  user_agent text,
  created_at timestamptz default now()
);
create index idx_quote_requests_status on quote_requests(status, created_at desc);

-- =============================================================================
-- CONTACT_MESSAGES
-- =============================================================================
create table contact_messages (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  phone text,
  email text,
  subject text,
  message text not null,
  source_page text,
  status text default 'new' check (status in ('new','read','replied','archived')),
  ip_address inet,
  user_agent text,
  created_at timestamptz default now()
);
create index idx_contact_messages_status on contact_messages(status, created_at desc);

-- =============================================================================
-- MEDIA (Supabase Storage references)
-- =============================================================================
create table media (
  id uuid primary key default uuid_generate_v4(),
  storage_path text not null,
  public_url text not null,
  alt_text text,
  mime_type text,
  size_bytes int,
  width int,
  height int,
  uploaded_by uuid references auth.users(id) on delete set null,
  created_at timestamptz default now()
);

-- =============================================================================
-- REDIRECTS (301 from WP)
-- =============================================================================
create table redirects (
  id uuid primary key default uuid_generate_v4(),
  from_path text unique not null,
  to_path text not null,
  status_code int default 301 check (status_code in (301,302,307,308)),
  hit_count int default 0,
  last_hit_at timestamptz,
  note text,
  created_at timestamptz default now()
);
create index idx_redirects_from_path on redirects(from_path);

-- =============================================================================
-- SITE_SETTINGS (key-value)
-- =============================================================================
create table site_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz default now()
);
create trigger trg_site_settings_updated_at before update on site_settings
  for each row execute function set_updated_at();

-- =============================================================================
-- MENUS
-- =============================================================================
create table menus (
  id uuid primary key default uuid_generate_v4(),
  location text unique not null check (location in ('header','footer')),
  items jsonb not null default '[]'::jsonb,
  updated_at timestamptz default now()
);
create trigger trg_menus_updated_at before update on menus
  for each row execute function set_updated_at();

-- =============================================================================
-- ADMIN_USERS (role mapping on top of auth.users)
-- =============================================================================
create table admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('admin','editor')),
  display_name text,
  created_at timestamptz default now()
);

-- helper
create or replace function is_admin(uid uuid)
returns boolean language sql stable as $$
  select exists (select 1 from admin_users where user_id = uid and role in ('admin','editor'));
$$;

create or replace function is_super_admin(uid uuid)
returns boolean language sql stable as $$
  select exists (select 1 from admin_users where user_id = uid and role = 'admin');
$$;

-- =============================================================================
-- RLS — enable everywhere
-- =============================================================================
alter table categories enable row level security;
alter table brands enable row level security;
alter table products enable row level security;
alter table product_categories enable row level security;
alter table related_products enable row level security;
alter table posts enable row level security;
alter table quote_requests enable row level security;
alter table contact_messages enable row level security;
alter table media enable row level security;
alter table redirects enable row level security;
alter table site_settings enable row level security;
alter table menus enable row level security;
alter table admin_users enable row level security;

-- ---- Public read on published content ----
create policy "public read published categories" on categories
  for select using (is_published);
create policy "public read brands" on brands
  for select using (true);
create policy "public read published products" on products
  for select using (status = 'published');
create policy "public read product_categories" on product_categories
  for select using (true);
create policy "public read related_products" on related_products
  for select using (true);
create policy "public read published posts" on posts
  for select using (status = 'published');
create policy "public read media" on media
  for select using (true);
create policy "public read redirects" on redirects
  for select using (true);  -- middleware reads via anon
create policy "public read site_settings" on site_settings
  for select using (true);
create policy "public read menus" on menus
  for select using (true);

-- ---- Public insert on forms (rate-limited at app layer) ----
create policy "anyone can submit quote" on quote_requests
  for insert with check (true);
create policy "anyone can submit contact" on contact_messages
  for insert with check (true);

-- ---- Admin/editor full access ----
create policy "admin all categories" on categories
  for all using (is_admin(auth.uid())) with check (is_admin(auth.uid()));
create policy "admin all brands" on brands
  for all using (is_admin(auth.uid())) with check (is_admin(auth.uid()));
create policy "admin all products" on products
  for all using (is_admin(auth.uid())) with check (is_admin(auth.uid()));
create policy "admin all product_categories" on product_categories
  for all using (is_admin(auth.uid())) with check (is_admin(auth.uid()));
create policy "admin all related_products" on related_products
  for all using (is_admin(auth.uid())) with check (is_admin(auth.uid()));
create policy "admin all posts" on posts
  for all using (is_admin(auth.uid())) with check (is_admin(auth.uid()));
create policy "admin read quote_requests" on quote_requests
  for select using (is_admin(auth.uid()));
create policy "admin update quote_requests" on quote_requests
  for update using (is_admin(auth.uid())) with check (is_admin(auth.uid()));
create policy "admin read contact_messages" on contact_messages
  for select using (is_admin(auth.uid()));
create policy "admin update contact_messages" on contact_messages
  for update using (is_admin(auth.uid())) with check (is_admin(auth.uid()));
create policy "admin all media" on media
  for all using (is_admin(auth.uid())) with check (is_admin(auth.uid()));

-- redirects/site_settings/menus → super-admin only for writes
create policy "super admin write redirects" on redirects
  for insert with check (is_super_admin(auth.uid()));
create policy "super admin update redirects" on redirects
  for update using (is_super_admin(auth.uid())) with check (is_super_admin(auth.uid()));
create policy "super admin delete redirects" on redirects
  for delete using (is_super_admin(auth.uid()));
create policy "super admin write site_settings" on site_settings
  for all using (is_super_admin(auth.uid())) with check (is_super_admin(auth.uid()));
create policy "super admin write menus" on menus
  for all using (is_super_admin(auth.uid())) with check (is_super_admin(auth.uid()));

create policy "admin read admin_users" on admin_users
  for select using (is_admin(auth.uid()));
create policy "super admin write admin_users" on admin_users
  for all using (is_super_admin(auth.uid())) with check (is_super_admin(auth.uid()));

-- =============================================================================
-- Seed: site_settings defaults
-- =============================================================================
insert into site_settings (key, value) values
  ('contact', jsonb_build_object(
    'phone', '02-426-2745',
    'email', 'hometoolcenter.yspd@gmail.com',
    'line_id', '',
    'facebook_url', '',
    'address', '',
    'business_hours', ''
  )),
  ('seo', jsonb_build_object(
    'default_og_image', '',
    'ga_id', '',
    'gtm_id', ''
  ))
on conflict (key) do nothing;
