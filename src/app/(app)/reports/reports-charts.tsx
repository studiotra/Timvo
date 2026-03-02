"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const CHART_COLORS = [
  "#6366f1", "#10b981", "#f59e0b", "#ec4899", "#8b5cf6",
  "#06b6d4", "#ef4444", "#84cc16",
];

type PeriodRevenue = { period: string; amount: number };
type ClientRevenue = { clientId: string; clientName: string; amount: number };

export function RevenueByClientChart({ data }: { data: ClientRevenue[] }) {
  const chartData = [...data]
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 8)
    .map((d) => ({ name: d.clientName.length > 18 ? d.clientName.slice(0, 15) + "…" : d.clientName, amount: d.amount }));

  if (chartData.length === 0) return null;

  return (
    <div className="h-[280px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} layout="vertical" margin={{ left: 0, right: 20 }}>
          <XAxis type="number" stroke="#6b7280" tick={{ fill: "#9ca3af", fontSize: 11 }} tickFormatter={(v) => `$${v.toLocaleString()}`} />
          <YAxis type="category" dataKey="name" stroke="#6b7280" tick={{ fill: "#9ca3af", fontSize: 11 }} width={100} />
          <Tooltip
            contentStyle={{ backgroundColor: "#1f2937", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px" }}
            labelStyle={{ color: "#f9fafb" }}
            formatter={(value: number | undefined) => [`$${(value ?? 0).toLocaleString()}`, "Revenue"]}
          />
          <Bar dataKey="amount" fill="#6366f1" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function RevenueByPeriodChart({ data }: { data: PeriodRevenue[] }) {
  if (data.length === 0) return null;

  return (
    <div className="h-[220px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
          <XAxis dataKey="period" stroke="#6b7280" tick={{ fill: "#9ca3af", fontSize: 11 }} />
          <YAxis stroke="#6b7280" tick={{ fill: "#9ca3af", fontSize: 11 }} tickFormatter={(v) => `$${v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}`} />
          <Tooltip
            contentStyle={{ backgroundColor: "#1f2937", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px" }}
            formatter={(value: number | undefined) => [`$${(value ?? 0).toLocaleString()}`, "Revenue"]}
          />
          <Bar dataKey="amount" fill="#10b981" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ClientRevenuePieChart({ data }: { data: ClientRevenue[] }) {
  const chartData = [...data]
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 6)
    .map((d) => ({ name: d.clientName.length > 12 ? d.clientName.slice(0, 10) + "…" : d.clientName, value: d.amount }));

  if (chartData.length === 0) return null;

  return (
    <div className="h-[240px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={80}
            paddingAngle={2}
            label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
            labelLine={{ stroke: "#6b7280" }}
          >
            {chartData.map((_, i) => (
              <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{ backgroundColor: "#1f2937", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px" }}
            formatter={(value: number | undefined) => [`$${(value ?? 0).toLocaleString()}`, "Revenue"]}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export function IncomeStabilityChart({ data }: { data: { month: string; amount: number }[] }) {
  if (data.length === 0) return <p className="py-8 text-center text-sm text-[var(--text-muted)]">No paid invoices yet</p>;

  return (
    <div className="h-[200px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
          <XAxis dataKey="month" stroke="#6b7280" tick={{ fill: "#9ca3af", fontSize: 10 }} />
          <YAxis stroke="#6b7280" tick={{ fill: "#9ca3af", fontSize: 11 }} tickFormatter={(v) => `$${v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}`} />
          <Tooltip
            contentStyle={{ backgroundColor: "#1f2937", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px" }}
            formatter={(value: number | undefined) => [`$${(value ?? 0).toLocaleString()}`, "Revenue"]}
          />
          <Bar dataKey="amount" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function GoalsVsRealizedChart({ projected, goal }: { projected: number; goal: number }) {
  const max = Math.max(projected, goal, 1);
  const projectedPct = (projected / max) * 100;
  const goalPct = (goal / max) * 100;

  return (
    <div className="space-y-3">
      <div>
        <div className="flex justify-between text-xs text-[var(--text-muted)] mb-1">
          <span>Projected annual</span>
          <span className="font-mono">${projected.toLocaleString()}</span>
        </div>
        <div className="h-3 rounded-full bg-[var(--bg-app)] overflow-hidden">
          <div
            className="h-full rounded-full bg-indigo-500/70 transition-all"
            style={{ width: `${projectedPct}%` }}
          />
        </div>
      </div>
      <div>
        <div className="flex justify-between text-xs text-[var(--text-muted)] mb-1">
          <span>Annual goal</span>
          <span className="font-mono">${goal.toLocaleString()}</span>
        </div>
        <div className="h-3 rounded-full bg-[var(--bg-app)] overflow-hidden">
          <div
            className="h-full rounded-full bg-emerald-500/70 transition-all"
            style={{ width: `${goalPct}%` }}
          />
        </div>
      </div>
      {projected >= goal ? (
        <p className="text-xs text-emerald-400 font-medium">On track — projected exceeds goal</p>
      ) : (
        <p className="text-xs text-amber-400 font-medium">
          Gap: ${(goal - projected).toLocaleString()} to reach goal
        </p>
      )}
    </div>
  );
}
