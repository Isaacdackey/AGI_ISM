import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { PrismaExceptionFilter } from './common/filters/prisma-exception.filter';
import { CsrfGuard } from './common/guards/csrf.guard';

/**
 * Configuration partagée de l'application (prod + tests e2e).
 * Tout ce qui suit NestFactory.create vit ici ; main.ts ne garde
 * que les validations de démarrage, create, configureApp et listen.
 */
export function configureApp(app: INestApplication): void {
  const trustProxyHops = Number.parseInt(process.env.TRUST_PROXY_HOPS || '1', 10);
  app.getHttpAdapter().getInstance().set('trust proxy', Number.isNaN(trustProxyHops) ? 1 : trustProxyHops);

  app.setGlobalPrefix('api');
  app.use(cookieParser());

  const isProd = process.env.NODE_ENV === 'production';
  const frontendUrls = (process.env.FRONTEND_URL || 'http://localhost:3000')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  app.use(
    helmet({
      crossOriginEmbedderPolicy: isProd ? undefined : false,
      crossOriginResourcePolicy: isProd ? { policy: 'same-origin' } : false,
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
          fontSrc: ["'self'", 'https://fonts.gstatic.com'],
          imgSrc: ["'self'", 'data:', 'blob:'],
          connectSrc: ["'self'", ...frontendUrls],
          frameSrc: ["'self'", ...frontendUrls, 'blob:', 'data:'],
          objectSrc: ["'none'"],
          baseUri: ["'self'"],
          formAction: ["'self'"],
        },
      },
      hsts: isProd ? { maxAge: 63072000, includeSubDomains: true, preload: true } : false,
    }),
  );

  const origins = frontendUrls.filter((o) => o.startsWith('http://') || o.startsWith('https://'));
  if (origins.length === 0) {
    throw new Error('FRONTEND_URL invalide — aucune origine http(s)');
  }
  app.enableCors({
    origin: origins,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    maxAge: 600,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: false },
    }),
  );
  app.useGlobalFilters(new PrismaExceptionFilter());
  app.useGlobalGuards(new CsrfGuard(new Reflector()));

  if (!isProd) {
    const config = new DocumentBuilder()
      .setTitle('AGI ISM API')
      .setDescription('Bibliothèque académique numérique ISM - API')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }
}
