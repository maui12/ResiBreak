# ResiBreak

## Estructura

en carpeta apps/

**web** = React + Vite

**mobile** = React native + Expo

**api** = backend, Nestjs


# ResiBreak API

API REST del sistema de gestión de alimentación de residentes. La consumen la web (React) y la app móvil (Expo).

**Stack:** NestJS · TypeORM · PostgreSQL · JWT.

> Esta documentación incluye el endpoint `PUT /turnos/reprogramar` y el campo `hospitalId` de los pedidos (cambio de día u hospital de un pedido).

La API queda en `http://localhost:3000/api`. Arráncala con `TZ=America/Santiago`: las reglas de anticipación se calculan con la hora del servidor.

## Requisitos

* Node.js
* pnpm
* Docker

```
npm install -g pnpm
```

## Instalar dependencias
* En la carpeta raíz del proyecto, cmd:
```
pnpm install
```

## Ejecución local

### web
```
pnpm --dir apps/web dev
```

### mobile
```
pnpm --dir apps/mobile start
```

### Backend (api)
```
pnpm --dir apps/api start:dev

### Variables de entorno (`apps/api/.env`)

| Variable | Obligatoria | Descripción |
|---|---|---|
| `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` | Sí | Conexión a PostgreSQL |
| `JWT_SECRET` | Sí | Clave para firmar los tokens (mínimo 32 caracteres) |
| `JWT_EXPIRES_SEGUNDOS` | No | Duración del token (por defecto 28800 = 8 h) |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | No | Crean el primer administrador si todavía no hay usuarios |
| `DB_SYNC` | No | `true` crea y actualiza las tablas solo. Solo desarrollo |
| `SEED_DEMO` | No | `true` crea un residente de prueba (ver más abajo). Se ignora en producción |
| `PORT`, `HOST` | No | Puerto (3000) y host (`0.0.0.0`) |
| `CORS_ORIGINS` | No | Orígenes permitidos para la web, separados por coma |

Si falta una variable obligatoria, la API no arranca.

## Convenciones

- **Prefijo:** todas las rutas empiezan con `/api`.
- **Autenticación:** `Authorization: Bearer <accessToken>`. Todas las rutas la exigen, salvo las marcadas como *público*.
- **Roles:** `admin` (todo) y `consulta` (solo lectura). Donde dice *sesión*, basta con estar autenticado.
- **Fechas:** `AAAA-MM-DD`. **Mes:** de 1 a 12.
- **Validación:** el cuerpo y los parámetros se validan; los campos desconocidos se rechazan con `400`.
- **Límite de uso:** 100 peticiones por minuto por IP (el login, 5 por minuto).

### Errores

Responden `{ "statusCode": 400, "message": "..." }` (o `message` como lista, si fallan varias validaciones).

| Código | Cuándo |
|---|---|
| 400 | Datos inválidos o regla de negocio incumplida (por ejemplo, anticipación mínima) |
| 401 | Falta el token, es inválido o expiró; o credenciales incorrectas en el login |
| 403 | El rol no tiene permiso para esa ruta |
| 404 | El recurso no existe |
| 409 | Ya existe un registro igual, o el registro está en uso |
| 429 | Demasiadas peticiones |

## Endpoints

### Salud y sesión

| Método | Ruta | Acceso | Qué hace |
|---|---|---|---|
| GET | `/health` | público | Devuelve `{ "status": "ok" }`. Sirve para comprobar que la API está viva |
| POST | `/auth/login` | público | Inicia sesión con `{ email, password }`. Devuelve `{ accessToken, rol }` |

### Hospitales y configuración

| Método | Ruta | Acceso | Qué hace |
|---|---|---|---|
| GET | `/hospitales` | sesión | Lista los hospitales: `[{ id, nombre }]` |
| POST | `/hospitales` | admin | Crea un hospital: `{ nombre }` |
| GET | `/configuracion` | sesión | Reglas y costos: `maxTurnosMes`, `anticipacionMinimaHoras`, `hospitalActivo`, `costoDesayuno`, `costoAlmuerzo`, `costoOnce`, `costoCena` |
| PUT | `/configuracion` | admin | Actualiza uno o varios de esos campos (todos opcionales) |

### Becados (residentes)

| Método | Ruta | Acceso | Qué hace |
|---|---|---|---|
| GET | `/becados?anio&mes` | sesión | Lista los becados activos con su resumen del mes: `turnos`, `turnosLargos`, `comidas`, `monto`, `tiposComida`, `rut`, `hospital` |
| GET | `/becados/:id` | sesión | Datos de un becado, con su hospital |
| POST | `/becados` | admin | Crea un becado: `{ nombre, especialidad, hospitalId }` |
| PATCH | `/becados/:id` | admin | Modifica los datos de un becado |
| DELETE | `/becados/:id` | admin | Lo **desactiva** (no lo borra). Responde `204` |

### Calendario

| Método | Ruta | Acceso | Qué hace |
|---|---|---|---|
| GET | `/calendario?anio&mes` | sesión | Días del mes: `{ anio, mes, dias: [{ fecha, dia, tipo, turnos }] }`. `tipo` es `normal` o `24h`; `turnos` es la cantidad de turnos ese día |
| GET | `/calendario/feriados?anio` | sesión | Feriados del año |
| POST | `/calendario/feriados` | admin | Crea un feriado: `{ fecha, nombre }`. Ese día pasa a ser de 24 h |
| DELETE | `/calendario/feriados/:id` | admin | Elimina un feriado. Responde `204` |

### Turnos

Un turno es un día de trabajo de un becado. Hay uno por becado y día.

| Método | Ruta | Acceso | Qué hace |
|---|---|---|---|
| GET | `/turnos?anio&mes[&becadoId]` | sesión | Turnos del mes, con los datos del becado. Se puede filtrar por `becadoId` |
| POST | `/turnos` | admin | Registra un turno: `{ becadoId, fecha }`. El servidor decide si es `normal` o `24h` |
| PUT | `/turnos/reprogramar` | admin | Cambia el día y/o el hospital de un pedido ya agendado (ver más abajo) |
| DELETE | `/turnos/:id` | admin | Elimina un turno. Responde `204` |

### Pedidos

Un pedido es una comida de un becado en un día. Cada comida es una fila.

| Método | Ruta | Acceso | Qué hace |
|---|---|---|---|
| GET | `/pedidos?anio&mes[&hospitalId][&estado]` | sesión | Pedidos del mes agrupados por becado y día: `{ becadoId, becado, hospital, hospitalId, fecha, dia, comidas, estado }` |
| GET | `/pedidos/contabilidad?anio&mes` | sesión | Cantidad y total por tipo de comida: `[{ tipo, cantidad, total }]` |
| POST | `/pedidos` | admin | Crea las comidas de un día: `{ becadoId, fecha, comidas, hospitalId? }` |
| PATCH | `/pedidos/estado` | admin | Marca todas las comidas de un becado en un día como `Repartido` o `Programado`: `{ becadoId, fecha, estado }` |
| DELETE | `/pedidos/:id` | admin | Elimina una comida (una fila). Responde `204` |

### Panel e informes

| Método | Ruta | Acceso | Qué hace |
|---|---|---|---|
| GET | `/panel/resumen?anio&mes` | sesión | Resumen del mes: `gastoMes`, `comidasRepartidas`, `becadosActivos`, `becadosSobreLimite`, `maxTurnosMes`, `comidasPorEspecialidad`, `contabilidad` |
| GET | `/informes/hospitales?desde&hasta` | sesión | Por hospital en un rango de fechas: `[{ hospital, turnos, comidas, monto }]` |

## Reglas de negocio

- **Tipo de día:** sábado, domingo y feriado son guardia de `24h`; el resto, `normal`. Lo decide siempre el servidor.
- **Comidas:** `Desayuno`, `Almuerzo`, `Once`, `Cena`. El costo de cada una está en la configuración y se **guarda en el pedido** al crearlo (`valorUnitario`), así que cambiar los costos no altera los pedidos anteriores.
- **Sin duplicados:** un becado no puede tener dos turnos el mismo día, ni la misma comida dos veces el mismo día (responde `409`).
- **Anticipación mínima:** un turno futuro solo se registra si faltan al menos `anticipacionMinimaHoras` horas para que empiece el día (se mide desde las 00:00). Las fechas pasadas se aceptan, como registro histórico.
- **Hospital del pedido:** `hospitalId` es opcional. Si no se indica, el pedido se entrega en el hospital del becado.
- **Límite de turnos:** `maxTurnosMes` solo se usa para avisar quiénes lo superan (panel); no bloquea nada.

## Agendar un pedido

El flujo completo son dos llamadas:

```http
POST /api/turnos
{ "becadoId": 1, "fecha": "2026-11-20" }

