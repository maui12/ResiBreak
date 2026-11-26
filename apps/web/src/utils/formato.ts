/** 1234567 -> "1.234.567" */
export function formatoNumero(valor: number): string {
  const signo = valor < 0 ? '-' : '';
  return signo + String(Math.round(Math.abs(valor))).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/** 1234567 -> "$1.234.567" (pesos chilenos, sin decimales) */
export function formatoPesos(valor: number): string {
  return `$${formatoNumero(valor)}`;
}

/** Sin mayúsculas ni tildes, para buscar "pediatria" y encontrar "Pediatría". */
export function normalizarBusqueda(texto: string): string {
  return texto.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim();
}
