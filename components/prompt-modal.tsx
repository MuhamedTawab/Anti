"use client";

import { useEffect, useRef, useState } from "react";

interface PromptModalProps {
  open: boolean;
  title: string;
  description?: string;
  placeholder?: string;
  confirmLabel?: string;
  onConfirm: (value: string) => void;
  onCancel: () => void;
}

export function PromptModal({
  open,
  title,
  description,
  placeholder = "",
  confirmLabel = "Confirm",
  onConfirm,
  onCancel
}: PromptModalProps) {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset input value each time the modal opens
  useEffect(() => {
    if (open) {
      setValue("");
      setTimeout(() => inputRef.current?.focus(), 60);
    }
  }, [open]);

  function handleKeyDown(event: React.KeyboardEvent) {
    if (event.key === "Enter" && value.trim()) {
      onConfirm(value.trim());
    } else if (event.key === "Escape") {
      onCancel();
    }
  }

  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="prompt-modal-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onCancel}
      />

      {/* Panel */}
      <div className="relative z-10 w-full max-w-md rounded-3xl border border-white/10 bg-[#14141a] px-8 py-7 shadow-2xl">
        <h2
          id="prompt-modal-title"
          className="mb-1 font-display text-lg font-semibold uppercase tracking-[0.08em] text-white"
        >
          {title}
        </h2>

        {description && (
          <p className="mb-5 text-sm leading-relaxed text-white/50">{description}</p>
        )}

        <input
          ref={inputRef}
          id="prompt-modal-input"
          type="text"
          value={value}
          placeholder={placeholder}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          className="mb-5 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/30 outline-none transition focus:border-white/25 focus:bg-white/8"
          autoComplete="off"
        />

        <div className="flex justify-end gap-3">
          <button
            id="prompt-modal-cancel"
            onClick={onCancel}
            className="rounded-2xl border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-medium text-white/60 transition hover:bg-white/10 hover:text-white"
          >
            Cancel
          </button>
          <button
            id="prompt-modal-confirm"
            onClick={() => value.trim() && onConfirm(value.trim())}
            disabled={!value.trim()}
            className="rounded-2xl bg-[#ff3b5f] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#ff5c78] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
