import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Redirect,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiTags,
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiUnauthorizedResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import type { Request } from 'express';

interface AuthenticatedRequest extends Request {
  user: JwtPayload;
}
import { LoginDto, LoginResponse } from './dto/login.dto';
import { RegisterDto, RegisterResponse } from './dto/register.dto';
import { RefreshDto, RefreshResponse } from './dto/refresh.dto';
import { LoginUseCase } from './use-cases/login.use-case';
import { RegisterUseCase } from './use-cases/register.use-case';
import { RefreshTokenService } from './services/refresh-token.service';
import { YoutubeOAuthService } from './services/youtube-oauth.service';
import { Public } from './decorators/public.decorator';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { JwtPayload } from './strategies/jwt.strategy';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly registerUseCase: RegisterUseCase,
    private readonly loginUseCase: LoginUseCase,
    private readonly refreshTokenService: RefreshTokenService,
    private readonly youtubeOAuthService: YoutubeOAuthService,
  ) {}

  @Public()
  @Post('register')
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Register a new user',
    description:
      'Creates a new user account and organization. Returns JWT access token on success.',
  })
  @ApiBody({ type: RegisterDto })
  @ApiResponse({
    status: 201,
    description: 'User successfully registered',
    type: RegisterResponse,
  })
  @ApiBadRequestResponse({
    description:
      'Invalid email format, password too short, or missing required fields',
  })
  @ApiConflictResponse({
    description: 'Email address already exists',
  })
  register(@Body() dto: RegisterDto): Promise<RegisterResponse> {
    return this.registerUseCase.execute(dto);
  }

  @Public()
  @Post('login')
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Login user',
    description:
      'Authenticates user with email and password. Returns JWT access token.',
  })
  @ApiBody({ type: LoginDto })
  @ApiResponse({
    status: 200,
    description: 'User successfully logged in',
    type: LoginResponse,
  })
  @ApiBadRequestResponse({
    description: 'Invalid email format or password format',
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid email or password credentials',
  })
  login(@Body() dto: LoginDto): Promise<LoginResponse> {
    return this.loginUseCase.execute(dto);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Refresh access token',
    description:
      'Uses a refresh token to obtain a new access token and refresh token.',
  })
  @ApiBody({ type: RefreshDto })
  @ApiResponse({
    status: 200,
    description: 'Access token refreshed',
    type: RefreshResponse,
  })
  @ApiBadRequestResponse({
    description: 'Invalid or missing refresh token',
  })
  @ApiUnauthorizedResponse({
    description: 'Refresh token is expired or invalid',
  })
  async refresh(@Body() dto: RefreshDto): Promise<RefreshResponse> {
    const userId = await this.refreshTokenService.validateRefreshToken(
      dto.refreshToken,
    );

    const user = await this.refreshTokenService.getUserData(userId);

    const accessToken = this.refreshTokenService.generateAccessToken(
      user.id,
      user.organizationId,
      user.role,
      user.email,
    );

    // Revoke old refresh token and generate new one
    await this.refreshTokenService.revokeRefreshToken(dto.refreshToken);
    const refreshToken =
      await this.refreshTokenService.generateRefreshToken(userId);

    return { accessToken, refreshToken };
  }

  // ─── YouTube OAuth ────────────────────────────────────────────────────────

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('youtube')
  @Redirect()
  @ApiOperation({
    summary: 'Start YouTube OAuth flow',
    description:
      'Redirects the authenticated user to the Google consent screen. ' +
      'The organizationId is encoded in the state parameter for CSRF protection.',
  })
  @ApiResponse({ status: 302, description: 'Redirect to Google OAuth' })
  async startYoutubeOAuth(@Req() req: AuthenticatedRequest) {
    const payload = req.user as JwtPayload;
    const url = await this.youtubeOAuthService.getAuthorizationUrl(
      payload.organizationId,
    );
    return { url, statusCode: 302 };
  }

  @Public()
  @Get('youtube/callback')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'YouTube OAuth callback',
    description:
      'Google redirects here after user grants consent. ' +
      'Exchanges the authorization code for tokens and stores them.',
  })
  @ApiResponse({ status: 200, description: 'YouTube account connected' })
  @ApiBadRequestResponse({ description: 'Invalid code or state' })
  async youtubeCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Query('error') error?: string,
  ): Promise<{ message: string }> {
    if (error) {
      throw new BadRequestException(`Google OAuth denied: ${error}`);
    }

    await this.youtubeOAuthService.exchangeCodeForTokens(code, state);
    return { message: 'YouTube account connected successfully' };
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('youtube/status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Check YouTube connection status' })
  @ApiResponse({ status: 200, description: 'Connection info' })
  async youtubeStatus(@Req() req: AuthenticatedRequest) {
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

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Delete('youtube')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Disconnect YouTube account',
    description: 'Revokes Google OAuth tokens and removes stored credentials.',
  })
  @ApiResponse({ status: 200, description: 'YouTube account disconnected' })
  async disconnectYoutube(@Req() req: AuthenticatedRequest): Promise<{ message: string }> {
    const payload = req.user as JwtPayload;
    await this.youtubeOAuthService.revokeTokens(payload.organizationId);
    return { message: 'YouTube account disconnected' };
  }
}
