import { describe, expect, it } from "vitest";
import { cambiarEstadoNoticia } from "./contenido";
import { CONTRASENA_DEMO, almacenDemo } from "./fixtures";
import {
  MAX_ACTIVOS,
  crearItemMarco,
  eliminarItemMarco,
  guardarItemMarco,
  marcoLegalDe,
  marcoPublico,
  ordenarMarco,
} from "./marco-legal";
import { iniciarSesion } from "./servicio";

const entrar = (alm: ReturnType<typeof almacenDemo>, correo = "operador@iribarren.test") => {
  const r = iniciarSesion(alm, correo, CONTRASENA_DEMO);
  if (r.estado !== "OK") throw new Error(`No entró ${correo}`);
  return r.sesion;
};

const vista = (alm: ReturnType<typeof almacenDemo>, s: string) => {
  const r = marcoLegalDe(alm, s);
  if (r.estado !== "OK") throw new Error(r.estado);
  return r;
};

const nuevo = { titulo: "Ley de prueba", descripcion: "Descripción de la ley de prueba." };

describe("Marco legal", () => {
  it("muestra los 7 ítems de hoy activos y en orden, y el inactivo al final", () => {
    const alm = almacenDemo();
    const r = vista(alm, entrar(alm));
    expect(r.activos).toBe(7);
    expect(r.items.slice(0, 7).map((i) => i.orden)).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(r.items.at(-1)?.activo).toBe(false);
    expect(r.items[6]?.botonDisponible).toBe(true);
    expect(marcoPublico(alm, "iribarren")[6]?.boton).toEqual({
      texto: "Ver en el repositorio",
      href: "/documentos/ejemplo-decreto",
    });
  });

  it("el Revisor no lo edita", () => {
    const alm = almacenDemo();
    const s = entrar(alm, "revisor@iribarren.test");
    expect(marcoLegalDe(alm, s).estado).toBe("SIN_PERMISO");
    expect(crearItemMarco(alm, s, { ...nuevo, activo: true }).estado).toBe("SIN_PERMISO");
  });

  it("admite 10 activos como máximo", () => {
    const alm = almacenDemo();
    const s = entrar(alm);
    for (let n = 7; n < MAX_ACTIVOS; n++)
      expect(crearItemMarco(alm, s, { ...nuevo, activo: true }).estado).toBe("OK");
    expect(crearItemMarco(alm, s, { ...nuevo, activo: true }).estado).toBe("DEMASIADOS_ACTIVOS");
    // Inactivo sí se puede crear, pero no activar.
    const r = crearItemMarco(alm, s, { ...nuevo, activo: false });
    if (r.estado !== "OK") throw new Error(r.estado);
    expect(guardarItemMarco(alm, s, r.item.id, { ...nuevo, activo: true }).estado).toBe(
      "DEMASIADOS_ACTIVOS",
    );
    expect(marcoPublico(alm, "iribarren")).toHaveLength(MAX_ACTIVOS);
  });

  it("activar pone al final; desactivar y eliminar sacan del orden", () => {
    const alm = almacenDemo();
    const s = entrar(alm);
    const r = guardarItemMarco(alm, s, "m-ejemplo-inactivo", {
      titulo: "Ejemplo activado",
      descripcion: "Ahora se muestra.",
      activo: true,
    });
    expect(r.estado === "OK" && r.item.orden).toBe(7);
    guardarItemMarco(alm, s, "m-1", { titulo: "CRBV", descripcion: "Texto.", activo: false });
    expect(
      vista(alm, s)
        .items.filter((i) => i.activo)
        .map((i) => i.orden),
    ).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(eliminarItemMarco(alm, s, "m-2").estado).toBe("OK");
    expect(vista(alm, s).items.map((i) => i.id)).not.toContain("m-2");
    expect(vista(alm, s).activos).toBe(6);
  });

  it("reordena solo con todos los activos", () => {
    const alm = almacenDemo();
    const s = entrar(alm);
    const ids = vista(alm, s)
      .items.filter((i) => i.activo)
      .map((i) => i.id);
    expect(ordenarMarco(alm, s, ids.slice(1)).estado).toBe("ORDEN_INVALIDO");
    expect(ordenarMarco(alm, s, [...ids.slice(1), "m-ejemplo-inactivo"]).estado).toBe(
      "ORDEN_INVALIDO",
    );
    expect(ordenarMarco(alm, s, [...ids].reverse()).estado).toBe("OK");
    expect(marcoPublico(alm, "iribarren")[0]?.titulo).toMatch(/^Decreto Municipal/);
    expect(alm.bitacora.at(-1)?.accion).toBe("MARCO_LEGAL_REORDENADO");
  });

  it("el botón solo apunta a contenido publicado; si se despublica, desaparece del portal", () => {
    const alm = almacenDemo();
    const s = entrar(alm);
    const despublicada = { tipo: "NOTICIA" as const, id: "n-ejemplo-despublicada" };
    expect(
      crearItemMarco(alm, s, {
        ...nuevo,
        activo: true,
        boton: { texto: "Leer", destino: despublicada },
      }).estado,
    ).toBe("DESTINO_NO_DISPONIBLE");

    const r = crearItemMarco(alm, s, {
      ...nuevo,
      activo: true,
      boton: { texto: "Leer la noticia", destino: { tipo: "NOTICIA", id: "n-ejemplo-mesas" } },
    });
    if (r.estado !== "OK") throw new Error(r.estado);
    expect(marcoPublico(alm, "iribarren").at(-1)?.boton?.href).toMatch(/^\/noticias\//);

    expect(cambiarEstadoNoticia(alm, s, "n-ejemplo-mesas", "despublicar").estado).toBe("OK");
    expect(marcoPublico(alm, "iribarren").at(-1)?.boton).toBeUndefined();
    const item = vista(alm, s).items.find((i) => i.id === r.item.id)!;
    expect(item.botonDisponible).toBe(false);
    expect(item.destinoTitulo).toBeTruthy();
    // Guardarlo sin cambiar el destino no falla aunque esté despublicado.
    expect(
      guardarItemMarco(alm, s, r.item.id, {
        ...nuevo,
        activo: true,
        boton: item.boton,
      }).estado,
    ).toBe("OK");
  });
});
