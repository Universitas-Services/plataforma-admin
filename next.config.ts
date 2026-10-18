import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  experimental: {
    // forbidden() para las rutas que el rol no puede ver (página 403).
    authInterrupts: true,
    // El logo del onboarding llega por Server Action (hasta 1 MB más el formulario).
    serverActions: { bodySizeLimit: "2mb" },
    // Los medios del editor suben por /api/medios y pasan por proxy.ts: videos de hasta 50 MB.
    proxyClientMaxBodySize: "52mb",
  },
  partialPrefetching: true,
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
