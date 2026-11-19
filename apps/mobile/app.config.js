/**
 * Configuración dinámica de Expo: toma todo de app.json y agrega lo que depende del entorno.
 *
 * EXPO_BASE_URL: ruta donde se publica la versión web (ej. "/app" en el servidor, ver
 * apps/web/Dockerfile). En desarrollo no se define y la app web queda en la raíz
 * (http://localhost:8081). No afecta a la app de Android.
 */
module.exports = ({ config }) => ({
  ...config,
  experiments: {
    ...config.experiments,
    ...(process.env.EXPO_BASE_URL ? { baseUrl: process.env.EXPO_BASE_URL } : {}),
  },
});
