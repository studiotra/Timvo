import Link from "next/link";

export type MarketingNavActive = "product" | "guide" | "pricing" | "download";

const NAV_LINKS: { id: MarketingNavActive; href: string; label: string }[] = [
  { id: "product", href: "/welcome", label: "Product" },
  { id: "guide", href: "/guide", label: "Guide" },
  { id: "pricing", href: "/pricing", label: "Pricing" },
  { id: "download", href: "/download", label: "Desktop app" },
];

export function MarketingNav({ active }: { active?: MarketingNavActive }) {
  return (
    <header className="relative z-20 flex items-center justify-between px-5 py-5 md:px-10">
      <Link href="/welcome" className="flex items-center gap-2.5">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-400 to-indigo-600 text-sm font-bold text-white shadow-lg shadow-indigo-500/30">
          T
        </span>
        <span
          className="text-xl font-semibold tracking-tight text-white"
          style={{ fontFamily: "var(--font-serif)" }}
        >
          Timvo
        </span>
      </Link>
      <nav className="flex items-center gap-4 md:gap-6">
        {NAV_LINKS.map(({ id, href, label }) => (
          <Link
            key={id}
            href={href}
            className={`hidden text-sm font-medium transition sm:inline ${
              active === id ? "text-white" : "text-white/55 hover:text-white"
            }`}
          >
            {label}
          </Link>
        ))}
        <Link
          href="/login"
          className="hidden text-sm font-medium text-white/60 transition hover:text-white sm:inline"
        >
          Sign in
        </Link>
        <Link
          href="/login"
          className="rounded-lg bg-white/10 px-3.5 py-2 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/15"
        >
          Get started
        </Link>
      </nav>
    </header>
  );
}
