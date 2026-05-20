"use client";

import React, { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { InsightWizard } from "@/app/(protected)/weave-engine/compose/_components/insight-wizard";

export default function ComposeInsightPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
        </div>
      }
    >
      <InsightWizard />
    </Suspense>
  );
}
