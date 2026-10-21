import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const checkboxVariants = cva(
  "inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-md border border-input bg-background text-primary-foreground shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=unchecked]:bg-background",
);

type CheckboxProps = React.InputHTMLAttributes<HTMLInputElement> &
  VariantProps<typeof checkboxVariants> & {
    checked?: boolean;
    onCheckedChange?: (checked: boolean) => void;
  };

function Checkbox({
  className,
  checked,
  onCheckedChange,
  ...props
}: CheckboxProps) {
  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onCheckedChange?.(event.target.checked);
  };

  return (
    <div
      className={cn("inline-flex items-center justify-center", className)}
      role="checkbox"
      aria-checked={checked}
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === " " || event.key === "Enter") {
          event.preventDefault();
          onCheckedChange?.(!checked);
        }
      }}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={handleChange}
        className="sr-only"
        {...props}
      />
      <div
        className={cn(
          checkboxVariants(),
          checked ? "bg-primary" : "bg-background",
        )}
        data-state={checked ? "checked" : "unchecked"}
      />
    </div>
  );
}

export { Checkbox, checkboxVariants };
