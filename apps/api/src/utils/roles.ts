// src/utils/roles.ts
// Deben coincidir con common/roles.ts del backend (se comparan en minúsculas)
export const RUTA_INICIAL: Record<string, string> = {
  admin: '/admin/panel',
  proveedor: '/proveedor/pedidos-de-hoy',
  residente: '/residente/mi-turno',
};