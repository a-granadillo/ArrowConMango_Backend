import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsNumber, IsObject, IsOptional, IsString, Min } from 'class-validator';

export class UpsertLevelDto {
  @ApiPropertyOptional({ description: 'Level ID (UUID). Generated if omitted.' })
  @IsOptional()
  @IsString()
  id?: string;

  @ApiProperty({ description: 'Array of node definitions' })
  @IsArray()
  nodes!: unknown[];

  @ApiProperty({ description: 'Array of [fromNodeId, toNodeId] edges' })
  @IsArray()
  edges!: [string, string][];

  @ApiPropertyOptional({ description: 'Level rules (timeLimitSeconds, allowRotation, etc.)' })
  @IsObject()
  @IsOptional()
  rules?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsNumber()
  @Min(1)
  @IsOptional()
  version?: number;
}

export class LevelResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  nodes!: unknown[];

  @ApiProperty()
  edges!: [string, string][];

  @ApiProperty()
  rules!: Record<string, unknown>;

  @ApiProperty()
  version!: number;
}
