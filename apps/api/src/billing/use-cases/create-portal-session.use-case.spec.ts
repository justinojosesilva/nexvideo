const mockPrisma = {
  client: {
    organization: {
      findUnique: jest.fn(),
    },
  },
};

const mockSubscriptionsRetrieve = jest.fn();
const mockBillingPortalSessionsCreate = jest.fn();

jest.mock('../../prisma/prisma.service', () => ({
  PrismaService: jest.fn(() => mockPrisma),
}));

jest.mock('stripe', () => {
  const MockStripe = jest.fn().mockImplementation(() => ({
    subscriptions: { retrieve: mockSubscriptionsRetrieve },
    billingPortal: { sessions: { create: mockBillingPortalSessionsCreate } },
  }));
  return { __esModule: true, default: MockStripe };
});

import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CreatePortalSessionUseCase } from './create-portal-session.use-case';

describe('CreatePortalSessionUseCase', () => {
  let useCase: CreatePortalSessionUseCase;
  let configService: ConfigService;

  beforeEach(() => {
    jest.clearAllMocks();
    configService = {
      getOrThrow: jest.fn((key: string) => {
        if (key === 'STRIPE_SECRET_KEY') return 'sk_test_123';
        if (key === 'STRIPE_PORTAL_RETURN_URL') return 'https://example.com/billing';
        throw new Error(`Unknown config key: ${key}`);
      }),
    } as any;
    useCase = new CreatePortalSessionUseCase(configService, mockPrisma as any);
  });

  it('creates portal session for organization with active subscription', async () => {
    const org = {
      id: 'org-1',
      activeSubscription: {
        stripeSubscriptionId: 'sub_123',
      },
    };

    (mockPrisma.client.organization.findUnique as jest.Mock).mockResolvedValue(org);
    mockSubscriptionsRetrieve.mockResolvedValue({
      customer: 'cus_123',
    });
    mockBillingPortalSessionsCreate.mockResolvedValue({
      url: 'https://billing.stripe.com/session/test',
    });

    const result = await useCase.execute({ organizationId: 'org-1' });

    expect(result.portalUrl).toBe('https://billing.stripe.com/session/test');
    expect(mockBillingPortalSessionsCreate).toHaveBeenCalledWith({
      customer: 'cus_123',
      return_url: 'https://example.com/billing',
    });
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

  it('handles customer as object (nested customer id)', async () => {
    const org = {
      id: 'org-1',
      activeSubscription: {
        stripeSubscriptionId: 'sub_123',
      },
    };

    (mockPrisma.client.organization.findUnique as jest.Mock).mockResolvedValue(org);
    mockSubscriptionsRetrieve.mockResolvedValue({
      customer: { id: 'cus_456' },
    });
    mockBillingPortalSessionsCreate.mockResolvedValue({
      url: 'https://billing.stripe.com/session/test',
    });

    const result = await useCase.execute({ organizationId: 'org-1' });

    expect(result.portalUrl).toBe('https://billing.stripe.com/session/test');
    expect(mockBillingPortalSessionsCreate).toHaveBeenCalledWith({
      customer: 'cus_456',
      return_url: 'https://example.com/billing',
    });
  });

  it('throws BadRequestException when no Stripe customer found', async () => {
    const org = {
      id: 'org-1',
      activeSubscription: {
        stripeSubscriptionId: 'sub_123',
      },
    };

    (mockPrisma.client.organization.findUnique as jest.Mock).mockResolvedValue(org);
    mockSubscriptionsRetrieve.mockResolvedValue({
      customer: null,
    });

    await expect(useCase.execute({ organizationId: 'org-1' })).rejects.toThrow(
      BadRequestException,
    );
  });

  it('throws BadRequestException when portal session creation fails', async () => {
    const org = {
      id: 'org-1',
      activeSubscription: {
        stripeSubscriptionId: 'sub_123',
      },
    };

    (mockPrisma.client.organization.findUnique as jest.Mock).mockResolvedValue(org);
    mockSubscriptionsRetrieve.mockResolvedValue({
      customer: 'cus_123',
    });
    mockBillingPortalSessionsCreate.mockResolvedValue({
      url: null,
    });

    await expect(useCase.execute({ organizationId: 'org-1' })).rejects.toThrow(
      BadRequestException,
    );
  });
});
