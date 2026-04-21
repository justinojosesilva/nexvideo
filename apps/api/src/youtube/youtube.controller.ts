import {
  Controller,
  Get,
  Post,
  Query,
  Req,
  HttpCode,
  HttpStatus,
  Redirect,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBadRequestResponse,
} from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';
import { type JwtPayload } from '../auth/strategies/jwt.strategy';
import { YoutubeOAuthService } from '../auth/services/youtube-oauth.service';
import { RefreshExpiringTokensUseCase } from './use-cases/refresh-expiring-tokens.use-case';
import { SyncYoutubeMetricsUseCase } from './use-cases/sync-youtube-metrics.use-case';

interface AuthenticatedRequest extends Request {
  user?: JwtPayload;
}

@ApiTags('YouTube OAuth')
@Controller('youtube/oauth')
export class YoutubeController {
  constructor(
    private readonly youtubeOAuthService: YoutubeOAuthService,
    private readonly refreshExpiringTokens: RefreshExpiringTokensUseCase,
    private readonly syncMetrics: SyncYoutubeMetricsUseCase,
  ) {}

  @ApiBearerAuth()
  @Get('start')
  @Redirect()
  @ApiOperation({
    summary: 'Start YouTube OAuth 2.0 flow',
    description:
      'Generates a random anti-CSRF state nonce (stored in Redis with 10-min TTL) ' +
      'and redirects the authenticated user to the Google consent screen.',
  })
  @ApiResponse({ status: 302, description: 'Redirect to Google OAuth consent screen' })
  async startOAuth(@Req() req: AuthenticatedRequest) {
    const payload = req.user as JwtPayload;
    const url = await this.youtubeOAuthService.getAuthorizationUrl(
      payload.organizationId,
    );
    return { url, statusCode: 302 };
  }

  @Public()
  @Get('callback')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'YouTube OAuth 2.0 callback',
    description:
      'Google redirects here after user grants consent. ' +
      'Validates the anti-CSRF state nonce from Redis, exchanges the authorization code ' +
      'for tokens, and persists them in YoutubeOAuthToken.',
  })
  @ApiResponse({ status: 200, description: 'YouTube account connected successfully' })
  @ApiBadRequestResponse({ description: 'Invalid/expired state or authorization error' })
  async oauthCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Query('error') error?: string,
  ): Promise<{ message: string }> {
    if (error) {
      throw new BadRequestException(`Google OAuth denied: ${error}`);
    }

    if (!code || !state) {
      throw new BadRequestException('Missing code or state parameter');
    }

    await this.youtubeOAuthService.exchangeCodeForTokens(code, state);
    return { message: 'YouTube account connected successfully' };
  }

  @Public()
  @Post('internal/refresh-tokens')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '[Internal] Trigger YouTube token refresh (called by worker)' })
  @ApiResponse({ status: 200, description: 'Refresh result' })
  async internalRefreshTokens(): Promise<{ refreshed: number; failed: number }> {
    return this.refreshExpiringTokens.execute();
  }

  @Public()
  @Post('internal/sync-metrics')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '[Internal] Trigger YouTube metrics sync (called by worker)' })
  @ApiResponse({ status: 200, description: 'Sync result' })
  async internalSyncMetrics(): Promise<{ synced: number; failed: number }> {
    return this.syncMetrics.execute();
  }

  @Get('status')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Check YouTube OAuth connection status' })
  @ApiResponse({ status: 200, description: 'Connection info' })
  async status(@Req() req: AuthenticatedRequest) {
    const payload = req.user as JwtPayload;
    const info = await this.youtubeOAuthService.getTokenInfo(
      payload.organizationId,
    );
    return {
      connected: info !== null,
      scope: info?.scope ?? null,
      expiresAt: info ? new Date(Number(info.exp) * 1000).toISOString() : null,
    };
  }
}
