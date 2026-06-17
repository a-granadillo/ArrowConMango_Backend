import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

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

export class LoginResponseDto {
  @ApiProperty({ description: 'JWT Bearer token' })
  token!: string;
}
