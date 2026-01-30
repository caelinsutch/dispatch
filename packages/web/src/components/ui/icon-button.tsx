import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";
import { cn } from "@/lib/utils";

const iconButtonVariants = cva(
  "inline-flex items-center justify-center rounded-md transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "text-muted-foreground hover:text-foreground hover:bg-muted",
        ghost: "text-muted-foreground hover:text-foreground",
        subtle: "text-muted-foreground/70 hover:text-muted-foreground",
      },
      size: {
        sm: "h-7 w-7 [&>svg]:h-3.5 [&>svg]:w-3.5",
        md: "h-8 w-8 [&>svg]:h-4 [&>svg]:w-4",
        lg: "h-9 w-9 [&>svg]:h-5 [&>svg]:w-5",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  }
);

export interface IconButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof iconButtonVariants> {}

export function IconButton({ className, variant, size, ...props }: IconButtonProps) {
  return (
    <button
      type="button"
      className={cn(iconButtonVariants({ variant, size, className }))}
      {...props}
    />
  );
}
