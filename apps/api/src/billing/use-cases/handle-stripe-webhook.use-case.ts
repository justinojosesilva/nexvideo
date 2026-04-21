import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { PrismaService } from '../../prisma/prisma.service';
import { SendPaymentFailedEmailUseCase } from '../../email/use-cases/send-payment-failed-email.use-case';
import { SendCancellationWarningEmailUseCase } from '../../email/use-cases/send-cancellation-warning-email.use-case';

interface HandleStripeWebhookInput {
  rawBody: Buffer;
  signature: string;
}

// Stripe v22 webhook event shape
interface StripeWebhookEvent {
  id: string;
  type: string;
  data: { object: Record<string, any> };
}

@Injectable()
export class HandleStripeWebhookUseCase {
  private readonly logger = new Logger(HandleStripeWebhookUseCase.name);
  private stripe: InstanceType<typeof Stripe>;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly sendPaymentFailedEmail: SendPaymentFailedEmailUseCase,
    private readonly sendCancellationWarningEmail: SendCancellationWarningEmailUseCase,
  ) {
    this.stripe = new Stripe(this.config.getOrThrow<string>('STRIPE_SECRET_KEY'));
  }

  async execute(input: HandleStripeWebhookInput): Promise<void> {
    const { rawBody, signature } = input;
    const webhookSecret = this.config.getOrThrow<string>('STRIPE_WEBHOOK_SECRET');

    let event: StripeWebhookEvent;
    try {
      event = this.stripe.webhooks.constructEvent(
        rawBody,
        signature,
        webhookSecret,
      ) as unknown as StripeWebhookEvent;
    } catch (err) {
      throw new BadRequestException(
        `Webhook signature verification failed: ${(err as Error).message}`,
      );
    }

    // Event-level idempotency: skip if this event ID was already processed
    const alreadyProcessed = await this.prisma.client.stripeWebhookEvent.findUnique({
      where: { stripeEventId: event.id },
    });
    if (alreadyProcessed) {
      this.logger.log(`Skipping duplicate Stripe event ${event.id} (${event.type})`);
      return;
    }
    await this.prisma.client.stripeWebhookEvent.create({
      data: { stripeEventId: event.id, type: event.type },
    });

    const obj = event.data.object;

    switch (event.type) {
      case 'checkout.session.completed':
        await this.handleCheckoutSessionCompleted(obj);
        break;
      case 'customer.subscription.updated':
        await this.handleSubscriptionUpdated(obj);
        break;
      case 'customer.subscription.deleted':
        await this.handleSubscriptionDeleted(obj);
        break;
      case 'invoice.payment_failed':
        await this.handleInvoicePaymentFailed(obj);
        break;
      default:
        break;
    }
  }

  private async handleCheckoutSessionCompleted(
    session: Record<string, any>,
  ): Promise<void> {
    const organizationId = session.metadata?.organizationId as string | undefined;
    const planId = session.metadata?.planId as string | undefined;

    if (!organizationId || !planId) return;

    const rawSub = session.subscription;
    const stripeSubscriptionId: string | undefined =
      typeof rawSub === 'string' ? rawSub : rawSub?.id;

    if (!stripeSubscriptionId) return;

    const stripeSub = await this.stripe.subscriptions.retrieve(stripeSubscriptionId);
    const currentPeriodEnd = new Date(
      (stripeSub as any).current_period_end * 1000,
    );

    // Idempotency: check if a Subscription already exists for this Stripe subscription
    const existingSubscription = await this.prisma.client.subscription.findFirst({
      where: { stripeSubscriptionId },
    });

    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const plan = await this.prisma.client.plan.findUnique({ where: { id: planId } });
    if (!plan) return;

    if (existingSubscription) {
      await this.prisma.client.subscription.update({
        where: { id: existingSubscription.id },
        data: { status: 'active', currentPeriodEnd },
      });
    } else {
      const newSubscription = await this.prisma.client.subscription.create({
        data: {
          organizationId,
          planId: plan.id,
          status: 'active',
          stripeSubscriptionId,
          currentPeriodEnd,
        },
      });

      await this.prisma.client.organization.update({
        where: { id: organizationId },
        data: {
          subscriptionId: newSubscription.id,
          plan: plan.slug as any,
        },
      });
    }

    // Zero usage log for the new billing period (create or reset)
    await this.prisma.client.usageLog.upsert({
      where: { organizationId_month: { organizationId, month: currentMonth } },
      update: { scripts: 0, narrations: 0, exports: 0 },
      create: { organizationId, month: currentMonth, scripts: 0, narrations: 0, exports: 0 },
    });
  }

  private async handleSubscriptionUpdated(
    stripeSub: Record<string, any>,
  ): Promise<void> {
    const statusMap: Record<string, string> = {
      active: 'active',
      past_due: 'past_due',
      unpaid: 'past_due',
      canceled: 'cancelled',
      incomplete: 'inactive',
      incomplete_expired: 'inactive',
      trialing: 'trialing',
      paused: 'inactive',
    };

    const status = statusMap[stripeSub.status as string] ?? 'inactive';
    const currentPeriodEnd = new Date(stripeSub.current_period_end * 1000);

    await this.prisma.client.subscription.updateMany({
      where: { stripeSubscriptionId: stripeSub.id as string },
      data: { status: status as any, currentPeriodEnd },
    });

    // Check if approaching cancellation and send warning email
    await this.handleSubscriptionCancellationWarning(stripeSub);
  }

  private async handleSubscriptionDeleted(
    stripeSub: Record<string, any>,
  ): Promise<void> {
    const subscription = await this.prisma.client.subscription.findFirst({
      where: { stripeSubscriptionId: stripeSub.id as string },
    });

    if (!subscription) return;

    await this.prisma.client.subscription.update({
      where: { id: subscription.id },
      data: { status: 'cancelled' },
    });

    await this.prisma.client.organization.update({
      where: { id: subscription.organizationId },
      data: { plan: 'free', subscriptionId: null },
    });
  }

  private async handleInvoicePaymentFailed(
    invoice: Record<string, any>,
  ): Promise<void> {
    const rawSub = invoice.subscription;
    const stripeSubscriptionId: string | undefined =
      typeof rawSub === 'string' ? rawSub : rawSub?.id;

    if (!stripeSubscriptionId) return;

    await this.prisma.client.subscription.updateMany({
      where: { stripeSubscriptionId },
      data: { status: 'past_due' },
    });

    // Send billing alert email with idempotency per invoiceId
    const invoiceId = invoice.id as string | undefined;
    if (!invoiceId) return;

    const alreadyNotified = await this.prisma.client.billingNotification.findUnique({
      where: { invoiceId_type: { invoiceId, type: 'payment_failed' } },
    });

    if (alreadyNotified) return;

    // Fetch organization owner email
    const subscription = await this.prisma.client.subscription.findFirst({
      where: { stripeSubscriptionId },
      include: {
        organization: {
          include: {
            users: {
              where: { role: 'admin' },
              orderBy: { createdAt: 'asc' },
              take: 1,
              select: { email: true },
            },
          },
        },
      },
    });

    if (!subscription?.organization) return;

    const ownerEmail = subscription.organization.users[0]?.email;
    if (!ownerEmail) return;

    // Parse invoice amounts
    const amountCents = (invoice.amount_due as number) ?? 0;
    const nextRetryTimestamp = invoice.next_payment_attempt as number | null;
    const nextRetryAt = nextRetryTimestamp ? new Date(nextRetryTimestamp * 1000) : null;

    const appUrl = this.config.getOrThrow<string>('APP_URL');
    const billingPortalUrl = `${appUrl}/dashboard/billing`;

    // Mark as notified before sending to guarantee idempotency
    await this.prisma.client.billingNotification.create({
      data: {
        organizationId: subscription.organizationId,
        invoiceId,
        type: 'payment_failed',
      },
    });

    void this.sendPaymentFailedEmail.execute({
      userEmail: ownerEmail,
      organizationName: subscription.organization.name,
      amountCents,
      nextRetryAt,
      billingPortalUrl,
    });
  }

  private async handleSubscriptionCancellationWarning(
    stripeSub: Record<string, any>,
  ): Promise<void> {
    // Only act when cancelAtPeriodEnd is true and within the 3-day window
    if (!stripeSub.cancel_at_period_end) return;

    const cancelAt = new Date((stripeSub.cancel_at ?? stripeSub.current_period_end) * 1000);
    const now = new Date();
    const daysUntilCancel = (cancelAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);

    if (daysUntilCancel > 3 || daysUntilCancel < 0) return;

    // Idempotency key: stripeSubscriptionId + "cancellation_warning"
    const invoiceId = `sub_${stripeSub.id as string}_cancel_warning`;

    const alreadyNotified = await this.prisma.client.billingNotification.findUnique({
      where: { invoiceId_type: { invoiceId, type: 'cancellation_warning' } },
    });

    if (alreadyNotified) return;

    const subscription = await this.prisma.client.subscription.findFirst({
      where: { stripeSubscriptionId: stripeSub.id as string },
      include: {
        organization: {
          include: {
            users: {
              where: { role: 'admin' },
              orderBy: { createdAt: 'asc' },
              take: 1,
              select: { email: true },
            },
          },
        },
      },
    });

    if (!subscription?.organization) return;

    const ownerEmail = subscription.organization.users[0]?.email;
    if (!ownerEmail) return;

    const appUrl = this.config.getOrThrow<string>('APP_URL');
    const billingPortalUrl = `${appUrl}/dashboard/billing`;

    await this.prisma.client.billingNotification.create({
      data: {
        organizationId: subscription.organizationId,
        invoiceId,
        type: 'cancellation_warning',
      },
    });

    void this.sendCancellationWarningEmail.execute({
      userEmail: ownerEmail,
      organizationName: subscription.organization.name,
      cancellationAt: cancelAt,
      billingPortalUrl,
    });
  }
}
