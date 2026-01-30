"use client";

import { Tooltip as BaseTooltip } from "@base-ui-components/react/tooltip";
import type * as React from "react";

import { cn } from "@/lib/utils";

const TooltipProvider = BaseTooltip.Provider;

// Tooltip Root props
interface TooltipProps {
  children: React.ReactNode;
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  delay?: number;
  closeDelay?: number;
  disabled?: boolean;
  hoverable?: boolean;
}

function Tooltip({ children, ...props }: TooltipProps) {
  return <BaseTooltip.Root {...props}>{children}</BaseTooltip.Root>;
}

const TooltipTrigger = BaseTooltip.Trigger;

function TooltipContent({
  className,
  sideOffset = 8,
  children,
  ...props
}: {
  className?: string;
  sideOffset?: number;
  children: React.ReactNode;
}) {
  return (
    <BaseTooltip.Portal>
      <BaseTooltip.Positioner sideOffset={sideOffset}>
        <BaseTooltip.Popup
          className={cn(
            "z-50 rounded-md bg-gray-900 px-3 py-1.5 text-xs text-white",
            "origin-[var(--transform-origin)] transition-[transform,scale,opacity]",
            "data-[starting-style]:scale-90 data-[starting-style]:opacity-0",
            "data-[ending-style]:scale-90 data-[ending-style]:opacity-0",
            className
          )}
          {...props}
        >
          {children}
        </BaseTooltip.Popup>
      </BaseTooltip.Positioner>
    </BaseTooltip.Portal>
  );
}

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };
