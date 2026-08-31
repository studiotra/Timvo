export type OnboardingVariant = "contractor" | "org";

export type OnboardingStep = {
  id: string;
  title: string;
  body: string;
  bullets?: string[];
  cta?: { label: string; href: string };
  icon: string;
};

export const CONTRACTOR_ONBOARDING: OnboardingStep[] = [
  {
    id: "welcome",
    title: "Welcome to Timvo",
    icon: "👋",
    body: "Timvo is your freelance operating system — track time, invoice clients, and see what you’ve earned in one place.",
    bullets: [
      "One clock across web, Slack, and desktop",
      "Billable logs roll into invoices in a few clicks",
      "Reports show unbilled work and income goals",
    ],
  },
  {
    id: "time",
    title: "Track your time",
    icon: "⏱️",
    body: "Start a timer from the sidebar on any page, or add manual entries on Logs.",
    bullets: [
      "Pick client → project → optional service & task",
      "Mark entries billable before invoicing",
      "Edit or delete logs anytime",
    ],
    cta: { label: "Open Logs", href: "/logs" },
  },
  {
    id: "clients",
    title: "Clients & projects",
    icon: "📁",
    body: "Create clients, then projects with hourly or fixed rates. Everything you track ties back here.",
    bullets: [
      "Set default rates per project",
      "Use retainers and tax settings per client",
      "Share a project with an agency when you work through one",
    ],
    cta: { label: "Add a client", href: "/clients" },
  },
  {
    id: "invoices",
    title: "Invoice & get paid",
    icon: "🧾",
    body: "Turn unbilled time into invoices, send by email, and collect via Stripe payment links.",
    bullets: [
      "Pull billable logs into a draft invoice",
      "Customize footer, terms, and due date in Settings",
      "Clients can pay from a secure link",
    ],
    cta: { label: "View invoices", href: "/invoices" },
  },
  {
    id: "integrations",
    title: "Work from anywhere",
    icon: "🔌",
    body: "Optional tools that keep the same timer running outside the browser.",
    bullets: [
      "Slack — /timvo start and stop without leaving chat",
      "Desktop — menubar timer + full workspace (paid plans)",
      "Agency links — see org-assigned projects in your client list",
    ],
    cta: { label: "Connect Slack", href: "/settings" },
  },
  {
    id: "done",
    title: "You’re set",
    icon: "🎉",
    body: "Explore the dashboard, or open the full guide anytime from the sidebar.",
    bullets: ["Guide → step-by-step reference for every feature"],
    cta: { label: "Open guide", href: "/guide" },
  },
];

export const ORG_ONBOARDING: OnboardingStep[] = [
  {
    id: "welcome",
    title: "Welcome to your agency workspace",
    icon: "🏢",
    body: "Timvo Team is built for agencies that manage clients, staff, and contractors in one place.",
    bullets: [
      "Org-owned clients and projects",
      "Staff time tracking on team work",
      "Contractor invites with controlled access",
    ],
  },
  {
    id: "clients",
    title: "Org clients & projects",
    icon: "📁",
    body: "Create clients under your organization, then projects your team and contractors can log against.",
    bullets: [
      "Services catalog for consistent billing codes",
      "Share work to end clients via the portal when ready",
      "Map contractor projects to org projects",
    ],
    cta: { label: "Org clients", href: "/org/clients" },
  },
  {
    id: "team",
    title: "Team & contractors",
    icon: "👥",
    body: "Invite staff (admin, manager, viewer) and external contractors with project-scoped access.",
    bullets: [
      "Staff see Team clients first in their timer",
      "Contractors keep a solo workspace plus assigned org work",
      "Assignments board shows who’s on what",
    ],
    cta: { label: "Invite contractors", href: "/org/contractors" },
  },
  {
    id: "timesheets",
    title: "Timesheets & approvals",
    icon: "✅",
    body: "Review contractor submissions before they become billable org time.",
    bullets: [
      "Contractors submit weeks from their solo dashboard",
      "Managers approve or send back",
      "Approved time flows into org logs and reports",
    ],
    cta: { label: "Timesheets", href: "/org/timesheets" },
  },
  {
    id: "reports",
    title: "Reports & billing",
    icon: "📊",
    body: "See utilization, unbilled work, and project health across the org.",
    bullets: [
      "Org logs mirror contractor entries on shared projects",
      "Reports help price and staff engagements",
      "Invoice from org context when you’re ready",
    ],
    cta: { label: "Org reports", href: "/org/reports" },
  },
  {
    id: "done",
    title: "You’re set",
    icon: "🎉",
    body: "Your team can start logging time. Keep the agency guide handy for onboarding new staff.",
    cta: { label: "Open agency guide", href: "/guide?tab=agency" },
  },
];

export function stepsForVariant(variant: OnboardingVariant): OnboardingStep[] {
  return variant === "org" ? ORG_ONBOARDING : CONTRACTOR_ONBOARDING;
}
