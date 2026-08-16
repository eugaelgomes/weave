"use client";

import React from "react";

interface NoteDetailBodyProps {
  children: React.ReactNode;
}

export function NoteDetailBody({ children }: NoteDetailBodyProps) {
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden">
      <div className="no-scrollbar flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden overflow-y-visible">
        {children}
      </div>
    </div>
  );
}
