import type { ReactNode } from 'react';

/** Campo de formulario: etiqueta, control y mensaje de error. */
function Campo({ etiqueta, error, children }: { etiqueta: string; error?: string; children: ReactNode }) {
  return (
    <label className="campo">
      <span className="campo-etiqueta">{etiqueta}</span>
      {children}
      {error && <span className="campo-error">{error}</span>}
    </label>
  );
}

export default Campo;
