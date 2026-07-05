import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
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
} from '@nestjs/swagger';
import { LoginDto, LoginResponse } from './dto/login.dto';
import { RegisterDto, RegisterResponse } from './dto/register.dto';
import { RefreshDto, RefreshResponse } from './dto/refresh.dto';
import { LoginUseCase } from './use-cases/login.use-case';
import { RegisterUseCase } from './use-cases/register.use-case';
import { RefreshTokenService } from './services/refresh-token.service';
import { Public } from './decorators/public.decorator';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly registerUseCase: RegisterUseCase,
    private readonly loginUseCase: LoginUseCase,
    private readonly refreshTokenService: RefreshTokenService,
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
}
