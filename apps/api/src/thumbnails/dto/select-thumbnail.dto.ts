import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsUrl } from 'class-validator';

export class SelectThumbnailDto {
  @ApiProperty()
  @IsString() @IsNotEmpty() @IsUrl({ require_tld: false })
  thumbnailUrl!: string;
}
