import { NOMBRE_COMIDA, type PedidoProveedor } from './proveedor.service';

interface Props {
  pedido: PedidoProveedor;
  /** Se puede confirmar (pedidos pendientes de hoy). */
  confirmable: boolean;
  confirmando: boolean;
  deshabilitado: boolean;
  onConfirmar: () => void;
  mostrarHospital?: boolean;
}

/** Una comida a entregar: a quién, qué, dónde y sus dos confirmaciones. */
function FilaPedido({ pedido: p, confirmable, confirmando, deshabilitado, onConfirmar, mostrarHospital }: Props) {
  const { proveedor, residente } = p.confirmaciones;
  return (
    <article className={`proveedor-pedido ${proveedor ? 'proveedor-pedido--entregado' : ''}`}>
      <div className="proveedor-pedido-info">
        <strong>{p.becado.nombre}</strong>
        <span>
          {NOMBRE_COMIDA[p.tipoComida]}
          {mostrarHospital ? ` · Hospital ${p.becado.hospital}` : ''} · {p.becado.especialidad}
        </span>
        <div className="proveedor-sellos">
          <span className={`proveedor-sello ${proveedor ? 'proveedor-sello--ok' : ''}`}>
            {proveedor ? '✓ Entregado' : 'Sin entregar'}
          </span>
          <span className={`proveedor-sello ${residente ? 'proveedor-sello--ok' : ''}`}>
            {residente ? '✓ Residente confirmó' : 'Residente sin confirmar'}
          </span>
        </div>
      </div>
      {confirmable && !proveedor && (
        <button
          type="button"
          className="proveedor-boton"
          disabled={deshabilitado}
          onClick={onConfirmar}
          aria-label={`Confirmar entrega: ${NOMBRE_COMIDA[p.tipoComida]} de ${p.becado.nombre}`}
        >
          {confirmando ? 'Guardando…' : 'Confirmar entrega'}
        </button>
      )}
    </article>
  );
}

export default FilaPedido;
