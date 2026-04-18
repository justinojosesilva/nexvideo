import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';
import { prisma } from '@nexvideo/database';
import { SynthesizeNarrationUseCase } from './use-cases/synthesize-narration.use-case';
import { SynthesizeNarrationDto } from './dto/synthesize-narration.dto';

@ApiTags('narrations')
@Controller('narrations')
export class NarrationsController {
  constructor(
    private readonly synthesizeNarrationUseCase: SynthesizeNarrationUseCase,
  ) {}

  @Post('internal/synthesize')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Internal narration synthesis endpoint',
    description: 'Called by worker process - not for public API',
  })
  @ApiResponse({
    status: 200,
    description: 'Audio synthesized successfully',
    schema: {
      example: {
        audioUrl: 'https://storage.example.com/narrations/abc123.mp3',
        durationSec: 180,
        provider: 'elevenlabs',
        estimatedCostBrl: 0.45,
      },
    },
  })
  async internalSynthesizeNarration(
    @Body() dto: SynthesizeNarrationDto & { organizationId: string; narrationId?: string },
  ) {
    if (!dto.organizationId) {
      throw new BadRequestException('Missing organizationId');
    }

    // Fetch narration and validate it belongs to the organization via script → project join
    let scriptId = '';
    if (dto.narrationId) {
      const narration = await prisma.narration.findUnique({
        where: { id: dto.narrationId },
        include: {
          script: {
            include: {
              contentProject: { select: { organizationId: true } },
            },
          },
        },
      });

      if (!narration) {
        throw new NotFoundException('Narration not found');
      }

      if (narration.script.contentProject.organizationId !== dto.organizationId) {
        throw new ForbiddenException('Narration does not belong to organization');
      }

      scriptId = narration.scriptId;
    }

    return await this.synthesizeNarrationUseCase.execute({
      ...dto,
      organizationId: dto.organizationId,
      scriptId,
    });
  }
}
