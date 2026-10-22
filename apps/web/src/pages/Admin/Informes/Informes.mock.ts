// Datos ficticios solo para mostrar la pantalla de Informes.
// Cuando exista el backend, reemplaza `obtenerTurnosInforme` por una llamada
// real (por ejemplo GET /informes/turnos) que devuelva la misma forma.

export type TipoComida = 'Desayuno' | 'Almuerzo' | 'Once' | 'Cena';
export type TipoTurno = 'normal' | '24h';

export interface TurnoInforme {
  id: string;
  /** Fecha del turno en formato AAAA-MM-DD */
  fecha: string;
  becado: string;
  especialidad: string;
  hospital: string;
  tipo: TipoTurno;
  comidas: TipoComida[];
  monto: number;
}

export const PRECIOS_COMIDA: Record<TipoComida, number> = {
  Desayuno: 3200,
  Almuerzo: 5400,
  Once: 3800,
  Cena: 5600,
};

const BECADOS = [
  { nombre: 'Valentina Rojas', especialidad: 'Terapia Intensiva', hospital: 'Coquimbo' },
  { nombre: 'Josefa Ferres', especialidad: 'Medicina de Urgencia', hospital: 'La Serena' },
  { nombre: 'Ignacio Bravo', especialidad: 'Cirugía General', hospital: 'Coquimbo' },
  { nombre: 'Matías Fuentes', especialidad: 'Cardiología', hospital: 'Ovalle' },
  { nombre: 'Diego Villanueva', especialidad: 'Medicina Interna', hospital: 'La Serena' },
  { nombre: 'Camila Soto', especialidad: 'Pediatría', hospital: 'Coquimbo' },
  { nombre: 'Andrés Mardones', especialidad: 'Anestesiología', hospital: 'Ovalle' },
  { nombre: 'Fernanda Ossa', especialidad: 'Traumatología', hospital: 'La Serena' },
  { nombre: 'Paula Leiva', especialidad: 'Neurología', hospital: 'Coquimbo' },
  { nombre: 'Tomás Aravena', especialidad: 'Ginecología y Obstetricia', hospital: 'Ovalle' },
];

// Generador pseudoaleatorio con semilla fija: los datos son siempre los mismos.
function crearGenerador(semilla: number) {
  let a = semilla;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function aISO(fecha: Date): string {
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${fecha.getFullYear()}-${mes}-${dia}`;
}

function generarTurnos(): TurnoInforme[] {
  const azar = crearGenerador(2026);
  const turnos: TurnoInforme[] = [];
  const hoy = new Date();
  let contador = 1;

  for (
    const dia = new Date(2025, 0, 1);
    dia <= hoy;
    dia.setDate(dia.getDate() + 1)
  ) {
    const finDeSemana = dia.getDay() === 0 || dia.getDay() === 6;
    const sorteo = azar();

    // Fines de semana: guardia de 24 h. Días hábiles: turno normal.
    const cantidad = finDeSemana
      ? sorteo < 0.2 ? 0 : sorteo < 0.8 ? 1 : 2
      : sorteo < 0.3 ? 0 : sorteo < 0.75 ? 1 : 2;

    const usados = new Set<number>();

    for (let i = 0; i < cantidad; i++) {
      let indice = Math.floor(azar() * BECADOS.length);
      while (usados.has(indice)) {
        indice = Math.floor(azar() * BECADOS.length);
      }
      usados.add(indice);

      const becado = BECADOS[indice];
      const comidas: TipoComida[] = finDeSemana
        ? ['Desayuno', 'Almuerzo', 'Once', 'Cena']
        : azar() < 0.7
          ? ['Desayuno', 'Almuerzo', 'Once']
          : ['Almuerzo', 'Once'];

      turnos.push({
        id: `turno-${contador++}`,
        fecha: aISO(dia),
        becado: becado.nombre,
        especialidad: becado.especialidad,
        hospital: becado.hospital,
        tipo: finDeSemana ? '24h' : 'normal',
        comidas,
        monto: comidas.reduce((suma, comida) => suma + PRECIOS_COMIDA[comida], 0),
      });
    }
  }

  return turnos;
}

const TURNOS_INFORME = generarTurnos();

export function obtenerTurnosInforme(): Promise<TurnoInforme[]> {
  return Promise.resolve(TURNOS_INFORME);
}