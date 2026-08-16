import { cn } from "@/lib/utils";
import React from "react";

export function AnimatedFlowsIcon({ className, ...props }: React.SVGProps<SVGSVGElement>) {
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
      className={cn("lucide lucide-waypoints animated-flows-icon", className)}
      {...props}
    >
      <style>
        {`
          .animated-flows-icon .flow-line {
            transition: stroke-dashoffset 0.5s ease-in-out;
          }
          .animated-flows-icon .flow-line-1 {
            stroke-dasharray: 6;
            stroke-dashoffset: 6;
            transition-delay: 0s;
          }
          .animated-flows-icon .flow-line-2 {
            stroke-dasharray: 10;
            stroke-dashoffset: 10;
            transition-delay: 0.1s;
          }
          .animated-flows-icon .flow-line-3 {
            stroke-dasharray: 6;
            stroke-dashoffset: 6;
            transition-delay: 0.2s;
          }
          
          .group:hover .animated-flows-icon .flow-line {
            stroke-dashoffset: 0 !important;
          }
        `}
      </style>
      <circle cx="12" cy="4.5" r="2.5" />
      <path d="m10.2 6.3-3.9 3.9" className="flow-line flow-line-1" />
      <circle cx="4.5" cy="12" r="2.5" />
      <path d="M7 12h10" className="flow-line flow-line-2" />
      <circle cx="19.5" cy="12" r="2.5" />
      <path d="m13.8 17.7 3.9-3.9" className="flow-line flow-line-3" />
      <circle cx="12" cy="19.5" r="2.5" />
    </svg>
  );
}
