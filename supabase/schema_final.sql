-- ALAN Barber & Co. — esquema Supabase (pegar completo en SQL Editor)
create extension if not exists btree_gist;

create table barbers (
  id uuid primary key default gen_random_uuid(),
  name text not null, description text, photo_url text, instagram text,
  active boolean not null default true, sort_order int not null default 0
);
create table services (
  id uuid primary key default gen_random_uuid(),
  name text not null, description text,
  duration_minutes int not null check (duration_minutes > 0),
  price numeric(10,2) not null default 0,
  active boolean not null default true, sort_order int not null default 0
);
create table barber_services (
  barber_id uuid references barbers on delete cascade,
  service_id uuid references services on delete cascade,
  primary key (barber_id, service_id)
);
create table working_hours (
  id uuid primary key default gen_random_uuid(),
  barber_id uuid not null references barbers on delete cascade,
  day_of_week smallint not null check (day_of_week between 0 and 6), -- 0 = domingo
  start_time time not null, end_time time not null,
  active boolean not null default true,
  check (end_time > start_time)
);
create table blocked_dates (
  id uuid primary key default gen_random_uuid(),
  barber_id uuid references barbers on delete cascade, -- null = bloquea a todos
  date date not null, reason text
);
create table business_settings (key text primary key, value text not null);
create table admins (
  user_id uuid primary key references auth.users on delete cascade,
  barber_id uuid references barbers -- opcional: si está, solo ve sus turnos (a futuro)
);
create table appointments (
  id uuid primary key default gen_random_uuid(),
  barber_id uuid not null references barbers,
  service_id uuid not null references services,
  start_at timestamptz not null, end_at timestamptz not null,
  customer_name text not null, customer_phone text not null, customer_email text,
  status text not null default 'confirmed'
    check (status in ('pending','confirmed','cancelled','completed')),
  cancel_token uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  check (end_at > start_at),
  -- candado anti doble reserva: mismo barbero no puede tener turnos que se pisen
  constraint no_overlap exclude using gist
    (barber_id with =, tstzrange(start_at, end_at) with &&) where (status <> 'cancelled')
);

-- ---------- RLS ----------
create or replace function is_admin() returns boolean
language sql stable security definer set search_path = public as
$$ select exists (select 1 from admins where user_id = auth.uid()) $$;

alter table barbers enable row level security;
alter table services enable row level security;
alter table barber_services enable row level security;
alter table working_hours enable row level security;
alter table blocked_dates enable row level security;
alter table business_settings enable row level security;
alter table admins enable row level security;
alter table appointments enable row level security;

-- público: solo lectura de lo activo
create policy "public read barbers" on barbers for select using (active);
create policy "public read services" on services for select using (active);
create policy "public read barber_services" on barber_services for select using (true);
create policy "public read business_settings" on business_settings for select using (true);
-- horarios y bloqueos NO son públicos: el cliente solo ve horarios libres vía función

-- admin: todo
do $$ declare t text; begin
  foreach t in array array['barbers','services','barber_services','working_hours',
                           'blocked_dates','business_settings','appointments'] loop
    execute format('create policy "admin all %1$s" on %1$I for all using (is_admin()) with check (is_admin())', t);
  end loop;
end $$;
create policy "admin read admins" on admins for select using (is_admin());
-- appointments: sin política pública => anónimos no leen ni escriben nada directo

-- ---------- Disponibilidad ----------
create or replace function get_available_slots(p_barber uuid, p_service uuid, p_date date)
returns table (slot_start timestamptz)
language plpgsql stable security definer set search_path = public as $$
declare
  tz constant text := 'America/Argentina/Buenos_Aires';
  step constant int := 30; -- grilla de horarios en minutos
  v_dur int; wh record; t timestamptz; v_end timestamptz;
begin
  select s.duration_minutes into v_dur
    from services s join barber_services bs on bs.service_id = s.id
   where s.id = p_service and bs.barber_id = p_barber and s.active;
  if v_dur is null then return; end if;
  if exists (select 1 from blocked_dates
              where date = p_date and (barber_id = p_barber or barber_id is null)) then return; end if;

  for wh in select start_time, end_time from working_hours
             where barber_id = p_barber and active and day_of_week = extract(dow from p_date)::int
             order by start_time loop
    t := (p_date + wh.start_time) at time zone tz;
    v_end := (p_date + wh.end_time) at time zone tz;
    while t + make_interval(mins => v_dur) <= v_end loop
      if t > now() and not exists (
           select 1 from appointments a
            where a.barber_id = p_barber and a.status <> 'cancelled'
              and tstzrange(a.start_at, a.end_at) && tstzrange(t, t + make_interval(mins => v_dur))
         ) then
        slot_start := t; return next;
      end if;
      t := t + make_interval(mins => step);
    end loop;
  end loop;
