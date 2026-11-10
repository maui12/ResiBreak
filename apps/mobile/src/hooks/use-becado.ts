import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';

import { mensajeDeError } from '../api';
import {
  obtenerDatosResidente,
  obtenerDiasDelMes,
  type DatosResidente,
  type DiaDelMes,
} from '../services/becados.service';

interface ResultadoDatos {
  datos: DatosResidente | null;
  cargando: boolean;
  error: string | null;
  /** Vuelve a pedir los datos. Mientras tanto se siguen mostrando los anteriores. */
  recargar: () => void;
}

/**
 * Datos del residente de la sesión: ficha, reglas, hospitales, turnos y pedidos.
 * Se vuelven a cargar cada vez que la pantalla gana el foco (por ejemplo, al volver de agendar).
 */
export function useDatosResidente(): ResultadoDatos {
  const [datos, setDatos] = useState<DatosResidente | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [intento, setIntento] = useState(0);

  useFocusEffect(
    useCallback(() => {
      let activo = true;

      obtenerDatosResidente()
        .then((nuevos) => {
          if (!activo) return;
          setDatos(nuevos);
          setError(null);
        })
        .catch((e: unknown) => {
          if (activo) setError(mensajeDeError(e));
        });

      return () => {
        activo = false;
      };
    }, [intento]),
  );

  return {
    datos,
    cargando: datos === null && error === null,
    error,
    recargar: () => {
      setError(null);
      setIntento((n) => n + 1);
    },
  };
}

interface ResultadoMes {
  /** Días del mes pedido; `null` mientras se cargan. */
  dias: DiaDelMes[] | null;
  error: string | null;
  recargar: () => void;
}

/**
 * Días de un mes (`mes` de 1 a 12) con su tipo y si el residente ya tiene turno o pedido.
 * Se refrescan al volver a la pantalla.
 */
export function useDiasDelMes(anio: number | undefined, mes: number | undefined): ResultadoMes {
  const [cargados, setCargados] = useState<{ clave: string; dias: DiaDelMes[] } | null>(null);
  const [error, setError] = useState<{ clave: string; mensaje: string } | null>(null);
  const [version, setVersion] = useState(0);

  // Al volver a la pantalla (por ejemplo, tras cambiar un pedido en otra) se refresca el mes.
  // La primera vez no hace falta: el efecto de abajo ya hace la carga inicial.
  const primeraVez = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (primeraVez.current) {
        primeraVez.current = false;
        return;
      }
      setVersion((n) => n + 1);
    }, []),
  );

  const clave = anio !== undefined && mes !== undefined ? `${anio}-${mes}` : null;

  useEffect(() => {
    if (anio === undefined || mes === undefined) return;
    const claveMes = `${anio}-${mes}`;
    let activo = true;

    obtenerDiasDelMes(anio, mes)
      .then((dias) => {
        if (!activo) return;
        setCargados({ clave: claveMes, dias });
        setError(null);
      })
      .catch((e: unknown) => {
        if (activo) setError({ clave: claveMes, mensaje: mensajeDeError(e) });
      });

    return () => {
      activo = false;
    };
  }, [anio, mes, version]);

  return {
    dias: cargados && cargados.clave === clave ? cargados.dias : null,
    error: error && error.clave === clave ? error.mensaje : null,
    recargar: () => {
      setError(null);
      setVersion((n) => n + 1);
    },
  };
}
