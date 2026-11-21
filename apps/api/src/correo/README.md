# Módulo de correo

Envío de correos de la API **sin depender de un proveedor**. El resto del código solo usa
`CorreoService`; qué servicio envía de verdad (Brevo, Resend, el correo de la UCN…) se decide con
variables de entorno. Cambiar de proveedor = cambiar el `.env` y el DNS del dominio, sin tocar código.

> **Estado (noviembre 2026):** el módulo está listo y probado (envío real por SMTP verificado con
> Mailpit). Todavía **no se usa** en ningún flujo: los usuarios no tienen correo guardado. Ver
> [Próximos pasos](#próximos-pasos-para-usarlo-de-verdad).

## Índice

1. [Cómo funciona](#cómo-funciona)
2. [Variables de entorno](#variables-de-entorno)
3. [Probar en desarrollo](#probar-en-desarrollo)
4. [Procedimiento para usar un servicio real](#procedimiento-para-usar-un-servicio-real)
5. [Opciones de proveedor](#opciones-de-proveedor)
6. [Si el hosting bloquea SMTP: enviar por API HTTP](#si-el-hosting-bloquea-smtp-enviar-por-api-http)
7. [Agregar una plantilla nueva](#agregar-una-plantilla-nueva)
8. [Próximos pasos para usarlo de verdad](#próximos-pasos-para-usarlo-de-verdad)

---

## Cómo funciona

```
correo/
  correo.module.ts        registra el módulo; elige la implementación de envío al arrancar
  correo.service.ts       ← lo único que usa el resto de la API
  correo.controller.ts    POST /api/correo/prueba (solo admin)
  correo.config.ts        lee y valida las variables CORREO_* y SMTP_*
  ocultar.ts              "juan.perez@ucn.cl" -> "ju***@ucn.cl" para los logs
  envio/
    envio.ts              interfaz Envio: enviar({ para, asunto, html, texto })
    smtp.envio.ts         envío real por SMTP (nodemailer): sirve para casi cualquier proveedor
    consola.envio.ts      no envía: lo escribe en el log (modo por defecto)
    memoria.envio.ts      no envía: lo guarda para revisarlo en los tests
  plantillas/
    base.ts               diseño común (encabezado, colores de la app, pie)
    escapar.ts            limpia los datos del usuario antes de meterlos al HTML
    invitacion.ts         "Te damos la bienvenida a ResiBreak" (crear contraseña)
    recuperacion.ts       "Restablece tu contraseña"
    prueba.ts             correo para comprobar la configuración
  correo.spec.ts          tests unitarios
```

**Usarlo desde otro módulo:**

```ts
// en el módulo:      imports: [CorreoModule]
// en el servicio:
constructor(private readonly correo: CorreoService) {}

await this.correo.enviarInvitacion('ana@ucn.cl', {
  nombre: 'Ana Soto',
  enlace: `${this.correo.urlApp}/activar/${token}`,
  venceEnHoras: 72,
});
```

- Si el proveedor falla, `CorreoService` registra el error en el log (con el correo oculto) y
  lanza `503 Service Unavailable` con un mensaje genérico.
- Cada correo se envía en **HTML y en texto plano**.
- Las plantillas son funciones de TypeScript: si falta un dato, el compilador avisa. Todo dato del
  usuario pasa por `escapar()`.
- **Nunca** se envían contraseñas por correo: solo enlaces o códigos de un solo uso que vencen.

## Variables de entorno

En `apps/api/.env` (local) o en las variables del hosting (producción). **Nunca en git.**

| Variable | Ejemplo | Para qué |
|---|---|---|
| `CORREO_PROVEEDOR` | `smtp` | `smtp` = envía de verdad · `consola` = solo registra (por defecto) · `memoria` = tests |
| `SMTP_HOST` | `smtp-relay.brevo.com` | Servidor SMTP del proveedor |
| `SMTP_PORT` | `587` | `465` (TLS directo), `587` o `2525` (STARTTLS), `1025` (Mailpit) |
| `SMTP_USER` | `...` | Usuario SMTP (lo entrega el proveedor). Vacío solo con Mailpit |
| `SMTP_PASS` | `...` | Clave SMTP o API key del proveedor |
| `CORREO_REMITENTE` | `"ResiBreak <no-responder@resibreak.cl>"` | Remitente. Debe estar verificado en el proveedor |
| `CORREO_URL_APP` | `https://app.resibreak.cl` | URL pública de la app, para armar los enlaces |

La API **no arranca** si `CORREO_PROVEEDOR=smtp` y falta alguna variable (lo valida
`env.validation.ts`, igual que `JWT_SECRET`). Sin configurar, arranca en modo `consola`; en
producción avisa en el log que los correos no se están enviando.

## Probar en desarrollo

**Opción 1 — modo consola (sin instalar nada).** Es el modo por defecto: cada correo aparece en el
log de la API con su texto (útil para copiar un enlace de invitación).

**Opción 2 — Mailpit (ver los correos como los vería el usuario).** Mailpit es un buzón local que
recibe todo lo que envía la API y no le manda nada a nadie.

```powershell
# 1. Levantar Mailpit (desde la raíz del repo)
docker compose -f apps/docker-compose.yml --profile correo up -d mailpit

# 2. En apps/api/.env
CORREO_PROVEEDOR=smtp
SMTP_HOST=127.0.0.1
SMTP_PORT=1025
CORREO_REMITENTE="ResiBreak <no-responder@resibreak.cl>"

# 3. Reiniciar la API (el modo --watch no relee el .env) y enviar un correo de prueba:
#    POST /api/correo/prueba  { "para": "cualquiera@ejemplo.cl" }  con token de admin

# 4. Ver la bandeja en http://localhost:8025
```

**Tests:** los e2e usan `CORREO_PROVEEDOR=memoria` (lo fija `test/setup-env.ts`), así que nunca
envían correos reales. `test/correo.e2e-spec.ts` muestra cómo revisar lo que se habría enviado.

---

## Procedimiento para usar un servicio real

### 1. Elegir el proveedor

Ver [Opciones de proveedor](#opciones-de-proveedor). Para ResiBreak (~150 usuarios, pocos correos
al mes, muchas invitaciones juntas al inicio de cada año) alcanza cualquier plan gratuito.

### 2. Tener un dominio y definir el remitente

Para enviar a cualquier destinatario, todos los proveedores exigen enviar **desde un dominio
verificado**, por ejemplo `no-responder@resibreak.cl`.

- Comprar un dominio (un `.cl` en NIC Chile cuesta unos pocos miles de pesos al año), **o**
- pedir a TI de la UCN un subdominio (ej. `resibreak.ucn.cl`) o un buzón institucional (ver la
  opción [Correo institucional UCN](#correo-institucional-ucn)).

### 3. Verificar el dominio en el proveedor (DNS)

El proveedor muestra unos registros que hay que agregar en el panel DNS del dominio. Sin ellos,
Gmail y Outlook mandan los correos a spam o los rechazan.

| Registro | Tipo | Para qué |
|---|---|---|
| **SPF** | `TXT` en el dominio, ej. `v=spf1 include:spf.brevo.com ~all` | Autoriza al proveedor a enviar a nombre del dominio |
| **DKIM** | `TXT` o `CNAME` (los entrega el proveedor) | Firma cada correo para probar que no fue alterado |
| **DMARC** | `TXT` en `_dmarc.dominio`, ej. `v=DMARC1; p=none; rua=mailto:admin@resibreak.cl` | Indica qué hacer con correos que fallan SPF/DKIM. Gmail lo exige a quienes envían |

- Si el dominio ya tiene un SPF, **no se crea otro**: se agrega el `include:` del proveedor al
  existente (solo puede haber un registro SPF).
- Los cambios de DNS pueden tardar desde minutos hasta 24-48 h. El panel del proveedor indica
  cuándo el dominio quedó verificado.
- Al **cambiar de proveedor** hay que agregar los registros del nuevo (y quitar los del anterior).

### 4. Obtener las credenciales SMTP

En el panel del proveedor se genera un usuario y una clave SMTP (o una API key que sirve de clave).
Conviene crear una credencial **solo para ResiBreak**, para poder revocarla sin afectar otras cosas.
Guardarla como secreto en el hosting; **nunca** en git ni en el `.env.example`.

### 5. Configurar las variables en producción

En el hosting (por ejemplo, Render → servicio de la API → *Environment*):

```env
CORREO_PROVEEDOR=smtp
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_USER=xxxxxx@smtp-brevo.com
SMTP_PASS=xsmtpsib-xxxxxxxx
CORREO_REMITENTE="ResiBreak <no-responder@resibreak.cl>"
CORREO_URL_APP=https://app.resibreak.cl
```

y redesplegar la API.

### 6. Comprobar

1. Con un token de admin, enviar un correo de prueba:

   ```powershell
   curl -X POST https://api.resibreak.cl/api/correo/prueba `
        -H "Authorization: Bearer <token-admin>" -H "Content-Type: application/json" `
        -d '{"para":"tu-correo@gmail.com"}'
   ```

   Respuesta esperada: `{"enviado":true,"proveedor":"smtp"}`. Si responde `503`, el log de la API
   dice la causa (credenciales, puerto bloqueado, remitente no verificado…).
2. Revisar que llegue a la **bandeja de entrada** (no a spam) en Gmail y en Outlook.
3. En Gmail, abrir el correo → *Mostrar original*: SPF, DKIM y DMARC deben decir **PASS**.

### 7. Tener en cuenta en el día a día

- **Límites de envío:** cada plan tiene un máximo diario (ver tabla). Las invitaciones masivas del
  inicio de año conviene enviarlas de a poco o escoger un plan con margen.
- **Rebotes y spam:** el panel del proveedor muestra los correos rebotados (direcciones mal
  escritas). Revisarlo de vez en cuando.
- **Hosting:** el plan **gratuito de Render bloquea SMTP** (puertos 25, 465 y 587) desde septiembre
  de 2025; en los planes pagados 465 y 587 funcionan. Varios VPS también bloquean SMTP por defecto.
  Si el hosting lo bloquea, ver [enviar por API HTTP](#si-el-hosting-bloquea-smtp-enviar-por-api-http).

---

## Opciones de proveedor

Precios y planes revisados en noviembre de 2026: **cambian seguido, confirmar en la página
oficial antes de elegir.** Todos aceptan SMTP, así que funcionan con este módulo sin cambiar código.

| Proveedor | Plan gratuito | Pagado desde | `SMTP_HOST` / `SMTP_PORT` | `SMTP_USER` / `SMTP_PASS` |
|---|---|---|---|---|
| **Brevo** (ex Sendinblue) | 300 correos/día, sin vencimiento (agrega "Sent with Brevo") | ~US$9/mes | `smtp-relay.brevo.com` / `587` | Login y clave SMTP del panel (*SMTP & API*) |
| **Resend** | 3.000/mes, máx. 100/día, 1 dominio | ~US$20/mes | `smtp.resend.com` / `465` | `resend` / una API key |
| **Amazon SES** | Sin plan gratuito para cuentas nuevas desde 2026 (verificar) | US$0,10 por 1.000 correos | `email-smtp.<región>.amazonaws.com` / `587` | Credenciales SMTP generadas en la consola de SES (no son las claves IAM normales) |
| **Postmark** | 100/mes, solo para pruebas | ~US$15/mes | `smtp.postmarkapp.com` / `587` | El *Server API token* como usuario y clave |
| **Mailgun** | ~100/día (según el plan vigente) | ~US$15–35/mes | `smtp.mailgun.org` / `587` | `postmaster@<dominio>` / clave SMTP |
| **Correo institucional UCN** | Gratis (lo provee la universidad) | — | Depende de la plataforma (ver abajo) | Buzón dedicado entregado por TI |

**Notas por proveedor**

- **Brevo:** el límite de 300 por día es el más holgado de los gratuitos; ideal para las
  invitaciones del inicio de año.
- **Resend:** el más simple de configurar y muy usado con Node. El tope de 100 por día puede
  quedarse corto el día de las invitaciones masivas.
- **Amazon SES:** el más barato por volumen, pero hay que pedir salir del "modo sandbox" (al
  principio solo envía a direcciones verificadas) y manejar la consola de AWS.
- **Postmark:** muy buena entrega en la bandeja de entrada, pero es de pago para producción.

### Correo institucional UCN

Enviar desde una cuenta `@ucn.cl` (por ejemplo `resibreak@ucn.cl`). Ventajas: es gratis y los
residentes confían en un remitente de la universidad. Desventajas: **depende de TI** y estas
plataformas no están pensadas para sistemas automáticos (tienen límites por buzón).

**Lo primero es preguntar a TI** si la UCN usa Microsoft 365 o Google Workspace, y pedir un buzón
**dedicado** para la aplicación (no la cuenta personal de nadie).

**Si es Microsoft 365 (Exchange Online):**

```env
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_USER=resibreak@ucn.cl
SMTP_PASS=<clave del buzón>
CORREO_REMITENTE="ResiBreak <resibreak@ucn.cl>"
```

- TI debe habilitar **"SMTP autenticado" (SMTP AUTH)** para ese buzón; suele venir desactivado.
- El buzón no puede tener verificación en dos pasos obligatoria para este tipo de acceso.
- **Importante:** Microsoft desactivará por defecto el SMTP con usuario y contraseña a fines de
  **diciembre de 2026** (TI podrá reactivarlo por un tiempo; la fecha de retiro definitivo se
  anunciará en 2027). A largo plazo hay que usar **OAuth2**: registrar la aplicación en Entra ID
  (Azure AD) y cambiar `auth` en `smtp.envio.ts` a `{ type: 'OAuth2', ... }` (nodemailer lo
  soporta). Alternativas de Microsoft: *Azure Communication Services Email* o *High Volume Email*.

**Si es Google Workspace:**

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=resibreak@ucn.cl
SMTP_PASS=<contraseña de aplicación de 16 caracteres>
CORREO_REMITENTE="ResiBreak <resibreak@ucn.cl>"
```

- La cuenta necesita la **verificación en dos pasos** activada para poder crear una *contraseña de
  aplicación* (y el administrador de Workspace debe permitirlas).
- Alternativa: que TI configure el **servicio de retransmisión SMTP** de Workspace
  (`smtp-relay.gmail.com`) para la aplicación.

En ambos casos: los SPF/DKIM del dominio `ucn.cl` ya los administra TI, así que no hay que
configurar DNS; a cambio, cualquier cambio pasa por ellos.

### Recomendación

1. **Si TI de la UCN facilita un buzón dedicado:** correo institucional (gratis y con remitente
   `@ucn.cl`), considerando el cambio de Microsoft de diciembre de 2026.
2. **Si no:** **Brevo** con el plan gratuito y un dominio propio. Si más adelante se prefiere otro,
   se cambia el `.env` y el DNS.

---

## Si el hosting bloquea SMTP: enviar por API HTTP

Si no se puede usar SMTP (por ejemplo, el plan gratuito de Render), se agrega una implementación
que use la API HTTP del proveedor. Ejemplo con Resend:

```ts
// envio/resend.envio.ts
import type { Envio, Mensaje } from './envio.js';

export class ResendEnvio implements Envio {
  readonly nombre = 'resend';
  constructor(private readonly apiKey: string, private readonly remitente: string) {}

  async enviar(m: Mensaje): Promise<void> {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: this.remitente, to: m.para, subject: m.asunto, html: m.html, text: m.texto }),
    });
    if (!res.ok) throw new Error(`Resend respondió ${res.status}: ${await res.text()}`);
  }
}
```

y en `correo.config.ts`: agregar `'resend'` a `PROVEEDORES_CORREO`, validar su variable (ej.
`RESEND_API_KEY`) y crearlo en `crearEnvio()`. El resto de la API no cambia. Brevo tiene una API
equivalente (`https://api.brevo.com/v3/smtp/email`).

## Agregar una plantilla nueva

1. Crear `plantillas/<nombre>.ts` con una función que reciba los datos y devuelva
   `{ asunto, html, texto }`, usando `base()`, `parrafo()`, `boton()` y `textoPlano()`.
2. Pasar **todo dato variable** por `escapar()` (los enlaces de `boton()` ya se validan).
3. Agregar un método en `CorreoService` (ej. `enviarAvisoCancelacion(para, datos)`).
4. Agregar un test en `correo.spec.ts` y revisarla en Mailpit.

Recomendaciones de diseño: estilos en línea, tablas en vez de `div` con CSS, ancho máximo 600 px,
imágenes con URL absoluta (no adjuntas) y siempre versión en texto plano.

## Próximos pasos para usarlo de verdad

El módulo envía correos, pero ningún flujo lo usa todavía. Para las invitaciones y la recuperación
de contraseña falta:

1. **Correo en los usuarios:** columna `email` en `Usuario` (única, en minúsculas, opcional al
   principio porque los usuarios actuales no lo tienen), su migración y el campo en los DTOs.
2. **Códigos de un solo uso:** tabla para los enlaces de invitación/recuperación (guardados
   cifrados, con vencimiento y marca de "usado").
3. **Endpoints:** crear cuenta con invitación, "olvidé mi contraseña" (siempre la misma respuesta,
   para no revelar qué correos existen) y "elegir contraseña con el código".
4. **Pantallas:** campo correo en *Administrar usuarios*, "¿Olvidaste tu contraseña?" en el login y
   la pantalla para elegir la contraseña desde el enlace.

---

**Fuentes (noviembre 2026):**
[Resend – pricing](https://resend.com/pricing) ·
[Resend – límites](https://resend.com/docs/knowledge-base/account-quotas-and-limits) ·
[Brevo – SMTP gratuito](https://www.brevo.com/es/servidor-smtp-gratis/) ·
[Brevo – límites del plan gratuito](https://help.brevo.com/hc/en-us/articles/208580669) ·
[Amazon SES – pricing](https://aws.amazon.com/ses/pricing/) ·
[Render – bloqueo SMTP en plan gratuito](https://render.com/changelog/free-web-services-will-no-longer-allow-outbound-traffic-to-smtp-ports) ·
[Microsoft – nuevo calendario de retiro de SMTP AUTH básico](https://techcommunity.microsoft.com/blog/Exchange/updated-exchange-online-smtp-auth-basic-authentication-deprecation-timeline/4489835) ·
[Comparativa de planes gratuitos 2026](https://markrelay.com/research/free-transactional-email-api-plans-compared)
