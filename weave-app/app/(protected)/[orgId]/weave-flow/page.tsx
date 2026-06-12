"use client";

import CanvasView from "@/app/(protected)/[orgId]/weave-flow/_components/CanvasView";

export default function WeaveFlowPage() {
  return (
    <div className="flex min-h-0 w-full flex-1 flex-col">
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <CanvasView />
      </div>
    </div>
  );
}
