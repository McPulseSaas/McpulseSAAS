-- Users table (extends Supabase auth.users)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text unique not null,
  plan text not null default 'free',
  stripe_customer_id text,
  stripe_subscription_id text,
  analyses_count integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
create policy "Users can view own profile" on public.profiles
  for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);

-- Trigger to create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Analyses table
create table public.analyses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade not null,
  product_name text not null,
  problem text not null,
  target_customer text not null,
  solution text not null,
  price_point text not null,
  encrypted_api_key text not null,
  status text not null default 'pending',
  result jsonb,
  share_token text unique default encode(gen_random_bytes(16), 'hex'),
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

alter table public.analyses enable row level security;
create policy "Users can view own analyses" on public.analyses
  for select using (auth.uid() = user_id);
create policy "Users can insert own analyses" on public.analyses
  for insert with check (auth.uid() = user_id);

-- Public share access (no auth required)
create policy "Anyone can view shared analysis" on public.analyses
  for select using (share_token is not null);

create index on public.analyses(user_id);
create index on public.analyses(share_token);

-- RPC: increment analyses count
create or replace function public.increment_analyses_count(user_id uuid)
returns void as $$
  update public.profiles set analyses_count = analyses_count + 1 where id = user_id;
$$ language sql security definer;

-- Add ai_provider column (run if upgrading existing schema)
alter table public.analyses add column if not exists ai_provider text not null default 'openai';
