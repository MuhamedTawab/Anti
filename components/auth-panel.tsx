"use client";

import { useState } from "react";
import { 
  KeyRound, 
  LoaderCircle, 
  LogOut, 
  Mail, 
  ShieldCheck, 
  User, 
  Camera, 
  AtSign, 
  Type, 
  Check, 
  Globe 
} from "lucide-react";
import clsx from "clsx";

import { useNightlink } from "@/lib/context";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

export function AuthPanel() {
  const {
    currentUser,
    authLoading: loading,
    authMessage: message,
    setAuthMessage,
    profileName,
    profileHandle,
    profileAvatarUrl,
    profileBio,
    handleProfileNameChange,
    handleProfileHandleChange,
    handleProfileAvatarUrlChange,
    handleProfileBioChange,
    handleSaveProfile,
    getAuthHeaders // If needed for logout
  } = useNightlink();

  const [isEditingProfile, setIsEditingProfile] = useState(false);

  const handleGoogleSignIn = async () => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin + "/api/auth/callback"
      }
    });
  };

  const handleSignOut = async () => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    await supabase.auth.signOut();
    window.location.reload();
  };

  if (!currentUser) {
    return (
      <div className="rounded-3xl border border-white/5 bg-gradient-to-br from-[#1e1f22] to-[#111214] p-8 shadow-2xl animate-in zoom-in-95 duration-500">
        <div className="space-y-6">
          <div className="flex flex-col items-center text-center space-y-2">
            <div className="h-16 w-16 rounded-3xl bg-[#ff3b5f]/10 flex items-center justify-center text-[#ff3b5f] mb-2">
              <ShieldCheck size={32} />
            </div>
            <h2 className="text-2xl font-black tracking-tight text-white uppercase">Identity Required</h2>
            <p className="text-sm text-[#9da0a7] font-medium leading-relaxed">
              To join the Nightlink network, you must authenticate through a verified provider.
            </p>
          </div>

          <div className="space-y-3">
            <button
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="group relative flex w-full items-center justify-center gap-4 rounded-2xl bg-white py-4 text-sm font-black text-black transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
            >
              <Globe size={20} className="text-[#4285F4]" />
              <span>Connect with Google</span>
              {loading && <LoaderCircle size={18} className="animate-spin ml-2" />}
            </button>
            
            <button
              disabled
              className="flex w-full items-center justify-center gap-4 rounded-2xl bg-white/5 border border-white/5 py-4 text-sm font-bold text-[#9da0a7] opacity-40 cursor-not-allowed"
            >
              <Mail size={18} />
              <span>Continue with Discord</span>
            </button>
          </div>

          {message && (
            <div className="rounded-xl bg-[#da373c]/10 p-3 text-center border border-[#da373c]/20 animate-in fade-in">
              <p className="text-[10px] font-black uppercase tracking-widest text-[#da373c]">{message}</p>
            </div>
          )}

          <div className="pt-4 border-t border-white/5">
             <p className="text-[10px] font-bold text-[#9da0a7] uppercase tracking-[0.2em] text-center opacity-40">
                End-to-End Encrypted Identity Protocol v2.4
             </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <section className="flex flex-col gap-6 rounded-3xl border border-white/5 bg-[#1e1f22] p-8 shadow-2xl animate-in slide-in-from-top-4 duration-500">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="relative group">
               <div className="h-20 w-20 overflow-hidden rounded-[24px] bg-gradient-to-br from-[#ff3b5f] to-[#ff8a5b] p-0.5 shadow-xl transition-transform group-hover:scale-105">
                 <div className="h-full w-full rounded-[22px] bg-[#1e1f22] flex items-center justify-center overflow-hidden">
                   {currentUser.avatarUrl ? (
                     <img src={currentUser.avatarUrl} alt={currentUser.name} className="h-full w-full object-cover transition-transform group-hover:scale-110" />
                   ) : (
                     <span className="text-2xl font-black text-white/20">{currentUser.name.slice(0, 1).toUpperCase()}</span>
                   )}
                 </div>
               </div>
               <div className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-[#23a559] border-4 border-[#1e1f22]" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-2xl font-black text-white uppercase tracking-tight leading-none">{currentUser.name}</h2>
                <div className="px-1.5 py-0.5 rounded bg-[#ff3b5f]/10 text-[#ff3b5f] text-[9px] font-black uppercase tracking-widest border border-[#ff3b5f]/20">Pro</div>
              </div>
              <p className="text-sm font-bold text-[#9da0a7] tracking-tight">{currentUser.handle}</p>
              <div className="mt-2 flex items-center gap-3 text-[10px] font-bold text-[#23a559] uppercase tracking-widest opacity-80">
                 <div className="h-1.5 w-1.5 rounded-full bg-[#23a559] animate-pulse" />
                 Encrypted Tunnel Online
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsEditingProfile((prev) => !prev)}
              className={clsx(
                "flex h-11 items-center gap-2 px-5 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
                isEditingProfile ? "bg-[#ff3b5f] text-white shadow-lg shadow-[#ff3b5f]/20" : "bg-white/5 text-[#9da0a7] hover:bg-white/10 hover:text-white"
              )}
            >
              <KeyRound size={16} />
              {isEditingProfile ? "Done" : "Identity Settings"}
            </button>
            <button
              onClick={handleSignOut}
              className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/5 text-[#9da0a7] transition-all hover:bg-[#da373c]/10 hover:text-[#da373c] hover:border-[#da373c]/30 border border-transparent"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </section>

      {isEditingProfile && (
        <section className="rounded-3xl border border-white/5 bg-[#1e1f22] p-8 shadow-2xl animate-in slide-in-from-top-4 duration-300">
          <div className="flex items-center gap-3 mb-8">
             <div className="p-2 rounded-xl bg-[#ff3b5f]/10 text-[#ff3b5f]">
                <User size={20} />
             </div>
             <div>
                <h3 className="text-sm font-black text-white uppercase tracking-widest">Metadata Profile</h3>
                <p className="text-[10px] font-bold text-[#9da0a7] uppercase tracking-widest opacity-50">Global identity settings</p>
             </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[#9da0a7]">
                  <Type size={12} /> Display Name
                </label>
                <input
                  value={profileName}
                  onChange={(e) => handleProfileNameChange(e.target.value)}
                  className="w-full rounded-2xl bg-black/40 px-5 py-3.5 text-sm font-bold text-white transition-all focus:bg-black/60 focus:outline-none focus:ring-2 focus:ring-[#ff3b5f]/30"
                />
              </div>
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[#9da0a7]">
                  <AtSign size={12} /> Global Handle
                </label>
                <input
                  value={profileHandle}
                  onChange={(e) => handleProfileHandleChange(e.target.value)}
                  className="w-full rounded-2xl bg-black/40 px-5 py-3.5 text-sm font-bold text-white transition-all focus:bg-black/60 focus:outline-none focus:ring-2 focus:ring-[#ff3b5f]/30"
                />
              </div>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[#9da0a7]">
                  <Camera size={12} /> Avatar Metadata (URL)
                </label>
                <input
                  value={profileAvatarUrl}
                  onChange={(e) => handleProfileAvatarUrlChange(e.target.value)}
                  className="w-full rounded-2xl bg-black/40 px-5 py-3.5 text-sm font-bold text-white transition-all focus:bg-black/60 focus:outline-none focus:ring-2 focus:ring-[#ff3b5f]/30"
                />
              </div>
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[#9da0a7]">
                  <KeyRound size={12} /> Identity Summary (Bio)
                </label>
                <textarea
                  value={profileBio}
                  onChange={(e) => handleProfileBioChange(e.target.value)}
                  className="w-full h-24 rounded-2xl bg-black/40 px-5 py-3.5 text-sm font-medium text-white transition-all focus:bg-black/60 focus:outline-none focus:ring-2 focus:ring-[#ff3b5f]/30 resize-none"
                />
              </div>
            </div>
          </div>

          <div className="mt-8 flex items-center justify-between pt-6 border-t border-white/5">
            <div className="flex items-center gap-3">
               {loading ? (
                 <LoaderCircle size={20} className="animate-spin text-[#ff3b5f]" />
               ) : (
                 <div className="flex h-5 w-5 items-center justify-center rounded-full bg-white/5 text-[#9da0a7]">
                    <ShieldCheck size={12} />
                 </div>
               )}
               <p className="text-[10px] font-bold text-[#9da0a7] uppercase tracking-widest opacity-50">
                  {message || "Protocol version matches server"}
               </p>
            </div>
            <button
              onClick={handleSaveProfile}
              disabled={loading}
              className="group flex items-center gap-3 rounded-2xl bg-gradient-to-r from-[#ff3b5f] to-[#ff8a5b] px-10 py-4 font-black uppercase text-xs tracking-widest text-white shadow-xl shadow-[#ff3b5f]/20 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-30"
            >
              <Check size={16} /> Update Identity
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
