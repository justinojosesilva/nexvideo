import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { type JwtPayload } from '../auth/strategies/jwt.strategy';
import { GenerateThumbnailDto } from './dto/generate-thumbnail.dto';
import { PreviewThumbnailsDto } from './dto/preview-thumbnails.dto';
import { SelectThumbnailDto } from './dto/select-thumbnail.dto';
import {
  GenerateThumbnailOutput,
  GenerateThumbnailUseCase,
} from './use-cases/generate-thumbnail.use-case';
import {
  PreviewThumbnailsOutput,
  PreviewThumbnailsUseCase,
} from './use-cases/preview-thumbnails.use-case';
import { SelectThumbnailUseCase } from './use-cases/select-thumbnail.use-case';

@ApiTags('Thumbnails')
@ApiBearerAuth()
@Controller('thumbnails')
export class ThumbnailsController {
  constructor(
    private readonly generate: GenerateThumbnailUseCase,
    private readonly preview: PreviewThumbnailsUseCase,
    private readonly select: SelectThumbnailUseCase,
  ) {}

  @Post('generate')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Generate a single AI thumbnail and (optionally) persist it' })
  @ApiResponse({ status: 201, description: 'Thumbnail URL and metadata' })
  async run(
    @Body() dto: GenerateThumbnailDto,
    @CurrentUser() user: JwtPayload | undefined,
  ): Promise<GenerateThumbnailOutput> {
    if (!user) {
      throw new Error('User not authenticated');
    }
    return this.generate.execute({
      organizationId: user.organizationId,
      topic: dto.topic,
      niche: dto.niche,
      primaryText: dto.primaryText,
      secondaryText: dto.secondaryText,
      template: dto.template,
      style: dto.style,
      palette: dto.palette,
      projectId: dto.projectId,
      maxCostUsd: dto.maxCostUsd,
    });
  }

  @Post(':projectId/preview')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Generate N (1–3) thumbnail variants for preview (not persisted)',
  })
  @ApiResponse({ status: 201, description: 'Array of variant thumbnails' })
  async previewVariants(
    @Param('projectId') projectId: string,
    @Body() dto: PreviewThumbnailsDto,
    @CurrentUser() user: JwtPayload | undefined,
  ): Promise<PreviewThumbnailsOutput> {
    if (!user) {
      throw new Error('User not authenticated');
    }
    return this.preview.execute({
      organizationId: user.organizationId,
      projectId,
      topic: dto.topic,
      niche: dto.niche,
      primaryText: dto.primaryText,
      secondaryText: dto.secondaryText,
      palette: dto.palette,
      template: dto.template,
      style: dto.style,
      count: dto.count,
      maxCostUsd: dto.maxCostUsd,
    });
  }

  @Patch(':projectId/select')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Persist the user-selected thumbnail URL on PublicationMetadata',
  })
  @ApiResponse({ status: 200, description: 'Selected thumbnail saved' })
  async selectThumbnail(
    @Param('projectId') projectId: string,
    @Body() dto: SelectThumbnailDto,
    @CurrentUser() user: JwtPayload | undefined,
  ): Promise<{ thumbnailUrl: string }> {
    if (!user) {
      throw new Error('User not authenticated');
    }
    return this.select.execute({
      organizationId: user.organizationId,
      projectId,
      thumbnailUrl: dto.thumbnailUrl,
    });
  }
}
