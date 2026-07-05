import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { prisma } from '@nexvideo/database';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { type JwtPayload } from '../auth/strategies/jwt.strategy';
import { GenerateTitleTagsUseCase } from './use-cases/generate-title-tags.use-case';
import { SelectTitleUseCase } from './use-cases/select-title.use-case';
import { EnqueuePublicationGenerationUseCase } from './use-cases/enqueue-publication-generation.use-case';
import { GenerateTitleTagsDto } from './dto/generate-title-tags.dto';
import { SelectTitleDto } from './dto/select-title.dto';

@ApiTags('publication')
@ApiBearerAuth()
@Controller('publication')
export class PublicationMetadataController {
  constructor(
    private readonly generateTitleTagsUseCase: GenerateTitleTagsUseCase,
    private readonly selectTitleUseCase: SelectTitleUseCase,
    private readonly enqueuePublicationGenerationUseCase: EnqueuePublicationGenerationUseCase,
  ) {}

  @Post('generate')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({
    summary: 'Enqueue publication metadata generation job',
    description:
      'Submit a request to generate title variants and tags for a project. Job is processed asynchronously via BullMQ.',
  })
  @ApiResponse({
    status: 202,
    description: 'Job enqueued',
    schema: { example: { jobId: 'generate-publication-project-123-script-456-1712580000000' } },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - project or script not found',
    schema: {
      example: {
        message: 'Project not found',
        error: 'Bad Request',
        statusCode: 400,
      },
    },
  })
  async generatePublicationMetadata(
    @Body() dto: GenerateTitleTagsDto,
    @CurrentUser() user: JwtPayload | undefined,
  ): Promise<{ jobId: string }> {
    if (!user) {
      throw new Error('User not authenticated');
    }

    try {
      const jobId = await this.enqueuePublicationGenerationUseCase.execute({
        projectId: dto.projectId,
        scriptId: dto.scriptId,
        organizationId: user.organizationId,
      });

      return { jobId };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to enqueue publication generation');
    }
  }

  @Get(':projectId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get publication metadata for a project',
    description:
      'Retrieve generated title variants and tags for a project. Returns null if not yet generated.',
  })
  @ApiResponse({
    status: 200,
    description: 'Publication metadata',
    schema: {
      example: {
        id: 'meta-uuid',
        projectId: 'project-123',
        title: null,
        tags: ['tag1', 'tag2'],
        titleVariants: [
          {
            title: '7 Ways to Make Money Fast',
            ctReason: 'Curiosity + Number',
            score: 92,
          },
        ],
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - project does not belong to user organization',
  })
  async getPublicationMetadata(
    @Param('projectId') projectId: string,
    @CurrentUser() user: JwtPayload | undefined,
  ): Promise<any> {
    if (!user) {
      throw new Error('User not authenticated');
    }

    try {
      // Verify project belongs to organization
      const project = await prisma.contentProject.findFirst({
        where: {
          id: projectId,
          organizationId: user.organizationId,
        },
      });

      if (!project) {
        throw new BadRequestException('Project not found');
      }

      // Fetch publication metadata
      const metadata = await prisma.publicationMetadata.findUnique({
        where: { projectId },
      });

      if (!metadata) {
        return null;
      }

      // Parse and return metadata with additional context
      return {
        id: metadata.id,
        projectId: metadata.projectId,
        title: metadata.title,
        tags: metadata.tags,
        thumbnailUrl: metadata.thumbnailUrl,
        // titleVariants would be stored in metadata.metadata or a separate field
        // For now, returning the structure
        platform: metadata.platform,
        createdAt: metadata.createdAt,
        updatedAt: metadata.updatedAt,
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to get publication metadata');
    }
  }

  @Patch(':projectId/title')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Select a title for publication',
    description: 'Save the user-selected title from the generated variants',
  })
  @ApiResponse({
    status: 200,
    description: 'Title successfully selected',
    schema: { example: { success: true } },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - project not found',
    schema: {
      example: {
        message: 'Project not found',
        error: 'Bad Request',
        statusCode: 400,
      },
    },
  })
  async selectTitle(
    @Param('projectId') projectId: string,
    @Body() dto: SelectTitleDto,
    @CurrentUser() user: JwtPayload | undefined,
  ): Promise<{ success: boolean }> {
    if (!user) {
      throw new Error('User not authenticated');
    }

    try {
      return await this.selectTitleUseCase.execute({
        projectId,
        ...dto,
        organizationId: user.organizationId,
      });
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to select title');
    }
  }
}
