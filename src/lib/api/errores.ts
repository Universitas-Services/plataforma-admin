import { ErrorApi } from "./cliente";

/*
 * Mensaje en español para cada código de error de plataforma-api (guías R2, R6 y R7). Los
 * errores por campo (INCOMPLETE, VALIDATION_ERROR) los reparte cada acción en su formulario.
 */

const minutos = (s: number) => {
  const m = Math.max(1, Math.ceil(s / 60));
  return `${m} ${m === 1 ? "minuto" : "minutos"}`;
};

export function mensajeDeError(e: unknown): string {
  if (!(e instanceof ErrorApi)) return "Algo salió mal. Intenta de nuevo.";
  const d = (e.details ?? {}) as { retryAfterSeconds?: number; maxBytes?: number };
  switch (e.code) {
    case "INVALID_CREDENTIALS":
      return "El correo o la contraseña no son correctos.";
    case "ACCOUNT_LOCKED":
      return `Por seguridad, la cuenta quedó bloqueada. Intenta de nuevo en ${minutos(d.retryAfterSeconds ?? 900)}.`;
    case "ACCOUNT_DISABLED":
      return "Tu cuenta está desactivada. Pide al administrador de tu alcaldía que la reactive.";
    case "INVALID_PASSWORD":
      return "La contraseña actual no es correcta.";
    case "TOO_MANY_REQUESTS":
      return `Demasiados intentos. Espera ${minutos(d.retryAfterSeconds ?? 60)} y vuelve a intentarlo.`;
    case "FORBIDDEN":
      return "Tu rol no tiene permiso para hacer esto.";
    case "NOT_FOUND":
      return "Lo que buscas ya no existe.";
    case "FILE_TOO_LARGE":
      return d.maxBytes
        ? `El archivo pesa más de ${Math.round(d.maxBytes / 1_048_576)} MB.`
        : "El archivo es demasiado grande.";
    case "INVALID_FILE":
      return e.message || "El archivo no es válido.";
    case "TOKEN_EXPIRED":
    case "INVALID_TOKEN":
      return "El permiso de subida venció. Vuelve a elegir el archivo.";
    case "YA_ES_MIEMBRO":
      return "Esa persona ya es parte del equipo.";
    case "IDENTITY_CONFLICT":
      return (e.details as { field?: string } | undefined)?.field === "cedula"
        ? "Esta cédula ya pertenece a otra cuenta."
        : "Ese correo ya tiene una cuenta de ciudadano.";
    case "A_TI_MISMO":
      return "No puedes cambiar tus propios roles ni desactivarte.";
    case "ES_ADMIN":
      return "Los administradores se gestionan desde la plataforma.";
    case "MEDIO_AJENO":
      return "Uno de los archivos no pertenece a esta alcaldía.";
    case "API_SIN_RESPUESTA":
    case "API_NO_CONFIGURADA":
      return "No pudimos conectar con el servidor. Intenta de nuevo en unos minutos.";
    default:
      return e.status >= 500 ? "Algo salió mal en el servidor. Intenta de nuevo." : e.message;
  }
}
