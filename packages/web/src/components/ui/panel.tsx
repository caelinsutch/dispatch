"use client";

import { forwardRef } from "react";
import { cn } from "@/lib/utils";

export interface PanelProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "ghost" | "outlined";
  padding?: "none" | "sm" | "md" | "lg";
}

const Panel = forwardRef<HTMLDivElement, PanelProps>(
  ({ className, variant = "default", padding = "md", children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "rounded-md",
          {
            // Variants
            "bg-card border border-border-muted": variant === "default",
            "bg-transparent": variant === "ghost",
            "bg-transparent border border-border": variant === "outlined",
            // Padding
            "p-0": padding === "none",
            "p-2": padding === "sm",
            "p-4": padding === "md",
            "p-6": padding === "lg",
          },
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);
Panel.displayName = "Panel";

export interface PanelHeaderProps extends React.HTMLAttributes<HTMLDivElement> {}

const PanelHeader = forwardRef<HTMLDivElement, PanelHeaderProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("flex items-center justify-between pb-3", className)}
        {...props}
      >
        {children}
      </div>
    );
  }
);
PanelHeader.displayName = "PanelHeader";

export interface PanelTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {}

const PanelTitle = forwardRef<HTMLHeadingElement, PanelTitleProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <h3 ref={ref} className={cn("sidebar-label", className)} {...props}>
        {children}
      </h3>
    );
  }
);
PanelTitle.displayName = "PanelTitle";

export interface PanelContentProps extends React.HTMLAttributes<HTMLDivElement> {}

const PanelContent = forwardRef<HTMLDivElement, PanelContentProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div ref={ref} className={cn("", className)} {...props}>
        {children}
      </div>
    );
  }
);
PanelContent.displayName = "PanelContent";

export { Panel, PanelHeader, PanelTitle, PanelContent };
