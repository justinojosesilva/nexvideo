const mockPrisma = {
  client: {
    organization: {
      findUnique: jest.fn(),
    },
  },
};

const mockSubscriptionsRetrieve = jest.fn();

jest.mock('../../prisma/prisma.service', () => ({
  PrismaService: jest.fn(() => mockPrisma),
}));

jest.mock('stripe', () => {
  const MockStripe = jest.fn().mockImplementation(() => ({
    subscriptions: { retrieve: mockSubscriptionsRetrieve },
  }));
  return { __esModule: true, default: MockStripe };
});

import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GetBillingStatusUseCase } from './get-billing-status.use-case';

describe('GetBillingStatusUseCase', () => {
  let useCase: GetBillingStatusUseCase;
  let configService: ConfigService;

  beforeEach(() => {
    jest.clearAllMocks();
    configService = {
      getOrThrow: jest.fn((key: string) => {
        if (key === 'STRIPE_SECRET_KEY') return 'sk_test_123';
        throw new Error(`Unknown config key: ${key}`);
      }),
    } as any;
    useCase = new GetBillingStatusUseCase(configService, mockPrisma as any);
  });

  it('returns billing status for active subscription', async () => {
    const futureDate = new Date();
    futureDate.setMonth(futureDate.getMonth() + 1);
    const futureDateTimestamp = Math.floor(futureDate.getTime() / 1000);

    const org = {
      id: 'org-1',
      activeSubscription: {
        stripeSubscriptionId: 'sub_123',
        status: 'active',
        plan: {
          slug: 'starter',
          name: 'Starter',
          priceMonthlyBrl: { toString: () => '49.90' },
        },
      },
    };

    (mockPrisma.client.organization.findUnique as jest.Mock).mockResolvedValue(org);
    mockSubscriptionsRetrieve.mockResolvedValue({
      current_period_end: futureDateTimestamp,
      cancel_at_period_end: false,
    });

    const result = await useCase.execute({ organizationId: 'org-1' });

    expect(result.plan.slug).toBe('starter');
    expect(result.status).toBe('active');
    expect(result.cancelAtPeriodEnd).toBe(false);
    expect(result.nextBillingDate).toBeDefined();
  });

  it('includes cancel_at_period_end when subscription is marked for cancellation', async () => {
    const futureDate = new Date();
    futureDate.setMonth(futureDate.getMonth() + 1);
    const futureDateTimestamp = Math.floor(futureDate.getTime() / 1000);

    const org = {
      id: 'org-1',
      activeSubscription: {
        stripeSubscriptionId: 'sub_123',
        status: 'active',
        plan: {
          slug: 'starter',
          name: 'Starter',
          priceMonthlyBrl: { toString: () => '49.90' },
        },
      },
    };

    (mockPrisma.client.organization.findUnique as jest.Mock).mockResolvedValue(org);
    mockSubscriptionsRetrieve.mockResolvedValue({
      current_period_end: futureDateTimestamp,
      cancel_at_period_end: true,
    });

    const result = await useCase.execute({ organizationId: 'org-1' });

    expect(result.cancelAtPeriodEnd).toBe(true);
  });

  it('throws NotFoundException when organization does not exist', async () => {
    (mockPrisma.client.organization.findUnique as jest.Mock).mockResolvedValue(null);

    await expect(
      useCase.execute({ organizationId: 'org-not-found' }),
    ).rejects.toThrow(NotFoundException);
  });

  it('throws BadRequestException when organization has no active subscription', async () => {
    const org = {
      id: 'org-1',
      activeSubscription: null,
    };

    (mockPrisma.client.organization.findUnique as jest.Mock).mockResolvedValue(org);

    await expect(useCase.execute({ organizationId: 'org-1' })).rejects.toThrow(
      BadRequestException,
    );
  });

  it('throws BadRequestException when subscription has no stripeSubscriptionId', async () => {
    const org = {
      id: 'org-1',
      activeSubscription: {
        stripeSubscriptionId: null,
      },
    };

    (mockPrisma.client.organization.findUnique as jest.Mock).mockResolvedValue(org);

    await expect(useCase.execute({ organizationId: 'org-1' })).rejects.toThrow(
      BadRequestException,
    );
  });

  it('returns correct plan information', async () => {
    const futureDate = new Date();
    futureDate.setMonth(futureDate.getMonth() + 1);
    const futureDateTimestamp = Math.floor(futureDate.getTime() / 1000);

    const org = {
      id: 'org-1',
      activeSubscription: {
        stripeSubscriptionId: 'sub_123',
        status: 'active',
        plan: {
          slug: 'professional',
          name: 'Professional',
          priceMonthlyBrl: { toString: () => '199.90' },
        },
      },
    };

    (mockPrisma.client.organization.findUnique as jest.Mock).mockResolvedValue(org);
    mockSubscriptionsRetrieve.mockResolvedValue({
      current_period_end: futureDateTimestamp,
      cancel_at_period_end: false,
    });

    const result = await useCase.execute({ organizationId: 'org-1' });

    expect(result.plan).toEqual({
      slug: 'professional',
      name: 'Professional',
      priceMonthlyBrl: '199.90',
    });
  });
});
