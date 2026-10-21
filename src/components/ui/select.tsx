import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const selectVariants = cva(
  "flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
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

type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement> &
  VariantProps<typeof selectVariants> & {
    children: React.ReactNode;
  };

function Select({ className, variant, children, ...props }: SelectProps) {
  return (
    <select className={cn(selectVariants({ variant, className }))} {...props}>
      {children}
    </select>
  );
}

const SelectTrigger = (props: React.HTMLAttributes<HTMLSelectElement>) => (
  <select className="w-full" {...props} />
);

const SelectContent = (props: { children: React.ReactNode }) => (
  <div>{props.children}</div>
);

const SelectItem = (
  props: React.HTMLAttributes<HTMLOptionElement> & {
    children: React.ReactNode;
    value?: string;
  },
) => (
  <option value={props.value} {...props}>
    {props.children}
  </option>
);

const SelectSeparator = (props: React.HTMLAttributes<HTMLHRElement>) => (
  <hr {...props} />
);

const SelectGroup = (
  props: React.HTMLAttributes<HTMLDivElement> & { children: React.ReactNode },
) => <div {...props}>{props.children}</div>;

const SelectLabel = (props: React.HTMLAttributes<HTMLLabelElement>) => (
  <label {...props} />
);

export {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectGroup,
  SelectLabel,
  selectVariants,
};
