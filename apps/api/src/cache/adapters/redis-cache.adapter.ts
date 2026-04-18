import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
  Inject,
  Optional,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { ICachePort } from '../interfaces/cache.port';

/**
 * Default TTLs in seconds for different cache keys
 */
const DEFAULT_TTLS: Record<string, number> = {
  'trends:': 6 * 60 * 60, // 6 hours
  'youtube:': 1 * 60 * 60, // 1 hour
  'openai:': 24 * 60 * 60, // 24 hours
  'monetization:': 7 * 24 * 60 * 60, // 7 days
};

const DEFAULT_TTL = 60 * 60; // 1 hour default

@Injectable()
export class RedisCacheAdapter
  implements ICachePort, OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(RedisCacheAdapter.name);
  private redis: Redis;

  constructor(
    private configService: ConfigService,
    @Optional() @Inject('REDIS_INSTANCE') redisInstance?: Redis,
  ) {
    if (redisInstance) {
      this.redis = redisInstance;
    }
  }

  async onModuleInit(): Promise<void> {
    if (!this.redis) {
      const redisUrl = this.configService.get<string>('REDIS_URL')!;
      this.redis = new Redis(redisUrl);
    }

    await this.redis.ping();
  }

  async onModuleDestroy(): Promise<void> {
    if (this.redis) {
      await this.redis.disconnect();
    }
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.redis.get(key);

      if (!value) {
        return null;
      }

      return JSON.parse(value) as T;
    } catch (error) {
      this.logger.error({ key, err: error }, `Cache get error`);
      return null;
    }
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    try {
      const ttl = ttlSeconds || this.getDefaultTtl(key);
      const serialized = JSON.stringify(value);

      if (ttl > 0) {
        await this.redis.setex(key, ttl, serialized);
      } else {
        await this.redis.set(key, serialized);
      }
    } catch (error) {
      this.logger.error({ key, err: error }, `Cache set error`);
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await this.redis.del(key);
    } catch (error) {
      this.logger.error({ key, err: error }, `Cache delete error`);
    }
  }

  async invalidateByPrefix(prefix: string): Promise<void> {
    try {
      const keys = await this.redis.keys(`${prefix}*`);

      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    } catch (error) {
      this.logger.error({ prefix, err: error }, `Cache invalidateByPrefix error`);
    }
  }

  /**
   * Get default TTL for a key based on its prefix
   */
  private getDefaultTtl(key: string): number {
    for (const [prefix, ttl] of Object.entries(DEFAULT_TTLS)) {
      if (key.startsWith(prefix)) {
        return ttl;
      }
    }

    return DEFAULT_TTL;
  }
}
