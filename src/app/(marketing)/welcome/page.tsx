import type { Metadata } from "next";
import { MarketingLanding } from "@/components/marketing-landing";

export const metadata: Metadata = {
  title: "Timvo — Time tracking for freelancers and agencies",
  description:
    "Track yourself, submit to agencies, and approve contractor time against end-client work. Built for freelancers and the agencies that hire them.",
};

export default function WelcomePage() {
  return <MarketingLanding />;
}
