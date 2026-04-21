import { IsBoolean, IsEmail, IsNotEmpty, IsOptional, IsString, MinLength, Equals } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({
    example: 'John Doe',
    description: 'User full name',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    example: 'user@example.com',
    description: 'User email address',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    example: 'password123',
    description: 'User password (minimum 8 characters)',
    minLength: 8,
  })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({
    example: 'Acme Corp',
    description: 'Organization name',
    required: false,
  })
  @IsString()
  @IsOptional()
  organizationName?: string;

  @ApiProperty({
    example: true,
    description: 'User must explicitly accept Terms of Service',
  })
  @IsBoolean()
  @Equals(true, { message: 'You must accept the Terms of Service to register' })
  acceptTerms: boolean;
}

export class UserData {
  @ApiProperty({ example: 'clm1a2b3c4d5e6f7g8h9i0j1k' })
  id: string;

  @ApiProperty({ example: 'user@example.com' })
  email: string;

  @ApiProperty({ example: 'John Doe' })
  name: string;
}

export class RegisterResponse {
  @ApiProperty({
    example:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U',
    description: 'JWT access token (valid for 7 days)',
  })
  accessToken: string;

  @ApiProperty({
    example:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U',
    description: 'Refresh token (valid for 7 days)',
  })
  refreshToken: string;

  @ApiProperty({ type: UserData })
  user: UserData;

  @ApiProperty({ example: false, description: 'Whether onboarding has been completed' })
  onboardingCompleted: boolean;
}
