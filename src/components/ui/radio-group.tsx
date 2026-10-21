import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const radioGroupVariants = cva("inline-flex items-center gap-4 text-sm");

const radioGroupItemVariants = cva(
  "h-4 w-4 shrink-0 rounded-full border border-input accent-primary transition-[color,box-shadow] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
);

type RadioGroupProps = React.ComponentProps<"div"> &
  VariantProps<typeof radioGroupVariants>;

function RadioGroup({ className, ...props }: RadioGroupProps) {
  return (
    <div
      role="radiogroup"
      className={cn(radioGroupVariants(), className)}
      {...props}
    />
  );
}

type RadioGroupItemProps = Omit<React.ComponentProps<"input">, "type"> &
  VariantProps<typeof radioGroupItemVariants>;

function RadioGroupItem({ className, ...props }: RadioGroupItemProps) {
  return (
    <input
      type="radio"
      className={cn(radioGroupItemVariants(), className)}
      {...props}
    />
  );
}

export {
  RadioGroup,
  RadioGroupItem,
  radioGroupVariants,
  radioGroupItemVariants,
};
