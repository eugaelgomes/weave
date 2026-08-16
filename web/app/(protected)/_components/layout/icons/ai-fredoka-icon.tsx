import { type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export const AiFredokaIcon = ({ className, ...props }: HTMLAttributes<HTMLSpanElement>) => {
  return (
    <span
      className={cn(
        "font-fredoka flex items-center justify-center text-[13px] leading-none font-bold tracking-tighter select-none",
        className
      )}
      {...props}
    >
      AI
    </span>
  );
};