POST /api/pedidos
{ "becadoId": 1, "fecha": "2026-11-20", "comidas": ["Almuerzo", "Once"], "hospitalId": 2 }
```

## Cambiar un pedido: `PUT /turnos/reprogramar`

Cambia el día, el hospital o ambos, **en una sola transacción**: si algo falla, el pedido queda como estaba.

```http
PUT /api/turnos/reprogramar
{
  "becadoId": 1,
  "fechaActual": "2026-11-20",
  "fechaNueva": "2026-11-25",
  "comidas": ["Desayuno", "Almuerzo", "Once", "Cena"],
  "hospitalId": 2
}
```

| Campo | Obligatorio | Descripción |
|---|---|---|
| `becadoId` | Sí | Becado dueño del pedido |
| `fechaActual` | Sí | Día en que está agendado hoy |
| `fechaNueva` | No | Día al que se mueve. Si se envía, hay que enviar también `comidas` |
| `comidas` | Si hay `fechaNueva` | Comidas del nuevo día (dependen de si es normal o de 24 h) |
| `hospitalId` | No | Hospital de entrega. Si no se envía al mover el día, se conserva el que tenía |

Hay que enviar al menos `fechaNueva` u `hospitalId`. Casos:

- **Solo hospital:** `{ becadoId, fechaActual, hospitalId }`: el día y las comidas no cambian.
- **Solo día:** `{ becadoId, fechaActual, fechaNueva, comidas }`: se mantiene el hospital.
- **Ambos:** todos los campos.

Se rechaza con:

- `400` si `fechaActual` o `fechaNueva` no cumplen la anticipación mínima (las fechas pasadas tampoco), si no hay nada que cambiar, o si el pedido **ya fue repartido**.
- `404` si no hay un pedido en `fechaActual`, o el hospital o el becado no existen.
- `409` si `fechaNueva` ya tiene un turno o pedidos de ese becado.

## Datos de prueba

Con `SEED_DEMO=true` (y fuera de producción), al arrancar se crea un residente de prueba si no existe:

| Dato | Valor |
|---|---|
| Nombre | Residente de Prueba |
| RUT | `11111111-1` |
| Especialidad | Medicina Interna |
| Hospital | el primero de la lista |

## Borrar los pedidos de prueba

Los pedidos viven en las tablas `pedidos` y `turnos` de PostgreSQL. Dentro de `psql`:

```sql
-- solo los de hoy
DELETE FROM pedidos WHERE "creadoEn" >= CURRENT_DATE;
DELETE FROM turnos  WHERE "creadoEn" >= CURRENT_DATE;

-- todos
TRUNCATE pedidos, turnos RESTART IDENTITY;
```

Si usas `DB_SYNC=false`, la columna `hospitalId` de `pedidos` hay que crearla a mano:

```sql
ALTER TABLE pedidos ADD COLUMN "hospitalId" integer NULL;
ALTER TABLE pedidos ADD CONSTRAINT fk_pedidos_hospital
  FOREIGN KEY ("hospitalId") REFERENCES hospitales(id) ON DELETE RESTRICT;
```