import { z } from "zod";

export const booleanFlagSchema = z
  .enum(["true", "false", "1", "0", "yes", "no", "on", "off"])
  .transform((value) => ["true", "1", "yes", "on"].includes(value));

export const emptyStringToUndefined = (value: unknown) =>
  value === "" ? undefined : value;

export const optionalStringSchema = z.preprocess(
  emptyStringToUndefined,
  z.string().min(1).optional(),
);

export const optionalUrlSchema = z.preprocess(
  emptyStringToUndefined,
  z.url().optional(),
);

export const optionalBooleanFlagSchema = z.preprocess(
  emptyStringToUndefined,
  booleanFlagSchema.optional(),
);

export function formatEnvError(error: z.ZodError) {
  return error.issues
    .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
    .join("; ");
}
