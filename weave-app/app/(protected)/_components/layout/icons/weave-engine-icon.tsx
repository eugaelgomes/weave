import { useId, type SVGProps } from "react";
import { cn } from "@/lib/utils";

export type WeaveEngineStatusTone = "stable" | "attention" | "critical";

type WeaveEngineIconProps = SVGProps<SVGSVGElement> & {
  /** When set, tints the cuboid to match engine health (navbar). Default: brand yellow. */
  tone?: WeaveEngineStatusTone;
  /** When true, uses currentColor with opacity layers to create a monochromatic look. */
  monochrome?: boolean;
};

type IconPalette = {
  base: string;
  top: [string, string];
  left: [string, string];
  right: [string, string];
};

const DEFAULT_PALETTE: IconPalette = {
  base: "#FBBF24",
  top: ["#FDE68A", "#FBBF24"],
  left: ["#F59E0B", "#D97706"],
  right: ["#FBBF24", "#F59E0B"],
};

const MONOCHROME_PALETTE: IconPalette = {
  base: "currentColor",
  top: ["currentColor", "currentColor"],
  left: ["currentColor", "currentColor"],
  right: ["currentColor", "currentColor"],
};

const STATUS_PALETTES: Record<WeaveEngineStatusTone, IconPalette> = {
  stable: {
    base: "#22C55E",
    top: ["#86EFAC", "#4ADE80"],
    left: ["#16A34A", "#15803D"],
    right: ["#4ADE80", "#22C55E"],
  },
  attention: {
    base: "#F59E0B",
    top: ["#FDE68A", "#FBBF24"],
    left: ["#D97706", "#B45309"],
    right: ["#FBBF24", "#F59E0B"],
  },
  critical: {
    base: "#EF4444",
    top: ["#FCA5A5", "#F87171"],
    left: ["#DC2626", "#B91C1C"],
    right: ["#F87171", "#EF4444"],
  },
};

/** Isometric cuboid for Weave Engine nav. */
export function WeaveEngineIcon({ className, tone, monochrome = true, ...props }: WeaveEngineIconProps) {
  const uid = useId().replace(/:/g, "");
  const isMonoc = tone ? false : monochrome;
  const palette = tone ? STATUS_PALETTES[tone] : (isMonoc ? MONOCHROME_PALETTE : DEFAULT_PALETTE);

  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={cn("shrink-0", className)}
      fill="none"
      {...props}
    >
      <defs>
        <linearGradient
          id={`${uid}-top`}
          x1="12"
          y1="2.22"
          x2="12"
          y2="10.84"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor={palette.top[0]} />
          <stop offset="1" stopColor={palette.top[1]} />
        </linearGradient>
        <linearGradient
          id={`${uid}-left`}
          x1="5.11"
          y1="10.51"
          x2="11.89"
          y2="18.89"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor={palette.left[0]} />
          <stop offset="1" stopColor={palette.left[1]} />
        </linearGradient>
        <linearGradient
          id={`${uid}-right`}
          x1="18.89"
          y1="10.51"
          x2="12.11"
          y2="18.89"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor={palette.right[0]} />
          <stop offset="1" stopColor={palette.right[1]} />
        </linearGradient>
      </defs>
      <g className="origin-[12px_12px] transition-transform duration-200 ease-out group-hover:-translate-y-0.5 group-hover:scale-[1.06] group-active:translate-y-0 group-active:scale-95 motion-reduce:transform-none">
        <path d="M12 2L4 6V16L12 20L20 16V6L12 2Z" fill={palette.base} opacity={isMonoc ? 0.03 : undefined} />
        <path d="M12 2.22L4.66 6.13L12 10.84L19.34 6.13L12 2.22Z" fill={`url(#${uid}-top)`} opacity={isMonoc ? 0.15 : undefined} />
        <path d="M4 6.44V15.56L11.56 19.34V10.22L4 6.44Z" fill={`url(#${uid}-left)`} opacity={isMonoc ? 0.35 : undefined} />
        <path d="M20 6.44V15.56L12.44 19.34V10.22L20 6.44Z" fill={`url(#${uid}-right)`} opacity={isMonoc ? 0.22 : undefined} />
        <path
          d="M12 2C11.69 2 11.39 2.08 11.12 2.23L3.12 6.23C2.43 6.57 2 7.26 2 8V16C2 16.74 2.43 17.43 3.12 17.77L11.12 21.77C11.39 21.92 11.69 22 12 22C12.31 22 12.61 21.92 12.88 21.77L20.88 17.77C21.57 17.43 22 16.74 22 16V8C22 7.26 21.57 6.57 20.88 6.23L12.88 2.23C12.61 2.08 12.31 2 12 2ZM4 7.56L11 11.06V19.06L4 15.56V7.56ZM12 10.16L5 6.66L12 3.16L19 6.66L12 10.16ZM20 15.56L13 19.06V11.06L20 7.56V15.56Z"
          fill={palette.base}
        />
      </g>
    </svg>
  );
}
