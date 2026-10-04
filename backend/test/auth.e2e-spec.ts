import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import request from 'supertest';
import { createTestApp, resetDb, seedUsers, loginAs, TEST_PASSWORD } from './helpers';
import { PrismaService } from '../src/prisma/prisma.service';
import { LoginAttemptsService } from '../src/auth/login-attempts.service';

describe('Auth (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  // IPs distinctes par login : isole les tests du throttle IP (5/min),
  // pour ne tester ici que la logique métier (verrouillage par compte, etc.).
  let ipCounter = 0;
  const nextIp = () => `10.44.0.${++ipCounter}`;
  const freshLogin = (email: string, password: string = TEST_PASSWORD) =>
    loginAs(app, email, password, nextIp());

  const server = () => request(app.getHttpServer());
  // Requêtes authentifiées : Origin exacte requise par le CsrfGuard (comme un navigateur).
  const authed = (cookie: string) => ({
    get: (p: string) => server().get(p).set('Cookie', cookie),
    post: (p: string) => server().post(p).set('Cookie', cookie).set('Origin', 'http://localhost:3000'),
    patch: (p: string) => server().patch(p).set('Cookie', cookie).set('Origin', 'http://localhost:3000'),
  });
  const cookieOf = (res: request.Response): string => {
    const raw: unknown = res.headers['set-cookie'];
    const cookies: string[] = Array.isArray(raw) ? (raw as string[]) : [];
    const jwt = cookies.find((c) => c.startsWith('jwt='));
    if (!jwt) throw new Error('Cookie jwt absent');
    return jwt.split(';')[0];
  };

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    await resetDb(app);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('register supprimé', () => {
    it('POST /api/auth/register → 404', async () => {
      await server()
        .post('/api/auth/register')
        .send({ name: 'X', email: 'x@test.local', password: 'LongPassword123!' })
        .expect(404);
    });
  });

  describe('CSRF (origines exactes)', () => {
    it('sous-domaine usurpé → 403', async () => {
      const users = await seedUsers(app);
      const cookie = await freshLogin(users.moderator.email);
      await server()
        .post('/api/auth/logout')
        .set('Cookie', cookie)
        .set('Origin', 'https://localhost:3000.evil.com')
        .expect(403);
    });

    it('origine exacte → 200', async () => {
      const users = await seedUsers(app);
      const cookie = await freshLogin(users.moderator.email);
      await server()
        .post('/api/auth/logout')
        .set('Cookie', cookie)
        .set('Origin', 'http://localhost:3000')
        .expect(201);
    });

    it('Origin: null → 403', async () => {
      const users = await seedUsers(app);
      const cookie = await freshLogin(users.moderator.email);
      await server().post('/api/auth/logout').set('Cookie', cookie).set('Origin', 'null').expect(403);
    });

    it('sans Origin ni Referer avec cookie → 403', async () => {
      const users = await seedUsers(app);
      const cookie = await freshLogin(users.moderator.email);
      await server().post('/api/auth/logout').set('Cookie', cookie).expect(403);
    });

    it('login sans cookie : exception, jamais 403', async () => {
      await server()
        .post('/api/auth/login')
        .set('Origin', 'https://evil.test')
        .send({ email: 'nobody@test.local', password: 'WrongPassword123!' })
        .expect(401);
    });
  });

  describe('anti-bruteforce par compte', () => {
    it('service : 5 échecs ⇒ verrouillé, succès ⇒ reset', () => {
      const svc = app.get(LoginAttemptsService);
      const key = 'whitebox@test.local';
      expect(svc.isLocked(key)).toBe(false);
      for (let i = 0; i < 4; i++) expect(svc.recordFailure(key)).toBe(false);
      expect(svc.isLocked(key)).toBe(false);
      expect(svc.recordFailure(key)).toBe(true);
      expect(svc.isLocked(key)).toBe(true);
      svc.recordSuccess(key);
      expect(svc.isLocked(key)).toBe(false);
    });

    it('5 mauvais mots de passe puis le bon ⇒ 429 (email connu)', async () => {
      const users = await seedUsers(app);
      for (let i = 0; i < 4; i++) {
        await server()
          .post('/api/auth/login')
          .set('X-Forwarded-For', `10.20.1.${i}`)
          .send({ email: users.moderator.email, password: 'WrongPassword123!' })
          .expect(401);
      }
      await server()
        .post('/api/auth/login')
        .set('X-Forwarded-For', '10.20.1.9')
        .send({ email: users.moderator.email, password: 'WrongPassword123!' })
        .expect(429);
      await server()
        .post('/api/auth/login')
        .set('X-Forwarded-For', '10.20.1.10')
        .send({ email: users.moderator.email, password: TEST_PASSWORD })
        .expect(429);
    });

    it('email inconnu : même comportement (pas d’oracle)', async () => {
      for (let i = 0; i < 4; i++) {
        await server()
          .post('/api/auth/login')
          .set('X-Forwarded-For', `10.20.2.${i}`)
          .send({ email: 'inconnu@test.local', password: 'WrongPassword123!' })
          .expect(401);
      }
      await server()
        .post('/api/auth/login')
        .set('X-Forwarded-For', '10.20.2.9')
        .send({ email: 'inconnu@test.local', password: 'WrongPassword123!' })
        .expect(429);
    });
  });

  describe('change-password + mustChangePassword', () => {
    async function freshModerator(email = 'fresh@test.local') {
      const pwd = await bcrypt.hash('InitialPassword123!', 4);
      return prisma.user.create({
        data: { email, name: 'Fresh', password: pwd, role: 'MODERATOR', mustChangePassword: true },
      });
    }

    it('modérateur frais : login OK avec flag, routes protégées 403, me/logout OK', async () => {
      await freshModerator();
      const res = await server()
        .post('/api/auth/login')
        .set('X-Forwarded-For', nextIp())
        .send({ email: 'fresh@test.local', password: 'InitialPassword123!' })
        .expect(201);
      expect(res.body.user.mustChangePassword).toBe(true);
      const cookie = cookieOf(res);
      const auth = authed(cookie);
      await auth
        .get('/api/admin/stats')
        .expect(403)
        .expect((r) => expect(r.body.code).toBe('PASSWORD_CHANGE_REQUIRED'));
      await auth.get('/api/auth/me').expect(200);
      await auth.post('/api/auth/logout').expect(201);
    });

    it('après change-password : OK, ancien token révoqué, règles appliquées', async () => {
      await freshModerator();
      const login = await server()
        .post('/api/auth/login')
        .set('X-Forwarded-For', nextIp())
        .send({ email: 'fresh@test.local', password: 'InitialPassword123!' })
        .expect(201);
      const cookie = cookieOf(login);
      const auth = authed(cookie);
      const changed = await auth
        .post('/api/auth/change-password')
        .send({ currentPassword: 'InitialPassword123!', newPassword: 'BrandNewPassword123!' })
        .expect(201);
      expect(changed.body.user.mustChangePassword).toBe(false);
      const newCookie = cookieOf(changed);
      const authNew = authed(newCookie);
      await auth.get('/api/admin/stats').expect(401);
      await authNew.get('/api/admin/stats').expect(200);
      await authNew
        .post('/api/auth/change-password')
        .send({ currentPassword: 'BrandNewPassword123!', newPassword: 'BrandNewPassword123!' })
        .expect(400);
      await authNew
        .post('/api/auth/change-password')
        .send({ currentPassword: 'BrandNewPassword123!', newPassword: 'fresh12345678!' })
        .expect(400);
    });
  });

  describe('cycle de vie des modérateurs', () => {
    it('désactivé ⇒ login 401 et token existant 401 ; réactivé ⇒ login OK', async () => {
      const users = await seedUsers(app);
      const adminCookie = await freshLogin(users.admin.email);
      const pwd = await bcrypt.hash(TEST_PASSWORD, 4);
      const target = await prisma.user.create({
        data: { email: 'cible@test.local', name: 'Cible', password: pwd, role: 'MODERATOR' },
      });
      const targetCookie = await freshLogin(target.email);
      const admin = authed(adminCookie);
      await admin.patch(`/api/admin/moderators/${target.id}/disable`).expect(200);
      await authed(targetCookie).get('/api/admin/stats').expect(401);
      await server()
        .post('/api/auth/login')
        .set('X-Forwarded-For', nextIp())
        .send({ email: target.email, password: TEST_PASSWORD })
        .expect(401);
      await admin.patch(`/api/admin/moderators/${target.id}/enable`).expect(200);
      await freshLogin(target.email);
    });

    it('reset-password : ancien invalide, temporaire OK ; ADMIN et soi-même ⇒ 403', async () => {
      const users = await seedUsers(app);
      const adminCookie = await freshLogin(users.admin.email);
      const admin = authed(adminCookie);
      const pwd = await bcrypt.hash(TEST_PASSWORD, 4);
      const target = await prisma.user.create({
        data: { email: 'cible2@test.local', name: 'Cible2', password: pwd, role: 'MODERATOR' },
      });
      const res = await admin.post(`/api/admin/moderators/${target.id}/reset-password`).expect(201);
      expect(typeof res.body.temporaryPassword).toBe('string');
      await server()
        .post('/api/auth/login')
        .set('X-Forwarded-For', nextIp())
        .send({ email: target.email, password: TEST_PASSWORD })
        .expect(401);
      await freshLogin(target.email, res.body.temporaryPassword);
      const adminUser = await prisma.user.findUniqueOrThrow({ where: { email: users.admin.email } });
      await admin.patch(`/api/admin/moderators/${adminUser.id}/disable`).expect(403);
      const otherAdmin = await prisma.user.create({
        data: { email: 'admin2@test.local', name: 'Admin2', password: pwd, role: 'ADMIN' },
      });
      await admin.post(`/api/admin/moderators/${otherAdmin.id}/reset-password`).expect(403);
    });
  });

  describe('session glissante', () => {
    it('token proche de l’expiration ⇒ Set-Cookie renouvelé, sans exposer session', async () => {
      const users = await seedUsers(app);
      const mod = await prisma.user.findUniqueOrThrow({ where: { email: users.moderator.email } });
      const jwt = app.get(JwtService);
      const now = Math.floor(Date.now() / 1000);
      const near = jwt.sign(
        { sub: mod.id, email: mod.email, role: mod.role, tv: mod.tokenVersion, at: now },
        { expiresIn: '4m' },
      );
      const res = await server().get('/api/auth/me').set('Cookie', `jwt=${near}`).expect(200);
      const raw: unknown = res.headers['set-cookie'];
      expect(Array.isArray(raw) && (raw as string[]).some((c) => c.startsWith('jwt='))).toBe(true);
      expect(res.body.user.session).toBeUndefined();
      expect(res.body.user.password).toBeUndefined();
    });

    it('session plus vieille que le max ⇒ pas de renouvellement', async () => {
      const users = await seedUsers(app);
      const mod = await prisma.user.findUniqueOrThrow({ where: { email: users.moderator.email } });
      const jwt = app.get(JwtService);
      const now = Math.floor(Date.now() / 1000);
      const old = jwt.sign(
        { sub: mod.id, email: mod.email, role: mod.role, tv: mod.tokenVersion, at: now - 9 * 3600 },
        { expiresIn: '4m' },
      );
      const res = await server().get('/api/auth/me').set('Cookie', `jwt=${old}`).expect(200);
      expect(res.headers['set-cookie']).toBeUndefined();
    });
  });

  describe('me public', () => {
    it('anonyme → 200 { user: null }, jamais 401', async () => {
      await server().get('/api/auth/me').expect(200).expect({ user: null });
    });

    it('connecté → 200 { user } sans password ni session', async () => {
      const users = await seedUsers(app);
      const cookie = await freshLogin(users.admin.email);
      const res = await server().get('/api/auth/me').set('Cookie', cookie).expect(200);
      expect(res.body.user.email).toBe(users.admin.email);
      expect(res.body.user.password).toBeUndefined();
      expect(res.body.user.session).toBeUndefined();
    });
  });
});
