import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import FormularioAlta from './FormularioAlta';
import ImportarResidentes from './ImportarResidentes';
import Migas from './Migas';
import { esTipoUsuario, TIPOS } from './usuarios.types';
import './Usuarios.css';

type Modo = 'excel' | 'manual';

/**
 * Agregar residente / administrador / proveedor.
 * Residentes: selector entre cargar desde Excel o agregar uno manualmente (?modo=excel|manual).
 */
function AgregarUsuario() {
  const { tipo } = useParams();
  const navigate = useNavigate();
  const [parametros, setParametros] = useSearchParams();
  if (!esTipoUsuario(tipo)) return <Navigate to="/admin/usuarios" replace />;

  const config = TIPOS[tipo];
  const modo: Modo = parametros.get('modo') === 'manual' ? 'manual' : 'excel';

  return (
    <div className="usuarios-page">
      <header>
        <Migas tramos={[{ texto: config.titulo, a: `/admin/usuarios/${tipo}` }, { texto: 'Agregar' }]} />
        <h1 className="usuarios-titulo">Agregar {config.singular}</h1>
      </header>

      {tipo === 'residentes' ? (
        <>
          <div className="selector" role="tablist" aria-label="Forma de agregar residentes">
            {(
              [
                ['excel', 'Cargar desde Excel'],
                ['manual', 'Agregar manualmente'],
              ] as const
            ).map(([valor, texto]) => (
              <button
                key={valor}
                type="button"
                role="tab"
                aria-selected={modo === valor}
                className={`selector-opcion ${modo === valor ? 'selector-opcion--activa' : ''}`}
                onClick={() => setParametros(valor === 'excel' ? {} : { modo: valor }, { replace: true })}
              >
                {texto}
              </button>
            ))}
          </div>
          {modo === 'excel' ? (
            <ImportarResidentes onVolver={() => navigate('/admin/usuarios')} />
          ) : (
            <FormularioAlta tipo="residentes" />
          )}
        </>
      ) : (
        <FormularioAlta key={tipo} tipo={tipo} />
      )}
    </div>
  );
}

export default AgregarUsuario;
