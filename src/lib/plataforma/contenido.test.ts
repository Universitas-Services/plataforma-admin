import { describe, expect, it } from "vitest";
import type { CamposNoticia } from "@/lib/contenido/tipos";
import {
  cambiarEstadoNoticia,
  crearNoticia,
  faltantesPublicacion,
  guardarMedio,
  guardarNoticia,
  listarNoticias,
  medioDe,
  obtenerNoticia,
  slugDe,
  tipoMedio,
} from "./contenido";
import { CONTRASENA_DEMO, almacenDemo } from "./fixtures";
import { iniciarSesion, verificarIntegridad } from "./servicio";

const entrar = (alm: ReturnType<typeof almacenDemo>, correo: string) => {
  const r = iniciarSesion(alm, correo, CONTRASENA_DEMO);
  if (r.estado !== "OK") throw new Error(`No entró ${correo}`);
  return r.sesion;
};

const AHORA = Date.parse("2026-10-18T12:00:00-04:00");
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3]);
const PDF = new TextEncoder().encode("%PDF-1.7\n...");

const campos = (c: Partial<CamposNoticia> = {}): CamposNoticia => ({
  tipo: "NOTICIA",
  formato: "TEXTO",
  titulo: "Mesas técnicas en Catedral",
  resumen: "Resumen de prueba.",
  categoria: "Mesas de trabajo",
  cuerpo: "<p>Cuerpo de prueba.</p>",
  imagenes: [],
  destacada: false,
  ...c,
});

function nueva(alm = almacenDemo(), correo = "operador@iribarren.test") {
  const s = entrar(alm, correo);
  const r = crearNoticia(alm, s, AHORA);
  if (r.estado !== "OK") throw new Error(r.estado);
  return { alm, s, id: r.id };
}

describe("permisos de contenido", () => {
  it("el Operador y el Admin editan; el Revisor no", () => {
    const alm = almacenDemo();
    for (const correo of ["operador@iribarren.test", "admin@iribarren.test"])
      expect(crearNoticia(alm, entrar(alm, correo), AHORA).estado).toBe("OK");
    const revisor = entrar(alm, "revisor@iribarren.test");
    expect(crearNoticia(alm, revisor, AHORA).estado).toBe("SIN_PERMISO");
    expect(listarNoticias(alm, revisor).estado).toBe("SIN_PERMISO");
    expect(crearNoticia(alm, undefined, AHORA).estado).toBe("SIN_SESION");
  });

  it("solo se ven y editan las noticias de la alcaldía activa", () => {
    const { alm, s } = nueva();
    const r = listarNoticias(alm, s, {}, AHORA);
    if (r.estado !== "OK") throw new Error();
    expect(r.items.every((n) => n.alcaldiaId === "iribarren")).toBe(true);
    expect(obtenerNoticia(alm, s, "no-existe", AHORA).estado).toBe("NO_EXISTE");
  });
});

