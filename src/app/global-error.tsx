"use client";

import { useEffect } from "react";

/*
 * Último recurso: un error que tumba hasta el layout raíz. Pasa sobre todo con una pestaña
 * abierta durante un despliegue (archivos o acciones de la versión anterior). En ese caso se
 * recarga sola una vez; si no, ofrece recargar. Lleva su propio documento y estilos mínimos:
 * aquí no llegan los estilos del panel.
 */

const DE_VERSION =
  /ChunkLoadError|Loading chunk|Failed to find Server Action|Failed to fetch dynamically imported module/i;

export default function ErrorGlobal({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    if (!DE_VERSION.test(`${error.name} ${error.message}`)) return;
    try {
      // Como mucho una recarga automática por minuto, para no entrar en un bucle.
      const antes = Number(sessionStorage.getItem("pp_recargado") ?? 0);
      if (Date.now() - antes < 60_000) return;
      sessionStorage.setItem("pp_recargado", String(Date.now()));
    } catch {
      return;
    }
    window.location.reload();
  }, [error]);

  return (
    <html lang="es">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "grid",
          placeItems: "center",
          fontFamily: "system-ui, sans-serif",
          background: "#f8fafc",
          color: "#1e293b",
          padding: 16,
        }}
      >
        <title>Algo falló · Panel PDUL YA</title>
        <main style={{ maxWidth: 480 }}>
          <h1 style={{ fontSize: 24, margin: "0 0 8px" }}>Algo falló al cargar el panel</h1>
          <p style={{ lineHeight: 1.6, margin: "0 0 20px" }}>
            Puede que se haya publicado una versión nueva mientras tenías el panel abierto. Recarga
            la página para seguir.
          </p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => window.location.reload()}
              style={{
                minHeight: 40,
                padding: "0 16px",
                borderRadius: 8,
                border: "1px solid #2e134d",
                background: "#2e134d",
                color: "#fff",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Recargar
            </button>
            <button
              type="button"
              onClick={() => retry()}
              style={{
                minHeight: 40,
                padding: "0 16px",
                borderRadius: 8,
                border: "1px solid #e2e8f0",
                background: "#fff",
                color: "#1e293b",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Reintentar
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
