"use client";

import React from "react";
import { WeaveEngineHeader } from "@/app/(protected)/_components/ui/headers";
import WeaveEngineDashboard from "@/app/(protected)/home/_components/weave-reasonings";

export default function WeaveEnginePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <div className="flex-1 space-y-3 overflow-y-auto">
        <WeaveEngineHeader />
        <WeaveEngineDashboard variant="page" />
      </div>
    </div>
  );
}
