import { RedirectType, redirect } from "next/navigation";

/** «Contenido» abre en Noticias; banners y documentos llegan en la siguiente pasada del 2.9. */
export default function ContenidoPage() {
  redirect("/contenido/noticias", RedirectType.replace);
}
