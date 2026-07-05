import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export type PeriodDays = 7 | 30 | 90;

export interface VideoPerformanceSeriesPoint {
  date: string;
  views: number;
  watchTime: number;
  impressions: number;
  ctr: number;
}

export interface VideoPerformanceProjectRow {
  projectId: string;
  projectTitle: string;
  views: number;
  watchTime: number;
  impressions: number;
  ctr: number;
}

export interface VideoPerformanceTotals {
  views: number;
  watchTime: number;
  impressions: number;
  ctr: number;
  videos: number;
}

export interface VideoPerformanceOutput {
  periodDays: PeriodDays;
  from: string;
  to: string;
  totals: VideoPerformanceTotals;
  series: VideoPerformanceSeriesPoint[];
  byProject: VideoPerformanceProjectRow[];
}

const ALLOWED_PERIODS: PeriodDays[] = [7, 30, 90];

@Injectable()
export class GetVideoPerformanceUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(
    organizationId: string,
    days: number,
  ): Promise<VideoPerformanceOutput> {
    if (!ALLOWED_PERIODS.includes(days as PeriodDays)) {
      throw new BadRequestException(
        `Invalid period. Allowed values: ${ALLOWED_PERIODS.join(', ')}`,
      );
    }

    const periodDays = days as PeriodDays;
    const to = new Date();
    const from = new Date(to);
    from.setUTCDate(from.getUTCDate() - periodDays);

    const projects = await this.prisma.client.contentProject.findMany({
      where: { organizationId },
      select: { id: true, title: true },
    });

    if (projects.length === 0) {
      return {
        periodDays,
        from: from.toISOString(),
        to: to.toISOString(),
        totals: { views: 0, watchTime: 0, impressions: 0, ctr: 0, videos: 0 },
        series: [],
        byProject: [],
      };
    }

    const projectIds = projects.map((p) => p.id);
    const projectTitles = new Map(projects.map((p) => [p.id, p.title]));

    const performances = await this.prisma.client.videoPerformance.findMany({
      where: {
        projectId: { in: projectIds },
        recordedAt: { gte: from, lte: to },
      },
      orderBy: { recordedAt: 'asc' },
      select: {
        projectId: true,
        recordedAt: true,
        views: true,
        watchTime: true,
        impressions: true,
        ctr: true,
      },
    });

    const seriesMap = new Map<string, VideoPerformanceSeriesPoint>();
    const byProjectMap = new Map<string, VideoPerformanceProjectRow>();
    const ctrPerDay = new Map<string, number[]>();
    const ctrPerProject = new Map<string, number[]>();

    let totalViews = 0;
    let totalWatchTime = 0;
    let totalImpressions = 0;
    const allCtr: number[] = [];

    for (const row of performances) {
      const day = row.recordedAt.toISOString().slice(0, 10);
      const point = seriesMap.get(day) ?? {
        date: day,
        views: 0,
        watchTime: 0,
        impressions: 0,
        ctr: 0,
      };
      point.views += row.views;
      point.watchTime += row.watchTime;
      point.impressions += row.impressions;
      seriesMap.set(day, point);

      const ctrList = ctrPerDay.get(day) ?? [];
      ctrList.push(row.ctr);
      ctrPerDay.set(day, ctrList);

      const projectRow = byProjectMap.get(row.projectId) ?? {
        projectId: row.projectId,
        projectTitle: projectTitles.get(row.projectId) ?? row.projectId,
        views: 0,
        watchTime: 0,
        impressions: 0,
        ctr: 0,
      };
      projectRow.views += row.views;
      projectRow.watchTime += row.watchTime;
      projectRow.impressions += row.impressions;
      byProjectMap.set(row.projectId, projectRow);

      const pCtr = ctrPerProject.get(row.projectId) ?? [];
      pCtr.push(row.ctr);
      ctrPerProject.set(row.projectId, pCtr);

      totalViews += row.views;
      totalWatchTime += row.watchTime;
      totalImpressions += row.impressions;
      allCtr.push(row.ctr);
    }

    for (const [day, ctrs] of ctrPerDay) {
      const point = seriesMap.get(day);
      if (point) {
        point.ctr =
          ctrs.length > 0 ? ctrs.reduce((s, v) => s + v, 0) / ctrs.length : 0;
      }
    }

    for (const [projectId, ctrs] of ctrPerProject) {
      const row = byProjectMap.get(projectId);
      if (row) {
        row.ctr =
          ctrs.length > 0 ? ctrs.reduce((s, v) => s + v, 0) / ctrs.length : 0;
      }
    }

    const series = Array.from(seriesMap.values()).sort((a, b) =>
      a.date.localeCompare(b.date),
    );
    const byProject = Array.from(byProjectMap.values()).sort(
      (a, b) => b.views - a.views,
    );

    return {
      periodDays,
      from: from.toISOString(),
      to: to.toISOString(),
      totals: {
        views: totalViews,
        watchTime: totalWatchTime,
        impressions: totalImpressions,
        ctr:
          allCtr.length > 0
            ? allCtr.reduce((s, v) => s + v, 0) / allCtr.length
            : 0,
        videos: byProject.length,
      },
      series,
      byProject,
    };
  }
}
