# Carga de residentes nuevos desde Excel

El administrador sube el Excel con el listado de residentes. La app muestra **solo los residentes y
las especialidades nuevos** y deja quitar los que no correspondan. Al confirmar, crea las fichas
(`becados`) y las cuentas de acceso (`usuarios` con rol residente).

Está disponible en la **web** (menú *Usuarios* → *Agregar residentes nuevos*) y en la **app móvil**
(menú lateral *Usuarios* → *Agregar residentes nuevos*). Solo la ve y la usa el rol **admin**.

---

## 1. Flujo completo

```
 Admin elige el archivo (.xlsx / .xls / .csv)
        │
        ▼
 POST /api/becados/importar/vista-previa      ← multipart/form-data, campo "archivo"
        │   La API lee el Excel y lo compara con la BD. NO guarda nada.
        ▼
 Pantalla de revisión
   • Resumen: filas leídas, nuevos, ya registrados, filas con problemas
   • ⚠ Alertas de correo (falta la columna CORREO, o hay residentes sin correo)
   • Cuadro "Residentes nuevos": se puede quitar cualquiera (✕)
   • Cuadro "Especialidades nuevas": reemplazar por una existente, o quitar (✕)
   • Filas con problemas (no se agregan)
        │
        ▼  botón "Confirmar nuevos residentes"
 Aviso: "Se agregarán N residentes… Se enviará un correo con el mensaje de bienvenida y
         la clave temporal…"  (⚠ y cuántos no tienen correo)   [Cancelar] [Aceptar]
        │
        ▼  Aceptar
 POST /api/becados/importar/confirmar          ← JSON { residentes: [...] }
        │   La API vuelve a validar todo y crea fichas + cuentas en UNA transacción.
        ▼
 Resultado: "Se agregaron N residentes" (+ cuántos quedaron sin correo)
```

Como la primera llamada no guarda nada, si el admin cancela o cierra la pantalla no queda nada a
medias. Y como la segunda vuelve a validar contra la BD, no importa lo que el cliente mande: un RUT
que se registró entre medio, un correo repetido o un dato mal formado se rechazan.

---

## 2. El archivo Excel

| Columna        | Obligatoria | Qué se hace con ella |
| -------------- | ----------- | -------------------- |
| `NOMBRE`       | Sí          | Nombre completo. Se quitan los espacios de más; se respetan mayúsculas y tildes. Máx. 120 caracteres. |
| `RUT`          | Sí          | Acepta `12.345.678-5`, `12345678-5` o `123456785`. Se normaliza a `12345678-5` y se valida el dígito verificador. |
| `ESPECIALIDAD` | Sí          | Se compara sin distinguir mayúsculas ni tildes con las existentes (ver §4). Máx. 100 caracteres. |
| `CORREO`       | **No**      | Si viene, se guarda en minúsculas. También se reconocen `CORREO ELECTRÓNICO`, `EMAIL`, `E-MAIL` y `MAIL`. |

- **Las demás columnas se ignoran** (N°, año, tutor, observaciones…).
- Los encabezados se buscan **en las primeras 10 filas** de cada hoja, así que puede haber títulos
  arriba. Se usa la primera hoja que tenga las tres columnas obligatorias.
- No importan las mayúsculas ni las tildes de los encabezados (`Especialidad` = `ESPECIALIDAD`).
- Las filas vacías se saltan. Los números de fila que muestra la app son **los de Excel**.
- Límites: **2 MB** por archivo y **500 residentes** por archivo. Si hay más, se divide en varios.

Hay un archivo de ejemplo con datos ficticios en [`ejemplo-residentes.xlsx`](./ejemplo-residentes.xlsx).
Trae casos de prueba: un título arriba, columnas extra, un residente sin correo, un correo inválido,
un RUT con dígito verificador malo y un RUT repetido.

### La columna CORREO todavía no está confirmada

Todo funciona **con o sin** la columna:

