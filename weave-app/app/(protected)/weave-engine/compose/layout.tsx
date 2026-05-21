"use client";

import React from "react";

export default function ComposeLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="-mx-3 -my-3 flex min-h-0 flex-1 flex-col sm:-mx-4 sm:-my-4">{children}</div>
  );
}
