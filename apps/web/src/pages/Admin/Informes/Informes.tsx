import { useEffect, useMemo, useState } from 'react';
import {
  obtenerTurnosInforme,
  type TipoComida,
  type TurnoInforme,
} from './Informes.mock';
import './Informes.css';

type Periodo =
  | 'semanal'
  | 'mensual'
  | 'trimestral'
  | 'anual'
  | 'personalizado';

interface Rango {
  desde: string;
  hasta: string;
  etiqueta: string;
  error: string | null;
}

interface Tramo {
  clave: string;
  etiqueta: string;
  desde: string;
  hasta: string;
}

interface Desglose {
  titulo: string;
  columna: string;
  tramos: Tramo[];
}

const PERIODOS: { valor: Periodo; texto: string }[] = [
  { valor: 'semanal', texto: 'Semanal' },
  { valor: 'mensual', texto: 'Mensual' },
  { valor: 'trimestral', texto: 'Trimestral' },
  { valor: 'anual', texto: 'Anual' },
  { valor: 'personalizado', texto: 'Personalizado' },
];

const TIPOS_COMIDA: { tipo: TipoComida; plural: string }[] = [
  { tipo: 'Desayuno', plural: 'Desayunos' },
  { tipo: 'Almuerzo', plural: 'Almuerzos' },
  { tipo: 'Once', plural: 'Onces' },
  { tipo: 'Cena', plural: 'Cenas' },
];

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const MESES_CORTOS = [
  'ene', 'feb', 'mar', 'abr', 'may', 'jun',
  'jul', 'ago', 'sep', 'oct', 'nov', 'dic',
];

const formatoCLP = new Intl.NumberFormat('es-CL', {
  style: 'currency',
  currency: 'CLP',
  maximumFractionDigits: 0,
});

/* ---------- Utilidades de fechas (AAAA-MM-DD, hora local) ---------- */

