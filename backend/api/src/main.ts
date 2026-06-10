import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import cookieParser from 'cookie-parser';
import { json, urlencoded } from 'express';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const config = app.get(ConfigService);
  const logger = new Logger('Bootstrap');

  app.use(cookieParser());
  // Subimos el límite de body para permitir media en base64 (hasta ~25 MB).
  app.use(json({ limit: '32mb' }));
  app.use(urlencoded({ limit: '32mb', extended: true }));

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Orígenes con credenciales (panel ops): lista blanca exacta.
  const allowedOrigins = config
    .get<string>('CORS_ORIGIN', 'http://localhost:3000')
    .split(',')
    .map((s) => s.trim());

  app.enableCors({
    origin: (origin, cb) => {
      // Sin origin (curl, SSR de Astro en build) → permitir.
      if (!origin) return cb(null, true);
      if (allowedOrigins.includes(origin)) return cb(null, true);
      // Cualquier otro origen: permitido pero SIN credenciales (solo /api/public).
      return cb(null, true);
    },
    credentials: true,
  });

  app.setGlobalPrefix('api', { exclude: ['health'] });

  const port = config.get<number>('PORT', 4000);
  await app.listen(port);
  logger.log(`API listening on http://localhost:${port}`);
}

bootstrap();
