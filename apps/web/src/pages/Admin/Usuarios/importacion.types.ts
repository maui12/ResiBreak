// Respuestas de POST /api/becados/importar/* (ver apps/api/src/importacion/README.md).

export interface ResidenteNuevo {
  fila: number;
  rut: string;
  nombre: string;
  especialidad: string;
  correo: string | null;
  especialidadNueva: boolean;
  aviso?: string;
}

export interface ErrorFila {
  fila: number;
  motivo: string;
}

export interface VistaPrevia {
  hoja: string;
  tieneColumnaCorreo: boolean;
  totalFilas: number;
  nuevos: ResidenteNuevo[];
  especialidadesNuevas: { nombre: string; residentes: number }[];
  especialidadesExistentes: string[];
  yaRegistrados: { total: number; inactivos: { rut: string; nombre: string }[] };
  errores: ErrorFila[];
}

export interface ResultadoImportacion {
  creados: number;
  sinCorreo: number;
  correosEnviados: number;
  residentes: { becadoId: number; rut: string; nombre: string; especialidad: string; correo: string | null }[];
}
