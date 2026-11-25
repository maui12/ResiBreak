# Despliegue inicial de ResiBreak

Guía para publicar ResiBreak por primera vez:

- **API** (NestJS) y **base de datos** (PostgreSQL) en Render.
- **Web** de administrador y proveedor (Vite) en Render.
- **App web** para usuarios de iPhone (Expo web) en Render.
- **App Android** publicada en Google Play.

Se parte con el plan gratuito de Render y se pasa a pago al final. Hay dos entornos: **oficial** (rama `main`) y **pruebas** (rama `pruebas`).

> Los pasos marcados con **[código]** requieren cambios en el repositorio que aún no están hechos.
> Las reglas de Render y Google Play cambian con frecuencia: confírmalas en su documentación al momento de hacerlo.

## Costos

| Servicio | Tipo de pago | Detalle |
|---|---|---|
| Google Play | **Único** | US$25 al crear la cuenta de desarrollador. Sin cuota anual. |
| Render | **Mensual** (al pasar a pago) | API y base oficiales. Los sitios estáticos y el entorno de pruebas siguen gratis. Precios en render.com/pricing. |
| EAS (Expo) | Gratis; mensual solo si se elige un plan pagado | Ver [Costos de EAS](#costos-de-eas). El plan gratuito no cobra excedentes. |
| Servicio de correo | Gratis o mensual | Ver [11. Servicio de correo electrónico](#11-servicio-de-correo-electrónico). Para el volumen de ResiBreak, el plan gratuito suele alcanzar. |
| Dominio propio | Anual | Opcional para las URLs, pero **necesario para enviar correo** desde un remitente verificado. Según el proveedor. |

### Costo necesario para producción

Es la configuración que se usa en esta guía: **API y base pagadas en Render, con dominio propio y correo por Resend.**

Los precios de Render son aproximados (la instancia más pequeña de cada uno). Confírmalos en render.com/pricing antes de contratar.

| Concepto | Tipo de pago | Costo aproximado |
|---|---|---|
| Google Play | Único | US$25 |
| API en Render (instancia pagada más pequeña) | Mensual | ~US$7 |
| Base de datos en Render (pagada más pequeña) | Mensual | ~US$6, más almacenamiento por GB |
| Dominio propio (por ejemplo `.cl` en NIC Chile) | Anual | Según el registrador |
| Correo con Resend (plan gratuito: 3.000 al mes, máximo 100 al día) | Gratis | US$0 |
| Sitios estáticos: web de administración y Expo web | Gratis | US$0 |
| Entorno de pruebas: API y base Free | Gratis | US$0 |
| EAS: compilar y actualizar la app | Gratis | US$0 |
| **Total mensual** | | **~US$13**, más almacenamiento |
| **Primer año** | | **~US$181**, más el dominio |
| **Años siguientes** | | **~US$156**, más el dominio |

- Render cobra por tiempo encendido: un servicio suspendido deja de cobrarse.
- No hace falta el plan "Professional" de Render, que cobra por usuario del equipo. El workspace básico permite servicios pagados.
- Si Resend se queda corto (más de 100 correos al día), su plan Pro cuesta US$20 al mes. Ver la [sección 11](#11-servicio-de-correo-electrónico).

### Costos de EAS

Según expo.dev/pricing:

| Servicio | Plan gratuito | Si se supera el límite |
|---|---|---|
| **EAS Build** (compilar) | 15 compilaciones de Android al mes (y 15 de iOS). Cola de baja prioridad y límite de 45 minutos por compilación. | No se puede compilar hasta el día 1 del mes siguiente. **No se cobra.** |
| **EAS Update** (actualizaciones sin pasar por Play) | Hasta 1.000 usuarios activos al mes. | No hay cobro extra; el plan queda limitado a ese número. |
| **EAS Submit** (subir a Google Play) | Incluido. | — |

- Las cuentas gratuitas **no tienen cargos por exceso**: Expo solo cobra si uno se suscribe a un plan pagado.
- El plan pagado más barato es **Starter, a US$19 al mes**, más cargos por uso. Agrega cola prioritaria, servidores más rápidos, crédito para compilaciones y 3.000 usuarios activos en EAS Update.
- Con el flujo de esta guía, cada versión nativa usa unas dos compilaciones (pruebas y oficial). Las 15 gratuitas alcanzan para unas 7 versiones nativas al mes. Los cambios solo de JavaScript se publican con EAS Update y no gastan compilaciones.

## Límites del plan gratuito de Render

- La API **se duerme tras 15 minutos** sin uso. La primera petición después tarda cerca de **1 minuto**.
- La base gratuita **vence a los 30 días**. Hay 14 días de gracia y luego Render la borra. Tiene 1 GB y **no tiene respaldos**.
- Solo puede haber **una base gratuita por workspace**.
- Los puertos **SMTP 25, 465 y 587 están bloqueados**. Los puertos alternativos que ofrecen algunos proveedores (2525 o 2587) no aparecen en la lista; ver la [sección 11](#11-servicio-de-correo-electrónico).
- No hay **shell** ni **pre-deploy command**. Por eso las migraciones se aplican al arrancar, con `DB_MIGRAR=true`.
- No hay disco persistente. No afecta a la app: la carga de Excel trabaja en memoria.

---

## 1. Preparar el código [código]

1. **Migración inicial.** Hoy las migraciones de `apps/api/src/migrations` solo agregan columnas, y en producción la API prohíbe `DB_SYNC=true`. Hace falta una migración que cree todas las tablas.
   - Crea una base local vacía:
     ```
     docker exec resibreak-db-1 createdb -U becados becados_vacia
     ```
   - Genera la migración en `apps/api`:
     ```
     pnpm build
     $env:DB_NAME='becados_vacia'; pnpm migration:generate src/migrations/inicial
     ```
   - Ponle una fecha (el número al final del nombre de la clase) **anterior** a las migraciones existentes, por ejemplo `Inicial1763000000000`. Así corre primero, y las demás quedan sin efecto porque usan `IF NOT EXISTS`.
   - Pruébala: recrea la base vacía, aplica con `pnpm migration:run`, levanta la API contra esa base y entra como administrador.
2. **Trabajar en local con migraciones.** Usa una base nueva (por ejemplo `becados_dev`) con `DB_SYNC=false` y `DB_MIGRAR=true` en `apps/api/.env`. Con `DB_SYNC=true`, `migration:generate` no detecta los cambios.
3. **Nombre del paquete definitivo,** por ejemplo `cl.ucn.resibreak`. En Google Play **no se puede cambiar nunca**.
4. **`app.config.ts` con dos variantes** (reemplaza a `app.json`):
   - **Oficial:** `cl.ucn.resibreak`, "ResiBreak". Esta va a Google Play.
   - **Pruebas:** `cl.ucn.resibreak.pruebas`, "ResiBreak Pruebas". Se reparte como APK con EAS y no va a Play.
5. **`apps/mobile/eas.json`:**
   - Perfil `preview`: APK con la URL de la API de pruebas.
   - Perfil `production`: AAB con la URL de la API oficial.
   - `cli.appVersionSource: "remote"` y `"autoIncrement": true` en `production`. Google rechaza la subida si el número de versión no sube.
6. **Íconos:** un ícono adaptativo de Android y una pantalla de inicio con buena resolución.
7. **Política de privacidad.** Es una página pública que **Google exige**. Debe explicar:
   - qué datos se guardan: RUT, nombre, correo, especialidad y pedidos;
   - para qué se usan y quién los ve;
   - cuánto tiempo se conservan;
   - a quién escribir para pedir su eliminación.
8. **`.node-version`** en la raíz, con Node 22 o superior. Los scripts de migraciones usan `--env-file-if-exists`. Si Render no lo lee, usa la variable `NODE_VERSION`.
9. **(Opcional)** Un workflow de GitHub Actions que corra los tests unitarios y e2e en cada PR, con un Postgres de servicio.

Une todo a `main`.

---

## 2. Ramas en GitHub

```
git checkout main && git pull
git checkout -b pruebas
git push -u origin pruebas
```

- En GitHub → Settings → Rules, protege `main`: sin push directo, solo PR, y con los tests en verde si existe el workflow. Idealmente protege `pruebas` también.
- **Flujo de trabajo:**
  ```
  rama-de-trabajo ──PR──► pruebas ──► entorno de PRUEBAS
                                          │ probar en web y APK de pruebas
                           main ◄───PR────┘
                             └──► entorno OFICIAL
  ```

---

## 3. Entorno oficial en Render, gratis (workspace A, rama `main`)

Como solo puede haber una base gratuita por workspace, el entorno oficial va en un workspace (A) y el de pruebas en otro (B). Usa **la misma región** para todos los servicios.

### 3.1 Base de datos: New → Postgres → Free

- Anota los datos de conexión **interna** (host, puerto, usuario, clave y base). Los usa la API.
- Anota la **URL externa**. Sirve para respaldos desde tu computador.
- Anota la **fecha de vencimiento** (día 30).

### 3.2 API: New → Web Service → Free

- **Rama:** `main`. Deja Root Directory vacío, porque el lockfile de pnpm está en la raíz.
- **Build command:**
  ```
  corepack enable && pnpm install --frozen-lockfile --prod=false && pnpm --filter ./apps/api build
  ```
  `--prod=false` es necesario: con `NODE_ENV=production`, pnpm omitiría las dependencias que necesita `nest build`.
- **Start command:** `node apps/api/dist/main.js`
- **Build filter:** `apps/api/**`
- **Variables de entorno:**

  | Variable | Valor |
  |---|---|
  | `NODE_ENV` | `production` |
  | `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` | Datos de conexión interna (3.1) |
  | `DB_SYNC` | `false` (en producción es obligatorio) |
  | `DB_MIGRAR` | `true` (aplica las migraciones al arrancar) |
  | `JWT_SECRET` | Aleatorio, 32 caracteres o más |
  | `ADMIN_RUT` | RUT del primer administrador |
  | `ADMIN_PASSWORD` | 12 caracteres o más |
  | `TZ` | `America/Santiago` |
  | `TRUST_PROXY` | `1` (Render pone un proxy delante; sin esto, el límite de intentos de login trata a todos como una sola IP) |
  | `CORS_ORIGINS` | `https://<web>.onrender.com,https://<app-web>.onrender.com` |
  | `CORREO_PROVEEDOR` | `consola` mientras no haya un servicio de correo configurado (ver [sección 11](#11-servicio-de-correo-electrónico)) |

  `PORT` no hace falta: Render lo define solo.
- **Verificación:** en los logs deben aparecer las migraciones aplicadas, el arranque y la creación del administrador. Luego prueba el login.

### 3.3 Web de administrador y proveedor: New → Static Site

- **Rama:** `main`.
- **Build command:**
  ```
  corepack enable && pnpm install --frozen-lockfile && pnpm --filter ./apps/web build
  ```
- **Publish directory:** `apps/web/dist`
- **Variable:** `VITE_API_URL=https://<api>.onrender.com/api`. Se incorpora al compilar, así que si cambia hay que recompilar.
- **Redirects/Rewrites:** `/*` → `/index.html` (Rewrite). Sin esto, recargar una ruta interna da 404.
- Aquí se puede publicar la **política de privacidad**.

### 3.4 App web para usuarios de iPhone (Expo web): New → Static Site

- **Rama:** `main`.
- **Build command:**
  ```
  corepack enable && pnpm install --frozen-lockfile && pnpm --filter ./apps/mobile exec expo export -p web
  ```
- **Publish directory:** `apps/mobile/dist`
- **Variable:** `EXPO_PUBLIC_API_URL=https://<api>.onrender.com/api`
- **Rewrite:** `/*` → `/index.html`
- Revisa todas las pantallas en Safari: la versión web de la app no se ha probado pantalla por pantalla.

### 3.5 CORS

Confirma que las URLs de los pasos 3.3 y 3.4 estén en `CORS_ORIGINS` de la API (con `https://` y sin barra final) y vuelve a desplegar la API.

### 3.6 Dominio propio (opcional)

Si se va a usar, configúralo **ahora**, antes de compilar para Google Play: la URL de la API queda dentro de la app que instalan los usuarios. Al pasar a pago, la URL `*.onrender.com` no cambia.

---

## 4. Entorno de pruebas en Render, gratis (workspace B, rama `pruebas`)

Repite el paso 3 en otro workspace u otra cuenta, con estas diferencias:

| | Oficial | Pruebas |
|---|---|---|
| Rama | `main` | `pruebas` |
| `JWT_SECRET`, `ADMIN_RUT`, `ADMIN_PASSWORD` | Propios | **Distintos** a los oficiales |
| `CORS_ORIGINS`, `VITE_API_URL`, `EXPO_PUBLIC_API_URL` | URLs oficiales | URLs de pruebas |
| Datos | Reales | **Solo ficticios** (por ejemplo `apps/api/src/importacion/ejemplo-residentes.xlsx`); nunca copiar datos reales |
| Correo | Real cuando exista | Siempre `consola` |

**Cuando venza la base de pruebas:** crea otra, cambia las variables `DB_*` de la API y vuelve a desplegar. La migración inicial crea las tablas sola.

---

## 5. Compilar la app con EAS

1. Inicia sesión e inicializa el proyecto:
   ```
   npx eas-cli@latest login
   npx eas-cli@latest init
   ```
2. **APK de pruebas:** se instala desde el enlace que entrega EAS.
   ```
   npx eas-cli@latest build -p android --profile preview
   ```
3. **AAB oficial:**
   ```
   npx eas-cli@latest build -p android --profile production
   ```
   - La primera vez, EAS crea y guarda la **clave de firma**. Déjala en EAS.
   - Descarga el `.aab` desde el panel de EAS: la primera subida a Google Play es manual.

---

## 6. Respaldos mientras el oficial esté en el plan gratuito

- **Respalda la base oficial cada semana** y antes de cada cambio importante:
  ```
  docker exec resibreak-db-1 pg_dump -Fc "<URL externa oficial>" > respaldo.dump
  ```
- **Si vence antes de pasar a pago:**
  1. Crea otra base Free.
  2. Restaura **antes** de arrancar la API:
     ```
     docker exec -i resibreak-db-1 pg_restore --no-owner --no-privileges -d "<URL externa nueva>" < respaldo.dump
     ```
  3. Cambia las variables `DB_*` de la API y vuelve a desplegar.

---

## 7. Google Play

### 7.1 Cuenta de desarrollador

Se crea en play.google.com/console. Cuesta US$25 una sola vez e incluye una verificación de identidad.

- **Cuenta personal:** antes de publicar exige una **prueba cerrada** (7.7).
- **Cuenta de organización** (por ejemplo, la institución): pide un número **D-U-N-S** (gratis, pero puede tardar días o semanas) y **no** exige la prueba cerrada.

### 7.2 Crear la app

Nombre "ResiBreak", idioma español, tipo aplicación, gratuita. Acepta las declaraciones.

### 7.3 Firma

Activa **Play App Signing**: Google guarda la clave final, y la de EAS queda como clave de subida.

### 7.4 Primera subida (manual)

- Sube el `.aab` del paso 5.3. Puede ir a *Prueba interna* (opcional, hasta 100 testers, revisión rápida) o directo a *Prueba cerrada*.
- Instala la app desde el enlace de Play y pruébala contra el entorno oficial.

### 7.5 Ficha de la tienda (*Presencia en Play Store*)

- Descripción corta (hasta 80 caracteres) y completa (hasta 4.000).
- Ícono de 512×512 y gráfico destacado de 1024×500.
- **Al menos 2 capturas** de teléfono.
- Categoría (*Productividad* o *Comer y beber*) y correo de contacto.

### 7.6 Contenido de la app (*Política → Contenido de la app*)

Todo es obligatorio:

- **Política de privacidad:** su URL.
- **Acceso a la app:** como requiere login y nadie se registra solo, hay que **entregar credenciales de prueba**.
  - Por ejemplo, un residente de demostración en el entorno oficial, con datos ficticios y algunos pedidos.
  - Si el revisor no puede entrar, rechazan la app.
  - Mientras estés en el plan gratuito, avisa en las instrucciones que la primera carga puede tardar cerca de un minuto.
- **Seguridad de los datos:**
  - Se recolectan nombre, identificador (RUT), correo y actividad en la app (pedidos).
  - Uso: funcionamiento de la app. Cifrado en tránsito (HTTPS). No se comparten con terceros.
  - Eliminación: las cuentas las crea el administrador, así que indica cómo pedirla (correo de contacto).
- **Clasificación de contenido:** cuestionario IARC.
- **Público objetivo:** mayores de 18.
- **Anuncios:** no tiene.
- **Otros formularios** que aparezcan (por ejemplo salud o gobierno): responder según corresponda.

### 7.7 Prueba cerrada (cuentas personales)

1. En *Pruebas → Prueba cerrada*, crea una versión y envíala a revisión.
2. Agrega a los testers por su correo de Google. **Mínimo 12; invita a 15 o más**: si quedan menos de 12, el conteo de días puede reiniciarse.
3. Cuando Google apruebe la versión, cada tester debe **aceptar la invitación desde el enlace** e instalar la app desde Play.
4. Créale a cada tester su cuenta en ResiBreak desde *Usuarios*, en el entorno oficial.
5. **Duración: 14 días seguidos o más** con los testers inscritos.
   - No tienen que usar la app todos los días, pero sí de verdad: varias veces por semana, agendando, cambiando, cancelando y confirmando recepciones.
   - Un solo pedido puede hacer que rechacen la solicitud.
6. **Junta comentarios** (formulario o grupo de mensajes) y **publica al menos una actualización** durante la prueba.
7. Al terminar, ve a *Panel → Solicitar acceso a producción* y responde con detalle: quiénes probaron, qué usaron y qué se cambió.

---

## 8. Pasar el entorno oficial a pago

Hazlo **antes de que venza la base gratuita** y, de preferencia, antes del lanzamiento en Google Play.

1. **Respalda** la base (paso 6).
2. **Agrega una tarjeta** al workspace A. Desde aquí Render cobra mensualmente.
3. **Base de datos:** en su configuración, cambia el tipo de instancia de *Free* a uno pagado. Si es antes del vencimiento, se conservan los datos; confírmalo en la documentación de Render. Activa las copias de seguridad que incluya el plan.
4. **API:** cambia la instancia de *Free* a una pagada.
   - Agrega el **pre-deploy command:** `pnpm --filter ./apps/api migration:run`. Si una migración falla, la versión nueva no se publica.
   - Cambia `DB_MIGRAR=false`.
   - Vuelve a desplegar y confirma en los logs que el pre-deploy corrió.
5. **Sitios estáticos:** no cambian; siguen gratis.
6. **Correo:** en el plan pagado se desbloquean los puertos SMTP estándar (465 y 587). Configura el servicio según la [sección 11](#11-servicio-de-correo-electrónico).
7. **Verifica:** login, la API responde rápido tras un rato sin uso y las URLs son las mismas. La app de Play no necesita cambios.
8. **(Opcional)** Lleva el entorno de pruebas al workspace A, que ahora tiene libre el cupo de base gratuita. Actualiza la URL del perfil `preview` **[código]**, genera otro APK de pruebas y elimina el workspace B.

---

## 9. Lanzamiento en Google Play

1. **Crea la versión:** en *Producción → Crear versión*, promueve la de la prueba cerrada o sube un `.aab` nuevo. Agrega las notas de la versión.
2. **Países:** Chile, o los que correspondan.
3. **Lanzamiento gradual:** por ejemplo, 20 % de los usuarios primero, y 100 % si no hay problemas.
4. **Envía a revisión:** puede tardar desde horas hasta unos días.
5. **Comparte los enlaces:** el de Google Play para los usuarios de Android y la URL de Expo web (3.4) para los de iPhone.

---

## 10. Mantenimiento después del lanzamiento

### Cambios en el código

1. Rama de trabajo → PR a `pruebas`. Se prueba con el APK y la web de pruebas.
2. PR de `pruebas` a `main`: se actualizan la API oficial y las webs.

### Actualizar la app

- **Solo JavaScript** (pantallas, textos, lógica): **EAS Update** al canal de producción. Llega sin pasar por la revisión de Play.
- **Cambios nativos** (una librería nueva, permisos o una versión nueva de Expo): hay que compilar otra vez.
  1. Compila con `npx eas-cli@latest build -p android --profile production`; el número de versión sube solo.
  2. Envía con `npx eas-cli@latest submit -p android`. Requiere configurar una vez una cuenta de servicio de Google con acceso a Play Console.
  3. Sube primero a prueba interna y luego promueve a producción.

### Compatibilidad hacia atrás

No todos actualizan la app el mismo día. La API debe seguir funcionando con la versión anterior:

- Agrega campos y rutas; no borres ni renombres los que usa la app publicada.
- Despliega primero la API y después la app.
- Quita lo antiguo solo cuando nadie use esa versión.

### Cambios de base de datos

1. Modifica la entidad.
2. Genera la migración:
   ```
   pnpm build
   pnpm migration:generate src/migrations/nombreDelCambio
   ```
3. Revisa el SQL y su `down`, y prueba en local con `pnpm migration:run`.
4. Al unir a `pruebas`, se aplica sola.
5. **Respalda el oficial.**
6. Al unir a `main`, la aplica el pre-deploy (o `DB_MIGRAR`, mientras siga en el plan gratuito).

### Si algo se rompe

- **Render:** rollback al despliegue anterior.
- **Base de datos:** el `down` de la migración o el respaldo, porque el rollback de Render no deshace la base.
- **App:** se puede volver a la actualización anterior de EAS, y en Play se puede pausar un lanzamiento gradual.

---

## 11. Servicio de correo electrónico

### Para qué se usa y qué está listo

La API tiene un módulo de correo (`apps/api/src/correo`, con su propio `README.md`) que envía por SMTP. Se configura con estas variables:

| Variable | Valor |
|---|---|
| `CORREO_PROVEEDOR` | `smtp` para enviar de verdad; `consola` solo registra en el log (por defecto) |
| `SMTP_HOST` | Servidor SMTP del proveedor |
| `SMTP_PORT` | Puerto (ver la tabla de proveedores) |
| `SMTP_USER` | Usuario SMTP del proveedor |
| `SMTP_PASS` | Clave SMTP o API key del proveedor |
| `CORREO_REMITENTE` | Por ejemplo `ResiBreak <no-responder@tudominio.cl>` |
| `CORREO_URL_APP` | URL pública de la app, para los enlaces de los correos |

**Pendiente [código]:** el **correo de bienvenida con la clave temporal** para los residentes nuevos todavía no se envía. La API responde `correosEnviados: 0`, y la web y la app tienen `CORREO_BIENVENIDA_HABILITADO = false`. Hay que implementarlo antes de activar el servicio.

### Requisitos

1. **Un dominio propio** (por ejemplo `resibreak.cl`). Los proveedores exigen verificar el dominio del remitente, agregando registros **SPF, DKIM y DMARC** en el DNS. Sin esto, los correos no salen o llegan a spam. No sirve un remitente `@gmail.com`.
2. **Una cuenta en un proveedor de correo transaccional,** de la que se obtienen el usuario y la clave SMTP.
3. **Un puerto que Render permita:**
   - **Plan gratuito:** bloquea 25, 465 y 587. Solo sirven los puertos alternativos, como **2587** o **2525**, si el proveedor los ofrece.
   - **Plan pagado:** funcionan los puertos estándar (587 o 465).

> **Ojo con los puertos.** El módulo activa TLS directo solo en el puerto **465**. En los demás, se conecta sin cifrar y exige pasar a TLS antes de autenticarse (STARTTLS).
> Por eso, en el plan gratuito sirve un puerto STARTTLS alternativo (**2587** o **2525**). Un puerto de TLS directo distinto del 465 (por ejemplo **2465**) fallaría sin un cambio de código.

### Proveedores

Datos de sus páginas de precios a la fecha de esta guía. Verifícalos antes de elegir.

| Proveedor | Plan gratuito | Plan pagado más barato | Puerto para Render gratis |
|---|---|---|---|
| **Resend** | 3.000 correos al mes, **máximo 100 al día**. Permanente. | Pro, US$20/mes (50.000 correos) | **2587** (STARTTLS), según su documentación. |
| **Mailgun** | 100 correos al día. | Basic, desde US$15/mes (10.000 correos) | Sin confirmar si ofrece 2525; revisar su documentación. |
| **Brevo** | Sin confirmar (no se pudo leer su página de precios). | Sin confirmar | Sin confirmar. |
| **Amazon SES** | Créditos por 6 meses; luego pago por uso. | Desde US$0,10 por cada 1.000 correos, sin cuota fija | Sin confirmar; su configuración es más compleja (cuenta AWS y salir del modo sandbox). |
| **Cuenta institucional** (por ejemplo Office 365) | Incluida | — | Usa 587, bloqueado en Render gratis. Además, el servidor debe tener habilitada la autenticación SMTP; hoy responde `535 Authentication failed`, así que hay que pedirlo a TI. |

**Recomendación:** Resend por el puerto 2587. Funcionaría desde el plan gratuito de Render sin cambiar código (no está probado aún) y su plan gratuito es permanente.

**Límite diario a considerar:** una carga de Excel con muchos residentes nuevos envía un correo de bienvenida por cada uno. Con un tope de 100 al día, una carga de 150 residentes no alcanzaría a enviarse completa ese día.
- Opción 1: hacer las cargas grandes en partes.
- Opción 2: que el envío se reparta en el tiempo **[código]**.
- Opción 3: pasar a un plan pagado.

### Pasos para activarlo

1. **Compra el dominio** y entra a la configuración de su DNS.
2. **Crea la cuenta** en el proveedor y **agrega el dominio**. Copia en el DNS los registros que te entregue (SPF, DKIM y DMARC) y espera a que aparezca como verificado.
3. **Crea una clave SMTP o API key** de envío.
4. **Prueba primero en local** con esas credenciales en `apps/api/.env`. Para pruebas sin enviar de verdad, el módulo funciona con Mailpit (`docker compose --profile correo up -d mailpit`, puerto 1025).
5. **Configura la API oficial en Render.** Ejemplo con Resend:

   | Variable | Valor |
   |---|---|
   | `CORREO_PROVEEDOR` | `smtp` |
   | `SMTP_HOST` | `smtp.resend.com` |
   | `SMTP_PORT` | `2587` en Render gratis; `587` en el plan pagado |
   | `SMTP_USER` | `resend` |
   | `SMTP_PASS` | La API key |
   | `CORREO_REMITENTE` | `ResiBreak <no-responder@tudominio.cl>` |
   | `CORREO_URL_APP` | URL pública de la web o la app |

6. **Vuelve a desplegar.** Si falta alguna variable, la API no arranca y el log dice cuál es.
7. **Envía un correo de prueba** con el endpoint de prueba del módulo (ver `apps/api/src/correo/README.md`) y revisa que llegue a la bandeja de entrada, no a spam.
8. **Entorno de pruebas:** déjalo siempre con `CORREO_PROVEEDOR=consola`, para no escribir a personas reales.
