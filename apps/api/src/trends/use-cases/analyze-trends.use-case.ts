import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { DemandScorer } from '../../scoring/demand.scorer';
import { SaturationScorer } from '../../scoring/saturation.scorer';
import { MonetizationScorer } from '../../scoring/monetization.scorer';
import { QualityGapScorer } from '../../scoring/quality-gap.scorer';
import { ScoreCalculator, NicheCategory } from '@nexvideo/shared';

export interface AnalyzeTrendsInput {
  /** ContentProject ID to analyze */
  projectId: string;
  /** Organization ID (for scoping and DB write) */
  organizationId: string;
  /** Keyword to analyze */
  keyword: string;
  /** Geographic region code (ISO 3166-1 alpha-2) */
  geo: string;
  /** Niche category for monetization scoring */
  niche: NicheCategory;
}

export interface TrendAnalysisRecord {
  id: string;
  organizationId: string;
  projectId: string;
  keyword: string;
  data: unknown;
  analyzedAt: Date;
  createdAt: Date;
}

export interface AnalyzeTrendsResult {
  /** Saved TrendAnalysis record */
  trendAnalysis: TrendAnalysisRecord;
  /** Final combined score (0-100) */
  finalScore: number;
  /** Individual scorer results */
  scores: {
    demand: number;
    saturation: number;
    monetization: number;
    qualityGap: number;
  };
}

/**
 * AnalyzeTrendsUseCase
 *
 * Orchestrates 4 scorers in parallel using Promise.allSettled so that
 * a partial failure never causes a 500 — failed scorers fall back to 50.
 *
 * Flow:
 * 1. Fetch and validate ContentProject exists
 * 2. Update project status to in_development (analysis in progress)
 * 3. Run all 4 scorers concurrently via Promise.allSettled
 * 4. Replace any rejected scorer result with fallback score 50
 * 5. Calculate final combined score with ScoreCalculator (default weights)
 * 6. Persist TrendAnalysis record with all scores + raw data
 * 7. Return TrendAnalysis + summary
 *
 * Score weights (default ScoreCalculator):
 * - dimension1 (demand):      30%
 * - dimension2 (saturation):  25% (inverted — high saturation = lower score)
 * - dimension3 (monetization): 30%
 * - dimension4 (qualityGap):  15%
 */
@Injectable()
export class AnalyzeTrendsUseCase {
  private readonly logger = new Logger(AnalyzeTrendsUseCase.name);

  /** Fallback score used when a scorer fails */
  private static readonly FALLBACK_SCORE = 50;

  private readonly scoreCalculator = new ScoreCalculator({
    dimension1: 0.3, // demand
    dimension2: 0.25, // saturation (inverted by formula)
    dimension3: 0.3, // monetization
    dimension4: 0.15, // qualityGap
  });

  constructor(
    private readonly prismaService: PrismaService,
    private readonly demandScorer: DemandScorer,
    private readonly saturationScorer: SaturationScorer,
    private readonly monetizationScorer: MonetizationScorer,
    private readonly qualityGapScorer: QualityGapScorer,
  ) {}

  async execute(input: AnalyzeTrendsInput): Promise<AnalyzeTrendsResult> {
    const { projectId, organizationId, keyword, geo, niche } = input;

    // Preview mode — no real ContentProject (used by /trends standalone analysis).
    // Skip project validation, status update, and persistence.
    const isPreview = projectId.startsWith('temp-');

    if (!isPreview) {
      // 1. Validate project exists
      const project = await this.prismaService.client.contentProject.findUnique(
        {
          where: { id: projectId },
        },
      );

      if (!project) {
        throw new NotFoundException(`ContentProject not found: ${projectId}`);
      }

      this.logger.log(
        `Starting trend analysis for "${keyword}" (project: ${projectId})`,
      );

      // 2. Update project status to in_development (analysis in progress)
      await this.prismaService.client.contentProject.update({
        where: { id: projectId },
        data: { status: 'in_development' },
      });
    } else {
      this.logger.log(
        `Starting preview trend analysis for "${keyword}" (no project persisted)`,
      );
    }

    // 3. Run all 4 scorers concurrently — never throw on partial failure
    const [
      demandResult,
      saturationResult,
      monetizationResult,
      qualityGapResult,
    ] = await Promise.allSettled([
      this.demandScorer
        .calculateDimensions({ keyword, geo })
        .then((dims) => this.demandScorer.calculateScore(dims).score),
      this.saturationScorer
        .calculateDimensions({ keyword, geo })
        .then((dims) => this.saturationScorer.calculateScore(dims).score),
      this.monetizationScorer
        .calculateDimensions({ niche })
        .then((dims) => this.monetizationScorer.calculateScore(dims).score),
      this.qualityGapScorer
        .calculateDimensions({ keyword, geo })
        .then((dims) => this.qualityGapScorer.calculateScore(dims).score),
    ]);

    // 4. Resolve scores — use fallback 50 for any rejected promise
    const demand = this.resolveScore(demandResult, 'demand', keyword);
    const saturation = this.resolveScore(
      saturationResult,
      'saturation',
      keyword,
    );
    const monetization = this.resolveScore(
      monetizationResult,
      'monetization',
      keyword,
    );
    const qualityGap = this.resolveScore(
      qualityGapResult,
      'qualityGap',
      keyword,
    );

    // 5. Calculate combined final score
    const calculationResult = this.scoreCalculator.calculate({
      dimension1: demand,
      dimension2: saturation,
      dimension3: monetization,
      dimension4: qualityGap,
    });

    const finalScore = calculationResult.score;

    this.logger.log(
      `Analysis complete for "${keyword}": demand=${demand}, saturation=${saturation}, ` +
        `monetization=${monetization}, qualityGap=${qualityGap}, final=${finalScore}`,
    );

    // 6. Persist TrendAnalysis — cast to unknown satisfies Prisma's InputJsonValue constraint
    const analysisData = {
      finalScore,
      classification: calculationResult.classification,
      scores: { demand, saturation, monetization, qualityGap },
      weights: { ...calculationResult.weights }, // spread to plain object for Prisma JSON
      geo,
      niche,
      analyzedAt: new Date().toISOString(),
    };

    // 6. Persist TrendAnalysis — skipped in preview mode (no FK target).
    // In that case return an in-memory record so the job result carries the data.
    let trendAnalysis: TrendAnalysisRecord;
    if (isPreview) {
      const now = new Date();
      trendAnalysis = {
        id: `preview-${now.getTime()}`,
        organizationId,
        projectId,
        keyword,
        data: analysisData,
        analyzedAt: now,
        createdAt: now,
      };
    } else {
      trendAnalysis = await this.prismaService.client.trendAnalysis.create({
        data: {
          organizationId,
          projectId,
          keyword,
          data: analysisData as any,
        },
      });
    }

    return {
      trendAnalysis,
      finalScore,
      scores: { demand, saturation, monetization, qualityGap },
    };
  }

  /**
   * Extract score from a settled promise result.
   * Logs a warning and returns FALLBACK_SCORE if the promise was rejected.
   */
  private resolveScore(
    result: PromiseSettledResult<number>,
    scorerName: string,
    keyword: string,
  ): number {
    if (result.status === 'fulfilled') {
      return result.value;
    }

    const reason =
      result.reason instanceof Error
        ? result.reason.message
        : String(result.reason);
    this.logger.warn(
      `${scorerName} scorer failed for "${keyword}" — using fallback ${AnalyzeTrendsUseCase.FALLBACK_SCORE}. Reason: ${reason}`,
    );
    return AnalyzeTrendsUseCase.FALLBACK_SCORE;
  }
}
