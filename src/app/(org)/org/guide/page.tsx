import { GuidePageClient } from "@/components/guide/guide-page";

export const metadata = {
  title: "Agency guide — Timvo",
  description: "Feature guide and instructions for agencies and teams on Timvo.",
};

export default function OrgGuidePage() {
  return <GuidePageClient defaultTab="agency" basePath="/org/guide" />;
}
