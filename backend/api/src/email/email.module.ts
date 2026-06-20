import { Module, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

export interface MailAttachment {
  filename: string;
  content: Buffer;
  contentType?: string;
}

export interface SendMailInput {
  to: string;
  subject: string;
  html: string;
  attachments?: MailAttachment[];
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor(private readonly config: ConfigService) {
    const user = this.config.get<string>('SMTP_USER');
    const pass = this.config.get<string>('SMTP_PASS');
    if (user && pass) {
      this.transporter = nodemailer.createTransport({
        host: this.config.get<string>('SMTP_HOST', 'smtp.gmail.com'),
        port: Number(this.config.get<string>('SMTP_PORT', '465')),
        secure: Number(this.config.get<string>('SMTP_PORT', '465')) === 465,
        auth: { user, pass },
      });
      this.logger.log('Email configurado (SMTP listo).');
    } else {
      this.logger.warn('Email NO configurado (SMTP_USER/SMTP_PASS vacíos). Los correos no se enviarán.');
    }
  }

  /** True si hay SMTP configurado. */
  get enabled(): boolean {
    return this.transporter !== null;
  }

  /**
   * Envía un correo. Si no hay SMTP configurado, no falla: registra y retorna false.
   * Retorna true si el correo se envió.
   */
  async send(input: SendMailInput): Promise<boolean> {
    if (!this.transporter) {
      this.logger.warn(`Email omitido (sin SMTP): "${input.subject}" → ${input.to}`);
      return false;
    }
    const from = this.config.get<string>('SMTP_USER');
    try {
      await this.transporter.sendMail({
        from: `"TPP Perú" <${from}>`,
        to: input.to,
        subject: input.subject,
        html: input.html,
        attachments: input.attachments,
      });
      return true;
    } catch (err) {
      this.logger.error(`Fallo al enviar email "${input.subject}": ${(err as Error).message}`);
      return false;
    }
  }
}

@Module({
  providers: [EmailService],
  exports: [EmailService],
})
export class EmailModule {}
