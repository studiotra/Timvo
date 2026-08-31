import { MarketingNav } from "@/components/marketing-nav";

export function GuidePublicShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#0a0e17] text-[#f4f6fb]">
      <div
        className="pointer-events-none absolute inset-0 opacity-90"
        aria-hidden
        style={{
          background:
            "radial-gradient(ellipse 70% 45% at 50% -5%, rgba(99,102,241,0.2), transparent 55%), linear-gradient(180deg, #0a0e17 0%, #0d1424 45%, #0a0e17 100%)",
        }}
      />
      <MarketingNav active="guide" />
      <main className="relative z-10 mx-auto max-w-4xl px-4 py-8 md:px-6 md:py-10">{children}</main>
    </div>
  );
}
