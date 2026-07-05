import { FormatType, NicheCategory, ContentTone } from '@nexvideo/shared';
import { IsString, IsEnum, IsOptional } from 'class-validator';

export class GenerateScriptDto {
  @IsString()
  @IsOptional()
  projectId?: string;

  @IsString()
  @IsOptional()
  organizationId?: string;

  @IsString()
  @IsOptional()
  trendAnalysisId?: string;

  @IsEnum(FormatType)
  formatType: FormatType;

  @IsEnum(NicheCategory)
  @IsOptional()
  niche?: NicheCategory;

  @IsEnum(ContentTone)
  @IsOptional()
  tone?: ContentTone;

  @IsString()
  @IsOptional()
  keyword?: string;
}
