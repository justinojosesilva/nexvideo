import { Module } from '@nestjs/common';
import { AdaptersModule } from '../adapters/adapters.module';
import { PrismaModule } from '../prisma/prisma.module';
import { ThumbnailsController } from './thumbnails.controller';
import { GenerateThumbnailUseCase } from './use-cases/generate-thumbnail.use-case';
import { PreviewThumbnailsUseCase } from './use-cases/preview-thumbnails.use-case';
import { SelectThumbnailUseCase } from './use-cases/select-thumbnail.use-case';

@Module({
  imports: [AdaptersModule, PrismaModule],
  controllers: [ThumbnailsController],
  providers: [
    GenerateThumbnailUseCase,
    PreviewThumbnailsUseCase,
    SelectThumbnailUseCase,
  ],
  exports: [
    GenerateThumbnailUseCase,
    PreviewThumbnailsUseCase,
    SelectThumbnailUseCase,
  ],
})
export class ThumbnailsModule {}
