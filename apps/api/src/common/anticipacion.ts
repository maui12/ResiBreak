/**
 * ¿El día (AAAA-MM-DD, medido desde las 00:00) empieza al menos `horas` horas después de `ahora`?
 * Es la misma regla que usa la app móvil para habilitar días en el calendario.
 * Rechaza también las fechas pasadas. Requiere TZ=America/Santiago en el servidor.
 */
export function cumpleAnticipacion(fecha: string, horas: number, ahora: number = Date.now()): boolean {
  const inicio = new Date(`${fecha}T00:00:00`).getTime();
  return inicio >= ahora + horas * 3_600_000;
}