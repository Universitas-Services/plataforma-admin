import { z } from "zod";

/**
 * Reglas de validación compartidas por el admin y los portales.
 * Fuente: SRS, reglas RN-02 (formatos) y RN-09 (archivos), y RNF-06 (contraseñas).
 * Mantener este archivo idéntico en plataforma-admin y portal-iribarren.
 */

const trimmed = () => z.string().trim();

/** Cédula venezolana: V o E, guion opcional y 7 u 8 dígitos. Se normaliza a "V-12345678". */
export const cedulaSchema = trimmed()
  .toUpperCase()
  .regex(/^[VE]-?\d{7,8}$/, "Ingresa una cédula válida, por ejemplo V-12345678.")
  .transform((v) => (v.includes("-") ? v : `${v[0]}-${v.slice(1)}`));

/** RIF de organizaciones: J, G o C, 8 dígitos y dígito verificador. Se normaliza a "J-12345678-9". */
export const rifSchema = trimmed()
  .toUpperCase()
  .regex(/^[JGC]-?\d{8}-?\d$/, "Ingresa un RIF válido, por ejemplo J-12345678-9.")
  .transform((v) => {
    const digits = v.replace(/\D/g, "");
    return `${v[0]}-${digits.slice(0, 8)}-${digits.slice(8)}`;
  });

/** Teléfono venezolano: móvil (0412, 0414, 0416, 0424, 0426) o fijo (02xx), con o sin +58. */
export const telefonoSchema = trimmed()
  .transform((v) => v.replace(/[\s()-]/g, ""))
  .pipe(
    z
      .string()
      .regex(
        /^(?:\+58|0)(?:4(?:12|14|16|24|26)|2\d{2})\d{7}$/,
        "Ingresa un teléfono válido, por ejemplo 0414-1234567.",
      ),
  );

export const correoSchema = trimmed().toLowerCase().pipe(z.email("Ingresa un correo válido."));

/** Contraseña: mínimo 10 caracteres, con mayúscula, minúscula, número y símbolo. */
export const contrasenaSchema = z
  .string()
  .min(10, "La contraseña debe tener al menos 10 caracteres.")
  .max(128, "La contraseña no puede superar 128 caracteres.")
  .regex(/[A-Z]/, "Incluye al menos una letra mayúscula.")
  .regex(/[a-z]/, "Incluye al menos una letra minúscula.")
  .regex(/\d/, "Incluye al menos un número.")
  .regex(/[^A-Za-z0-9]/, "Incluye al menos un símbolo.");

export const nombreSchema = trimmed()
  .min(2, "Debe tener al menos 2 caracteres.")
  .max(80, "No puede superar 80 caracteres.");

export const MB = 1024 * 1024;

export const TIPOS_DOCUMENTO = ["application/pdf", "image/jpeg", "image/png"] as const;

/**
 * Archivo cargado por un ciudadano. Por defecto: PDF, JPG o PNG de hasta 2 MB.
 * En el cliente valida antes de subir; la API vuelve a validar el tipo real del archivo.
 */
export const archivoSchema = ({
  tipos = TIPOS_DOCUMENTO as readonly string[],
  maxMB = 2,
}: { tipos?: readonly string[]; maxMB?: number } = {}) =>
  z
    .instanceof(File, { error: "Selecciona un archivo." })
    .refine((f) => f.size > 0, "El archivo está vacío.")
    .refine((f) => f.size <= maxMB * MB, `El archivo no puede superar ${maxMB} MB.`)
    .refine((f) => tipos.includes(f.type), "Formato no permitido.");

/** Casilla que el usuario debe marcar (términos, política de datos). */
export const aceptacionSchema = z.literal(true, { error: "Debes aceptar para continuar." });
