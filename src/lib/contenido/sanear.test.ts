import { describe, expect, it } from "vitest";
import { enlaceSeguro, sanearHtml, textoDe } from "./sanear";

describe("sanearHtml", () => {
  it("conserva lo que el editor produce", () => {
    const html =
      "<h2>Título</h2><p>Texto <strong>fuerte</strong> y <em>cursiva</em>.</p><ul><li>uno</li></ul><blockquote><p>cita</p></blockquote>";
    expect(sanearHtml(html)).toBe(html);
  });

  it("quita scripts, estilos, iframes y comentarios con su contenido", () => {
    expect(sanearHtml("<p>a</p><script>alert(1)</script><style>p{}</style>")).toBe("<p>a</p>");
    expect(sanearHtml('<iframe src="https://x"></iframe><!-- <script> -->ok')).toBe("ok");
    expect(sanearHtml("<svg><script>alert(1)</script></svg>b")).toBe("b");
  });

  it("descarta atributos de eventos y estilos", () => {
    expect(sanearHtml('<p onclick="x()" style="color:red" class="a">hola</p>')).toBe("<p>hola</p>");
    expect(sanearHtml('<img src="/medios/abc" alt="foto" onerror="alert(1)">')).toBe(
      '<img src="/medios/abc" alt="foto">',
    );
  });

  it("solo deja enlaces http, https, mailto o internos", () => {
    expect(sanearHtml('<a href="javascript:alert(1)">x</a>')).toBe("x");
    expect(sanearHtml('<a href="&#106;avascript:alert(1)">x</a>')).toBe("x");
    expect(sanearHtml('<a href="java\tscript:alert(1)">x</a>')).toBe("x");
    expect(sanearHtml('<a href="data:text/html,hi">x</a>')).toBe("x");
    expect(sanearHtml('<a href="https://iribarren.gob.ve" target="_blank">x</a>')).toBe(
      '<a href="https://iribarren.gob.ve" rel="noopener noreferrer">x</a>',
    );
    expect(enlaceSeguro("//otro.sitio")).toBeUndefined();
    expect(enlaceSeguro("/noticias")).toBe("/noticias");
  });

  it("solo deja imágenes propias y con texto alternativo", () => {
    expect(sanearHtml('<img src="https://otro.sitio/a.png" alt="x">')).toBe("");
    expect(sanearHtml('<img src="data:image/png;base64,AAAA" alt="x">')).toBe("");
    expect(sanearHtml('<img src="/medios/abc">')).toBe("");
  });

  it("normaliza etiquetas y cierra las que quedan abiertas", () => {
    expect(sanearHtml("<h1>A</h1><b>b</b><i>c</i>")).toBe("<h2>A</h2><strong>b</strong><em>c</em>");
    expect(sanearHtml("<p><strong>sin cerrar")).toBe("<p><strong>sin cerrar</strong></p>");
    expect(sanearHtml("<div><span>texto</span></div>")).toBe("texto");
  });

  it("escapa el texto suelto", () => {
    expect(sanearHtml("<p>1 < 2 & 3 > 2</p>")).toBe("<p>1 &lt; 2 &amp; 3 &gt; 2</p>");
  });
});

describe("textoDe", () => {
  it("devuelve el texto plano", () => {
    expect(textoDe("<p>Hola&nbsp;<strong>mundo</strong></p>")).toMatch(/Hola.mundo/);
    expect(textoDe("<p></p>")).toBe("");
  });
});
