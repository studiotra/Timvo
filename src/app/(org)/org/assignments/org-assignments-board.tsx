"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  mapProjectShare,
  unmapProjectShare,
  type AssignmentBoardData,
  type AssignmentShareRow,
} from "@/app/actions/project-shares";

function ShareCard({
  row,
  draggable,
}: {
  row: AssignmentShareRow;
  draggable?: boolean;
}) {
  return (
    <div
      draggable={draggable}
      onDragStart={(e) => {
        if (!draggable) return;
        e.dataTransfer.setData("text/share-id", row.shareId);
        e.dataTransfer.effectAllowed = "move";
      }}
      className={`rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-3 text-sm ${
        draggable ? "cursor-grab active:cursor-grabbing" : ""
      }`}
    >
      <p className="font-semibold text-[var(--text-primary)]">{row.projectName}</p>
      <p className="mt-0.5 text-xs text-[var(--text-muted)]">
        {row.contractorEmail} · {row.contractorClientName}
      </p>
      <p className="mt-1 text-xs text-[var(--text-secondary)]">{row.hours}h logged</p>
    </div>
  );
}

export function OrgAssignmentsBoard({ data }: { data: AssignmentBoardData }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [dragOverKey, setDragOverKey] = useState<string | null>(null);

  const mappedByTarget = useMemo(() => {
    const map = new Map<string, AssignmentShareRow[]>();
    for (const row of data.mapped) {
      const key = `${row.targetClientId}:${row.targetProjectId}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(row);
    }
    return map;
  }, [data.mapped]);

  async function handleDrop(
    shareId: string,
    targetClientId: string,
    targetProjectId: string
  ) {
    setBusy(true);
    const result = await mapProjectShare(shareId, targetClientId, targetProjectId);
    setBusy(false);
    setDragOverKey(null);
    if (result.error) toast.error(result.error);
    else {
      toast.success("Assigned to end-client project");
      router.refresh();
    }
  }

  async function handleUnmap(shareId: string) {
    setBusy(true);
    const result = await unmapProjectShare(shareId);
    setBusy(false);
    if (result.error) toast.error(result.error);
    else {
      toast.success("Unmapped from end-client project");
      router.refresh();
    }
  }

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold text-[var(--text-primary)]">Assignments</h1>
      <p className="mb-6 text-sm text-[var(--text-secondary)]">
        Map a contractor&apos;s shared project to your end-client project (optional). Time for
        approval lives on{" "}
        <Link href="/org/timesheets" className="text-violet-400 hover:underline">
          Timesheets
        </Link>
        .
      </p>

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <section>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
            Unmapped ({data.unmapped.length})
          </h2>
          <div
            className="min-h-[200px] space-y-2 rounded-xl border border-dashed border-[var(--border)] bg-[var(--bg-card)]/50 p-3"
            onDragOver={(e) => {
              e.preventDefault();
              setDragOverKey("inbox");
            }}
            onDragLeave={() => setDragOverKey(null)}
            onDrop={async (e) => {
              e.preventDefault();
              const shareId = e.dataTransfer.getData("text/share-id");
              if (!shareId) return;
              await handleUnmap(shareId);
            }}
          >
            {data.unmapped.length === 0 ? (
              <p className="p-4 text-center text-xs text-[var(--text-muted)]">
                No unmapped projects. Submitted time still shows on Timesheets.
              </p>
            ) : (
              data.unmapped.map((row) => (
                <ShareCard key={row.shareId} row={row} draggable={!busy} />
              ))
            )}
            {dragOverKey === "inbox" && (
              <p className="text-center text-xs text-violet-400">Drop to unassign</p>
            )}
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
            End clients
          </h2>
          {data.targets.length === 0 ? (
            <p className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-8 text-center text-sm text-[var(--text-muted)]">
              Add an end client and project first, then drop shares here.
            </p>
          ) : (
            data.targets.map((client) => (
              <div
                key={client.clientId}
                className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4"
              >
                <h3 className="mb-3 font-semibold text-[var(--text-primary)]">
                  {client.clientName}
                </h3>
                {client.projects.length === 0 ? (
                  <p className="text-xs text-[var(--text-muted)]">No active projects</p>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {client.projects.map((project) => {
                      const key = `${client.clientId}:${project.id}`;
                      const assigned = mappedByTarget.get(key) ?? [];
                      const isOver = dragOverKey === key;
                      return (
                        <div
                          key={project.id}
                          onDragOver={(e) => {
                            e.preventDefault();
                            setDragOverKey(key);
                          }}
                          onDragLeave={() => setDragOverKey(null)}
                          onDrop={async (e) => {
                            e.preventDefault();
                            const shareId = e.dataTransfer.getData("text/share-id");
                            if (!shareId) return;
                            await handleDrop(shareId, client.clientId, project.id);
                          }}
                          className={`min-h-[100px] rounded-lg border border-dashed p-3 transition-colors ${
                            isOver
                              ? "border-violet-500 bg-violet-500/10"
                              : "border-[var(--border)] bg-[var(--bg-app)]"
                          }`}
                        >
                          <p className="mb-2 text-xs font-semibold text-[var(--text-secondary)]">
                            {project.name}
                          </p>
                          <div className="space-y-2">
                            {assigned.map((row) => (
                              <div key={row.shareId} className="relative">
                                <ShareCard row={row} draggable={!busy} />
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() => handleUnmap(row.shareId)}
                                  className="mt-1 text-[10px] text-red-400 hover:text-red-300"
                                >
                                  Unassign
                                </button>
                              </div>
                            ))}
                            {assigned.length === 0 && (
                              <p className="py-4 text-center text-[11px] text-[var(--text-muted)]">
                                Drop share here
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))
          )}
        </section>
      </div>
    </div>
  );
}
