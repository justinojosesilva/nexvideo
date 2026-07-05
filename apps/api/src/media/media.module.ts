import { Module } from '@nestjs/common';
import { AdaptersModule } from '../adapters/adapters.module';
import { MediaSearchUseCase } from './use-cases/media-search.use-case';
import { SelectMediaUseCase } from './use-cases/select-media.use-case';
import { MediaController } from './media.controller';
import { MediaAdapter } from '../adapters/implementations/media.adapter';

@Module({
  imports: [AdaptersModule],
  controllers: [MediaController],
  providers: [MediaAdapter, MediaSearchUseCase, SelectMediaUseCase],
  exports: [MediaSearchUseCase, SelectMediaUseCase],
})
export class MediaModule {}
