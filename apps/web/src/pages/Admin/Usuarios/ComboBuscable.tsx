import { useId, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { normalizar } from './usuarios.service';

interface Props {
  etiqueta: string;
  opciones: string[];
  /** Valor elegido ('' = ninguno). */
  valor: string;
  onCambiar: (valor: string) => void;
  /** Muestra "Crear «texto»" cuando lo escrito no coincide con ninguna opción. */
  permitirCrear?: boolean;
  /** Primera opción que deja el valor en '' (por ejemplo, "Todas las especialidades"). */
  textoTodas?: string;
  placeholder?: string;
  requerido?: boolean;
}

type Opcion = { valor: string; texto: string; crear?: boolean };

/**
 * Desplegable con búsqueda por texto (sin distinguir mayúsculas ni tildes), con teclado
 * (↑ ↓ Enter Esc) y, opcionalmente, la opción de crear un valor nuevo.
 */
function ComboBuscable({
  etiqueta,
  opciones,
  valor,
  onCambiar,
  permitirCrear = false,
  textoTodas,
  placeholder,
  requerido = false,
}: Props) {
  const id = useId();
  const [abierto, setAbierto] = useState(false);
  const [texto, setTexto] = useState<string | null>(null); // null = mostrando el valor elegido
  const [activa, setActiva] = useState(0);
  const listaRef = useRef<HTMLUListElement>(null);

  const busqueda = texto ?? '';
  const visibles = useMemo<Opcion[]>(() => {
    const t = normalizar(busqueda);
    const lista: Opcion[] = opciones.filter((o) => normalizar(o).includes(t)).map((o) => ({ valor: o, texto: o }));
    const exacta = opciones.some((o) => normalizar(o) === t);
    if (permitirCrear && t && !exacta) lista.push({ valor: busqueda.trim().replace(/\s+/g, ' '), texto: busqueda.trim(), crear: true });
    if (textoTodas && !t) lista.unshift({ valor: '', texto: textoTodas });
    return lista;
  }, [busqueda, opciones, permitirCrear, textoTodas]);

  const esNueva = !!valor && !opciones.some((o) => normalizar(o) === normalizar(valor));

  function elegir(o: Opcion) {
    onCambiar(o.valor);
    setTexto(null);
    setAbierto(false);
  }

  function alTeclear(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      setAbierto(true);
      setActiva((i) => {
        const siguiente = e.key === 'ArrowDown' ? Math.min(i + 1, visibles.length - 1) : Math.max(i - 1, 0);
        listaRef.current?.children[siguiente]?.scrollIntoView({ block: 'nearest' });
        return siguiente;
      });
    } else if (e.key === 'Enter' && abierto && visibles[activa]) {
      e.preventDefault();
      elegir(visibles[activa]);
    } else if (e.key === 'Escape') {
      setTexto(null);
      setAbierto(false);
    }
  }

  return (
    <div className="combo">
      <label htmlFor={id} className="campo-etiqueta">
        {etiqueta}
        {esNueva && <span className="etiqueta etiqueta--nueva">nueva</span>}
      </label>
      <input
        id={id}
        type="text"
        role="combobox"
        aria-expanded={abierto}
        aria-controls={`${id}-lista`}
        aria-autocomplete="list"
        aria-activedescendant={abierto && visibles[activa] ? `${id}-${activa}` : undefined}
        autoComplete="off"
        required={requerido}
        placeholder={placeholder ?? (textoTodas || 'Buscar…')}
        value={texto ?? (valor || '')}
        onFocus={() => {
          setAbierto(true);
          setActiva(0);
        }}
        onChange={(e) => {
          setTexto(e.target.value);
          setAbierto(true);
          setActiva(0);
        }}
        // Se cierra después del clic en una opción (onMouseDown se dispara antes del blur).
        onBlur={() => {
          setAbierto(false);
          setTexto(null);
        }}
        onKeyDown={alTeclear}
      />
      {abierto && (
        <ul id={`${id}-lista`} role="listbox" className="combo-lista" ref={listaRef}>
          {visibles.length === 0 ? (
            <li className="combo-vacio">Sin resultados</li>
          ) : (
            visibles.map((o, i) => (
              <li
                key={`${o.crear ? 'crear:' : ''}${o.valor}`}
                id={`${id}-${i}`}
                role="option"
                aria-selected={i === activa}
                className={`combo-opcion ${i === activa ? 'combo-opcion--activa' : ''} ${o.crear ? 'combo-opcion--crear' : ''}`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  elegir(o);
                }}
                onMouseEnter={() => setActiva(i)}
              >
                {o.crear ? `＋ Crear especialidad «${o.texto}»` : o.texto}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}

export default ComboBuscable;
