import { describe, expect, it } from "vitest";
import {
  dialogBackdropVariants,
  dialogContentVariants,
} from "@/components/ui/dialog";

/**
 * base-ui's Dialog.Popup applies no positioning of its own, so the popup is
 * positioned purely by these classes. A popup that is not positioned ignores
 * its z-index and is painted underneath the fixed backdrop, which then
 * intercepts every click aimed at the dialog and makes it unusable.
 */
describe("dialog layering", () => {
  const zIndexOf = (className: string) =>
    Number(className.match(/\bz-(\d+)\b/)?.[1] ?? "0");

  it("positions the popup", () => {
    expect(dialogContentVariants()).toMatch(/(^|\s)fixed(\s|$)/);
  });

  it("paints the popup above the backdrop", () => {
    expect(zIndexOf(dialogContentVariants())).toBeGreaterThan(
      zIndexOf(dialogBackdropVariants()),
    );
  });

  it("covers the viewport with the backdrop", () => {
    const backdrop = dialogBackdropVariants();
    expect(backdrop).toMatch(/(^|\s)fixed(\s|$)/);
    expect(backdrop).toMatch(/inset-0/);
  });
});
