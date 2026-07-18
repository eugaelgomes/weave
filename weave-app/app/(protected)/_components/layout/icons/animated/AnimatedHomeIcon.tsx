import { cn } from "@/lib/utils";
import React from "react";

export function AnimatedHomeIcon({ className, ...props }: React.SVGProps<SVGSVGElement>) {
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
      className={cn("lucide lucide-home animated-home-icon", className)}
      {...props}
    >
      <style>
        {`
          .animated-home-icon .home-door {
            transform-origin: 9px 22px;
            transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          }
          .group:hover .animated-home-icon .home-door {
            transform: scaleX(0.3) skewY(12deg);
          }
        `}
      </style>
      <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" className="home-door" />
    </svg>
  );
}
