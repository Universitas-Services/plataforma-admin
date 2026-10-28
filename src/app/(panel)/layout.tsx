import { Suspense, type ReactNode } from "react";
import { MarcoPanel, MarcoPanelEsqueleto } from "@/components/panel/marco-panel";
import { VigiaSesion } from "@/components/panel/vigia-sesion";
import { INACTIVIDAD_MS } from "@/lib/api/renovacion";

export default function PanelLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Suspense fallback={<MarcoPanelEsqueleto />}>
        <MarcoPanel>{children}</MarcoPanel>
      </Suspense>
      {/* Todo el panel exige sesión. */}
      <VigiaSesion minutos={INACTIVIDAD_MS / 60_000} privadas={["/"]} />
    </>
  );
}
