import { useState, type ChangeEvent, type FormEvent } from 'react';
import './Configuracion.css';

interface ConfiguracionForm {
  maxTurnosMes: number;
  anticipacionMinimaHoras: number;
  hospitalActivo: string;
  costoDesayuno: number;
  costoAlmuerzo: number;
  costoOnce: number;
  costoCena: number;
}

// Todos los campos del formulario que son números
type CampoNumerico = Exclude<keyof ConfiguracionForm, 'hospitalActivo'>

const HOSPITALES = ['La Serena', 'Coquimbo', 'Ovalle'];

// Valores de ejemplo (los del mockup). Más adelante vendrán del backend: GET /configuracion
const CONFIGURACION_INICIAL: ConfiguracionForm = {
  maxTurnosMes: 6,
  anticipacionMinimaHoras: 24,
  hospitalActivo: 'Ovalle',
  costoDesayuno: 4200,
  costoAlmuerzo: 6500,
  costoOnce: 3800,
  costoCena: 6200,
};

function Configuracion() {
  const [form, setForm] = useState<ConfiguracionForm>(CONFIGURACION_INICIAL);
  const [error, setError] = useState('');
  const [guardado, setGuardado] = useState(false);

  const actualizar = <K extends keyof ConfiguracionForm>(
    campo: K,
    valor: ConfiguracionForm[K],
  ) => {
    setForm((anterior) => ({ ...anterior, [campo]: valor }));
    setGuardado(false);
    setError('');
  };

  const actualizarNumero = (campo: CampoNumerico) => (e: ChangeEvent<HTMLInputElement>) =>
    actualizar(campo, Number(e.target.value));

  const manejarGuardar = (e: FormEvent) => {
    e.preventDefault();

    // Validación rápida para avisar al usuario.
    // La validación que manda es la del backend.
    if (form.maxTurnosMes < 1) {
      setError('El máximo de turnos por mes debe ser al menos 1.');
      return;
    }
    if (form.anticipacionMinimaHoras < 0) {
      setError('La anticipación mínima no puede ser negativa.');
      return;
    }
    if ([form.costoDesayuno, form.costoAlmuerzo, form.costoOnce, form.costoCena].some((c) => c < 0)) {
      setError('Los costos no pueden ser negativos.');
      return;
    }

    // TODO: enviar al backend con PUT /configuracion
    console.log('Configuración a guardar:', form);
    setGuardado(true);
  };

  const manejarDescartar = () => {
    setForm(CONFIGURACION_INICIAL);
    setError('');
    setGuardado(false);
  };

  return (
    <div className="config">
      <header>
        <h1 className="config-titulo">Configuración</h1>
        <p className="config-subtitulo">
          Reglas de turnos y costos que usan el Panel y el Calendario.
        </p>
      </header>

      <form className="config-formulario" onSubmit={manejarGuardar}>
        <fieldset className="config-tarjeta">
          <legend className="config-leyenda">Reglas de turnos</legend>

          <div className="config-campo">
            <label htmlFor="maxTurnosMes">Máximo de turnos por mes</label>
            <input
              id="maxTurnosMes"
              type="number"
              min={1}
              value={form.maxTurnosMes}
              onChange={actualizarNumero('maxTurnosMes')}
            />
            <small>Los becados que superen este número aparecen como "sobre el límite".</small>
          </div>

          <div className="config-campo">
            <label htmlFor="anticipacion">Anticipación mínima (horas)</label>
            <input
              id="anticipacion"
              type="number"
              min={0}
              value={form.anticipacionMinimaHoras}
              onChange={actualizarNumero('anticipacionMinimaHoras')}
            />
            <small>Tiempo mínimo entre asignar un turno y que comience.</small>
          </div>

          <div className="config-campo">
            <label htmlFor="hospital">Hospital activo</label>
            <select
              id="hospital"
              value={form.hospitalActivo}
              onChange={(e) => actualizar('hospitalActivo', e.target.value)}
            >
              {HOSPITALES.map((h) => (
                <option key={h} value={h}>
                  {h}
                </option>
              ))}
            </select>
          </div>
        </fieldset>

        <fieldset className="config-tarjeta">
          <legend className="config-leyenda">Costo por unidad (CLP)</legend>

          <div className="config-campo">
            <label htmlFor="costoDesayuno">Desayuno</label>
            <input
              id="costoDesayuno"
              type="number"
              min={0}
              value={form.costoDesayuno}
              onChange={actualizarNumero('costoDesayuno')}
            />
          </div>

          <div className="config-campo">
            <label htmlFor="costoAlmuerzo">Almuerzo</label>
            <input
              id="costoAlmuerzo"
              type="number"
              min={0}
              value={form.costoAlmuerzo}
              onChange={actualizarNumero('costoAlmuerzo')}
            />
          </div>

          <div className="config-campo">
            <label htmlFor="costoOnce">Once</label>
            <input
              id="costoOnce"
              type="number"
              min={0}
              value={form.costoOnce}
              onChange={actualizarNumero('costoOnce')}
            />
          </div>

          <div className="config-campo">
            <label htmlFor="costoCena">Cena</label>
            <input
              id="costoCena"
              type="number"
              min={0}
              value={form.costoCena}
              onChange={actualizarNumero('costoCena')}
            />
          </div>
        </fieldset>

        <div className="config-acciones">
          <button type="submit" className="config-boton config-boton--principal">
            Guardar cambios
          </button>
          <button type="button" className="config-boton" onClick={manejarDescartar}>
            Descartar cambios
          </button>

          {error && (
            <p className="config-mensaje config-mensaje--error" role="alert">
              {error}
            </p>
          )}
          {guardado && (
            <p className="config-mensaje config-mensaje--ok" role="status">
              Cambios guardados.
            </p>
          )}
        </div>
      </form>
    </div>
  );
}

export default Configuracion;