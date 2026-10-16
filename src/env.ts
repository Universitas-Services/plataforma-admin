import "server-only";
import { z } from "zod";

/** Variables de entorno del servidor (BFF). Nunca se envían al navegador. */
const envSchema = z.object({
  API_URL: z.url("API_URL debe ser una URL válida."),
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | undefined;

/**
 * Valida las variables al primer uso (no al importar), para que `next build`
 * funcione sin `.env` y el error aparezca en la primera petición que las necesite.
 */
export function env(): Env {
  if (!cached) {
    const parsed = envSchema.safeParse(process.env);
    if (!parsed.success) {
      throw new Error(`Variables de entorno inválidas:\n${z.prettifyError(parsed.error)}`);
    }
    cached = parsed.data;
  }
  return cached;
}
