export type GuideSection = {
  id: string;
  title: string;
  summary: string;
  steps: string[];
  tip?: string;
  link?: { label: string; href: string };
};

export const CONTRACTOR_GUIDE: GuideSection[] = [
  {
    id: "start",
    title: "Getting started",
    summary: "Create your workspace and log your first hour.",
    steps: [
      "Open Settings and add your business name, logo, and invoice defaults.",
      "Create a Client, then a Project with an hourly or fixed rate.",
      "Use the sidebar timer or go to Logs → Add manual entry.",
      "When you’re ready to bill, open Invoices → Create from unbilled time.",
    ],
    tip: "Your dashboard shows unbilled total and this week’s hours at a glance.",
    link: { label: "Dashboard", href: "/" },
  },
  {
    id: "time",
    title: "Time tracking",
    summary: "One clock everywhere you work.",
    steps: [
      "Sidebar timer: pick client & project, Start, Stop — entries sync to Logs.",
      "Manual logs: edit duration, description, billable flag, service, and task.",
      "Slack: connect in Settings, then use /timvo start and /timvo stop in DMs.",
      "Desktop (Solo/Team): menubar timer + full workspace; same data as web.",
    ],
    link: { label: "Time logs", href: "/logs" },
  },
  {
    id: "clients",
    title: "Clients & projects",
    summary: "Structure work the way you invoice it.",
    steps: [
      "Clients hold contact info, currency, tax, and optional retainer settings.",
      "Projects belong to a client; set hourly rate or fixed fee per project.",
      "Tasks live under Services — optional tags for detailed reporting.",
      "Share a project to an agency org when you’re on their roster.",
    ],
    link: { label: "Clients", href: "/clients" },
  },
  {
    id: "services",
    title: "Services & rates",
    summary: "Reusable billing codes for your work.",
    steps: [
      "Define services (e.g. Design, Development) with default hourly rates.",
      "Attach services to time entries for clearer invoices.",
      "Reports use service breakdowns for effective-rate insights.",
    ],
    link: { label: "Services", href: "/services" },
  },
  {
    id: "invoices",
    title: "Invoices & payments",
    summary: "From tracked time to paid invoice.",
    steps: [
      "Create invoice → select client → pull unbilled billable logs.",
      "Edit line items, tax, footer, and payment terms before sending.",
      "Email the invoice; client pays via Stripe link on the public invoice page.",
      "Mark paid manually if you receive payment offline.",
    ],
    link: { label: "Invoices", href: "/invoices" },
  },
  {
    id: "reports",
    title: "Reports & goals",
    summary: "Know what you’ve earned and what’s still unbilled.",
    steps: [
      "Dashboard: unbilled total, week heatmap, income vs goal.",
      "Reports: revenue by client/project, effective hourly rate.",
      "Set target hourly rate and annual income goal in Settings.",
    ],
    link: { label: "Reports", href: "/reports" },
  },
  {
    id: "portal",
    title: "Client portal",
    summary: "Let clients see their project time (read-only).",
    steps: [
      "From a client, invite them to the portal by email.",
      "They sign in and see shared projects and time — no editing.",
      "Useful for retainers and transparency without sending PDFs.",
    ],
  },
  {
    id: "agency",
    title: "Working with agencies",
    summary: "When an org assigns you work.",
    steps: [
      "Accept org contractor invite from email or Settings → Agency connections.",
      "Assigned projects appear as Org · Client in your timer and client list.",
      "Submit timesheets to the org when they request weekly approval.",
      "Your solo clients and org work stay separate but share one login.",
    ],
    link: { label: "Settings → Agencies", href: "/settings" },
  },
];

