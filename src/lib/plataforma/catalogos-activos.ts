import "server-only";
import { usaApi } from "@/lib/api/cliente";
import { activosApi } from "@/lib/api/catalogos";
import { CATEGORIAS, DOC_CATEGORIAS } from "@/lib/contenido/tipos";
import { catalogosDe } from "./alcaldia";
import { almacen } from "./sesion";
import type { TipoCatalogo } from "./tipos";

/** Lo que se ofrecía antes de que los catálogos fueran editables: respaldo si no se pueden leer. */
const RESPALDO: Partial<Record<TipoCatalogo, readonly string[]>> = {
  categoriasNoticias: CATEGORIAS,
  categoriasDocumentos: DOC_CATEGORIAS,
};

/**
 * Los valores activos de un catálogo, en su orden, para los selectores del panel (R16). Con la
 * API, GET /admin/catalogs/:tipo; si falla, las listas de siempre, para no dejar el formulario
 * sin opciones.
 */
export async function valoresActivos(tipo: TipoCatalogo, alcaldiaId: string): Promise<string[]> {
  if (usaApi()) {
    try {
      const v = await activosApi(tipo);
      if (v?.length) return v;
    } catch {
      // La API no respondió: el respaldo de abajo.
    }
    return [...(RESPALDO[tipo] ?? [])];
  }
  const lista = catalogosDe(almacen(), alcaldiaId)?.[tipo];
  return lista?.length
    ? lista.filter((i) => i.activo).map((i) => i.nombre)
    : [...(RESPALDO[tipo] ?? [])];
}

/** Las opciones de un selector, con el valor actual aunque ya no esté activo. */
export const conActual = (opciones: string[], actual?: string) =>
  actual && !opciones.includes(actual) ? [...opciones, actual] : opciones;
