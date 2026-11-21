import { BadRequestException, ConflictException, Injectable, Logger } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { CLAVE_PENDIENTE, Usuario } from '../auth/usuario.entity.js';
import { Becado } from '../becados/becado.entity.js';
import { Rol } from '../common/roles.js';
import { TurnosDisponiblesService } from '../turnos-disponibles/turnos-disponibles.service.js';
import type { ConfirmarImportacionDto } from './dto/importacion.dto.js';
import { ArchivoInvalidoError, type ErrorFila, leerResidentesDeExcel, normalizarTexto } from './excel.js';

/** Extensiones aceptadas (el contenido lo valida SheetJS al leerlo). */
export const EXTENSIONES_EXCEL = /\.(xlsx|xls|csv)$/i;

export interface ResidenteNuevo {
  fila: number;
  rut: string;
  nombre: string;
  /** Si coincide con una existente (sin distinguir mayúsculas ni tildes), se usa la forma ya registrada. */
  especialidad: string;
  correo: string | null;
  especialidadNueva: boolean;
  aviso?: string;
}

export interface VistaPrevia {
  hoja: string;
  tieneColumnaCorreo: boolean;
  /** Filas con datos leídas del Excel (nuevas + ya registradas + con error). */
  totalFilas: number;
  nuevos: ResidenteNuevo[];
  especialidadesNuevas: { nombre: string; residentes: number }[];
  /** Para poder reemplazar una especialidad nueva por una existente (por ejemplo, un error de tipeo). */
  especialidadesExistentes: string[];
  yaRegistrados: { total: number; inactivos: { rut: string; nombre: string }[] };
  errores: ErrorFila[];
}

@Injectable()
export class ImportacionService {
  private readonly logger = new Logger(ImportacionService.name);

  constructor(
    @InjectRepository(Becado) private readonly becados: Repository<Becado>,
    @InjectRepository(Usuario) private readonly usuarios: Repository<Usuario>,
    @InjectDataSource() private readonly ds: DataSource,
    private readonly turnosDisponibles: TurnosDisponiblesService,
  ) {}

  /** Paso 1: lee el Excel y lo compara con la BD. No guarda nada. */
  async vistaPrevia(contenido: Buffer, nombreArchivo: string): Promise<VistaPrevia> {
    if (!EXTENSIONES_EXCEL.test(nombreArchivo)) {
      throw new BadRequestException('El archivo debe ser un Excel (.xlsx o .xls) o un CSV');
    }
    let lectura;
    try {
      lectura = leerResidentesDeExcel(contenido);
    } catch (e) {
      if (e instanceof ArchivoInvalidoError) throw new BadRequestException(e.message);
      throw e;
    }

    const ruts = lectura.filas.map((f) => f.rut);
    const correos = lectura.filas.flatMap((f) => (f.correo ? [f.correo] : []));
    const [becadosExistentes, cuentasExistentes, correosUsados, existentes] = await Promise.all([
      ruts.length ? this.becados.find({ where: { rut: In(ruts) }, select: { id: true, rut: true, nombre: true, activo: true } }) : [],
      ruts.length ? this.usuarios.find({ where: { rut: In(ruts) }, select: { id: true, rut: true, rol: true } }) : [],
      correos.length ? this.usuarios.find({ where: { email: In(correos) }, select: { id: true, email: true } }) : [],
      this.turnosDisponibles.especialidades(),
    ]);
    const becadoPorRut = new Map(becadosExistentes.map((b) => [b.rut, b]));
    const cuentaPorRut = new Map(cuentasExistentes.map((u) => [u.rut, u]));
    const correoEnUso = new Set(correosUsados.map((u) => u.email));

    // Forma "oficial" de cada especialidad: la ya registrada o, si es nueva, la primera que aparece en el Excel.
    const canonica = new Map(existentes.map((e) => [normalizarTexto(e), e]));
    const nuevas = new Map<string, { nombre: string; residentes: number }>();

    const nuevos: ResidenteNuevo[] = [];
    const errores = [...lectura.errores];
    const inactivos: { rut: string; nombre: string }[] = [];
    let yaRegistrados = 0;

    for (const f of lectura.filas) {
      const becado = becadoPorRut.get(f.rut);
      if (becado) {
        yaRegistrados++;
        if (!becado.activo) inactivos.push({ rut: f.rut, nombre: becado.nombre });
        continue;
      }
      const cuenta = cuentaPorRut.get(f.rut);
      if (cuenta) {
        errores.push({ fila: f.fila, motivo: `El RUT ya tiene una cuenta con rol ${cuenta.rol}` });
        continue;
      }

      const clave = normalizarTexto(f.especialidad);
      const existente = canonica.get(clave);
      if (!existente) {
        const nueva = nuevas.get(clave) ?? { nombre: f.especialidad, residentes: 0 };
        nueva.residentes++;
        nuevas.set(clave, nueva);
      }

      let { correo, aviso } = f;
      if (correo && correoEnUso.has(correo)) {
        aviso = 'El correo ya lo usa otra cuenta: se ingresará sin correo';
        correo = null;
      }
      nuevos.push({
        fila: f.fila,
        rut: f.rut,
        nombre: f.nombre,
        especialidad: existente ?? nuevas.get(clave)!.nombre,
        correo,
        especialidadNueva: !existente,
        ...(aviso ? { aviso } : {}),
      });
    }

    return {
      hoja: lectura.hoja,
      tieneColumnaCorreo: lectura.tieneColumnaCorreo,
      totalFilas: lectura.filas.length + lectura.errores.length,
      nuevos,
      especialidadesNuevas: [...nuevas.values()].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')),
      especialidadesExistentes: existentes,
      yaRegistrados: { total: yaRegistrados, inactivos },
      errores: errores.sort((a, b) => a.fila - b.fila),
    };
  }

