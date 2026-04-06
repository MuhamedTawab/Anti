"use client";

import { KeyRound, LoaderCircle, LogOut, Mail, ShieldCheck } from "lucide-react";

import type { AuthIdentity } from "@/lib/types";

interface AuthPanelProps {
  currentUser: AuthIdentity | null;
  profileName: string;
  profileHandle: string;
  profileAvatarUrl: string;
  profileBio: string;
  loading: boolean;
  message: string | null;
  onProfileNameChange: (value: string) => void;
  onProfileHandleChange: (value: string) => void;
  onProfileAvatarUrlChange: (value: string) => void;
  onProfileBioChange: (value: string) => void;
  onGoogleSignIn: () => void;
  onSaveProfile: () => void;
  onSignOut: () => void;
}

export function AuthPanel({
  currentUser,
  profileName,
  profileHandle,
  profileAvatarUrl,
  profileBio,
  loading,
  message,
  onProfileNameChange,
  onProfileHandleChange,
  onProfileAvatarUrlChange,
  onProfileBioChange,
  onGoogleSignIn,
  onSaveProfile,
  onSignOut
}: AuthPanelProps) {
  if (currentUser) {
    return (
      <section className="flex flex-col gap-4 rounded-[28px] border border-white/10 bg-panel/90 px-6 py-5 shadow-panel xl:flex-row xl:items-start xl:justify-between">
        <div>
          <p className="mb-2 text-xs uppercase tracking-[0.35em] text-sea/80">Nightlink Access</p>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-ember to-sea font-display text-sm font-bold text-ink">
              {currentUser.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={currentUser.avatarUrl} alt={currentUser.name} className="h-full w-full rounded-2xl object-cover" />
              ) : (
                currentUser.name.slice(0, 2).toUpperCase()
              )}
            </div>
            <div>
              <p className="font-display text-2xl uppercase tracking-[0.08em] text-white">
                {currentUser.name}
              </p>
              <p className="text-sm text-white/45">
                {currentUser.handle} | {currentUser.email}
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-4 xl:w-[760px] xl:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-[28px] border border-white/10 bg-black/20 p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-ember to-sea font-display text-sm font-bold text-ink">
                  {profileAvatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={profileAvatarUrl} alt={profileName || currentUser.name} className="h-full w-full object-cover" />
                  ) : (
                    (profileName || currentUser.name).slice(0, 2).toUpperCase()
                  )}
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.28em] text-white/35">Profile</p>
                  <p className="text-sm text-white/60">Name, handle, bio, and avatar</p>
                </div>
              </div>
              <button
                onClick={onSaveProfile}
                disabled={loading}
                className="rounded-2xl bg-ember px-4 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-65"
              >
                Save
              </button>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <input
                value={profileName}
                onChange={(event) => onProfileNameChange(event.target.value)}
                placeholder="Display name"
                className="rounded-2xl border border-white/10 bg-steel px-4 py-3 text-white outline-none placeholder:text-white/35"
              />
              <input
                value={profileHandle}
                onChange={(event) => onProfileHandleChange(event.target.value)}
                placeholder="@handle"
                className="rounded-2xl border border-white/10 bg-steel px-4 py-3 text-white outline-none placeholder:text-white/35"
              />
              <input
                value={profileAvatarUrl}
                onChange={(event) => onProfileAvatarUrlChange(event.target.value)}
                placeholder="Avatar image URL"
                className="md:col-span-2 rounded-2xl border border-white/10 bg-steel px-4 py-3 text-white outline-none placeholder:text-white/35"
              />
              <textarea
                value={profileBio}
                onChange={(event) => onProfileBioChange(event.target.value)}
                placeholder="Short bio"
                rows={3}
                className="md:col-span-2 resize-none rounded-2xl border border-white/10 bg-steel px-4 py-3 text-white outline-none placeholder:text-white/35"
              />
            </div>
          </div>

          <div className="flex flex-col gap-3 xl:items-end">
          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-2xl border border-sea/20 bg-sea/10 px-4 py-3 text-sm text-sea">
              <span className="inline-flex items-center gap-2">
                <ShieldCheck size={16} />
                Live identity enabled
              </span>
            </div>
            <button
              onClick={onSignOut}
              className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-steel px-4 py-3 text-sm text-white/80 transition hover:bg-blade hover:text-white"
            >
              <LogOut size={16} />
              Sign Out
            </button>
          </div>
        </div>
        </div>
      </section>
    );
  }

  return (
    <main className="min-h-screen px-4 py-4 text-white lg:px-6 lg:py-6">
      <div className="mx-auto grid min-h-[calc(100vh-2rem)] max-w-[1480px] gap-5 xl:grid-cols-[1.08fr_0.92fr]">
        <section className="relative overflow-hidden rounded-[36px] border border-white/10 bg-gradient-to-br from-[#14060b] via-[#090b12] to-[#06141a] p-8 shadow-panel lg:p-12">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,59,95,0.20),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(123,246,255,0.12),transparent_24%)]" />
          <div className="relative flex h-full flex-col justify-between">
            <div>
              <p className="mb-4 text-xs uppercase tracking-[0.45em] text-ember/80">Nightlink</p>
              <h1 className="max-w-xl font-display text-5xl uppercase leading-[0.92] tracking-[0.08em] text-white lg:text-7xl">
                Enter The Squad Link.
              </h1>
              <p className="mt-5 max-w-xl text-sm leading-7 text-white/55 lg:text-base">
                Private chat and voice for crews, guilds, and late-night teams. Sign in before you
                touch the board.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5">
                <p className="mb-2 text-xs uppercase tracking-[0.28em] text-white/35">Access</p>
                <p className="font-display text-2xl uppercase tracking-[0.08em] text-white">Locked</p>
                <p className="mt-2 text-sm leading-6 text-white/55">
                  No channels, messages, or rooms are shown until you sign in.
                </p>
              </div>
              <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5">
                <p className="mb-2 text-xs uppercase tracking-[0.28em] text-white/35">Identity</p>
                <p className="font-display text-2xl uppercase tracking-[0.08em] text-white">Real</p>
                <p className="mt-2 text-sm leading-6 text-white/55">
                  Messages carry your actual account handle instead of a fake local user.
                </p>
              </div>
              <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5">
                <p className="mb-2 text-xs uppercase tracking-[0.28em] text-white/35">Stack</p>
                <p className="font-display text-2xl uppercase tracking-[0.08em] text-white">Free</p>
                <p className="mt-2 text-sm leading-6 text-white/55">
                  Running on Vercel plus Supabase so you can keep building without paying yet.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="flex items-center">
          <div className="w-full rounded-[36px] border border-white/10 bg-panel/95 p-7 shadow-panel lg:p-9">

            <div className="mb-6">
              <p className="mb-2 text-xs uppercase tracking-[0.35em] text-ember/80">Nightlink Access</p>
              <h2 className="font-display text-3xl uppercase tracking-[0.08em] text-white">
                Sign In
              </h2>
              <p className="mt-3 max-w-md text-sm leading-6 text-white/50">
                Use your Gmail account to unlock Nightlink securely.
              </p>
            </div>

            <div className="space-y-3">
              <button
                onClick={onGoogleSignIn}
                disabled={loading}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-ember px-5 py-3 text-sm font-semibold uppercase tracking-[0.08em] text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-65"
              >
                 {loading ? <LoaderCircle size={16} className="animate-spin" /> : <Mail size={16} />}
                Continue With Google
              </button>
            </div>

            {message ? (
              <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white/72">
                {message}
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}