- **Si no viene:** la revisión muestra *"⚠ El archivo no trae la columna CORREO: los residentes se
  ingresarán sin correo y no recibirán el mensaje de bienvenida"*.
- **Si viene pero hay residentes sin correo:** se muestra cuántos son, cada uno aparece marcado con
  *"⚠ Sin correo"*, y el aviso de confirmación y el resultado final lo repiten.
- **Correo inválido o repetido en el mismo archivo:** **no bloquea la fila**. El residente se carga
  sin correo y la fila muestra el motivo (por ejemplo, *"Correo inválido en el Excel…"*).
- **Correo que ya usa otra cuenta:** igual que el caso anterior, se carga sin correo y con aviso.

---

## 3. Qué se considera "nuevo", "ya registrado" o "con problemas"

| Caso | Dónde aparece |
| ---- | ------------- |
| RUT que no existe en `becados` ni en `usuarios` | **Residentes nuevos** |
| RUT que ya tiene ficha en `becados` (activa o no) | Contador *"ya estaban registrados"*. Si la ficha está **desactivada**, se nombra aparte; no se vuelve a crear (se reactiva desde Becados). |
| RUT de una cuenta que no es residente (admin, consulta, proveedor) | **Filas con problemas** |
| Falta NOMBRE, RUT o ESPECIALIDAD; RUT inválido; RUT repetido en el archivo; texto demasiado largo | **Filas con problemas** |

---

## 4. Especialidades

Las especialidades **no tienen tabla propia**: son el texto `becados.especialidad`. La lista de
"existentes" es la misma que usa Configuración → Tipos de turno
(`TurnosDisponiblesService.especialidades()`): la de los becados activos más la de los tipos de
turno activos.

- Se comparan **sin mayúsculas, tildes ni espacios de más**. Si el Excel dice `Dermatologia` y ya
  existe `Dermatología`, el residente queda con `Dermatología`, que no cuenta como nueva. Así no se
  duplican especialidades por cómo se escribieron.
- Si una especialidad nueva aparece escrita de varias formas en el archivo, todas quedan con la
  **primera** forma que aparece.
- En el cuadro **Especialidades nuevas**, cada una se puede:
  - **Reemplazar por una existente**: sirve para errores de tipeo. Sus residentes pasan a la
    especialidad elegida y desaparece del cuadro.
  - **Quitar (✕)**: después de una confirmación, **también se quitan de la lista los residentes
    con esa especialidad**, porque un residente no puede quedar sin especialidad.
- El cuadro se recalcula solo: si se quitan todos los residentes de una especialidad nueva, la
  especialidad desaparece.
- Una especialidad nueva "existe" desde el momento en que se crea el primer residente que la tiene.

---

## 5. Qué se crea al confirmar

En **una sola transacción** (si algo falla, no se crea nada):

1. Una **ficha** en `becados` por residente: `rut`, `nombre`, `especialidad`, `activo = true`.
2. Una **cuenta** en `usuarios` por residente:
   - `rut` igual al de la ficha, `rol = residente` y `becadoId` = la ficha;
   - `email` = el correo, o `null`;
   - `passwordHash = '!pendiente'` (`CLAVE_PENDIENTE`): la cuenta **todavía no tiene contraseña** y
     no puede iniciar sesión;
   - `debeCambiarClave = true`, para obligar a cambiar la clave temporal en el primer ingreso.

La respuesta es `{ creados, sinCorreo, correosEnviados: 0, residentes: [...] }`.

> **¿Por qué sin contraseña y no con una clave temporal desde ya?** Porque la clave temporal debe
> llegar por correo, y eso aún no está implementado. Generar claves que nadie recibe no sirve, y
> mostrarlas en pantalla obligaría a repartirlas a mano. Mientras tanto, el admin puede asignar una
> contraseña con `PATCH /api/usuarios/:id { "password": "..." }`. Además, el login trata
> `!pendiente` como "nunca coincide" y responde en el mismo tiempo que con una clave incorrecta
> (ver `auth.service.ts`).

