import { useEffect, useRef, type ReactNode } from 'react';

interface Props {
  abierto: boolean;
  titulo: string;
  children: ReactNode;
  onAceptar: () => void;
  onCancelar: () => void;
  textoAceptar?: string;
  peligro?: boolean;
}

/** Diálogo modal con Aceptar / Cancelar (<dialog> nativo: foco atrapado y Esc para cancelar). */
function Confirmacion({ abierto, titulo, children, onAceptar, onCancelar, textoAceptar = 'Aceptar', peligro = false }: Props) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (abierto && !d.open) d.showModal();
    if (!abierto && d.open) d.close();
  }, [abierto]);

  return (
    <dialog ref={ref} className="importar-dialogo" onClose={() => abierto && onCancelar()}>
      {abierto && (
        <>
          <h2>{titulo}</h2>
          {children}
          <div className="importar-acciones">
            <button type="button" className="boton-secundario" onClick={onCancelar}>
              Cancelar
            </button>
            <button type="button" className={peligro ? 'boton-peligro' : 'boton-primario'} onClick={onAceptar}>
              {textoAceptar}
            </button>
          </div>
        </>
      )}
    </dialog>
  );
}

export default Confirmacion;
