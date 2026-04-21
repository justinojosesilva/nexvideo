jest.mock('@nexvideo/database', () => ({
  prisma: {},
  PrismaClient: jest.fn(),
}));

import { CheckUsageThresholdUseCase } from './check-usage-threshold.use-case';
import { SendUsageWarningEmailUseCase } from '../../email/use-cases/send-usage-warning-email.use-case';

const makeOrg = (overrides: object = {}) => ({
  id: 'org-1',
  name: 'Test Org',
  users: [{ email: 'admin@test.com', name: 'Admin User' }],
  activeSubscription: {
    plan: {
      scriptLimit: 5,
      narrationLimit: 5,
      exportLimit: 3,
    },
  },
  usageLogs: [
    {
      month: '2026-04',
      scripts: 0,
      narrations: 0,
      exports: 0,
    },
  ],
  ...overrides,
});

describe('CheckUsageThresholdUseCase', () => {
  let useCase: CheckUsageThresholdUseCase;
  let prisma: { client: { organization: { findUnique: jest.Mock }; billingNotification: { findUnique: jest.Mock; create: jest.Mock } } };
  let sendEmail: { execute: jest.Mock };

  beforeEach(() => {
    prisma = {
      client: {
        organization: { findUnique: jest.fn() },
        billingNotification: {
          findUnique: jest.fn(),
          create: jest.fn(),
        },
      },
    };

    sendEmail = { execute: jest.fn().mockResolvedValue(undefined) };

    useCase = new CheckUsageThresholdUseCase(
      prisma as any,
      sendEmail as unknown as SendUsageWarningEmailUseCase,
    );
  });

  it('sends email when usage reaches 80% threshold', async () => {
    // 4 of 5 = 80%
    prisma.client.organization.findUnique.mockResolvedValue(
      makeOrg({ usageLogs: [{ month: '2026-04', scripts: 4, narrations: 0, exports: 0 }] }),
    );
    prisma.client.billingNotification.findUnique.mockResolvedValue(null);
    prisma.client.billingNotification.create.mockResolvedValue({});

    await useCase.execute({ organizationId: 'org-1' });

    expect(prisma.client.billingNotification.create).toHaveBeenCalledTimes(1);
    expect(sendEmail.execute).toHaveBeenCalledTimes(1);
    expect(sendEmail.execute).toHaveBeenCalledWith(
      expect.objectContaining({ maxPercent: 80 }),
    );
  });

  it('does not send email when usage is below 80%', async () => {
    // 3 of 5 = 60%
    prisma.client.organization.findUnique.mockResolvedValue(
      makeOrg({ usageLogs: [{ month: '2026-04', scripts: 3, narrations: 0, exports: 0 }] }),
    );

    await useCase.execute({ organizationId: 'org-1' });

    expect(prisma.client.billingNotification.create).not.toHaveBeenCalled();
    expect(sendEmail.execute).not.toHaveBeenCalled();
  });

  it('deduplicates: does not send email if notification already exists this cycle', async () => {
    // 5 of 5 = 100%
    prisma.client.organization.findUnique.mockResolvedValue(
      makeOrg({ usageLogs: [{ month: '2026-04', scripts: 5, narrations: 0, exports: 0 }] }),
    );
    // Notification already recorded this month
    prisma.client.billingNotification.findUnique.mockResolvedValue({ id: 'notif-1' });

    await useCase.execute({ organizationId: 'org-1' });

    expect(prisma.client.billingNotification.create).not.toHaveBeenCalled();
    expect(sendEmail.execute).not.toHaveBeenCalled();
  });

  it('handles race condition: skips email if create throws unique constraint error', async () => {
    prisma.client.organization.findUnique.mockResolvedValue(
      makeOrg({ usageLogs: [{ month: '2026-04', scripts: 4, narrations: 0, exports: 0 }] }),
    );
    prisma.client.billingNotification.findUnique.mockResolvedValue(null);
    prisma.client.billingNotification.create.mockRejectedValue(
      new Error('Unique constraint failed'),
    );

    await useCase.execute({ organizationId: 'org-1' });

    expect(sendEmail.execute).not.toHaveBeenCalled();
  });

  it('skips gracefully if org has no usage log', async () => {
    prisma.client.organization.findUnique.mockResolvedValue(
      makeOrg({ usageLogs: [] }),
    );

    await useCase.execute({ organizationId: 'org-1' });

    expect(sendEmail.execute).not.toHaveBeenCalled();
  });

  it('skips gracefully if org has unlimited plan (null limits)', async () => {
    prisma.client.organization.findUnique.mockResolvedValue(
      makeOrg({
        activeSubscription: {
          plan: { scriptLimit: null, narrationLimit: null, exportLimit: null },
        },
        usageLogs: [{ month: '2026-04', scripts: 999, narrations: 999, exports: 999 }],
      }),
    );

    await useCase.execute({ organizationId: 'org-1' });

    expect(sendEmail.execute).not.toHaveBeenCalled();
  });
});
