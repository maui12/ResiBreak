# ResiBreak

Sistema de gestión de la alimentación de los becados (residentes): los residentes agendan sus pedidos de comida,
la administración gestiona turnos, becados y costos, y el proveedor reparte.

## Estructura

```
apps/
  api/      backend compartido · NestJS + TypeORM + PostgreSQL + JWT
  mobile/   app móvil · React Native + Expo (por ahora conectada: vistas del residente)
  web/      página web · React + Vite (todavía usa datos de prueba)
  docker-compose.yml   bases de datos de desarrollo y de tests
```

## Índice

1. [Puesta en marcha rápida](#puesta-en-marcha-rápida)
2. [Cambios de esta iteración](#cambios-de-esta-iteración)
3. [Configuración](#configuración)
4. [API](#api)
5. [Reglas de negocio](#reglas-de-negocio)
6. [Datos de prueba](#datos-de-prueba)
7. [Tests](#tests)
8. [Probar desde la app móvil](#probar-desde-la-app-móvil)
9. [Pendientes conocidos](#pendientes-conocidos)

---

## Puesta en marcha rápida

Requisitos: Node.js, pnpm (`npm install -g pnpm`) y Docker. Instalar dependencias desde la raíz:

```powershell
pnpm install
```

| Paso | Comando |
|---|---|
| 1. Base de datos de desarrollo (puerto 5433) | `cd apps; docker compose up -d db` |
| 2. API (crea tablas y hospitales al arrancar) | `pnpm --dir apps/api start:dev` |
| 3. Datos de prueba | ver [Datos de prueba](#datos-de-prueba) |
| 4. App móvil | `pnpm --dir apps/mobile start` y abrir con Expo Go |
| Web | `pnpm --dir apps/web dev` |

> La API queda en `http://localhost:3000/api`. Debe correr con `TZ=America/Santiago`: la anticipación mínima se calcula con la hora del servidor.

---

## Cambios de esta iteración

### 1. App móvil del residente conectada a la API

- **Login real** con RUT y contraseña (`POST /auth/login`). Se eliminaron la contraseña fija `1234` y los botones de "modo demostración". Cada rol entra a su pantalla (`residente`, `admin`/`consulta`, `proveedor`).
- **Sesión** en memoria con token, rol y `becadoId`. Si el token vence (401), la app vuelve al login. Se agregó **Cerrar sesión** en el menú lateral.
- **Pantallas del residente** (`apps/mobile/src/app/becado/`):
  - **Resumen**: pedidos de los próximos 7 días, con turno, horario, hospital, comidas y estado.
  - **Agendar pedidos**: hospital → turno (solo los de su especialidad) → fecha. Las comidas vienen del turno.
  - **Cambiar un pedido**: pedido → hospital → turno → fecha.
- Toda la comunicación con la API está en `apps/mobile/src/services/becados.service.ts`.

### 2. Turnos disponibles (módulo nuevo)

Nueva entidad `TurnoDisponible` en `apps/api/src/turnos-disponibles/` (tabla `turnos_disponibles`). Es el turno que **define la administración** y que el residente agenda. Tiene:

| Campo | Descripción |
|---|---|
| `nombre` | Ej.: "Guardia de 24 h" |
| `fechaInicio`, `fechaFin` | Vigencia. `fechaFin` es opcional (`null` = sin término) |
| `horaInicio`, `horaFin` | `HH:MM`. Si `horaFin <= horaInicio`, termina al día siguiente |
| `comidas` | Lo que recibe quien lo agenda: `desayuno`, `almuerzo`, `once`, `cena` |
| `diasNoDisponibles` | Días de la semana en que no se puede agendar (`domingo` … `sabado`) |
| `excluirFeriados` | Si es `true`, no se puede agendar en feriados |
| `especialidades` | Para quiénes está disponible (como se escriben en la ficha del becado) |
| `activo` | Eliminar un turno lo desactiva; los pedidos que ya lo usan no cambian |

No reemplaza a la entidad `Turno` existente (`turnos/`), que sigue registrando que un becado tiene turno un día puntual.
Los endpoints de administración están listos; **la web todavía no los usa**.

### 3. El residente ya no elige comidas

Las comidas salen siempre del turno agendado. Se eliminaron `POST /residente/pedidos` (pedir una comida suelta) y
`PATCH /residente/pedidos/:id/cancelar` (cancelar comida por comida). Cancelar ahora es por pedido completo.

### 4. Hospital por pedido y RUT en la ficha del becado

- Los becados **ya no tienen hospital fijo**: el hospital de entrega se elige en cada pedido (`pedidos.hospitalId`).
  El listado de pedidos, el proveedor y el informe por hospital usan el hospital del pedido.
- `Becado` tiene `rut` (único, normalizado). `CrearBecadoDto` lo valida como RUT chileno y ya no recibe `hospitalId`.

### 5. Correcciones del backend

| Problema | Arreglo |
|---|---|
| La API no compilaba (`becados.service`, `pedidos.service`, `proveedor.service`) | Errores de sintaxis y tipos corregidos |
| `configurarApp()` se llamaba después de `listen()`: no había prefijo `/api` ni validación | Se llama antes de `listen()` |
| `GET /becados/:id` fallaba siempre (`@Param(':id')`) | Corregido |
| `CrearBecadoDto` exigía `rut` numérico con `@MaxLength`, imposible de cumplir | `rut` es texto validado como RUT |
| Archivos de la web en `apps/api/src/utils` rompían el build | Excluidos del build de la API (la web los importa desde ahí) |

### 6. Infraestructura y tests

- `docker-compose.yml`: desarrollo en el puerto **5433** y tests en el **5434**. El 5432 queda libre porque puede haber un PostgreSQL instalado en el equipo.
- Tests e2e reescritos (`apps/api/test/residente.e2e-spec.ts`): flujo del residente, CRUD de turnos disponibles y seguridad entre roles.
- Script de datos de prueba: `apps/api/db/seed-prueba-becados.sql`.

---

## Configuración

### `apps/api/.env`

| Variable | Obligatoria | Descripción |
|---|---|---|
| `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` | Sí | Conexión a PostgreSQL. Con docker compose: `localhost`, `5433`, `becados`, `becados`, `becados` |
| `JWT_SECRET` | Sí | Mínimo 32 caracteres |
| `JWT_EXPIRES_SEGUNDOS` | No | Duración del token (por defecto 28800 = 8 h) |
| `ADMIN_RUT`, `ADMIN_PASSWORD` | No | Crean el primer administrador si no hay usuarios. RUT válido y clave de 12+ caracteres. **Reemplazan a `ADMIN_EMAIL`** |
| `DB_SYNC` | No | `true` crea y actualiza las tablas solo. Solo desarrollo |
| `TZ` | Sí, en la práctica | `America/Santiago` |
| `PORT`, `HOST` | No | Por defecto `3000` y `0.0.0.0` |
| `CORS_ORIGINS` | No | Orígenes de la web, separados por coma |

`SEED_DEMO` ya no existe: usar el [script de datos de prueba](#datos-de-prueba).

### `apps/mobile/.env`

```
EXPO_PUBLIC_API_URL=http://<IP-de-tu-PC>:3000/api
```

En un celular físico no sirve `localhost`: va la IP del computador en la red Wi-Fi (`ipconfig`).
Emulador Android: `http://10.0.2.2:3000/api`. Ya no se usan `EXPO_PUBLIC_API_TOKEN`, `EXPO_PUBLIC_RESIDENTE_ID` ni `EXPO_PUBLIC_DEMO_*`.

---

## API

### Convenciones

- **Prefijo:** todas las rutas empiezan con `/api`.
- **Autenticación:** `Authorization: Bearer <accessToken>`. Todas las rutas la exigen salvo `/health` y `/auth/login`.
- **Roles:** `admin`, `consulta`, `proveedor`, `residente`. Una ruta sin rol indicado es **solo para `admin`**.
- **Fechas:** `AAAA-MM-DD`. **Mes:** 1 a 12. **Horas:** `HH:MM`.
- **Validación:** los campos desconocidos se rechazan con `400`.
- **Límite de uso:** 100 peticiones por minuto (login: 5; agendar, reprogramar y cancelar: 30).

Los errores responden `{ "statusCode": 400, "message": "..." }` (`message` puede ser una lista).

| Código | Cuándo |
|---|---|
| 400 | Datos inválidos o regla de negocio incumplida (anticipación, restricciones del turno, etc.) |
| 401 | Falta el token, es inválido o expiró; o credenciales incorrectas en el login |
| 403 | El rol no tiene permiso para esa ruta |
| 404 | El recurso no existe (o no está disponible para ese residente) |
| 409 | Conflicto: ya existe, o el día ya tiene pedido |
| 429 | Demasiadas peticiones |

### Sesión

| Método | Ruta | Acceso | Qué hace |
|---|---|---|---|
| GET | `/health` | público | `{ "status": "ok" }` |
| POST | `/auth/login` | público | `{ rut, password }` → `{ accessToken, rol, becadoId, hospitalId }`. Acepta `12.345.678-5` o `12345678-5`. Tras 5 intentos fallidos la cuenta se bloquea 15 min |
| POST | `/usuarios` | admin | Crea una cuenta: `{ rut, password, rol, becadoId? }`. Un `residente` debe indicar `becadoId` |
| GET | `/usuarios` | admin | Lista las cuentas |
| PATCH | `/usuarios/:id` | admin | `{ activo?, password? }` |

### 🆕 Turnos disponibles (administración)

| Método | Ruta | Acceso | Qué hace |
|---|---|---|---|
| GET | `/turnos-disponibles?especialidad=&incluirInactivos=` | admin, consulta | Lista los turnos activos (o todos con `incluirInactivos=true`). `especialidad` filtra sin importar mayúsculas ni tildes |
| GET | `/turnos-disponibles/:id` | admin, consulta | Un turno |
| POST | `/turnos-disponibles` | admin | Crea un turno |
| PATCH | `/turnos-disponibles/:id` | admin | Modifica cualquier campo. `{ "activo": true }` reactiva un turno eliminado |
| DELETE | `/turnos-disponibles/:id` | admin | Lo desactiva (deja de ofrecerse). Responde `204` |

```http
POST /api/turnos-disponibles
{
  "nombre": "Guardia de 24 h",
  "fechaInicio": "2026-12-01",
  "fechaFin": "2027-03-31",
  "horaInicio": "08:00",
  "horaFin": "08:00",
  "comidas": ["desayuno", "almuerzo", "once", "cena"],
  "diasNoDisponibles": ["lunes", "martes", "miercoles", "jueves", "viernes"],
  "excluirFeriados": false,
  "especialidades": ["Pediatría", "Medicina de Urgencias"]
}
```

Opcionales: `fechaFin` (por defecto `null`), `diasNoDisponibles` (`[]`) y `excluirFeriados` (`false`).
Se rechaza con `400` si: la hora no es `HH:MM`, `comidas` o `especialidades` están vacías o repetidas,
`fechaFin` es anterior a `fechaInicio`, o se restringen los 7 días. Las comidas y los días se guardan ordenados.

### 🆕 Residente

Todas exigen rol `residente`. El residente se identifica por el token: nunca se envía su id.

| Método | Ruta | Qué hace |
|---|---|---|
| GET | `/residente/resumen` | Datos del residente, reglas, turno de hoy, próximos turnos y comidas de hoy |
| GET | `/residente/turnos-disponibles` | Turnos que puede agendar: activos, vigentes y de su especialidad |
| GET | `/residente/calendario?anio&mes` | Cada día del mes: si es feriado y si ya tiene turno o pedido |
| GET | `/residente/pedidos?vista=proximos\|historial` | Sus comidas (una fila por comida), con hospital y turno |
| POST | `/residente/pedidos/agendar` | Agenda un día con un turno |
| PUT | `/residente/pedidos/reprogramar` | Cambia el día, el hospital y/o el turno de un pedido |
| PATCH | `/residente/pedidos/cancelar` | Cancela el pedido completo de un día |

**`GET /residente/resumen`**

```json
{
  "hoy": "2026-11-10",
  "becado": { "nombre": "Camila Soto", "especialidad": "Pediatría" },
  "reglas": { "anticipacionMinimaHoras": 24, "maxDiasAnticipacion": 30 },
  "turnoHoy": null,
  "comidasHoy": [],
  "proximosTurnos": [{ "fecha": "2026-11-13", "tipo": "normal" }]
}
```

**`GET /residente/turnos-disponibles`**

```json
[{
  "id": 2, "nombre": "Turno diurno",
  "fechaInicio": "2026-11-10", "fechaFin": null,
  "horaInicio": "08:00", "horaFin": "18:00",
  "comidas": ["almuerzo", "once"],
  "diasNoDisponibles": ["domingo", "sabado"], "excluirFeriados": true
}]
```

**`GET /residente/calendario?anio=2026&mes=11`**

```json
{ "anio": 2026, "mes": 11, "dias": [
  { "fecha": "2026-11-13", "dia": 13, "tipo": "normal", "feriado": false, "turno": "normal", "conPedido": true }
]}
```

**`GET /residente/pedidos`**: `{ hoy, vista, items: [{ id, fecha, tipoComida, estado, hospitalId, hospital, turnoDisponible: { id, nombre, horaInicio, horaFin } | null }] }`

**`POST /residente/pedidos/agendar`**

```http
{ "fecha": "2026-11-20", "hospitalId": 1, "turnoDisponibleId": 2 }
→ 201 { "fecha": "2026-11-20", "hospitalId": 1, "turnoDisponibleId": 2, "comidas": ["almuerzo", "once"] }
```

Registra el turno del becado ese día (si no lo tenía) y las comidas del turno, todo o nada.

| Error | Cuándo |
|---|---|
| 400 | No cumple la anticipación mínima, supera los 30 días, el día está restringido por el turno o está fuera de su vigencia, o se envían campos de más (por ejemplo `comidas`) |
| 404 | El hospital no existe, o el turno no existe, está inactivo o no es de su especialidad |
| 409 | Ya tiene un pedido ese día |

**`PUT /residente/pedidos/reprogramar`**

```http
{ "fechaActual": "2026-11-20", "fechaNueva": "2026-11-21", "hospitalId": 2, "turnoDisponibleId": 3 }
→ 200 { "fecha": "2026-11-21", "hospitalId": 2, "turnoDisponibleId": 3, "comidas": [...] }
```

Solo `fechaActual` es obligatorio; hay que cambiar al menos una cosa. Al cambiar de turno, las comidas pasan a ser las del
turno nuevo. Si se cambia el día o el turno, el turno final debe servir para el día final. Todo en una transacción.

| Error | Cuándo |
|---|---|
| 400 | Sin cambios; `fechaActual` o `fechaNueva` sin la anticipación mínima; el turno no sirve para ese día; el pedido tiene comidas ya entregadas; el pedido no tiene turno y se quiere mover |
| 404 | No hay pedido en `fechaActual`, o el hospital o el turno no están disponibles |
| 409 | La nueva fecha ya tiene un pedido |

**`PATCH /residente/pedidos/cancelar`**: `{ "fecha": "2026-11-20" }` → `{ "fecha": "2026-11-20", "estado": "cancelado" }`.
Cancela todas las comidas del día y libera el día. `400` si no cumple la anticipación o ya hay comidas entregadas; `404` si no hay pedido.

### Resto de la API

| Método | Ruta | Acceso | Qué hace |
|---|---|---|---|
| GET | `/hospitales` | admin, consulta, residente | `[{ id, nombre }]` |
| POST | `/hospitales` | admin, consulta | `{ nombre }` |
| GET | `/configuracion` | admin, consulta | `maxTurnosMes`, `anticipacionMinimaHoras`, `hospitalActivo` (sin uso), costos de cada comida y `actualizadoEn` |
| PUT | `/configuracion` | admin | Cambia solo los campos enviados (al menos uno). Rige de inmediato para todo el sistema |
| GET | `/becados?anio&mes` | admin, consulta | Becados activos con su resumen del mes: `id, nombre, rut, especialidad, turnos, turnosLargos, comidas, monto, tiposComida`. No cuenta los pedidos cancelados |
| GET | `/becados/:id` | admin, consulta | Un becado |
| POST | `/becados` | admin, consulta | `{ nombre, rut, especialidad }` |
| PATCH | `/becados/:id` | admin, consulta | Modifica datos |
| DELETE | `/becados/:id` | admin, consulta | Desactiva el becado y su cuenta. `204` |
| GET | `/calendario?anio&mes` | admin | `{ anio, mes, dias: [{ fecha, dia, tipo, turnos }] }` |
| GET / POST / DELETE | `/calendario/feriados` | admin (escritura: admin, consulta) | Feriados `{ fecha, nombre }` |
| GET | `/turnos?anio&mes[&becadoId]` | admin | Turnos registrados (becado + día) |
| POST / DELETE | `/turnos`, `/turnos/:id` | admin, consulta | Registrar o eliminar el turno de un becado un día |
| GET | `/pedidos?anio&mes[&hospitalId][&estado]` | admin | Agrupados por becado y día: `{ becadoId, becado, hospital, hospitalId, fecha, dia, comidas, estado }` |
| GET | `/pedidos/contabilidad?anio&mes` | admin | `[{ tipo, cantidad, total }]` |
| POST | `/pedidos` | admin, consulta | `{ becadoId, fecha, comidas, hospitalId }` (**`hospitalId` ahora es obligatorio**) |
| PATCH | `/pedidos/estado` | admin, consulta | `{ becadoId, fecha, estado }` con `pendiente`, `entregado` o `cancelado` |
| DELETE | `/pedidos/:id` | admin, consulta | Elimina una comida. `204` |
| GET | `/panel/resumen?anio&mes` | admin, consulta | `gastoMes`, `comidasProgramadas`, `comidasRepartidas`, `becadosActivos`, `becadosSobreLimite`, `maxTurnosMes`, `comidasPorEspecialidad`, `contabilidad`. No cuenta los pedidos cancelados |
| GET | `/informes/hospitales?desde&hasta` | admin, consulta | `[{ hospital, turnos, comidas, monto }]` por hospital de entrega |

**Endpoints que ya no existen:** `PUT /turnos/reprogramar` (reemplazado por `PUT /residente/pedidos/reprogramar`),
`POST /residente/pedidos` y `PATCH /residente/pedidos/:id/cancelar`.

---

## Reglas de negocio

- **Comidas:** `desayuno`, `almuerzo`, `once`, `cena`. El precio vigente se guarda en el pedido (`valorUnitario`), así que cambiar los costos no altera pedidos anteriores.
- **Estados de una comida:** `pendiente` → `entregado`, o `cancelado`. Un día se muestra como pendiente si tiene al menos una comida pendiente.
- **El residente agenda turnos, no comidas:** las comidas salen del turno disponible elegido.
- **Disponibilidad de un turno:** el día debe estar dentro de la vigencia, no ser un día de la semana restringido y no ser feriado si el turno los excluye. El residente solo ve y agenda turnos activos de su especialidad (se compara sin mayúsculas, tildes ni espacios extra).
- **Anticipación mínima** (`anticipacionMinimaHoras`, por defecto 24 h): agendar, cambiar y cancelar exigen que el día empiece al menos esas horas después de ahora (se mide desde las 00:00).
- **Tope:** se agenda hasta 30 días hacia adelante.
- **Un pedido por día y residente**, entregado en el hospital elegido. Un pedido con comidas ya entregadas no se puede cambiar ni cancelar.
- **Tipo de día** (entidad `Turno`): sábado, domingo y feriado son `24h`; el resto, `normal`. Lo decide el servidor.
- **Límite de turnos:** `maxTurnosMes` solo avisa en el panel; no bloquea.

---

## Datos de prueba

`apps/api/db/seed-prueba-becados.sql` crea datos mínimos para probar la vista del residente. Se puede ejecutar varias veces sin duplicar nada.

**1. Recrear la base de desarrollo** (necesario la primera vez tras estos cambios, porque cambió el esquema; **borra todos los datos**):

```powershell
docker exec apps-db-1 psql -U becados -d becados -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
```

**2. Arrancar la API una vez** para que cree las tablas y los hospitales (`DB_SYNC=true`):

```powershell
pnpm --dir apps/api start:dev
```

**3. Cargar los datos** (desde `apps/api`, con la API ya arrancada al menos una vez):

```powershell
Get-Content db/seed-prueba-becados.sql -Raw | docker exec -i apps-db-1 psql -U becados -d becados -v ON_ERROR_STOP=1
```

En bash: `docker exec -i apps-db-1 psql -U becados -d becados -v ON_ERROR_STOP=1 < db/seed-prueba-becados.sql`

| RUT | Contraseña | Cuenta | Qué tiene |
|---|---|---|---|
| `11.111.111-1` | `admin-prueba-123` | Administrador | Sirve para probar los endpoints de administración |
| `12.345.678-5` | `residente123` | Residente de Pediatría | Ve 3 turnos y tiene un pedido ya agendado |
| `1.234.567-4` | `residente123` | Residente de Cirugía General | Ve 2 turnos |

Además crea 4 turnos disponibles (días hábiles, fines de semana, uno con fecha de término y uno solo para Cirugía) y un feriado de prueba en los próximos días.

---

## Tests

```powershell
# Unitarios (reglas de anticipación, calendario y disponibilidad de turnos)
pnpm --dir apps/api test

# e2e: necesitan la base de tests (puerto 5434, vive en memoria)
cd apps; docker compose up -d db_test
pnpm --dir apps/api test:e2e
docker compose stop db_test      # al terminar
```

Los e2e borran datos, por eso solo corren contra una base cuyo nombre termine en `_test` (`test/setup-env.ts`).
Cubren: login, RUT del becado, CRUD y validaciones de turnos disponibles, filtro por especialidad, agendar,
restricciones de días, anticipación, reprogramar, cancelar, informe por hospital y permisos entre roles.

---

## Probar desde la app móvil

1. Base de datos, API y datos de prueba listos (secciones anteriores).
2. En `apps/mobile/.env`, `EXPO_PUBLIC_API_URL` con la IP del computador: `http://192.168.x.x:3000/api`.
3. Arrancar Expo y abrir la app con Expo Go en un celular conectado al mismo Wi-Fi:
   ```powershell
   pnpm --dir apps/mobile start
   ```
4. Entrar con `12.345.678-5` / `residente123` y recorrer:
   - **Resumen:** aparece el pedido de prueba con su turno, horario y hospital.
   - **Agendar pedidos:** elegir hospital → turno → fecha. En el calendario solo se habilitan los días que permite ese turno; el feriado aparece marcado como "Fer.".
   - **Cambiar un pedido:** elegir el pedido de prueba y cambiar el hospital, el turno o la fecha.
5. Entrar con `1.234.567-4` para comprobar que un residente de otra especialidad ve otros turnos.

Si el celular no llega a la API, revisar que el firewall de Windows permita el puerto 3000 (en una terminal de administrador):

```powershell
New-NetFirewallRule -DisplayName "API becados 3000" -Direction Inbound -Protocol TCP -LocalPort 3000 -Action Allow -Profile Private
```

---

## Pendientes conocidos

- **Web:** todavía no usa la API. Falta la pantalla de administración de turnos disponibles (los endpoints ya están).
- **Proveedor:** `ProveedorModule` no está registrado en `app.module.ts`, así que `/proveedor/*` no responde.
- **Especialidades** son texto libre en la ficha del becado; conviene una lista fija para evitar diferencias de escritura.
- **Archivos de la web en `apps/api/src/utils`:** la web los importa desde ahí; deberían moverse a `apps/web`.
- **App móvil:** errores de tipos ya existentes en `_layout.tsx`, `admin/panelAdmin.tsx`, `login.tsx` (imports de logos), `components/ui/collapsible.tsx` y `hooks/use-theme.ts`; `components/app-tabs.tsx` tiene un error de sintaxis y no se usa.
- **Migraciones:** con `DB_SYNC=false` (producción) hay que crear migraciones para `becados.rut`, `pedidos.hospitalId`, `pedidos.turnoDisponibleId` y la tabla `turnos_disponibles`.
