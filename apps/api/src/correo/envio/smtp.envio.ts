import nodemailer, { type Transporter } from 'nodemailer';
import type { Envio, Mensaje } from './envio.js';

export interface OpcionesSmtp {
  host: string;
  puerto: number;
  usuario: string;
  clave: string;
  /** "ResiBreak <no-responder@resibreak.cl>". Debe estar verificado en el proveedor. */
  remitente: string;
}

/**
 * Envío por SMTP con nodemailer. Sirve para casi cualquier proveedor (Brevo, Resend, Amazon SES,
 * Mailgun, Postmark, correo institucional, Mailpit en desarrollo...): solo cambian las variables.
 *
 * Puerto 465 = TLS desde el inicio. Puerto 587 (o 2525) = STARTTLS: la conexión empieza sin cifrar
 * y se cifra antes de enviar la contraseña; `requireTLS` impide seguir si el servidor no lo ofrece.
 * Puerto 1025 = Mailpit local (sin cifrado ni contraseña).
 */
export class SmtpEnvio implements Envio {
  readonly nombre = 'smtp';
  private readonly transporte: Transporter;

  constructor(private readonly opciones: OpcionesSmtp) {
    const local = opciones.puerto === 1025; // Mailpit
    this.transporte = nodemailer.createTransport({
      host: opciones.host,
      port: opciones.puerto,
      secure: opciones.puerto === 465,
      requireTLS: !local && opciones.puerto !== 465,
      auth: opciones.usuario ? { user: opciones.usuario, pass: opciones.clave } : undefined,
      // Que una caída del proveedor no deje colgadas las peticiones de la API.
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 20_000,
    });
  }

  async enviar(m: Mensaje): Promise<void> {
    await this.transporte.sendMail({
      from: this.opciones.remitente,
      to: m.para,
      subject: m.asunto,
      html: m.html,
      text: m.texto,
    });
  }

  async verificar(): Promise<void> {
    await this.transporte.verify();
  }
}
