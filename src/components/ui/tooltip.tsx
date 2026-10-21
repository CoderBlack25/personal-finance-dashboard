import { Tooltip as TooltipNamespace } from "@base-ui/react/tooltip";
import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils";

const Tooltip = TooltipNamespace.Root;
const TooltipTrigger = TooltipNamespace.Trigger;
const TooltipPopup = TooltipNamespace.Popup;

const tooltipContentVariants = cva(
  "relative z-50 max-w-fit rounded-md border border-border bg-popover px-3 py-1.5 text-xs text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
);

function TooltipContent({
  className,
  ...props
}: React.ComponentProps<typeof TooltipPopup>) {
  return (
    <TooltipPopup
      className={cn(tooltipContentVariants(), className)}
      {...props}
    />
  );
}

export { Tooltip, TooltipTrigger, TooltipContent, tooltipContentVariants };
