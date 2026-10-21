import { Dialog } from "@base-ui/react/dialog";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const DialogRoot = Dialog.Root;
const DialogTrigger = Dialog.Trigger;
const DialogPopup = Dialog.Popup;
const DialogDescription = Dialog.Description;
const DialogTitle = Dialog.Title;
const DialogClose = Dialog.Close;

const dialogContentVariants = cva(
  "z-50 grid gap-1 rounded-lg border border-border bg-card p-6 text-left shadow-lg sm:rounded-xl",
);

function DialogContent({
  className,
  ...props
}: React.ComponentProps<typeof DialogPopup> &
  VariantProps<typeof dialogContentVariants>) {
  return (
    <DialogPopup
      className={cn(dialogContentVariants(), className)}
      {...props}
    />
  );
}

function DialogTitleStyled({
  className,
  ...props
}: React.ComponentProps<typeof DialogTitle>) {
  return (
    <DialogTitle
      className={cn(
        "text-lg font-semibold leading-none tracking-tight",
        className,
      )}
      {...props}
    />
  );
}

function DialogDescriptionStyled({
  className,
  ...props
}: React.ComponentProps<typeof DialogDescription>) {
  return (
    <DialogDescription
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  );
}

export {
  DialogRoot as Dialog,
  DialogTrigger,
  DialogContent,
  DialogTitleStyled as DialogTitle,
  DialogDescriptionStyled as DialogDescription,
  DialogClose,
  dialogContentVariants,
};
