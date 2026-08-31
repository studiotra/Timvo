const integrations = [
  {
    id: "stripe",
    name: "Stripe",
    tagline: "Get paid on invoices",
    body: "Connect your Stripe account once. Every sent invoice can include a Checkout pay link—client payments deposit directly to you.",
    bullets: ["Express Connect onboarding", "Pay links on sent invoices", "Invoices auto-mark paid"],
    accent: "indigo" as const,
    plans: "Solo & Team",
  },
  {
    id: "slack",
    name: "Slack",
    tagline: "Track time where you work",
    body: "Start and stop timers from Slack without switching apps. Same clients, projects, and logs as the web timer.",
    bullets: ["/timvo slash commands", "Start / stop / status", "Syncs with web & desktop"],
    accent: "violet" as const,
    plans: "Solo & Team",
  },
  {
    id: "quickbooks",
    name: "QuickBooks",
    tagline: "Books stay in sync",
    body: "Connect QuickBooks Online in Settings. Sent invoices sync to QBO; when a client pays via Stripe, the payment posts automatically.",
    bullets: ["Invoice sync on send", "Payment sync when paid", "Customer mapping"],
    accent: "emerald" as const,
    plans: "Team",
  },
];

const accentStyles = {
  indigo: {
    border: "border-indigo-400/25",
    bg: "bg-indigo-500/[0.07]",
    label: "text-indigo-300/80",
    dot: "bg-indigo-400",
  },
  violet: {
    border: "border-violet-400/25",
    bg: "bg-violet-500/[0.07]",
    label: "text-violet-300/80",
    dot: "bg-violet-400",
  },
  emerald: {
    border: "border-emerald-400/25",
    bg: "bg-emerald-500/[0.07]",
    label: "text-emerald-300/80",
    dot: "bg-emerald-400",
  },
};

export function MarketingIntegrationsSection({
  compact = false,
}: {
  compact?: boolean;
}) {
  return (
    <section className="relative z-10 px-5 py-16 md:px-10 md:py-20">
      <div className="mx-auto max-w-5xl">
        <div className={`text-center ${compact ? "mb-8" : "mb-10"}`}>
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-indigo-300/70">
            Integrations
          </p>
          <h2
            className="mt-3 text-3xl font-bold tracking-tight text-white md:text-4xl"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            Stripe, Slack, and QuickBooks—built in.
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-[15px] leading-relaxed text-white/50">
            Connect the tools you already use. Track in Slack, invoice with Stripe pay links on Solo+,
            and keep QuickBooks Online in sync on Team—without double entry.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-3 md:gap-6">
          {integrations.map((item) => {
            const style = accentStyles[item.accent];
            return (
              <article
                key={item.id}
                className={`flex flex-col rounded-2xl border ${style.border} ${style.bg} p-5 md:p-6`}
              >
                <p className={`text-[11px] font-bold uppercase tracking-[0.18em] ${style.label}`}>
                  {item.name}
                </p>
                <h3 className="mt-2 text-lg font-semibold text-white">{item.tagline}</h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-white/50">{item.body}</p>
                <ul className="mt-4 space-y-2 text-sm text-white/65">
                  {item.bullets.map((bullet) => (
                    <li key={bullet} className="flex items-start gap-2.5">
                      <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${style.dot}`} />
                      {bullet}
                    </li>
                  ))}
                </ul>
                <p className="mt-4 text-[11px] font-medium uppercase tracking-wide text-white/35">
                  {item.plans}
                </p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export const marketingIntegrationComparisonRows = [
  { feature: "Slack timer commands", free: false, solo: true, team: true },
  { feature: "Stripe Connect & invoice pay links", free: false, solo: true, team: true },
  { feature: "QuickBooks Online invoice sync", free: false, solo: false, team: true },
  { feature: "QuickBooks payment sync (Stripe paid)", free: false, solo: false, team: true },
] as const;
