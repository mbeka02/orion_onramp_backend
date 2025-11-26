import z from "zod";
export enum ROLE {
  ADMIN = "ADMIN",
  SUPER_ADMIN = "SUPER_ADMIN",
}
export const createAdminSchema = z.object({
  name: z.string().min(1),
  email: z.email(),
  password: z.string().min(6),
});
export const loginAdminSchema = z.object({
  email: z.email(),
  password: z.string().min(6),
});
export interface JWTPayload {
  adminId: string;
  email: string;
  role: ROLE;
  iat?: number;
  exp?: number;
}
export const getBusinessesQuerySchema = z.object({
  status: z
    .enum(["Draft", "Pending", "Approved", "Rejected", "Suspended"])
    .optional(),
  page: z
    .string()
    .regex(/^\d+$/)
    .transform(Number)
    .refine((n) => n >= 1)
    .optional(),
  limit: z
    .string()
    .regex(/^\d+$/)
    .transform(Number)
    .refine((n) => n >= 1 && n <= 100)
    .optional(),
});

export const businessIdParamSchema = z.object({
  id: z.uuid(),
});

export type LoginAdminInput = z.infer<typeof loginAdminSchema>;
export type CreateAdminInput = z.infer<typeof createAdminSchema>;
export type GetBusinessesQuery = z.infer<typeof getBusinessesQuerySchema>;
export type BusinessIdParam = z.infer<typeof businessIdParamSchema>;
