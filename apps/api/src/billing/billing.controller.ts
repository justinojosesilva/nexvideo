import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiBearerAuth,
} from '@nestjs/swagger';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { type JwtPayload } from '../auth/strategies/jwt.strategy';
import { CreateCheckoutSessionUseCase } from './use-cases/create-checkout-session.use-case';
import { HandleStripeWebhookUseCase } from './use-cases/handle-stripe-webhook.use-case';
import { GetPlansUseCase } from './use-cases/get-plans.use-case';
import { GetSubscriptionUseCase } from './use-cases/get-subscription.use-case';
import { CreatePortalSessionUseCase } from './use-cases/create-portal-session.use-case';
import { GetBillingStatusUseCase } from './use-cases/get-billing-status.use-case';
import { GetUsageHistoryUseCase } from './use-cases/get-usage-history.use-case';
import type { UsageHistoryResult } from './usage-history';
import { CreateCheckoutSessionDto } from './dto/create-checkout-session.dto';
import { GetPlansResponse } from './dto/get-plans.dto';
import { GetSubscriptionResponse } from './dto/get-subscription.dto';
import { GetBillingStatusResponse } from './dto/get-billing-status.dto';

@ApiTags('billing')
@Controller('billing')
export class BillingController {
  constructor(
    private readonly createCheckoutSessionUseCase: CreateCheckoutSessionUseCase,
    private readonly handleStripeWebhookUseCase: HandleStripeWebhookUseCase,
    private readonly getPlansUseCase: GetPlansUseCase,
    private readonly getSubscriptionUseCase: GetSubscriptionUseCase,
    private readonly createPortalSessionUseCase: CreatePortalSessionUseCase,
    private readonly getBillingStatusUseCase: GetBillingStatusUseCase,
    private readonly getUsageHistoryUseCase: GetUsageHistoryUseCase,
  ) {}

  @Get('usage-history')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get monthly usage history for the current organization',
    description:
      'Returns dense monthly usage (scripts, narrations, exports) for the last N months. ' +
      'Missing months are zero-filled so the timeline is continuous.',
  })
  @ApiResponse({ status: 200, description: 'Usage history per month + totals' })
  async getUsageHistory(
    @CurrentUser() user: JwtPayload | undefined,
    @Query('months', new ParseIntPipe({ optional: true })) months?: number,
  ): Promise<UsageHistoryResult> {
    if (!user) {
      throw new Error('User not authenticated');
    }
    return this.getUsageHistoryUseCase.execute({
      organizationId: user.organizationId,
      months,
    });
  }

  @Post('checkout')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create Stripe Checkout Session',
    description: 'Creates a Stripe Checkout Session for the chosen plan and returns the checkout URL',
  })
  @ApiResponse({
    status: 201,
    description: 'Checkout session created',
    schema: {
      example: { checkoutUrl: 'https://checkout.stripe.com/pay/cs_test_...' },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request — free tier or unknown plan',
    schema: {
      example: {
        message: 'Free tier does not require a checkout session',
        error: 'Bad Request',
        statusCode: 400,
      },
    },
  })
  async createCheckoutSession(
    @Body() dto: CreateCheckoutSessionDto,
    @CurrentUser() user: JwtPayload | undefined,
  ): Promise<{ checkoutUrl: string }> {
    if (!user) {
      throw new Error('User not authenticated');
    }

    return this.createCheckoutSessionUseCase.execute({
      planSlug: dto.planSlug,
      organizationId: user.organizationId,
      customerEmail: user.email,
    });
  }

  @Post('webhook')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Stripe Webhook',
    description: 'Receives and processes Stripe webhook events for subscription lifecycle management',
  })
  @ApiResponse({ status: 200, description: 'Event processed' })
  @ApiResponse({ status: 400, description: 'Invalid Stripe signature' })
  async handleWebhook(
    @Headers('stripe-signature') signature: string,
    @Req() request: RawBodyRequest<Request>,
  ): Promise<void> {
    await this.handleStripeWebhookUseCase.execute({
      rawBody: request.rawBody!,
      signature,
    });
  }

  @Get('plans')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'List Available Plans',
    description: 'Returns a list of all available plans with their limits and pricing (cached for 5 minutes)',
  })
  @ApiResponse({
    status: 200,
    description: 'Plans list retrieved',
    schema: {
      example: {
        plans: [
          {
            slug: 'free',
            name: 'Free',
            priceMonthlyBrl: '0',
            limits: { scripts: 5, narrations: 5, exports: 3 },
          },
          {
            slug: 'starter',
            name: 'Starter',
            priceMonthlyBrl: '49.90',
            limits: { scripts: 30, narrations: 30, exports: 20 },
          },
        ],
      },
    },
  })
  async getPlans(): Promise<GetPlansResponse> {
    return this.getPlansUseCase.execute();
  }

  @Get('subscription')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get Current Subscription',
    description: 'Returns the current organization subscription plan, usage, limits, and percent used',
  })
  @ApiResponse({
    status: 200,
    description: 'Subscription retrieved',
    schema: {
      example: {
        plan: {
          slug: 'starter',
          name: 'Starter',
          priceMonthlyBrl: '49.90',
        },
        usage: { scripts: 15, narrations: 10, exports: 5 },
        limits: { scripts: 30, narrations: 30, exports: 20 },
        percentUsed: { scripts: 50, narrations: 33, exports: 25 },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Organization or plan not found' })
  async getSubscription(
    @CurrentUser() user: JwtPayload | undefined,
  ): Promise<GetSubscriptionResponse> {
    if (!user) {
      throw new Error('User not authenticated');
    }

    return this.getSubscriptionUseCase.execute({
      organizationId: user.organizationId,
    });
  }

  @Post('portal')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create Stripe Billing Portal Session',
    description: 'Creates a Stripe Billing Portal session for managing subscription, payment methods, and cancellation',
  })
  @ApiResponse({
    status: 201,
    description: 'Portal session created',
    schema: {
      example: { portalUrl: 'https://billing.stripe.com/session/...' },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request — no active subscription',
    schema: {
      example: {
        message: 'Organization does not have an active subscription',
        error: 'Bad Request',
        statusCode: 400,
      },
    },
  })
  async createPortalSession(
    @CurrentUser() user: JwtPayload | undefined,
  ): Promise<{ portalUrl: string }> {
    if (!user) {
      throw new Error('User not authenticated');
    }

    return this.createPortalSessionUseCase.execute({
      organizationId: user.organizationId,
    });
  }

  @Get('status')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get Billing Status',
    description: 'Returns the current billing status including plan, subscription status, next billing date, and cancellation flag',
  })
  @ApiResponse({
    status: 200,
    description: 'Billing status retrieved',
    schema: {
      example: {
        plan: {
          slug: 'starter',
          name: 'Starter',
          priceMonthlyBrl: '49.90',
        },
        status: 'active',
        nextBillingDate: '2026-05-13T10:00:00.000Z',
        cancelAtPeriodEnd: false,
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request — no active subscription',
  })
  async getBillingStatus(
    @CurrentUser() user: JwtPayload | undefined,
  ): Promise<GetBillingStatusResponse> {
    if (!user) {
      throw new Error('User not authenticated');
    }

    return this.getBillingStatusUseCase.execute({
      organizationId: user.organizationId,
    });
  }
}
