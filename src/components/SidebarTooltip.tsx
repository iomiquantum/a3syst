import { ReactNode, useState } from "react";
import { cn } from "@/lib/utils";

interface SidebarTooltipProps {
  label: string;
  show: boolean;
  children: ReactNode;
}

const SidebarTooltip = ({ label, show, children }: SidebarTooltipProps) => {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className="relative"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {children}
      {show && hovered && (
        <div
          className={cn(
            "absolute left-full top-1/2 -translate-y-1/2 ml-2 z-50",
            "px-2.5 py-1.5 rounded-md text-xs font-medium whitespace-nowrap",
            "bg-popover text-popover-foreground shadow-md border border-border",
            "animate-scale-in origin-left"
          )}
        >
          {label}
        </div>
      )}
    </div>
  );
};

export default SidebarTooltip;
