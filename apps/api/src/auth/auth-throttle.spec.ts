jest.mock('@nexvideo/database', () => ({ prisma: {}, PrismaClient: jest.fn() }));

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, HttpStatus } from '@nestjs/common';
import request from 'supertest';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { CustomThrottlerGuard } from '../common/guards/throttler-exception.guard';
import { AuthController } from './auth.controller';
import { LoginUseCase } from './use-cases/login.use-case';
import { RegisterUseCase } from './use-cases/register.use-case';
import { RefreshTokenService } from './services/refresh-token.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { YoutubeOAuthService } from './services/youtube-oauth.service';

async function buildApp(ttl: number, limit: number): Promise<INestApplication> {
  const module: TestingModule = await Test.createTestingModule({
    imports: [ThrottlerModule.forRoot([{ name: 'default', ttl, limit }])],
    controllers: [AuthController],
    providers: [
      { provide: LoginUseCase, useValue: { execute: jest.fn().mockResolvedValue({ accessToken: 'tok', refreshToken: 'ref' }) } },
      { provide: RegisterUseCase, useValue: { execute: jest.fn().mockResolvedValue({ accessToken: 'tok', refreshToken: 'ref' }) } },
      { provide: RefreshTokenService, useValue: {} },
      { provide: YoutubeOAuthService, useValue: {} },
      { provide: APP_GUARD, useClass: CustomThrottlerGuard },
      JwtAuthGuard,
    ],
  })
    .overrideGuard(JwtAuthGuard)
    .useValue({ canActivate: () => true })
    .compile();

  const app = module.createNestApplication();
  await app.init();
  return app;
}

describe('Auth throttling (integration)', () => {
  it('POST /auth/login — blocks after 5 requests/min (configured limit)', async () => {
    // Login route has @Throttle({ default: { limit: 5 } })
    // We use a very short ttl so limits don't bleed across tests
    const app = await buildApp(60_000, 100); // module default: 100; route override: 5
    const agent = request(app.getHttpServer());

    // First 5 should succeed
    for (let i = 0; i < 5; i++) {
      const res = await agent.post('/auth/login').send({ email: 'a@a.com', password: '123' });
      expect(res.status).not.toBe(HttpStatus.TOO_MANY_REQUESTS);
    }

    // 6th should be blocked by route-level @Throttle limit of 5
    const blocked = await agent.post('/auth/login').send({ email: 'a@a.com', password: '123' });
    expect(blocked.status).toBe(HttpStatus.TOO_MANY_REQUESTS);
    expect(blocked.body.message).toMatch(/Too many requests/i);

    await app.close();
  });

  it('POST /auth/register — blocks after 10 requests/min (configured limit)', async () => {
    const app = await buildApp(60_000, 100); // module: 100; route override: 10
    const agent = request(app.getHttpServer());

    for (let i = 0; i < 10; i++) {
      const res = await agent.post('/auth/register').send({ email: `u${i}@test.com`, password: '123', name: 'U' });
      expect(res.status).not.toBe(HttpStatus.TOO_MANY_REQUESTS);
    }

    const blocked = await agent.post('/auth/register').send({ email: 'z@z.com', password: '123', name: 'Z' });
    expect(blocked.status).toBe(HttpStatus.TOO_MANY_REQUESTS);
    expect(blocked.body.message).toMatch(/Too many requests/i);

    await app.close();
  });

  it('POST /auth/login — 429 response includes human-readable message', async () => {
    const app = await buildApp(60_000, 100);
    const agent = request(app.getHttpServer());

    for (let i = 0; i < 5; i++) {
      await agent.post('/auth/login').send({ email: 'a@a.com', password: '123' });
    }
    const res = await agent.post('/auth/login').send({ email: 'a@a.com', password: '123' });

    expect(res.status).toBe(429);
    expect(res.body).toHaveProperty('message');
    expect(typeof res.body.message).toBe('string');
    expect(res.body.message.length).toBeGreaterThan(0);

    await app.close();
  });

  it('POST /billing/webhook — skips throttling entirely', async () => {
    const guard = new CustomThrottlerGuard(null as any, null as any, null as any);
    const mockCtx = {
      switchToHttp: () => ({
        getRequest: () => ({ path: '/billing/webhook', ip: '127.0.0.1', ips: [] }),
      }),
    } as any;

    const result = await guard.canActivate(mockCtx);
    expect(result).toBe(true);
  });
});
