import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
} from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'player@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'securePassword123', minLength: 6 })
  @IsString()
  @MinLength(6)
  password!: string;

  @ApiProperty({ example: 'Player1' })
  @IsString()
  @MinLength(2)
  username!: string;
}

export class LoginDto {
  @ApiProperty({ example: 'player@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'securePassword123' })
  @IsString()
  password!: string;
}

export class AuthResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty()
  username!: string;
}

export class RegisterResponseDto extends AuthResponseDto {
  @ApiProperty({ description: 'JWT Bearer token — registering logs you in' })
  token!: string;
}

export class LoginResponseDto {
  @ApiProperty({ description: 'JWT Bearer token' })
  token!: string;
}

export class GuestLoginDto {
  @ApiProperty({
    example: '3f4a1e2b-5c6d-4e7f-8a9b-0c1d2e3f4a5b',
    description: 'Client-generated UUID identifying the guest player',
  })
  @IsUUID()
  uuid!: string;

  @ApiPropertyOptional({
    example: 'MangoLoco_42',
    description:
      'Display name for a brand-new guest. Ignored if the UUID already ' +
      'resolves to an existing user — rename via PATCH /player/me instead.',
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  displayName?: string;
}

export class UpdatePlayerNameDto {
  @ApiProperty({ example: 'NewName', minLength: 2 })
  @IsString()
  @MinLength(2)
  displayName!: string;
}
