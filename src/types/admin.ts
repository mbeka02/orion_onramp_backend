import z from "zod";
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
  iat?: number;
  exp?: number;
}
export type LoginAdminInput = z.infer<typeof loginAdminSchema>;
export type CreateAdminInput = z.infer<typeof createAdminSchema>;
