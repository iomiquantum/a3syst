import { z } from "zod";

export const permissionsSchema = z.object({
  agenda: z.boolean(),
  pacientes: z.boolean(),
  ventas: z.boolean(),
  configuracion: z.boolean(),
  reportes: z.boolean(),
}).strict();

export type Permissions = z.infer<typeof permissionsSchema>;

export const validatePermissions = (perms: unknown): Permissions | null => {
  const result = permissionsSchema.safeParse(perms);
  return result.success ? result.data : null;
};
