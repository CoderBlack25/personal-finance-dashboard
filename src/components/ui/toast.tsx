import * as ToastNamespace from "@base-ui/react/toast";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const Toast = ToastNamespace.Toast;

const ToastProvider = Toast.Provider;

const ToastViewport = Toast.Viewport;

const toastVariants = cva(
  "group pointer-events-auto relative flex w-full items-center justify-between space-x-4 overflow-hidden rounded-md border border-border bg-background p-6 pr-8 shadow-lg transition-all data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)] data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)]",
);

const toastActionVariants = cva(
  "inline-flex items-center justify-center rounded-md border bg-transparent px-3 py-2 text-sm font-medium ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=open]:bg-accent",
);

const toastTitleVariants = cva("text-sm font-semibold");

const toastDescriptionVariants = cva("text-sm text-muted-foreground");

function ToastComponent({
  className,
  ...props
}: React.ComponentProps<typeof Toast.Root> &
  VariantProps<typeof toastVariants>) {
  return <Toast.Root className={cn(toastVariants(), className)} {...props} />;
}

function ToastAction({
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof toastActionVariants>) {
  return <button className={cn(toastActionVariants(), className)} {...props} />;
}

function ToastTitle({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn(toastTitleVariants(), className)} {...props} />;
}

function ToastDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn(toastDescriptionVariants(), className)} {...props} />;
}

export {
  ToastProvider,
  ToastViewport,
  ToastComponent as Toast,
  ToastAction,
  ToastTitle,
  ToastDescription,
  toastVariants,
  toastActionVariants,
  toastTitleVariants,
  toastDescriptionVariants,
};
