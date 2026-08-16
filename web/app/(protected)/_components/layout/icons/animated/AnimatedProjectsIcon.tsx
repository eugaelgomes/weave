import { cn } from "@/lib/utils";
import React from "react";

export function AnimatedProjectsIcon({ className, ...props }: React.SVGProps<SVGSVGElement>) {
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
      className={cn("lucide lucide-workflow animated-projects-icon", className)}
      {...props}
    >
      <style>
        {`
          .animated-projects-icon .new-node,
          .animated-projects-icon .new-line {
            opacity: 0;
            transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          }
          .animated-projects-icon .new-node {
            transform-origin: 18px 18px;
            transform: scale(0.5);
          }
          .animated-projects-icon .new-line {
            stroke-dasharray: 8;
            stroke-dashoffset: 8;
          }
          
          .group:hover .animated-projects-icon .new-node {
            opacity: 1;
            transform: scale(1);
          }
          .group:hover .animated-projects-icon .new-line {
            opacity: 1;
            stroke-dashoffset: 0;
          }
        `}
      </style>
      <rect width="8" height="8" x="8" y="3" rx="2" />
      <path d="M12 11v1H6v2" />
      <path d="M12 12h6v2" className="new-line" />
      <rect width="8" height="8" x="2" y="14" rx="2" />
      <rect width="8" height="8" x="14" y="14" rx="2" className="new-node" />
    </svg>
  );
}
