import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsNumber, IsObject, IsString, Min } from 'class-validator';

export class BestScoreDto {
  @ApiProperty()
  @IsNumber()
  @Min(0)
  moves!: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  timeMs!: number;
}

export class SyncProgressDto {
  @ApiProperty({ type: [String], description: 'IDs of completed levels' })
  @IsArray()
  @IsString({ each: true })
  completed!: string[];

  @ApiPropertyOptional({
    description: 'Best scores per level (levelId → {moves, timeMs})',
  })
  @IsObject()
  best!: Record<string, { moves: number; timeMs: number }>;
}

export class ProgressResponseDto {
  @ApiProperty()
  userId!: string;

  @ApiProperty({ type: [String] })
  completed!: string[];

  @ApiProperty()
  best!: Record<string, { moves: number; timeMs: number; value: number }>;
}
