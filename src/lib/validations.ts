import { z } from "zod";

export const patientSchema = z.object({
  first_name: z.string().trim().min(1, "Nombre requerido").max(100, "Nombre muy largo"),
  last_name: z.string().trim().min(1, "Apellido requerido").max(100, "Apellido muy largo"),
  email: z.string().trim().email("Email inválido").max(255, "Email muy largo"),
  phone: z.string().max(20, "Teléfono muy largo").regex(/^[\d\s+()-]*$/, "Teléfono inválido").optional().or(z.literal("")),
  document: z.string().max(50, "Documento muy largo").optional().or(z.literal("")),
  notes: z.string().max(5000, "Notas muy largas").optional().or(z.literal("")),
  dob: z.string().optional().or(z.literal("")),
});

export const professionalSchema = z.object({
  full_name: z.string().trim().min(1, "Nombre requerido").max(100, "Nombre muy largo"),
  email: z.string().trim().email("Email inválido").max(255, "Email muy largo"),
  phone: z.string().max(20, "Teléfono muy largo").regex(/^[\d\s+()-]*$/, "Teléfono inválido").optional().or(z.literal("")),
  specialty_id: z.string().optional().or(z.literal("")),
  branch_id: z.string().optional().or(z.literal("")),
});

export const branchSchema = z.object({
  name: z.string().trim().min(1, "Nombre requerido").max(100, "Nombre muy largo"),
  address: z.string().trim().min(1, "Dirección requerida").max(300, "Dirección muy larga"),
  phone: z.string().max(20, "Teléfono muy largo").regex(/^[\d\s+()-]*$/, "Teléfono inválido").optional().or(z.literal("")),
  description: z.string().max(1000, "Descripción muy larga").optional().or(z.literal("")),
});

export const treatmentSchema = z.object({
  name: z.string().trim().min(1, "Nombre requerido").max(100, "Nombre muy largo"),
  duration: z.number({ invalid_type_error: "Duración inválida" }).int().min(1, "Duración mínima: 1 min").max(480, "Duración máxima: 480 min"),
  price: z.number({ invalid_type_error: "Precio inválido" }).min(0, "Precio no puede ser negativo").max(99999999, "Precio muy alto"),
  description: z.string().max(1000, "Descripción muy larga").optional().or(z.literal("")),
});

export const specialtySchema = z.object({
  name: z.string().trim().min(1, "Nombre requerido").max(100, "Nombre muy largo"),
});

export const saleSchema = z.object({
  patient_id: z.string().min(1, "Paciente requerido"),
  branch_id: z.string().optional().or(z.literal("")),
  treatment_id: z.string().optional().or(z.literal("")),
  amount: z.number({ invalid_type_error: "Monto inválido" }).min(0, "Monto no puede ser negativo").max(99999999, "Monto muy alto"),
  discount: z.number({ invalid_type_error: "Descuento inválido" }).min(0, "Descuento mínimo: 0").max(100, "Descuento máximo: 100%"),
  status: z.enum(["abonado", "parcial", "pendiente"]),
  payment_method_id: z.string().optional().or(z.literal("")),
  origin: z.string().max(100, "Origen muy largo").optional().or(z.literal("")),
  notes: z.string().max(1000, "Notas muy largas").optional().or(z.literal("")),
});

export const appointmentSchema = z.object({
  patient_id: z.string().min(1, "Paciente requerido"),
  treatment_id: z.string().optional().or(z.literal("")),
  professional_id: z.string().optional().or(z.literal("")),
  branch_id: z.string().optional().or(z.literal("")),
  date: z.string().min(1, "Fecha requerida"),
  time: z.string().min(1, "Hora requerida"),
  duration: z.number().int().min(5, "Duración mínima: 5 min").max(480, "Duración máxima: 480 min"),
  notes: z.string().max(1000, "Notas muy largas").optional().or(z.literal("")),
});

export function getValidationError(error: unknown): string {
  if (error instanceof z.ZodError) {
    return error.errors[0]?.message || "Error de validación";
  }
  return "Error inesperado";
}
