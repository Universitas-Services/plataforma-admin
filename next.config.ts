import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  experimental: {
    // forbidden() para las rutas que el rol no puede ver (página 403).
    authInterrupts: true,
    // El logo del onboarding llega por Server Action (hasta 1 MB más el formulario).
    serverActions: { bodySizeLimit: "2mb" },
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
