"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { signUpOrganization } from "@/app/actions/organizations";

export function OrganizationSignupForm() {
  const router = useRouter();
  const [orgName, setOrgName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const result = await signUpOrganization(orgName, email, password);
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
          <h1 className="text-2xl font-bold text-white">Timvo for Organizations</h1>
          <p className="text-gray-400 text-sm mt-2">
            Manage clients, contractors, and timesheet approvals in one place.
          </p>
        </div>
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-6 shadow-xl">
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
                className="w-full px-3 py-2 bg-charcoal border border-[var(--border)] rounded-lg text-white"
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
              {loading ? "Creating…" : "Create organization account"}
            </button>
          </form>
          <p className="mt-4 text-center text-sm text-gray-400">
            Freelancer or solo contractor?{" "}
            <Link href="/login" className="text-accent hover:underline">
              Sign up as contractor
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
