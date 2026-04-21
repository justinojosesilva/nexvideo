import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CacheModule } from '../cache/cache.module';
import { AuthModule } from '../auth/auth.module';
import { YouTubeAnalyticsAdapter } from './implementations/youtube-analytics.adapter';
import { YouTubeUploadAdapter } from './implementations/youtube-upload.adapter';
import { YouTubeDataAdapter } from './implementations/youtube-data.adapter';
import { YoutubeQuotaService } from './services/youtube-quota.service';
import { GoogleTrendsAdapter } from './implementations/google-trends.adapter';
import { OpenAIAdapter } from './implementations/openai.adapter';
import { ElevenLabsTtsAdapter } from './implementations/elevenlabs-tts.adapter';
import { OpenAITtsAdapter } from './implementations/openai-tts.adapter';
import { FallbackTtsAdapter } from './implementations/fallback-tts.adapter';
import { MemoryStorageAdapter } from './implementations/memory-storage.adapter';
import { PexelsAdapter } from './implementations/pexels.adapter';
import { PixabayAdapter } from './implementations/pixabay.adapter';
import { MediaAdapter } from './implementations/media.adapter';

@Module({
  imports: [ConfigModule, CacheModule, AuthModule],
  providers: [
    YoutubeQuotaService,
    {
      provide: 'IYouTubePort',
      useClass: YouTubeDataAdapter,
    },
    {
      provide: 'ITrendsPort',
      useClass: GoogleTrendsAdapter,
    },
    {
      provide: 'IOpenAIPort',
      useClass: OpenAIAdapter,
    },
    {
      provide: 'IStoragePort',
      useClass: MemoryStorageAdapter,
    },
    ElevenLabsTtsAdapter,
    OpenAITtsAdapter,
    {
      provide: 'ITtsPort',
      useClass: FallbackTtsAdapter,
    },
    {
      provide: 'IPexelsPort',
      useClass: PexelsAdapter,
    },
    {
      provide: 'IPixabayPort',
      useClass: PixabayAdapter,
    },
    {
      provide: 'MediaAdapter',
      useClass: MediaAdapter,
    },
    {
      provide: 'IYouTubeAnalyticsPort',
      useClass: YouTubeAnalyticsAdapter,
    },
    {
      provide: 'IYouTubeUploadPort',
      useClass: YouTubeUploadAdapter,
    },
  ],
  exports: [
    YoutubeQuotaService,
    'IYouTubePort',
    'ITrendsPort',
    'IOpenAIPort',
    'IStoragePort',
    'ITtsPort',
    'IPexelsPort',
    'IPixabayPort',
    'MediaAdapter',
    'IYouTubeAnalyticsPort',
    'IYouTubeUploadPort',
  ],
})
export class AdaptersModule {}
