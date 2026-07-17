import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class SubmitScoreDto {
  @ApiProperty({ description: 'Level ID' })
  @IsString()
  levelId!: string;

  @ApiProperty({ description: 'Number of moves used' })
  @IsNumber()
  @Min(0)
  moves!: number;

  @ApiProperty({ description: 'Time taken in milliseconds' })
  @IsNumber()
  @Min(0)
  timeMs!: number;

  @ApiProperty({
    description:
      'Game mode (defaults to campaign for backwards compatibility)',
    required: false,
    enum: ['campaign', 'survival'],
  })
  @IsOptional()
  @IsIn(['campaign', 'survival'])
  mode?: 'campaign' | 'survival';
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
