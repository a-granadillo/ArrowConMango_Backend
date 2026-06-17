import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString, Min } from 'class-validator';

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
