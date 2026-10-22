// archivo temporal, cambiar obtenerBecados() para que retorne datos reales de la bd y borrar los mock
import { becadosMock } from './becados.mock';
import type { Becado } from './becados.types';

// Punto de acceso a los datos de becados.
// Actualmente utiliza datos temporales.
export async function obtenerBecados(): Promise<Becado[]> {
  return becadosMock;
}