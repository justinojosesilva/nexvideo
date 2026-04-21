import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  GoneException,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiBearerAuth,
  ApiExcludeEndpoint,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { type JwtPayload } from '../auth/strategies/jwt.strategy';
import { Public } from '../auth/decorators/public.decorator';
import { CreateExportUseCase } from './use-cases/create-export.use-case';
import { GetExportStatusUseCase } from './use-cases/get-export-status.use-case';
import { ProcessExportUseCase } from './use-cases/process-export.use-case';
import { CreateExportDto } from './dto/create-export.dto';

@ApiTags('export')
@ApiBearerAuth()
@Controller('export')
export class ExportController {
  constructor(
    private readonly createExportUseCase: CreateExportUseCase,
    private readonly getExportStatusUseCase: GetExportStatusUseCase,
    private readonly processExportUseCase: ProcessExportUseCase,
  ) {}

  @Post()
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({
    summary: 'Create export job',
    description:
      'Validates project readiness and enqueues an export job. Requires: approved script, completed narration, >= 1 selected asset, and publication title.',
  })
  @ApiResponse({
    status: 202,
    description: 'Export job created and enqueued',
    schema: {
      example: {
        exportJobId: 'clxyz...',
        bullmqJobId: 'process-export-project-123-1712580000000',
      },
    },
  })
  @ApiResponse({
    status: 422,
    description: 'Unprocessable Entity - Missing prerequisites',
    schema: {
      example: {
        message: 'Project does not meet export requirements',
        missing: ['approved_script', 'completed_narration'],
      },
    },
  })
  @ApiResponse({ status: 403, description: 'Forbidden - Invalid organization context' })
  @ApiResponse({ status: 400, description: 'Bad request - Project not found' })
  async createExport(
    @Body() dto: CreateExportDto,
    @CurrentUser() user: JwtPayload | undefined,
  ) {
    if (!user) {
      throw new Error('User not authenticated');
    }

    return this.createExportUseCase.execute({
      projectId: dto.projectId,
      organizationId: user.organizationId,
    });
  }

  @Get(':exportJobId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get export job status',
    description:
      'Returns the current status and optional export URL of an export job. URL expires 24h after completion.',
  })
  @ApiResponse({
    status: 200,
    description: 'Export job status retrieved',
    schema: {
      example: {
        status: 'completed',
        exportUrl: 'https://storage.example.com/exports/export-123.zip',
        createdAt: '2026-04-12T10:00:00Z',
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Export job status - URL expired',
    schema: {
      example: {
        status: 'completed',
        createdAt: '2026-04-12T10:00:00Z',
        isExpired: true,
      },
    },
  })
  @ApiResponse({ status: 410, description: 'Gone - Export URL has expired (24h)' })
  @ApiResponse({ status: 403, description: 'Forbidden - Invalid organization context' })
  @ApiResponse({ status: 400, description: 'Bad request - Export job not found' })
  async getExportStatus(
    @Param('exportJobId') exportJobId: string,
    @CurrentUser() user: JwtPayload | undefined,
  ) {
    if (!user) {
      throw new Error('User not authenticated');
    }

    const result = await this.getExportStatusUseCase.execute({
      exportJobId,
      organizationId: user.organizationId,
    });

    // Return 410 Gone if URL has expired
    if (result.isExpired) {
      throw new GoneException(
        'Export URL has expired. Please create a new export.',
      );
    }

    return result;
  }

  @Public()
  @Post('internal/process')
  @HttpCode(HttpStatus.OK)
  @ApiExcludeEndpoint()
  async processExport(
    @Body()
    body: {
      exportJobId: string;
      projectId: string;
      scriptId: string;
      narrationId: string;
      organizationId: string;
    },
  ) {
    return this.processExportUseCase.execute(body);
  }
}
