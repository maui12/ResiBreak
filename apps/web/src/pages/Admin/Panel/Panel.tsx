import { useState } from 'react';
import { DIAS_SEMANA, generarMes } from '../../../utils/turnos';
import './Panel.css';

/* ------------------------------------------------------------------
   DATOS DE EJEMPLO (los del mockup).
   Más adelante se reemplazan por la respuesta del backend,
   por ejemplo con un hook useResumen() que llame a GET /dashboard/resumen.
------------------------------------------------------------------- */
const PERIODOS = ['Semanal', 'Mensual', 'Trimestral', 'Anual'] as const;
type Periodo = (typeof PERIODOS)[number];

const ANIO = 2026;
const MES = 5; // junio (0 = enero)
const DIA_HOY = 15;

const TURNOS_POR_DIA: Record<number, number> = {
  3: 14,
  4: 8,
  5: 9,
  6: 11,
  7: 7,
  10: 10,
  12: 9,
  13: 12,
};
const DIAS_CON_ALERTA = [10];

const ESPECIALIDADES = [
  { nombre: 'Medicina Interna', comidas: 64, color: 'var(--nt-celeste)' },
  { nombre: 'Cirugía', comidas: 51, color: 'var(--nt-verde)' },
  { nombre: 'Pediatría', comidas: 38, color: 'var(--nt-violeta)' },
  { nombre: 'Ginecología', comidas: 29, color: 'var(--nt-ambar)' },
  { nombre: 'Cardiología', comidas: 24, color: 'var(--nt-rojo)' },
  { nombre: 'Urgencias', comidas: 19, color: 'var(--nt-celeste)' },
];

const CONTABILIDAD = [
  { rubro: 'Desayuno', cantidad: 132, costoUnitario: 4200 },
  { rubro: 'Almuerzo', cantidad: 141, costoUnitario: 6500 },
  { rubro: 'Once', cantidad: 118, costoUnitario: 3800 },
  { rubro: 'Cena', cantidad: 137, costoUnitario: 6200 },
];

const formatearPesos = (valor: number) =>
  new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(valor);

/* ------------------------------------------------------------------
   Tarjeta KPI. Cuando la uses en otra página, muévela a
   src/components/ui/KpiCard/ y expórtala desde ahí.
------------------------------------------------------------------- */
interface KpiCardProps {
  etiqueta: string;
  valor: string;
  detalle: string;
  tono?: 'normal' | 'positivo' | 'alerta';
}

function KpiCard({ etiqueta, valor, detalle, tono = 'normal' }: KpiCardProps) {
  return (
    <article className="panel-tarjeta panel-kpi">
      <h3 className="panel-kpi-etiqueta">{etiqueta}</h3>
      <p className={`panel-kpi-valor ${tono === 'alerta' ? 'panel-kpi-valor--alerta' : ''}`}>
        {valor}
      </p>
      <p className={`panel-kpi-detalle ${tono === 'positivo' ? 'panel-kpi-detalle--positivo' : ''}`}>
        {detalle}
      </p>
    </article>
  );
}

