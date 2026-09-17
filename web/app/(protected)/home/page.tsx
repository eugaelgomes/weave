"use client";

import React from "react";
import FigmaBoard from "./_components/figma-board";

export default function HomePage() {
  return (
    <div className="relative flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden">
      <FigmaBoard />
    </div>
  );
}
