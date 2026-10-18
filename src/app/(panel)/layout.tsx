import { Suspense, type ReactNode } from "react";
import { MarcoPanel, MarcoPanelEsqueleto } from "@/components/panel/marco-panel";

export default function PanelLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<MarcoPanelEsqueleto />}>
      <MarcoPanel>{children}</MarcoPanel>
    </Suspense>
  );
}
