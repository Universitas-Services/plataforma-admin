import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /*
   * Id del despliegue (Netlify: DEPLOY_ID). Tras un despliegue, una pestaña abierta con la
   * versión anterior recarga la página completa en vez de pedir archivos o acciones que ya no
   * existen (la pantalla en blanco). Sin id (en local), Next usa su comportamiento normal.
   */
  deploymentId: process.env.NEXT_DEPLOYMENT_ID || process.env.DEPLOY_ID || undefined,
  cacheComponents: true,
  experimental: {
    // forbidden() para las rutas que el rol no puede ver (página 403).
    authInterrupts: true,
    // El logo del onboarding llega por Server Action (hasta 1 MB más el formulario).
    serverActions: { bodySizeLimit: "2mb" },
    // Sin plataforma-api, los medios suben por /api/medios y pasan por proxy.ts: videos de hasta
    // 30 MB. Con la API, el navegador sube directo a ella con un ticket (guía R6).
    proxyClientMaxBodySize: "32mb",
  },
  partialPrefetching: true,
  async redirects() {
    return [
      // «Contenido» abre en Noticias. Como redirección de configuración, sin página que prerenderizar.
      { source: "/contenido", destination: "/contenido/noticias", permanent: false },
      /*
       * Las fichas llevan el id en la consulta (?id=): en Netlify, una ruta [id] con un UUID que
       * no se generó al compilar respondía 500. Las direcciones viejas (enlaces guardados o
       * compartidos) siguen funcionando.
       */
      {
        source: "/ciudadanos/:id((?!ficha$|exportar$)[^/]+)",
        destination: "/ciudadanos/ficha?id=:id",
        permanent: false,
      },
      ...["noticias", "documentos", "banners"].map((t) => ({
        source: `/contenido/${t}/:id((?!editar$)[^/]+)`,
        destination: `/contenido/${t}/editar?id=:id`,
        permanent: false,
      })),
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
