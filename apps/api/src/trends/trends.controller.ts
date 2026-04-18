import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  HttpCode,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiExcludeEndpoint,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Public } from '../auth/decorators/public.decorator';
import { EnqueueTrendAnalysisUseCase } from './use-cases/enqueue-trend-analysis.use-case';
import { GetTrendAnalysisUseCase } from './use-cases/get-trend-analysis.use-case';
import { ExecuteTrendAnalysisUseCase } from './use-cases/execute-trend-analysis.use-case';
import { AnalyzeTrendsRequest } from './dto/analyze-trends.request';
import type { AnalyzeTrendsInput } from './use-cases/analyze-trends.use-case';

interface AuthRequest extends Request {
  user?: { organizationId: string };
}

@ApiTags('trends')
@Controller('trends')
@UseGuards(JwtAuthGuard)
export class TrendsController {
  constructor(
    private enqueueTrendAnalysisUseCase: EnqueueTrendAnalysisUseCase,
    private getTrendAnalysisUseCase: GetTrendAnalysisUseCase,
    private executeTrendAnalysisUseCase: ExecuteTrendAnalysisUseCase,
  ) {}

  @Post('analyze')
  @HttpCode(202)
  @ApiOperation({
    summary: 'Enqueue trend analysis for a project',
    description:
      'Enqueues an asynchronous trend analysis job and returns immediately with the job ID',
  })
  @ApiResponse({
    status: 202,
    description: 'Job enqueued successfully',
    schema: {
      type: 'object',
      properties: {
        jobId: {
          type: 'string',
          example: 'analyze-trends-proj-1-1712500000000',
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 400, description: 'Invalid request body' })
  async analyzeTrends(
    @Body() request: AnalyzeTrendsRequest,
    @Request() authRequest: AuthRequest,
  ): Promise<{ jobId: string }> {
    const organizationId = authRequest.user?.organizationId;

    if (!organizationId) {
      throw new Error('organizationId not found in request');
    }

    const jobId = await this.enqueueTrendAnalysisUseCase.execute({
      projectId: request.projectId,
      organizationId,
      keyword: request.keyword,
      geo: request.geo,
      niche: request.niche,
    });

    return { jobId };
  }

  @Get(':projectId')
  @ApiOperation({
    summary: 'Get completed trend analysis for a project',
    description:
      'Retrieves the most recent completed trend analysis for a project',
  })
  @ApiResponse({
    status: 200,
    description: 'Trend analysis found',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        organizationId: { type: 'string' },
        projectId: { type: 'string' },
        keyword: { type: 'string' },
        data: { type: 'object' },
        analyzedAt: { type: 'string', format: 'date-time' },
        createdAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Trend analysis not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getTrendAnalysis(
    @Param('projectId') projectId: string,
    @Request() authRequest: AuthRequest,
  ): Promise<unknown> {
    const organizationId = authRequest.user?.organizationId;

    if (!organizationId) {
      throw new Error('organizationId not found in request');
    }

    return this.getTrendAnalysisUseCase.execute(projectId, organizationId);
  }

  @Post('internal/execute')
  @Public()
  @ApiExcludeEndpoint()
  async executeInternal(@Body() input: AnalyzeTrendsInput): Promise<unknown> {
    return this.executeTrendAnalysisUseCase.execute(input);
  }
}
