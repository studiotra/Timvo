"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  acceptOrgMemberInvite,
  createOrgMemberFromInvite,
} from "@/app/actions/organizations";

export function AcceptOrgInviteForm({
  token,
  email,
  organizationName,
  roleLabel,
}: {
  token: string;
  email: string;
  organizationName: string;
  roleLabel: string;
}) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const signInHref = `/login?next=${encodeURIComponent(`/accept-org-invite?token=${token}`)}`;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const created = await createOrgMemberFromInvite(token, email, password);
      if (created.error) {
        setError(created.error);
        setLoading(false);
        return;
      }

      const supabase = createClient();
      let signInResult = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      for (let attempt = 0; attempt < 3 && signInResult.error; attempt++) {
        await new Promise((r) => setTimeout(r, 800 + attempt * 400));
        signInResult = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (!signInResult.error) break;
      }
      if (signInResult.error) {
        setError(signInResult.error.message);
        setLoading(false);
        return;
      }

      const accepted = await acceptOrgMemberInvite(token);
      if (accepted.error) {
        setError(accepted.error);
        setLoading(false);
        return;
      }

      router.push("/org");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6 shadow-xl">
      <h2 className="mb-1 text-lg font-semibold text-[var(--text-primary)]">
        Sign up and accept invite
      </h2>
      <p className="mb-4 text-sm text-[var(--text-secondary)]">
        Join {organizationName} as {roleLabel}.
      </p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-[var(--text-secondary)]">
            Email
          </label>
          <input
            type="email"
            value={email}
            readOnly
            className="w-full cursor-not-allowed rounded-lg border border-[var(--border)] bg-[var(--bg-app)] px-3 py-2 text-[var(--text-primary)] opacity-80"
          />
        </div>
        <div>
          <label
            htmlFor="password"
            className="mb-1.5 block text-sm font-medium text-[var(--text-secondary)]"
          >
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-app)] px-3 py-2 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-accent"
            placeholder="••••••••"
          />
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-accent px-4 py-2.5 font-semibold text-white disabled:opacity-50"
        >
          {loading ? "Setting up..." : `Sign up as ${roleLabel}`}
        </button>
      </form>
      <p className="mt-4 text-center text-sm text-[var(--text-secondary)]">
        Already have an account?{" "}
        <Link href={signInHref} className="font-medium text-accent hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
