import { ServiceUnavailableException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { crearEnvio, validarConfigCorreo } from './correo.config.js';
import { CorreoService } from './correo.service.js';
import { ConsolaEnvio } from './envio/consola.envio.js';
import { MemoriaEnvio } from './envio/memoria.envio.js';
import { SmtpEnvio } from './envio/smtp.envio.js';
import { ocultarCorreo } from './ocultar.js';
import { enlaceSeguro, escapar } from './plantillas/escapar.js';
import { invitacion } from './plantillas/invitacion.js';
import { recuperacion } from './plantillas/recuperacion.js';

const SMTP_OK = {
  CORREO_PROVEEDOR: 'smtp',
  SMTP_HOST: 'smtp-relay.brevo.com',
  SMTP_PORT: '587',
  SMTP_USER: 'usuario',
  SMTP_PASS: 'clave',
  CORREO_REMITENTE: 'ResiBreak <no-responder@resibreak.cl>',
};

describe('plantillas de correo', () => {
  it('escapa el HTML y descarta enlaces que no son http(s)', () => {
    expect(escapar(`<b>"Ana" & 'Luis'</b>`)).toBe('&lt;b&gt;&quot;Ana&quot; &amp; &#39;Luis&#39;&lt;/b&gt;');
    expect(enlaceSeguro('https://app.resibreak.cl/x?a=1&b=2')).toBe('https://app.resibreak.cl/x?a=1&amp;b=2');
    expect(enlaceSeguro('javascript:alert(1)')).toBe('#');
  });

  it('la invitación escapa el nombre y lleva el enlace en HTML y en texto plano', () => {
    const c = invitacion({ nombre: '<script>x</script>', enlace: 'https://app.resibreak.cl/activar/abc', venceEnHoras: 72 });
    expect(c.asunto).toBe('Te damos la bienvenida a ResiBreak');
    expect(c.html).not.toContain('<script>');
    expect(c.html).toContain('&lt;script&gt;');
    expect(c.html).toContain('href="https://app.resibreak.cl/activar/abc"');
    expect(c.texto).toContain('https://app.resibreak.cl/activar/abc');
    expect(c.texto).toContain('72 horas');
  });

  it('la recuperación indica el vencimiento y nunca incluye una contraseña', () => {
    const c = recuperacion({ nombre: 'Ana', enlace: 'https://app.resibreak.cl/restablecer/xyz', venceEnMinutos: 30 });
    expect(c.texto).toContain('30 minutos');
    expect(c.html.toLowerCase()).not.toMatch(/tu contraseña es/);
  });
});

describe('configuración del correo', () => {
  it('sin configurar usa "consola" y no exige nada', () => {
    expect(validarConfigCorreo({})).toEqual([]);
    expect(crearEnvio({})).toBeInstanceOf(ConsolaEnvio);
  });

  it('con smtp exige servidor, puerto, usuario, clave y remitente', () => {
    expect(validarConfigCorreo(SMTP_OK)).toEqual([]);
    expect(crearEnvio(SMTP_OK)).toBeInstanceOf(SmtpEnvio);
    expect(validarConfigCorreo({ CORREO_PROVEEDOR: 'smtp' })[0]).toMatch(/SMTP_HOST, SMTP_PORT, CORREO_REMITENTE, SMTP_USER, SMTP_PASS/);
  });

  it('Mailpit (puerto 1025) no necesita usuario ni clave', () => {
    const mailpit = { CORREO_PROVEEDOR: 'smtp', SMTP_HOST: 'localhost', SMTP_PORT: '1025', CORREO_REMITENTE: 'a@b.cl' };
    expect(validarConfigCorreo(mailpit)).toEqual([]);
  });

  it('rechaza valores inválidos', () => {
    expect(validarConfigCorreo({ CORREO_PROVEEDOR: 'sendgrid' })[0]).toMatch(/CORREO_PROVEEDOR/);
    expect(validarConfigCorreo({ ...SMTP_OK, SMTP_PORT: 'abc' })).toContainEqual(expect.stringMatching(/SMTP_PORT/));
    expect(validarConfigCorreo({ ...SMTP_OK, CORREO_REMITENTE: 'ResiBreak' })).toContainEqual(expect.stringMatching(/CORREO_REMITENTE/));
    expect(validarConfigCorreo({ CORREO_URL_APP: 'app.resibreak.cl' })[0]).toMatch(/CORREO_URL_APP/);
  });
});

describe('CorreoService', () => {
  const config = { get: () => undefined } as unknown as ConfigService;

  it('envía con la implementación activa', async () => {
    const memoria = new MemoriaEnvio();
    const correo = new CorreoService(memoria, config);
    await correo.enviarInvitacion('ana@ucn.cl', { nombre: 'Ana', enlace: 'https://x.cl/a', venceEnHoras: 48 });
    expect(memoria.enviados).toHaveLength(1);
    expect(memoria.enviados[0]).toMatchObject({ para: 'ana@ucn.cl', asunto: 'Te damos la bienvenida a ResiBreak' });
  });

  it('si el proveedor falla, responde 503 sin detalles internos', async () => {
    const memoria = new MemoriaEnvio();
    memoria.fallarCon = new Error('535 Authentication failed');
    const correo = new CorreoService(memoria, config);
    await expect(correo.enviarPrueba('ana@ucn.cl')).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('en los logs, el correo se muestra oculto', () => {
    expect(ocultarCorreo('juan.perez@ucn.cl')).toBe('ju***@ucn.cl');
    expect(ocultarCorreo('sin-arroba')).toBe('***');
  });
});
