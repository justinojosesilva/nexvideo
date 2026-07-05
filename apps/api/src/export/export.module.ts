import { Module } from '@nestjs/common';
import { RepositoriesModule } from '../repositories/repositories.module';
import { AdaptersModule } from '../adapters/adapters.module';
import { BullmqModule } from '../bullmq/bullmq.module';
import { CreateExportUseCase } from './use-cases/create-export.use-case';
import { GetExportStatusUseCase } from './use-cases/get-export-status.use-case';
import { ProcessExportUseCase } from './use-cases/process-export.use-case';
import { GetExportChecklistUseCase } from './use-cases/get-export-checklist.use-case';
import { ExportController } from './export.controller';

@Module({
  imports: [RepositoriesModule, AdaptersModule, BullmqModule],
  controllers: [ExportController],
  providers: [
    CreateExportUseCase,
    GetExportStatusUseCase,
    ProcessExportUseCase,
    GetExportChecklistUseCase,
  ],
  exports: [
    CreateExportUseCase,
    GetExportStatusUseCase,
    ProcessExportUseCase,
    GetExportChecklistUseCase,
  ],
})
export class ExportModule {}
