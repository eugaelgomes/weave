"use client";

import React from "react";
import { FaBook } from "react-icons/fa";

export default function Loading() {
  return (
    <div className="flex h-full min-h-screen w-full flex-col items-center justify-center bg-neutral-950 text-neutral-200">
      <div className="relative mb-8 flex items-center justify-center">
        <div className="absolute h-24 w-24 rounded-full border border-neutral-800 opacity-50"></div>

        <div className="absolute h-24 w-24 animate-spin rounded-full border-2 border-transparent border-t-yellow-500 border-r-yellow-500/30"></div>

        <div className="relative z-10 flex h-16 w-16 animate-pulse items-center justify-center rounded-full bg-neutral-900 shadow-xl shadow-yellow-900/10">
          <FaBook className="h-6 w-6 text-yellow-500" />
        </div>
      </div>

      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-xl font-bold tracking-tight text-neutral-100">
          Weave <span className="text-yellow-500">Notes</span>
        </h1>

        <div className="flex items-center gap-1 text-xs font-medium tracking-widest text-neutral-500 uppercase">
          <span>Carregando</span>
          <span className="animate-bounce delay-75">.</span>
          <span className="animate-bounce delay-150">.</span>
          <span className="animate-bounce delay-300">.</span>
        </div>
      </div>
    </div>
  );
}
