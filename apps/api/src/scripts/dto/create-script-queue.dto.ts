import { IsString, IsEnum, IsOptional } from 'class-validator';
import { FormatType, ContentTone } from '@nexvideo/shared';
import { ApiProperty } from '@nestjs/swagger';

export class CreateScriptQueueDto {
  @ApiProperty({
    description: 'ID of the project to generate script for',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsString()
  projectId: string;

  @ApiProperty({
    description: 'ID of the trend analysis to base script on',
    example: '660e8400-e29b-41d4-a716-446655440001',
  })
  @IsString()
  trendAnalysisId: string;

  @ApiProperty({
    description: 'Format type for the script',
    enum: FormatType,
    example: FormatType.LONG_FORM,
  })
  @IsEnum(FormatType)
  formatType: FormatType;

  @ApiProperty({
    description: 'Tone of the script',
    enum: ContentTone,
    example: ContentTone.CASUAL,
  })
  @IsEnum(ContentTone)
  tone: ContentTone;

  @ApiProperty({
    description:
      'Optional keyword override. If provided, supersedes the keyword from the project/trend analysis as the script topic.',
    required: false,
    example: 'Como criar reserva de emergência aos 40 anos',
  })
  @IsString()
  @IsOptional()
  keyword?: string;
}
