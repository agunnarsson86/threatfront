-- ============================================
-- ThreatFront Database Schema
-- ============================================

-- Events table: stores all attack events
create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  timestamp timestamptz not null default now(),
  source_ip text not null,
  source_country text not null,
  source_lat double precision not null,
  source_lon double precision not null,
  target_ip text not null,
  target_country text not null,
  target_lat double precision not null,
  target_lon double precision not null,
  port integer not null,
  protocol text not null,
  attack_type text not null,
  severity text not null check (severity in ('low', 'medium', 'high', 'critical'))
);

-- Indexes for fast queries
create index if not exists idx_events_timestamp on events (timestamp desc);
create index if not exists idx_events_severity on events (severity);
create index if not exists idx_events_source_country on events (source_country);
create index if not exists idx_events_attack_type on events (attack_type);

-- Enable Realtime
alter publication supabase_realtime add table events;

-- Row Level Security
alter table events enable row level security;

-- Allow public read access (dashboard)
create policy "Anyone can read events"
  on events for select
  using (true);

-- Allow service_role to insert (Edge Function bypasses RLS)
create policy "Service role can insert events"
  on events for insert
  with check (true);

-- ============================================
-- Views for dashboard statistics
-- ============================================

-- Top source countries
create or replace view top_countries as
select source_country, count(*) as count
from events
group by source_country
order by count desc
limit 10;

-- Top target ports
create or replace view top_ports as
select port, count(*) as count
from events
group by port
order by count desc
limit 10;

-- Attack type distribution
create or replace view attack_distribution as
select attack_type, count(*) as count
from events
group by attack_type
order by count desc;

-- Severity distribution
create or replace view severity_distribution as
select severity, count(*) as count
from events
group by severity
order by count desc;

-- Events per hour (last 48 hours)
create or replace view events_hourly as
select
  date_trunc('hour', timestamp) as hour,
  count(*) as count
from events
where timestamp > now() - interval '48 hours'
group by hour
order by hour desc;

-- Event counts
create or replace view event_counts as
select
  count(*) as total,
  count(*) filter (where timestamp > now() - interval '24 hours') as last_24h,
  count(*) filter (where timestamp > now() - interval '1 hour') as last_hour
from events;
