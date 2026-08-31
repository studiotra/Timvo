"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const ERROR_MESSAGES: Record<string, string> = {
  invalid_invite: "Invalid invite link.",
  invalid_or_expired_invite: "Invite expired or already used.",
  auth_failed: "Login failed. The invite link may have expired.",
  auth: "Authentication error.",
};

export function LoginForm({
  error,
  next,
  signupContractor = false,
}: {
  error: string | null;
  next?: string | null;
  signupContractor?: boolean;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(signupContractor);
  const [loginMode, setLoginMode] = useState<"password" | "magic">("password");
  const [showForgotPw, setShowForgotPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const supabase = createClient();

  const errorMsg = error ? (ERROR_MESSAGES[error] ?? error) : null;

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      if (isSignUp) {
        const { error: err } = await supabase.auth.signUp({ email, password });
        if (err) throw err;
        setMessage({ type: "success", text: "Check your email for the confirmation link." });
      } else {
        const { error: err } = await supabase.auth.signInWithPassword({ email, password });
        if (err) throw err;
        router.push(next || "/");
        router.refresh();
      }
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Something went wrong",
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleMagicLinkSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      const { error: err } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next || "/")}`,
        },
      });
      if (err) throw err;
      setMessage({ type: "success", text: "Check your email for the magic link to sign in." });
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Something went wrong",
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotPassword(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
      });
      if (err) throw err;
      setMessage({ type: "success", text: "Check your email for the password reset link." });
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Something went wrong",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-charcoal px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <a href="/welcome" className="inline-block text-2xl font-bold text-white hover:opacity-90">
            Timvo
          </a>
          <p className="text-gray-400 text-sm mt-1">See what your time is really worth — not just how long you worked.</p>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-3">
          <Link
            href="/login?signup=contractor"
            className={`rounded-xl border px-4 py-4 text-center transition ${
              isSignUp
                ? "border-indigo-500/60 bg-indigo-500/15 shadow-lg shadow-indigo-500/10"
                : "border-[var(--border)] bg-[var(--bg-card)]/50 hover:border-indigo-500/40"
            }`}
          >
            <p className="text-[15px] font-semibold text-white">Contractor</p>
            <p className="mt-1 text-[11px] leading-snug text-gray-400">
              Freelancer or solo business — track time &amp; invoice clients
            </p>
          </Link>
          <Link
            href="/signup/organization"
            className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)]/50 px-4 py-4 text-center transition hover:border-violet-500/40 hover:bg-violet-500/10"
          >
            <p className="text-[15px] font-semibold text-white">Agency</p>
            <p className="mt-1 text-[11px] leading-snug text-gray-400">
              Team workspace — staff, contractors &amp; timesheets
            </p>
          </Link>
        </div>

        <div className="bg-[var(--bg-card)] backdrop-blur-xl border border-[var(--border)] rounded-xl p-6 shadow-xl">
          {(errorMsg || message) && (
            <p
              className={`mb-4 text-sm ${
                errorMsg || message?.type === "error" ? "text-red-400" : "text-green-400"
              }`}
            >
              {errorMsg ?? message?.text}
            </p>
          )}

          {showForgotPw ? (
            <>
              <h2 className="text-lg font-semibold text-white mb-4">Reset password</h2>
              <p className="text-sm text-gray-400 mb-4">
                Enter your email and we&apos;ll send you a link to reset your password.
              </p>
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div>
                  <label htmlFor="forgot-email" className="block text-sm font-medium text-gray-400 mb-1.5">
                    Email
                  </label>
                  <input
                    id="forgot-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-charcoal border border-[var(--border)] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
                    placeholder="you@example.com"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 px-4 bg-accent hover:bg-accent-hover text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? "Sending..." : "Send reset link"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowForgotPw(false)}
                  className="w-full py-2 text-sm text-gray-400 hover:text-white"
                >
                  ← Back to sign in
                </button>
              </form>
            </>
          ) : loginMode === "magic" ? (
            <>
              <h2 className="text-lg font-semibold text-white mb-4">Sign in with magic link</h2>
              <form onSubmit={handleMagicLinkSubmit} className="space-y-4">
                <div>
                  <label htmlFor="magic-email" className="block text-sm font-medium text-gray-400 mb-1.5">
                    Email
                  </label>
                  <input
                    id="magic-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-charcoal border border-[var(--border)] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
                    placeholder="you@example.com"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 px-4 bg-accent hover:bg-accent-hover text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? "Sending..." : "Email me a magic link"}
                </button>
                <button
                  type="button"
                  onClick={() => setLoginMode("password")}
                  className="w-full py-2 text-sm text-gray-400 hover:text-white"
                >
                  Sign in with password instead
                </button>
              </form>
            </>
          ) : (
            <>
              <h2 className="text-lg font-semibold text-white mb-4">
                {isSignUp ? "Sign up as Contractor" : "Sign in"}
              </h2>
              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-400 mb-1.5">
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-charcoal border border-[var(--border)] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
                    placeholder="you@example.com"
                  />
                </div>
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-400 mb-1.5">
                    Password
                  </label>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required={!isSignUp}
                    minLength={6}
                    className="w-full px-3 py-2 bg-charcoal border border-[var(--border)] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
                    placeholder="••••••••"
                  />
                  {!isSignUp && (
                    <button
                      type="button"
                      onClick={() => setShowForgotPw(true)}
                      className="mt-1.5 text-xs text-accent hover:underline"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 px-4 bg-accent hover:bg-accent-hover text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? "Please wait..." : isSignUp ? "Create contractor account" : "Sign in"}
                </button>
                <button
                  type="button"
                  onClick={() => setLoginMode("magic")}
                  className="w-full py-2 text-sm text-gray-400 hover:text-white"
                >
                  Sign in with magic link instead
                </button>
              </form>
              <p className="mt-4 text-center text-sm text-gray-400">
                {isSignUp ? "Already have an account? " : "Don't have an account? "}
                <button
                  type="button"
                  onClick={() => setIsSignUp(!isSignUp)}
                  className="text-accent hover:underline font-medium"
                >
                  {isSignUp ? "Sign in" : "Sign up as contractor"}
                </button>
              </p>
            </>
          )}
        </div>
        <p className="mt-4 text-center text-sm text-gray-500">
          <Link href="/guide" className="text-indigo-400 hover:underline">
            Help center &amp; setup guide
          </Link>
        </p>
      </div>
    </div>
  );
}
