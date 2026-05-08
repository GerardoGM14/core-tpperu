import { HttpException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class WhatsappBridgeService {
  private readonly logger = new Logger(WhatsappBridgeService.name);
  private readonly baseUrl: string;

  constructor(config: ConfigService) {
    this.baseUrl = config.get<string>('WA_DAEMON_URL', 'http://localhost:8080').replace(/\/$/, '');
  }

  /** Pide al daemon iniciar sesión (emite QR por Redis si hace falta). */
  async connect() {
    return this.req('POST', '/connect');
  }

  async disconnect() {
    return this.req('POST', '/disconnect');
  }

  async status() {
    return this.req('GET', '/status');
  }

  async sendText(remoteJid: string, body: string) {
    return this.req('POST', '/send', { remoteJid, body });
  }

  private async req(method: string, path: string, json?: unknown) {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: { 'content-type': 'application/json' },
      body: json ? JSON.stringify(json) : undefined,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      this.logger.error(`wa-daemon ${method} ${path} → ${res.status}: ${text}`);
      throw new HttpException(text || 'wa-daemon error', res.status);
    }
    return res.json().catch(() => ({}));
  }
}
