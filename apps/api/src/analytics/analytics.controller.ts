import {
  Controller,
  Get,
  Query,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { type JwtPayload } from '../auth/strategies/jwt.strategy';
import {
  GetVideoPerformanceUseCase,
  type VideoPerformanceOutput,
} from './use-cases/get-video-performance.use-case';

@ApiTags('Analytics')
@ApiBearerAuth()
@Controller('analytics')
export class AnalyticsController {
  constructor(
    private readonly getVideoPerformance: GetVideoPerformanceUseCase,
  ) {}

  @Get('video-performance')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Aggregated VideoPerformance metrics for the current org',
  })
  @ApiQuery({
    name: 'days',
    enum: [7, 30, 90],
    required: false,
    description: 'Time window in days (default 30)',
  })
  @ApiResponse({ status: 200, description: 'Aggregated analytics' })
  async videoPerformance(
    @CurrentUser() user: JwtPayload | undefined,
    @Query('days', new ParseIntPipe({ optional: true })) days?: number,
  ): Promise<VideoPerformanceOutput> {
    if (!user) {
      throw new Error('User not authenticated');
    }
    return this.getVideoPerformance.execute(user.organizationId, days ?? 30);
  }
}
