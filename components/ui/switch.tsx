import * as React from "react"

import { cn } from "@/lib/utils"

// A real button with role="switch": keyboard (Space/Enter), label click and screen readers all work.
const Switch = React.forwardRef<
  HTMLButtonElement,
  Omit<React.ComponentProps<"button">, "onChange"> & { checked: boolean; onCheckedChange: (checked: boolean) => void }
>(({ className, checked, onCheckedChange, ...props }, ref) => (
  <button
    ref={ref}
    type="button"
    role="switch"
    aria-checked={checked}
    onClick={() => onCheckedChange(!checked)}
    className={cn(
      "relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full p-0.5 transition-colors duration-150 motion-reduce:transition-none",
      "focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
      checked ? "bg-foreground" : "bg-muted-foreground/40",
      className
    )}
    {...props}
  >
    <span
      aria-hidden
      className={cn(
        "block size-6 rounded-full bg-background shadow-sm transition-transform duration-150 ease-out motion-reduce:transition-none",
        checked ? "translate-x-5" : "translate-x-0"
      )}
    />
  </button>
))
Switch.displayName = "Switch"

export { Switch }
