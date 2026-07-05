import {
  Injectable,
  Logger,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { type Script } from '@nexvideo/database';
import { genericScriptPrompt } from '@nexvideo/prompts';
import { FormatType, NicheCategory } from '@nexvideo/shared';
import { ScriptRepository } from '../../repositories/script.repository';
import { ContentProjectRepository } from '../../repositories/content-project.repository';
import { IOpenAIPort } from '../../adapters/interfaces/openai.port';
import { ICachePort } from '../../cache/interfaces/cache.port';
import { GenerateScriptDto } from '../dto/generate-script.dto';
import { ScriptGenerationException } from '../exceptions/script-generation.exception';
import { BudgetExceededException } from '../exceptions/budget-exceeded.exception';

interface GenerateScriptInput extends GenerateScriptDto {
  organizationId: string;
  keyword?: string;
}

interface ScriptBlock {
  id: string;
  type: 'HOOK' | 'INTRO' | 'DEVELOPMENT' | 'RETENTION_CTA' | 'CONCLUSION';
  content: string;
  estimatedDuration: number;
  wordCount: number;
}

interface GeneratedScriptResponse {
  blocks: ScriptBlock[];
  totalEstimatedDuration: number;
  totalWordCount: number;
  originalityScore: number;
  estimatedCostBrl: number;
}

@Injectable()
export class GenerateScriptUseCase {
  private readonly logger = new Logger(GenerateScriptUseCase.name);
  private readonly maxCostPerScriptBrl: number;

  constructor(
    private readonly configService: ConfigService,
    private readonly scriptRepository: ScriptRepository,
    private readonly contentProjectRepository: ContentProjectRepository,
    @Inject('IOpenAIPort')
    private readonly openaiPort: IOpenAIPort,
    @Inject('ICachePort')
    private readonly cachePort: ICachePort,
  ) {
    this.maxCostPerScriptBrl = this.configService.get<number>(
      'MAX_COST_PER_SCRIPT_BRL',
      1.5,
    );
  }

  async execute(input: GenerateScriptInput): Promise<Script> {
    if (!input.projectId) {
      throw new BadRequestException('Missing project ID');
    }

    if (!input.organizationId) {
      throw new BadRequestException('Missing organization context');
    }

    // Validate project exists
    const project = await this.contentProjectRepository.findById(
      input.projectId,
    );
    if (!project) {
      throw new BadRequestException('Project not found');
    }

    // Fall back to project values when caller omitted them
    const projectAny = project as {
      keyword?: string;
      niche?: GenerateScriptInput['niche'];
    };
    if (!input.keyword && projectAny.keyword) input.keyword = projectAny.keyword;
    if (!input.niche && projectAny.niche) input.niche = projectAny.niche;

    try {
      this.logger.debug(
        `Generating script for project ${input.projectId} with format ${input.formatType}`,
      );

      // Check cache first
      const cacheKey = this.generateCacheKey(input);
      const cachedResponse =
        await this.cachePort.get<GeneratedScriptResponse>(cacheKey);

      let scriptContent: string;
      let parsedResponse: GeneratedScriptResponse;

      if (cachedResponse) {
        this.logger.debug(`Script generation cache hit for key ${cacheKey}`);
        this.logCacheHit(input);
        parsedResponse = cachedResponse;
      } else {
        // Generate script content via OpenAI
        scriptContent = await this.generateScriptContent(input);

        // Parse and validate JSON response
        try {
          parsedResponse = JSON.parse(scriptContent);
        } catch (parseError) {
          throw new ScriptGenerationException(
            'OpenAI returned invalid JSON format',
            parseError as Error,
          );
        }

        // Cache the response for future requests (TTL: 24h = 86400s)
        await this.cachePort.set(cacheKey, parsedResponse, 86400);
      }

      // Validate required fields
      if (!parsedResponse.blocks || !Array.isArray(parsedResponse.blocks)) {
        throw new ScriptGenerationException(
          'Invalid script structure: blocks must be an array',
        );
      }

      if (parsedResponse.blocks.length === 0) {
        throw new ScriptGenerationException(
          'Script generation returned empty blocks',
        );
      }

      // Validate budget constraint
      if (parsedResponse.estimatedCostBrl > this.maxCostPerScriptBrl) {
        throw new BudgetExceededException(
          parsedResponse.estimatedCostBrl,
          this.maxCostPerScriptBrl,
        );
      }

      // Warn if cost is > 80% of limit
      if (parsedResponse.estimatedCostBrl > this.maxCostPerScriptBrl * 0.8) {
        this.logger.warn({
          event: 'script_high_cost',
          estimatedCostBrl: parsedResponse.estimatedCostBrl,
          maxCostBrl: this.maxCostPerScriptBrl,
          percentage: (
            (parsedResponse.estimatedCostBrl / this.maxCostPerScriptBrl) *
            100
          ).toFixed(0),
          projectId: input.projectId,
          organizationId: input.organizationId,
          timestamp: new Date().toISOString(),
        });
      }

      // Create script in database
      const script = await this.scriptRepository.create({
        projectId: input.projectId,
        trendAnalysisId: input.trendAnalysisId || null,
        status: 'draft',
        formatType: input.formatType as any,
        blocks: parsedResponse.blocks as any,
        wordCount: parsedResponse.totalWordCount,
        estimatedDurationSec: parsedResponse.totalEstimatedDuration,
        originalityScore: parsedResponse.originalityScore,
        estimatedCostBrl: parsedResponse.estimatedCostBrl,
      });

      this.logger.debug(`Script created successfully with id ${script.id}`);

      return script;
    } catch (error) {
      if (
        error instanceof ScriptGenerationException ||
        error instanceof BudgetExceededException
      ) {
        throw error;
      }

      this.logger.error(
        `Script generation failed: ${error instanceof Error ? error.message : String(error)}`,
      );

      throw new ScriptGenerationException(
        'Failed to generate script. Please try again.',
        error instanceof Error ? error : undefined,
      );
    }
  }

  private async generateScriptContent(
    input: GenerateScriptInput,
  ): Promise<string> {
    const prompt = genericScriptPrompt({
      topic: input.keyword || 'Generic Topic',
      niche: input.niche ?? NicheCategory.OTHER,
      format: input.formatType,
      tone: input.tone,
      durationMinutes: input.formatType === FormatType.SHORT_FORM ? 1 : 10,
      targetAudience: 'Content creators and learners',
    });

    try {
      const maxTokens = this.calculateMaxTokens(input.formatType);
      return await this.openaiPort.complete(prompt, maxTokens);
    } catch (error) {
      this.logger.error(
        `OpenAI API call failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw new ScriptGenerationException(
        'Failed to call OpenAI API. Please ensure your API key is valid and you have sufficient credits.',
        error instanceof Error ? error : undefined,
      );
    }
  }

  private calculateMaxTokens(formatType: FormatType): number {
    const tokenMap: Record<FormatType, number> = {
      [FormatType.LONG_FORM]: 2000,
      [FormatType.MEDIUM_FORM]: 1500,
      [FormatType.SHORT_FORM]: 800,
      [FormatType.CAROUSEL]: 1200,
      [FormatType.PODCAST]: 2500,
    };

    return tokenMap[formatType] || 1500;
  }

  private generateCacheKey(input: GenerateScriptInput): string {
    // Generate a deterministic cache key: hash(projectId + trendAnalysisId + formatType + tone)
    return `openai:script-generation:${input.projectId}:${input.trendAnalysisId || 'none'}:${input.formatType}:${input.tone || 'neutral'}`;
  }

  private logCacheHit(input: GenerateScriptInput): void {
    // Log cache hit rate for monitoring efficiency
    this.logger.log({
      event: 'script_cache_hit',
      projectId: input.projectId,
      trendAnalysisId: input.trendAnalysisId || null,
      formatType: input.formatType,
      tone: input.tone || null,
      timestamp: new Date().toISOString(),
    });
  }

  async invalidateCache(projectId: string, scriptId: string): Promise<void> {
    // Find script to get its cache key parameters
    const script = await this.scriptRepository.findById(scriptId);
    if (!script) {
      throw new BadRequestException('Script not found');
    }

    // Invalidate cache with script's parameters
    const cacheKeyPattern = `openai:script-generation:${projectId}:${script.trendAnalysisId || 'none'}:${script.formatType}:*`;
    await this.cachePort.invalidateByPrefix(cacheKeyPattern);

    this.logger.log({
      event: 'script_cache_invalidated',
      projectId,
      scriptId,
      timestamp: new Date().toISOString(),
    });
  }
}
