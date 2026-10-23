create extension if not exists pgcrypto;

create table if not exists public.gift_status (
  gift_id text primary key,
  status text not null default 'available'
    check (status in ('available', 'reserved', 'purchased')),
  reserved_by text,
  booked_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint gift_status_reserved_fields check (
    (status = 'available' and reserved_by is null and booked_at is null)
    or
    (status in ('reserved', 'purchased') and reserved_by is not null and booked_at is not null)
  )
);

create table if not exists public.gift_secrets (
  gift_id text primary key references public.gift_status(gift_id) on delete cascade,
  token_hash text not null
);

insert into public.gift_status (gift_id) values
  ('animals'), ('vegetable-sorter'), ('avent-cup'), ('busyboard'), ('play-mat')
on conflict (gift_id) do nothing;

alter table public.gift_status enable row level security;
alter table public.gift_secrets enable row level security;

revoke all on public.gift_status from anon, authenticated;
revoke all on public.gift_secrets from anon, authenticated;
grant select (gift_id, status, reserved_by, booked_at, updated_at) on public.gift_status to anon, authenticated;

create policy "public can read gift statuses"
  on public.gift_status for select to anon, authenticated using (true);

create or replace function public.reserve_gift(p_gift_id text, p_name text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_token text;
  v_count integer;
begin
  if p_name is null or length(trim(p_name)) < 2 or length(trim(p_name)) > 40 then
    raise exception 'Имя должно содержать от 2 до 40 символов';
  end if;

  v_token := encode(extensions.gen_random_bytes(32), 'hex');

  update public.gift_status
    set status = 'reserved', reserved_by = trim(p_name),
        booked_at = now(), updated_at = now()
    where gift_id = p_gift_id and status = 'available';
  get diagnostics v_count = row_count;

  if v_count <> 1 then
    raise exception 'Подарок уже забронирован или не существует';
  end if;

  insert into public.gift_secrets(gift_id, token_hash)
    values (p_gift_id, encode(extensions.digest(v_token, 'sha256'), 'hex'))
    on conflict (gift_id) do update set token_hash = excluded.token_hash;

  return jsonb_build_object('token', v_token);
end;
$$;

create or replace function public.cancel_gift(p_gift_id text, p_token text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_hash text;
begin
  select token_hash into v_hash from public.gift_secrets where gift_id = p_gift_id;
  if v_hash is null or v_hash <> encode(extensions.digest(p_token, 'sha256'), 'hex') then
    raise exception 'Код бронирования неверен';
  end if;

  update public.gift_status
    set status = 'available', reserved_by = null, booked_at = null, updated_at = now()
    where gift_id = p_gift_id and status = 'reserved';

  if not found then raise exception 'Бронь нельзя отменить'; end if;
  delete from public.gift_secrets where gift_id = p_gift_id;
  return true;
end;
$$;

create or replace function public.mark_purchased(p_gift_id text, p_token text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_hash text;
begin
  select token_hash into v_hash from public.gift_secrets where gift_id = p_gift_id;
  if v_hash is null or v_hash <> encode(extensions.digest(p_token, 'sha256'), 'hex') then
    raise exception 'Код бронирования неверен';
  end if;

  update public.gift_status
    set status = 'purchased', updated_at = now()
    where gift_id = p_gift_id and status = 'reserved';

  if not found then raise exception 'Подарок нельзя отметить купленным'; end if;
  return true;
end;
$$;

revoke all on function public.reserve_gift(text, text) from public;
revoke all on function public.cancel_gift(text, text) from public;
revoke all on function public.mark_purchased(text, text) from public;
grant execute on function public.reserve_gift(text, text) to anon, authenticated;
grant execute on function public.cancel_gift(text, text) to anon, authenticated;
grant execute on function public.mark_purchased(text, text) to anon, authenticated;
