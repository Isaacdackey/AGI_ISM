import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { PrismaService } from '../src/prisma/prisma.service';

export const TEST_PASSWORD = 'TestPassword123!';

export type ProviderOverride = { provide: unknown; useValue: unknown };

export async function createTestApp(overrides: ProviderOverride[] = []): Promise<INestApplication> {
  const testing = Test.createTestingModule({ imports: [AppModule] });
  for (const o of overrides) testing.overrideProvider(o.provide as never).useValue(o.useValue);
  const moduleRef = await testing.compile();
  const app = moduleRef.createNestApplication();
  configureApp(app);
  await app.init();
  return app;
}

export async function resetDb(app: INestApplication): Promise<void> {
  const prisma = app.get(PrismaService);
  await prisma.resource.deleteMany();
  await prisma.subject.deleteMany();
  await prisma.school.deleteMany();
  await prisma.campus.deleteMany();
  await prisma.user.deleteMany();
}

export type SeededUsers = {
  admin: { id: string; email: string };
  moderator: { id: string; email: string };
  moderator2: { id: string; email: string };
};

/** Crée admin + 2 modérateurs (coût bcrypt réduit : rapidité des tests). */
export async function seedUsers(app: INestApplication): Promise<SeededUsers> {
  const prisma = app.get(PrismaService);
  const password = await bcrypt.hash(TEST_PASSWORD, 4);
  const admin = await prisma.user.create({
    data: { email: 'admin@test.local', name: 'Admin Test', password, role: 'ADMIN' as never },
  });
  const moderator = await prisma.user.create({
    data: { email: 'modo@test.local', name: 'Modo Test', password, role: 'MODERATOR' as never },
  });
  const moderator2 = await prisma.user.create({
    data: { email: 'modo2@test.local', name: 'Modo2 Test', password, role: 'MODERATOR' as never },
  });
  return {
    admin: { id: admin.id, email: admin.email },
    moderator: { id: moderator.id, email: moderator.email },
    moderator2: { id: moderator2.id, email: moderator2.email },
  };
}

/** Requêtes authentifiées (Origin exacte requise par le CsrfGuard, comme un navigateur). */
export function authedRequest(app: INestApplication, cookie: string) {
  const withAuth = (method: 'get' | 'post' | 'patch' | 'delete', path: string) => {
    const req = request(app.getHttpServer())[method](path).set('Cookie', cookie);
    if (method !== 'get') req.set('Origin', 'http://localhost:3000');
    return req;
  };
  return {
    get: (path: string) => withAuth('get', path),
    post: (path: string) => withAuth('post', path),
    patch: (path: string) => withAuth('patch', path),
    delete: (path: string) => withAuth('delete', path),
  };
}

/** Connecte un utilisateur seedé et renvoie le cookie de session (`jwt=…`). */
export async function loginAs(
  app: INestApplication,
  email: string,
  password = TEST_PASSWORD,
  ip?: string,
): Promise<string> {
  const req = request(app.getHttpServer()).post('/api/auth/login').send({ email, password });
  if (ip) req.set('X-Forwarded-For', ip);
  const res = await req.expect(201);
  const rawCookies: unknown = res.headers['set-cookie'];
  const cookies: string[] = Array.isArray(rawCookies) ? (rawCookies as string[]) : [];
  const jwt = cookies.find((c) => c.startsWith('jwt='));
  if (!jwt) throw new Error('Cookie jwt absent après login');
  return jwt.split(';')[0];
}
