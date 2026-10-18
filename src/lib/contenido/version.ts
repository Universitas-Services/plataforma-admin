/** 1.4 → 1.5 (cambio menor) o 1.4 → 2.0 (cambio mayor). Pura: la usan el servidor y el formulario. */
export function siguienteVersion(actual: string, tipo: "menor" | "mayor") {
  const [mayor = 1, menor = 0] = actual.split(".").map((n) => Number(n) || 0);
  return tipo === "mayor" ? `${mayor + 1}.0` : `${mayor}.${menor + 1}`;
}
