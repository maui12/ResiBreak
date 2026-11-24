import { Link } from 'react-router-dom';
import { TIPOS, type TipoUsuario } from './usuarios.types';
import './Usuarios.css';

const ORDEN: TipoUsuario[] = ['residentes', 'administradores', 'proveedores'];

/** Administrar usuarios (solo admin): una sección por tipo de cuenta, con Agregar y Editar. */
function Usuarios() {
  return (
    <div className="usuarios-page">
      <header>
        <h1 className="usuarios-titulo">Administrar usuarios</h1>
        <p className="usuarios-subtitulo">Altas y edición de cuentas de acceso</p>
      </header>

      <div className="usuarios-secciones">
        {ORDEN.map((tipo) => (
          <section key={tipo} className="usuarios-card usuarios-seccion" aria-labelledby={`seccion-${tipo}`}>
            <h2 id={`seccion-${tipo}`}>{TIPOS[tipo].titulo}</h2>
            <p className="importar-nota">{TIPOS[tipo].descripcion}</p>
            <div className="usuarios-seccion-botones">
              <Link className="boton-primario" to={`/admin/usuarios/${tipo}/agregar`}>
                Agregar {TIPOS[tipo].singular}
              </Link>
              <Link className="boton-secundario" to={`/admin/usuarios/${tipo}`}>
                Editar {TIPOS[tipo].titulo.toLowerCase()}
              </Link>
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

export default Usuarios;
