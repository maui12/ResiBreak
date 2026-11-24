import type {
  ContabilidadComida,
  PedidoReparto,
} from './pedidos.types';

export const MAX_DIA_MES = 31;

export const contabilidadMock: ContabilidadComida[] = [
  { tipo: 'Desayunos', cantidad: 26, valorUnitario: 3200 },
  { tipo: 'Almuerzos', cantidad: 29, valorUnitario: 6800 },
  { tipo: 'Onces', cantidad: 29, valorUnitario: 3200 },
  { tipo: 'Cenas', cantidad: 9, valorUnitario: 6200 },
];

const becados = [
  { nombre: 'Matías Fuentes', hospital: 'La Serena' },
  { nombre: 'Diego Villanueva', hospital: 'Coquimbo' },
  { nombre: 'Ignacio Bravo', hospital: 'La Serena' },
  { nombre: 'Valentina Rojas', hospital: 'La Serena' },
  { nombre: 'Camila Soto', hospital: 'Coquimbo' },
  { nombre: 'Josefa Ferres', hospital: 'Coquimbo' },
  { nombre: 'Andrés Mardones', hospital: 'Ovalle' },
  { nombre: 'Paula Leiva', hospital: 'La Serena' },
  { nombre: 'Tomás Aravena', hospital: 'Ovalle' },
  { nombre: 'Fernanda Ossa', hospital: 'La Serena' },
];

const combinacionesComida = [
  ['Desayunos', 'Almuerzos', 'Onces'],
  ['Almuerzos', 'Onces'],
  ['Desayunos', 'Almuerzos', 'Onces', 'Cenas'],
  ['Desayunos', 'Almuerzos', 'Onces'],
  ['Almuerzos', 'Onces'],
  ['Desayunos', 'Almuerzos', 'Onces', 'Cenas'],
  ['Desayunos', 'Almuerzos', 'Onces', 'Cenas'],
] as const;

export const pedidosMock: PedidoReparto[] = Array.from(
  { length: 30 },
  (_, index) => {
    const dia = index + 1;
    const becado = becados[(index + 1) % becados.length];
    const comidas = [...combinacionesComida[index % combinacionesComida.length]];
    const total = comidas.length;

    // Días 1-12 con las dos confirmaciones, 13-16 con una sola parte, el resto sin confirmar.
    const confirmaciones =
      dia <= 12
        ? { proveedor: total, residente: total }
        : dia <= 16
          ? dia % 2 === 0
            ? { proveedor: total, residente: 0 }
            : { proveedor: 0, residente: total }
          : { proveedor: 0, residente: 0 };

    return {
      id: dia,
      dia,
      becado: becado.nombre,
      hospital: becado.hospital,
      comidas,
      estado: dia <= 12 ? 'Repartido' : dia <= 16 ? 'Parcialmente repartido' : 'Programado',
      confirmaciones,
    };
  },
);