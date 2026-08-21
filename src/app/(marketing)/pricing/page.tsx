import type { Metadata } from "next";
import { PricingPageContent } from "@/components/pricing-page";

export const metadata: Metadata = {
  title: "Pricing — Timvo",
  description:
    "Solo for freelancers. Team for agencies. Simple time tracking with invoicing and contractor approval workflows.",
};

export default function PricingPage() {
  return <PricingPageContent />;
}
