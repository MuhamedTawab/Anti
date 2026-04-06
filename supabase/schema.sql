create extension if not exists "pgcrypto";

create table if not exists servers (
  id text primary key,
  name text not null,
  initials text not null,
  accent text not null,
  owner_id uuid,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists channels (
  id text primary key,
  server_id text not null references servers(id) on delete cascade,
  name text not null,
  kind text not null check (kind in ('text', 'voice')),
  unread integer,
  members integer,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  channel_id text not null references channels(id) on delete cascade,
  author_id uuid,
  author text not null,
  handle text not null,
  body text not null,
  timestamp text not null,
  created_at timestamptz not null default now()
);

create table if not exists voice_room_members (
  id uuid primary key default gen_random_uuid(),
  room_id text not null references channels(id) on delete cascade,
  name text not null,
  role text not null,
  status text not null check (status in ('online', 'idle', 'focus')),
  created_at timestamptz not null default now()
);

create table if not exists profiles (
  id uuid primary key,
  email text not null unique,
  name text not null,
  handle text not null unique,
  avatar_url text,
  bio text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists server_memberships (
  id uuid primary key default gen_random_uuid(),
  server_id text not null references servers(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  created_at timestamptz not null default now()
);

create unique index if not exists server_memberships_unique
on server_memberships (server_id, profile_id);

create table if not exists server_invites (
  code text primary key,
  server_id text not null references servers(id) on delete cascade,
  created_by uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists server_bans (
  id uuid primary key default gen_random_uuid(),
  server_id text not null references servers(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  created_by uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

create unique index if not exists server_bans_unique
on server_bans (server_id, profile_id);

create table if not exists friend_requests (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references profiles(id) on delete cascade,
  receiver_id uuid not null references profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now()
);

create unique index if not exists friend_requests_unique_pair
on friend_requests (sender_id, receiver_id);

create table if not exists friendships (
  id uuid primary key default gen_random_uuid(),
  user_a uuid not null references profiles(id) on delete cascade,
  user_b uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

create unique index if not exists friendships_unique_pair
on friendships (least(user_a, user_b), greatest(user_a, user_b));

create table if not exists direct_threads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now()
);

create table if not exists direct_thread_members (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references direct_threads(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

create unique index if not exists direct_thread_members_unique
on direct_thread_members (thread_id, profile_id);

create table if not exists direct_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references direct_threads(id) on delete cascade,
  author_id uuid not null references profiles(id) on delete cascade,
  author text not null,
  handle text not null,
  body text not null,
  timestamp text not null,
  created_at timestamptz not null default now()
);

create table if not exists message_attachments (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references messages(id) on delete cascade,
  kind text not null check (kind in ('image', 'link')),
  url text not null,
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists direct_message_attachments (
  id uuid primary key default gen_random_uuid(),
  direct_message_id uuid not null references direct_messages(id) on delete cascade,
  kind text not null check (kind in ('image', 'link')),
  url text not null,
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists moderation_actions (
  id uuid primary key default gen_random_uuid(),
  server_id text not null references servers(id) on delete cascade,
  actor_id uuid not null references profiles(id) on delete cascade,
  target_profile_id uuid references profiles(id) on delete cascade,
  message_id uuid references messages(id) on delete set null,
  action text not null check (action in ('delete_message', 'kick', 'ban')),
  reason text,
  created_at timestamptz not null default now()
);

alter table servers add column if not exists owner_id uuid;
alter table messages add column if not exists author_id uuid;
alter table profiles add column if not exists avatar_url text;
alter table profiles add column if not exists bio text not null default '';

insert into servers (id, name, initials, accent, sort_order) values
  ('hq', 'Anti HQ', 'AH', 'from-[#ff3b5f] to-[#ff8a5b]', 1),
  ('design', 'Signal Lab', 'SL', 'from-[#7bf6ff] to-[#6aa9ff]', 2)
on conflict (id) do update
set name = excluded.name,
    initials = excluded.initials,
    accent = excluded.accent,
    sort_order = excluded.sort_order;

insert into channels (id, server_id, name, kind, unread, members, sort_order) values
  ('welcome', 'hq', 'welcome', 'text', 4, null, 1),
  ('build-log', 'hq', 'build-log', 'text', 2, null, 2),
  ('ideas', 'hq', 'ideas', 'text', null, null, 3),
  ('war-room', 'hq', 'war-room', 'voice', null, 6, 4),
  ('late-night', 'hq', 'late-night', 'voice', null, 2, 5),
  ('moodboard', 'design', 'moodboard', 'text', 1, null, 1),
  ('feedback', 'design', 'feedback', 'text', null, null, 2),
  ('listening-room', 'design', 'listening-room', 'voice', null, 3, 3)
on conflict (id) do update
set server_id = excluded.server_id,
    name = excluded.name,
    kind = excluded.kind,
    unread = excluded.unread,
    members = excluded.members,
    sort_order = excluded.sort_order;

delete from messages
where handle in ('@maya', '@idris', '@nora', '@sami', '@rin', '@kareem', '@lina', '@tariq', '@ash');

delete from voice_room_members;
