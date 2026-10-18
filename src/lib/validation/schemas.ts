import { z } from "zod";
import { cedulaSchema, contrasenaSchema, correoSchema, nombreSchema } from "./common";

/** CU-01 Iniciar sesión (personal interno). */
export const loginSchema = z.object({
  correo: correoSchema,
  contrasena: z.string().min(1, "Ingresa tu contraseña."),
});

/** RF-AUT-07 Aceptar invitación y definir contraseña. */
export const aceptarInvitacionSchema = z
  .object({
    nombres: nombreSchema,
    apellidos: nombreSchema,
    cedula: cedulaSchema,
    contrasena: contrasenaSchema,
    confirmarContrasena: z.string(),
  })
  .refine((d) => d.contrasena === d.confirmarContrasena, {
    path: ["confirmarContrasena"],
    error: "Las contraseñas no coinciden.",
  });

const contrasenasIguales = {
  check: (d: { contrasena: string; confirmarContrasena: string }) =>
    d.contrasena === d.confirmarContrasena,
  params: { path: ["confirmarContrasena"], error: "Las contraseñas no coinciden." },
};

/** Olvidé mi contraseña: la respuesta es neutra exista o no la cuenta. */
export const recuperarSchema = z.object({ correo: correoSchema });

/** Restablecer contraseña desde el enlace del correo (válido 1 hora). */
export const restablecerSchema = z
  .object({
    token: z.string().min(1, "El enlace no es válido."),
    contrasena: contrasenaSchema,
    confirmarContrasena: z.string(),
  })
  .refine(contrasenasIguales.check, contrasenasIguales.params);

/** Cambiar la contraseña con la sesión abierta (menú de usuario). */
export const cambiarContrasenaSchema = z
  .object({
    contrasenaActual: z.string().min(1, "Ingresa tu contraseña actual."),
    contrasena: contrasenaSchema,
    confirmarContrasena: z.string(),
  })
  .refine(contrasenasIguales.check, contrasenasIguales.params);

/** CU-03 Crear alcaldía. */
export const crearAlcaldiaSchema = z.object({
  nombre: z.string().trim().min(3, "Ingresa el nombre de la alcaldía.").max(120),
  estado: z.string().trim().min(2, "Selecciona el estado."),
  correoAdministrador: correoSchema,
});

const colorHex = z
  .string()
  .trim()
  .regex(/^#[0-9a-fA-F]{6}$/, "Usa un color hexadecimal, por ejemplo #1F3A5F.");

/** CU-06 Identidad visual. El contraste AA se valida aparte con la función de contraste. */
export const brandingSchema = z.object({
  colorPrimario: colorHex,
  colorSecundario: colorHex.optional(),
  lema: z.string().trim().max(120, "El lema no puede superar 120 caracteres.").optional(),
});

export const ROLES_INTERNOS = ["OPERADOR", "REVISOR"] as const;

/** CU-07 Invitar usuario interno. */
export const invitarUsuarioSchema = z.object({
  correo: correoSchema,
  roles: z.array(z.enum(ROLES_INTERNOS)).min(1, "Selecciona al menos un rol."),
});

export const MOTIVOS_RECHAZO = [
  "IDENTIDAD_NO_ACREDITADA",
  "FUERA_DE_ALCANCE",
  "INFORMACION_INSUFICIENTE",
  "DUPLICADA",
  "OTRO",
] as const;

/** CU-12 Transición de una participación (RN-07). */
export const transicionParticipacionSchema = z.discriminatedUnion("to", [
  z.object({ to: z.literal("EN_REVISION"), comentario: z.string().trim().max(2000).optional() }),
  z.object({ to: z.literal("APROBADA"), comentario: z.string().trim().max(2000).optional() }),
  z.object({
    to: z.literal("RECHAZADA"),
    motivoCodigo: z.enum(MOTIVOS_RECHAZO, { error: "Selecciona el motivo del rechazo." }),
    motivoTexto: z
      .string()
      .trim()
      .min(20, "Explica el motivo al ciudadano (mínimo 20 caracteres).")
      .max(2000),
  }),
]);

export type LoginInput = z.infer<typeof loginSchema>;
export type AceptarInvitacionInput = z.infer<typeof aceptarInvitacionSchema>;
export type CrearAlcaldiaInput = z.infer<typeof crearAlcaldiaSchema>;
export type BrandingInput = z.infer<typeof brandingSchema>;
export type InvitarUsuarioInput = z.infer<typeof invitarUsuarioSchema>;
export type TransicionParticipacionInput = z.infer<typeof transicionParticipacionSchema>;