---

## 6. API

Las dos rutas son **solo para el admin**: sin token responden 401 y con otro rol, 403.

### `POST /api/becados/importar/vista-previa`

- `multipart/form-data` con el campo **`archivo`**. Límite de 20 llamadas por minuto.
- Responde `200`:

```jsonc
{
  "hoja": "Residentes",
  "tieneColumnaCorreo": true,
  "totalFilas": 7,
  "nuevos": [
    { "fila": 4, "rut": "19876543-0", "nombre": "Camila …", "especialidad": "PEDIATRÍA",
      "correo": "camila@…", "especialidadNueva": false },
    { "fila": 7, "rut": "19234567-7", "nombre": "Benjamín …", "especialidad": "Cirugia General",
      "correo": null, "especialidadNueva": true,
      "aviso": "Correo inválido en el Excel (\"benjamin.castro@ejemplo\"): se ingresará sin correo" }
  ],
  "especialidadesNuevas": [{ "nombre": "Cirugia General", "residentes": 1 }],
  "especialidadesExistentes": ["Dermatología", "PEDIATRÍA"],
  "yaRegistrados": { "total": 2, "inactivos": [{ "rut": "7654321-6", "nombre": "Ana Rojas" }] },
  "errores": [{ "fila": 9, "motivo": "RUT inválido: \"12.345.678-0\"" }]
}
```

- `400` si:
  - no se adjuntó archivo;
  - la extensión no es `.xlsx`, `.xls` o `.csv`;
  - no se pudo leer el archivo;
  - faltan columnas obligatorias;
  - hay más de 500 residentes.
- `413` si el archivo pesa más de 2 MB.

### `POST /api/becados/importar/confirmar`

- JSON `{ "residentes": [{ "rut", "nombre", "especialidad", "correo"? }] }`, entre 1 y 500
  residentes. Límite de 10 llamadas por minuto.
- Se rechazan los campos extra, como `fila`: el cliente manda solo esos cuatro.
- Responde `201` con `{ creados, sinCorreo, correosEnviados, residentes }`.
- `400` si hay datos inválidos o un RUT o correo repetido dentro de la lista.
- `409` si algún RUT ya está registrado o algún correo ya lo usa otra cuenta. En ese caso no se
  crea ninguno y hay que volver a cargar el archivo.

---

## 7. Librerías

| Dónde | Librería | Para qué |
| ----- | -------- | -------- |
| API | **SheetJS** (`xlsx` 0.20.3) | Leer `.xlsx`, `.xls` y `.csv`. |
| API | **Multer** (incluido en `@nestjs/platform-express`, vía `FileInterceptor`) | Recibir el archivo, solo en memoria (nunca se escribe en disco). |
| Móvil | **expo-document-picker** (SDK 57) | Elegir el archivo desde Archivos, Drive, Descargas o adjuntos. Viene incluido en Expo Go. |
| Web | *(ninguna)* | `<input type="file">` con arrastrar y soltar, `FormData` y `<dialog>` para el aviso. |

**Importante sobre SheetJS:** el paquete `xlsx` de **npm está abandonado en la 0.18.5** y tiene
vulnerabilidades conocidas: contaminación de prototipo (CVE-2023-30533) y ReDoS (CVE-2024-22363).
Por eso se instala **desde el sitio oficial**:

```bash
pnpm --filter api add https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz
```

Para actualizarlo, revisa la última versión en <https://cdn.sheetjs.com/> y cambia la URL en
`apps/api/package.json`. **No** hagas `pnpm add xlsx`, porque instalaría la versión vieja de npm.

La lectura del Excel se hace **solo en la API**: hay un único lector para la web y el móvil, el
móvil no necesita librerías de Excel y la validación siempre ocurre en el servidor.

### Medidas de seguridad

