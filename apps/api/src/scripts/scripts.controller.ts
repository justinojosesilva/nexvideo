import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { type Script } from '@nexvideo/database';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { type JwtPayload } from '../auth/strategies/jwt.strategy';
import { GetScriptsUseCase } from './use-cases/get-scripts.use-case';
import { UpdateScriptUseCase } from './use-cases/update-script.use-case';
import { GenerateScriptUseCase } from './use-cases/generate-script.use-case';
import { EnqueueScriptGenerationUseCase } from './use-cases/enqueue-script-generation.use-case';
import { GetBudgetSummaryUseCase } from './use-cases/get-budget-summary.use-case';
import { UpdateScriptDto } from './dto/update-script.dto';
import { GenerateScriptDto } from './dto/generate-script.dto';
import { CreateScriptQueueDto } from './dto/create-script-queue.dto';
import { CheckPlanLimit } from '../auth/decorators/check-plan-limit.decorator';

@ApiTags('scripts')
@ApiBearerAuth()
@Controller('scripts')
export class ScriptsController {
  constructor(
    private readonly getScriptsUseCase: GetScriptsUseCase,
    private readonly updateScriptUseCase: UpdateScriptUseCase,
    private readonly generateScriptUseCase: GenerateScriptUseCase,
    private readonly enqueueScriptGenerationUseCase: EnqueueScriptGenerationUseCase,
    private readonly getBudgetSummaryUseCase: GetBudgetSummaryUseCase,
  ) {}

  @Post()
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({
    summary: 'Enqueue script generation job',
    description:
      'Submit a script generation request that will be processed asynchronously via BullMQ',
  })
  @ApiResponse({
    status: 202,
    description: 'Job accepted and enqueued',
    schema: {
      example: {
        jobId:
          'generate-script-550e8400-e29b-41d4-a716-446655440000-660e8400-e29b-41d4-a716-446655440001-1712580000000',
        status: 'PENDING',
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - projectId does not belong to user organization',
    schema: {
      example: {
        message: 'Project does not belong to organization',
        error: 'Forbidden',
        statusCode: 403,
      },
    },
  })
  @ApiResponse({
    status: 404,
    description:
      'Not Found - trendAnalysisId does not exist or does not belong to projectId',
    schema: {
      example: {
        message: 'Trend analysis not found',
        error: 'Bad Request',
        statusCode: 400,
      },
    },
  })
  async enqueueScriptGeneration(
    @Body() dto: CreateScriptQueueDto,
    @CurrentUser() user: JwtPayload | undefined,
  ) {
    if (!user) {
      throw new Error('User not authenticated');
    }

    try {
      return await this.enqueueScriptGenerationUseCase.execute({
        ...dto,
        organizationId: user.organizationId,
      });
    } catch (error) {
      if (error instanceof BadRequestException) {
        // Check if it's a 403 or 404 scenario
        const message = (error.getResponse() as any).message || '';
        if (message.includes('does not belong to organization')) {
          throw new ForbiddenException(message);
        }
        if (message.includes('not found')) {
          throw new NotFoundException(message);
        }
      }
      throw error;
    }
  }

  @Get('budget/summary')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get budget summary for current month',
    description:
      'Returns total cost, script count, and average cost for the current month',
  })
  async getBudgetSummary(@CurrentUser() user: JwtPayload | undefined) {
    if (!user) {
      throw new Error('User not authenticated');
    }

    return this.getBudgetSummaryUseCase.execute(user.organizationId);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  async listScripts(
    @CurrentUser() user: JwtPayload | undefined,
  ): Promise<Script[]> {
    if (!user) {
      throw new Error('User not authenticated');
    }

    // This route is for getting all scripts for a user
    // Implementation depends on requirements
    return [];
  }

  @Get('project/:projectId')
  @HttpCode(HttpStatus.OK)
  async getScriptsByProject(
    @Param('projectId') projectId: string,
    @CurrentUser() user: JwtPayload | undefined,
  ): Promise<Script[]> {
    if (!user) {
      throw new Error('User not authenticated');
    }

    return this.getScriptsUseCase.execute(projectId, user.organizationId);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async getScript(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload | undefined,
  ): Promise<Script> {
    if (!user) {
      throw new Error('User not authenticated');
    }

    return this.getScriptsUseCase.getById(id, user.organizationId);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  async updateScript(
    @Param('id') id: string,
    @Body() dto: UpdateScriptDto,
    @CurrentUser() user: JwtPayload | undefined,
  ): Promise<Script> {
    if (!user) {
      throw new Error('User not authenticated');
    }

    return this.updateScriptUseCase.execute(id, user.organizationId, dto);
  }

  @Post('project/:projectId/generate')
  @HttpCode(HttpStatus.CREATED)
  @CheckPlanLimit('scripts')
  async generateScript(
    @Param('projectId') projectId: string,
    @Body() dto: GenerateScriptDto,
    @CurrentUser() user: JwtPayload | undefined,
  ): Promise<Script> {
    if (!user) {
      throw new Error('User not authenticated');
    }

    return this.generateScriptUseCase.execute({
      ...dto,
      projectId,
      organizationId: user.organizationId,
    });
  }

  @Delete(':id/cache')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Invalidate script cache',
    description:
      'Invalidate cached script content - only available to project owner',
  })
  async invalidateScriptCache(
    @Param('id') scriptId: string,
    @CurrentUser() user: JwtPayload | undefined,
  ): Promise<void> {
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Get script to verify ownership and extract projectId
    const script = await this.getScriptsUseCase.getById(
      scriptId,
      user.organizationId,
    );

    await this.generateScriptUseCase.invalidateCache(
      script.projectId,
      scriptId,
    );
  }

  @Post('internal/generate')
  @Public()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Internal script generation endpoint',
    description: 'Called by worker process - not for public API',
  })
  async internalGenerateScript(
    @Body()
    dto: GenerateScriptDto & {
      projectId: string;
      organizationId: string;
      trendAnalysisId: string;
    },
  ): Promise<{ script: Script }> {
    const script = await this.generateScriptUseCase.execute({
      ...dto,
      projectId: dto.projectId,
      organizationId: dto.organizationId,
    });

    return { script };
  }
}