end $$;

-- ---------- Reservar (única puerta de escritura para el público) ----------
create or replace function create_appointment(
  p_barber uuid, p_service uuid, p_start timestamptz,
  p_name text, p_phone text, p_email text default null)
returns table (appointment_id uuid, token uuid, ends_at timestamptz)
language plpgsql security definer set search_path = public as $$
declare v_dur int; v_end timestamptz; v_id uuid; v_tok uuid;
begin
  if length(trim(p_name)) < 2 or length(trim(p_phone)) < 6 then
    raise exception 'invalid_customer';
  end if;
  -- se recalcula la disponibilidad en el momento de confirmar
  if not exists (
    select 1 from get_available_slots(p_barber, p_service,
      (p_start at time zone 'America/Argentina/Buenos_Aires')::date) s
    where s.slot_start = p_start) then
    raise exception 'slot_unavailable';
  end if;
  select duration_minutes into v_dur from services where id = p_service;
  v_end := p_start + make_interval(mins => v_dur);
  begin
    insert into appointments (barber_id, service_id, start_at, end_at,
                              customer_name, customer_phone, customer_email)
    values (p_barber, p_service, p_start, v_end, trim(p_name), trim(p_phone),
            nullif(trim(coalesce(p_email, '')), ''))
    returning id, cancel_token into v_id, v_tok;
  exception when exclusion_violation then
    raise exception 'slot_unavailable'; -- otra persona reservó en el mismo instante
  end;
  return query select v_id, v_tok, v_end;
end $$;

-- ---------- Cancelar con el link secreto del mail/WhatsApp ----------
create or replace function cancel_by_token(p_token uuid) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  update appointments set status = 'cancelled'
   where cancel_token = p_token and status in ('pending','confirmed') and start_at > now();
  return found;
end $$;

revoke all on function get_available_slots, create_appointment, cancel_by_token from public;
grant execute on function get_available_slots, create_appointment, cancel_by_token to anon, authenticated;

-- ---------- Datos iniciales (PLACEHOLDERS: editar desde Table Editor) ----------
insert into barbers (name, description, sort_order) values
  ('Alan Franco', 'Barbero', 1), ('Cristian Scarpa', 'Barbero', 2);
insert into services (name, duration_minutes, price, sort_order) values
  ('Corte', 30, 0, 1), ('Corte + Barba', 60, 0, 2),
  ('Arreglo de barba', 30, 0, 3), ('Perfilado de cejas', 30, 0, 4);
insert into barber_services select b.id, s.id from barbers b cross join services s;
-- Horario PLACEHOLDER lunes a sábado 16:00–20:00 (cambiar por el real)
insert into working_hours (barber_id, day_of_week, start_time, end_time)
  select b.id, d, '16:00', '20:00' from barbers b, generate_series(1, 6) d;

-- Para crear al admin: 1) Authentication > Users > Add user (email + contraseña)
-- 2) insert into admins (user_id) values ('<uuid del usuario>');
-- Pegar en SQL Editor DESPUÉS de schema.sql: soporte para el mail de confirmación
alter table appointments add column if not exists confirmation_sent boolean not null default false;

create or replace function claim_confirmation(p_token uuid)
returns table (customer_name text, customer_email text, start_at timestamptz, barber_name text, service_name text)
language plpgsql security definer set search_path = public as $$
begin
  return query
  with u as (
    update appointments a set confirmation_sent = true
     where a.cancel_token = p_token and not a.confirmation_sent and a.customer_email is not null
    returning a.*)
  select u.customer_name, u.customer_email, u.start_at, b.name, s.name
    from u join barbers b on b.id = u.barber_id join services s on s.id = u.service_id;
end $$;
revoke all on function claim_confirmation from public;
grant execute on function claim_confirmation to anon, authenticated;
-- Pegar en SQL Editor DESPUÉS de schema.sql y schema_v2.sql: sincronización con Google Calendar
alter table appointments add column if not exists calendar_synced boolean not null default false;

create or replace function claim_calendar_sync(p_token uuid)
returns table (customer_name text, customer_phone text, start_at timestamptz, end_at timestamptz, barber_name text, service_name text)
language plpgsql security definer set search_path = public as $$
begin
  return query
  with u as (
    update appointments a set calendar_synced = true
     where a.cancel_token = p_token and not a.calendar_synced
    returning a.*)
  select u.customer_name, u.customer_phone, u.start_at, u.end_at, b.name, s.name
    from u join barbers b on b.id = u.barber_id join services s on s.id = u.service_id;
end $$;
revoke all on function claim_calendar_sync from public;
grant execute on function claim_calendar_sync to anon, authenticated;