- Solo el admin. Archivo máximo de **2 MB**, un archivo por petición, guardado solo en memoria.
- SheetJS lee **como máximo 511 filas** (`sheetRows`) y sin fórmulas, HTML ni estilos.
- Todo lo que viene del Excel se trata como texto. Los valores se validan uno por uno: RUT con
  dígito verificador, correo con `isEmail` y largo máximo en cada campo.
- La confirmación vuelve a validar todo y usa una transacción. Además, la BD tiene RUT y correo
  **únicos**, lo que la protege si dos admins cargan a la vez.
- Los logs solo registran cantidades, no datos personales.

---

## 8. Archivos

**API** (`apps/api`):

| Archivo | Qué hace |
| ------- | -------- |
| `src/importacion/excel.ts` | Lector del Excel (función pura): busca los encabezados, limpia, valida y lista errores por fila. |
| `src/importacion/importacion.service.ts` | Vista previa (compara con la BD) y confirmación (transacción). |
| `src/importacion/importacion.controller.ts` | Las dos rutas, con `FileInterceptor`, límites y roles. |
| `src/importacion/dto/importacion.dto.ts` | Validación del JSON de confirmación. |
| `src/importacion/excel.spec.ts` | 6 tests unitarios del lector. |
| `test/importacion.e2e-spec.ts` | 5 tests e2e: vista previa, archivos inválidos, confirmación, todo o nada, permisos. |
| `src/auth/usuario.entity.ts` | Columnas nuevas `email` (única, opcional) y `debeCambiarClave`, y la constante `CLAVE_PENDIENTE`. |
| `src/migrations/correoUsuarios.ts` | Migración de esas columnas para producción (idempotente). |
| `src/auth/auth.service.ts` | Una cuenta con `CLAVE_PENDIENTE` no puede iniciar sesión, en tiempo constante. |

**Web** (`apps/web/src`):

| Archivo | Qué hace |
| ------- | -------- |
| `pages/Admin/Usuarios/Usuarios.tsx` | Pantalla *Administrar usuarios* con la opción *Agregar residentes nuevos*. |
| `pages/Admin/Usuarios/ImportarResidentes.tsx` | Flujo completo: elegir, revisar, confirmar y resultado. |
| `pages/Admin/Usuarios/importacion.service.ts` | Llamadas a la API y cálculo de las especialidades nuevas. |
| `pages/Admin/Usuarios/importacion.types.ts` | Tipos de las respuestas. |
| `pages/Admin/Usuarios/Usuarios.css` | Estilos. |
| `App.tsx`, `pages/Admin/Dashboard/AdminDashboard.tsx` | Ruta `/admin/usuarios` y entrada del menú, solo para el admin. |
| `utils/api.ts` | `api()` acepta `FormData`. |
| `utils/roles.ts` | Constante `SOLO_ADMIN`. |

**Móvil** (`apps/mobile/src`):

| Archivo | Qué hace |
| ------- | -------- |
| `app/admin/usuarios.tsx` | Pantalla *Administrar usuarios*. |
| `app/admin/importarResidentes.tsx` | Flujo completo. El aviso usa `Alert` con Cancelar/Aceptar, o `window.confirm` en Expo web. |
| `services/importacion.service.ts` | Selector de archivos, subida (`{ uri, name, type }` en nativo; `File` en web) y llamadas a la API. |
| `constants/menus.ts`, `components/Sidebar/Sidebar.tsx` | Opción *Usuarios* en el menú, filtrada por rol. |
| `api.ts` | `peticion()` acepta `FormData`. |

---

## 9. Probarlo

```bash
# Tests
pnpm --filter api test                                                    # unitarios
docker compose -f apps/docker-compose.yml --profile test up -d db_test
pnpm --filter api test:e2e                                                # e2e

# A mano (API corriendo, $TOKEN de un admin)
curl -X POST http://localhost:3000/api/becados/importar/vista-previa \
  -H "Authorization: Bearer $TOKEN" \
  -F "archivo=@apps/api/src/importacion/ejemplo-residentes.xlsx"
```

