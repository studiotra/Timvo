"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setMessage({ type: "success", text: "Password updated. Redirecting..." });
      setTimeout(() => {
        router.push("/");
        router.refresh();
      }, 1500);
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Something went wrong",
      });
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-charcoal px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-white">Reset password</h1>
          <p className="text-gray-400 text-sm mt-1">Enter your new password</p>
        </div>
        <div className="bg-[var(--bg-card)] backdrop-blur-xl border border-[var(--border)] rounded-xl p-6 shadow-xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-400 mb-1.5">
                New password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-3 py-2 bg-charcoal border border-[var(--border)] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
                placeholder="••••••••"
              />
            </div>
            {message && (
              <p
                className={`text-sm ${
                  message.type === "success" ? "text-green-400" : "text-red-400"
                }`}
              >
                {message.text}
              </p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-accent hover:bg-accent-hover text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Updating..." : "Update password"}
            </button>
          </form>
          <p className="mt-4 text-center">
            <Link href="/login" className="text-sm text-accent hover:underline">
              Back to sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
