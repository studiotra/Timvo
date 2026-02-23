import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function ClientPortalPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: accessList } = await supabase
    .from("client_portal_access")
    .select("client_id, clients(id, name)")
    .eq("user_id", user.id);

  const clients = (accessList ?? [])
    .filter((a) => a.clients)
    .map((a) => {
      const c = a.clients as unknown as { id: string; name: string };
      return { id: c.id, name: c.name };
    });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">
          Your clients
        </h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          Select a client to view their time records.
        </p>
      </div>
      {clients.length === 0 ? (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-12 text-center">
          <p className="text-[var(--text-muted)]">
            You don&apos;t have access to any client portals yet.
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          {clients.map((c) => (
            <Link
              key={c.id}
              href={`/client/${c.id}`}
              className="block rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4 hover:bg-white/5 transition-colors"
            >
              <h2 className="font-semibold text-[var(--text-primary)]">{c.name}</h2>
              <p className="text-sm text-[var(--text-secondary)] mt-0.5">
                View time records
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
  }
