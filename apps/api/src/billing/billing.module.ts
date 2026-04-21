import { Module } from '@nestjs/common';
import { BillingController } from './billing.controller';
import { CreateCheckoutSessionUseCase } from './use-cases/create-checkout-session.use-case';
import { HandleStripeWebhookUseCase } from './use-cases/handle-stripe-webhook.use-case';
import { GetPlansUseCase } from './use-cases/get-plans.use-case';
import { GetSubscriptionUseCase } from './use-cases/get-subscription.use-case';
import { CreatePortalSessionUseCase } from './use-cases/create-portal-session.use-case';
import { GetBillingStatusUseCase } from './use-cases/get-billing-status.use-case';
import { CheckUsageThresholdUseCase } from './use-cases/check-usage-threshold.use-case';
import { PrismaModule } from '../prisma/prisma.module';
import { CacheModule } from '../cache/cache.module';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [PrismaModule, CacheModule, EmailModule],
  controllers: [BillingController],
  providers: [
    CreateCheckoutSessionUseCase,
    HandleStripeWebhookUseCase,
    GetPlansUseCase,
    GetSubscriptionUseCase,
    CreatePortalSessionUseCase,
    GetBillingStatusUseCase,
    CheckUsageThresholdUseCase,
  ],
  exports: [CheckUsageThresholdUseCase],
})
export class BillingModule {}
