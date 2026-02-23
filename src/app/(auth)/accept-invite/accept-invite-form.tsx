"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { acceptInvite } from "@/app/actions/client-invites";

type Props = { token: string; email: string; clientName: string };

export function AcceptInviteForm({ token, email, clientName }: Props) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const { error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { emailRedirectTo: `/client` },
      });

      if (signUpError) {
        if (signUpError.message.includes("already registered")) {
          const { error: signInError } = await supabase.auth.signInWithPassword({
            email: email.trim(),
            password,
          });
          if (signInError) {
            setError(signInError.message);
            setLoading(false);
            return;
          }
        } else {
          setError(signUpError.message);
          setLoading(false);
          return;
        }
      }

      const result = await acceptInvite(token);
      if (result.error) {
        setError(result.error);
        setLoading(false);
        return;
      }

      router.push("/client");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-[var(--bg-card)] backdrop-blur-xl border border-[var(--border)] rounded-xl p-6 shadow-xl">
      <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
        Create your account
      </h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
            Email
          </label>
          <input
            type="email"
            value={email}
            readOnly
            className="w-full px-3 py-2 bg-[var(--bg-app)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] opacity-80 cursor-not-allowed"
          />
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Invite sent for {clientName}
          </p>
        </div>
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
            Password *
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="w-full px-3 py-2 bg-[var(--bg-app)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
            placeholder="••••••••"
          />
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 px-4 bg-accent hover:bg-accent-hover text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Setting up..." : "Set up account"}
        </button>
      </form>
      <p className="mt-4 text-center text-sm text-[var(--text-secondary)]">
        Already have an account?{" "}
        <a href="/login" className="text-accent hover:underline font-medium">
          Sign in
        </a>
      </p>
    </div>
  );
}
