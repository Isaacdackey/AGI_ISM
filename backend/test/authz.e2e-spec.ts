import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { authedRequest, createTestApp, loginAs, resetDb, seedUsers, TEST_PASSWORD } from './helpers';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Autorisations et intégrité (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let ipCounter = 100;
  const nextIp = () => `10.45.0.${++ipCounter}`;
  const freshLogin = (email: string, password: string = TEST_PASSWORD) =>
    loginAs(app, email, password, nextIp());
  const server = () => request(app.getHttpServer());

  type Fixture = {
    campusA: { id: string };
    campusB: { id: string };
    schoolA: { id: string };
    schoolB: { id: string };
    subjectA: { id: string };
  };

  async function seedHierarchy(): Promise<Fixture> {
    const campusA = await prisma.campus.create({ data: { name: 'Campus A', slug: 'campus-a' } });
    const campusB = await prisma.campus.create({ data: { name: 'Campus B', slug: 'campus-b' } });
    const schoolA = await prisma.school.create({ data: { name: 'École A', slug: 'ecole-a', campusId: campusA.id } });
    const schoolB = await prisma.school.create({ data: { name: 'École B', slug: 'ecole-b', campusId: campusB.id } });
    const subjectA = await prisma.subject.create({
      data: { name: 'Matière A', slug: 'matiere-a', schoolId: schoolA.id },
    });
    return { campusA, campusB, schoolA, schoolB, subjectA };
  }

  function resourceInput(ownerId: string | null, slug: string, fx: Fixture) {
    return {
      title: `Ressource ${slug}`,
      slug,
      description: 'desc',
      type: 'COURS' as never,
      fileName: `${slug}.pdf`,
      filePath: `resources/${slug}.pdf`,
      fileSize: 1234,
      mimeType: 'application/pdf',
      campusId: fx.campusA.id,
      schoolId: fx.schoolA.id,
      subjectId: fx.subjectA.id,
      uploadedById: ownerId,
    };
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

  describe('ownership ressources (strict, pas de fail-open)', () => {
    it('mod B ne modifie/supprime ni la ressource de mod A ni une orpheline ; admin peut tout', async () => {
      const users = await seedUsers(app);
      const fx = await seedHierarchy();
      const resA = await prisma.resource.create({ data: resourceInput(users.moderator.id, 'res-a', fx) });
      const orphan = await prisma.resource.create({ data: resourceInput(null, 'res-orpheline', fx) });
      const cookieB = await freshLogin(users.moderator2.email);
      const cookieAdmin = await freshLogin(users.admin.email);
      const modB = authedRequest(app, cookieB);
      const admin = authedRequest(app, cookieAdmin);

      await modB.patch(`/api/resources/${resA.id}`).send({ description: 'pirate' }).expect(403);
      await modB.delete(`/api/resources/${resA.id}`).expect(403);
      await modB.patch(`/api/resources/${orphan.id}`).send({ description: 'pirate' }).expect(403);
      await modB.delete(`/api/resources/${orphan.id}`).expect(403);

      await admin.patch(`/api/resources/${orphan.id}`).send({ description: 'ok admin' }).expect(200);
      await admin.delete(`/api/resources/${orphan.id}`).expect(200);
      await admin.delete(`/api/resources/${resA.id}`).expect(200);
    });

    it('mod A modifie sa propre ressource', async () => {
      const users = await seedUsers(app);
      const fx = await seedHierarchy();
      const resA = await prisma.resource.create({ data: resourceInput(users.moderator.id, 'res-a', fx) });
      const cookieA = await freshLogin(users.moderator.email);
      await authedRequest(app, cookieA)
        .patch(`/api/resources/${resA.id}`)
        .send({ description: 'nouvelle description' })
        .expect(200);
    });
  });

  describe('hiérarchie Campus → École → Matière', () => {
    it('modérateur : déplacement refusé (403), champs simples OK', async () => {
      const users = await seedUsers(app);
      const fx = await seedHierarchy();
      const cookie = await freshLogin(users.moderator.email);
      const mod = authedRequest(app, cookie);
      await mod.patch(`/api/schools/${fx.schoolA.id}`).send({ campusId: fx.campusB.id }).expect(403);
      await mod.patch(`/api/subjects/${fx.subjectA.id}`).send({ schoolId: fx.schoolB.id }).expect(403);
      await mod.patch(`/api/schools/${fx.schoolA.id}`).send({ description: 'nouvelle description' }).expect(200);
    });

    it('admin : déplacement école ⇒ ressources recâblées en transaction', async () => {
      const users = await seedUsers(app);
      const fx = await seedHierarchy();
      await prisma.resource.create({ data: resourceInput(users.moderator.id, 'res-move', fx) });
      const cookie = await freshLogin(users.admin.email);
      await authedRequest(app, cookie)
        .patch(`/api/schools/${fx.schoolA.id}`)
        .send({ campusId: fx.campusB.id })
        .expect(200);
      const moved = await prisma.resource.findUniqueOrThrow({ where: { slug: 'res-move' } });
      expect(moved.campusId).toBe(fx.campusB.id);
      expect(moved.schoolId).toBe(fx.schoolA.id);
    });

    it('admin : déplacement matière ⇒ schoolId/campusId recâblés', async () => {
      const users = await seedUsers(app);
      const fx = await seedHierarchy();
      await prisma.resource.create({ data: resourceInput(users.moderator.id, 'res-move2', fx) });
      const cookie = await freshLogin(users.admin.email);
      await authedRequest(app, cookie)
        .patch(`/api/subjects/${fx.subjectA.id}`)
        .send({ schoolId: fx.schoolB.id })
        .expect(200);
      const moved = await prisma.resource.findUniqueOrThrow({ where: { slug: 'res-move2' } });
      expect(moved.schoolId).toBe(fx.schoolB.id);
      expect(moved.campusId).toBe(fx.campusB.id);
    });
  });

  describe('suppressions sûres (409 si ressources)', () => {
    it('matière/école/campus avec ressources ⇒ 409 ; sans ⇒ 200', async () => {
      const users = await seedUsers(app);
      const fx = await seedHierarchy();
      const res = await prisma.resource.create({ data: resourceInput(users.moderator.id, 'res-x', fx) });
      const cookie = await freshLogin(users.admin.email);
      const admin = authedRequest(app, cookie);

      await admin.delete(`/api/subjects/${fx.subjectA.id}`).expect(409);
      await admin.delete(`/api/schools/${fx.schoolA.id}`).expect(409);
      await admin.delete(`/api/campuses/${fx.campusA.id}`).expect(409);

      await admin.delete(`/api/resources/${res.id}`).expect(200);
      await admin.delete(`/api/subjects/${fx.subjectA.id}`).expect(200);
      await admin.delete(`/api/schools/${fx.schoolA.id}`).expect(200);
      await admin.delete(`/api/campuses/${fx.campusA.id}`).expect(200);
    });
  });

  describe('404 cohérentes', () => {
    it('slugs inconnus ⇒ 404 sur schools/subjects/campuses', async () => {
      await server().get('/api/schools/nope').expect(404);
      await server().get('/api/subjects/nope').expect(404);
      await server().get('/api/campuses/nope').expect(404);
    });
  });
});
