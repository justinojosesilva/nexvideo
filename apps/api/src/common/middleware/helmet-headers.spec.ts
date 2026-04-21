jest.mock('@nexvideo/database', () => ({ prisma: {}, PrismaClient: jest.fn() }));

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import helmet from 'helmet';
import { AppController } from '../../app.controller';
import { AppService } from '../../app.service';

describe('Helmet security headers', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    app = module.createNestApplication();

    app.use(
      helmet({
        contentSecurityPolicy: {
          directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", 'data:', 'https:'],
            connectSrc: ["'self'"],
            fontSrc: ["'self'", 'https:', 'data:'],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"],
            upgradeInsecureRequests: [],
          },
        },
        crossOriginEmbedderPolicy: false,
        hsts: {
          maxAge: 31_536_000,
          includeSubDomains: true,
          preload: true,
        },
      }),
    );

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('sets X-Content-Type-Options: nosniff', async () => {
    const res = await request(app.getHttpServer()).get('/');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
  });

  it('sets X-Frame-Options', async () => {
    const res = await request(app.getHttpServer()).get('/');
    expect(res.headers['x-frame-options']).toBeDefined();
  });

  it('sets Strict-Transport-Security with long max-age', async () => {
    const res = await request(app.getHttpServer()).get('/');
    const hsts = res.headers['strict-transport-security'] as string;
    expect(hsts).toBeDefined();
    expect(hsts).toContain('max-age=31536000');
    expect(hsts).toContain('includeSubDomains');
  });

  it('sets Content-Security-Policy with default-src self', async () => {
    const res = await request(app.getHttpServer()).get('/');
    const csp = res.headers['content-security-policy'] as string;
    expect(csp).toBeDefined();
    expect(csp).toContain("default-src 'self'");
  });

  it('sets CSP object-src none', async () => {
    const res = await request(app.getHttpServer()).get('/');
    const csp = res.headers['content-security-policy'] as string;
    expect(csp).toContain("object-src 'none'");
  });

  it('sets X-DNS-Prefetch-Control', async () => {
    const res = await request(app.getHttpServer()).get('/');
    expect(res.headers['x-dns-prefetch-control']).toBeDefined();
  });

  it('removes X-Powered-By header', async () => {
    const res = await request(app.getHttpServer()).get('/');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });
});
