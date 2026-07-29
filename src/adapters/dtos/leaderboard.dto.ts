import { ApiProperty } from '@nestjs/swagger';
import {
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

// Generous ceilings, not gameplay balance — they exist only to reject
// garbage/overflow-style abuse (e.g. Number.MAX_SAFE_INTEGER payloads),
// never to cap a legitimate marathon survival run.
const MAX_MOVES = 1_000_000;
const MAX_TIME_MS = 24 * 60 * 60 * 1000; // 24h

export class SubmitScoreDto {
  @ApiProperty({ description: 'Level ID' })
  @IsString()
  levelId!: string;

  @ApiProperty({ description: 'Number of moves used' })
  @IsNumber()
  @Min(0)
  @Max(MAX_MOVES)
  moves!: number;

  @ApiProperty({ description: 'Time taken in milliseconds' })
  @IsNumber()
  @Min(0)
  @Max(MAX_TIME_MS)
  timeMs!: number;

  @ApiProperty({
    description: 'Game mode (defaults to campaign for backwards compatibility)',
    required: false,
    enum: ['campaign', 'survival', 'hexagonal', 'cube3d'],
  })
  @IsOptional()
  @IsIn(['campaign', 'survival', 'hexagonal', 'cube3d'])
  mode?: 'campaign' | 'survival' | 'hexagonal' | 'cube3d';
}

export class ScoreEntryResponseDto {
  @ApiProperty()
  userId!: string;

  @ApiProperty()
  levelId!: string;

  @ApiProperty()
  moves!: number;

  @ApiProperty()
  timeMs!: number;

  @ApiProperty()
  value!: number;

  @ApiProperty()
  at!: string;
}

export class PlayerStandingResponseDto {
  @ApiProperty({ description: '1-based position in the global ranking' })
  rank!: number;

  @ApiProperty()
  userId!: string;

  @ApiProperty()
  displayName!: string;

  @ApiProperty({ description: 'Total mango stars (Σ of 1-3 per level)' })
  mangos!: number;

  @ApiProperty()
  levelsCompleted!: number;

  @ApiProperty({ description: 'Whether this row is the requesting player' })
  isMe!: boolean;
}
