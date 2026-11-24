import { StyleSheet } from 'react-native';

import { Colors, Radios, Spacing } from '@/constants/theme';

/** Estilos comunes de las pantallas de "Administrar usuarios". */
export const AMBAR_TEXTO = '#fcd34d';
export const ROJO_TEXTO = '#fca5a5';
export const FONDO_CAMPO = '#0b2a47';

export const e = StyleSheet.create({
  contenido: {
    gap: Spacing.md,
    padding: Spacing.md,
    paddingBottom: Spacing.xl,
  },
  tarjeta: {
    gap: 10,
    padding: Spacing.md,
    borderRadius: Radios.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: Colors.admin.tarjeta,
  },
  titulo: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
  nota: {
    color: Colors.admin.textoSuave,
    fontSize: 12,
    lineHeight: 17,
  },
  exito: {
    color: Colors.white,
    fontSize: 15,
    fontWeight: '700',
  },
  alerta: {
    padding: 10,
    borderRadius: Radios.md,
    borderWidth: 1,
    borderColor: 'rgba(243, 176, 6, 0.5)',
    backgroundColor: Colors.admin.ambarFondo,
    color: AMBAR_TEXTO,
    fontSize: 12,
    lineHeight: 17,
  },
  error: {
    padding: 10,
    borderRadius: Radios.md,
    borderWidth: 1,
    borderColor: 'rgba(248, 113, 113, 0.45)',
    backgroundColor: 'rgba(248, 113, 113, 0.1)',
    color: ROJO_TEXTO,
    fontSize: 13,
  },
  presionado: {
    opacity: 0.75,
  },
  deshabilitado: {
    opacity: 0.45,
  },
  acciones: {
    gap: 10,
  },
  chip: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 1,
    borderRadius: 999,
    overflow: 'hidden',
    fontSize: 11,
    fontWeight: '700',
  },
  chipAlerta: {
    backgroundColor: Colors.admin.ambarFondo,
    color: AMBAR_TEXTO,
  },
  chipNueva: {
    backgroundColor: Colors.admin.celesteFondo,
    color: Colors.admin.celeste,
  },
  chipActivo: {
    backgroundColor: 'rgba(26, 148, 43, 0.25)',
    color: '#86efac',
  },
  chipInactivo: {
    backgroundColor: 'rgba(248, 113, 113, 0.15)',
    color: ROJO_TEXTO,
  },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  filaTexto: {
    flex: 1,
    gap: 3,
  },
  filaNombre: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  filaDetalle: {
    color: Colors.admin.textoSuave,
    fontSize: 12,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  etiquetaCampo: {
    color: Colors.admin.textoSuave,
    fontSize: 12,
    fontWeight: '600',
  },
  entrada: {
    minHeight: 44,
    paddingHorizontal: 12,
    borderRadius: Radios.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    backgroundColor: FONDO_CAMPO,
    color: Colors.white,
    fontSize: 15,
  },
  entradaError: {
    borderColor: ROJO_TEXTO,
  },
  textoError: {
    color: ROJO_TEXTO,
    fontSize: 12,
  },
});
