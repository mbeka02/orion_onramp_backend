import { z } from "zod";

export enum ENVIRONMENT_TYPES {
  TEST = "test",
  LIVE = "live",
}

export const createEnvironmentSchema = z.object({
  type: z.enum(
    [ENVIRONMENT_TYPES.LIVE, ENVIRONMENT_TYPES.TEST],
    "Must pass type of environment",
  ),
  businessID: z
    .string("Business ID must be passed")
    .trim()
    .min(1, "Invalid business ID"),
});

export const rotateKeysSchema = z.object({
  type: z.enum(
    [ENVIRONMENT_TYPES.LIVE, ENVIRONMENT_TYPES.TEST],
    "Must pass type of environment",
  ),
  businessID: z
    .string("Business ID must be passed")
    .trim()
    .min(1, "Invalid business ID"),
});

export type RotateKeysType = z.infer<typeof rotateKeysSchema>;
export type CreateEnvironmentType = z.infer<typeof createEnvironmentSchema>;
