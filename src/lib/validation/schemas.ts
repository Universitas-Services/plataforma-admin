import { z } from "zod";
import { cedulaSchema, contrasenaSchema, correoSchema, nombreSchema } from "./common";
import {
  CATEGORIAS,
  DOC_CATEGORIAS,
  DOC_ESTADOS,
  FORMATOS,
  FUENTES_VIDEO,
  TIPOS_NOTICIA,
} from "@/lib/contenido/tipos";

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

/* ---------- Noticias (backlog 1.13 y 2.9) ---------- */

/** URL http(s) o ruta del propio sitio, para el botón opcional de la noticia. */
const enlaceBoton = z
  .string()
  .trim()
  .max(500)
  .refine((v) => /^https?:\/\/[^\s]+$/i.test(v) || /^\/(?!\/)[^\s]*$/.test(v), {
    error: "Escribe un enlace que empiece por https:// o por /.",
  });

const imagenSchema = z.object({
  src: z.string().max(300),
  alt: z.string().trim().max(250, "El texto alternativo no puede superar 250 caracteres."),
  ancho: z.number().int().positive().max(20_000),
  alto: z.number().int().positive().max(20_000),
  credito: z
    .object({
      autor: z.string().trim().max(120),
      licencia: z.string().trim().max(60),
      fuente: z.string().trim().max(500),
    })
    .optional(),
  ilustrativa: z.boolean().optional(),
});

/**
 * Lo que guarda el editor (borrador o cambios). Solo forma y largos: lo que exige cada formato
 * para publicar lo revisa el servidor (faltantesPublicacion en contenido.ts).
 */
export const noticiaSchema = z.object({
  tipo: z.enum(TIPOS_NOTICIA),
  formato: z.enum(FORMATOS),
  titulo: z.string().trim().max(160, "El título no puede superar 160 caracteres."),
  resumen: z.string().trim().max(300, "El resumen no puede superar 300 caracteres."),
  categoria: z.enum(CATEGORIAS).optional(),
  parroquia: z.string().trim().max(80).optional(),
  portada: imagenSchema.optional(),
  cuerpo: z.string().max(200_000, "El cuerpo es demasiado largo."),
  imagenes: z.array(imagenSchema).max(30, "Una galería admite hasta 30 imágenes."),
  adjunto: z
    .object({
      nombre: z.string().trim().max(160),
      url: z.string().max(300),
      tipo: z.literal("application/pdf"),
      pesoBytes: z.number().int().nonnegative(),
      paginas: z.number().int().positive().optional(),
    })
    .optional(),
  video: z
    .object({
      fuente: z.enum(FUENTES_VIDEO),
      url: z.string().trim().max(500),
      portada: imagenSchema.optional(),
      duracionSeg: z.number().nonnegative().optional(),
      subtitulos: z.string().max(300).optional(),
    })
    .optional(),
  puntos: z
    .object({
      titulo: z.string().trim().max(120).optional(),
      items: z
        .array(
          z.object({
            titulo: z.string().trim().max(120),
            texto: z.string().trim().max(600),
          }),
        )
        .max(12, "Hasta 12 puntos de análisis."),
    })
    .optional(),
  boton: z
    .object({
      texto: z.string().trim().min(1, "Escribe el texto del botón.").max(40),
      href: enlaceBoton,
    })
    .optional(),
  destacada: z.boolean(),
});

/* ---------- Documentos (backlog 1.15) ---------- */

export const documentoSchema = z.object({
  titulo: z
    .string()
    .trim()
    .min(1, "Escribe el título.")
    .max(160, "El título no puede superar 160 caracteres."),
  descripcion: z
    .string()
    .trim()
    .min(1, "Escribe una descripción breve.")
    .max(500, "La descripción no puede superar 500 caracteres."),
  categoria: z.enum(DOC_CATEGORIAS, { error: "Elige la categoría." }),
  estado: z.enum(DOC_ESTADOS),
  publico: z.boolean(),
});

export const adjuntoSchema = z.object({
  nombre: z.string().trim().min(1).max(160),
  url: z.string().max(300),
  tipo: z.literal("application/pdf"),
  pesoBytes: z.number().int().nonnegative(),
  paginas: z.number().int().positive().optional(),
});

export const versionSchema = z.object({
  nota: z
    .string()
    .trim()
    .min(5, "Cuenta en una frase qué cambió (mínimo 5 caracteres).")
    .max(300, "La nota no puede superar 300 caracteres."),
  tipo: z.enum(["menor", "mayor"]),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type AceptarInvitacionInput = z.infer<typeof aceptarInvitacionSchema>;
export type InvitarUsuarioInput = z.infer<typeof invitarUsuarioSchema>;
export type TransicionParticipacionInput = z.infer<typeof transicionParticipacionSchema>;
export type NoticiaInput = z.infer<typeof noticiaSchema>;
export type DocumentoInput = z.infer<typeof documentoSchema>;
