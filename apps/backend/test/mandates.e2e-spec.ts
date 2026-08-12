import 'reflect-metadata';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { execSync } from 'child_process';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

// Premier test e2e du projet (voir contexte/progress-tracker.md, "types
// partagés"/"tests d'intégration" — recommandations du 2026-08-09) : boot
// complet de l'application NestJS (vrai routing, vrai JwtAuthGuard, vrai
// RolesGuard, vrais services) contre un vrai Postgres jetable (testcontainers),
// pas des mocks Prisma. C'est exactement ce niveau de test qui aurait attrapé
// les 2 bugs trouvés ce jour-là (`GET /mandates/received` inexistant,
// `owner`/`manager` jamais inclus dans la réponse) — les deux invisibles avec
// des tests unitaires mockés.
//
// Authentification interne depuis le 2026-08-11 (voir architecture.md) — le
// token Bearer envoyé par chaque requête est un vrai JWT signé avec le même
// secret que l'app (`JWT_SECRET`, voir test/env-setup.ts), le VRAI
// JwtAuthGuard tourne sans aucune dépendance externe à faker.
//
// Nécessite Docker en cours d'exécution localement (Docker Desktop). Tourne
// aussi en CI (voir .github/workflows/ci.yml, job backend-ci, étape "e2e
// tests") — les runners ubuntu-latest ont Docker nativement.
describe('Mandates (e2e)', () => {
  jest.setTimeout(120_000);

  let container: StartedPostgreSqlContainer;
  let app: INestApplication;
  let prisma: PrismaService;
  let jwt: JwtService;

  let owner: { id: string; role: string };
  let manager: { id: string; role: string };
  let property: { id: string };

  function authHeader(user: { id: string; role: string }) {
    const token = jwt.sign(
      { sub: user.id, role: user.role },
      { secret: process.env['JWT_SECRET'], expiresIn: '15m' },
    );
    return `Bearer ${token}`;
  }

  beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:16-alpine').start();
    const databaseUrl = container.getConnectionUri();
    process.env['DATABASE_URL'] = databaseUrl;
    process.env['DIRECT_URL'] = databaseUrl;

    execSync('npx prisma migrate deploy', {
      cwd: `${__dirname}/..`,
      env: { ...process.env, DATABASE_URL: databaseUrl, DIRECT_URL: databaseUrl },
      stdio: 'inherit',
    });

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();

    app = moduleRef.createNestApplication();
    // Réplique uniquement ce qui affecte le comportement testé ici (validation
    // des DTOs) — pas le préfixe /api, helmet, CORS, etc. (voir main.ts),
    // hors de propos pour ce test.
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    await app.init();

    prisma = app.get(PrismaService);
    jwt = app.get(JwtService);
  });

  afterAll(async () => {
    await app?.close();
    await container?.stop();
  });

  beforeEach(async () => {
    owner = await prisma.user.create({
      data: {
        role: 'OWNER',
        firstName: 'Jean',
        lastName: 'Propriétaire',
        email: `owner-${Date.now()}@test.local`,
        passwordHash: 'not-used-in-this-test',
      },
    });
    manager = await prisma.user.create({
      data: {
        role: 'MANAGER',
        firstName: 'Ama',
        lastName: 'Gestionnaire',
        email: `manager-${Date.now()}@test.local`,
        passwordHash: 'not-used-in-this-test',
      },
    });
    property = await prisma.property.create({
      data: {
        ownerId: owner.id,
        type: 'STUDIO',
        address: '12 rue du Test',
        neighborhood: 'Adidogomé',
        city: 'Lomé',
        monthlyRent: 25000,
      },
    });
  });

  afterEach(async () => {
    await prisma.mandate.deleteMany();
    await prisma.property.deleteMany();
    await prisma.user.deleteMany();
  });

  it("crée un mandat, l'accepte, et le renvoie avec owner+manager peuplés des deux côtés", async () => {
    const createRes = await request(app.getHttpServer())
      .post('/mandates')
      .set('Authorization', authHeader(owner))
      .send({
        managerId: manager.id,
        propertyIds: [property.id],
        feeType: 'PERCENTAGE',
        feeValue: 10,
        startDate: '2026-08-01',
      })
      .expect(201);

    const mandateId = createRes.body[0].id as string;
    expect(mandateId).toBeTruthy();

    await request(app.getHttpServer())
      .post(`/mandates/${mandateId}/accept`)
      .set('Authorization', authHeader(manager))
      .expect(201);

    // Régression du bug du 2026-08-09 : owner/manager doivent être présents,
    // pas seulement property — sans quoi gestionnaire/dashboard,
    // gestionnaire/portefeuille et dashboard/delegation plantent ou
    // affichent des champs vides côté frontend.
    const asManager = await request(app.getHttpServer())
      .get('/mandates')
      .set('Authorization', authHeader(manager))
      .expect(200);

    expect(asManager.body).toHaveLength(1);
    expect(asManager.body[0].owner).toMatchObject({ id: owner.id, firstName: 'Jean', lastName: 'Propriétaire' });
    expect(asManager.body[0].manager).toMatchObject({ id: manager.id, firstName: 'Ama' });
    expect(asManager.body[0].property).toMatchObject({ id: property.id, address: '12 rue du Test' });
    expect(asManager.body[0].status).toBe('ACTIVE');

    const asOwner = await request(app.getHttpServer())
      .get('/mandates')
      .set('Authorization', authHeader(owner))
      .expect(200);

    expect(asOwner.body[0].manager).toMatchObject({ id: manager.id, firstName: 'Ama' });
    expect(asOwner.body[0].owner).toMatchObject({ id: owner.id });
  });

  it('révoque un mandat via POST /mandates/:id/revoke (pas DELETE)', async () => {
    const createRes = await request(app.getHttpServer())
      .post('/mandates')
      .set('Authorization', authHeader(owner))
      .send({
        managerId: manager.id,
        propertyIds: [property.id],
        feeType: 'FLAT',
        feeValue: 15000,
        startDate: '2026-08-01',
      })
      .expect(201);
    const mandateId = createRes.body[0].id as string;

    await request(app.getHttpServer())
      .post(`/mandates/${mandateId}/revoke`)
      .set('Authorization', authHeader(owner))
      .send({})
      .expect(201);

    const list = await request(app.getHttpServer())
      .get('/mandates')
      .set('Authorization', authHeader(owner))
      .expect(200);

    expect(list.body[0].status).toBe('REVOKED');
  });

  it("rejette l'accès sans en-tête d'authentification", async () => {
    await request(app.getHttpServer()).get('/mandates').expect(401);
  });
});
