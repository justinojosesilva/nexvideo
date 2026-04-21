import {
  CanActivate,
  ExecutionContext,
  Injectable,
  BadRequestException,
  Optional,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';
import { PaymentRequiredException } from '../../common/exceptions/payment-required.exception';
import { CHECK_PLAN_LIMIT_METADATA_KEY } from '../decorators/check-plan-limit.decorator';
import { CheckUsageThresholdUseCase } from '../../billing/use-cases/check-usage-threshold.use-case';

interface CheckPlanLimitMetadata {
  resourceType: 'scripts' | 'narrations' | 'exports';
}

// Plan limits: null means unlimited
const PLAN_LIMITS: Record<string, Record<string, number | null>> = {
  free: {
    scripts: 5,
    narrations: 5,
    exports: 3,
  },
  starter: {
    scripts: 30,
    narrations: 30,
    exports: 20,
  },
  creator: {
    scripts: null,
    narrations: null,
    exports: null,
  },
  professional: {
    scripts: null,
    narrations: null,
    exports: null,
  },
  enterprise: {
    scripts: null,
    narrations: null,
    exports: null,
  },
};

@Injectable()
export class PlanLimitsGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
    @Optional() private readonly checkUsageThreshold: CheckUsageThresholdUseCase | null = null,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Get metadata from decorator
    const metadata = this.reflector.get<CheckPlanLimitMetadata>(
      CHECK_PLAN_LIMIT_METADATA_KEY,
      context.getHandler(),
    );

    // If no metadata, guard passes (protection is optional per-endpoint)
    if (!metadata) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const jwtPayload = request.user;

    if (!jwtPayload?.organizationId) {
      throw new BadRequestException('organizationId not found in JWT');
    }

    const organizationId = jwtPayload.organizationId;
    const resourceType = metadata.resourceType;

    // Get current month in YYYY-MM format
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    // Get organization with active subscription and plan
    const org = await this.prisma.client.organization.findUnique({
      where: { id: organizationId },
      include: {
        activeSubscription: {
          include: {
            plan: true,
          },
        },
      },
    });

    if (!org) {
      throw new BadRequestException(`Organization ${organizationId} not found`);
    }

    // Determine which plan limits to use: subscription plan or legacy plan field
    let planSlug = org.activeSubscription?.plan.slug || 'free';
    let planLimits = PLAN_LIMITS[planSlug];

    if (!planLimits) {
      planLimits = PLAN_LIMITS['free'];
      planSlug = 'free';
    }

    // Get limit for this resource type
    const limit = planLimits[resourceType];

    // Unlimited plans (null limit) always pass
    if (limit === null) {
      return true;
    }

    // Get or create usage log for current month
    let usageLog = await this.prisma.client.usageLog.findUnique({
      where: {
        organizationId_month: {
          organizationId,
          month: currentMonth,
        },
      },
    });

    if (!usageLog) {
      usageLog = await this.prisma.client.usageLog.create({
        data: {
          organizationId,
          month: currentMonth,
          scripts: 0,
          narrations: 0,
          exports: 0,
        },
      });
    }

    // Check if current usage + 1 would exceed limit
    const currentUsage = usageLog[resourceType];

    if (currentUsage >= limit) {
      const planName = this.getPlanName(planSlug);
      throw new PaymentRequiredException({
        message: `Plan limit exceeded for ${resourceType}`,
        limit,
        current: currentUsage,
        planName,
        upgradeUrl: 'https://nexvideo.com/plans',
      });
    }

    // Update usage counter
    await this.prisma.client.usageLog.update({
      where: {
        organizationId_month: {
          organizationId,
          month: currentMonth,
        },
      },
      data: {
        [resourceType]: currentUsage + 1,
      },
    });

    // Fire-and-forget: check if org crossed 80% threshold and send warning email
    void this.checkUsageThreshold?.execute({ organizationId });

    return true;
  }

  private getPlanName(slug: string): string {
    const names: Record<string, string> = {
      free: 'Free',
      starter: 'Starter',
      creator: 'Creator',
      professional: 'Professional',
      enterprise: 'Enterprise',
    };
    return names[slug] || 'Unknown';
  }
}
