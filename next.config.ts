import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
  // «Contenido» abre en Noticias. Como redirección de configuración, sin página que prerenderizar.
  async redirects() {
    return [{ source: "/contenido", destination: "/contenido/noticias", permanent: false }];
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
