import { GuidePageClient } from "@/components/guide/guide-page";

export const metadata = {
  title: "Guide — Timvo",
  description: "Feature guide and instructions for contractors using Timvo.",
};

export default function ContractorGuidePage() {
  return <GuidePageClient defaultTab="contractor" basePath="/guide" />;
}
