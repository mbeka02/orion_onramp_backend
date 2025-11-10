import {z} from "zod";

export enum ENVIRONMENT_TYPES {
    TEST = "test",
    LIVE = "live"
}

export const createEnvironmentSchema = z.object({
    type: z.enum([ENVIRONMENT_TYPES.LIVE, ENVIRONMENT_TYPES.TEST], "Must pass type of environment")  
});

export const rotateKeysSchema = z.object({
    type: z.enum([ENVIRONMENT_TYPES.LIVE, ENVIRONMENT_TYPES.TEST], "Must pass type of environment")  
});

export type RotateKeysType = z.infer<typeof rotateKeysSchema>;
export type CreateEnvironmentType = z.infer<typeof createEnvironmentSchema>;