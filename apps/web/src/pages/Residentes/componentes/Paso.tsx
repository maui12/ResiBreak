import type { ReactNode } from 'react';

interface Props {
  numero: number;
  titulo: string;
  ayuda?: string;
  /** Aún no se puede usar (falta completar un paso anterior). */
  bloqueado?: boolean;
  completo?: boolean;
  children: ReactNode;
}

/** Un paso numerado de un formulario (1. Hospital, 2. Turno, 3. Fecha…). */
function Paso({ numero, titulo, ayuda, bloqueado = false, completo = false, children }: Props) {
  return (
    <section className={`res-paso ${bloqueado ? 'res-paso--bloqueado' : ''}`} aria-disabled={bloqueado}>
      <header className="res-paso-cabecera">
        <span className={`res-paso-numero ${completo ? 'res-paso-numero--completo' : ''}`} aria-hidden="true">
          {completo ? '✓' : numero}
        </span>
        <div>
          <h2>{titulo}</h2>
          {ayuda && <p>{ayuda}</p>}
        </div>
      </header>
      {!bloqueado && <div className="res-paso-cuerpo">{children}</div>}
    </section>
  );
}

export default Paso;
