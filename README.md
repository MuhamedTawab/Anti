# Blaze

Blaze is a web-first community platform built around text chat and browser voice rooms.

## Current status

- dark web UI for servers, channels, chat, and voice
- interactive server switching, channel switching, and message sending
- API routes for bootstrap data, messages, and voice session state
- optional Supabase-backed persistence with in-memory fallback
- free-tier-ready deployment path for Vercel + Supabase

## Free-tier stack

- `Vercel` for hosting the Next.js web app
- `Supabase` for Postgres, auth, and future realtime
- `WebRTC` later for browser voice transport
- `Cloudflare R2` later for attachments if needed

## Environment variables

Copy `.env.example` into `.env.local` for local development or add the same keys in Vercel:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

If these are missing, the app falls back to the in-memory prototype store.

## Supabase setup

1. Create a free Supabase project.
2. Open the SQL editor.
3. Run [`supabase/schema.sql`](/d:/anti/supabase/schema.sql).
4. Copy your project URL, anon key, and service role key into `.env.local`.
5. Restart the dev server.

## Go online for free

1. Push this project to GitHub.
2. Create a Vercel account and import the repo.
3. Add the three Supabase environment variables in Vercel project settings.
4. Deploy.
5. Open the Vercel URL and verify channels/messages load.

You can deploy before Supabase is configured, but it will behave like a demo because data will reset.

## Database tables

- `users`
- `profiles`
- `servers`
- `server_members`
- `roles`
- `role_permissions`
- `channels`
- `channel_members`
- `messages`
- `message_attachments`
- `direct_threads`
- `direct_thread_members`
- `voice_sessions`
- `audit_logs`

## Next build steps

1. Add Supabase auth and real user identities
2. Add realtime chat subscriptions with Supabase Realtime
3. Add channel creation and server membership flows
4. Add real WebRTC voice signaling
5. Add uploads and moderation
