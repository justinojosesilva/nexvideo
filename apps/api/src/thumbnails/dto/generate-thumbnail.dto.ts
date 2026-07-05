import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsIn,
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

export class GenerateThumbnailDto {
  @ApiProperty() @IsString() @IsNotEmpty() @Length(2, 200)
  topic!: string;

  @ApiProperty() @IsString() @IsNotEmpty() @Length(2, 80)
  niche!: string;

  @ApiProperty({ description: 'Headline text on the thumbnail (max 4 words)' })
  @IsString() @IsNotEmpty() @Length(1, 60)
  primaryText!: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString() @Length(1, 60)
  secondaryText?: string;

  @ApiProperty({ enum: TEMPLATES })
  @IsIn(TEMPLATES as readonly string[])
  template!: (typeof TEMPLATES)[number];

  @ApiProperty({ enum: STYLES })
  @IsIn(STYLES as readonly string[])
  style!: (typeof STYLES)[number];

  @ApiPropertyOptional({
    description: 'Three HEX colors (e.g. #FF0000)',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(3)
  @ArrayMaxSize(3)
  @Matches(/^#([0-9A-Fa-f]{6})$/, { each: true })
  palette?: [string, string, string];

  @ApiPropertyOptional({ description: 'Optional project id to persist thumbnailUrl' })
  @IsOptional() @IsString()
  projectId?: string;

  @ApiPropertyOptional({
    description: 'Max USD cost per image (defaults to 0.10 USD).',
  })
  @IsOptional() @IsNumber() @Min(0.01) @Max(1)
  maxCostUsd?: number;
}