export const ORG_GUIDE: GuideSection[] = [
  {
    id: "start",
    title: "Agency workspace overview",
    summary: "How Team mode differs from solo freelancer mode.",
    steps: [
      "Org dashboard is home for agency-owned clients and internal reporting.",
      "Staff roles: Owner, Admin, Manager, Viewer — set in Settings → Team.",
      "Contractors are external; they keep a solo Timvo account linked to you.",
      "Dual-role users can switch between /org and solo / via the banner link.",
    ],
    link: { label: "Org dashboard", href: "/org" },
  },
  {
    id: "clients",
    title: "Org clients & projects",
    summary: "Centralize client work under your organization.",
    steps: [
      "Create clients under the org — not tied to one person’s solo account.",
      "Add projects with rates; org staff log time against team clients.",
      "Services catalog keeps billing codes consistent across projects.",
      "Share selected work to end clients via portal when appropriate.",
    ],
    link: { label: "Org clients", href: "/org/clients" },
  },
  {
    id: "staff",
    title: "Staff time tracking",
    summary: "Employees and managers on payroll.",
    steps: [
      "Invite team members with admin/manager/viewer roles.",
      "Staff use the sidebar timer with Team clients filtered first.",
      "Org Logs show all staff entries on org projects.",
      "Managers review utilization in Org Reports.",
    ],
    link: { label: "Org logs", href: "/org/logs" },
  },
  {
    id: "contractors",
    title: "Contractors & invites",
    summary: "Bring freelancers onto specific projects.",
    steps: [
      "Org → Contractors → invite by email.",
      "Assign projects; contractor sees them as Org · Client in their timer.",
      "Contractors submit timesheets; you approve in Timesheets.",
      "Map contractor project names to org projects for clean reporting.",
    ],
    link: { label: "Contractors", href: "/org/contractors" },
  },
  {
    id: "timesheets",
    title: "Timesheets & approvals",
    summary: "Weekly submit → review → approved org time.",
    steps: [
      "Contractors submit a week from their solo dashboard.",
      "Managers open Timesheets, approve or request changes.",
      "Approved entries count as org billable time in logs and reports.",
    ],
    link: { label: "Timesheets", href: "/org/timesheets" },
  },
  {
    id: "assignments",
    title: "Assignments board",
    summary: "See who is staffed on which engagement.",
    steps: [
      "Assignments link contractors and staff to active projects.",
      "Useful for capacity planning and handoffs.",
      "Update when projects start, pause, or complete.",
    ],
    link: { label: "Assignments", href: "/org/assignments" },
  },
  {
    id: "reports",
    title: "Org reports",
    summary: "Agency-wide visibility.",
    steps: [
      "Track billable vs non-billable across the org.",
      "Compare projects and clients for margin decisions.",
      "Export insights for finance and account management.",
    ],
    link: { label: "Org reports", href: "/org/reports" },
  },
  {
    id: "settings",
    title: "Org settings",
    summary: "Profile, team, and preferences.",
    steps: [
      "Org profile: name, branding used in contractor-facing emails.",
      "Team: invite, change roles, remove members.",
      "Personal prefs: timezone and locale for each staff user.",
    ],
    link: { label: "Org settings", href: "/org/settings" },
  },
];

export const CONTRACTOR_FAQ = [
  {
    q: "Can I use Timvo for free?",
    a: "Yes — the Free plan includes limited clients and projects. Paid Solo and Team plans unlock invoices, Slack, and desktop.",
  },
  {
    q: "What happens when I join an agency?",
    a: "You keep your solo workspace. Org-assigned projects appear alongside your own clients in the timer.",
  },
  {
    q: "How do I restart the setup tour?",
    a: "Open Guide in the sidebar and click Restart setup tour. The interactive walkthrough will appear again on your next page load.",
  },
];

export const ORG_FAQ = [
  {
    q: "How many seats are included on Team?",
    a: "Team includes 3 seats (owner + 2). Add extra seats on the pricing page when billing launches.",
  },
  {
    q: "Can contractors see our other clients?",
    a: "No — contractors only see projects explicitly assigned to them.",
  },
  {
    q: "Do contractors need their own Timvo account?",
    a: "Yes. They sign up (or sign in) and accept your invite; work syncs via project shares and timesheets.",
  },
];
