import { INestApplication } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import * as fs from 'fs';
import * as path from 'path';
import request from 'supertest';
import { authedRequest, createTestApp, loginAs, resetDb, seedUsers, TEST_PASSWORD } from './helpers';
import { PrismaService } from '../src/prisma/prisma.service';
import { StorageService } from '../src/storage/storage.service';

const PDF_BUFFER = Buffer.from(
  '%PDF-1.4\n%\xe2\xe3\xcf\xd3\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF',
);

describe('Validation et téléchargements (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let ipCounter = 200;
  const nextIp = () => `10.46.0.${++ipCounter}`;
  const server = () => request(app.getHttpServer());

  type Fx = { campusId: string; schoolId: string; subjectId: string };
  async function seedHierarchy(suffix = ''): Promise<Fx> {
    const campus = await prisma.campus.create({ data: { name: 'Campus V', slug: `campus-v${suffix}` } });
    const school = await prisma.school.create({
      data: { name: 'École V', slug: `ecole-v${suffix}`, campusId: campus.id },
    });
    const subject = await prisma.subject.create({
      data: { name: 'Matière V', slug: `matiere-v${suffix}`, schoolId: school.id },
    });
    return { campusId: campus.id, schoolId: school.id, subjectId: subject.id };
  }

  function uploadFields(
    req: request.Test,
    fx: Fx,
    file: Buffer = PDF_BUFFER,
    filename = 'doc.pdf',
  ): request.Test {
    return req
      .field('title', 'Titre de test valide')
      .field('type', 'COURS')
      .field('level', 'L1')
      .field('semester', 'S1')
      .field('year', '2024')
      .field('campusId', fx.campusId)
      .field('schoolId', fx.schoolId)
      .field('subjectId', fx.subjectId)
      .field('tags', 'Foo, foo, BAR')
      .attach('file', file, { filename, contentType: 'application/pdf' });
  }

  function authedUpload(cookie: string): request.Test {
    return server().post('/api/resources').set('Cookie', cookie).set('Origin', 'http://localhost:3000');
  }

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

  describe('DTO taxonomie', () => {
    it('slug invalide / couleur invalide ⇒ 400 ; valide ⇒ 201', async () => {
      const users = await seedUsers(app);
      const cookie = await loginAs(app, users.admin.email, TEST_PASSWORD, nextIp());
      const admin = authedRequest(app, cookie);
      const campus = await prisma.campus.create({ data: { name: 'C', slug: 'c-test' } });

      await admin.post('/api/schools').send({ name: 'X', slug: 'INVALID SLUG!', campusId: campus.id }).expect(400);
      await admin
        .post('/api/schools')
        .send({ name: 'École X', slug: 'ecole-x', campusId: campus.id, color: 'rouge' })
        .expect(400);
      await admin
        .post('/api/schools')
        .send({ name: 'École X', slug: 'ecole-x', campusId: campus.id, color: '#C1502E' })
        .expect(201);
    });
  });

  describe('upload ressources', () => {
    it('PDF valide ⇒ 201 + tags normalisés ; magic bytes invalides / hiérarchie incohérente / bornes ⇒ 400', async () => {
      const users = await seedUsers(app);
      const fx = await seedHierarchy();
      const cookie = await loginAs(app, users.moderator.email, TEST_PASSWORD, nextIp());

      const ok = await uploadFields(authedUpload(cookie), fx).expect(201);
      expect(ok.body.tags).toEqual(['foo', 'bar']);

      await uploadFields(authedUpload(cookie), fx, Buffer.from('ceci nest pas un pdf'), 'faux.pdf').expect(400);

      const bad = authedUpload(cookie)
        .field('title', 'AB')
        .field('type', 'COURS')
        .field('level', 'L9')
        .field('year', '1999')
        .field('campusId', fx.campusId)
        .field('schoolId', fx.schoolId)
        .field('subjectId', fx.subjectId)
        .attach('file', PDF_BUFFER, { filename: 'doc.pdf', contentType: 'application/pdf' });
      await bad.expect(400);
    });
  });

  describe('rollback R2 si la DB échoue (provider mocké)', () => {
    it('double création concurrente ⇒ 201 + 409, deleteFile appelé', async () => {
      const localApp = await createTestApp([
        {
          provide: StorageService,
          useValue: {
            generateResourceKey: () => 'resources/rollback-test.pdf',
            uploadFile: jest.fn().mockResolvedValue('resources/rollback-test.pdf'),
            deleteFile: jest.fn().mockResolvedValue(undefined),
            fileExists: jest.fn().mockResolvedValue(true),
            getDownloadStream: jest.fn(),
            getSignedUrl: jest.fn(),
            getSignedUrlWithDisposition: jest.fn(),
            getSafeFilename: () => 'rollback-test.pdf',
          },
        },
      ]);
      try {
        const localPrisma = localApp.get(PrismaService);
        await localPrisma.resource.deleteMany();
        await localPrisma.subject.deleteMany();
        await localPrisma.school.deleteMany();
        await localPrisma.campus.deleteMany();
        await localPrisma.user.deleteMany();
        const campus = await localPrisma.campus.create({ data: { name: 'C', slug: 'c-rb' } });
        const school = await localPrisma.school.create({
          data: { name: 'E', slug: 'e-rb', campusId: campus.id },
        });
        const subject = await localPrisma.subject.create({
          data: { name: 'M', slug: 'm-rb', schoolId: school.id },
        });
        const hash = await bcrypt.hash('LongPassword123!', 4);
        await localPrisma.user.create({
          data: { email: 'modo-rb@test.local', name: 'RB', password: hash, role: 'MODERATOR' },
        });
        const login = await request(localApp.getHttpServer())
          .post('/api/auth/login')
          .send({ email: 'modo-rb@test.local', password: 'LongPassword123!' })
          .expect(201);
        const raw: unknown = login.headers['set-cookie'];
        const cookie = (Array.isArray(raw) ? (raw as string[]) : []).find((c) => c.startsWith('jwt='))!.split(';')[0];

        const payload = () =>
          request(localApp.getHttpServer())
            .post('/api/resources')
            .set('Cookie', cookie)
            .set('Origin', 'http://localhost:3000')
            .field('title', 'Ressource Doublon')
            .field('type', 'COURS')
            .field('level', 'L1')
            .field('semester', 'S1')
            .field('year', '2024')
            .field('campusId', campus.id)
            .field('schoolId', school.id)
            .field('subjectId', subject.id)
            .attach('file', PDF_BUFFER, { filename: 'doc.pdf', contentType: 'application/pdf' });
        const [r1, r2] = await Promise.all([payload(), payload()]);
        const statuses = [r1.status, r2.status].sort();
        expect(statuses).toEqual([201, 409]);
        const storage = localApp.get(StorageService) as unknown as { deleteFile: jest.Mock };
        expect(storage.deleteFile).toHaveBeenCalledWith('resources/rollback-test.pdf');
      } finally {
        await localApp.close();
      }
    });
  });

  describe('limites et invisibilité anonyme', () => {
    it('> 10 Mo ⇒ 413', async () => {
      const users = await seedUsers(app);
      const fx = await seedHierarchy('-big');
      const cookie = await loginAs(app, users.moderator.email, TEST_PASSWORD, nextIp());
      const big = Buffer.alloc(10 * 1024 * 1024 + 1, 0);
      big.write('%PDF-1.4');
      await uploadFields(authedUpload(cookie), fx, big, 'gros.pdf').expect(413);
    });

    it('anonyme : jamais de PENDING/REJECTED (liste, détail, download, preview)', async () => {
      const users = await seedUsers(app);
      const fx = await seedHierarchy('-hid');
      const pending = await prisma.resource.create({
        data: {
          title: 'Cachée', slug: 'res-cachee', type: 'COURS' as never,
          fileName: 'c.pdf', filePath: 'resources/c.pdf', fileSize: 10, mimeType: 'application/pdf',
          campusId: fx.campusId, schoolId: fx.schoolId, subjectId: fx.subjectId,
          uploadedById: users.moderator.id, status: 'PENDING' as never,
        },
      });
      const list = await server().get('/api/resources').expect(200);
      expect((list.body.data as Array<{ id: string }>).some((r) => r.id === pending.id)).toBe(false);
      await server().get(`/api/resources/${pending.slug}`).expect(404);
      await server().get(`/api/resources/${pending.id}/download`).expect(404);
      await server().get(`/api/resources/${pending.id}/preview`).expect(404);
      // Le filtre status est ignoré pour un anonyme (toujours APPROVED uniquement).
      const forced = await server().get('/api/resources?status=PENDING').expect(200);
      expect((forced.body.data as Array<{ id: string }>).some((r) => r.id === pending.id)).toBe(false);
    });
  });

  describe('compteur de téléchargements (dédup, Range, nom slug)', () => {    async function waitForCount(id: string, expected: number) {
      for (let i = 0; i < 40; i++) {
        const row = await prisma.resource.findUniqueOrThrow({ where: { id }, select: { downloadCount: true } });
        if (row.downloadCount === expected) return;
        await new Promise((r) => setTimeout(r, 50));
      }
      throw new Error(`downloadCount resté différent de ${expected}`);
    }

    it('même IP ⇒ compté une fois ; IP ≠ ⇒ +1 ; Range ⇒ ignoré ; filename = slug.ext', async () => {
      const users = await seedUsers(app);
      const fx = await seedHierarchy('-dl');
      const dir = path.join(process.cwd(), 'test', 'tmp', 'uploads', 'resources');
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, 'test-dl.pdf'), PDF_BUFFER);
      const res = await prisma.resource.create({
        data: {
          title: 'Ressource DL',
          slug: 'res-dl',
          description: 'd',
          type: 'COURS' as never,
          fileName: 'test-dl.pdf',
          filePath: 'resources/test-dl.pdf',
          fileSize: PDF_BUFFER.length,
          mimeType: 'application/pdf',
          campusId: fx.campusId,
          schoolId: fx.schoolId,
          subjectId: fx.subjectId,
          uploadedById: users.moderator.id,
          status: 'APPROVED' as never,
        },
      });

      const dl1 = await server().get(`/api/resources/${res.id}/download`).set('X-Forwarded-For', '10.50.0.1');
      expect(dl1.status).toBe(200);
      expect(dl1.headers['content-disposition']).toContain('res-dl.pdf');
      await waitForCount(res.id, 1);

      await server().get(`/api/resources/${res.id}/download`).set('X-Forwarded-For', '10.50.0.1').expect(200);
      await new Promise((r) => setTimeout(r, 300));
      const same = await prisma.resource.findUniqueOrThrow({ where: { id: res.id }, select: { downloadCount: true } });
      expect(same.downloadCount).toBe(1);

      await server().get(`/api/resources/${res.id}/download`).set('X-Forwarded-For', '10.50.0.2').expect(200);
      await waitForCount(res.id, 2);

      await server()
        .get(`/api/resources/${res.id}/download`)
        .set('X-Forwarded-For', '10.50.0.3')
        .set('Range', 'bytes=0-10')
        .expect(200);
      await new Promise((r) => setTimeout(r, 300));
      const afterRange = await prisma.resource.findUniqueOrThrow({
        where: { id: res.id },
        select: { downloadCount: true },
      });
      expect(afterRange.downloadCount).toBe(2);
    });
  });
});
