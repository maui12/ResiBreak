/**
 * "juan.perez@ucn.cl" -> "ju***@ucn.cl". Los correos son datos personales: en los logs se
 * muestran así, nunca completos.
 */
export function ocultarCorreo(correo: string): string {
  const [usuario, dominio] = correo.split('@');
  if (!dominio) return '***';
  return `${usuario.slice(0, 2)}***@${dominio}`;
}