  /**
   * Paso 2: crea las fichas (becados) y las cuentas de residente, todo o nada.
   * Vuelve a validar contra la BD: la lista viene del cliente y pudo cambiar desde la vista previa.
   * Las cuentas quedan sin contraseña (CLAVE_PENDIENTE) y con debeCambiarClave=true: la clave
   * temporal llegará con el correo de bienvenida (pendiente, ver README.md).
   */
  async confirmar(dto: ConfirmarImportacionDto) {
    const repetidos = (valores: string[]) => [...new Set(valores.filter((v, i) => valores.indexOf(v) !== i))];
    const rutsRepetidos = repetidos(dto.residentes.map((r) => r.rut));
    if (rutsRepetidos.length) throw new BadRequestException(`RUT repetidos en la lista: ${rutsRepetidos.join(', ')}`);
    const correos = dto.residentes.flatMap((r) => (r.correo ? [r.correo] : []));
    const correosRepetidos = repetidos(correos);
    if (correosRepetidos.length) throw new BadRequestException(`Correos repetidos en la lista: ${correosRepetidos.join(', ')}`);

    const canonica = new Map((await this.turnosDisponibles.especialidades()).map((e) => [normalizarTexto(e), e]));
    const residentes = dto.residentes.map((r) => {
      const clave = normalizarTexto(r.especialidad);
      if (!canonica.has(clave)) canonica.set(clave, r.especialidad); // nueva: todas usan la misma forma
      return { ...r, especialidad: canonica.get(clave)!, correo: r.correo ?? null };
    });

    const creados = await this.ds.transaction(async (m) => {
      const ruts = residentes.map((r) => r.rut);
      // En secuencia: una transacción usa una sola conexión y no admite consultas en paralelo.
      const conFicha = await m.find(Becado, { where: { rut: In(ruts) }, select: { id: true, rut: true } });
      const conCuenta = await m.find(Usuario, { where: { rut: In(ruts) }, select: { id: true, rut: true } });
      const conCorreo = correos.length
        ? await m.find(Usuario, { where: { email: In(correos) }, select: { id: true, email: true } })
        : [];
      const registrados = [...new Set([...conFicha, ...conCuenta].map((x) => x.rut!))];
      if (registrados.length) {
        throw new ConflictException(`Estos RUT ya están registrados: ${registrados.join(', ')}. Vuelve a cargar el archivo.`);
      }
      if (conCorreo.length) {
        throw new ConflictException(`Estos correos ya los usa otra cuenta: ${conCorreo.map((u) => u.email).join(', ')}`);
      }

      const fichas = await m.save(
        Becado,
        residentes.map((r) => m.create(Becado, { rut: r.rut, nombre: r.nombre, especialidad: r.especialidad })),
      );
      await m.save(
        Usuario,
        fichas.map((b, i) =>
          m.create(Usuario, {
            rut: b.rut!,
            passwordHash: CLAVE_PENDIENTE,
            rol: Rol.RESIDENTE,
            becadoId: b.id,
            email: residentes[i].correo,
            debeCambiarClave: true,
          }),
        ),
      );
      return fichas.map((b, i) => ({ becadoId: b.id, ...residentes[i] }));
    });

    const sinCorreo = creados.filter((r) => !r.correo).length;
    this.logger.log(`Importación desde Excel: ${creados.length} residentes creados (${sinCorreo} sin correo)`);
    return {
      creados: creados.length,
      sinCorreo,
      /** El correo de bienvenida todavía no se envía (ver README.md de importacion). */
      correosEnviados: 0,
      residentes: creados,
    };
  }
}
