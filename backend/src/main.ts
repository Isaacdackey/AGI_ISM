import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { configureApp } from './app.setup';

async function bootstrap() {
  const weakDefaults = ['super-secret', 'change-me', 'change-me-32-chars-minimum-strong-secret'];
  if (
    !process.env.JWT_SECRET ||
    process.env.JWT_SECRET.length < 48 ||
    weakDefaults.some((w) => process.env.JWT_SECRET!.includes(w))
  ) {
    console.error('JWT_SECRET manquant, trop court (<48) ou valeur par défaut — définir un secret fort >=48 chars aléatoires dans .env (voir README)');
    process.exit(1);
  }
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL manquant');
    process.exit(1);
  }
  const expiresIn = process.env.JWT_EXPIRES_IN || '15m';
  if (!/^(\d+)([smhd])$/.test(expiresIn)) {
    console.error('JWT_EXPIRES_IN invalide (format attendu : 15m, 1h, 7d)');
    process.exit(1);
  }
  if (!process.env.FRONTEND_URL) {
    console.error('FRONTEND_URL manquant — définir explicitement (pas de fallback en prod)');
    if (process.env.NODE_ENV === 'production') process.exit(1);
  }
  // Validation R2 typée — message clair si variable manquante
  try {
    const { validateR2Config } = await import('./config/r2.config');
    validateR2Config();
  } catch (e: any) {
    console.error(e?.message || 'Configuration R2 invalide');
    process.exit(1);
  }
  const app = await NestFactory.create(AppModule);
  configureApp(app);
  app.enableShutdownHooks();

  const port = process.env.PORT || 4000;
  await app.listen(port);
  console.log(`Backend running on http://localhost:${port}/api`);
  if (process.env.NODE_ENV !== 'production') console.log(`Swagger on http://localhost:${port}/api/docs`);
}
bootstrap();
