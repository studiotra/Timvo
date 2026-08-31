"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { signUpOrganization } from "@/app/actions/organizations";

export function OrganizationSignupForm({
  inviteToken,
  inviteEmail,
  contractorName,
  inviteInvalid,
}: {
  inviteToken?: string | null;
  inviteEmail?: string | null;
  contractorName?: string | null;
  inviteInvalid?: boolean;
}) {
  const router = useRouter();
  const [orgName, setOrgName] = useState("");
  const [email, setEmail] = useState(inviteEmail ?? "");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const emailLocked = Boolean(inviteToken && inviteEmail);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const result = await signUpOrganization(orgName, email, password, inviteToken);
    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    setLoading(false);
    if (signInError) {
      setError(signInError.message);
      return;
    }

    router.push("/org");
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-charcoal px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/welcome" className="inline-block text-2xl font-bold text-white hover:opacity-90">
            Timvo
          </Link>
          <h1 className="mt-4 text-xl font-bold text-white">Sign up as Agency</h1>
          <p className="text-gray-400 text-sm mt-2">
            {contractorName
              ? `${contractorName} invited you to manage clients, contractors, and timesheets.`
              : "Team workspace for clients, contractors, and timesheet approvals."}
          </p>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-3">
          <Link
            href="/login?signup=contractor"
            className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)]/50 px-3 py-3 text-center transition hover:border-indigo-500/40"
          >
            <p className="text-[14px] font-semibold text-white">Contractor</p>
            <p className="mt-0.5 text-[10px] text-gray-500">Solo / freelancer</p>
          </Link>
          <div className="rounded-xl border border-violet-500/50 bg-violet-500/15 px-3 py-3 text-center">
            <p className="text-[14px] font-semibold text-white">Agency</p>
            <p className="mt-0.5 text-[10px] text-violet-300">You&apos;re here</p>
          </div>
        </div>
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-6 shadow-xl">
          {inviteInvalid && (
            <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
              This invite link is invalid or expired. You can still create an organization
              account; the contractor can link you later.
            </div>
          )}
          {inviteToken && (
            <div className="mb-4 rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-3 py-2 text-sm text-[var(--text-secondary)]">
              After signup, you&apos;ll be linked to this contractor automatically.
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1.5">
                Organization name
              </label>
              <input
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                required
                className="w-full px-3 py-2 bg-charcoal border border-[var(--border)] rounded-lg text-white"
                placeholder="Agency name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1.5">Work email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                readOnly={emailLocked}
                className="w-full px-3 py-2 bg-charcoal border border-[var(--border)] rounded-lg text-white read-only:opacity-80"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-3 py-2 bg-charcoal border border-[var(--border)] rounded-lg text-white"
              />
            </div>
            {error && <p className="text-sm text-red-400">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-accent hover:bg-accent-hover text-white font-semibold rounded-lg disabled:opacity-50"
            >
              {loading ? "Creating…" : "Create agency account"}
            </button>
          </form>
          <p className="mt-4 text-center text-sm text-gray-400">
            Freelancer or solo contractor?{" "}
            <Link href="/login?signup=contractor" className="text-accent hover:underline font-medium">
              Sign up as Contractor
            </Link>
          </p>
        </div>
        <p className="mt-4 text-center text-sm text-gray-500">
          <Link href="/guide?tab=agency" className="text-indigo-400 hover:underline">
            Agency setup guide
          </Link>
        </p>
      </div>
    </div>
  );
}
