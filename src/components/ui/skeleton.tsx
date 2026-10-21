import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const skeletonVariants = cva("animate-pulse rounded-md bg-muted");

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement> &
  VariantProps<typeof skeletonVariants>) {
  return <div className={cn(skeletonVariants(), className)} {...props} />;
}

export { Skeleton, skeletonVariants };
