import { cn } from "@/lib/utils";
import React from "react";

export function AnimatedNotesIcon({ className, ...props }: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("lucide lucide-file-text animated-notes-icon", className)}
      {...props}
    >
      <style>
        {`
          .animated-notes-icon .doc-line {
            transition: stroke-dashoffset 0.4s ease-out;
          }
          .animated-notes-icon .doc-line-1 { transition-delay: 0s; }
          .animated-notes-icon .doc-line-2 { transition-delay: 0.1s; }
          .animated-notes-icon .doc-line-3 { transition-delay: 0.2s; }
          
          .group:hover .animated-notes-icon .doc-line {
            stroke-dashoffset: 0 !important;
          }
        `}
      </style>
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
      <path d="M14 2v4a2 2 0 0 0 2 2h4" />
      <path d="M8 9h2" className="doc-line doc-line-1" style={{ strokeDasharray: 2, strokeDashoffset: 2 }} />
      <path d="M8 13h8" className="doc-line doc-line-2" style={{ strokeDasharray: 8, strokeDashoffset: 8 }} />
      <path d="M8 17h8" className="doc-line doc-line-3" style={{ strokeDasharray: 8, strokeDashoffset: 8 }} />
    </svg>
  );
}
