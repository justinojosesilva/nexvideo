import { Injectable, Logger, Inject } from '@nestjs/common';
import * as Sentry from '@sentry/nestjs';
import { prisma } from '@nexvideo/database';
import {
  IYouTubeAnalyticsPort,
  AnalyticsFilters,
} from '../../adapters/interfaces/youtube-analytics.port';

const QUOTA_ERROR_SUBSTRING = 'quota';

@Injectable()
export class SyncYoutubeMetricsUseCase {
  private readonly logger = new Logger(SyncYoutubeMetricsUseCase.name);

  constructor(
    @Inject('IYouTubeAnalyticsPort')
    private readonly analytics: IYouTubeAnalyticsPort,
  ) {}

  async execute(): Promise<{ synced: number; failed: number }> {
    const yesterday = this.yesterdayStr();
    const filters: AnalyticsFilters = { startDate: yesterday, endDate: yesterday };

    const connectedOrgs = await prisma.youtubeOAuthToken.findMany({
      select: { organizationId: true },
    });

    this.logger.log(
      { count: connectedOrgs.length, date: yesterday },
      'Starting YouTube metrics sync',
    );

    let synced = 0;
    let failed = 0;

    for (const { organizationId } of connectedOrgs) {
      try {
        const metrics = await this.analytics.getMetrics(organizationId, filters);

        // Persist for every active project of this org
        const projects = await prisma.contentProject.findMany({
          where: { organizationId },
          select: { id: true },
        });

        if (projects.length === 0) {
          this.logger.log({ organizationId }, 'No projects found — skipping');
          continue;
        }

        await prisma.$transaction(
          projects.map((p) =>
            prisma.videoPerformance.create({
              data: {
                projectId: p.id,
                recordedAt: new Date(yesterday),
                views: metrics.views,
                watchTime: metrics.watchTimeSeconds,
                ctr: metrics.ctr,
                impressions: metrics.impressions,
              },
            }),
          ),
        );

        this.logger.log(
          { organizationId, projects: projects.length, ...metrics },
          'Metrics synced',
        );
        synced++;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        const isQuota = message.toLowerCase().includes(QUOTA_ERROR_SUBSTRING);

        this.logger.warn(
          { organizationId, isQuota, err: message },
          'Metrics sync failed for org',
        );

        Sentry.withScope((scope) => {
          scope.setTag('organizationId', organizationId);
          scope.setTag('quota_error', String(isQuota));
          Sentry.captureException(err);
        });

        failed++;

        // Re-throw quota errors so BullMQ applies exponential backoff
        if (isQuota) throw err;
      }
    }

    this.logger.log({ synced, failed }, 'YouTube metrics sync complete');
    return { synced, failed };
  }

  private yesterdayStr(): string {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().slice(0, 10);
  }
}
