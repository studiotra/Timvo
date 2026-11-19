"use client";

import { useState } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

export function ChangePasswordSection({ email }: { email: string }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    if (password !== confirm) {
      toast.error("New passwords do not match");
      return;
    }
    if (!email || email === "—") {
      toast.error("This account has no email to update");
      return;
    }

    setBusy(true);
    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password: currentPassword,
    });
    if (signInError) {
      setBusy(false);
      toast.error("Current password is incorrect");
      return;
    }

    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }

    setCurrentPassword("");
    setPassword("");
    setConfirm("");
    toast.success("Password updated");
  }

  return (
    <section>
      <div className="mb-3.5 text-[11px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
        Password
      </div>
      <form
        onSubmit={handleSubmit}
        className="space-y-3 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-4"
      >
        <div>
          <label
            htmlFor="current-password"
            className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]"
          >
            Current password
          </label>
          <input
            id="current-password"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
            autoComplete="current-password"
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-app)] px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label
            htmlFor="new-password"
            className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]"
          >
            New password
          </label>
          <input
            id="new-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            autoComplete="new-password"
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-app)] px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label
            htmlFor="confirm-password"
            className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]"
          >
            Confirm new password
          </label>
          <input
            id="confirm-password"
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            minLength={6}
            autoComplete="new-password"
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-app)] px-3 py-2 text-sm"
          />
        </div>
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {busy ? "Updating…" : "Change password"}
        </button>
      </form>
    </section>
  );
}
