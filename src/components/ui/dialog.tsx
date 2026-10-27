import { Dialog } from "@base-ui/react/dialog";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const DialogRoot = Dialog.Root;
const DialogTrigger = Dialog.Trigger;
const DialogPopup = Dialog.Popup;
const DialogDescription = Dialog.Description;
const DialogTitle = Dialog.Title;
const DialogClose = Dialog.Close;
const DialogPortal = Dialog.Portal;
const DialogBackdrop = Dialog.Backdrop;

// The popup must be positioned. base-ui's Dialog.Popup applies no positioning
// of its own, so a static popup ignores `z-50` and is painted underneath the
// fixed backdrop, which then swallows every click aimed at the dialog.
const dialogContentVariants = cva(
  "fixed left-1/2 top-1/2 z-50 grid w-full max-w-lg -translate-x-1/2 -translate-y-1/2 gap-1 rounded-lg border border-border bg-card p-6 text-left shadow-lg sm:rounded-xl",
);

const dialogBackdropVariants = cva(
  "fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity data-[ending-style]:opacity-0 data-[starting-style]:opacity-0",
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

function DialogBackdropStyled({
  className,
  ...props
}: React.ComponentProps<typeof DialogBackdrop> &
  VariantProps<typeof dialogBackdropVariants>) {
  return (
    <DialogBackdrop
      className={cn(dialogBackdropVariants(), className)}
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
  DialogPortal,
  DialogBackdropStyled as DialogBackdrop,
  dialogContentVariants,
  dialogBackdropVariants,
};
