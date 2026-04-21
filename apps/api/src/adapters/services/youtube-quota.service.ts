import { Injectable, Inject, Logger, Optional } from '@nestjs/common';
import Redis from 'ioredis';

export const YOUTUBE_QUOTA_UNITS = {
  // Data API v3 — https://developers.google.com/youtube/v3/determine_quota_cost
  SEARCH_LIST: 100,
  VIDEOS_LIST: 1,
  CHANNELS_LIST: 1,
  PLAYLIST_ITEMS_LIST: 1,
  // OAuth (YouTube Data API v3 write ops)
  VIDEOS_INSERT: 1600,
  VIDEOS_UPDATE: 50,
  VIDEOS_DELETE: 50,
} as const;

export type QuotaOperation = keyof typeof YOUTUBE_QUOTA_UNITS;

export interface QuotaStatus {
  date: string;
  usedUnits: number;
  dailyLimit: number;
  remainingUnits: number;
  usagePercent: number;
  resetAtUtc: string;
}

@Injectable()
export class YoutubeQuotaService {
  private readonly logger = new Logger(YoutubeQuotaService.name);

  // YouTube quota resets at midnight Pacific Time (UTC-7 or UTC-8)
  // Using 08:00 UTC as the safe daily reset point (covers both PT and PDT)
  private static readonly RESET_HOUR_UTC = 8;
  private static readonly DEFAULT_DAILY_LIMIT = 10_000;

  constructor(
    @Optional() @Inject('REDIS_INSTANCE') private readonly redis: Redis | null,
  ) {}

  async track(operation: QuotaOperation, count = 1): Promise<void> {
    if (!this.redis) return;

    const units = YOUTUBE_QUOTA_UNITS[operation] * count;
    const key = this.getTodayKey();

    try {
      const pipeline = this.redis.pipeline();
      pipeline.incrby(key, units);
      // Keep key for 2 days to cover timezone edge cases
      pipeline.expire(key, 2 * 24 * 60 * 60);
      await pipeline.exec();
    } catch (err) {
      // Non-critical — never block the request
      this.logger.warn(`Failed to track quota: ${err}`);
    }
  }

  async getStatus(dailyLimit = YoutubeQuotaService.DEFAULT_DAILY_LIMIT): Promise<QuotaStatus> {
    const key = this.getTodayKey();
    const date = this.getTodayDate();

    let usedUnits = 0;

    if (this.redis) {
      try {
        const raw = await this.redis.get(key);
        usedUnits = raw ? parseInt(raw, 10) : 0;
      } catch (err) {
        this.logger.warn(`Failed to read quota: ${err}`);
      }
    }

    const remainingUnits = Math.max(0, dailyLimit - usedUnits);
    const usagePercent = Math.min(100, Math.round((usedUnits / dailyLimit) * 100));
    const resetAtUtc = this.getNextResetIso();

    return { date, usedUnits, dailyLimit, remainingUnits, usagePercent, resetAtUtc };
  }

  private getTodayDate(): string {
    // Compute current date in Pacific Time to align with YouTube quota day
    const now = new Date();
    const ptOffsetMs = (now.getUTCHours() < YoutubeQuotaService.RESET_HOUR_UTC ? -1 : 0) * 24 * 60 * 60 * 1000;
    const ptNow = new Date(now.getTime() + ptOffsetMs);
    return ptNow.toISOString().slice(0, 10);
  }

  private getTodayKey(): string {
    return `youtube:quota:${this.getTodayDate()}`;
  }

  private getNextResetIso(): string {
    const now = new Date();
    const nextReset = new Date(now);
    nextReset.setUTCHours(YoutubeQuotaService.RESET_HOUR_UTC, 0, 0, 0);
    if (now.getUTCHours() >= YoutubeQuotaService.RESET_HOUR_UTC) {
      nextReset.setUTCDate(nextReset.getUTCDate() + 1);
    }
    return nextReset.toISOString();
  }
}