Con la base de desarrollo en `DB_SYNC=true`, las columnas nuevas de `usuarios` se crean solas al
arrancar. En producción (`DB_MIGRAR=true`) las crea la migración `CorreoUsuarios1795132800000`.

---

## 10. Qué queda implementado y qué falta

### ✅ Implementado

- Pantalla **Administrar usuarios** con **Agregar residentes nuevos**, en la web y el móvil (solo
  admin).
- Lectura de `.xlsx`, `.xls` y `.csv`:
  - columnas NOMBRE, RUT y ESPECIALIDAD, y CORREO opcional;
  - encabezados en cualquier posición de las primeras 10 filas;
  - columnas extra ignoradas.
- Comparación con la BD: muestra **solo los residentes nuevos** y **solo las especialidades
  nuevas**.
- Quitar residentes. Quitar especialidades nuevas (junto con sus residentes) o reemplazarlas por una
  existente.
- **Alertas por falta de correo**: sin columna CORREO, residentes sin correo, y correos inválidos,
  repetidos o ya usados.
- Botón **Confirmar nuevos residentes** con el aviso de bienvenida y clave temporal, y los botones
  **Aceptar** y **Cancelar**.
- Creación de fichas y cuentas en una transacción, con nueva validación en el servidor.
- Columnas `usuarios.email` y `usuarios.debeCambiarClave`, con su migración.
- Tests unitarios y e2e, y un Excel de ejemplo.

### ⏳ Falta

1. **Enviar el correo de bienvenida con la clave temporal.** El módulo de correo ya existe
   (`src/correo/`, con la plantilla `invitacion`). Para conectarlo:
   - en `ImportacionService.confirmar()`, **después** del commit, por cada residente con correo:
     generar una clave temporal aleatoria, guardarla con `bcrypt.hash` (cambiando
     `CLAVE_PENDIENTE` por el hash) y llamar a `CorreoService`;
   - es mejor que los envíos vayan **fuera de la petición** (en una cola o en segundo plano), porque
     con 500 residentes el bcrypt (~250 ms por clave) más el SMTP tardarían minutos; y un fallo de
     envío no debe deshacer la creación de las cuentas;
   - devolver `correosEnviados` real y cambiar `CORREO_BIENVENIDA_HABILITADO = true` en
     `apps/web/src/pages/Admin/Usuarios/importacion.service.ts` y
     `apps/mobile/src/services/importacion.service.ts`, para quitar el aviso de "envío pendiente";
   - **alternativa más segura**: en vez de mandar la clave por correo, mandar un **enlace de un solo
     uso** para crear la contraseña. Requiere una tabla de tokens y una pantalla nueva.
2. **Obligar a cambiar la clave en el primer ingreso:**
   - que `POST /auth/login` devuelva `debeCambiarClave`;
   - crear un endpoint `POST /auth/cambiar-clave`;
   - en la web y el móvil, llevar a una pantalla de cambio de clave cuando venga en `true`.
3. **Registrar o editar el correo** de un residente que quedó sin él: hoy `PATCH /usuarios/:id` no
   acepta `email`. Agregarlo al DTO, junto con un botón *Reenviar bienvenida*.
4. **Reactivar desde la carga** a los residentes desactivados que vuelven a aparecer en el Excel.
   Hoy solo se informan.
5. **Actualizar datos de residentes existentes** (nombre, especialidad o correo distintos en el
   Excel). Hoy los registrados se ignoran.
6. **Resto de *Administrar usuarios***: listar cuentas, crear proveedores y usuarios de consulta,
   desactivar, restablecer contraseña.
7. **Tabla de especialidades** (opcional): si se quiere un catálogo controlado en vez de texto
   libre.
8. **Plantilla descargable** del Excel desde la propia pantalla.
