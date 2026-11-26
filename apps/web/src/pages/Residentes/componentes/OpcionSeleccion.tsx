interface Props {
  nombre: string;
  titulo: string;
  descripcion?: string;
  seleccionada: boolean;
  onElegir: () => void;
}

/** Opción de una lista de selección única (se ve como tarjeta; por dentro es un radio). */
function OpcionSeleccion({ nombre, titulo, descripcion, seleccionada, onElegir }: Props) {
  return (
    <label className={`res-opcion ${seleccionada ? 'res-opcion--activa' : ''}`}>
      <input type="radio" name={nombre} checked={seleccionada} onChange={onElegir} />
      <span className="res-opcion-titulo">{titulo}</span>
      {descripcion && <span className="res-opcion-descripcion">{descripcion}</span>}
    </label>
  );
}

export default OpcionSeleccion;
