import type { ReactNode } from 'react';
import './EstadoCarga.css';

interface Props {
  cargando: boolean;
  error: string | null;
  onReintentar?: () => void;
  children?: ReactNode;
}

/** Muestra "Cargando…", el error con un botón para reintentar, o el contenido. */
function EstadoCarga({ cargando, error, onReintentar, children }: Props) {
  if (error) {
    return (
      <div className="estado-error" role="alert">
        <p>{error}</p>
        {onReintentar && (
          <button type="button" className="boton-secundario boton-chico" onClick={onReintentar}>
            Reintentar
          </button>
        )}
      </div>
    );
  }
  if (cargando) return <p className="estado-cargando">Cargando…</p>;
  return <>{children}</>;
}

export default EstadoCarga;
