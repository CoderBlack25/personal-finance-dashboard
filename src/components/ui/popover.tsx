import { Popover as PopoverNamespace } from "@base-ui/react/popover";
import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils";

const Popover = PopoverNamespace.Root;
const PopoverTrigger = PopoverNamespace.Trigger;
const PopoverPopup = PopoverNamespace.Popup;

const popoverContentVariants = cva(
  "z-50 w-72 rounded-lg border border-border bg-popover p-4 text-popover-foreground shadow-lg outline-none",
);

function PopoverContent({
  className,
  ...props
}: React.ComponentProps<typeof PopoverPopup>) {
  return (
    <PopoverPopup
      className={cn(popoverContentVariants(), className)}
      {...props}
    />
  );
}

export { Popover, PopoverTrigger, PopoverContent, popoverContentVariants };
