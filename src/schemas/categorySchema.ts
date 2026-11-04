import { z } from "zod";

export const categoryFormSchema = z.object({
  name: z.string().trim().min(1, "Give this category a name."),
});

export type CategoryFormValues = z.infer<typeof categoryFormSchema>;
