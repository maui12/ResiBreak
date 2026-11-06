const FORMATO = /^(\d{1,2})\.?(\d{3})\.?(\d{3})-?([\dkK])$/;

/** "12.345.678-k" -> "12345678-K". Si no tiene forma de RUT, lo devuelve tal cual (la validación lo rechaza). */
export function normalizarRut(valor: string): string {
  const m = FORMATO.exec(valor.trim());
  if (!m) return valor.trim();
  return `${m[1]}${m[2]}${m[3]}-${m[4].toUpperCase()}`;
}

export function calcularDv(cuerpo: string): string {
  let suma = 0;
  let mult = 2;
  for (let i = cuerpo.length - 1; i >= 0; i--) {
    suma += Number(cuerpo[i]) * mult;
    mult = mult === 7 ? 2 : mult + 1;
  }
  const resto = 11 - (suma % 11);
  if (resto === 11) return '0';
  if (resto === 10) return 'K';
  return String(resto);
}

export function esRutValido(valor: string): boolean {
  const m = /^(\d{7,8})-([\dK])$/.exec(normalizarRut(valor));
  return !!m && calcularDv(m[1]) === m[2];
}