describe("guardar y publicar", () => {
  it("un borrador se guarda incompleto y el HTML sale saneado", () => {
    const { alm, s, id } = nueva();
    const r = guardarNoticia(
      alm,
      s,
      id,
      campos({ resumen: "", cuerpo: '<p onclick="x()">Hola<script>alert(1)</script></p>' }),
      AHORA,
    );
    expect(r.estado).toBe("OK");
    if (r.estado === "OK") {
      expect(r.noticia.cuerpo).toBe("<p>Hola</p>");
      expect(r.noticia.slug).toBe("mesas-tecnicas-en-catedral");
    }
  });

  it("el slug es único dentro de la alcaldía", () => {
    const { alm, s, id } = nueva();
    const otra = crearNoticia(alm, s, AHORA);
    if (otra.estado !== "OK") throw new Error();
    guardarNoticia(alm, s, id, campos(), AHORA);
    const r = guardarNoticia(alm, s, otra.id, campos(), AHORA);
    expect(r.estado === "OK" && r.noticia.slug).toBe("mesas-tecnicas-en-catedral-2");
    expect(slugDe("¿Qué pasó en El Cují?")).toBe("que-paso-en-el-cuji");
  });

  it("cada formato exige lo suyo para publicar", () => {
    expect(faltantesPublicacion(campos({ formato: "IMAGEN" })).portada).toBeDefined();
    expect(faltantesPublicacion(campos({ formato: "GALERIA" })).imagenes).toMatch(/2 imágenes/);
    expect(faltantesPublicacion(campos({ formato: "DOCUMENTO" })).adjunto).toBeDefined();
    expect(
      faltantesPublicacion(
        campos({ formato: "VIDEO", video: { fuente: "YOUTUBE", url: "https://ejemplo.com/v" } }),
      ).video,
    ).toMatch(/YouTube/);
    expect(
      faltantesPublicacion(
        campos({
          formato: "VIDEO",
          video: { fuente: "YOUTUBE", url: "https://youtu.be/dQw4w9WgXcQ" },
        }),
      ),
    ).toEqual({});
    expect(faltantesPublicacion(campos({ cuerpo: "<p> </p>" })).cuerpo).toBeDefined();
  });

  it("publicar exige la noticia completa y deja bitácora", () => {
    const { alm, s, id } = nueva();
    expect(cambiarEstadoNoticia(alm, s, id, "publicar", {}, AHORA).estado).toBe("INCOMPLETA");
    guardarNoticia(alm, s, id, campos(), AHORA);
    const r = cambiarEstadoNoticia(alm, s, id, "publicar", {}, AHORA);
    expect(r.estado === "OK" && r.noticia.estado).toBe("PUBLICADO");
    expect(alm.bitacora.at(-1)?.accion).toBe("NOTICIA_PUBLICADA");
    expect(verificarIntegridad(alm).ok).toBe(true);
  });

  it("una publicada no se puede dejar incompleta al guardar", () => {
    const { alm, s, id } = nueva();
    guardarNoticia(alm, s, id, campos(), AHORA);
    cambiarEstadoNoticia(alm, s, id, "publicar", {}, AHORA);
    const r = guardarNoticia(alm, s, id, campos({ titulo: "" }), AHORA);
    expect(r.estado).toBe("INCOMPLETA");
  });

  it("programar exige una fecha futura y la publicación llega sola", () => {
    const { alm, s, id } = nueva();
    guardarNoticia(alm, s, id, campos(), AHORA);
    const pasada = new Date(AHORA - 60_000).toISOString();
    expect(
      cambiarEstadoNoticia(alm, s, id, "programar", { publicarEl: pasada }, AHORA).estado,
    ).toBe("FECHA_PASADA");
    const manana = new Date(AHORA + 86_400_000).toISOString();
    const r = cambiarEstadoNoticia(alm, s, id, "programar", { publicarEl: manana }, AHORA);
    expect(r.estado === "OK" && r.noticia.estado).toBe("PROGRAMADO");
    // Al día siguiente, al listar, ya está publicada (el «job» simulado).
    const despues = listarNoticias(alm, s, { estado: "PUBLICADO" }, AHORA + 2 * 86_400_000);
    expect(despues.estado === "OK" && despues.items.some((n) => n.id === id)).toBe(true);
  });

  it("solo se eliminan borradores; despublicar solo desde publicada", () => {
    const { alm, s, id } = nueva();
    expect(cambiarEstadoNoticia(alm, s, id, "despublicar", {}, AHORA).estado).toBe("TRANSICION");
    expect(cambiarEstadoNoticia(alm, s, "n-ejemplo-mesas", "eliminar", {}, AHORA).estado).toBe(
      "TRANSICION",
    );
    expect(cambiarEstadoNoticia(alm, s, id, "eliminar", {}, AHORA).estado).toBe("OK");
    expect(obtenerNoticia(alm, s, id, AHORA).estado).toBe("NO_EXISTE");
    expect(cambiarEstadoNoticia(alm, s, "n-ejemplo-mesas", "despublicar", {}, AHORA).estado).toBe(
      "OK",
    );
  });

  it("las ediciones seguidas cuentan una sola vez en la bitácora", () => {
    const { alm, s, id } = nueva();
    const antes = alm.bitacora.length;
    guardarNoticia(alm, s, id, campos(), AHORA);
    guardarNoticia(alm, s, id, campos({ titulo: "Otro" }), AHORA + 60_000);
    expect(alm.bitacora.length - antes).toBe(1);
  });
});

describe("listado", () => {
  it("filtra por estado, formato y título sin tildes; los conteos ignoran el estado", () => {
    const alm = almacenDemo();
    const s = entrar(alm, "operador@iribarren.test");
    const r = listarNoticias(alm, s, { estado: "BORRADOR", q: "ANALISIS" }, AHORA);
    if (r.estado !== "OK") throw new Error();
    expect(r.items.map((n) => n.id)).toEqual(["n-ejemplo-puntos"]);
    expect(r.conteos.BORRADOR).toBe(1);
    const g = listarNoticias(alm, s, { formato: "GALERIA" }, AHORA);
    expect(g.estado === "OK" && g.items.length).toBe(1);
  });
});

describe("medios", () => {
  it("reconoce el tipo por la firma, no por el nombre", () => {
    expect(tipoMedio(PNG)).toBe("image/png");
    expect(tipoMedio(PDF)).toBe("application/pdf");
    expect(tipoMedio(new TextEncoder().encode("WEBVTT\n\n00:00.000"))).toBe("text/vtt");
    expect(tipoMedio(new Uint8Array([0, 0, 0, 0x18, 0x66, 0x74, 0x79, 0x70]))).toBe("video/mp4");
    expect(tipoMedio(new Uint8Array([0x1a, 0x45, 0xdf, 0xa3]))).toBe("video/webm");
    expect(tipoMedio(new TextEncoder().encode("<svg onload=alert(1)>"))).toBeUndefined();
  });

  it("valida clase y tamaño, y solo lo sirve con sesión", () => {
    const alm = almacenDemo();
    const s = entrar(alm, "operador@iribarren.test");
    expect(guardarMedio(alm, s, "imagen", "doc.pdf", PDF).estado).toBe("FORMATO");
    expect(guardarMedio(alm, s, "imagen", "x.png", new Uint8Array()).estado).toBe("VACIO");
    const grande = new Uint8Array(5 * 1024 * 1024 + 1);
    grande.set(PNG);
    expect(guardarMedio(alm, s, "imagen", "x.png", grande).estado).toBe("MUY_GRANDE");
    const r = guardarMedio(alm, s, "imagen", "foto.png", PNG);
    if (r.estado !== "OK") throw new Error();
    expect(medioDe(alm, s, r.id)?.tipo).toBe("image/png");
    // Sin sesión del panel no se sirve.
    expect(medioDe(alm, undefined, r.id)).toBeUndefined();
  });

  it("una noticia no puede usar medios de otra alcaldía", () => {
    const { alm, s, id } = nueva();
    const r = guardarNoticia(
      alm,
      s,
      id,
      campos({ portada: { src: "/medios/de-otra", alt: "x", ancho: 10, alto: 10 } }),
      AHORA,
    );
    expect(r.estado).toBe("MEDIO_AJENO");
  });
});
