create extension if not exists "pgcrypto";

create table if not exists servers (
  id text primary key,
  name text not null,
  initials text not null,
  accent text not null,
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

insert into messages (channel_id, author, handle, body, timestamp) values
  ('welcome', 'Maya', '@maya', 'Welcome in. Keep comms tight, keep channels clean, and jump into voice when the squad is active.', '09:02'),
  ('build-log', 'Maya', '@maya', 'We should treat voice rooms like lightweight spaces, not meetings. Join fast, speak fast, leave fast.', '09:12'),
  ('build-log', 'Idris', '@idris', 'Chat history is flowing. Next step is role-aware permissions and WebRTC signaling hooks for voice channels.', '09:16'),
  ('build-log', 'Nora', '@nora', 'The UI should make voice feel alive even before someone joins. Speaking activity, room counts, and quick join need to be obvious.', '09:21'),
  ('ideas', 'Sami', '@sami', 'Push-to-talk and game-party presence can become signature features once the chat base is stable.', '10:03'),
  ('moodboard', 'Nora', '@nora', 'Keep the palette nearly black, then let the red and cyan accents do the heavy lifting.', '11:08'),
  ('feedback', 'Idris', '@idris', 'Minimal is good, but action states still need to feel strong enough for a gaming audience.', '11:17')
on conflict do nothing;

insert into voice_room_members (room_id, name, role, status) values
  ('war-room', 'Maya', 'Founder', 'online'),
  ('war-room', 'Idris', 'Platform', 'focus'),
  ('war-room', 'Nora', 'Design', 'online'),
  ('war-room', 'Sami', 'Moderation', 'idle'),
  ('late-night', 'Rin', 'Night Ops', 'online'),
  ('late-night', 'Kareem', 'Builder', 'focus'),
  ('listening-room', 'Lina', 'Audio', 'online'),
  ('listening-room', 'Tariq', 'UI', 'idle'),
  ('listening-room', 'Ash', 'Mods', 'online')
on conflict do nothing;
