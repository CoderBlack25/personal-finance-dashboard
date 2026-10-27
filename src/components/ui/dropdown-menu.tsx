import { Menu } from "@base-ui/react/menu";
import { cva } from "class-variance-authority";

const DropdownMenu = Menu.Root;

const DropdownMenuTrigger = Menu.Trigger;

const DropdownMenuContent = Menu.Popup;

const DropdownMenuPositioner = Menu.Positioner;

const DropdownMenuItem = Menu.Item;

const DropdownMenuCheckboxItem = Menu.CheckboxItem;

const DropdownMenuRadioItem = Menu.RadioItem;

const DropdownMenuLabel = Menu.GroupLabel;

const DropdownMenuSeparator = Menu.Separator;

const DropdownMenuGroup = Menu.Group;

const DropdownMenuPortal = Menu.Portal;

const DropdownMenuSub = Menu.SubmenuRoot;

const DropdownMenuSubTrigger = Menu.SubmenuTrigger;

const DropdownMenuSubContent = Menu.Popup;

const DropdownMenuRadioGroup = Menu.RadioGroup;

const dropdownMenuContentVariants = cva(
  "z-50 min-w-[12rem] overflow-hidden rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
);

// `pointer-events-none` on a disabled item also suppresses hover, which hides
// the `title` tooltip that explains why the item is unavailable. base-ui blocks
// the click on its own, so the pointer only needs to look unavailable.
const dropdownMenuItemVariants = cva(
  "relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50",
);

const dropdownMenuLabelVariants = cva(
  "px-2 py-1.5 text-xs font-semibold text-muted-foreground",
);

const dropdownMenuSeparatorVariants = cva("-mx-1 h-px bg-border my-1");

const dropdownMenuPositionerVariants = cva("z-50 outline-none");

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuPositioner,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuGroup,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuRadioGroup,
  dropdownMenuContentVariants,
  dropdownMenuItemVariants,
  dropdownMenuLabelVariants,
  dropdownMenuSeparatorVariants,
  dropdownMenuPositionerVariants,
};
