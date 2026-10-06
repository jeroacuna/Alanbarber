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
