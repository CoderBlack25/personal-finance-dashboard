import { cva } from "class-variance-authority";

const tableVariants = cva("w-full caption-bottom text-sm", {
  variants: {
    variant: {
      default: "border-collapse",
      striped: "border-collapse",
    },
  },
  defaultVariants: {
    variant: "default",
  },
});

const tableHeaderVariants = cva(
  "text-left text-muted-foreground [&>tr]:border-b",
);

const tableBodyVariants = cva("[&>tr]:last-child:border-t-0");

const tableRowVariants = cva("transition-colors border-b border-border");

const tableHeadVariants = cva("pb-3 font-medium text-muted-foreground");

const tableCellVariants = cva("p-3 align-middle", {
  variants: {
    numeric: {
      true: "text-right font-mono tabular-nums",
    },
  },
});

const tableCaptionVariants = cva("pb-1/2 font-medium text-muted-foreground");

export {
  tableVariants,
  tableHeaderVariants,
  tableBodyVariants,
  tableRowVariants,
  tableHeadVariants,
  tableCellVariants,
  tableCaptionVariants,
};
