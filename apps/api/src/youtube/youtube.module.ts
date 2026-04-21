import { Module, OnApplicationBootstrap, Inject } from '@nestjs/common';
import { Queue } from 'bullmq';
import { YoutubeController } from './youtube.controller';
import { RefreshExpiringTokensUseCase } from './use-cases/refresh-expiring-tokens.use-case';
import { SyncYoutubeMetricsUseCase } from './use-cases/sync-youtube-metrics.use-case';
import { AuthModule } from '../auth/auth.module';
import { AdaptersModule } from '../adapters/adapters.module';
import { JOBS_QUEUE_TOKEN } from '../bullmq/bullmq.module';
import { CacheModule } from '../cache/cache.module';

@Module({
  imports: [AuthModule, CacheModule, AdaptersModule],
  controllers: [YoutubeController],
  providers: [RefreshExpiringTokensUseCase, SyncYoutubeMetricsUseCase],
  exports: [RefreshExpiringTokensUseCase, SyncYoutubeMetricsUseCase],
})
export class YoutubeModule implements OnApplicationBootstrap {
  constructor(
    @Inject(JOBS_QUEUE_TOKEN) private readonly queue: Queue,
  ) {}

  async onApplicationBootstrap() {
    await this.queue.add(
      'youtube:refresh-expiring-tokens',
      {},
      {
        repeat: { every: 5 * 60 * 1000 },
        jobId: 'youtube-token-refresh',
      },
    );

    // Sync YouTube analytics metrics daily at ~06:00 UTC
    await this.queue.add(
      'youtube:sync-metrics',
      {},
      {
        repeat: { every: 6 * 60 * 60 * 1000 }, // every 6 hours
        jobId: 'youtube-metrics-sync',
        attempts: 5,
        backoff: { type: 'exponential', delay: 60_000 }, // 1min, 2min, 4min, 8min, 16min
      },
    );
  }
}
