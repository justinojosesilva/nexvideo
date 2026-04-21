import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SendUsageWarningEmailUseCase } from '../../email/use-cases/send-usage-warning-email.use-case';

const USAGE_WARNING_THRESHOLD = 0.8;
const NOTIFICATION_TYPE = 'usage_warning_80';

export interface CheckUsageThresholdInput {
  organizationId: string;
}

@Injectable()
export class CheckUsageThresholdUseCase {
  private readonly logger = new Logger(CheckUsageThresholdUseCase.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly sendUsageWarningEmail: SendUsageWarningEmailUseCase,
  ) {}

  async execute(input: CheckUsageThresholdInput): Promise<void> {
    const { organizationId } = input;

    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const org = await this.prisma.client.organization.findUnique({
      where: { id: organizationId },
      include: {
        activeSubscription: { include: { plan: true } },
        users: { select: { email: true, name: true }, take: 1, orderBy: { createdAt: 'asc' } },
        usageLogs: { where: { month: currentMonth }, take: 1 },
      },
    });

    if (!org) return;

    const usageLog = org.usageLogs[0];
    if (!usageLog) return;

    const plan = org.activeSubscription?.plan;
    if (!plan) return;

    const limits = {
      scripts: plan.scriptLimit,
      narrations: plan.narrationLimit,
      exports: plan.exportLimit,
    };

    const percents = Object.entries(limits)
      .filter(([, limit]) => limit !== null && limit > 0)
      .map(([key, limit]) => {
        const used = usageLog[key as keyof typeof usageLog] as number;
        return (used / (limit as number)) * 100;
      });

    if (percents.length === 0) return;

    const maxPercent = Math.max(...percents);

    if (maxPercent < USAGE_WARNING_THRESHOLD * 100) return;

    const dedupeKey = `usage:${organizationId}:${currentMonth}`;

    // Check if notification was already sent this billing cycle
    const existing = await this.prisma.client.billingNotification.findUnique({
      where: { invoiceId_type: { invoiceId: dedupeKey, type: NOTIFICATION_TYPE } },
    });

    if (existing) return;

    // Record notification first to prevent race-condition double-send
    try {
      await this.prisma.client.billingNotification.create({
        data: { organizationId, invoiceId: dedupeKey, type: NOTIFICATION_TYPE },
      });
    } catch {
      // Unique constraint violation = another process already sent — skip
      return;
    }

    const adminUser = org.users[0];
    if (!adminUser) {
      this.logger.warn(`No admin user found for org ${organizationId}, skipping usage warning email`);
      return;
    }

    this.logger.log(`Sending usage warning email to ${adminUser.email} (${Math.round(maxPercent)}% used)`);

    await this.sendUsageWarningEmail.execute({
      userName: adminUser.name,
      userEmail: adminUser.email,
      organizationName: org.name,
      maxPercent: Math.round(maxPercent),
    });
  }
}
