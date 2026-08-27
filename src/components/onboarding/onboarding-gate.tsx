"use client";

import { useEffect, useState } from "react";
import { OnboardingWizard } from "./onboarding-wizard";
import type { OnboardingVariant } from "@/lib/onboarding/steps";

type Props = {
  show: boolean;
  variant: OnboardingVariant;
  displayName?: string;
  children: React.ReactNode;
};

export function OnboardingGate({ show, variant, displayName, children }: Props) {
  const [open, setOpen] = useState(show);

  useEffect(() => {
    if (show) setOpen(true);
  }, [show]);

  return (
    <>
      {children}
      {open && (
        <OnboardingWizard
          variant={variant}
          displayName={displayName}
          onDismiss={() => setOpen(false)}
        />
      )}
    </>
  );
}
