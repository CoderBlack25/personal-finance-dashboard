import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const inputVariants = cva(
  "flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "",
        error:
          "border-destructive focus-visible:ring-destructive aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

function Input({
  className,
  variant,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> &
  VariantProps<typeof inputVariants>) {
  return (
    <input className={cn(inputVariants({ variant, className }))} {...props} />
  );
}

export { Input, inputVariants };
