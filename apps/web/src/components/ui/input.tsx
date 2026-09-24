import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export const controlClasses =
  "flex w-full rounded-md border border-input bg-card px-3 text-base shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/30 sm:text-sm";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(controlClasses, "h-10 py-2", className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={cn(controlClasses, "min-h-20 py-2", className)} {...props} />;
}

/** Native select: best experience on phones, where most of our users are. */
export function Select({ className, ...props }: ComponentProps<"select">) {
  return <select className={cn(controlClasses, "h-10 appearance-auto py-2", className)} {...props} />;
}

export function Label({ className, ...props }: ComponentProps<"label">) {
  return <label className={cn("text-sm font-medium leading-none", className)} {...props} />;
}
