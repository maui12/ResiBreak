import { NOMBRES_MESES, periodoActual, type Periodo } from '../../utils/fechas';
import './SelectorMes.css';

interface Props {
  periodo: Periodo;
  onCambiar: (periodo: Periodo) => void;
}

/** "‹ Noviembre 2026 ›", con acceso para volver al mes actual. */
function SelectorMes({ periodo, onCambiar }: Props) {
  const actual = periodoActual();
  const esMesActual = periodo.anio === actual.anio && periodo.mes === actual.mes;

  const mover = (delta: number) => {
    const nuevo = new Date(periodo.anio, periodo.mes - 1 + delta, 1);
    onCambiar({ anio: nuevo.getFullYear(), mes: nuevo.getMonth() + 1 });
  };

  return (
    <div className="selector-mes">
      <button type="button" className="selector-mes-boton" onClick={() => mover(-1)} aria-label="Mes anterior">
        ‹
      </button>
      <span className="selector-mes-titulo" aria-live="polite">
        {NOMBRES_MESES[periodo.mes - 1]} {periodo.anio}
      </span>
      <button type="button" className="selector-mes-boton" onClick={() => mover(1)} aria-label="Mes siguiente">
        ›
      </button>
      {!esMesActual && (
        <button type="button" className="selector-mes-boton selector-mes-boton--texto" onClick={() => onCambiar(actual)}>
          Mes actual
        </button>
      )}
    </div>
  );
}

export default SelectorMes;
