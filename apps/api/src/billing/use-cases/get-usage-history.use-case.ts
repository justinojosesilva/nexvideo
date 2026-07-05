import {
  BadRequestException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  buildMonthRange,
  buildUsageHistory,
  type UsageHistoryResult,
} from '../usage-history';

interface GetUsageHistoryInput {
  organizationId: string;
  months?: number;
}

const DEFAULT_MONTHS = 12;
const MAX_MONTHS = 24;

@Injectable()
export class GetUsageHistoryUseCase {
  private readonly logger = new Logger(GetUsageHistoryUseCase.name);

  constructor(private readonly prisma: PrismaService) {}

  async execute(input: GetUsageHistoryInput): Promise<UsageHistoryResult> {
    const months = input.months ?? DEFAULT_MONTHS;

    if (!Number.isInteger(months) || months < 1 || months > MAX_MONTHS) {
      throw new BadRequestException(
        `months must be an integer between 1 and ${MAX_MONTHS}`,
      );
    }

    const range = buildMonthRange(new Date(), months);
    const fromMonth = range[0]!;

    const rows = await this.prisma.client.usageLog.findMany({
      where: {
        organizationId: input.organizationId,
        month: { gte: fromMonth },
      },
      select: {
        month: true,
        scripts: true,
        narrations: true,
        exports: true,
      },
      orderBy: { month: 'asc' },
    });

    const result = buildUsageHistory(rows, range);

    this.logger.debug(
      `Usage history for ${input.organizationId}: ${result.months.length} months, total ${result.totals.total}`,
    );

    return result;
  }
}
