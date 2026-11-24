import { ConflictException } from '@nestjs/common';
import { type EntityManager, In } from 'typeorm';
import { Becado } from '../becados/becado.entity.js';
import { Rol } from '../common/roles.js';
import { normalizarEspecialidad } from '../turnos-disponibles/disponibilidad.js';
import { CLAVE_PENDIENTE, Usuario } from './usuario.entity.js';

export interface DatosResidente {
  rut: string;
  nombre: string;
  especialidad: string;
  correo: string | null;
}

/**
 * Usa la forma ya registrada de cada especialidad ("dermatologia" -> "Dermatología"), sin
 * distinguir mayúsculas ni tildes. Las nuevas quedan todas con la primera forma que aparece.
 */
export function unificarEspecialidades<T extends { especialidad: string }>(lista: T[], existentes: string[]): T[] {
  const canonica = new Map(existentes.map((e) => [normalizarEspecialidad(e), e]));
  return lista.map((r) => {
    const clave = normalizarEspecialidad(r.especialidad);
    if (!canonica.has(clave)) canonica.set(clave, r.especialidad.trim());
    return { ...r, especialidad: canonica.get(clave)! };
  });
}

/**
 * Crea la ficha (becados) y la cuenta de residente (usuarios) de cada uno, dentro de la transacción
 * del llamador. Usado por la carga desde Excel y por el alta manual.
 *
 * La cuenta queda sin contraseña (CLAVE_PENDIENTE) y con debeCambiarClave=true: la clave temporal
 * llegará con el correo de bienvenida (pendiente, ver src/importacion/README.md).
 * 409 si algún RUT ya está registrado o algún correo ya lo usa otra cuenta.
 */
export async function crearResidentes(m: EntityManager, residentes: DatosResidente[]) {
  const ruts = residentes.map((r) => r.rut);
  const correos = residentes.flatMap((r) => (r.correo ? [r.correo] : []));

  // En secuencia: una transacción usa una sola conexión y no admite consultas en paralelo.
  const conFicha = await m.find(Becado, { where: { rut: In(ruts) }, select: { id: true, rut: true } });
  const conCuenta = await m.find(Usuario, { where: { rut: In(ruts) }, select: { id: true, rut: true } });
  const registrados = [...new Set([...conFicha, ...conCuenta].map((x) => x.rut!))];
  if (registrados.length) {
    throw new ConflictException(
      registrados.length === 1 && residentes.length === 1
        ? 'Ya existe un usuario con ese RUT'
        : `Estos RUT ya están registrados: ${registrados.join(', ')}. Vuelve a cargar el archivo.`,
    );
  }
  if (correos.length) {
    const conCorreo = await m.find(Usuario, { where: { email: In(correos) }, select: { id: true, email: true } });
    if (conCorreo.length) {
      throw new ConflictException(`Estos correos ya los usa otra cuenta: ${conCorreo.map((u) => u.email).join(', ')}`);
    }
  }

  const fichas = await m.save(
    Becado,
    residentes.map((r) => m.create(Becado, { rut: r.rut, nombre: r.nombre, especialidad: r.especialidad })),
  );
  const cuentas = await m.save(
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
  return fichas.map((b, i) => ({ usuarioId: cuentas[i].id, becadoId: b.id, ...residentes[i] }));
}
