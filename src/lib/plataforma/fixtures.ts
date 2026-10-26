import { HORAS_INVITACION, cifrar, crearAlmacen } from "./servicio";
import { documentosDemo, inicioDemo, interaccionesDemo, noticiasDemo } from "./fixtures-contenido";
import { catalogosDemo, ciudadanosDemo, procesoDemo } from "./fixtures-alcaldia";
import { participacionesDemo } from "./fixtures-participaciones";
import { ALCALDIA } from "@/config/alcaldia";
import type { Almacen, UsuarioInterno } from "./tipos";

/*
 * Datos de demostración del panel (no son reales). Todas las cuentas usan CONTRASENA_DEMO.
 * Cambiar este archivo exige reiniciar `pnpm dev`: el almacén vive en globalThis.
 */

export const CONTRASENA_DEMO = "Plataforma#2026";

type Base = Omit<UsuarioInterno, "hash" | "intentosFallidos" | "activo" | "roles"> &
  Partial<Pick<UsuarioInterno, "activo" | "roles">> & { sinContrasena?: boolean };

/** El personal de la Alcaldía de Iribarren y el Super Admin de la plataforma. */
const USUARIOS: Base[] = [
  {
    id: "u-super",
    correo: "superadmin@plataforma.test",
    nombres: "Gabriela",
    apellidos: "Rondón",
    rolPlataforma: "SUPER_ADMIN",
  },
  {
    id: "u-admin-iri",
    correo: "admin@iribarren.test",
    nombres: "Ramón",
    apellidos: "Escalona",
    roles: ["ADMIN"],
  },
  {
    id: "u-operador-iri",
    correo: "operador@iribarren.test",
    nombres: "Luisa",
    apellidos: "Colmenárez",
    roles: ["OPERADOR"],
  },
  {
    id: "u-revisor-iri",
    correo: "revisor@iribarren.test",
    nombres: "María",
    apellidos: "Fernández",
    roles: ["REVISOR"],
  },
  {
    id: "u-equipo-iri",
    correo: "equipo@iribarren.test",
    nombres: "Andrés",
    apellidos: "Pineda",
    roles: ["OPERADOR", "REVISOR"],
  },
  {
    // Solo para la prueba del bloqueo tras 5 intentos (no bloquea a las cuentas de uso diario).
    id: "u-bloqueo",
    correo: "bloqueo@iribarren.test",
    nombres: "Cuenta",
    apellidos: "de prueba",
    roles: ["OPERADOR"],
  },
  {
    id: "u-inactivo",
    correo: "desactivado@iribarren.test",
    nombres: "Pedro",
    apellidos: "Álvarez",
    activo: false,
    roles: ["OPERADOR"],
  },
  {
    id: "u-invitado",
    correo: "nuevo.revisor@iribarren.test",
    nombres: "",
    apellidos: "",
    sinContrasena: true,
    activo: false,
    roles: ["REVISOR"],
  },
];

/** `ahora` fija las fechas relativas de los ejemplos (las pruebas lo pasan para ser deterministas). */
export function almacenDemo(ahora = Date.now()): Almacen {
  const alm = crearAlmacen();
  alm.alcaldias.set(ALCALDIA.id, {
    id: ALCALDIA.id,
    sigla: ALCALDIA.sigla,
    nombre: ALCALDIA.nombre,
  });
  const hash = cifrar(CONTRASENA_DEMO);
  for (const { sinContrasena, ...u } of USUARIOS)
    alm.usuarios.set(u.id, {
      ...u,
      hash: sinContrasena ? "" : hash,
      activo: u.activo ?? true,
      roles: [...(u.roles ?? [])],
      intentosFallidos: 0,
    });

  // Invitaciones de ejemplo: válida, vencida y usada.

  alm.tokens.set("demo-invitacion", {
    usuarioId: "u-invitado",
    tipo: "INVITACION",
    expira: ahora + HORAS_INVITACION * 3600_000,
    usado: false,
  });
  alm.tokens.set("demo-invitacion-vencida", {
    usuarioId: "u-invitado",
    tipo: "INVITACION",
    expira: ahora - 1000,
    usado: false,
  });
  alm.tokens.set("demo-invitacion-usada", {
    usuarioId: "u-revisor-iri",
    tipo: "INVITACION",
    expira: ahora + 3600_000,
    usado: true,
  });

  const participaciones = participacionesDemo(ahora);
  for (const p of participaciones) alm.participaciones.set(p.folio, p);
  for (const c of ciudadanosDemo(participaciones, ahora)) alm.ciudadanos.set(c.id, c);
  alm.catalogos.set(ALCALDIA.id, catalogosDemo(ALCALDIA.id));
  alm.procesos.set(ALCALDIA.id, procesoDemo());

  for (const n of noticiasDemo(ahora)) alm.noticias.set(n.id, n);
  for (const d of documentosDemo(ahora)) alm.documentos.set(d.id, d);
  alm.inicio = inicioDemo();
  interaccionesDemo(alm, ahora);

  return alm;
}

/** Solo en desarrollo: borra del todo una noticia que creó una prueba E2E. */
export function borrarNoticiaDePrueba(alm: Almacen, id: string) {
  if (id.startsWith("n-ejemplo-")) return false;
  return alm.noticias.delete(id);
}

/** Solo en desarrollo: borra del todo un documento creado por una prueba E2E. */
export function borrarContenidoDePrueba(alm: Almacen, tipo: string, id: string) {
  if (id.includes("-ejemplo-")) return false;
  if (tipo === "documentos") return alm.documentos.delete(id);
  return false;
}
