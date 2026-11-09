import { useEffect, useState } from 'react';

/** Fecha y hora actuales, actualizadas cada `intervaloMs` (por defecto, cada minuto). */
export function useAhora(intervaloMs = 60_000): Date {
  const [ahora, setAhora] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setAhora(new Date()), intervaloMs);
    return () => clearInterval(id);
  }, [intervaloMs]);

  return ahora;
}