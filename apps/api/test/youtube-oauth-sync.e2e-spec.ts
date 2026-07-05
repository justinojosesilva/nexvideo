/**
 * [TASK-038] E2E — YouTube OAuth + Metrics Sync + Analytics Dashboard
 *
 * Acceptance criteria covered:
 *   AC-1  OAuth flow mocked end-to-end (start → callback → token persisted)
 *   AC-2  Sync job triggered → VideoPerformance rows persisted
 *   AC-3  Analytics dashboard endpoint returns the synced metrics
 *
 * External dependencies are mocked:
 *   - YoutubeOAuthService (Google OAuth + Redis nonce)
 *   - IYouTubeAnalyticsPort (Google Analytics API)
 *   - Email use cases, OpenAI, Stripe, Redis/BullMQ — same approach as saas.e2e-spec.ts
 *
 * Infra: Postgres only (Redis is mocked).
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { SendConfirmationEmailUseCase } from '../src/email/use-cases/send-confirmation-email.use-case';
import { SendWelcomeEmailUseCase } from '../src/email/use-cases/send-welcome-email.use-case';
import { SendInviteEmailUseCase } from '../src/email/use-cases/send-invite-email.use-case';
import { SendPaymentFailedEmailUseCase } from '../src/email/use-cases/send-payment-failed-email.use-case';
import { SendCancellationWarningEmailUseCase } from '../src/email/use-cases/send-cancellation-warning-email.use-case';
import { CreateCheckoutSessionUseCase } from '../src/billing/use-cases/create-checkout-session.use-case';
import { CreatePortalSessionUseCase } from '../src/billing/use-cases/create-portal-session.use-case';
import { GetBillingStatusUseCase } from '../src/billing/use-cases/get-billing-status.use-case';
import { HandleStripeWebhookUseCase } from '../src/billing/use-cases/handle-stripe-webhook.use-case';
import { YoutubeOAuthService } from '../src/auth/services/youtube-oauth.service';
import { JOBS_QUEUE_TOKEN, REDIS_CONNECTION_TOKEN } from '../src/bullmq/bullmq.module';

// ─── Helpers ───────────────────────────────────────────────────────────────

const uid = () => Math.random().toString(36).slice(2, 10);

async function ensurePlansSeeded(prisma: PrismaService) {
  const planDefs = [
    { name: 'Free', slug: 'free', scriptLimit: 5, narrationLimit: 5, exportLimit: 3, priceMonthlyBrl: 0 },
  ];
  for (const p of planDefs) {
    await prisma.client.plan.upsert({
      where: { slug: p.slug },
      update: {},
      create: p as any,
    });
  }
}

async function cleanupOrg(prisma: PrismaService, orgId: string) {
  try {
    const projects = await prisma.client.contentProject.findMany({
      where: { organizationId: orgId },
    });
    for (const proj of projects) {
      await prisma.client.videoPerformance.deleteMany({ where: { projectId: proj.id } });
    }
    await prisma.client.contentProject.deleteMany({ where: { organizationId: orgId } });
    await prisma.client.channelProfile.deleteMany({ where: { organizationId: orgId } });
    await prisma.client.usageLog.deleteMany({ where: { organizationId: orgId } });
    await prisma.client.youtubeOAuthToken.deleteMany({ where: { organizationId: orgId } });

    await prisma.client.organization.update({
      where: { id: orgId },
      data: { subscriptionId: null },
    });
    await prisma.client.subscription.deleteMany({ where: { organizationId: orgId } });

    const users = await prisma.client.user.findMany({ where: { organizationId: orgId } });
    for (const u of users) {
      await prisma.client.refreshToken.deleteMany({ where: { userId: u.id } });
    }
    await prisma.client.user.deleteMany({ where: { organizationId: orgId } });
    await prisma.client.organization.delete({ where: { id: orgId } });
  } catch {
    // Ignore cleanup errors in tests
  }
}

// ─── Mocks ─────────────────────────────────────────────────────────────────

const mockEmail = { execute: jest.fn().mockResolvedValue(undefined) };

// In-memory stand-in for YoutubeOAuthService: tracks states + persists tokens.
function createMockYoutubeOAuthService(prismaRef: { current: PrismaService | null }) {
  const stateStore = new Map<string, string>(); // state -> organizationId

  return {
    async getAuthorizationUrl(organizationId: string): Promise<string> {
      const state = `state-${uid()}`;
      stateStore.set(state, organizationId);
      return `https://accounts.google.com/o/oauth2/auth?state=${state}&mock=true`;
    },

    async exchangeCodeForTokens(code: string, state: string): Promise<void> {
      const organizationId = stateStore.get(state);
      if (!organizationId) {
        const { BadRequestException } = await import('@nestjs/common');
        throw new BadRequestException('Invalid or expired OAuth state.');
      }
      stateStore.delete(state);

      const prisma = prismaRef.current!;
      await prisma.client.youtubeOAuthToken.upsert({
        where: { organizationId },
        create: {
          organizationId,
          accessToken: `mock-access-${code}`,
          refreshToken: `mock-refresh-${code}`,
          scope: 'https://www.googleapis.com/auth/yt-analytics.readonly',
          tokenType: 'Bearer',
          expiresAt: new Date(Date.now() + 3600_000),
        },
        update: {
          accessToken: `mock-access-${code}`,
          refreshToken: `mock-refresh-${code}`,
          scope: 'https://www.googleapis.com/auth/yt-analytics.readonly',
          tokenType: 'Bearer',
          expiresAt: new Date(Date.now() + 3600_000),
        },
      });
    },

    async getTokenInfo(organizationId: string) {
      const prisma = prismaRef.current!;
      const record = await prisma.client.youtubeOAuthToken.findUnique({
        where: { organizationId },
      });
      if (!record) return null;
      return {
        azp: 'mock-azp',
        aud: 'mock-aud',
        sub: 'mock-sub',
        scope: record.scope,
        exp: String(Math.floor(record.expiresAt.getTime() / 1000)),
        expires_in: '3600',
        access_type: 'offline',
      };
    },
  };
}

// Mock IYouTubeAnalyticsPort returning deterministic metrics
const SYNC_METRICS = {
  views: 1234,
  watchTimeSeconds: 7890,
  ctr: 0.087,
  impressions: 20000,
};

const mockAnalyticsPort = {
  getMetrics: jest.fn().mockResolvedValue(SYNC_METRICS),
};

const mockCache = {
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue(undefined),
  delete: jest.fn().mockResolvedValue(undefined),
  invalidateByPrefix: jest.fn().mockResolvedValue(undefined),
};
const mockRedisConnection = { status: 'ready', disconnect: jest.fn(), quit: jest.fn() };
const mockJobsQueue = {
  add: jest.fn().mockResolvedValue({ id: 'mock-job-id' }),
  close: jest.fn().mockResolvedValue(undefined),
};

// ─── Test Suite ────────────────────────────────────────────────────────────

describe('[TASK-038] YouTube OAuth + Sync + Analytics E2E', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const createdOrgIds: string[] = [];
  const prismaRef: { current: PrismaService | null } = { current: null };
  const mockOAuth = createMockYoutubeOAuthService(prismaRef);

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(SendConfirmationEmailUseCase).useValue(mockEmail)
      .overrideProvider(SendWelcomeEmailUseCase).useValue(mockEmail)
      .overrideProvider(SendInviteEmailUseCase).useValue(mockEmail)
      .overrideProvider(SendPaymentFailedEmailUseCase).useValue(mockEmail)
      .overrideProvider(SendCancellationWarningEmailUseCase).useValue(mockEmail)
      .overrideProvider(CreateCheckoutSessionUseCase).useValue({ execute: jest.fn() })
      .overrideProvider(CreatePortalSessionUseCase).useValue({ execute: jest.fn() })
      .overrideProvider(GetBillingStatusUseCase).useValue({ execute: jest.fn() })
      .overrideProvider(HandleStripeWebhookUseCase).useValue({ execute: jest.fn() })
      .overrideProvider('ICachePort').useValue(mockCache)
      .overrideProvider(REDIS_CONNECTION_TOKEN).useValue(mockRedisConnection)
      .overrideProvider(JOBS_QUEUE_TOKEN).useValue(mockJobsQueue)
      .overrideProvider('IYouTubeAnalyticsPort').useValue(mockAnalyticsPort)
      .overrideProvider(YoutubeOAuthService).useValue(mockOAuth)
      .compile();

    app = moduleFixture.createNestApplication({ rawBody: true });
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }));
    await app.init();

    prisma = moduleFixture.get<PrismaService>(PrismaService);
    prismaRef.current = prisma;
    await ensurePlansSeeded(prisma);
  });

  afterAll(async () => {
    for (const orgId of createdOrgIds) {
      await cleanupOrg(prisma, orgId);
    }
    await app.close();
  });

  // Shared fixture: register org + user + channel + project
  const email = `e2e-yt-${uid()}@test.com`;
  const password = 'TestPassword123!';
  let accessToken: string;
  let organizationId: string;
  let projectId: string;

  beforeAll(async () => {
    const reg = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        name: 'E2E User YT',
        email,
        password,
        organizationName: 'E2E Org YT',
        acceptTerms: true,
      })
      .expect(201);

    accessToken = reg.body.accessToken;
    const user = await prisma.client.user.findUnique({ where: { email } });
    organizationId = user!.organizationId;
    createdOrgIds.push(organizationId);

    const channel = await request(app.getHttpServer())
      .post('/channels')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: 'Canal YT E2E',
        platform: 'youtube',
        niche: 'finance',
        tone: 'educational',
        narrationStyle: 'professional',
        languageCode: 'pt-BR',
      })
      .expect(201);

    const project = await request(app.getHttpServer())
      .post('/projects')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        title: 'Projeto YT E2E',
        keyword: 'finanças pessoais',
        niche: 'finance',
        format: 'long_form',
        channelProfileId: channel.body.id,
      })
      .expect(201);

    projectId = project.body.id;
  });

  // ── AC-1: OAuth flow mocked end-to-end ─────────────────────────────────

  describe('AC-1: OAuth flow', () => {
    let oauthState: string;

    it('1.1 — GET /youtube/oauth/start returns a Google auth URL with state', async () => {
      const res = await request(app.getHttpServer())
        .get('/youtube/oauth/start')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(302);

      const location: string = res.headers.location ?? res.body.url ?? '';
      expect(location).toContain('accounts.google.com');
      const match = /state=([^&]+)/.exec(location);
      expect(match).toBeTruthy();
      oauthState = match![1]!;
    });

    it('1.2 — GET /youtube/oauth/callback exchanges code and persists tokens', async () => {
      await request(app.getHttpServer())
        .get('/youtube/oauth/callback')
        .query({ code: 'mock-auth-code', state: oauthState })
        .expect(200)
        .expect((res) =>
          expect(res.body.message).toMatch(/connected/i),
        );

      const token = await prisma.client.youtubeOAuthToken.findUnique({
        where: { organizationId },
      });
      expect(token).toBeTruthy();
      expect(token!.accessToken).toContain('mock-access-mock-auth-code');
      expect(token!.refreshToken).toContain('mock-refresh-mock-auth-code');
    });

    it('1.3 — GET /youtube/oauth/status reports connected after callback', async () => {
      const res = await request(app.getHttpServer())
        .get('/youtube/oauth/status')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.connected).toBe(true);
      expect(res.body.scope).toContain('yt-analytics');
    });

    it('1.4 — Invalid state on callback is rejected', async () => {
      await request(app.getHttpServer())
        .get('/youtube/oauth/callback')
        .query({ code: 'x', state: 'state-does-not-exist' })
        .expect(400);
    });
  });

  // ── AC-2: Sync job persists VideoPerformance ───────────────────────────

  describe('AC-2: Metrics sync', () => {
    it('2.1 — POST /youtube/oauth/internal/sync-metrics syncs and persists', async () => {
      const before = await prisma.client.videoPerformance.count({
        where: { projectId },
      });
      expect(before).toBe(0);

      const res = await request(app.getHttpServer())
        .post('/youtube/oauth/internal/sync-metrics')
        .expect(200);

      expect(res.body).toEqual({
        synced: expect.any(Number),
        failed: expect.any(Number),
      });
      expect(res.body.synced).toBeGreaterThanOrEqual(1);
      expect(mockAnalyticsPort.getMetrics).toHaveBeenCalled();

      const rows = await prisma.client.videoPerformance.findMany({
        where: { projectId },
        orderBy: { recordedAt: 'desc' },
      });
      expect(rows.length).toBeGreaterThanOrEqual(1);
      const latest = rows[0]!;
      expect(latest.views).toBe(SYNC_METRICS.views);
      expect(latest.watchTime).toBe(SYNC_METRICS.watchTimeSeconds);
      expect(latest.impressions).toBe(SYNC_METRICS.impressions);
      expect(latest.ctr).toBeCloseTo(SYNC_METRICS.ctr, 5);
    });
  });

  // ── AC-3: Dashboard endpoint returns synced metrics ────────────────────

  describe('AC-3: Analytics dashboard endpoint', () => {
    it('3.1 — GET /analytics/video-performance reflects synced metrics', async () => {
      const res = await request(app.getHttpServer())
        .get('/analytics/video-performance')
        .query({ days: 30 })
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.totals.views).toBeGreaterThanOrEqual(SYNC_METRICS.views);
      expect(res.body.totals.impressions).toBeGreaterThanOrEqual(
        SYNC_METRICS.impressions,
      );
      expect(res.body.totals.videos).toBeGreaterThanOrEqual(1);

      expect(Array.isArray(res.body.series)).toBe(true);
      expect(res.body.series.length).toBeGreaterThanOrEqual(1);

      expect(Array.isArray(res.body.byProject)).toBe(true);
      const row = res.body.byProject.find(
        (p: { projectId: string }) => p.projectId === projectId,
      );
      expect(row).toBeDefined();
      expect(row.views).toBe(SYNC_METRICS.views);
    });

    it('3.2 — Rejects invalid period', async () => {
      await request(app.getHttpServer())
        .get('/analytics/video-performance')
        .query({ days: 17 })
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(400);
    });

    it('3.3 — Other org does not see metrics (tenant isolation)', async () => {
      const otherEmail = `e2e-yt-other-${uid()}@test.com`;
      const reg = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          name: 'Other Org',
          email: otherEmail,
          password,
          organizationName: 'Other Org YT',
          acceptTerms: true,
        })
        .expect(201);

      const otherUser = await prisma.client.user.findUnique({
        where: { email: otherEmail },
      });
      createdOrgIds.push(otherUser!.organizationId);

      const res = await request(app.getHttpServer())
        .get('/analytics/video-performance')
        .query({ days: 30 })
        .set('Authorization', `Bearer ${reg.body.accessToken}`)
        .expect(200);

      expect(res.body.totals.videos).toBe(0);
      expect(res.body.byProject).toHaveLength(0);
    });
  });
});
