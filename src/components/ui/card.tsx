import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const cardVariants = cva(
  "rounded-lg border border-bg-card-border bg-card text-card-foreground shadow-sm",
  {
    variants: {
      variant: {
        default: "border-border",
        elevated: "shadow",
        interactive:
          "border-border hover:bg-accent hover:text-accent-foreground cursor-pointer transition-colors",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

interface CardProps
  extends
    React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {}

function Card({ className, variant, ...props }: CardProps) {
  return (
    <div className={cn(cardVariants({ variant, className }))} {...props} />
  );
}

export { Card, cardVariants };
