import { Link } from 'react-router-dom';

/** Ruta de navegación: Usuarios › Residentes › Agregar. El último tramo no es enlace. */
function Migas({ tramos }: { tramos: { texto: string; a?: string }[] }) {
  return (
    <nav aria-label="Ruta de navegación" className="migas">
      <Link to="/admin/usuarios">Usuarios</Link>
      {tramos.map((t) => (
        <span key={t.texto}>
          {' › '}
          {t.a ? <Link to={t.a}>{t.texto}</Link> : <span aria-current="page">{t.texto}</span>}
        </span>
      ))}
    </nav>
  );
}

export default Migas;
