"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useEffectEvent, useRef } from "react";

/*
 * Mantiene al día lo que la página sabe de la sesión (la misma pieza del portal,
 * portal-iribarren/src/components/layout/vigia-sesion.tsx). El marco del panel está en el
 * layout, que no se vuelve a pedir al navegar: si la sesión se cerró (15 minutos sin
 * actividad), seguiría a la vista hasta la próxima acción. Este vigía consulta /api/sesion:
 *
 * - cuando la persona usa la página (como mucho cada 4 minutos), así redactar una noticia larga
 *   cuenta como actividad aunque no se pida ninguna página;
 * - al volver a la pestaña y al cambiar de ruta;
 * - al cumplirse el plazo de inactividad desde la última consulta (un reloj cada 30 segundos).
 *
 * Si la sesión pasó de abierta a cerrada, refresca la página (el encabezado cambia a «Ingresar»)
 * y, en una ruta privada, lleva a «Iniciar sesión» con el aviso de inactividad.
 */

const CADA_MS = 4 * 60_000;

export function VigiaSesion({
  minutos,
  privadas,
}: {
  /** Minutos sin actividad que cierran la sesión (los mismos de Proxy). */
  minutos: number;
  /** Prefijos de las rutas que exigen sesión («/»: todas). */
  privadas: string[];
}) {
  const router = useRouter();
  const ruta = usePathname();
  const abierta = useRef<boolean | null>(null);
  const ultimaConsulta = useRef(0);

  const consultar = useEffectEvent(async () => {
    ultimaConsulta.current = Date.now();
    let conSesion: boolean;
    try {
      const r = await fetch("/api/sesion", { cache: "no-store" });
      conSesion = ((await r.json()) as { conSesion: boolean }).conSesion;
    } catch {
      return; // Sin conexión: se vuelve a intentar con la próxima actividad.
    }
    const antes = abierta.current;
    abierta.current = conSesion;
    if (conSesion || antes !== true) return;
    if (privadas.some((p) => p === "/" || ruta === p || ruta.startsWith(`${p}/`))) {
      // Carga completa: así también el encabezado llega sin la sesión.
      const volver = encodeURIComponent(`${ruta}${window.location.search}`);
      window.location.replace(`/ingresar?volver=${volver}&aviso=inactividad`);
    } else router.refresh();
  });

  useEffect(() => {
    void consultar();
  }, [ruta]);

  useEffect(() => {
    const alUsar = () => {
      if (Date.now() - ultimaConsulta.current > CADA_MS) void consultar();
    };
    const alVolver = () => {
      if (document.visibilityState === "visible") void consultar();
    };
    // Cumplido el plazo sin actividad desde la última consulta, se comprueba (Proxy la habrá
    // cerrado) aunque la persona no toque nada.
    const reloj = setInterval(() => {
      const vencida = Date.now() - ultimaConsulta.current > minutos * 60_000 + 5_000;
      if (abierta.current && vencida) void consultar();
    }, 30_000);
    const eventos = ["pointerdown", "keydown", "scroll", "touchstart"] as const;
    for (const e of eventos) window.addEventListener(e, alUsar, { passive: true });
    document.addEventListener("visibilitychange", alVolver);
    return () => {
      for (const e of eventos) window.removeEventListener(e, alUsar);
      document.removeEventListener("visibilitychange", alVolver);
      clearInterval(reloj);
    };
  }, [minutos]);

  return null;
}
