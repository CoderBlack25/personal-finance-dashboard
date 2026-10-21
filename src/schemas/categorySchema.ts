import { z } from "zod";

export const HEX_COLOR_REGEX = /^#[0-9a-fA-F]{6}$/;

export const categoryFormSchema = z.object({
  name: z.string().trim().min(1, "Give this category a name."),
  color: z.string(),
});

export type CategoryFormValues = z.infer<typeof categoryFormSchema>;
