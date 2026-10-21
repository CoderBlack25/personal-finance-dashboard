import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const alertVariants = cva(
  "relative w-full rounded-lg border px-4 py-3 text-sm [&>svg]:absolute [&>svg]:left-3.5 [&>svg]:top-3.5 [&>svg]:text-current [&>svg+p]:pl-8",
  {
    variants: {
      variant: {
        default: "border-border bg-background text-foreground",
        destructive: "border-destructive/50 bg-destructive/5 text-destructive",
        success: "border-success/50 bg-success/5 text-success-foreground",
        warning: "border-warning/50 bg-warning/5 text-warning-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

const alertTitleVariants = cva("text-sm font-medium");

const alertDescriptionVariants = cva("text-sm");

interface AlertProps
  extends
    React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof alertVariants> {}

function Alert({ className, variant, ...props }: AlertProps) {
  return (
    <div
      role="alert"
      className={cn(alertVariants({ variant, className }))}
      {...props}
    />
  );
}

interface AlertTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  className?: string;
}

function AlertTitle({ className, ...props }: AlertTitleProps) {
  return <h3 className={cn(alertTitleVariants(), className)} {...props} />;
}

interface AlertDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {
  className?: string;
}

function AlertDescription({ className, ...props }: AlertDescriptionProps) {
  return <p className={cn(alertDescriptionVariants(), className)} {...props} />;
}

export { Alert, AlertTitle, AlertDescription, alertVariants };
