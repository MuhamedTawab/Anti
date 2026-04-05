"use client";

import { LoaderCircle, LogOut, ShieldCheck } from "lucide-react";

import type { AuthIdentity } from "@/lib/types";

interface AuthPanelProps {
  mode: "signin" | "signup";
  email: string;
  password: string;
  currentUser: AuthIdentity | null;
  loading: boolean;
  message: string | null;
  onModeChange: (mode: "signin" | "signup") => void;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onSubmit: () => void;
  onSignOut: () => void;
}

export function AuthPanel({
  mode,
  email,
  password,
  currentUser,
  loading,
  message,
  onModeChange,
  onEmailChange,
  onPasswordChange,
  onSubmit,
  onSignOut
}: AuthPanelProps) {
  if (currentUser) {
    return (
      <section className="flex flex-col gap-4 rounded-[28px] border border-white/10 bg-panel/90 px-6 py-5 shadow-panel lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="mb-2 text-xs uppercase tracking-[0.35em] text-sea/80">Authenticated</p>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-ember to-sea font-display text-sm font-bold text-ink">
              {currentUser.name.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <p className="font-display text-2xl uppercase tracking-[0.08em] text-white">
                {currentUser.name}
              </p>
              <p className="text-sm text-white/45">
                {currentUser.handle} · {currentUser.email}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
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
      </section>
    );
  }

  return (
    <section className="rounded-[28px] border border-white/10 bg-panel/90 px-6 py-5 shadow-panel">
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="mb-2 text-xs uppercase tracking-[0.35em] text-ember/80">Pilot Access</p>
          <h2 className="font-display text-2xl uppercase tracking-[0.08em] text-white">
            Sign In To Send Messages
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-white/50">
            Reading works for everyone. Posting now uses a real Supabase user, so your name stays attached
            to your messages.
          </p>
        </div>
        <div className="flex gap-2 rounded-2xl border border-white/10 bg-black/20 p-1">
          <button
            onClick={() => onModeChange("signin")}
            className={`rounded-xl px-4 py-2 text-sm transition ${
              mode === "signin" ? "bg-ember text-white" : "text-white/55 hover:text-white"
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => onModeChange("signup")}
            className={`rounded-xl px-4 py-2 text-sm transition ${
              mode === "signup" ? "bg-ember text-white" : "text-white/55 hover:text-white"
            }`}
          >
            Create Account
          </button>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
        <input
          type="email"
          value={email}
          onChange={(event) => onEmailChange(event.target.value)}
          placeholder="Email"
          className="rounded-2xl border border-white/10 bg-steel px-4 py-3 text-white outline-none placeholder:text-white/35"
        />
        <input
          type="password"
          value={password}
          onChange={(event) => onPasswordChange(event.target.value)}
          placeholder="Password"
          className="rounded-2xl border border-white/10 bg-steel px-4 py-3 text-white outline-none placeholder:text-white/35"
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              onSubmit();
            }
          }}
        />
        <button
          onClick={onSubmit}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-ember px-5 py-3 text-sm font-semibold uppercase tracking-[0.1em] text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-65"
        >
          {loading ? <LoaderCircle size={16} className="animate-spin" /> : null}
          {mode === "signin" ? "Sign In" : "Create"}
        </button>
      </div>

      {message ? (
        <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white/72">
          {message}
        </div>
      ) : null}
    </section>
  );
}
