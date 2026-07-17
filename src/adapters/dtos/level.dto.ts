import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class BoardSizeDto {
  @ApiProperty()
  @IsInt()
  @Min(1)
  rows!: number;

  @ApiProperty()
  @IsInt()
  @Min(1)
  cols!: number;
}

export class BoardNodeDto {
  @ApiProperty()
  @IsInt()
  row!: number;

  @ApiProperty()
  @IsInt()
  col!: number;
}

export class TrajectorySegmentDto {
  @ApiProperty({ enum: ['up', 'down', 'left', 'right'] })
  @IsIn(['up', 'down', 'left', 'right'])
  direction!: 'up' | 'down' | 'left' | 'right';

  @ApiProperty()
  @IsInt()
  @Min(1)
  length!: number;
}

export class TrajectoryDto {
  @ApiProperty({ type: [TrajectorySegmentDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TrajectorySegmentDto)
  segments!: TrajectorySegmentDto[];
}

export class ArrowDefinitionDto {
  @ApiProperty()
  @IsString()
  id!: string;

  @ApiProperty()
  @ValidateNested()
  @Type(() => BoardNodeDto)
  startNode!: BoardNodeDto;

  @ApiProperty()
  @ValidateNested()
  @Type(() => TrajectoryDto)
  trajectory!: TrajectoryDto;

  @ApiProperty()
  @IsBoolean()
  isSwitchable!: boolean;
}

export class LevelRulesDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  timeLimitSeconds?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  maxMistakes?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  allowRotation?: boolean | null;
}

export class UpsertLevelDto {
  @ApiPropertyOptional({
    description: 'Level ID. Generated if omitted.',
  })
  @IsOptional()
  @IsString()
  id?: string;

  @ApiProperty()
  @IsString()
  name!: string;

  @ApiProperty()
  @IsString()
  difficulty!: string;

  @ApiProperty()
  @ValidateNested()
  @Type(() => BoardSizeDto)
  boardSize!: BoardSizeDto;

  @ApiProperty({ type: [ArrowDefinitionDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ArrowDefinitionDto)
  arrows!: ArrowDefinitionDto[];

  @ApiPropertyOptional()
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
  name!: string;

  @ApiProperty()
  difficulty!: string;

  @ApiProperty()
  boardSize!: { rows: number; cols: number };

  @ApiProperty()
  arrows!: unknown[];

  @ApiProperty()
  rules!: Record<string, unknown>;

  @ApiProperty()
  version!: number;

  @ApiProperty({ nullable: true })
  authorId!: string | null;

  @ApiProperty()
  isPublished!: boolean;

  @ApiProperty({ nullable: true })
  publishedAt!: string | null;
}
