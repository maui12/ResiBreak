import { useState } from 'react';
import ImportarResidentes from './ImportarResidentes';
import './Usuarios.css';

type Seccion = 'inicio' | 'importar';

/** Administrar usuarios (solo admin). Por ahora: agregar residentes nuevos desde Excel. */
function Usuarios() {
  const [seccion, setSeccion] = useState<Seccion>('inicio');

  return (
    <div className="usuarios-page">
      <header>
        <h1 className="usuarios-titulo">Administrar usuarios</h1>
        <p className="usuarios-subtitulo">Altas de residentes y cuentas de acceso</p>
      </header>

      {seccion === 'inicio' && (
        <div className="usuarios-opciones">
          <button type="button" className="usuarios-opcion" onClick={() => setSeccion('importar')}>
            <span className="usuarios-opcion-titulo">Agregar residentes nuevos</span>
            <span className="usuarios-opcion-detalle">
              Carga un Excel, revisa los residentes y especialidades nuevos y confirma.
            </span>
          </button>
        </div>
      )}

      {seccion === 'importar' && <ImportarResidentes onVolver={() => setSeccion('inicio')} />}
    </div>
  );
}

export default Usuarios;
