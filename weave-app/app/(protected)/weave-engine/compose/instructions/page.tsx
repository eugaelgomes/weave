"use client";

import React, { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { InstructionsWizard } from "@/app/(protected)/weave-engine/compose/_components/instructions-wizard";

export default function ComposeInstructionsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
        </div>
      }
    >
      <InstructionsWizard />
    </Suspense>
  );
}
