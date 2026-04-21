import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AdaptersModule } from '../adapters/adapters.module';
import { AdminController } from './admin.controller';
import { AdminApiKeyGuard } from './guards/admin-api-key.guard';
import { ListOrganizationsUseCase } from './use-cases/list-organizations.use-case';
import { GetAdminStatsUseCase } from './use-cases/get-admin-stats.use-case';
import { UpdateOrganizationPlanUseCase } from './use-cases/update-organization-plan.use-case';

@Module({
  imports: [PrismaModule, AdaptersModule],
  controllers: [AdminController],
  providers: [
    AdminApiKeyGuard,
    ListOrganizationsUseCase,
    GetAdminStatsUseCase,
    UpdateOrganizationPlanUseCase,
  ],
})
export class AdminModule {}
