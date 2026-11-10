const CLAVE_TOKEN = 'resibreak_token';
const CLAVE_ROL = 'resibreak_rol';

export function guardarSesion(token: string, rol: string) {
  localStorage.setItem(CLAVE_TOKEN, token);
  localStorage.setItem(CLAVE_ROL, rol.toLowerCase());
}

export const obtenerToken = () => localStorage.getItem(CLAVE_TOKEN);
export const obtenerRol = () => localStorage.getItem(CLAVE_ROL);
export const haySesion = () => obtenerToken() !== null;

export function cerrarSesion() {
  localStorage.removeItem(CLAVE_TOKEN);
  localStorage.removeItem(CLAVE_ROL);
}