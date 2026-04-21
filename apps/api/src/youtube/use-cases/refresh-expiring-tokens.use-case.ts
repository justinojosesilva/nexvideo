import { Injectable, Logger } from '@nestjs/common';
import { prisma } from '@nexvideo/database';
import { YoutubeOAuthService } from '../../auth/services/youtube-oauth.service';

@Injectable()
export class RefreshExpiringTokensUseCase {
  private readonly logger = new Logger(RefreshExpiringTokensUseCase.name);

  constructor(private readonly youtubeOAuth: YoutubeOAuthService) {}

  /**
   * Finds all YouTube OAuth tokens expiring within `windowMinutes` and proactively
   * refreshes them. Called by the BullMQ repeatable job.
   */
  async execute(windowMinutes = 10): Promise<{ refreshed: number; failed: number }> {
    const threshold = new Date(Date.now() + windowMinutes * 60_000);

    const expiring = await prisma.youtubeOAuthToken.findMany({
      where: { expiresAt: { lte: threshold } },
      select: { organizationId: true, refreshToken: true },
    });

    let refreshed = 0;
    let failed = 0;

    for (const record of expiring) {
      try {
        await this.youtubeOAuth.refreshAccessToken(
          record.organizationId,
          record.refreshToken,
        );
        refreshed++;
      } catch (err) {
        this.logger.warn(
          `Auto-refresh failed for org ${record.organizationId}: ${(err as Error).message}`,
        );
        failed++;
      }
    }

    if (expiring.length > 0) {
      this.logger.log(
        `Token auto-refresh complete: ${refreshed} refreshed, ${failed} failed`,
      );
    }

    return { refreshed, failed };
  }
}
