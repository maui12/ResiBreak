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

    return {
      id: dia,
      dia,
      becado: becado.nombre,
      hospital: becado.hospital,
      comidas: [...combinacionesComida[index % combinacionesComida.length]],
      estado: dia <= 16 ? 'Repartido' : 'Programado',
    };
  },
);