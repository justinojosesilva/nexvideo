import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  Matches,
  ArrayMaxSize,
  ArrayMinSize,
  IsNumber,
  Min,
  Max,
} from 'class-validator';

const TEMPLATES = [
  'face-reaction',
  'text-only',
  'split-screen',
  'object-centric',
  'before-after',
] as const;

const STYLES = ['dark', 'bright', 'minimal', 'vibrant', 'cinematic'] as const;

export class PreviewThumbnailsDto {
  @ApiProperty() @IsString() @IsNotEmpty() @Length(2, 200)
  topic!: string;

  @ApiProperty() @IsString() @IsNotEmpty() @Length(2, 80)
  niche!: string;

  @ApiProperty() @IsString() @IsNotEmpty() @Length(1, 60)
  primaryText!: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString() @Length(1, 60)
  secondaryText?: string;

  @ApiPropertyOptional({ enum: TEMPLATES })
  @IsOptional()
  @IsIn(TEMPLATES as readonly string[])
  template?: (typeof TEMPLATES)[number];

  @ApiPropertyOptional({ enum: STYLES })
  @IsOptional()
  @IsIn(STYLES as readonly string[])
  style?: (typeof STYLES)[number];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(3)
  @ArrayMaxSize(3)
  @Matches(/^#([0-9A-Fa-f]{6})$/, { each: true })
  palette?: [string, string, string];

  @ApiProperty({ minimum: 1, maximum: 3 })
  @IsInt() @Min(1) @Max(3)
  count!: number;

  @ApiPropertyOptional()
  @IsOptional() @IsNumber() @Min(0.01) @Max(1)
  maxCostUsd?: number;
}
