import { useEffect, useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import { ApiError } from '../../../utils/api';
import {
  confirmarResidentes,
  CORREO_BIENVENIDA_HABILITADO,
  especialidadesNuevas,
  EXTENSIONES_ACEPTADAS,
  obtenerVistaPrevia,
  TAMANO_MAXIMO_ARCHIVO,
} from './importacion.service';
import type { ResidenteNuevo, ResultadoImportacion, VistaPrevia } from './importacion.types';

type Dialogo =
  | { tipo: 'confirmar' }
  | { tipo: 'quitarEspecialidad'; especialidad: string; residentes: number };

const mensajeError = (e: unknown) => (e instanceof ApiError ? e.message : 'Ocurrió un error inesperado.');
const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;

/** Carga de residentes nuevos desde Excel: elegir archivo → revisar → confirmar. */
function ImportarResidentes({ onVolver }: { onVolver: () => void }) {
  const [vista, setVista] = useState<VistaPrevia | null>(null);
  const [residentes, setResidentes] = useState<ResidenteNuevo[]>([]);
  const [resultado, setResultado] = useState<ResultadoImportacion | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [arrastrando, setArrastrando] = useState(false);
  const [dialogo, setDialogo] = useState<Dialogo | null>(null);
  const dialogoRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const d = dialogoRef.current;
    if (!d) return;
    if (dialogo && !d.open) d.showModal();
    if (!dialogo && d.open) d.close();
  }, [dialogo]);

  const nuevasEspecialidades = especialidadesNuevas(residentes);
  const sinCorreo = residentes.filter((r) => !r.correo).length;

  async function subir(archivo: File | undefined) {
    if (!archivo) return;
    setError(null);
    if (!/\.(xlsx|xls|csv)$/i.test(archivo.name)) {
      setError('El archivo debe ser un Excel (.xlsx o .xls) o un CSV.');
      return;
    }
    if (archivo.size > TAMANO_MAXIMO_ARCHIVO) {
      setError('El archivo supera los 2 MB.');
      return;
    }
    setCargando(true);
    try {
      const datos = await obtenerVistaPrevia(archivo);
      setVista(datos);
      setResidentes(datos.nuevos);
    } catch (e) {
      setError(mensajeError(e));
    } finally {
      setCargando(false);
      if (inputRef.current) inputRef.current.value = ''; // permite volver a elegir el mismo archivo
    }
  }

  function alSoltar(e: DragEvent) {
    e.preventDefault();
    setArrastrando(false);
    void subir(e.dataTransfer.files[0]);
  }

  function quitarResidente(rut: string) {
    setResidentes((lista) => lista.filter((r) => r.rut !== rut));
  }

  function quitarEspecialidad(especialidad: string) {
    setResidentes((lista) => lista.filter((r) => !(r.especialidadNueva && r.especialidad === especialidad)));
    setDialogo(null);
  }

  function reemplazarEspecialidad(nueva: string, existente: string) {
    if (!existente) return;
    setResidentes((lista) =>
      lista.map((r) =>
        r.especialidadNueva && r.especialidad === nueva ? { ...r, especialidad: existente, especialidadNueva: false } : r,
      ),
    );
  }

  async function confirmar() {
    setDialogo(null);
    setCargando(true);
    setError(null);
    try {
      setResultado(await confirmarResidentes(residentes));
    } catch (e) {
      setError(mensajeError(e));
    } finally {
      setCargando(false);
    }
  }

  function reiniciar() {
    setVista(null);
    setResidentes([]);
    setResultado(null);
    setError(null);
  }

  /* ------------------------------- Resultado ------------------------------- */
  if (resultado) {
    return (
      <section className="usuarios-card">
        <h2>Residentes agregados</h2>
        <p className="importar-exito" role="status">
          Se {resultado.creados === 1 ? 'agregó' : 'agregaron'} {plural(resultado.creados, 'residente nuevo', 'residentes nuevos')}.
        </p>
        {resultado.sinCorreo > 0 && (
          <p className="importar-alerta" role="alert">
            ⚠ {plural(resultado.sinCorreo, 'residente quedó', 'residentes quedaron')} sin correo: no{' '}
            {resultado.sinCorreo === 1 ? 'recibirá' : 'recibirán'} el mensaje de bienvenida hasta que se les registre uno.
          </p>
        )}
        {!CORREO_BIENVENIDA_HABILITADO && (
          <p className="importar-nota">
            El envío del correo de bienvenida aún no está habilitado: las cuentas quedaron creadas, pero sin contraseña.
          </p>
        )}
        <div className="importar-acciones">
          <button type="button" className="boton-secundario" onClick={onVolver}>
            Volver
          </button>
          <button type="button" className="boton-primario" onClick={reiniciar}>
            Cargar otro archivo
          </button>
        </div>
      </section>
    );
  }

  /* ----------------------------- Elegir archivo ----------------------------- */
  if (!vista) {
    return (
      <section className="usuarios-card">
        <h2>Agregar residentes nuevos</h2>
        <p className="importar-nota">
          Sube el Excel con los residentes. Se usan las columnas <strong>NOMBRE</strong>, <strong>RUT</strong> y{' '}
          <strong>ESPECIALIDAD</strong> (y <strong>CORREO</strong>, si viene); las demás se ignoran. Nada se guarda
          hasta que confirmes.
        </p>
        <label
          className={`importar-zona ${arrastrando ? 'importar-zona--activa' : ''}`}
          onDragOver={(e) => {
            e.preventDefault();
            setArrastrando(true);
          }}
          onDragLeave={() => setArrastrando(false)}
          onDrop={alSoltar}
        >
          <input
            ref={inputRef}
            type="file"
            accept={EXTENSIONES_ACEPTADAS}
            disabled={cargando}
            onChange={(e: ChangeEvent<HTMLInputElement>) => void subir(e.target.files?.[0])}
          />
          <span className="importar-zona-titulo">{cargando ? 'Leyendo archivo…' : 'Elegir archivo Excel'}</span>
          <span className="importar-zona-detalle">o arrástralo aquí · .xlsx, .xls o .csv · máximo 2 MB</span>
        </label>
        {error && (
          <p className="usuarios-error" role="alert">
            {error}
          </p>
        )}
        <div className="importar-acciones">
          <button type="button" className="boton-secundario" onClick={onVolver}>
            Volver
          </button>
        </div>
      </section>
    );
  }

  /* -------------------------------- Revisar -------------------------------- */
  return (
    <>
      <section className="usuarios-card">
        <h2>Revisión del archivo</h2>
        <ul className="importar-resumen">
          <li>
            <strong>{vista.totalFilas}</strong> filas leídas (hoja «{vista.hoja}»)
          </li>
          <li>
            <strong>{vista.nuevos.length}</strong> residentes nuevos
          </li>
          <li>
            <strong>{vista.yaRegistrados.total}</strong> ya estaban registrados
          </li>
          {vista.errores.length > 0 && (
            <li className="importar-resumen-error">
              <strong>{vista.errores.length}</strong> filas con problemas
            </li>
          )}
        </ul>

        {!vista.tieneColumnaCorreo ? (
          <p className="importar-alerta" role="alert">
            ⚠ El archivo no trae la columna CORREO: los residentes se ingresarán sin correo y no recibirán el mensaje de
            bienvenida.
          </p>
        ) : (
          sinCorreo > 0 && (
            <p className="importar-alerta" role="alert">
              ⚠ {plural(sinCorreo, 'residente nuevo no tiene', 'residentes nuevos no tienen')} correo (marcados abajo):
              se {sinCorreo === 1 ? 'ingresará' : 'ingresarán'} sin correo y no {sinCorreo === 1 ? 'recibirá' : 'recibirán'}{' '}
              el mensaje de bienvenida.
            </p>
          )
        )}

        {vista.yaRegistrados.inactivos.length > 0 && (
          <p className="importar-nota">
            {plural(vista.yaRegistrados.inactivos.length, 'residente del archivo está desactivado', 'residentes del archivo están desactivados')}{' '}
            ({vista.yaRegistrados.inactivos.map((r) => r.nombre).join(', ')}). No se vuelven a crear.
          </p>
        )}

        {vista.errores.length > 0 && (
          <details className="importar-errores">
            <summary>Ver filas con problemas (no se agregarán)</summary>
            <ul>
              {vista.errores.map((e) => (
                <li key={`${e.fila}-${e.motivo}`}>
                  Fila {e.fila}: {e.motivo}
                </li>
              ))}
            </ul>
          </details>
        )}
      </section>

      <div className="importar-cuadros">
        <section className="usuarios-card">
          <h2>Residentes nuevos ({residentes.length})</h2>
          {residentes.length === 0 ? (
            <p className="importar-nota">No hay residentes nuevos para agregar.</p>
          ) : (
            <div className="table-scroll">
              <table className="usuarios-tabla">
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>RUT</th>
                    <th>Especialidad</th>
                    <th>Correo</th>
                    <th aria-label="Quitar" />
                  </tr>
                </thead>
                <tbody>
                  {residentes.map((r) => (
                    <tr key={r.rut}>
                      <td>{r.nombre}</td>
                      <td className="numerico">{r.rut}</td>
                      <td>
                        {r.especialidad}
                        {r.especialidadNueva && <span className="etiqueta etiqueta--nueva">nueva</span>}
                      </td>
                      <td>
                        {r.correo ?? <span className="etiqueta etiqueta--alerta">⚠ Sin correo</span>}
                        {r.aviso && <span className="importar-aviso">{r.aviso}</span>}
                      </td>
                      <td>
                        <button
                          type="button"
                          className="boton-quitar"
                          onClick={() => quitarResidente(r.rut)}
                          aria-label={`Quitar a ${r.nombre}`}
                          title="Quitar de la lista"
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="usuarios-card">
          <h2>Especialidades nuevas ({nuevasEspecialidades.length})</h2>
          {nuevasEspecialidades.length === 0 ? (
            <p className="importar-nota">Todas las especialidades ya existen.</p>
          ) : (
            <>
              <p className="importar-nota">
                Si una es un error de escritura, reemplázala por una existente. Al quitarla, también se quitan sus
                residentes.
              </p>
              <ul className="importar-especialidades">
                {nuevasEspecialidades.map((e) => (
                  <li key={e.nombre}>
                    <div>
                      <strong>{e.nombre}</strong>
                      <span className="importar-nota"> · {plural(e.residentes, 'residente', 'residentes')}</span>
                    </div>
                    <div className="importar-especialidad-acciones">
                      <select
                        value=""
                        aria-label={`Reemplazar ${e.nombre} por una especialidad existente`}
                        onChange={(ev) => reemplazarEspecialidad(e.nombre, ev.target.value)}
                      >
                        <option value="">Reemplazar por…</option>
                        {vista.especialidadesExistentes.map((x) => (
                          <option key={x} value={x}>
                            {x}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        className="boton-quitar"
                        onClick={() => setDialogo({ tipo: 'quitarEspecialidad', especialidad: e.nombre, residentes: e.residentes })}
                        aria-label={`Quitar la especialidad ${e.nombre}`}
                        title="Quitar especialidad"
                      >
                        ✕
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      </div>

      {error && (
        <p className="usuarios-error" role="alert">
          {error}
        </p>
      )}

      <div className="importar-acciones">
        <button type="button" className="boton-secundario" onClick={reiniciar} disabled={cargando}>
          Cargar otro archivo
        </button>
        <button
          type="button"
          className="boton-secundario"
          onClick={() => setResidentes(vista.nuevos)}
          disabled={cargando || residentes === vista.nuevos}
        >
          Restablecer lista
        </button>
        <button
          type="button"
          className="boton-primario"
          onClick={() => setDialogo({ tipo: 'confirmar' })}
          disabled={cargando || residentes.length === 0}
        >
          {cargando ? 'Guardando…' : 'Confirmar nuevos residentes'}
        </button>
      </div>

      <dialog ref={dialogoRef} className="importar-dialogo" onClose={() => setDialogo(null)}>
        {dialogo?.tipo === 'confirmar' && (
          <>
            <h2>¿Agregar {plural(residentes.length, 'residente nuevo', 'residentes nuevos')}?</h2>
            <p>
              Se agregarán {plural(residentes.length, 'residente nuevo', 'residentes nuevos')}
              {nuevasEspecialidades.length > 0 &&
                ` y ${plural(nuevasEspecialidades.length, 'especialidad nueva', 'especialidades nuevas')}`}
              . Se enviará un correo a la dirección de cada residente con el mensaje de bienvenida y su clave temporal de
              primer ingreso.
            </p>
            {sinCorreo > 0 && (
              <p className="importar-alerta">
                ⚠ {plural(sinCorreo, 'residente no tiene', 'residentes no tienen')} correo y no{' '}
                {sinCorreo === 1 ? 'recibirá' : 'recibirán'} el mensaje.
              </p>
            )}
            {!CORREO_BIENVENIDA_HABILITADO && (
              <p className="importar-nota">Por ahora el envío de correos no está habilitado.</p>
            )}
            <div className="importar-acciones">
              <button type="button" className="boton-secundario" onClick={() => setDialogo(null)}>
                Cancelar
              </button>
              <button type="button" className="boton-primario" onClick={() => void confirmar()}>
                Aceptar
              </button>
            </div>
          </>
        )}
        {dialogo?.tipo === 'quitarEspecialidad' && (
          <>
            <h2>¿Quitar «{dialogo.especialidad}»?</h2>
            <p>
              También se {dialogo.residentes === 1 ? 'quitará' : 'quitarán'} de la lista{' '}
              {plural(dialogo.residentes, 'residente', 'residentes')} con esta especialidad. Si es un error de escritura,
              mejor reemplázala por una existente.
            </p>
            <div className="importar-acciones">
              <button type="button" className="boton-secundario" onClick={() => setDialogo(null)}>
                Cancelar
              </button>
              <button type="button" className="boton-peligro" onClick={() => quitarEspecialidad(dialogo.especialidad)}>
                Quitar
              </button>
            </div>
          </>
        )}
      </dialog>
    </>
  );
}

export default ImportarResidentes;
