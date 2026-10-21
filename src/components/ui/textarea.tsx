import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const textareaVariants = cva(
  "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
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

function Textarea({
  className,
  variant,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> &
  VariantProps<typeof textareaVariants>) {
  return (
    <textarea
      className={cn(textareaVariants({ variant, className }))}
      {...props}
    />
  );
}

export { Textarea, textareaVariants };
