import { z } from "zod";

/**
 * Reglas de validación compartidas por el admin y los portales.
 * Fuente: SRS, reglas RN-02 (formatos) y RN-09 (archivos), y RNF-06 (contraseñas).
 * Mantener este archivo idéntico en plataforma-admin y portal-iribarren.
 */

const trimmed = () => z.string().trim();

/**
 * Máximo de dígitos de la cédula según su tipo. Las venezolanas (V) aún no llegan a 9 dígitos;
 * las de extranjeros (E) pueden tener 9, que es el tope de la Propuesta v3 (^[VE]-[0-9]{5,9}$).
 */
export const DIGITOS_CEDULA = { V: { min: 5, max: 8 }, E: { min: 5, max: 9 } } as const;

/** Cédula: V o E, guion opcional y solo dígitos (5 a 8 para V, 5 a 9 para E). Se normaliza a "V-12345678". */
export const cedulaSchema = trimmed()
  .toUpperCase()
  .regex(/^[VE]-?\d+$/, "La cédula lleva V o E y solo números, por ejemplo V-12345678.")
  .transform((v) => ({ tipo: v[0] as "V" | "E", numero: v.replace(/\D/g, "") }))
  .superRefine(({ tipo, numero }, ctx) => {
    const { min, max } = DIGITOS_CEDULA[tipo];
    if (numero.length < min || numero.length > max) {
      ctx.addIssue({
        code: "custom",
        message: `La cédula ${tipo} debe tener entre ${min} y ${max} dígitos.`,
      });
    } else if (/^0+$/.test(numero)) {
      ctx.addIssue({ code: "custom", message: "Ingresa un número de cédula válido." });
    }
  })
  .transform(({ tipo, numero }) => `${tipo}-${numero}`);

/** Valor de cada letra del RIF en el cálculo del SENIAT (C, consejo comunal, vale como J). */
const VALOR_LETRA_RIF: Record<string, number> = { V: 1, E: 2, J: 3, P: 4, G: 5, C: 3 };
const PESOS_RIF = [3, 2, 7, 6, 5, 4, 3, 2];

/**
 * Dígito verificador del RIF (módulo 11): letra × 4 más cada uno de los 8 dígitos por
 * 3-2-7-6-5-4-3-2; el verificador es 11 − (suma mód 11), y 0 si da 10 u 11.
 * Ejemplo: J-07013380 → 5.
 */
export function digitoVerificadorRif(letra: string, ocho: string): number {
  let suma = (VALOR_LETRA_RIF[letra] ?? 0) * 4;
  for (let i = 0; i < 8; i++) suma += Number(ocho[i]) * PESOS_RIF[i]!;
  const dv = 11 - (suma % 11);
  return dv >= 10 ? 0 : dv;
}

/**
 * RIF de organizaciones: J (jurídica), G (gobierno) o C (consejo comunal), 8 dígitos y un
 * dígito verificador que debe coincidir con el cálculo del SENIAT. Se normaliza a "J-12345678-9".
 */
export const rifSchema = trimmed()
  .toUpperCase()
  .regex(/^[JGC]-?\d{8}-?\d$/, "El RIF lleva J, G o C, 8 números y el dígito final: J-12345678-9.")
  .transform((v) => {
    const digitos = v.replace(/\D/g, "");
    return { letra: v[0]!, ocho: digitos.slice(0, 8), dv: Number(digitos[8]) };
  })
  .refine(
    ({ letra, ocho, dv }) => digitoVerificadorRif(letra, ocho) === dv,
    "El dígito verificador no corresponde a ese RIF. Revísalo en tu constancia del SENIAT.",
  )
  .transform(({ letra, ocho, dv }) => `${letra}-${ocho}-${dv}`);

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

/** Correo: formato válido (usuario@dominio.tld), sin espacios y de hasta 255 caracteres. */
export const correoSchema = trimmed()
  .toLowerCase()
  .max(255, "El correo no puede superar 255 caracteres.")
  .pipe(z.email("Ingresa un correo válido, por ejemplo nombre@dominio.com."));

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

/**
 * Nombres y apellidos de personas: solo letras (con tildes, ñ y ü) separadas por un espacio;
 * sin números ni símbolos. Hasta 100 caracteres (v3). Los espacios repetidos se unifican.
 */
export const nombrePersonaSchema = trimmed()
  .transform((v) => v.replace(/\s+/g, " "))
  .pipe(
    z
      .string()
      .min(2, "Debe tener al menos 2 letras.")
      .max(100, "No puede superar 100 caracteres.")
      .regex(/^\p{L}+(?: \p{L}+)*$/u, "Usa solo letras y espacios, sin números ni símbolos."),
  );

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
