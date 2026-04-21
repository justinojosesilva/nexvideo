import {
  Injectable,
  Logger,
  UnauthorizedException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import Redis from 'ioredis';
import { prisma, encryptToken, decryptToken } from '@nexvideo/database';

interface GoogleTokenResponse {
  access_token: string;
  refresh_token?: string;
  token_type: string;
  expires_in: number;
  scope: string;
}

interface GoogleTokenInfo {
  azp: string;
  aud: string;
  sub: string;
  scope: string;
  exp: string;
  expires_in: string;
  email?: string;
  email_verified?: string;
  access_type: string;
}

const OAUTH_STATE_TTL_SEC = 600; // 10 minutes
const STATE_KEY_PREFIX = 'youtube:oauth:state:';

@Injectable()
export class YoutubeOAuthService {
  private readonly logger = new Logger(YoutubeOAuthService.name);
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly redirectUri: string;

  private static readonly SCOPES = [
    'https://www.googleapis.com/auth/youtube.upload',
    'https://www.googleapis.com/auth/youtube.readonly',
    'https://www.googleapis.com/auth/yt-analytics.readonly',
  ].join(' ');

  constructor(
    private readonly config: ConfigService,
    @Inject('REDIS_INSTANCE') private readonly redis: Redis,
  ) {
    this.clientId = this.config.getOrThrow<string>('GOOGLE_CLIENT_ID');
    this.clientSecret = this.config.getOrThrow<string>('GOOGLE_CLIENT_SECRET');
    this.redirectUri = this.config.getOrThrow<string>('GOOGLE_REDIRECT_URI');
  }

  /**
   * Generates a random nonce, stores organizationId → nonce in Redis (TTL 10min),
   * and returns the Google authorization URL with the nonce as state (anti-CSRF).
   */
  async getAuthorizationUrl(organizationId: string): Promise<string> {
    const nonce = randomUUID();
    await this.redis.set(
      `${STATE_KEY_PREFIX}${nonce}`,
      organizationId,
      'EX',
      OAUTH_STATE_TTL_SEC,
    );

    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      response_type: 'code',
      scope: YoutubeOAuthService.SCOPES,
      access_type: 'offline',
      prompt: 'consent',
      state: nonce,
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  /**
   * Validates the state nonce against Redis, exchanges the code for tokens,
   * and persists the tokens in YoutubeOAuthToken.
   */
  async exchangeCodeForTokens(
    code: string,
    state: string,
  ): Promise<void> {
    // Anti-CSRF: look up nonce in Redis
    const redisKey = `${STATE_KEY_PREFIX}${state}`;
    const organizationId = await this.redis.get(redisKey);

    if (!organizationId) {
      throw new BadRequestException(
        'Invalid or expired OAuth state. Please restart the authorization flow.',
      );
    }

    // Consume nonce immediately (one-time use)
    await this.redis.del(redisKey);

    const body = new URLSearchParams({
      code,
      client_id: this.clientId,
      client_secret: this.clientSecret,
      redirect_uri: this.redirectUri,
      grant_type: 'authorization_code',
    });

    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    if (!response.ok) {
      const error = await response.text();
      this.logger.error(`Token exchange failed: ${error}`);
      throw new BadRequestException('Failed to exchange authorization code');
    }

    const tokens = (await response.json()) as GoogleTokenResponse;

    if (!tokens.refresh_token) {
      throw new BadRequestException(
        'No refresh token received. Revoke access and re-authorize.',
      );
    }

    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

    await prisma.youtubeOAuthToken.upsert({
      where: { organizationId },
      create: {
        organizationId,
        accessToken: encryptToken(tokens.access_token),
        refreshToken: encryptToken(tokens.refresh_token),
        scope: tokens.scope,
        tokenType: tokens.token_type,
        expiresAt,
      },
      update: {
        accessToken: encryptToken(tokens.access_token),
        refreshToken: encryptToken(tokens.refresh_token),
        scope: tokens.scope,
        tokenType: tokens.token_type,
        expiresAt,
      },
    });

    this.logger.log(`YouTube OAuth tokens stored for org ${organizationId}`);
  }

  /**
   * Returns a valid access token, refreshing automatically if expired or about to expire.
   */
  async getValidAccessToken(organizationId: string): Promise<string> {
    const record = await prisma.youtubeOAuthToken.findUnique({
      where: { organizationId },
    });

    if (!record) {
      throw new UnauthorizedException(
        'YouTube account not connected. Authorize via /youtube/oauth/start.',
      );
    }

    const bufferMs = 60_000;
    if (record.expiresAt.getTime() > Date.now() + bufferMs) {
      return decryptToken(record.accessToken);
    }

    return this.refreshAccessToken(organizationId, decryptToken(record.refreshToken));
  }

  async refreshAccessToken(
    organizationId: string,
    refreshToken: string,
  ): Promise<string> {
    const body = new URLSearchParams({
      client_id: this.clientId,
      client_secret: this.clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    });

    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    if (!response.ok) {
      this.logger.error(`Token refresh failed for org ${organizationId}`);
      throw new UnauthorizedException(
        'YouTube token refresh failed. Re-authorize via /youtube/oauth/start.',
      );
    }

    const tokens = (await response.json()) as GoogleTokenResponse;
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

    await prisma.youtubeOAuthToken.update({
      where: { organizationId },
      data: {
        accessToken: encryptToken(tokens.access_token),
        expiresAt,
      },
    });

    this.logger.log(`Access token refreshed for org ${organizationId}`);
    return tokens.access_token;
  }

  async revokeTokens(organizationId: string): Promise<void> {
    const record = await prisma.youtubeOAuthToken.findUnique({
      where: { organizationId },
    });

    if (!record) return;

    await fetch(
      `https://oauth2.googleapis.com/revoke?token=${decryptToken(record.accessToken)}`,
      { method: 'POST' },
    ).catch((err) =>
      this.logger.warn(`Google revoke call failed (non-critical): ${err}`),
    );

    await prisma.youtubeOAuthToken.delete({ where: { organizationId } });

    this.logger.log(`YouTube tokens revoked for org ${organizationId}`);
  }

  async getTokenInfo(organizationId: string): Promise<GoogleTokenInfo | null> {
    const record = await prisma.youtubeOAuthToken.findUnique({
      where: { organizationId },
      select: { accessToken: true, expiresAt: true, scope: true },
    });

    if (!record) return null;

    return {
      azp: this.clientId,
      aud: this.clientId,
      sub: organizationId,
      scope: record.scope,
      exp: String(Math.floor(record.expiresAt.getTime() / 1000)),
      expires_in: String(
        Math.max(0, Math.floor((record.expiresAt.getTime() - Date.now()) / 1000)),
      ),
      access_type: 'offline',
    };
  }
}
