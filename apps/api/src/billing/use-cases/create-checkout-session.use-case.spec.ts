import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

// Mock PrismaService before import
const mockPrismaService = {
  client: {
    plan: {
      findUnique: jest.fn(),
    },
  },
};

jest.mock('../../prisma/prisma.service', () => ({
  PrismaService: jest.fn(() => mockPrismaService),
}));

// Mock Stripe before import
const mockStripeSessionCreate = jest.fn();

jest.mock('stripe', () => {
  const MockStripe = jest.fn().mockImplementation(() => ({
    checkout: {
      sessions: {
        create: mockStripeSessionCreate,
      },
    },
  }));
  return { __esModule: true, default: MockStripe };
});

import { CreateCheckoutSessionUseCase } from './create-checkout-session.use-case';

describe('CreateCheckoutSessionUseCase', () => {
  let useCase: CreateCheckoutSessionUseCase;
  let configService: ConfigService;

  beforeEach(() => {
    jest.clearAllMocks();

    configService = {
      getOrThrow: jest.fn((key: string) => {
        const map: Record<string, string> = {
          STRIPE_SECRET_KEY: 'sk_test_secret',
          STRIPE_SUCCESS_URL: 'https://nexvideo.com/success',
          STRIPE_CANCEL_URL: 'https://nexvideo.com/cancel',
        };
        return map[key];
      }),
    } as any;

    useCase = new CreateCheckoutSessionUseCase(
      configService,
      mockPrismaService as any,
    );
  });

  it('should throw BadRequestException for free tier', async () => {
    await expect(
      useCase.execute({
        planSlug: 'free',
        organizationId: 'org-123',
        customerEmail: 'user@example.com',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('should throw BadRequestException when plan is not found', async () => {
    (mockPrismaService.client.plan.findUnique as jest.Mock).mockResolvedValueOnce(null);

    await expect(
      useCase.execute({
        planSlug: 'unknown-plan',
        organizationId: 'org-123',
        customerEmail: 'user@example.com',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('should create Stripe session with correct fields for starter plan', async () => {
    (mockPrismaService.client.plan.findUnique as jest.Mock).mockResolvedValueOnce({
      id: 'plan-starter',
      slug: 'starter',
      name: 'Starter',
      priceMonthlyBrl: '49.90',
    });

    mockStripeSessionCreate.mockResolvedValueOnce({
      url: 'https://checkout.stripe.com/pay/cs_test_starter',
    });

    const result = await useCase.execute({
      planSlug: 'starter',
      organizationId: 'org-123',
      customerEmail: 'user@example.com',
    });

    expect(result).toEqual({ checkoutUrl: 'https://checkout.stripe.com/pay/cs_test_starter' });

    expect(mockStripeSessionCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: 'subscription',
        customer_email: 'user@example.com',
        metadata: { organizationId: 'org-123', planId: 'plan-starter' },
        success_url: 'https://nexvideo.com/success',
        cancel_url: 'https://nexvideo.com/cancel',
        line_items: [
          expect.objectContaining({
            price_data: expect.objectContaining({
              currency: 'brl',
              unit_amount: 4990,
              recurring: { interval: 'month' },
              product_data: { name: 'Starter' },
            }),
            quantity: 1,
          }),
        ],
      }),
    );
  });

  it('should create Stripe session with correct unit_amount for creator plan', async () => {
    (mockPrismaService.client.plan.findUnique as jest.Mock).mockResolvedValueOnce({
      id: 'plan-creator',
      slug: 'creator',
      name: 'Creator',
      priceMonthlyBrl: '99.90',
    });

    mockStripeSessionCreate.mockResolvedValueOnce({
      url: 'https://checkout.stripe.com/pay/cs_test_creator',
    });

    const result = await useCase.execute({
      planSlug: 'creator',
      organizationId: 'org-456',
      customerEmail: 'creator@example.com',
    });

    expect(result).toEqual({ checkoutUrl: 'https://checkout.stripe.com/pay/cs_test_creator' });

    const call = mockStripeSessionCreate.mock.calls[0][0];
    expect(call.line_items[0].price_data.unit_amount).toBe(9990);
    expect(call.metadata.organizationId).toBe('org-456');
  });

  it('should throw BadRequestException when Stripe returns no URL', async () => {
    (mockPrismaService.client.plan.findUnique as jest.Mock).mockResolvedValueOnce({
      id: 'plan-starter',
      slug: 'starter',
      name: 'Starter',
      priceMonthlyBrl: '49.90',
    });

    mockStripeSessionCreate.mockResolvedValueOnce({ url: null });

    await expect(
      useCase.execute({
        planSlug: 'starter',
        organizationId: 'org-123',
        customerEmail: 'user@example.com',
      }),
    ).rejects.toThrow(BadRequestException);
  });
});
