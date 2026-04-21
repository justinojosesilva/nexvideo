import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule, type JwtModuleOptions } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { LoginUseCase } from './use-cases/login.use-case';
import { RegisterUseCase } from './use-cases/register.use-case';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { TenantGuard } from './guards/tenant.guard';
import { PlanLimitsGuard } from './guards/plan-limits.guard';
import { RefreshTokenService } from './services/refresh-token.service';
import { YoutubeOAuthService } from './services/youtube-oauth.service';
import { EmailModule } from '../email/email.module';
import { BillingModule } from '../billing/billing.module';
import { CacheModule } from '../cache/cache.module';

@Module({
  imports: [
    PassportModule,
    EmailModule,
    BillingModule,
    CacheModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService): JwtModuleOptions => ({
        secret: config.getOrThrow<string>('JWT_SECRET'),
        signOptions: {
          // ConfigService returns a valid ms-compatible string (e.g. "7d")

          expiresIn: config.getOrThrow<string>('JWT_EXPIRES_IN') as any,
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    RegisterUseCase,
    LoginUseCase,
    RefreshTokenService,
    YoutubeOAuthService,
    JwtStrategy,
    JwtAuthGuard,
    TenantGuard,
    PlanLimitsGuard,
  ],
  exports: [JwtAuthGuard, TenantGuard, PlanLimitsGuard, YoutubeOAuthService],
})
export class AuthModule {}