function aISO(fecha: Date): string {
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${fecha.getFullYear()}-${mes}-${dia}`;
}

function deISO(texto: string): Date {
  const [anio, mes, dia] = texto.split('-').map(Number);
  return new Date(anio, mes - 1, dia);
}

function fechaCorta(texto: string): string {
  const fecha = deISO(texto);
  return `${fecha.getDate()} ${MESES_CORTOS[fecha.getMonth()]} ${fecha.getFullYear()}`;
}

/* ---------- Rango y desglose del informe ---------- */

function calcularRango(
  periodo: Periodo,
  ancla: Date,
  desde: string,
  hasta: string,
  anioMin: number,
  anioMax: number,
): Rango {
  const anio = ancla.getFullYear();
  const mes = ancla.getMonth();

  switch (periodo) {
    case 'semanal':
      return {
        desde: aISO(new Date(anio, mes, 1)),
        hasta: aISO(new Date(anio, mes + 1, 0)),
        etiqueta: `${MESES[mes]} de ${anio}`,
        error: null,
      };
    case 'mensual':
    case 'trimestral':
      return {
        desde: `${anio}-01-01`,
        hasta: `${anio}-12-31`,
        etiqueta: `Año ${anio}`,
        error: null,
      };
    case 'anual':
      return {
        desde: `${anioMin}-01-01`,
        hasta: `${anioMax}-12-31`,
        etiqueta: anioMin === anioMax ? `Año ${anioMax}` : `${anioMin} a ${anioMax}`,
        error: null,
      };
    case 'personalizado':
      if (!desde || !hasta) {
        return {
          desde,
          hasta,
          etiqueta: 'Periodo personalizado',
          error: 'Elige la fecha de inicio y la de fin.',
        };
      }
      if (desde > hasta) {
        return {
          desde,
          hasta,
          etiqueta: 'Periodo personalizado',
          error: 'La fecha de inicio no puede ser posterior a la de fin.',
        };
      }
      return {
        desde,
        hasta,
        etiqueta: `${fechaCorta(desde)} al ${fechaCorta(hasta)}`,
        error: null,
      };
  }
}

// Semanas de lunes a domingo, recortadas a los límites del mes.
function semanasDelMes(anio: number, mes: number): Tramo[] {
  const ultimoDia = new Date(anio, mes + 1, 0).getDate();
  const semanas: Tramo[] = [];
  let inicio = 1;
  let numero = 1;

  while (inicio <= ultimoDia) {
    const diaSemana = (new Date(anio, mes, inicio).getDay() + 6) % 7; // 0 = lunes
    const fin = Math.min(inicio + (6 - diaSemana), ultimoDia);

    semanas.push({
      clave: `semana-${numero}`,
      etiqueta: `Sem. ${numero} · ${inicio} al ${fin}`,
      desde: aISO(new Date(anio, mes, inicio)),
      hasta: aISO(new Date(anio, mes, fin)),
    });

    inicio = fin + 1;
    numero += 1;
  }

  return semanas;
}

function crearDesglose(
  periodo: Periodo,
  rango: Rango,
  hoyISO: string,
): Desglose {
  if (rango.error) {
    return { titulo: 'Resumen del periodo', columna: 'Periodo', tramos: [] };
  }

  const inicio = deISO(rango.desde);
  const fin = deISO(rango.hasta);
  const anio = inicio.getFullYear();
  const mes = inicio.getMonth();

  let desglose: Desglose;

  switch (periodo) {
    case 'semanal':
      desglose = {
        titulo: 'Resumen semanal',
        columna: 'Semana',
        tramos: semanasDelMes(anio, mes),
      };
      break;

    case 'mensual':
      desglose = {
        titulo: 'Resumen mensual',
        columna: 'Mes',
        tramos: Array.from({ length: 12 }, (_, i) => ({
          clave: `mes-${i}`,
          etiqueta: MESES[i],
          desde: aISO(new Date(anio, i, 1)),
          hasta: aISO(new Date(anio, i + 1, 0)),
        })),
      };
      break;

    case 'trimestral':
      desglose = {
        titulo: 'Resumen trimestral',
        columna: 'Trimestre',
        tramos: Array.from({ length: 4 }, (_, q) => ({
          clave: `trimestre-${q}`,
          etiqueta: `T${q + 1} · ${MESES_CORTOS[q * 3]} a ${MESES_CORTOS[q * 3 + 2]}`,
          desde: aISO(new Date(anio, q * 3, 1)),
          hasta: aISO(new Date(anio, q * 3 + 3, 0)),
        })),
      };
      break;

    case 'anual':
      desglose = {
        titulo: 'Resumen anual',
        columna: 'Año',
        tramos: Array.from(
          { length: fin.getFullYear() - anio + 1 },
          (_, i) => ({
            clave: `anio-${anio + i}`,
            etiqueta: String(anio + i),
            desde: `${anio + i}-01-01`,
            hasta: `${anio + i}-12-31`,
          }),
        ),
      };
      break;

    case 'personalizado': {
      const dias =
        Math.round((fin.getTime() - inicio.getTime()) / 86_400_000) + 1;

      if (dias <= 31) {
        desglose = {
          titulo: 'Resumen por día',
          columna: 'Día',
          tramos: Array.from({ length: dias }, (_, i) => {
            const dia = new Date(anio, mes, inicio.getDate() + i);
            const iso = aISO(dia);
            return {
              clave: iso,
              etiqueta: dia.toLocaleDateString('es-CL', {
                weekday: 'short',
                day: 'numeric',
                month: 'short',
              }),
              desde: iso,
              hasta: iso,
            };
          }),
        };
      } else {
        const tramos: Tramo[] = [];
        let cursor = new Date(anio, mes, 1);

        while (cursor <= fin) {
          const desdeMes = aISO(cursor);
          const hastaMes = aISO(
            new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0),
          );

          tramos.push({
            clave: desdeMes,
            etiqueta: `${MESES[cursor.getMonth()]} ${cursor.getFullYear()}`,
            desde: desdeMes < rango.desde ? rango.desde : desdeMes,
            hasta: hastaMes > rango.hasta ? rango.hasta : hastaMes,
          });

          cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
        }

        desglose = { titulo: 'Resumen por mes', columna: 'Mes', tramos };
      }
      break;
    }
  }

  // No se muestran periodos que todavía no ocurren.
  return {
    ...desglose,
    tramos: desglose.tramos.filter((tramo) => tramo.desde <= hoyISO),
  };
}

function resumir(turnos: TurnoInforme[]) {
  return {
    turnos: turnos.length,
    personas: new Set(turnos.map((turno) => turno.becado)).size,
    comidas: turnos.reduce((suma, turno) => suma + turno.comidas.length, 0),
    monto: turnos.reduce((suma, turno) => suma + turno.monto, 0),
  };
}

function Informes() {
  const [turnos, setTurnos] = useState<TurnoInforme[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [hoy] = useState(() => new Date());
  const [periodo, setPeriodo] = useState<Periodo>('semanal');
  const [ancla, setAncla] = useState(
    () => new Date(hoy.getFullYear(), hoy.getMonth(), 1),
  );
  const [desde, setDesde] = useState(() =>
    aISO(new Date(hoy.getFullYear(), hoy.getMonth(), 1)),
  );
  const [hasta, setHasta] = useState(() => aISO(hoy));

  useEffect(() => {
    let activo = true;

    obtenerTurnosInforme()
      .then((datos) => {
        if (activo) setTurnos(datos);
      })
      .catch(() => {
        if (activo) setError('No fue posible cargar el informe.');
      })
      .finally(() => {
        if (activo) setCargando(false);
      });

    return () => {
      activo = false;
    };
  }, []);

  const hoyISO = aISO(hoy);

  const anioMin = useMemo(
    () =>
      turnos.length
        ? Math.min(...turnos.map((turno) => Number(turno.fecha.slice(0, 4))))
        : hoy.getFullYear(),
    [turnos, hoy],
  );

  const rango = useMemo(
    () =>
      calcularRango(periodo, ancla, desde, hasta, anioMin, hoy.getFullYear()),
    [periodo, ancla, desde, hasta, anioMin, hoy],
  );

  const enRango = useMemo(
    () =>
      rango.error
        ? []
        : turnos.filter(
            (turno) => turno.fecha >= rango.desde && turno.fecha <= rango.hasta,
          ),
    [turnos, rango],
  );

  const desglose = useMemo(
    () => crearDesglose(periodo, rango, hoyISO),
    [periodo, rango, hoyISO],
  );

  const filas = useMemo(() => {
    const lista = desglose.tramos.map((tramo) => ({
      ...tramo,
      ...resumir(
        enRango.filter(
          (turno) => turno.fecha >= tramo.desde && turno.fecha <= tramo.hasta,
        ),
      ),
    }));

    // En un periodo personalizado se omiten los días o meses sin turnos.
    return periodo === 'personalizado'
      ? lista.filter((fila) => fila.turnos > 0)
      : lista;
  }, [desglose, enRango, periodo]);

  const total = useMemo(() => resumir(enRango), [enRango]);

  const porPersona = useMemo(() => {
    const mapa = new Map<
      string,
      { becado: string; turnos: number; comidas: number; monto: number }
    >();

    enRango.forEach((turno) => {
      const actual = mapa.get(turno.becado) ?? {
        becado: turno.becado,
        turnos: 0,
        comidas: 0,
        monto: 0,
      };
      actual.turnos += 1;
      actual.comidas += turno.comidas.length;
      actual.monto += turno.monto;
      mapa.set(turno.becado, actual);
    });

    return [...mapa.values()].sort(
      (a, b) => b.monto - a.monto || a.becado.localeCompare(b.becado, 'es'),
    );
  }, [enRango]);

  const comidasPorTipo = useMemo(() => {
    const conteo: Record<TipoComida, number> = {
      Desayuno: 0,
      Almuerzo: 0,
      Once: 0,
      Cena: 0,
    };
    enRango.forEach((turno) =>
      turno.comidas.forEach((comida) => {
        conteo[comida] += 1;
      }),
    );
    return conteo;
  }, [enRango]);

  const topEspecialidades = useMemo(() => {
    const mapa = new Map<string, number>();
    enRango.forEach((turno) =>
      mapa.set(
        turno.especialidad,
        (mapa.get(turno.especialidad) ?? 0) + turno.monto,
      ),
    );
    return [...mapa.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [enRango]);

  const turnosNormales = enRango.filter((turno) => turno.tipo === 'normal').length;
  const guardias24h = enRango.length - turnosNormales;

  const navegable =
    periodo === 'semanal' || periodo === 'mensual' || periodo === 'trimestral';

  const mover = (delta: number) => {
    setAncla((actual) =>
      periodo === 'semanal'
        ? new Date(actual.getFullYear(), actual.getMonth() + delta, 1)
        : new Date(actual.getFullYear() + delta, actual.getMonth(), 1),
    );
  };

  const irAHoy = () => {
    setAncla(new Date(hoy.getFullYear(), hoy.getMonth(), 1));
  };

  if (error) {
    return (
      <div className="informes-page">
        <p className="informes-error" role="alert">
          {error}
        </p>
      </div>
    );
  }

  if (cargando) {
    return (
      <div className="informes-page">
        <p className="informes-estado">Cargando informe...</p>
      </div>
    );
  }

  return (
    <div className="informes-page">
      <header className="informes-encabezado">
        <div>
          <h1 className="informes-titulo">Informes</h1>
          <p className="informes-subtitulo">
            {rango.etiqueta} · {formatoCLP.format(total.monto)} en total
          </p>
        </div>

        <ul className="informes-leyenda">
          <li>
            <span className="informes-punto informes-punto--normal" />{' '}
            {turnosNormales} turnos normales
          </li>
          <li>
            <span className="informes-punto informes-punto--24h" />{' '}
            {guardias24h} guardias de 24 h
          </li>
        </ul>
      </header>

      <div className="informes-cuerpo">
        <section
          className="informes-tarjeta"
          aria-label="Resumen del informe"
        >
          {rango.error ? (
            <p className="informes-vacio">
              Elige un periodo válido para ver el informe.
            </p>
          ) : (
            <>
              <h2 className="informes-seccion-titulo">{desglose.titulo}</h2>

              <div className="informes-tabla-scroll">
                <table className="informes-tabla">
                  <thead>
                    <tr>
                      <th>{desglose.columna}</th>
                      <th className="numerico">Turnos</th>
                      <th className="numerico">Personas</th>
                      <th className="numerico">Comidas</th>
                      <th className="numerico">Monto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filas.map((fila) => (
                      <tr key={fila.clave}>
                        <td className="fuerte">{fila.etiqueta}</td>
                        <td className="numerico">{fila.turnos}</td>
                        <td className="numerico">{fila.personas}</td>
                        <td className="numerico">{fila.comidas}</td>
                        <td className="numerico fuerte">
                          {formatoCLP.format(fila.monto)}
                        </td>
                      </tr>
                    ))}
                    {filas.length > 0 && (
                      <tr className="informes-total">
                        <td>Total</td>
                        <td className="numerico">{total.turnos}</td>
                        <td className="numerico">{total.personas}</td>
                        <td className="numerico">{total.comidas}</td>
                        <td className="numerico">
                          {formatoCLP.format(total.monto)}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <h2 className="informes-seccion-titulo informes-seccion-titulo--segunda">
                Resumen por persona
              </h2>

              <div className="informes-tabla-scroll">
                <table className="informes-tabla">
                  <thead>
                    <tr>
                      <th>Becado</th>
                      <th className="numerico">Turnos</th>
                      <th className="numerico">Comidas</th>
                      <th className="numerico">Monto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {porPersona.map((persona) => (
                      <tr key={persona.becado}>
                        <td className="fuerte">{persona.becado}</td>
                        <td className="numerico">{persona.turnos}</td>
                        <td className="numerico">{persona.comidas}</td>
                        <td className="numerico">
                          {formatoCLP.format(persona.monto)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {enRango.length === 0 && (
                <p className="informes-vacio">
                  No hay turnos registrados en este periodo.
                </p>
              )}
            </>
          )}
        </section>

        <aside className="informes-lateral">
          <section className="informes-tarjeta" aria-label="Periodos disponibles">
            <h2 className="informes-lateral-titulo">Periodos disponibles</h2>

            <div
              className="informes-periodos"
              role="group"
              aria-label="Periodo del informe"
            >
              {PERIODOS.map((opcion) => (
                <button
                  key={opcion.valor}
                  type="button"
                  className={[
                    'informes-opcion',
                    opcion.valor === 'personalizado' && 'informes-opcion--ancha',
                    periodo === opcion.valor && 'informes-opcion--activa',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  aria-pressed={periodo === opcion.valor}
                  onClick={() => setPeriodo(opcion.valor)}
                >
                  {opcion.texto}
                </button>
              ))}
            </div>

            {navegable && (
              <div className="informes-navegacion">
                <button
                  type="button"
                  className="informes-boton"
                  onClick={() => mover(-1)}
                  aria-label={
                    periodo === 'semanal' ? 'Mes anterior' : 'Año anterior'
                  }
                >
                  ‹
                </button>
                <span className="informes-navegacion-etiqueta" aria-live="polite">
                  {rango.etiqueta}
                </span>
                <button
                  type="button"
                  className="informes-boton"
                  onClick={() => mover(1)}
                  aria-label={
                    periodo === 'semanal' ? 'Mes siguiente' : 'Año siguiente'
                  }
                >
                  ›
                </button>
                <button
                  type="button"
                  className="informes-boton informes-boton--texto"
                  onClick={irAHoy}
                >
                  Hoy
                </button>
              </div>
            )}

            {periodo === 'anual' && (
              <p className="informes-nota">
                Compara todos los años con turnos registrados.
              </p>
            )}

            {periodo === 'personalizado' && (
              <div className="informes-personalizado">
                <div className="informes-fechas">
                  <label className="informes-campo">
                    <span>Desde</span>
                    <input
                      type="date"
                      value={desde}
                      max={hasta || undefined}
                      onChange={(evento) => setDesde(evento.target.value)}
                    />
                  </label>
                  <label className="informes-campo">
                    <span>Hasta</span>
                    <input
                      type="date"
                      value={hasta}
                      min={desde || undefined}
                      onChange={(evento) => setHasta(evento.target.value)}
                    />
                  </label>
                </div>

                {rango.error && (
                  <p className="informes-error" role="alert">
                    {rango.error}
                  </p>
                )}
              </div>
            )}
          </section>

          <section className="informes-tarjeta" aria-label="Comidas del periodo">
            <h2 className="informes-lateral-titulo">Comidas del periodo</h2>
            <dl className="informes-lista">
              {TIPOS_COMIDA.map(({ tipo, plural }) => (
                <div key={tipo}>
                  <dt>{plural}</dt>
                  <dd>{comidasPorTipo[tipo]}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="informes-tarjeta" aria-label="Top especialidades">
            <h2 className="informes-lateral-titulo">Top especialidades</h2>
            {topEspecialidades.length > 0 ? (
              <dl className="informes-lista">
                {topEspecialidades.map(([especialidad, monto]) => (
                  <div key={especialidad}>
                    <dt>{especialidad}</dt>
                    <dd>{formatoCLP.format(monto)}</dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p className="informes-nota">Sin datos para este periodo.</p>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}

export default Informes;