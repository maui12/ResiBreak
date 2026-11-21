const ENTIDADES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

/**
 * Convierte un texto en HTML seguro. TODO dato que venga del usuario o de la base de datos
 * (nombres, especialidades, motivos...) pasa por aquí antes de meterse en el HTML de un correo;
 * si no, un nombre con "<" rompe el correo o permite inyectar contenido.
 */
export function escapar(valor: string | number): string {
  return String(valor).replace(/[&<>"']/g, (c) => ENTIDADES[c]);
}

/** Un enlace para usar en href: solo http(s), escapado. Cualquier otra cosa (javascript:, etc.) se descarta. */
export function enlaceSeguro(url: string): string {
  return /^https?:\/\//i.test(url) ? escapar(url) : '#';
}