/* ------------------------------------------------------------------
   Página
------------------------------------------------------------------- */
function Panel() {
  const [periodo, setPeriodo] = useState<Periodo>('Mensual');
  const [diaSeleccionado, setDiaSeleccionado] = useState<number>(3);

  const celdas = generarMes(ANIO, MES);
  const maxComidas = Math.max(...ESPECIALIDADES.map((e) => e.comidas));

  return (
    <div className="panel">
      <header className="panel-encabezado">
        <div>
          <h1 className="panel-titulo">Panel de control · Junio 2025</h1>
          <p className="panel-subtitulo">15 especialidades · 16 cuentas · 3 hospitales</p>
        </div>

        <div className="panel-periodos" role="group" aria-label="Periodo del resumen">
          {PERIODOS.map((p) => (
            <button
              key={p}
              type="button"
              className={`panel-periodo ${p === periodo ? 'panel-periodo--activo' : ''}`}
              aria-pressed={p === periodo}
              onClick={() => setPeriodo(p)}
            >
              {p}
            </button>
          ))}
        </div>
      </header>

      {/* Fila de tarjetas KPI */}
      <section className="panel-kpis" aria-label="Indicadores principales">
        <KpiCard
          etiqueta="Gasto del mes"
          valor={formatearPesos(2847300)}
          detalle="▲ 4,2% vs mayo"
          tono="positivo"
        />
        <KpiCard etiqueta="Comidas repartidas" valor="428" detalle="de 452 programadas" />
        <KpiCard etiqueta="Becados activos" valor="37" detalle="12 especialidades con turno" />
        <KpiCard
          etiqueta="Sobre el límite"
          valor="2"
          detalle="máximo 6 turnos/mes"
          tono="alerta"
        />
      </section>

      {/* Calendario resumido + comidas por especialidad */}
      <div className="panel-medio">
        <section className="panel-tarjeta" aria-labelledby="titulo-calendario">
          <div className="panel-tarjeta-cabecera">
            <div>
              <h2 id="titulo-calendario" className="panel-tarjeta-titulo">
                Calendario de turnos y turno de 24 h
              </h2>
              <p className="panel-tarjeta-nota">
                Días hábiles con turno normal; sábados, domingos y feriados exigen guardia de 24
                horas
              </p>
            </div>
            <ul className="panel-leyenda">
              <li>
                <span className="panel-punto panel-punto--normal" /> Normal
              </li>
              <li>
                <span className="panel-punto panel-punto--24h" /> 24 h
              </li>
            </ul>
          </div>

          <div className="mini-cal">
            {DIAS_SEMANA.map((letra, i) => (
              <span
                key={`cabecera-${i}`}
                className={`mini-cal-cabecera ${i >= 5 ? 'mini-cal-cabecera--fin' : ''}`}
              >
                {letra}
              </span>
            ))}

            {celdas.map((celda, i) => {
              if (!celda) return <span key={`vacio-${i}`} />;

              const { dia, tipo } = celda;
              const esHoy = dia === DIA_HOY;
              const seleccionado = dia === diaSeleccionado;
              const clases = [
                'mini-dia',
                tipo === '24h' && 'mini-dia--24h',
                seleccionado && 'mini-dia--seleccionado',
                esHoy && 'mini-dia--hoy',
              ]
                .filter(Boolean)
                .join(' ');

              return (
                <button
                  key={dia}
                  type="button"
                  className={clases}
                  aria-pressed={seleccionado}
                  aria-label={`Día ${dia}, ${tipo === '24h' ? 'guardia de 24 horas' : 'turno normal'}`}
                  onClick={() => setDiaSeleccionado(dia)}
                >
                  <span className="mini-dia-numero">{dia}</span>
                  <span className="mini-dia-detalle">
                    {esHoy ? 'HOY' : tipo === '24h' ? '24 h' : (TURNOS_POR_DIA[dia] ?? '')}
                  </span>
                  {DIAS_CON_ALERTA.includes(dia) && (
                    <span
                      className="mini-dia-alerta"
                      role="img"
                      aria-label="Hay becados sobre el límite de turnos"
                    />
                  )}
                </button>
              );
            })}
          </div>
        </section>

        <section className="panel-tarjeta" aria-labelledby="titulo-especialidades">
          <div className="panel-tarjeta-cabecera">
            <h2 id="titulo-especialidades" className="panel-tarjeta-titulo">
              Comidas por especialidad
            </h2>
            <p className="panel-tarjeta-nota panel-tarjeta-nota--derecha">de 15 · 12 activas</p>
          </div>

          <ul className="panel-especialidades">
            {ESPECIALIDADES.map((esp) => (
              <li key={esp.nombre} className="panel-especialidad">
                <div className="panel-especialidad-fila">
                  <span>{esp.nombre}</span>
                  <strong>{esp.comidas}</strong>
                </div>
                <div className="panel-barra" aria-hidden="true">
                  <div
                    className="panel-barra-relleno"
                    style={{
                      width: `${(esp.comidas / maxComidas) * 100}%`,
                      background: esp.color,
                    }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {/* Contabilidad del mes */}
      <section className="panel-tarjeta" aria-labelledby="titulo-contabilidad">
        <div className="panel-tarjeta-cabecera">
          <h2 id="titulo-contabilidad" className="panel-tarjeta-titulo">
            Contabilidad de comidas del mes
          </h2>
          <p className="panel-tarjeta-nota panel-tarjeta-nota--derecha">
            Costo por unidad aplicado a cada rubro
          </p>
        </div>

        <div className="panel-tabla-contenedor">
          <table className="panel-tabla">
            <thead>
              <tr>
                <th scope="col">Rubro</th>
                <th scope="col" className="panel-tabla-num">
                  Cantidad
                </th>
                <th scope="col" className="panel-tabla-num">
                  Costo unit.
                </th>
                <th scope="col" className="panel-tabla-num">
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {CONTABILIDAD.map((fila) => (
                <tr key={fila.rubro}>
                  <th scope="row">{fila.rubro}</th>
                  <td className="panel-tabla-num">{fila.cantidad}</td>
                  <td className="panel-tabla-num panel-tabla-suave">
                    {formatearPesos(fila.costoUnitario)}
                  </td>
                  <td className="panel-tabla-num panel-tabla-total">
                    {formatearPesos(fila.cantidad * fila.costoUnitario)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

export default Panel;