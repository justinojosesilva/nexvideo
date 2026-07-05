import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AnalyticsController } from './analytics.controller';
import { GetVideoPerformanceUseCase } from './use-cases/get-video-performance.use-case';

@Module({
  imports: [PrismaModule],
  controllers: [AnalyticsController],
  providers: [GetVideoPerformanceUseCase],
})
export class AnalyticsModule {}
